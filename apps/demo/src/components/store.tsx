"use client";

import { Lendara, type Transaction } from "@lendara/widget";
import { useEffect, useState, type ReactNode } from "react";
import { locales, type Lang, type Messages } from "@/lib/i18n";
import { estimateUsdc, RATES, type Currency } from "@/lib/rates";
import { CopyButton } from "./copy-button";

const PRESETS: Record<Currency, string[]> = {
  CRC: ["10000", "25000", "50000"],
  ARS: ["20000", "50000", "100000"],
  CLP: ["10000", "25000", "50000"],
};

const G_ADDRESS = /^G[A-Z2-7]{55}$/;
const EXPLORER = "https://stellar.expert/explorer/testnet";

type Balance = "loading" | "no-trustline" | "not-found" | { usdc: string };
type Result = { kind: "completed"; tx: Transaction } | { kind: "failed"; message: string } | null;

type Props = { t: Messages; lang: Lang; horizonUrl: string; usdcIssuer: string };

export function Store({ t, lang, horizonUrl, usdcIssuer }: Props) {
  const [account, setAccount] = useState("");
  const [creating, setCreating] = useState(false);
  const [walletError, setWalletError] = useState(false);
  const [balanceOf, setBalanceOf] = useState<{ account: string; version: number; value: Balance } | null>(null);
  // Bumped to read the balance again (after a deposit or a new trustline).
  const [version, setVersion] = useState(0);
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [amount, setAmount] = useState(PRESETS.CRC[1]!);
  const [opening, setOpening] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [result, setResult] = useState<Result>(null);

  const locale = locales[lang];
  const validAccount = G_ADDRESS.test(account);
  // Don't flag an address while it's still being typed.
  const showInvalid = account !== "" && !validAccount && (account.length >= 56 || !account.startsWith("G"));
  const balance: Balance =
    validAccount && balanceOf?.account === account && balanceOf.version === version ? balanceOf.value : "loading";
  const canPay = validAccount && typeof balance === "object" && !opening;

  useEffect(() => {
    if (!validAccount) return;
    let cancelled = false;
    void readBalance(horizonUrl, usdcIssuer, account).then((value) => {
      if (!cancelled) setBalanceOf({ account, version, value });
    });
    return () => {
      cancelled = true;
    };
  }, [account, validAccount, horizonUrl, usdcIssuer, version]);

  async function createWallet() {
    setCreating(true);
    setWalletError(false);
    try {
      const res = await fetch("/api/wallet", { method: "POST" });
      const data = (await res.json()) as { account?: string };
      if (!res.ok || !data.account) throw new Error();
      setAccount(data.account);
    } catch {
      setWalletError(true);
    } finally {
      setCreating(false);
    }
  }

  async function addFunds() {
    setOpening(true);
    setResult(null);
    setEvents([]);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, fiat_currency: currency, amount }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t.startError);

      Lendara.open({
        url: `${data.url}&lang=${lang}`,
        onStatus: (tx) => setEvents((e) => (e.at(-1) === tx.status ? e : [...e, tx.status])),
        onComplete: (tx) => {
          setResult({ kind: "completed", tx });
          setVersion((v) => v + 1);
        },
        onError: (err) => setResult({ kind: "failed", message: err.message }),
      });
    } catch (err) {
      setResult({ kind: "failed", message: err instanceof Error ? err.message : t.startError });
    } finally {
      setOpening(false);
    }
  }

  const fiat = (value: string) => `${Number(value).toLocaleString(locale)} ${currency}`;

  return (
    <section aria-labelledby="store-title" className="rounded-2xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-6 py-6 sm:px-8">
        <h1 id="store-title" className="text-2xl font-semibold tracking-tight text-ink">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-gray">{t.subtitle}</p>
      </div>

      <Step n={1} title={t.wallet.step}>
        {!validAccount ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={createWallet}
              disabled={creating}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-60"
            >
              {creating && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-crimson" />}
              {creating ? t.wallet.creating : t.wallet.create}
            </button>
            <p className="text-center text-xs text-gray">{t.wallet.createHint}</p>
            {walletError && <p className="text-sm text-error">{t.wallet.createError}</p>}

            <div className="my-1 flex items-center gap-3 text-xs uppercase tracking-wider text-gray">
              <span className="h-px flex-1 bg-line" />
              {t.wallet.or}
              <span className="h-px flex-1 bg-line" />
            </div>

            <label htmlFor="account" className="text-sm text-ink">
              {t.wallet.pasteLabel}
            </label>
            <input
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value.trim())}
              placeholder="G…"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={showInvalid}
              aria-describedby={showInvalid ? "account-error" : undefined}
              className="h-11 rounded-lg border border-line px-3 font-mono text-xs text-ink outline-none transition focus:border-ink aria-invalid:border-error"
            />
            {showInvalid && (
              <p id="account-error" className="text-sm text-error">
                {t.wallet.invalid}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-line p-3">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-xs text-ink">
                {account.slice(1, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-ink" title={account}>
                  {account.slice(0, 6)}…{account.slice(-6)}
                </p>
                <a href={`${EXPLORER}/account/${account}`} target="_blank" rel="noreferrer" className="text-xs text-gray underline">
                  {t.wallet.explorer}
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccount("");
                  setResult(null);
                  setEvents([]);
                }}
                className="text-xs text-gray underline hover:text-ink"
              >
                {t.wallet.change}
              </button>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray">{t.wallet.balance}</span>
              <span className="font-mono text-ink">
                {balance === "loading"
                  ? t.wallet.checking
                  : typeof balance === "object"
                    ? `${Number(balance.usdc).toLocaleString(locale, { maximumFractionDigits: 7 })} USDC`
                    : "—"}
              </span>
            </div>
            {balance === "not-found" && <p className="text-sm text-error">{t.wallet.notFound}</p>}
            {balance === "no-trustline" && (
              <TrustlineHelp
                t={t}
                issuer={usdcIssuer}
                onRecheck={() => setVersion((v) => v + 1)}
                onCreateWallet={() => {
                  setAccount("");
                  void createWallet();
                }}
              />
            )}
          </div>
        )}
      </Step>

      <Step n={2} title={t.amount.step}>
        <div role="radiogroup" aria-label={t.amount.step} className="grid grid-cols-3 gap-1 rounded-lg bg-paper p-1">
          {(Object.keys(RATES) as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currency === c}
              onClick={() => {
                setCurrency(c);
                setAmount(PRESETS[c][1]!);
              }}
              className={`h-9 rounded-md font-mono text-sm transition ${
                currency === c ? "bg-surface text-ink shadow-sm" : "text-gray hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PRESETS[currency].map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={amount === a}
              onClick={() => setAmount(a)}
              className={`h-11 rounded-lg border font-mono text-sm transition ${
                amount === a ? "border-ink text-ink" : "border-line text-gray hover:border-ink/40 hover:text-ink"
              }`}
            >
              {Number(a).toLocaleString(locale)}
            </button>
          ))}
        </div>
        <dl className="mt-4 rounded-lg border border-line text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray">{t.amount.youPay}</dt>
            <dd className="font-mono text-ink">{fiat(amount)}</dd>
          </div>
          <div className="flex justify-between border-t border-line px-4 py-3">
            <dt className="text-gray">{t.amount.estimate}</dt>
            <dd className="font-mono font-medium text-ink">
              {estimateUsdc(currency, amount).toLocaleString(locale, { maximumFractionDigits: 2 })} USDC
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-gray">{t.amount.note}</p>
      </Step>

      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <button
          type="button"
          onClick={addFunds}
          disabled={!canPay}
          className="h-12 w-full rounded-lg bg-ink text-sm font-medium text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {opening ? t.opening : t.pay(fiat(amount))}
        </button>
        <p className="mt-2 text-center text-xs text-gray">
          {t.testCard} <span className="font-mono text-ink">4242 4242 4242 4242</span>, {t.testCardRest}
        </p>

        {result?.kind === "completed" && (
          <div role="status" className="mt-5 flex gap-3 rounded-lg border border-ink p-4">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-paper">
              ✓
            </span>
            <div className="text-sm">
              <p className="font-medium text-ink">
                {t.result.received(Number(result.tx.amount_out ?? 0).toLocaleString(locale, { maximumFractionDigits: 7 }))}
              </p>
              {result.tx.stellar_transaction_id && (
                <a
                  href={`${EXPLORER}/tx/${result.tx.stellar_transaction_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block text-gray underline"
                >
                  {t.result.viewTx}
                </a>
              )}
            </div>
          </div>
        )}
        {result?.kind === "failed" && (
          <p role="alert" className="mt-5 rounded-lg border border-error p-4 text-sm text-error">
            {result.message}
          </p>
        )}

        {events.length > 0 && (
          <div className="mt-5 rounded-lg bg-paper p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray">{t.events}</p>
            <ol className="mt-2 flex flex-col gap-1 font-mono text-xs text-ink">
              {events.map((e, i) => (
                <li key={`${i}-${e}`}>
                  <span className="text-gray">onStatus ·</span> {e}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line px-6 py-6 sm:px-8">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="mb-4 flex items-center gap-2.5 text-sm font-medium text-ink">
        <span className="flex size-6 items-center justify-center rounded-full border border-ink font-mono text-xs">{n}</span>
        {title}
      </p>
      {children}
    </fieldset>
  );
}

function TrustlineHelp({
  t,
  issuer,
  onRecheck,
  onCreateWallet,
}: {
  t: Messages;
  issuer: string;
  onRecheck: () => void;
  onCreateWallet: () => void;
}) {
  return (
    <div role="note" className="rounded-lg border border-wine/40 bg-paper p-4 text-sm text-ink">
      <p className="font-medium">{t.trust.title}</p>
      <p className="mt-2 leading-relaxed text-gray">{t.trust.why}</p>

      <dl className="mt-3 flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <dt className="text-xs text-gray">{t.trust.code}</dt>
            <dd className="font-mono">USDC</dd>
          </div>
          <CopyButton value="USDC" label={t.copy} copied={t.copied} />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <div className="min-w-0">
            <dt className="text-xs text-gray">{t.trust.issuer}</dt>
            <dd className="break-all font-mono text-xs">{issuer}</dd>
          </div>
          <CopyButton value={issuer} label={t.copy} copied={t.copied} />
        </div>
      </dl>
      <a
        href={`${EXPLORER}/asset/USDC-${issuer}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs text-gray underline"
      >
        {t.trust.verify}
      </a>

      <details className="mt-3 group">
        <summary className="cursor-pointer text-sm font-medium">{t.trust.howTo}</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-gray">
          {t.trust.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <div className="mt-4 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={onRecheck}
          className="h-10 rounded-lg border border-ink px-4 text-sm font-medium transition hover:bg-surface"
        >
          {t.trust.recheck}
        </button>
        <button type="button" onClick={onCreateWallet} className="text-left text-xs text-gray underline hover:text-ink">
          {t.trust.shortcut}
        </button>
      </div>
    </div>
  );
}

async function readBalance(horizonUrl: string, usdcIssuer: string, account: string): Promise<Balance> {
  const res = await fetch(`${horizonUrl}/accounts/${account}`).catch(() => null);
  if (!res?.ok) return "not-found";
  const data = (await res.json()) as { balances: { asset_code?: string; asset_issuer?: string; balance: string }[] };
  const usdc = data.balances.find((b) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer);
  return usdc ? { usdc: usdc.balance } : "no-trustline";
}
