import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KLIYU — Creator Intelligence",
    short_name: "KLIYU",
    description: "Ubah video panjang menjadi konten pendek yang siap dipublikasikan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f2ff",
    theme_color: "#5b49eb",
    orientation: "any",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
