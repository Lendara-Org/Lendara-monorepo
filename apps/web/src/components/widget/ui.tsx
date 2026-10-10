import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { StatusTone } from "@/lib/format";

export function Button({
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className="h-12 w-full rounded-md bg-ink font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function DetailRow({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-gray">{label}</dt>
      <dd className={`text-right font-mono ${strong ? "text-lg font-medium" : "text-sm"}`}>{children}</dd>
    </div>
  );
}

// Status is told by shape and text, never by color alone.
const PILL: Record<StatusTone, string> = {
  completed: "bg-ink text-paper border-ink",
  processing: "border-ink text-ink",
  trustline: "border-wine text-wine",
  failed: "border-error text-error",
  expired: "border-gray text-gray",
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase ${PILL[tone]}`}>
      {tone === "completed" && <span aria-hidden>✓</span>}
      {tone === "processing" && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-crimson" />}
      {children}
    </span>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-error">
      {children}
    </p>
  );
}
