"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { markerColor } from "@/lib/colors";
import type { Incident } from "@/lib/types";
import { cn } from "@/components/ui/primitives";

// Standard OpenStreetMap raster tiles — keyless and usage-compliant for a prototype.
const TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: TILES,
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e8edf3" } },
    { id: "carto", type: "raster", source: "carto" },
  ],
};

export const USER_LOCATION: [number, number] = [78.435, 17.4127];

interface Props {
  incidents: Incident[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showUser?: boolean;
  className?: string;
  fitAll?: boolean;
  /** Adds clearance so MapLibre controls clear the mobile chrome overlays. */
  chrome?: Array<"chips" | "dock"> | null;
}

/* ------------------------------------------------------------------ *
 * Decluttering: markers are small diamonds on a busy map, so pixel-
 * space collisions are inevitable. A greedy sweep groups colliding
 * markers into one cluster chip (stacked diamonds + count). Tapping
 * a cluster zooms in to expand its members. Runs after every move
 * end so the grouping always matches what is on screen.
 * ------------------------------------------------------------------ */
const COLLIDE_PAD = 6; // px gap required between marker boxes

type Placed = {
  id: string;
  x: number;
  y: number;
  half: number;
  el: HTMLElement;
  priority: number;
  color: string;
  size: number;
};

export default function CivicMap({
  incidents,
  selectedId,
  onSelect,
  showUser = true,
  className,
  fitAll = true,
  chrome = null,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const clusterMarker = useRef<maplibregl.Marker | null>(null);
  const didFit = useRef(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Init map once
  useEffect(() => {
    if (!wrap.current || map.current) return;
    const m = new maplibregl.Map({
      container: wrap.current,
      style: STYLE,
      center: USER_LOCATION,
      zoom: 12,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markers.current = {};
      userMarker.current = null;
      clusterMarker.current = null;
      didFit.current = false;
    };
  }, []);

  // Sync incident markers
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const build = () => {
      const seen = new Set<string>();
      for (const inc of incidents) {
        seen.add(inc.id);
        let mk = markers.current[inc.id];
        if (!mk) {
          const el = document.createElement("button");
          el.className = "civ-marker";
          el.setAttribute("aria-label", `${inc.title}, ${inc.id}`);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            selectRef.current?.(inc.id);
          });
          mk = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([inc.longitude, inc.latitude])
            .addTo(m);
          markers.current[inc.id] = mk;
        }
        const el = mk.getElement();
        const size = 11 + Math.min(inc.observation_count, 40) / 4.5;
        const color = markerColor(inc);
        const selected = inc.id === selectedId;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.setProperty("--mk", color);
        el.classList.toggle("is-selected", selected);
        el.style.zIndex = selected ? "1000" : String(100 + Math.round(inc.observation_count));
        el.setAttribute(
          "data-count",
          `${inc.title} · ${inc.observation_count} observations`
        );
      }
      for (const id of Object.keys(markers.current)) {
        if (!seen.has(id)) {
          markers.current[id].remove();
          delete markers.current[id];
        }
      }
    };
    // Robust readiness: a freshly-mounted (or momentarily hidden) container can
    // stall the `load` event, so never rely on it alone — poll until the map
    // reports loaded, then build. build() is idempotent (keyed by incident id).
    let done = false;
    const attempt = () => {
      if (done) return;
      if (m.loaded()) { done = true; clearInterval(timer); m.off("load", attempt); build(); }
    };
    const timer = setInterval(attempt, 200);
    m.once("load", attempt);
    attempt();
    const stop = () => { done = true; clearInterval(timer); };
    return stop;
  }, [incidents, selectedId]);

  // ---- Declutter pass: hide colliding markers behind one cluster chip ----
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const declutter = () => {
      const ids = Object.keys(markers.current);
      if (!ids.length) {
        if (clusterMarker.current) {
          clusterMarker.current.remove();
          clusterMarker.current = null;
        }
        return;
      }

      // Only declutter what is actually on screen (with a margin); markers
      // far outside the viewport must never form phantom clusters.
      const cw = m.getCanvas().clientWidth;
      const ch = m.getCanvas().clientHeight;
      const M = 40;

      const placed: Placed[] = [];
      for (const id of ids) {
        const mk = markers.current[id];
        const el = mk.getElement();
        const p = mk.getLngLat();
        const pt = m.project(p);
        const offscreen = pt.x < -M || pt.y < -M || pt.x > cw + M || pt.y > ch + M;
        if (offscreen) {
          el.style.visibility = "";
          el.classList.remove("is-crowded");
          continue;
        }
        const w = el.offsetWidth || 14;
        placed.push({
          id,
          x: pt.x,
          y: pt.y,
          half: w / 2 + COLLIDE_PAD,
          el,
          // higher priority stays visible: selected > heavier > existing DOM order
          priority: (el.classList.contains("is-selected") ? 1e6 : 0) + (el.style.zIndex ? Number(el.style.zIndex) : 0),
          color: el.style.getPropertyValue("--mk") || "#175e54",
          size: w,
        });
      }

      if (!placed.length) {
        if (clusterMarker.current) {
          clusterMarker.current.remove();
          clusterMarker.current = null;
        }
        return;
      }

      // Greedy: sort by priority desc; first marker of a collision group wins,
      // the rest join its cluster.
      placed.sort((a, b) => b.priority - a.priority);
      const groups: Placed[][] = [];
      const claimed = new Set<string>();
      for (const p of placed) {
        if (claimed.has(p.id)) continue;
        const group = [p];
        claimed.add(p.id);
        for (const q of placed) {
          if (claimed.has(q.id)) continue;
          const dx = Math.abs(p.x - q.x);
          const dy = Math.abs(p.y - q.y);
          if (dx < p.half + q.half && dy < p.half + q.half) {
            group.push(q);
            claimed.add(q.id);
          }
        }
        groups.push(group);
      }

      let maxGroup: Placed[] | null = null;
      for (const g of groups) {
        const hidden = g.length > 1;
        for (const p of g) {
          p.el.style.visibility = hidden && p.id !== g[0].id ? "hidden" : "";
          p.el.classList.toggle("is-crowded", hidden);
        }
        if (!maxGroup || g.length > maxGroup.length) maxGroup = g;
      }

      // One cluster chip at a time (the densest group) keeps the map calm;
      // the chip sits at the group's anchor and lists the count.
      if (clusterMarker.current) {
        clusterMarker.current.remove();
        clusterMarker.current = null;
      }
      if (maxGroup && maxGroup.length > 1) {
        const anchor = maxGroup[0];
        const el = document.createElement("button");
        el.className = "civ-cluster";
        el.setAttribute("aria-label", `${maxGroup.length} incidents here, zoom in to expand`);
        const inner = document.createElement("span");
        inner.className = "civ-cluster-count";
        inner.textContent = String(maxGroup.length);
        el.appendChild(inner);
        const members = maxGroup.slice(0, 3);
        for (let i = members.length - 1; i >= 0; i--) {
          const d = document.createElement("span");
          d.className = "civ-cluster-diamond";
          d.style.setProperty("--mk", members[i].color);
          d.style.transform = `translate(${i * 4 - 4}px, ${-i * 3}px)`;
          el.appendChild(d);
        }
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const b = new maplibregl.LngLatBounds();
          maxGroup!.forEach((p) => {
            const mk = markers.current[p.id];
            if (mk) b.extend(mk.getLngLat());
          });
          m.fitBounds(b, { padding: 110, maxZoom: 16, duration: 450 });
        });
        clusterMarker.current = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(m.unproject([anchor.x, anchor.y]))
          .addTo(m);
      }
    };

    const schedule = () => requestAnimationFrame(declutter);
    m.on("moveend", schedule);
    m.on("zoomend", schedule);
    const t = setTimeout(schedule, 350);
    return () => {
      m.off("moveend", schedule);
      m.off("zoomend", schedule);
      clearTimeout(t);
    };
  }, [incidents, selectedId]);

  // Fit bounds once incidents arrive
  useEffect(() => {
    const m = map.current;
    if (!m || !incidents.length || didFit.current || !fitAll) return;
    didFit.current = true;
    const b = new maplibregl.LngLatBounds();
    incidents.forEach((i) => b.extend([i.longitude, i.latitude]));
    // Extra bottom padding keeps markers clear of the mobile dock overlay.
    m.fitBounds(b, { padding: { top: 70, bottom: 150, left: 50, right: 50 }, maxZoom: 13.5, duration: 0 });
  }, [incidents, fitAll]);

  // Fly to selection
  useEffect(() => {
    const m = map.current;
    if (!m || !selectedId) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc) return;
    m.flyTo({
      center: [inc.longitude, inc.latitude],
      zoom: Math.max(m.getZoom(), 13.5),
      duration: 500,
    });
  }, [selectedId, incidents]);

  // User location marker
  useEffect(() => {
    const m = map.current;
    if (!m || !showUser) return;
    const add = () => {
      if (!userMarker.current) {
        const el = document.createElement("div");
        el.className = "civ-user-dot";
        userMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat(USER_LOCATION)
          .addTo(m);
      }
    };
    if (m.loaded()) add();
    else m.once("load", add);
  }, [showUser]);

  return (
    // Position comes from the caller (absolute inset-0 on full-bleed maps, a
    // height on embedded maps). The root must not hardcode `relative`, which
    // would win the cascade over the caller's `absolute`.
    <div
      className={cn(
        "overflow-hidden",
        chrome?.includes("chips") && "civ-map-chips",
        chrome?.includes("dock") && "civ-map-dock",
        className ?? "relative"
      )}
    >
      {/* Inline position beats maplibre-gl.css, which resets .maplibregl-map to relative */}
      <div ref={wrap} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

export function MapLegend({ className }: { className?: string }) {
  const items = [
    { color: "#a03430", label: "High / critical" },
    { color: "#a4691c", label: "Medium" },
    { color: "#8d7430", label: "Low" },
    { color: "#3d7a4a", label: "Resolved" },
  ];
  return (
    <div
      className={cn(
        "pointer-events-none flex flex-wrap items-center gap-x-3.5 gap-y-1 border border-rule-strong bg-panel/95 px-3 py-2 shadow-[3px_3px_0_0_var(--rule-strong)]",
        className
      )}
    >
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.11em] text-ink-soft">
          <span
            className="h-2 w-2 rotate-45 shadow-[0_0_0_1.5px_var(--panel),0_0_0_2.5px_rgba(31,42,36,0.35)]"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
