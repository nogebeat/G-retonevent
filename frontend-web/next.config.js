/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ne pas bloquer la build en cas d'erreurs ESLint
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['drive.google.com', 'res.cloudinary.com'],
  },
};

module.exports = nextConfig;
