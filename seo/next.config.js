/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dumuwaks.co.ke',
      },
      {
        protocol: 'https',
        hostname: 'api.ementech.co.ke',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy API calls to the backend
      {
        source: '/api/:path*',
        destination: 'https://dumuwaks.co.ke/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
