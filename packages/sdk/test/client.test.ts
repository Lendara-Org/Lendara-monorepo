import assert from "node:assert/strict";
import { test } from "node:test";
import { LendaraError, LendaraRamp } from "../src/index.ts";

type Call = { url: string; init: RequestInit };

function client(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { ramp: new LendaraRamp({ apiKey: "lnd_test_key", baseUrl: "https://api.test/", fetch }), calls };
}

test("createSession posts JSON with the API key", async () => {
  const session = { id: "tx", url: "https://web.test/widget/tx?token=t", expires_at: "2026-10-11T00:00:00Z" };
  const { ramp, calls } = client(201, session);

  const got = await ramp.createSession({ account: "GABC", fiat_currency: "CRC", amount: "20000" });

  assert.deepEqual(got, session);
  assert.equal(calls[0]?.url, "https://api.test/v1/sessions");
  assert.equal(calls[0]?.init.method, "POST");
  const headers = calls[0]?.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer lnd_test_key");
  assert.equal(headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { account: "GABC", fiat_currency: "CRC", amount: "20000" });
});

test("listTransactions sends limit and cursor", async () => {
  const { ramp, calls } = client(200, { data: [], next_cursor: null });
  await ramp.listTransactions({ limit: 5, cursor: "abc" });
  assert.equal(calls[0]?.url, "https://api.test/v1/transactions?limit=5&cursor=abc");

  await ramp.listTransactions();
  assert.equal(calls[1]?.url, "https://api.test/v1/transactions");
});

test("getTransaction escapes the id", async () => {
  const { ramp, calls } = client(200, { id: "a/b" });
  await ramp.getTransaction("a/b");
  assert.equal(calls[0]?.url, "https://api.test/v1/transactions/a%2Fb");
});

test("API errors throw LendaraError with status and message", async () => {
  const { ramp } = client(401, { error: "invalid API key" });
  await assert.rejects(ramp.getProject(), (err) => {
    assert.ok(err instanceof LendaraError);
    assert.equal(err.status, 401);
    assert.equal(err.message, "invalid API key");
    return true;
  });
});

test("apiKey is required", () => {
  assert.throws(() => new LendaraRamp({ apiKey: "" }), /apiKey is required/);
});
