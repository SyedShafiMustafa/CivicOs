/**
 * CIVICOS surveyor glyphs — custom-drawn SVG iconography.
 *
 * One consistent 20x20 line language: 1.6px strokes, squared terminals,
 * drafting-instrument geometry. Every glyph references its real-world object
 * (kerb stone, lamp, culvert grate). No third-party icon pack.
 */
import type { SVGProps } from "react";
import type { IssueType } from "./types";

type G = SVGProps<SVGSVGElement>;

function S({ children, ...p }: G) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ issues */

/** Pothole in plan view: broken kerb segment with fissure. */
export const GlyphRoads = (p: G) => (
  <S {...p}>
    <path d="M2 13c2-1 4 1 6 0s4 1 6 0 3 .5 4 0" />
    <path d="M2 16h16" strokeDasharray="3 2.5" />
    <ellipse cx="10" cy="9.5" rx="3.4" ry="2" />
    <path d="M7 9.5l1.4-1.6M13 9.5l-1.2-1.8M9 7.6l.4 3.8M11.2 7.8l-.3 3.6" strokeWidth={1.1} />
  </S>
);

/** Bin with drifting litter flecks. */
export const GlyphGarbage = (p: G) => (
  <S {...p}>
    <path d="M5 7l1.2 9.5h7.6L15 7" />
    <path d="M4 7h12" />
    <path d="M7.5 7V5.2A1.2 1.2 0 018.7 4h2.6a1.2 1.2 0 011.2 1.2V7" />
    <path d="M8 10.5v3M10 10.5v3M12 10.5v3" strokeWidth={1.1} />
    <path d="M16.5 3.5l.9.9M17.6 2.6l-.4 1" strokeWidth={1.1} />
  </S>
);

/** Burst pipe with spreading pool. */
export const GlyphWater = (p: G) => (
  <S {...p}>
    <path d="M3 8c2.5-2 5.5-2 8 0s5 2 6 .5" />
    <path d="M3 12c2.5-2 5.5-2 8 0s5 2 6 .5" strokeWidth={1.1} />
    <path d="M3 15.5c2.5-2 5.5-2 8 0s5 2 6 .5" strokeWidth={1.1} />
    <path d="M10 2v4M10 6l-1.6 1.6M10 6l1.6 1.6" strokeWidth={1.2} />
  </S>
);

/** Street lamp, head tilted, dead filament. */
export const GlyphStreetlights = (p: G) => (
  <S {...p}>
    <path d="M10 18V7" />
    <path d="M10 7L6.5 4.5h7L10 7z" />
    <path d="M8.6 5.2l1 1M11.4 5.2l-1 1" strokeWidth={1.1} />
    <path d="M6.5 18h7" />
    <path d="M16 10l1.6 2.4M17.6 10L16 12.4" strokeWidth={1.1} />
  </S>
);

/** Culvert grate, partially blocked. */
export const GlyphDrainage = (p: G) => (
  <S {...p}>
    <path d="M3 6h14v8H3z" />
    <path d="M6 6v8M10 6v8M14 6v8" strokeWidth={1.2} />
    <path d="M8 3.5c.8.8.8 1.7 0 2.5M12 3.5c.8.8.8 1.7 0 2.5" strokeWidth={1.1} />
  </S>
);

/** Kerb ramp with a step hazard. */
export const GlyphAccessibility = (p: G) => (
  <S {...p}>
    <path d="M3 15h6l4-5h4" />
    <path d="M3 17.5h14" strokeDasharray="3 2.5" />
    <circle cx="6" cy="7" r="1.6" />
    <path d="M6 8.6v3" />
  </S>
);

/** Fallback: surveyor marker pin. */
export const GlyphOther = (p: G) => (
  <S {...p}>
    <path d="M10 17V9" />
    <circle cx="10" cy="6" r="2.6" />
    <path d="M10 3.4V2M6 18h8" strokeWidth={1.2} />
  </S>
);

export function IssueGlyph({ type, ...p }: G & { type: IssueType }) {
  switch (type) {
    case "roads":
      return <GlyphRoads {...p} />;
    case "garbage":
      return <GlyphGarbage {...p} />;
    case "water":
      return <GlyphWater {...p} />;
    case "streetlights":
      return <GlyphStreetlights {...p} />;
    case "drainage":
      return <GlyphDrainage {...p} />;
    case "accessibility":
      return <GlyphAccessibility {...p} />;
    default:
      return <GlyphOther {...p} />;
  }
}

/* --------------------------------------------------------------------- nav */

export const GlyphOverview = (p: G) => (
  <S {...p}>
    <path d="M3 16.5V9l7-5.5L17 9v7.5" />
    <path d="M7.5 16.5v-5h5v5" />
  </S>
);

export const GlyphMap = (p: G) => (
  <S {...p}>
    <path d="M3 5.5L8 3l4.5 2L17 3v11.5L12.5 17 8 15l-5 2.5V5.5z" />
    <path d="M8 3v12M12.5 5v12" strokeWidth={1.1} />
  </S>
);

export const GlyphCamera = (p: G) => (
  <S {...p}>
    <path d="M3 7h4l1.4-2h3.2L13 7h4v10H3V7z" />
    <circle cx="10" cy="11.6" r="2.8" />
    <path d="M10 10v1.6l1.2.9" strokeWidth={1.1} />
  </S>
);

export const GlyphLedger = (p: G) => (
  <S {...p}>
    <path d="M5 3h10v14H5z" />
    <path d="M7.5 7h5M7.5 10h5M7.5 13h3" strokeWidth={1.2} />
    <path d="M5 3l-1.5 1v13L5 17M15 3l1.5 1v13L15 17" strokeWidth={1.1} />
  </S>
);

export const GlyphBell = (p: G) => (
  <S {...p}>
    <path d="M6 14V9.5a4 4 0 018 0V14" />
    <path d="M4.5 14h11" />
    <path d="M8.5 16.5a1.6 1.6 0 003 0" />
    <path d="M10 3.4v2" />
  </S>
);

export const GlyphImpact = (p: G) => (
  <S {...p}>
    <path d="M3 17V11M8.5 17V6.5M14 17V9M17.5 17h-15" strokeWidth={1.4} />
  </S>
);

export const GlyphSettings = (p: G) => (
  <S {...p}>
    <circle cx="10" cy="10" r="2.4" />
    <path d="M10 2.8v2.4M10 14.8v2.4M17.2 10h-2.4M5.2 10H2.8M15.1 4.9l-1.7 1.7M6.6 13.4l-1.7 1.7M15.1 15.1l-1.7-1.7M6.6 6.6L4.9 4.9" strokeWidth={1.2} />
  </S>
);

export const GlyphShield = (p: G) => (
  <S {...p}>
    <path d="M10 2.5l6 2v5c0 4.2-2.6 6.8-6 8-3.4-1.2-6-3.8-6-8v-5l6-2z" />
    <path d="M7.6 9.8l1.8 1.8 3.2-3.4" strokeWidth={1.3} />
  </S>
);

export const GlyphSearch = (p: G) => (
  <S {...p}>
    <circle cx="9" cy="9" r="5" />
    <path d="M12.8 12.8L17 17" />
  </S>
);

export const GlyphClose = (p: G) => (
  <S {...p}>
    <path d="M5 5l10 10M15 5L5 15" />
  </S>
);

export const GlyphBack = (p: G) => (
  <S {...p}>
    <path d="M11 4L5 10l6 6M5 10h11" />
  </S>
);

export const GlyphNext = (p: G) => (
  <S {...p}>
    <path d="M9 4l6 6-6 6M15 10H4" />
  </S>
);

export const GlyphPlus = (p: G) => (
  <S {...p}>
    <path d="M10 4v12M4 10h12" />
  </S>
);

export const GlyphReset = (p: G) => (
  <S {...p}>
    <path d="M4 10a6 6 0 116 6" />
    <path d="M4 15v-4.5h4.5" strokeWidth={1.3} />
  </S>
);

export const GlyphFilters = (p: G) => (
  <S {...p}>
    <path d="M3 6h14M6 10h8M8.5 14h3" />
  </S>
);

/* ------------------------------------------------------------ status marks */

/** Survey note: filled ink dot for observation events. */
export const MarkDot = (p: G) => (
  <S {...p}>
    <circle cx="10" cy="10" r="2.2" fill="currentColor" stroke="none" />
  </S>
);

/** Verification seal: radiating compass rose with check. */
export const MarkSeal = (p: G) => (
  <S {...p}>
    <circle cx="10" cy="10" r="6.2" />
    <circle cx="10" cy="10" r="3.4" strokeWidth={1.1} />
    <path d="M8.4 10l1.2 1.2 2.2-2.4" strokeWidth={1.4} />
    <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6L4 16M16 16l-1.4-1.4M5.4 5.4L4 4" strokeWidth={1} />
  </S>
);

/** Severity arrow (triangulated, cartographic style). */
export const MarkSeverity = (p: G) => (
  <S {...p}>
    <path d="M10 3l6 12H4l6-12z" />
    <path d="M10 8.5v3.5" strokeWidth={1.3} />
    <path d="M8.2 10.3L10 12.1l1.8-1.8" strokeWidth={1.1} />
  </S>
);

/** Department building: municipal block with flag. */
export const MarkDept = (p: G) => (
  <S {...p}>
    <path d="M4 17V8l6-3 6 3v9" />
    <path d="M10 5V2.5h3" strokeWidth={1.2} />
    <path d="M7.5 17v-4h5v4" strokeWidth={1.1} />
  </S>
);

/** Complaint/official document with ribbon. */
export const MarkComplaint = (p: G) => (
  <S {...p}>
    <path d="M6 3h8v14H6z" />
    <path d="M8.5 7h3M8.5 10h3" strokeWidth={1.2} />
    <path d="M9 13.5l1 1.5 1-1.5" strokeWidth={1.1} />
  </S>
);

export function ActivityGlyph({ kind, ...p }: G & { kind: string }) {
  switch (kind) {
    case "report":
      return <MarkComplaint {...p} />;
    case "observation":
      return <MarkDot {...p} />;
    case "resolution":
    case "verification":
      return <MarkSeal {...p} />;
    case "assignment":
      return <MarkDept {...p} />;
    case "complaint":
      return <MarkComplaint {...p} />;
    default:
      return <MarkDot {...p} />;
  }
}

/** The CIVICOS logotype mark: a compass-surveyor star over a kerb line. */
export const GlyphLogomark = (p: G) => (
  <S {...p} strokeWidth={1.4}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 5v10M5 10h10M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4" strokeWidth={0.9} />
    <circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" />
  </S>
);
