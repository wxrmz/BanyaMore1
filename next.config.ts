import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'node_modules/.cache/next',
  allowedDevOrigins: ['192.168.0.216'],
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
};

export default nextConfig;
