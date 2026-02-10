import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/nad/:path*',
        destination: 'https://api.nadapp.net/:path*',
      },
    ];
  },
};

export default nextConfig;
