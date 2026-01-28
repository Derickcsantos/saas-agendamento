import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "./components/common/GoogleAnalytics";
import ToastProvider from "./components/ToastProvider";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Marcafy - Sistema de Agendamento Online",
  description: "Plataforma de agendamento online para sua empresa. Agende horários, gerencie clientes e aumente seus resultados.",
  metadataBase: new URL("https://www.marcafy.com.br"),
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  keywords: ["agendamento online", "marcação de horários", "agenda online", "gestão de clientes", "sistema de agendamento"],
  authors: [{ name: "Marcafy" }],
  creator: "Marcafy",
  publisher: "Marcafy",
  applicationName: "Marcafy",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marcafy",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Marcafy",
    title: "Marcafy - Sistema de Agendamento Online",
    description: "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
    url: "https://www.marcafy.com.br",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marcafy - Sistema de Agendamento Online",
    description: "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
    creator: "@marcafy",
  },
};

export const viewport = {
  themeColor: "#5E3BEE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
        <AuthProvider>
          <ToastProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
