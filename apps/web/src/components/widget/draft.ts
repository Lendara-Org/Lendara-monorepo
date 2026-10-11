import { FIAT_CURRENCIES, type FiatCurrency, type Quote } from "@/lib/widget-api";

export type Country = "CR" | "AR" | "CL";

/** What the user filled in so far. It stays in memory: nothing here is sent
 * to the API except the currency, the amount and the card's scenario. */
export type Draft = {
  currency: FiatCurrency;
  amount: string;
  quote: Quote | null;
  name: string;
  email: string;
  country: Country;
  cardNumber: string;
  expiry: string;
  cvc: string;
  holder: string;
};

export const COUNTRY_BY_CURRENCY: Record<FiatCurrency, Country> = { CRC: "CR", ARS: "AR", CLP: "CL" };

export const emptyDraft: Draft = {
  currency: "CRC",
  amount: "",
  quote: null,
  name: "",
  email: "",
  country: "CR",
  cardNumber: "",
  expiry: "",
  cvc: "",
  holder: "",
};

const FIAT_AMOUNT = /^[0-9]+(\.[0-9]{1,2})?$/;

/** Draft prefilled with the currency and amount of the integrator's session
 * (`/v1/sessions`). Invalid values are ignored; the user can change them. */
export function initialDraft(currency: string | undefined, amount: string | undefined): Draft {
  const draft = { ...emptyDraft };
  const known = FIAT_CURRENCIES.find((c) => c === currency);
  if (known) {
    draft.currency = known;
    draft.country = COUNTRY_BY_CURRENCY[known];
  }
  if (amount && FIAT_AMOUNT.test(amount)) draft.amount = amount;
  return draft;
}

export type StepProps = {
  t: import("@/lib/i18n").Messages;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onNext: () => void;
  onBack?: (() => void) | undefined;
};
