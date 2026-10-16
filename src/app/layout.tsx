import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/ui/Providers";
import "./globals.css";

// Display — Bricolage Grotesque (variable, bold, characterful)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

// Body — DM Sans
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Mono — JetBrains Mono (for stats, scores, timestamps)
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets safe-area insets work on iPhones and keeps the layout viewport in step with the
  // on-screen keyboard on Android, so a full-height chat column shrinks instead of being covered.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF6EB" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1612" },
  ],
};

export const metadata: Metadata = {
  title: "Gobbl — Talk Turkey. Build Bridges.",
  description:
    "Gamified civil discourse training powered by AI. Grow your turkey with XP, spend feathers in the Bazaar, and reduce polarization through practice.",
  applicationName: "Gobbl",
  // Together with app/manifest.ts this makes the site installable from Chrome on Android
  // and keeps "Add to Home Screen" on iPhone opening as a standalone app.
  appleWebApp: { capable: true, title: "Gobbl", statusBarStyle: "default" },
  // Chrome's counterpart to apple-mobile-web-app-capable; it warns when only the Apple tag is present.
  other: { "mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen antialiased font-body bg-bg text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
