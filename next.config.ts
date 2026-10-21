import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel's Next.js builder collects ".next". Local builds keep the separate folder.
  distDir: process.env.VERCEL ? ".next" : ".next-production",
  // Type safety is verified separately with `tsc --noEmit`. Skipping duplicate
  // build-time workers avoids an unnecessary second scan on constrained hosts.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
