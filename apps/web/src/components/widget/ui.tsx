import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { StatusTone } from "@/lib/format";

const BUTTON = {
  primary: "bg-ink text-paper hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:border-ink",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`h-12 rounded-md px-5 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Back + primary action, pinned to the bottom of each step. */
export function StepActions({
  onBack,
  backLabel,
  children,
}: {
  onBack?: (() => void) | undefined;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-auto flex gap-3 pt-2">
      {onBack && (
        <Button type="button" variant="secondary" onClick={onBack}>
          {backLabel}
        </Button>
      )}
      <div className="flex flex-1 [&>button]:w-full">{children}</div>
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-md border border-line bg-surface px-3 outline-none transition focus:border-ink aria-invalid:border-error";

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-gray">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props that tie an input to its Field error. */
export const errorProps = (id: string, error: string | null | undefined) =>
  error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

export function DetailRow({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-gray">{label}</dt>
      <dd className={`text-right font-mono ${strong ? "text-lg font-medium" : "text-sm"}`}>{children}</dd>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface px-4 ${className}`}>{children}</div>;
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
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase ${PILL[tone]}`}>
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

export function VisaMark({ dim = false }: { dim?: boolean }) {
  return (
    <span
      aria-hidden
      className={`select-none font-sans text-sm font-black italic tracking-tight transition-opacity ${dim ? "opacity-25" : ""}`}
    >
      VISA
    </span>
  );
}

export function LockIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
