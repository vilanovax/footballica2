import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
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

export const metadata: Metadata = {
  title: "Footballica",
  description:
    "Take your ruined Division 3 club to the Championship using your football knowledge.",
  applicationName: "Footballica",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Footballica",
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
      className={`${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
      /* Default = Day Match. Set data-theme="dark" for Night Match. */
    >
      <body className="min-h-full overflow-x-hidden font-body text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
