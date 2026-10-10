import { ApiError, widgetApi, type WidgetSession } from "./widget-api";

// The URL token can be used only once. The exchange is shared per token so
// React's double effects in development don't spend it twice.
const exchanges = new Map<string, Promise<WidgetSession>>();

const storageKey = (transactionId: string) => `lendara.widget.${transactionId}`;

function storedSession(transactionId: string): WidgetSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey(transactionId));
    const session = raw ? (JSON.parse(raw) as WidgetSession) : null;
    return session && Date.parse(session.expires_at) > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function storeSession(transactionId: string, session: WidgetSession) {
  try {
    sessionStorage.setItem(storageKey(transactionId), JSON.stringify(session));
  } catch {
    // Without storage the session still works until the page reloads.
  }
}

/**
 * Returns an access token for the widget API. Reuses the session saved in
 * this tab (so a reload keeps working) or exchanges the one-time URL token.
 */
export async function startSession(transactionId: string, token: string | null): Promise<string> {
  const stored = storedSession(transactionId);
  if (stored) return stored.access_token;
  if (!token) throw new ApiError(401, "missing token");

  let exchange = exchanges.get(token);
  if (!exchange) {
    exchange = widgetApi.createSession(transactionId, token);
    exchanges.set(token, exchange);
  }
  const session = await exchange;
  storeSession(transactionId, session);
  return session.access_token;
}

export function clearSession(transactionId: string) {
  try {
    sessionStorage.removeItem(storageKey(transactionId));
  } catch {
    // Nothing stored.
  }
}
