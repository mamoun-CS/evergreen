/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const csp = ["default-src 'self'", "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "img-src 'self' data: https:", "font-src 'self' https://fonts.gstatic.com", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
    return [{ source: '/:path*', headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: csp },
    ] }];
  },
  outputFileTracing: false,
  images: { unoptimized: true },
};

export default nextConfig;
