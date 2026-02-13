/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve icon for browsers that request /favicon.ico
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.png", permanent: false },
    ];
  },
  // Proxy uploads so profile/creative images load same-origin (fixes cross-origin not viewable)
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [{ source: "/api/uploads/:path*", destination: `${api.replace(/\/$/, "")}/uploads/:path*` }];
  },
};

export default nextConfig;
