import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padel Hub Hoorn",
    short_name: "Padel Hub",
    description: "Boek je privépadelles bij Padel Hub Hoorn.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f2e5",
    theme_color: "#1c8b47",
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
