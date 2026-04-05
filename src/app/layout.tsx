import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CargoBit - Intelligentes Logistik-Management",
  description: "Premium logistics management platform for modern businesses. Track shipments, manage fleet, optimize routes, and streamline your supply chain.",
  keywords: ["CargoBit", "Logistics", "Shipping", "Supply Chain", "Fleet Management", "Delivery Tracking"],
  authors: [{ name: "CargoBit GmbH" }],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CargoBit",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "CargoBit",
    title: "CargoBit - Intelligentes Logistik-Management",
    description: "Premium logistics management platform for modern businesses. Track shipments, manage fleet, optimize routes, and streamline your supply chain.",
    images: [
      {
        url: "/hero-banner.png",
        width: 1200,
        height: 630,
        alt: "CargoBit - Logistics Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CargoBit - Intelligentes Logistik-Management",
    description: "Premium logistics management platform for modern businesses.",
    images: ["/hero-banner.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F97316" },
    { media: "(prefers-color-scheme: dark)", color: "#F97316" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CargoBit" />
        <meta name="application-name" content="CargoBit" />
        <meta name="msapplication-TileColor" content="#F97316" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Theme Color for browsers */}
        <meta name="theme-color" content="#F97316" />
        
        {/* Favicons */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
