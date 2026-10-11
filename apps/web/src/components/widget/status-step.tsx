import { explorerTxUrl, formatAmount, isTerminal, shorten, statusTone } from "@/lib/format";
import type { Messages } from "@/lib/i18n";
import type { SandboxScenario, TransactionStatus, WidgetTransaction } from "@/lib/widget-api";
import { DetailRow, Panel, StatusPill } from "./ui";

/** How far along the timeline a status is: steps before it are done. */
function timelineStep(status: TransactionStatus): number | null {
  switch (status) {
    case "pending_anchor":
      return 1;
    case "pending_stellar":
      return 2;
    case "completed":
      return 3;
    default:
      return null;
  }
}

// The "verifiable transfer": status, amount, destination and the testnet hash.
export function StatusStep({ tx, t, scenario }: { tx: WidgetTransaction; t: Messages; scenario?: SandboxScenario | undefined }) {
  const { transaction } = tx;
  const tone = statusTone(transaction.status);
  const ended = tone === "failed" || tone === "expired";
  // The card's scenario explains the outcome in the user's language; after a
  // reload only the API message is left.
  const reason = (scenario && t.status.outcomes[scenario]) ?? transaction.message;
  const step = timelineStep(transaction.status);
  const hash = transaction.stellar_transaction_id;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div aria-live="polite" className="flex flex-col gap-3">
        <StatusPill tone={tone}>{t.status[tone]}</StatusPill>
        {tone === "trustline" && <p className="text-sm">{t.status.trustlineHelp}</p>}
        {ended && (
          <>
            {reason && <p className="text-sm">{reason}</p>}
            <p className="text-sm text-gray">{t.status.tryAgain}</p>
          </>
        )}
      </div>

      {step !== null && (
        <ol className="flex flex-col gap-3 pl-1">
          {t.status.timeline.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                    state === "done" ? "border-ink bg-ink text-paper" : state === "active" ? "border-ink" : "border-line"
                  }`}
                >
                  {state === "done" ? "✓" : state === "active" && <span className="size-1.5 animate-pulse rounded-full bg-crimson" />}
                </span>
                <span className={state === "todo" ? "text-gray" : ""}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {!ended && (
        <Panel>
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
        </Panel>
      )}
      {isTerminal(transaction.status) && <p className="mt-auto text-center text-sm text-gray">{t.status.done}</p>}
    </div>
  );
}
