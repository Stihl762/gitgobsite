/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',         // ✅ enables static export (required for Cloudflare Pages)
  images: {
    unoptimized: true,      // ✅ needed because Next Image optimizer doesn't run in export mode
  },
};

module.exports = nextConfig;
