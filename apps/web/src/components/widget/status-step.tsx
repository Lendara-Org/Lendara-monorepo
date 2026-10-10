import { explorerTxUrl, formatAmount, isTerminal, shorten, statusTone } from "@/lib/format";
import type { Messages } from "@/lib/i18n";
import type { WidgetTransaction } from "@/lib/widget-api";
import { DetailRow, StatusPill } from "./ui";

// The "verifiable transfer": status, amount, destination and the testnet hash.
export function StatusStep({ tx, t }: { tx: WidgetTransaction; t: Messages }) {
  const { transaction } = tx;
  const tone = statusTone(transaction.status);
  const hash = transaction.stellar_transaction_id;

  return (
    <div className="flex flex-col gap-5">
      <section aria-live="polite" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
        <StatusPill tone={tone}>{t.status[tone]}</StatusPill>
        {tone === "trustline" && <p className="text-sm">{t.status.trustlineHelp}</p>}
        {transaction.message && tone !== "processing" && <p className="text-sm text-gray">{transaction.message}</p>}

        <dl className="divide-y divide-line">
          {tx.quote && (
            <DetailRow label={t.status.amount} strong>
              {formatAmount(tx.quote.amount_out, t.locale, 7)} {tx.quote.asset_code}
            </DetailRow>
          )}
          {transaction.to && (
            <DetailRow label={t.status.destination}>
              <span title={transaction.to}>{shorten(transaction.to)}</span>
            </DetailRow>
          )}
          <DetailRow label={t.status.network}>Stellar testnet</DetailRow>
          {hash && (
            <DetailRow label={t.status.transaction}>
              <a
                href={explorerTxUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                {shorten(hash, 6, 6)} · {t.status.explorer}
              </a>
            </DetailRow>
          )}
        </dl>
      </section>
      {isTerminal(transaction.status) && <p className="text-center text-sm text-gray">{t.status.close}</p>}
    </div>
  );
}
