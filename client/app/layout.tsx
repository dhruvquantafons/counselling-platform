import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-sans bg-[#F7F5F0] text-[#232C26]`}>
        {children}
      </body>
    </html>
  );
}