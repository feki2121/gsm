/** @type {import('next').NextConfig} */
const nextConfig = {
  // allowedDevOrigins: ['http://192.168.1.212'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;