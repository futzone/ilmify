import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ilmify",
    short_name: "Ilmify",
    description: "Zamonaviy, AI bilan boyitilgan interval takrorlash",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5b21b6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
