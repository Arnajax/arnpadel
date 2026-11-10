import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // De schema-afbeelding leest fonts en sfeerfoto's van schijf; zorg dat ze in de functie meegaan.
  outputFileTracingIncludes: {
    "/api/toernooi/\\[code\\]/schema.png": ["./assets/fonts/**", "./public/toernooi/**"],
  },
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
