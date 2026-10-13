import type { NextConfig } from "next";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The SDK ships TypeScript sources inside the monorepo.
  transpilePackages: ["@lendara/ramp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The interactive URL carries a one-time token: never leak or cache it.
        source: "/widget/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // SEP-1: wallets fetch stellar.toml from the browser.
        source: "/.well-known/stellar.toml",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
  async rewrites() {
    // This domain is the issuer's home_domain (the API's is longer than the
    // 32 characters Stellar allows), so it serves the API's stellar.toml.
    return [{ source: "/.well-known/stellar.toml", destination: `${apiBaseUrl}/.well-known/stellar.toml` }];
  },
};

export default nextConfig;
