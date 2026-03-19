/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
    return [
      {
        source: "/backend-api/:path*",
        destination: `${target}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
