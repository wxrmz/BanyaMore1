import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'node_modules/.cache/next',
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.216'],
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
};

export default nextConfig;
