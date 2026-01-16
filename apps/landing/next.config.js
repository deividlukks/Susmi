/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@susmi/ui', '@susmi/types', '@susmi/utils'],
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
