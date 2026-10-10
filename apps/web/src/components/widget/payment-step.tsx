"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/format";
import type { Messages } from "@/lib/i18n";
import { widgetApi, type WidgetTransaction } from "@/lib/widget-api";
import { Button, DetailRow } from "./ui";

type Props = {
  accessToken: string;
  tx: WidgetTransaction;
  t: Messages;
  onPaid: (tx: WidgetTransaction) => void;
  onError: (err: unknown) => void;
};

export function PaymentStep({ accessToken, tx, t, onPaid, onError }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const instructions = tx.payment_instructions;

  async function simulate() {
    setSubmitting(true);
    try {
      onPaid(await widgetApi.simulatePayment(accessToken));
    } catch (err) {
      setSubmitting(false);
      onError(err);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-md border border-line bg-surface px-4 py-2">
        <h2 className="py-2 font-medium">{t.payment.title}</h2>
        {instructions && (
          <dl className="divide-y divide-line">
            <DetailRow label={t.payment.reference}>{instructions.reference}</DetailRow>
            <DetailRow label={t.payment.amount} strong>
              {formatAmount(instructions.amount, t.locale)} {instructions.fiat_currency}
            </DetailRow>
            {tx.quote && (
              <DetailRow label={t.amount.receive}>
                {formatAmount(tx.quote.amount_out, t.locale, 7)} {tx.quote.asset_code}
              </DetailRow>
            )}
          </dl>
        )}
      </section>
      <p className="text-xs text-gray">{t.payment.note}</p>
      <Button type="button" onClick={simulate} loading={submitting}>
        {t.payment.submit}
      </Button>
    </div>
  );
}
