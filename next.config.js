/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/tracking',
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'sharp'],
  },
};

module.exports = nextConfig;
