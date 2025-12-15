const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compress: true,
  
  images: {
    qualities: [75, 90, 95],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'inline',
  },
  
  poweredByHeader: false,
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
}

module.exports = nextConfig
