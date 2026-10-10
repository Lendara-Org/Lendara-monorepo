"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/format";
import type { Messages } from "@/lib/i18n";
import { ApiError, FIAT_CURRENCIES, widgetApi, type FiatCurrency, type Quote, type WidgetTransaction } from "@/lib/widget-api";
import { Button, DetailRow, ErrorText } from "./ui";

const AMOUNT = /^\d+(\.\d{1,2})?$/;

type Props = {
  accessToken: string;
  t: Messages;
  onConfirmed: (tx: WidgetTransaction) => void;
  onError: (err: unknown) => void;
};

export function AmountStep({ accessToken, t, onConfirmed, onError }: Props) {
  const [currency, setCurrency] = useState<FiatCurrency>("CRC");
  const [input, setInput] = useState("");
  // Each quote is kept with the request it answers, so a stale one is never shown.
  const [result, setResult] = useState<{ key: string; quote?: Quote; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Accept "1.000,50"-style decimal commas: keep the last separator as the point.
  const amount = input.trim().replace(/[.,](?=.*[.,])/g, "").replace(",", ".");
  const valid = AMOUNT.test(amount) && Number(amount) > 0;
  const key = `${currency}:${amount}`;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      widgetApi
        .getQuote(accessToken, currency, amount, controller.signal)
        .then((quote) => setResult({ key, quote }))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof ApiError && err.status === 400) setResult({ key, error: err.message });
          else onError(err);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, currency, amount, key, valid, onError]);

  const current = valid && result?.key === key ? (result.quote ?? null) : null;
  const quoteError = valid && result?.key === key ? result.error : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setSubmitting(true);
    try {
      onConfirmed(await widgetApi.confirm(accessToken, currency, amount));
    } catch (err) {
      setSubmitting(false);
      onError(err);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-gray">{t.amount.currency}</legend>
        <div className="grid grid-cols-3 gap-2">
          {FIAT_CURRENCIES.map((c) => (
            <label
              key={c}
              className="cursor-pointer rounded-md border border-line bg-surface py-2 text-center font-mono text-sm has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-crimson"
            >
              <input type="radio" name="currency" value={c} checked={currency === c} onChange={() => setCurrency(c)} className="sr-only" />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-sm text-gray">
          {t.amount.amount}
        </label>
        <div className="flex items-center rounded-md border border-line bg-surface focus-within:border-ink">
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={input !== "" && !valid}
            aria-describedby="amount-help"
            className="h-12 w-full bg-transparent px-3 font-mono text-lg outline-none"
          />
          <span className="px-3 font-mono text-sm text-gray">{currency}</span>
        </div>
        {input !== "" && !valid ? <ErrorText>{t.amount.invalid}</ErrorText> : quoteError && <ErrorText>{quoteError}</ErrorText>}
      </div>

      <dl aria-live="polite" className="divide-y divide-line rounded-md border border-line bg-surface px-4">
        {current ? (
          <>
            <DetailRow label={t.amount.rate}>
              1 {current.asset_code} = {formatAmount(current.rate, t.locale)} {current.fiat_currency}
            </DetailRow>
            <DetailRow label={t.amount.fee}>
              {formatAmount(current.fee, t.locale, 7)} {current.asset_code}
            </DetailRow>
            <DetailRow label={t.amount.receive} strong>
              {formatAmount(current.amount_out, t.locale, 7)} {current.asset_code}
            </DetailRow>
          </>
        ) : (
          <p className="py-3 text-sm text-gray">{t.amount.hint}</p>
        )}
      </dl>

      <p id="amount-help" className="text-xs text-gray">
        {t.amount.scenarios}
      </p>

      <Button type="submit" disabled={!current} loading={submitting}>
        {t.amount.submit}
      </Button>
    </form>
  );
}
