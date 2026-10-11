// Server-side settings. The API key never reaches the browser.
export const config = {
  apiKey: process.env.LENDARA_API_KEY ?? "",
  apiBaseUrl: process.env.LENDARA_API_BASE_URL || undefined,
  horizonUrl: process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
  // Lendara's test USDC issuer (public key, also in the API's stellar.toml).
  usdcIssuer: process.env.STELLAR_ISSUER_PUBLIC_KEY || "GBVIQ7QVTTJ4NLFTYYFPEKWYJWAMKDAOFYSR52ZGWJFSGTSVOO5H47B5",
};
