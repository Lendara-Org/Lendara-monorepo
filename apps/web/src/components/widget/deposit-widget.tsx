"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isTerminal } from "@/lib/format";
import { getMessages, type Messages } from "@/lib/i18n";
import { ApiError, widgetApi, type TransactionStatus, type WidgetTransaction } from "@/lib/widget-api";
import { clearSession, startSession } from "@/lib/widget-session";
import { AmountStep } from "./amount-step";
import { PaymentStep } from "./payment-step";
import { StatusStep } from "./status-step";
import { Button } from "./ui";

const POLL_MS = 2000;

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string; retry: boolean }
  | { phase: "ready"; accessToken: string; tx: WidgetTransaction };

type Props = { transactionId: string; token: string | null; lang: string | undefined };

export function DepositWidget({ transactionId, token, lang }: Props) {
  const { lang: code, t } = getMessages(lang);
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  const fail = useCallback(
    (err: unknown, unauthorized = t.errors.sessionExpired) => {
      if (err instanceof ApiError && err.status === 401) {
        clearSession(transactionId);
        setState({ phase: "error", message: unauthorized, retry: false });
      } else {
        setState({ phase: "error", message: t.errors.generic, retry: true });
      }
    },
    [transactionId, t],
  );

  useEffect(() => {
    let cancelled = false;
    startSession(transactionId, token)
      .then(async (accessToken) => {
        // The one-time token is spent: keep it out of the address bar and history.
        const url = new URL(window.location.href);
        if (url.searchParams.has("token")) {
          url.searchParams.delete("token");
          window.history.replaceState(window.history.state, "", url);
        }
        const tx = await widgetApi.getTransaction(accessToken);
        if (!cancelled) setState({ phase: "ready", accessToken, tx });
      })
      .catch((err: unknown) => {
        if (!cancelled) fail(err, t.errors.invalidLink);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId, token, attempt, fail, t]);

  const ready = state.phase === "ready" ? state : null;
  const accessToken = ready?.accessToken;
  const status = ready?.tx.transaction.status;

  // Poll while the anchor is working on the deposit. Transient errors are retried.
  useEffect(() => {
    if (!accessToken || !status || !isProcessing(status)) return;
    const timer = setInterval(() => {
      widgetApi
        .getTransaction(accessToken)
        .then((tx) => setState((s) => (s.phase === "ready" ? { ...s, tx } : s)))
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 401) fail(err);
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [accessToken, status, fail]);

  usePostTransaction(ready?.tx);

  const update = useCallback((tx: WidgetTransaction) => setState((s) => (s.phase === "ready" ? { ...s, tx } : s)), []);

  return (
    <main lang={code} className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-3xl tracking-wide">Lendara</span>
        <span className="font-mono text-xs uppercase text-gray">Testnet</span>
      </header>
      <p className="rounded-md bg-wine px-3 py-2 text-sm text-paper">{t.sandbox}</p>
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      {state.phase === "loading" && (
        <p role="status" className="text-sm text-gray">
          {t.loading}
        </p>
      )}

      {state.phase === "error" && (
        <div role="alert" className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
          <p className="text-sm">{state.message}</p>
          {state.retry && (
            <Button
              type="button"
              onClick={() => {
                setState({ phase: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              {t.errors.retry}
            </Button>
          )}
        </div>
      )}

      {ready && (
        <>
          <Stepper t={t} status={ready.tx.transaction.status} />
          {ready.tx.transaction.status === "incomplete" ? (
            <AmountStep accessToken={ready.accessToken} t={t} onConfirmed={update} onError={fail} />
          ) : ready.tx.transaction.status === "pending_user_transfer_start" ? (
            <PaymentStep accessToken={ready.accessToken} tx={ready.tx} t={t} onPaid={update} onError={fail} />
          ) : (
            <StatusStep tx={ready.tx} t={t} />
          )}
        </>
      )}
    </main>
  );
}

const isProcessing = (status: TransactionStatus) =>
  status !== "incomplete" && status !== "pending_user_transfer_start" && !isTerminal(status);

function Stepper({ t, status }: { t: Messages; status: TransactionStatus }) {
  const current =
    status === "incomplete" ? 0 : status === "pending_user_transfer_start" ? 1 : isTerminal(status) ? 3 : 2;
  return (
    <ol className="grid grid-cols-3 gap-2">
      {t.steps.map((label, i) => (
        <li key={label} aria-current={i === current ? "step" : undefined} className="flex flex-col gap-2">
          <span className={`h-1 rounded-full ${i < current ? "bg-ink" : i === current ? "bg-crimson" : "bg-line"}`} />
          <span className={`text-xs ${i <= current ? "text-ink" : "text-gray"}`}>
            {i + 1}. {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * SEP-24: tells the wallet that opened the widget (popup or iframe) about
 * each status change by posting `{ transaction }`.
 */
function usePostTransaction(tx: WidgetTransaction | undefined) {
  const last = useRef<string | null>(null);
  const transaction = tx?.transaction;
  useEffect(() => {
    if (!transaction) return;
    const key = `${transaction.status}:${transaction.stellar_transaction_id ?? ""}`;
    if (last.current === key) return;
    last.current = key;
    const target: Window | null = window.opener ?? (window.parent !== window ? window.parent : null);
    target?.postMessage({ transaction }, "*");
  }, [transaction]);
}
