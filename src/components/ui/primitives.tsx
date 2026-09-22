"use client";

/**
 * Core primitives for the survey-sheet design language.
 *
 * Depth = hard ink plates (offset solid shadows), never blur. Corners are
 * deliberate: square on plates and stamps (drafting tools are square), 6px
 * only on photographic evidence. Loading = "pen" bars tracing across dashed
 * field outlines, never skeletons.
 */
import { cn } from "@/lib/cn";
import { GlyphClose, GlyphReset } from "@/lib/glyphs";
export { cn };
import type {
  ButtonHTMLAttributes,
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ Button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ink";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 border font-medium",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-accent focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[13.5px]",
        variant === "primary" &&
          "border-ink bg-ink text-panel shadow-[2px_2px_0_0_var(--rule)] hover:bg-accent hover:border-accent hover:shadow-[2px_2px_0_0_var(--accent-wash)]",
        variant === "ink" &&
          "border-accent bg-accent text-panel shadow-[3px_3px_0_0_var(--rule-strong)] hover:bg-ink hover:border-ink hover:shadow-[3px_3px_0_0_var(--rule)]",
        variant === "secondary" &&
          "border-rule-strong bg-panel text-ink hover:border-ink hover:bg-well",
        variant === "ghost" &&
          "border-transparent bg-transparent text-ink-soft hover:bg-well hover:text-ink",
        variant === "danger" &&
          "border-alert bg-alert text-panel shadow-[2px_2px_0_0_var(--alert-wash)] hover:bg-alert/85",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Stamps */

/** Square registry stamp: tick + small-caps label. Not a pill. */
export function Stamp({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: ReactNode;
  tone?: "neutral" | "alert" | "warn" | "hold" | "ok" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "border-rule-strong bg-well text-ink-soft",
    alert: "border-alert/40 bg-alert-wash text-alert",
    warn: "border-warn/40 bg-warn-wash text-warn",
    hold: "border-hold/40 bg-hold-wash text-hold",
    ok: "border-ok/40 bg-ok-wash text-ok",
    accent: "border-accent/40 bg-accent-wash text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.11em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Registry tick: small geometric marker used instead of emoji/checkmark bullets. */
export function Tick({ char, className }: { char: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("select-none text-[0.72em] leading-none", className)}>
      {char}
    </span>
  );
}

/** Ink dot for status. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rotate-45", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  tone = "panel",
}: {
  className?: string;
  children: ReactNode;
  tone?: "panel" | "ink" | "accent";
}) {
  return (
    <div
      className={cn(
        tone === "panel" && "plate",
        tone === "ink" && "plate-ink",
        tone === "accent" && "plate-accent",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Section head with the double-rule signature of survey sheets. */
export function SectionHead({
  title,
  sub,
  action,
  className,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  className?: string;
}) {    return (
    <div className={cn("px-5 pb-3.5 pt-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {sub ? <p className="mt-1 text-xs leading-5 text-ink-faint">{sub}</p> : null}
        </div>
        {action}
      </div>
      <div className="rule-double mt-4" aria-hidden="true" />
    </div>
  );
}

/* ----------------------------------------------------------------- Loading */

/** Pen bar: a ruled field filling with ink. Replaces skeleton loaders. */
export function PenField({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("pen-loading h-3.5 w-full", className)} />;
}

/** Full panel loading state: dashed survey outline with marching pen lines. */
export function PenPanel({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3.5 p-5", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.18 }}>
          <span className="h-2 w-2 shrink-0 rotate-45 border border-rule-strong" />
          <div className="flex-1 space-y-1.5">
            <PenField className="w-2/5" />
            <PenField className="h-2.5 w-4/5 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Empty / error */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 flex h-10 w-10 items-center justify-center border border-dashed border-rule-strong text-ink-faint">
        {icon ?? <GlyphReset className="h-5 w-5" />}
      </span>
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-xs leading-5 text-ink-faint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center border border-alert/40 bg-alert-wash text-alert">
        <GlyphClose className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-ink">The survey sheet could not load</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-ink-faint">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <GlyphReset className="h-3.5 w-3.5" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Dialog */

export function Dialog({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div className={cn("plate-ink relative w-full animate-fade-up", width)}>
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            <GlyphClose className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Inputs */

const fieldCls =
  "border border-rule-strong bg-panel px-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, "h-9 w-full", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, "w-full py-2 leading-5", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldCls, "h-9 w-full", className)} {...props} />;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[13.5px] text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-ink-faint">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-10 shrink-0 border transition-colors",
          checked ? "border-accent bg-accent" : "border-rule-strong bg-well"
        )}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 bg-panel transition-all",
            checked ? "left-[24px]" : "left-[2px]",
            !checked && "border border-rule-strong"
          )}
        />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- EvidencePlate */

/** Photographic evidence frame. Square-cornered with an ink border and a
 *  registration notch; the only place in the UI allowed a small radius. */
export function EvidencePlate({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center border border-dashed border-rule-strong bg-well text-ink-faint", className)}>
        <GlyphReset className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden border border-ink", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <span aria-hidden="true" className="absolute left-0 top-0 h-1.5 w-1.5 border-b border-r border-panel bg-ink" />
    </div>
  );
}

/* ------------------------------------------------------------ Confidence bar */

/** Ruled confidence gauge: tick marks like a scale, ink fill for value. */
export function ConfidenceGauge({ value, label }: { value: number; label?: string }) {
  const p = Math.round(value * 100);
  return (
    <div className="max-w-xs">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-faint">{label ?? "Model confidence"}</span>
        <span className="font-data text-[13px] font-semibold text-ink tabular">{p}%</span>
      </div>
      <div className="relative mt-1.5 h-3 border border-rule-strong bg-panel">
        <div className="absolute inset-y-0 left-0 bg-accent/85" style={{ width: `${p}%` }} />
        {[25, 50, 75].map((t) => (
          <span
            key={t}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-rule-strong/70"
            style={{ left: `${t}%` }}
          />
        ))}
      </div>
    </div>
  );
}
