import { LendaraError, LendaraRamp, type FiatCurrency } from "@lendara/ramp";
import { config } from "@/lib/config";

const CURRENCIES: readonly FiatCurrency[] = ["CRC", "ARS", "CLP"];

// The whole server-side integration: create a session for the buyer and
// hand its URL to the browser.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { account, fiat_currency, amount } = (body ?? {}) as Record<string, unknown>;
  if (typeof account !== "string" || typeof amount !== "string" || !CURRENCIES.includes(fiat_currency as FiatCurrency)) {
    return Response.json({ error: "account, fiat_currency and amount are required" }, { status: 400 });
  }
  if (!config.apiKey) {
    return Response.json({ error: "LENDARA_API_KEY is not set" }, { status: 500 });
  }

  const lendara = new LendaraRamp({ apiKey: config.apiKey, ...(config.apiBaseUrl && { baseUrl: config.apiBaseUrl }) });
  try {
    const session = await lendara.createSession({ account, fiat_currency: fiat_currency as FiatCurrency, amount });
    return Response.json({ url: session.url });
  } catch (err) {
    if (err instanceof LendaraError && err.status === 400) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
