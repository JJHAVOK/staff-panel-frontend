import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // <--- THIS IS THE KEY LINE
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.pixelforgedeveloper.com',
      },
    ],
  },
};

export default nextConfig;