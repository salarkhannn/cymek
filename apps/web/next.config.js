/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cymek/shared"],
  async rewrites() {
    return [
      {
        source: "/api/pipeline/:path*",
        destination: "http://localhost:3001/pipeline/:path*",
      },
      {
        source: "/api/chat/:path*",
        destination: "http://localhost:3001/chat/:path*",
      },
      {
        source: "/api/health",
        destination: "http://localhost:3001/health",
      },
    ];
  },
};

module.exports = nextConfig;
