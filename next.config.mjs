/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Playwright + sparticuz/chromium-min out of the Next.js bundle so the
  // serverless function stays small. They're loaded at runtime via dynamic
  // import in src/lib/brand-scraper/crawl.ts.
  experimental: {
    serverComponentsExternalPackages: [
      'playwright',
      'playwright-core',
      '@sparticuz/chromium-min',
    ],
  },
};
export default nextConfig;
