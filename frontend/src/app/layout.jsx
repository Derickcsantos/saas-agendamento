// src/app/layout.jsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
