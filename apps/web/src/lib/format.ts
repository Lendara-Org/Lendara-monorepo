import type { TransactionStatus } from "./widget-api";

export function formatAmount(value: string, locale: string, maxDecimals = 2): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Math.min(2, maxDecimals),
    maximumFractionDigits: maxDecimals,
  }).format(Number(value));
}

/** GAO7…NMNT5 */
export function shorten(value: string, head = 4, tail = 5): string {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

export const explorerTxUrl = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

export type StatusTone = "processing" | "completed" | "failed" | "expired" | "trustline";

const TERMINAL: readonly TransactionStatus[] = [
  "completed",
  "refunded",
  "expired",
  "error",
  "no_market",
  "too_small",
  "too_large",
];

export const isTerminal = (status: TransactionStatus) => TERMINAL.includes(status);

export function statusTone(status: TransactionStatus): StatusTone {
  switch (status) {
    case "completed":
      return "completed";
    case "expired":
      return "expired";
    case "pending_trust":
      return "trustline";
    case "error":
    case "refunded":
    case "no_market":
    case "too_small":
    case "too_large":
      return "failed";
    default:
      return "processing";
  }
}
