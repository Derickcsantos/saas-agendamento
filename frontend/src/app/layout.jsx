import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "./components/common/GoogleAnalytics";
import ToastProvider from "./components/ToastProvider";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConfirmProvider } from '../components/ConfirmDialogProvider'

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
  description: "Plataforma de agendamento online.",
  metadataBase: new URL("https://www.marcafy.com.br"),
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#5E3BEE",
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
          <ConfirmProvider >
            {children}
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
