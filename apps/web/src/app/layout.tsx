import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas-neue" });

export const metadata: Metadata = {
  title: { default: "Lendara", template: "%s · Lendara" },
  description: "Stellar anchor sandbox for Latin America: fiat to USDC on testnet.",
};

export const viewport: Viewport = {
  themeColor: "#f6f4f4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${bebasNeue.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
