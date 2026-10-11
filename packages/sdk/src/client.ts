import type { components } from "./schema.gen.ts";

type Schemas = components["schemas"];

/** Public sandbox API. */
export const SANDBOX_BASE_URL = "https://lendaraweb-production.up.railway.app";

export type LendaraRampOptions = {
  /** Project API key (`lnd_test_...`). Keep it on your server. */
  apiKey: string;
  /** API base URL. Defaults to the public sandbox. */
  baseUrl?: string;
  /** Custom fetch, e.g. for tests. Defaults to the global fetch. */
  fetch?: typeof fetch;
};

/** An error response of the Lendara API. */
export class LendaraError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LendaraError";
    this.status = status;
  }
}

/**
 * Server-side client of the Lendara integrator API (`/v1`).
 *
 * The API key gives full access to the project: use this client from your
 * backend and send only the session `url` to the browser.
 */
export class LendaraRamp {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(options: LendaraRampOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? SANDBOX_BASE_URL).replace(/\/+$/, "");
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Starts a deposit for an end user and returns the widget URL to open. */
  createSession(body: Schemas["SessionCreateRequest"]): Promise<Schemas["Session"]> {
    return this.#request("POST", "/v1/sessions", body);
  }

  /** Returns one of the project's transactions. */
  getTransaction(id: string): Promise<Schemas["Sep24Transaction"]> {
    return this.#request("GET", `/v1/transactions/${encodeURIComponent(id)}`);
  }

  /** Lists the project's transactions, newest first. */
  listTransactions(params: { limit?: number; cursor?: string } = {}): Promise<Schemas["TransactionList"]> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.cursor !== undefined) query.set("cursor", params.cursor);
    const qs = query.size > 0 ? `?${query}` : "";
    return this.#request("GET", `/v1/transactions${qs}`);
  }

  /** Returns the project of the API key. */
  getProject(): Promise<Schemas["Project"]> {
    return this.#request("GET", "/v1/project");
  }

  async #request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.#apiKey}`, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await this.#fetch(this.#baseUrl + path, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : `HTTP ${res.status}`;
      throw new LendaraError(res.status, message);
    }
    return data as T;
  }
}
