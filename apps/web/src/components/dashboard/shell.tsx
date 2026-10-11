import Link from "next/link";
import type { ReactNode } from "react";

export function Shell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-2xl leading-none tracking-wide">Lendara</span>
            <span className="rounded-sm bg-wine px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none text-paper">
              Sandbox
            </span>
            <span className="text-sm text-gray">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-gray underline hover:text-ink">
              Docs
            </Link>
            {actions}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const button = e.currentTarget;
        void navigator.clipboard.writeText(value).then(() => {
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = label), 1500);
        });
      }}
      className="h-8 shrink-0 rounded-md border border-line px-3 text-xs text-ink transition hover:border-ink"
    >
      {label}
    </button>
  );
}
