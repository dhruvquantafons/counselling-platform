import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Whybeigh — Online Counselling Platform",
    template: "%s | Whybeigh",
  },
  description:
    "Talk to verified counsellors online. Browse by specialisation, book a session, and join a private video consultation — all from the comfort of your home.",
  openGraph: {
    siteName: "Whybeigh",
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    title: "Whybeigh — Online Counselling Platform",
    description:
      "Talk to verified counsellors online. Browse by specialisation, book a session, and join a private video consultation — all from the comfort of your home.",
    images: [
      {
        url: "/og-banner.webp",
        width: 1513,
        height: 795,
        alt: "Whybeigh — Online Counselling Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Whybeigh — Online Counselling Platform",
    description:
      "Talk to verified counsellors online. Browse by specialisation, book a session, and join a private video consultation — all from the comfort of your home.",
    images: ["/og-banner.webp"],
  },
};

import { UserAuthProvider } from "@/app/context/UserAuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-sans bg-background text-foreground min-h-screen flex flex-col antialiased`}
      >
        <UserAuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </UserAuthProvider>
      </body>
    </html>
  );
}
