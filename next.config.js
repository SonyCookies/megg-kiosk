/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  assetPrefix: '/',
  output: 'standalone',
};

module.exports = nextConfig;
