// src/app/layout.jsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "./components/common/GoogleAnalytics"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Marcafy",
  description:
    "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
  keywords: [
    "agendamento online",
    "gestão de clientes",
    "marcafy",
    "sistema de agendamento online",
    "Sistema de agendamento",
    "Agenda",
    "Agenda online",
    "sistema online",
    "gerenciamento de salão",
    "gerenciamento de agenda",
    "agenda digital",
    "sistema para barbearia",
    "sistema para salão",
  ],
  authors: [{ name: "Marcafy" }],
  creator: "Marcafy",
  publisher: "Marcafy",
  metadataBase: new URL("https://www.marcafy.com.br"),
  category: "software",
  alternates: {
    canonical: "https://www.marcafy.com.br",
  },
  openGraph: {
    title: "Marcafy - Simplifique sua rotina",
    description:
      "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
    url: "https://www.marcafy.com.br",
    siteName: "Marcafy",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/marcafy-logo.jpg",
        width: 1200,
        height: 630,
        alt: "Marcafy - Sistema de agendamento online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marcafy - Simplifique sua rotina",
    description:
      "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
    images: ["/marcafy-logo.jpg"],
    creator: "@marcafy",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "sNtwo4Z6g55l1VJEWL_o12paE3w76edq2h7o5xVsNE8",
  },
  icons: {
    icon: "/marcafy-logo.jpg",
    apple: "/marcafy-logo.jpg",
  },
  manifest: "/manifest.json",
};

// ✅ Corrige o warning do themeColor
export const viewport = {
  themeColor: "#5E3BEE",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ✅ Google Analytics - deve estar no body, não no <head> */}
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
