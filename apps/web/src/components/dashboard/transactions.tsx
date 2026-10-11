"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/widget-api";
import { lendaraClient } from "@/lib/dashboard-api";
import { explorerTxUrl, formatAmount, shorten, statusTone } from "@/lib/format";
import { StatusPill } from "../widget/ui";
import { Card } from "./shell";

const POLL_MS = 5000;
const PAGE_SIZE = 50;

export function Transactions({ apiKey }: { apiKey: string }) {
  const [list, setList] = useState<Transaction[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const client = lendaraClient(apiKey);
    const load = () =>
      client
        .listTransactions({ limit: PAGE_SIZE })
        .then((page) => {
          if (cancelled) return;
          setList(page.data);
          setError(false);
        })
        .catch(() => !cancelled && setError(true))
        .finally(() => {
          if (!cancelled) timer = setTimeout(load, POLL_MS);
        });
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiKey]);

  return (
    <Card title="Transactions">
      {error && <p className="mb-3 text-sm text-error">Could not refresh the transactions. Retrying…</p>}
      {list === null ? (
        <p className="text-sm text-gray">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray">
          No transactions yet. Create a session with your API key and pay with a test card: it shows up here.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-gray">
              <tr className="border-b border-line">
                <th className="px-5 py-2 font-normal">Status</th>
                <th className="px-3 py-2 text-right font-normal">Paid</th>
                <th className="px-3 py-2 text-right font-normal">Received</th>
                <th className="px-3 py-2 font-normal">Destination</th>
                <th className="px-3 py-2 font-normal">Started</th>
                <th className="px-5 py-2 font-normal">Stellar tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-5 py-3">
                    <StatusPill tone={statusTone(tx.status)}>{tx.status.replaceAll("_", " ")}</StatusPill>
                    {tx.message && <p className="mt-1 max-w-56 text-xs text-gray">{tx.message}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-mono">
                    {tx.amount_in ? `${formatAmount(tx.amount_in, "en-US")} ${tx.amount_in_asset?.split(":")[1] ?? ""}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-mono">
                    {tx.amount_out ? `${formatAmount(tx.amount_out, "en-US", 7)} USDC` : "—"}
                  </td>
                  <td className="px-3 py-3 font-mono text-gray" title={tx.to}>
                    {tx.to ? shorten(tx.to) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray">
                    {new Date(tx.started_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-5 py-3 font-mono">
                    {tx.stellar_transaction_id ? (
                      <a href={explorerTxUrl(tx.stellar_transaction_id)} target="_blank" rel="noreferrer" className="underline">
                        {shorten(tx.stellar_transaction_id, 6, 4)}
                      </a>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === PAGE_SIZE && (
            <p className="px-5 pt-3 text-xs text-gray">Showing the {PAGE_SIZE} most recent transactions.</p>
          )}
        </div>
      )}
    </Card>
  );
}
