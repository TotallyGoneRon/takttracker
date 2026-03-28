/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/tracking',
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'sharp'],
  },
  env: {
    TZ: 'America/Edmonton',
  },
};

module.exports = nextConfig;
