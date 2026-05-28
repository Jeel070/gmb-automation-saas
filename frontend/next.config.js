/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API calls to the backend during build/runtime
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
