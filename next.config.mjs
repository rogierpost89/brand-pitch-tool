/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium-min', 'playwright-core'],
  },
};

export default nextConfig;
