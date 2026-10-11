"use client";

import { Lendara, type Transaction } from "@lendara/widget";
import { useEffect, useState } from "react";

type Currency = "CRC" | "ARS" | "CLP";

const PRESETS: Record<Currency, string[]> = {
  CRC: ["10000", "25000", "50000"],
  ARS: ["20000", "50000", "100000"],
  CLP: ["10000", "25000", "50000"],
};

const G_ADDRESS = /^G[A-Z2-7]{55}$/;
const EXPLORER = "https://stellar.expert/explorer/testnet";

type Result = { kind: "completed"; tx: Transaction } | { kind: "failed"; message: string } | null;

type Props = { horizonUrl: string; usdcIssuer: string };

export function Store({ horizonUrl, usdcIssuer }: Props) {
  const [account, setAccount] = useState("");
  const [creating, setCreating] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  // USDC balance of an account, from Horizon; "no-trustline" or "unknown" if not readable.
  const [balanceOf, setBalanceOf] = useState<{ account: string; value: string } | null>(null);
  const [currency, setCurrency] = useState<Currency>("CRC");
  const [amount, setAmount] = useState(PRESETS.CRC[1]!);
  const [opening, setOpening] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [result, setResult] = useState<Result>(null);

  const validAccount = G_ADDRESS.test(account);
  const balance = validAccount && balanceOf?.account === account ? balanceOf.value : null;

  // Bumped after a deposit to read the balance again.
  const [balanceVersion, setBalanceVersion] = useState(0);

  useEffect(() => {
    if (!validAccount) return;
    let cancelled = false;
    void readBalance(horizonUrl, usdcIssuer, account).then((value) => {
      if (!cancelled) setBalanceOf({ account, value });
    });
    return () => {
      cancelled = true;
    };
  }, [account, validAccount, horizonUrl, usdcIssuer, balanceVersion]);

  async function createWallet() {
    setCreating(true);
    setWalletError(null);
    try {
      const res = await fetch("/api/wallet", { method: "POST" });
      const data = (await res.json()) as { account?: string; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error ?? "Could not create a test wallet.");
      setAccount(data.account);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Could not create a test wallet.");
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
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start the payment.");

      Lendara.open({
        url: `${data.url}&lang=en`,
        onStatus: (tx) => setEvents((e) => (e.at(-1) === tx.status ? e : [...e, tx.status])),
        onComplete: (tx) => {
          setResult({ kind: "completed", tx });
          setBalanceVersion((v) => v + 1);
        },
        onError: (err) => setResult({ kind: "failed", message: err.message }),
      });
    } catch (err) {
      setResult({ kind: "failed", message: err instanceof Error ? err.message : "Could not start the payment." });
    } finally {
      setOpening(false);
    }
  }

  return (
    <section aria-labelledby="store-title" className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-semibold tracking-tight text-ink">kora</span>
        <span className="rounded-full border border-line px-2.5 py-1 text-xs text-gray">Demo app</span>
      </header>

      <h1 id="store-title" className="mt-6 text-2xl font-semibold text-ink">
        Add dollars to your wallet
      </h1>
      <p className="mt-1 text-sm text-gray">Pay in your local currency and receive USDC on Stellar.</p>

      <fieldset className="mt-8 flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-ink">1. Your Stellar wallet</legend>
        <button
          type="button"
          onClick={createWallet}
          disabled={creating}
          className="h-11 rounded-lg border border-ink px-4 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-60"
        >
          {creating ? "Creating test wallet…" : "Create a test wallet"}
        </button>
        <label htmlFor="account" className="text-xs text-gray">
          Or paste a testnet address with a USDC trustline
        </label>
        <input
          id="account"
          value={account}
          onChange={(e) => setAccount(e.target.value.trim())}
          placeholder="G…"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={account !== "" && !validAccount}
          className="h-11 rounded-lg border border-line px-3 font-mono text-xs text-ink outline-none focus:border-ink"
        />
        {walletError && <p className="text-sm text-error">{walletError}</p>}
        {account !== "" && !validAccount && <p className="text-sm text-error">Enter a valid G… address.</p>}
        {validAccount && (
          <p className="flex justify-between text-sm">
            <a href={`${EXPLORER}/account/${account}`} target="_blank" rel="noreferrer" className="text-gray underline">
              View on explorer
            </a>
            <span className="font-mono text-ink">
              {balance === null
                ? "…"
                : balance === "no-trustline"
                  ? "No USDC trustline"
                  : balance === "unknown"
                    ? "Account not found"
                    : `${balance} USDC`}
            </span>
          </p>
        )}
      </fieldset>

      <fieldset className="mt-8 flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-ink">2. Amount</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PRESETS) as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => {
                setCurrency(c);
                setAmount(PRESETS[c][1]!);
              }}
              className={`h-10 rounded-lg border font-mono text-sm transition ${
                currency === c ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-paper"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS[currency].map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={amount === a}
              onClick={() => setAmount(a)}
              className={`h-10 rounded-lg border font-mono text-sm transition ${
                amount === a ? "border-ink text-ink" : "border-line text-gray hover:text-ink"
              }`}
            >
              {Number(a).toLocaleString("en-US")}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={addFunds}
        disabled={!validAccount || balance === "no-trustline" || balance === "unknown" || opening}
        className="mt-8 h-12 w-full rounded-lg bg-ink text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
      >
        {opening ? "Opening…" : `Add funds · ${Number(amount).toLocaleString("en-US")} ${currency}`}
      </button>
      <p className="mt-2 text-center text-xs text-gray">
        Test card <span className="font-mono">4242 4242 4242 4242</span>, any future date and CVC.
      </p>

      {events.length > 0 && (
        <div className="mt-6 rounded-lg border border-line p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray">Events from the widget</p>
          <ol className="mt-2 flex flex-col gap-1 font-mono text-xs text-ink">
            {events.map((e, i) => (
              <li key={`${i}-${e}`}>onStatus · {e}</li>
            ))}
          </ol>
        </div>
      )}

      {result?.kind === "completed" && (
        <div role="status" className="mt-4 rounded-lg border border-ink p-4 text-sm">
          <p className="font-medium text-ink">
            {result.tx.amount_out ? `${Number(result.tx.amount_out)} USDC` : "USDC"} received
          </p>
          {result.tx.stellar_transaction_id && (
            <a
              href={`${EXPLORER}/tx/${result.tx.stellar_transaction_id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-gray underline"
            >
              See the Stellar transaction
            </a>
          )}
        </div>
      )}
      {result?.kind === "failed" && (
        <p role="alert" className="mt-4 rounded-lg border border-error p-4 text-sm text-error">
          {result.message}
        </p>
      )}
    </section>
  );
}

async function readBalance(horizonUrl: string, usdcIssuer: string, account: string): Promise<string> {
  const res = await fetch(`${horizonUrl}/accounts/${account}`).catch(() => null);
  if (!res?.ok) return "unknown";
  const data = (await res.json()) as { balances: { asset_code?: string; asset_issuer?: string; balance: string }[] };
  const usdc = data.balances.find((b) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer);
  return usdc ? usdc.balance : "no-trustline";
}
