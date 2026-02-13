/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve icon for browsers that request /favicon.ico
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.png", permanent: false },
    ];
  },
};

export default nextConfig;
