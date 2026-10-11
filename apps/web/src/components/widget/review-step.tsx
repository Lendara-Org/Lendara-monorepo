"use client";

import { useState } from "react";
import { digitsOnly } from "@/lib/card";
import { formatAmount, shorten } from "@/lib/format";
import type { StepProps } from "./draft";
import { Button, DetailRow, LockIcon, Panel, StepActions } from "./ui";

type Props = Omit<StepProps, "onChange" | "onNext"> & {
  destination: string | undefined;
  onPay: () => Promise<void>;
};

export function ReviewStep({ t, draft, destination, onPay, onBack }: Props) {
  const [paying, setPaying] = useState(false);
  const { quote } = draft;
  if (!quote) return null;
  const youPay = `${formatAmount(quote.amount_in, t.locale)} ${quote.fiat_currency}`;

  async function pay() {
    setPaying(true);
    try {
      await onPay();
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Panel>
        <dl className="divide-y divide-line">
          <DetailRow label={t.review.youPay}>{youPay}</DetailRow>
          <DetailRow label={t.review.rate}>
            1 {quote.asset_code} = {formatAmount(quote.rate, t.locale)} {quote.fiat_currency}
          </DetailRow>
          <DetailRow label={t.review.fee}>
            {formatAmount(quote.fee, t.locale, 7)} {quote.asset_code}
          </DetailRow>
          <DetailRow label={t.review.youReceive} strong>
            {formatAmount(quote.amount_out, t.locale, 7)} {quote.asset_code}
          </DetailRow>
        </dl>
      </Panel>
      <Panel>
        <dl className="divide-y divide-line">
          {destination && (
            <DetailRow label={t.review.destination}>
              <span title={destination}>{shorten(destination)}</span>
            </DetailRow>
          )}
          <DetailRow label={t.review.card}>VISA •••• {digitsOnly(draft.cardNumber).slice(-4)}</DetailRow>
          <DetailRow label={t.review.buyer}>
            <span className="font-sans">{draft.name.trim()}</span>
          </DetailRow>
        </dl>
      </Panel>
      <StepActions onBack={paying ? undefined : onBack} backLabel={t.back}>
        <Button type="button" onClick={pay} loading={paying} className="flex items-center justify-center gap-2">
          <LockIcon />
          {t.review.pay(youPay)}
        </Button>
      </StepActions>
    </div>
  );
}
