"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { scenarioFor } from "@/lib/card";
import { isTerminal } from "@/lib/format";
import { getMessages, type Messages } from "@/lib/i18n";
import { ApiError, widgetApi, type TransactionStatus, type WidgetTransaction } from "@/lib/widget-api";
import { clearSession, startSession } from "@/lib/widget-session";
import { AmountStep } from "./amount-step";
import { CardStep } from "./card-step";
import { DetailsStep } from "./details-step";
import { initialDraft, type Draft } from "./draft";
import { ReviewStep } from "./review-step";
import { StatusStep } from "./status-step";
import { Button, LockIcon } from "./ui";

const POLL_MS = 2000;
const STATUS_STEP = 4;

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string; retry: boolean }
  | { phase: "ready"; accessToken: string; tx: WidgetTransaction };

type Props = {
  transactionId: string;
  token: string | null;
  lang: string | undefined;
  fiatCurrency?: string | undefined;
  fiatAmount?: string | undefined;
};

export function DepositWidget({ transactionId, token, lang, fiatCurrency, fiatAmount }: Props) {
  const { lang: code, t } = getMessages(lang);
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(fiatCurrency, fiatAmount));
  const embed = useEmbed();

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
        if (cancelled) return;
        // The amount was confirmed in an earlier visit: it can't change anymore.
        if (tx.transaction.status === "pending_user_transfer_start" && tx.quote) {
          const quote = tx.quote;
          setDraft((d) => ({ ...d, quote, currency: quote.fiat_currency }));
          setStep((s) => Math.max(s, 1));
        }
        setState({ phase: "ready", accessToken, tx });
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
  const change = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  /** Confirms the amount (once) and simulates the card payment. */
  async function pay() {
    const scenario = scenarioFor(draft.cardNumber);
    if (!ready || !draft.quote || !scenario) return;
    try {
      let tx = ready.tx;
      if (tx.transaction.status === "incomplete") {
        tx = await widgetApi.confirm(ready.accessToken, draft.quote.fiat_currency, draft.quote.amount_in);
        update(tx);
      }
      update(await widgetApi.simulatePayment(ready.accessToken, scenario));
    } catch (err) {
      fail(err);
    }
  }

  const inCheckout = status === "incomplete" || status === "pending_user_transfer_start";
  const current = ready && !inCheckout ? STATUS_STEP : step;
  const amountLocked = status === "pending_user_transfer_start";
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);
  const stepProps = { t, draft, onChange: change, onNext: next };

  return (
    <div className="min-h-dvh sm:flex sm:items-center sm:justify-center sm:p-6">
      <main
        lang={code}
        className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface sm:h-[min(780px,calc(100dvh-3rem))] sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line sm:shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-2xl leading-none tracking-wide">Lendara</span>
            <span className="rounded-sm bg-wine px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none text-paper">
              Sandbox
            </span>
          </div>
          {embed && (
            <button
              type="button"
              onClick={() => close(embed)}
              aria-label={t.close}
              className="flex size-9 items-center justify-center rounded-full text-xl text-gray transition hover:bg-paper hover:text-ink"
            >
              <span aria-hidden>×</span>
            </button>
          )}
        </header>

        <div className="px-5 pt-5">
          <h1 className="text-xl font-semibold">{t.title}</h1>
          {ready && <Progress t={t} current={current} finished={isTerminal(ready.tx.transaction.status)} />}
        </div>

        <div key={ready ? current : state.phase} className="flex flex-1 animate-step-in flex-col overflow-y-auto px-5 py-5">
          {state.phase === "loading" && (
            <p role="status" className="text-sm text-gray">
              {t.loading}
            </p>
          )}

          {state.phase === "error" && (
            <div role="alert" className="flex flex-col gap-4">
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

          {ready && current === 0 && (
            <AmountStep {...stepProps} accessToken={ready.accessToken} onError={fail} />
          )}
          {ready && current === 1 && <DetailsStep {...stepProps} onBack={amountLocked ? undefined : back} />}
          {ready && current === 2 && <CardStep {...stepProps} onBack={back} />}
          {ready && current === 3 && (
            <ReviewStep t={t} draft={draft} destination={ready.tx.transaction.to} onPay={pay} onBack={back} />
          )}
          {ready && current === STATUS_STEP && <StatusStep tx={ready.tx} t={t} scenario={scenarioFor(draft.cardNumber)} />}
        </div>

        <footer className="flex flex-col items-center gap-0.5 border-t border-line px-5 py-3 text-center text-xs text-gray">
          <span className="flex items-center gap-1.5">
            <LockIcon />
            {t.poweredBy}
          </span>
          <span>{t.sandbox}</span>
        </footer>
      </main>
    </div>
  );
}

const isProcessing = (status: TransactionStatus) =>
  status !== "incomplete" && status !== "pending_user_transfer_start" && !isTerminal(status);

function Progress({ t, current, finished }: { t: Messages; current: number; finished: boolean }) {
  const total = t.steps.length;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs text-gray">
        {t.stepOf(current + 1, total)} · <span className="text-ink">{t.steps[current]}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {t.steps.map((label, i) => (
          <li key={label} aria-current={i === current ? "step" : undefined}>
            <span className="sr-only">{label}</span>
            <span
              aria-hidden
              className={`block h-1 rounded-full transition-colors ${
                i < current || finished ? "bg-ink" : i === current ? "bg-crimson" : "bg-line"
              }`}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

type Embed = "popup" | "iframe";

/** How the widget was opened: by a wallet's popup, inside an iframe, or neither. */
function useEmbed(): Embed | null {
  return useSyncExternalStore(
    () => () => {},
    () => (window.opener ? "popup" : window.parent !== window ? "iframe" : null),
    () => null,
  );
}

function close(embed: Embed) {
  if (embed === "popup") window.close();
  else window.parent.postMessage({ type: "lendara:close" }, "*");
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
