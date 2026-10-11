"use client";

import { useEffect, useState } from "react";
import type { LandingCopy } from "@/content/landing/types";
import { explorerTxUrl, shorten } from "@/lib/format";

// A real deposit made from the demo on Stellar testnet.
const EXAMPLE = {
  amountIn: 25000,
  currency: "CRC",
  amountOut: 48.5196078,
  destination: "GD44TCPKUPFVDHQQX6B62GBCPX6JRAHZXA6DWPXZPFDTQ4MZDRJU3ZEY",
  hash: "5ecead5705afc23cf4b4878932ab11169047b17c82faa196242a7b69580eecde",
};

type Step = "pending" | "processing" | "sending" | "completed";
const STEPS: Step[] = ["pending", "processing", "sending", "completed"];
const STEP_MS = 900;

/** "Transferencia verificable": plays the deposit once on load, then rests on completed. */
export function TransferCard({ t, initial = "pending" }: { t: LandingCopy["transfer"]; initial?: Step }) {
  const [step, setStep] = useState<Step>(initial);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setStep("completed"), 0);
      return () => clearTimeout(id);
    }
    const timers = STEPS.slice(1).map((s, i) => setTimeout(() => setStep(s), (i + 1) * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  const done = step === "completed";
  const fmt = (n: number, digits: number) =>
    n.toLocaleString(t.locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });

  return (
    <figure className="w-full max-w-md">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-ink/5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray">{t.label}</span>
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase transition-colors ${
              done ? "border-ink bg-ink text-paper" : "border-ink text-ink"
            }`}
          >
            {done ? <span aria-hidden>✓</span> : <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-crimson" />}
            {t.states[step]}
          </span>
        </div>

        <p className="mt-6 font-mono text-4xl tracking-tight text-ink">
          {fmt(EXAMPLE.amountOut, 7)} <span className="text-xl text-gray">USDC</span>
        </p>
        <p className="mt-1 text-sm text-gray">
          {t.paid} <span className="font-mono text-ink">{fmt(EXAMPLE.amountIn, 2)} {EXAMPLE.currency}</span>
        </p>

        <ol aria-hidden className="mt-6 grid grid-cols-4 gap-1.5">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`h-1 rounded-full transition-colors duration-500 ${
                i < STEPS.indexOf(step) || done ? "bg-ink" : s === step ? "bg-crimson" : "bg-line"
              }`}
            />
          ))}
        </ol>

        <dl className="mt-6 divide-y divide-line border-t border-line text-sm">
          <Row label={t.network}>Stellar testnet</Row>
          <Row label={t.destination}>
            <span className="font-mono">{shorten(EXAMPLE.destination)}</span>
          </Row>
          <Row label={t.hash}>
            <span className={`font-mono transition-opacity duration-500 ${done ? "opacity-100" : "opacity-30"}`}>
              {shorten(EXAMPLE.hash, 6, 6)}
            </span>
          </Row>
        </dl>

        <a
          href={explorerTxUrl(EXAMPLE.hash)}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!done}
          className={`mt-5 flex h-11 items-center justify-center rounded-lg border border-ink text-sm font-medium text-ink transition hover:bg-paper ${
            done ? "" : "pointer-events-none opacity-40"
          }`}
        >
          {t.explorer}
        </a>
      </div>
      <figcaption className="mt-3 text-center text-xs text-gray">{t.caption}</figcaption>
    </figure>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-gray">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
