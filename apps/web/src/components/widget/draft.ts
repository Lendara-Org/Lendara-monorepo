import type { FiatCurrency, Quote } from "@/lib/widget-api";

export type Country = "CR" | "AR" | "BR";

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

export const COUNTRY_BY_CURRENCY: Record<FiatCurrency, Country> = { CRC: "CR", ARS: "AR", BRL: "BR" };

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

export type StepProps = {
  t: import("@/lib/i18n").Messages;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onNext: () => void;
  onBack?: (() => void) | undefined;
};
