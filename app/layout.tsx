import type { Metadata, Viewport } from "next";
import "./globals.css";
import RouteLoader from "@/components/RouteLoader";

export const metadata: Metadata = {
  title: "LetsMeet ♥ Match, Chat, Love!",
  description: "Find your perfect match with LetsMeet dating app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="font-urbanist antialiased bg-white"><RouteLoader />{children}</body>
    </html>
  );
}
