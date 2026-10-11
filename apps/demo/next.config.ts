import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Workspace packages ship TypeScript sources inside the monorepo.
  transpilePackages: ["@lendara/ramp", "@lendara/widget"],
};

export default nextConfig;
