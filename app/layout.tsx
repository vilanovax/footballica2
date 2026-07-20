import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Vazirmatn } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import "./globals.css";

const fontDisplay = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fontBody = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

// Persian/Arabic script font — applied automatically for RTL (see globals.css).
const fontFa = Vazirmatn({
  variable: "--font-fa",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Footballica | فوتبالیکا",
  description:
    "The Ultimate Fantasy Football Trivia Game | بازی جذاب اطلاعات فوتبالی",
  applicationName: "Footballica",
  // Next auto-links the manifest from app/manifest.ts.
  appleWebApp: {
    capable: true,
    // Full-bleed status bar over our themed content (also emits
    // mobile-web-app-capable="yes").
    statusBarStyle: "black-translucent",
    title: "Footballica",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAF7E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1524" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontFa.variable} h-full antialiased`}
      /* Default = Day Match. Set data-theme="dark" for Night Match.
         LanguageProvider updates lang + dir on the client. */
    >
      <body className="min-h-full overflow-x-hidden font-body text-foreground">
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
