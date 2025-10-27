/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Let the app talk to the API service in Docker if NEXT_PUBLIC_API_URL is set
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (api) {
      return [
        { source: "/api/:path*", destination: `${api}/:path*` },
      ];
    }
    return [];
  },
};
module.exports = nextConfig;
