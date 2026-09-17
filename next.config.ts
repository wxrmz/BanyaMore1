import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

// Content-Security-Policy: only our own code plus the services the site really uses
// (Yandex Metrika, Yandex Maps widget, Google Fonts, YCLIENTS booking links).
// 'unsafe-inline' for scripts is required by the inline theme/Metrika snippets in app/layout.tsx.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://mc.yandex.ru https://yastatic.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://mc.yandex.ru https://*.yandex.ru https://*.yandex.net",
  `connect-src 'self' https://mc.yandex.ru https://*.yandex.ru wss://mc.yandex.ru${isProduction ? '' : ' ws: http://localhost:* http://127.0.0.1:*'}`,
  "frame-src https://yandex.ru https://*.yandex.ru https://*.yclients.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.yclients.com",
  "frame-ancestors 'self'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  distDir: 'node_modules/.cache/next',
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.216'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/api/calendar-note',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
};

export default nextConfig;
