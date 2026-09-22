/** Tiny class combiner (clsx-free, dependency-light). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
