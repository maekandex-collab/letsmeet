import type { Metadata, Viewport } from "next";
import "./globals.css";
import RouteLoader from "@/components/RouteLoader";
import GlobalIncomingCall from "@/components/GlobalIncomingCall";
import GlobalChatListener from "@/components/GlobalChatListener";
import { ActiveCallProvider } from "@/lib/ActiveCallContext";
import FloatingCallBar from "@/components/FloatingCallBar";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://letsmeet-sand.vercel.app";

const title = "LetsMeet — Match, Chat, Love!";
const description =
  "Meet genuine people near you and start something real today. Match, chat, and connect on LetsMeet.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | LetsMeet",
  },
  description,
  applicationName: "LetsMeet",
  keywords: [
    "LetsMeet",
    "dating",
    "match",
    "chat",
    "love",
    "social",
    "Nigeria",
    "meet people",
  ],
  authors: [{ name: "LetsMeet" }],
  creator: "LetsMeet",
  publisher: "LetsMeet",
  category: "dating",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "LetsMeet",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  appleWebApp: {
    capable: true,
    title: "LetsMeet",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b5179e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-urbanist antialiased bg-white">
        <ActiveCallProvider>
          <RouteLoader />
          <GlobalIncomingCall />
          <GlobalChatListener />
          <FloatingCallBar />
          {children}
        </ActiveCallProvider>
      </body>
    </html>
  );
}
