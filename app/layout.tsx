import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CharacterTheme } from "@/components/ui/character-theme";
import { PWARegister } from "@/components/ui/pwa-register";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Looloop — Close the loop.",
  description: "The companion app for the Looloop 90-day habit and sleep tracker journal by Doo Doodle.",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Looloop',
    'theme-color': '#07051a',
  },
  icons: {
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CharacterTheme />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
