import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://trafficflowdraurangzebabbas.vercel.app"),
  title: {
    default: "TrafficFlow - Automated Website Traffic & SERP Booster",
    template: "%s | TrafficFlow",
  },
  description: "Automated real-browser website traffic, Google SERP organic clicks, and high-intent referral automation at scale.",
  applicationName: "TrafficFlow",
  keywords: [
    "website traffic",
    "serp traffic",
    "google organic clicks",
    "automated traffic generator",
    "referral traffic bot",
    "traffic booster"
  ],
  icons: {
    icon: [
      { url: "/assets/favicon.ico" },
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/assets/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://trafficflowdraurangzebabbas.vercel.app",
    title: "TrafficFlow - Automated Website Traffic & SERP Booster",
    description: "Automated real-browser website traffic, Google SERP organic clicks, and high-intent referral automation at scale.",
    siteName: "TrafficFlow",
    images: [
      {
        url: "/assets/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "TrafficFlow - Real Browser Website Traffic & SERP Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrafficFlow - Automated Website Traffic & SERP Booster",
    description: "Automated real-browser website traffic, Google SERP organic clicks, and high-intent referral automation at scale.",
    images: ["/assets/android-chrome-512x512.png"],
    creator: "@TrafficFlow",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrafficFlow",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
