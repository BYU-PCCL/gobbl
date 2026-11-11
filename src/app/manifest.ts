import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest and linked from every page by Next.
 * This is what lets Chrome on Android offer "Install app"; Safari on iPhone reads the
 * apple-* tags in app/layout.tsx instead but uses the icons and colors here too.
 * The PNGs in public/icons are older artwork and have not been redrawn in the current turkey style.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gobbl",
    short_name: "Gobbl",
    description: "Hatch a turkey, take care of it, and practice civil conversation skills together.",
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
