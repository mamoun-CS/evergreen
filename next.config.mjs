/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Limit static-generation workers: each worker owns its own Prisma pool.
  // The CPU-derived default exhausted this project's local PostgreSQL budget.
  experimental: { cpus: 2 },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Product images have versioned upload names. Keeping optimized variants
    // at the CDN/browser for longer prevents Sharp work on repeat visits.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 220, 256, 384],
  },
};

export default nextConfig;
