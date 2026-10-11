import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMessage } from "../src/message.ts";

test("parses the close message", () => {
  assert.deepEqual(parseMessage({ type: "lendara:close" }), { type: "close" });
});

test("parses a transaction update", () => {
  const transaction = { id: "tx", kind: "deposit", status: "completed", started_at: "2026-10-11T00:00:00Z" };
  assert.deepEqual(parseMessage({ transaction }), { type: "transaction", transaction });
});

test("ignores other messages", () => {
  for (const data of [null, "lendara:close", 42, {}, { type: "other" }, { transaction: { id: "tx" } }, { transaction: "x" }]) {
    assert.equal(parseMessage(data), null, JSON.stringify(data));
  }
});
