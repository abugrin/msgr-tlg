import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverBodySizeLimit: "160mb",
  },
};

export default nextConfig;
