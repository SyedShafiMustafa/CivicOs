import { useState } from "react";
import type { CSSProperties } from "react";

/**
 * Citizen avatar — AI-generated portrait when the API provides one,
 * initials plate otherwise. One component, all three platforms.
 */
export function Avatar({
  src,
  name,
  initials,
  className,
  style,
}: {
  src?: string | null;
  name?: string;
  initials: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name}'s avatar` : "Citizen avatar"}
        onError={() => setBroken(true)}
        className={className}
        style={style}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name ? `${name}'s avatar` : "Citizen avatar"}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--well, #ede9df)",
        color: "var(--ink-soft, #5b6157)",
        fontWeight: 700,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
