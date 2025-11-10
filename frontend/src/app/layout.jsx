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
  metadataBase: new URL("www.marcafy.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Marcafy - Simplifique sua rotina",
    description:
      "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.",
    url: "https://marcafy.vercel.app",
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
      <head>
        {/* 👇 Verificação do Google Search Console */}
        <meta 
          name="google-site-verification" 
          content="sNtwo4Z6g55l1VJEWL_o12paE3w76edq2h7o5xVsNE8" 
        />
        

        <Script 
          async 
          src="https://www.googletagmanager.com/gtag/js?id=G-FBE5HVNY0J"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FBE5HVNY0J');
          `}
        </Script>

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
