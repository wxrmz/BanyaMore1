import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'node_modules/.cache/next',
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
};

export default nextConfig;
