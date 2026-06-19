import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_USE_POLLING: process.env.VERCEL ? "true" : "false",
  },
};

export default nextConfig;
