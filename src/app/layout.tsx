import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Chakra_Petch, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Família tipográfica compartilhada com a Ousadia Marketing.
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://comunidade.ousadiamarketing.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Creators da Amazônia", locale: "pt_BR", type: "website" },
  title: {
    default: "Creators da Amazônia · A Amazônia tem voz",
    template: "%s · Creators da Amazônia",
  },
  description:
    "Comunidade e match de creators e jovens talentos da Amazônia com empresas que querem vender mais. Entrar é grátis.",
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${chakra.variable} ${manrope.variable} ${jetbrains.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
