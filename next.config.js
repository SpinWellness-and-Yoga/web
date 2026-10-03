const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),

  compress: true,
  
  images: {
    qualities: [75, 82, 85, 90, 95],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'inline',
    unoptimized: false,
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

module.exports = async (phase) => {
  const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    const { initOpenNextCloudflareForDev } = await import('@opennextjs/cloudflare');
    await initOpenNextCloudflareForDev({
      configPath: path.join(__dirname, 'wrangler.local.json'),
    });
  }
  return nextConfig;
}
