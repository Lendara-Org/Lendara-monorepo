import type { SandboxScenario } from "./widget-api";

/** Published test cards, like Stripe's test mode. Real cards are rejected. */
export const TEST_CARDS: readonly { number: string; scenario: SandboxScenario }[] = [
  { number: "4242424242424242", scenario: "approved" },
  { number: "4000000000000002", scenario: "kyc_rejected" },
  { number: "4000000000009995", scenario: "payment_not_received" },
  { number: "4000000000000077", scenario: "delayed" },
];

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** "4242424242424242" → "4242 4242 4242 4242" */
export const formatCardNumber = (value: string) =>
  digitsOnly(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "1229" → "12/29" */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Luhn checksum, the check digit every card number carries. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export type CardNumberError = "required" | "notVisa" | "invalid" | "notTestCard";

export function cardNumberError(value: string): CardNumberError | null {
  const digits = digitsOnly(value);
  if (!digits) return "required";
  if (!digits.startsWith("4")) return "notVisa";
  if (digits.length !== 16 || !luhnValid(digits)) return "invalid";
  if (!TEST_CARDS.some((c) => c.number === digits)) return "notTestCard";
  return null;
}

/** MM/YY, valid until the end of that month. */
export function expiryValid(value: string, now = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > now;
}

export const cvcValid = (value: string) => /^\d{3}$/.test(value);

export const scenarioFor = (cardNumber: string): SandboxScenario | undefined =>
  TEST_CARDS.find((c) => c.number === digitsOnly(cardNumber))?.scenario;
