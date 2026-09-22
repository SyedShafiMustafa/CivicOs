"use client";

import { useMemo, useState } from "react";
import {
  assignIncident,
  fetchIncidents,
  resolveIncident,
  useApi,
} from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { DEPARTMENTS, PRIORITY_INK } from "@/lib/colors";
import type { Incident } from "@/lib/types";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  FieldLabel,
  PenPanel,
  SectionHead,
  Select,
  Stamp,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { GlyphClose, GlyphReset, MarkDept, MarkSeal, MarkSeverity, GlyphShield } from "@/lib/glyphs";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "reported,verified,in_progress", label: "New / active" },
  { key: "assigned", label: "Awaiting repair" },
  { key: "resolved", label: "Awaiting verification" },
  { key: "resolution_verified", label: "Verified" },
];

export default function OpsPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [assignTarget, setAssignTarget] = useState<Incident | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Incident | null>(null);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, error, loading, retry } = useApi(
    () => fetchIncidents({ statuses: statusFilter || undefined }),
    [statusFilter]
  );

  const rows = useMemo(() => data ?? [], [data]);
  const actionable = rows.filter((i) => i.status !== "resolution_verified").length;

  async function doAssign() {
    if (!assignTarget) return;
    setBusy(true);
    try {
      await assignIncident(assignTarget.id, department);
      toast("success", `${assignTarget.id} assigned to ${department}`);
      setAssignTarget(null);
      retry();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doResolve() {
    if (!resolveTarget) return;
    setBusy(true);
    try {
      await resolveIncident(resolveTarget.id, notes);
      toast("success", `${resolveTarget.id} marked resolved. Citizens can now verify the repair.`);
      setResolveTarget(null);
      setNotes("");
      retry();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 lg:p-8">
      {/* Internal notice */}
      <div className="flex items-start gap-3 border border-hold/50 bg-hold-wash px-4 py-3">
        <GlyphShield className="mt-0.5 h-4 w-4 shrink-0 text-hold" />
        <div>
          <p className="font-display text-[13px] font-semibold text-ink">Internal demo operations</p>
          <p className="text-xs leading-5 text-ink-soft">
            Simulates the authority side: assignment and resolution. No real department is
            contacted. Resolving here triggers citizen verification requests, which is what closes
            the loop.
          </p>
        </div>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Ops register · not for citizens
          </p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
            Incident queue
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {actionable} incident{actionable === 1 ? "" : "s"} awaiting action
          </p>
        </div>
        <div className="flex flex-wrap border border-rule-strong">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "border-r border-rule-strong px-3 py-1.5 text-xs font-medium transition-colors last:border-r-0",
                statusFilter === f.key ? "bg-ink text-panel" : "bg-panel text-ink-soft hover:bg-well"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="plate overflow-hidden">
        <SectionHead title="All incidents" sub="Assign to a department, then mark resolved when work is done" />
        <div className="border-t-0">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <PenPanel rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState title="No incidents in this view" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-y border-rule bg-well/60 font-data text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                    <th className="px-5 py-2.5 font-medium">File</th>
                    <th className="px-4 py-2.5 font-medium">Plot</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Obs</th>
                    <th className="px-4 py-2.5 font-medium">Last seen</th>
                    <th className="px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {rows.map((inc) => (
                    <tr key={inc.id} className="transition-colors hover:bg-well/60">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-ink">{inc.title}</p>
                        <p className="font-data text-[10.5px] text-ink-faint">{inc.id}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">{inc.location_label}</td>
                      <td className="px-4 py-3">
                        <Stamp tone={inc.priority === "low" ? "hold" : inc.priority === "medium" ? "warn" : "alert"}>
                          <span aria-hidden="true" className="text-[0.7em]">{PRIORITY_INK[inc.priority].tick}</span>
                          {inc.priority}
                        </Stamp>
                      </td>
                      <td className="px-4 py-3">
                        <Stamp tone={
                          inc.status.includes("verif") || inc.status === "resolved" ? "ok"
                          : inc.status === "assigned" ? "warn"
                          : inc.status === "reported" ? "neutral" : "accent"
                        }>
                          {inc.status_label}
                        </Stamp>
                      </td>
                      <td className="px-4 py-3 font-data text-[12.5px] text-ink-soft tabular">{inc.observation_count}</td>
                      <td className="px-4 py-3 font-data text-[11.5px] text-ink-soft">{fmtDate(inc.last_seen)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {!["assigned", "resolved", "resolution_verified"].includes(inc.status) ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setAssignTarget(inc);
                                setDepartment(
                                  DEPARTMENTS.find((d) => d.includes(
                                    inc.issue_type === "roads" ? "Roads" :
                                    inc.issue_type === "garbage" ? "Solid Waste" :
                                    inc.issue_type === "water" ? "HMWSSB" :
                                    inc.issue_type === "streetlights" ? "Electric" :
                                    inc.issue_type === "drainage" ? "Storm Water" :
                                    inc.issue_type === "accessibility" ? "Town Planning" : "Zonal"
                                  )) ?? DEPARTMENTS[0]
                                );
                              }}
                            >
                              <MarkDept className="h-3.5 w-3.5" /> Assign
                            </Button>
                          ) : null}
                          {["assigned", "in_progress"].includes(inc.status) ? (
                            <Button size="sm" onClick={() => setResolveTarget(inc)}>
                              <MarkSeverity className="h-3.5 w-3.5" /> Resolve
                            </Button>
                          ) : null}
                          {inc.status === "resolved" ? (
                            <Stamp tone="hold" className="py-1.5">
                              <MarkSeal className="h-3.5 w-3.5" /> Awaiting citizen verification
                            </Stamp>
                          ) : null}
                          {inc.status === "resolution_verified" ? (
                            <Stamp tone="ok" className="py-1.5">
                              <MarkSeal className="h-3.5 w-3.5" /> Closed, verified
                            </Stamp>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign incident">
        {assignTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{assignTarget.title}</span> ·{" "}
              <span className="font-data text-xs">{assignTarget.id}</span> ·{" "}
              {assignTarget.location_label}
            </p>
            <label className="block">
              <FieldLabel>Department</FieldLabel>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
              <Button onClick={doAssign} disabled={busy}>{busy ? "Assigning…" : "Assign"}</Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Mark resolved">
        {resolveTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{resolveTarget.title}</span> ·{" "}
              <span className="font-data text-xs">{resolveTarget.id}</span>
            </p>
            <label className="block">
              <FieldLabel>Resolution notes</FieldLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Pothole patch applied; surface levelled and swept."
              />
            </label>
            <p className="border border-rule bg-well px-3 py-2 text-xs leading-5 text-ink-soft">
              Contributors will be asked to verify the repair with a fresh before/after capture. The
              file stays open until verification.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>Cancel</Button>
              <Button onClick={doResolve} disabled={busy}>
                {busy ? "Recording…" : "Mark resolved"}
                {!busy ? <MarkSeal className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
