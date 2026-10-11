/** SEP-24 transaction statuses. */
export type TransactionStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_user_transfer_complete"
  | "pending_external"
  | "pending_anchor"
  | "on_hold"
  | "pending_stellar"
  | "pending_trust"
  | "pending_user"
  | "completed"
  | "refunded"
  | "expired"
  | "no_market"
  | "too_small"
  | "too_large"
  | "error";

/** The transaction the widget posts on each status change (SEP-24 schema). */
export type Transaction = {
  id: string;
  kind: "deposit" | "withdrawal";
  status: TransactionStatus;
  amount_in?: string;
  amount_in_asset?: string;
  amount_out?: string;
  amount_out_asset?: string;
  amount_fee?: string;
  stellar_transaction_id?: string;
  to?: string;
  message?: string;
  more_info_url?: string;
  started_at: string;
  completed_at?: string;
};

/** Statuses after which the deposit can't complete anymore. */
export const FAILED_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  "refunded",
  "expired",
  "no_market",
  "too_small",
  "too_large",
  "error",
]);

export type WidgetMessage = { type: "close" } | { type: "transaction"; transaction: Transaction };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Reads a message posted by the widget; returns null for anything else. */
export function parseMessage(data: unknown): WidgetMessage | null {
  if (!isObject(data)) return null;
  if (data.type === "lendara:close") return { type: "close" };
  const tx = data.transaction;
  if (isObject(tx) && typeof tx.id === "string" && typeof tx.status === "string") {
    return { type: "transaction", transaction: tx as Transaction };
  }
  return null;
}
