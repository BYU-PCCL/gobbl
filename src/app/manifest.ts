import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest and linked from every page by Next.
 * This is what lets Chrome on Android offer "Install app"; Safari on iPhone reads the
 * apple-* tags in app/layout.tsx instead but uses the icons and colors here too.
 * The PNGs in public/icons are rendered from FlatTurkeyGlyph (see that component).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gobbl",
    short_name: "Gobbl",
    description: "Practice political conversations with an AI partner who sees things differently.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF6EB",
    theme_color: "#C0461C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
