// Mirrors apps/api/internal/sandbox/quote.go (fictitious rates and fee), only
// to preview the amount. The widget shows the API's exact quote.
export const RATES = { CRC: 510, ARS: 1000, CLP: 950 } as const;
export const FEE_USDC = 0.5;

export type Currency = keyof typeof RATES;

export const estimateUsdc = (currency: Currency, amount: string) =>
  Math.max(0, Number(amount) / RATES[currency] - FEE_USDC);
