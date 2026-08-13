import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["heic2any"],
  async headers() {
    return [
      {
        source: "/og.jpg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
