import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "arnpadel.vercel.app" }],
        destination: "https://padelhubhoorn.nl/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "padelhubhoorn.vercel.app" }],
        destination: "https://padelhubhoorn.nl/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
