export function fmtDistance(m: number | null | undefined): string {
  if (m == null) return "";
  if (m < 950) return `${Math.round(m / 10) * 10}m away`;
  return `${(m / 1000).toFixed(1)}km away`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(Date.now() - then, 0);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 45) return `${days}d ago`;
  return fmtDate(iso);
}

export function daysBetween(a: string, b: string): number {
  return Math.max(
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000),
    1
  );
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
