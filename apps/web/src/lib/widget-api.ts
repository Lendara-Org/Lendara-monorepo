import type { components } from "@lendara/ramp";

type Schemas = components["schemas"];
export type FiatCurrency = Schemas["FiatCurrency"];
export type SandboxScenario = Schemas["SandboxScenario"];
export type Quote = Schemas["Quote"];
export type Transaction = Schemas["Sep24Transaction"];
export type TransactionStatus = Schemas["Sep24TransactionStatus"];
export type WidgetSession = Schemas["WidgetSession"];
export type WidgetTransaction = Schemas["WidgetTransaction"];

export const FIAT_CURRENCIES = ["CRC", "ARS", "CLP"] as const satisfies readonly FiatCurrency[];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  { accessToken, body, ...init }: Omit<RequestInit, "body"> & { accessToken?: string; body?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
    cache: "no-store",
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const widgetApi = {
  createSession: (transactionId: string, token: string) =>
    request<WidgetSession>("/widget-api/sessions", {
      method: "POST",
      body: { transaction_id: transactionId, token },
    }),

  getTransaction: (accessToken: string) =>
    request<WidgetTransaction>("/widget-api/transaction", { accessToken }),

  getQuote: (accessToken: string, fiatCurrency: FiatCurrency, amount: string, signal?: AbortSignal) =>
    request<Quote>(
      `/widget-api/quote?${new URLSearchParams({ fiat_currency: fiatCurrency, amount })}`,
      { accessToken, signal: signal ?? null },
    ),

  confirm: (accessToken: string, fiatCurrency: FiatCurrency, amount: string) =>
    request<WidgetTransaction>("/widget-api/transaction/confirm", {
      method: "POST",
      accessToken,
      body: { fiat_currency: fiatCurrency, amount },
    }),

  simulatePayment: (accessToken: string, scenario: SandboxScenario) =>
    request<WidgetTransaction>("/widget-api/transaction/simulate-payment", {
      method: "POST",
      accessToken,
      body: { scenario },
    }),
};
