import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Enable for Docker deployment
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
