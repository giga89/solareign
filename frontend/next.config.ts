import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Replaced with environment variable for versatility
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
