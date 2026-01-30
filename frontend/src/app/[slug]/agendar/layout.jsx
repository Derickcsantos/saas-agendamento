/**
 * Normaliza imagem para Open Graph
 * WhatsApp / Facebook NÃO são confiáveis com .webp
 */
function normalizeOgImage(imageUrl) {
  if (!imageUrl) {
    return "https://www.marcafy.com.br/og-default.png";
  }

  // Evita webp (preview falha em vários crawlers)
  if (imageUrl.endsWith(".webp")) {
    return "https://www.marcafy.com.br/og-default.png";
  }

  return imageUrl;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
    { cache: "no-store" }
  );

  // Fallback defensivo (SEO-safe)
  if (!res.ok) {
    return {
      title: "Agende agora | Marcafy",
      description: "Agendamento online rápido e fácil.",
      manifest: `/${slug}/manifest.json`,
      openGraph: {
        title: "Agende agora | Marcafy",
        description: "Agendamento online rápido e fácil.",
        images: [
          {
            url: "https://www.marcafy.com.br/og-default.png",
            width: 1200,
            height: 630,
            type: "image/png",
          },
        ],
      },
    };
  }

  const data = await res.json();
  const org = data.organizations;

  const title = `Agende agora em ${org?.name || "Marcafy"}`;
  const description = `Escolha o melhor horário e agende online em ${
    org?.name || "nossa empresa"
  }.`;

  const rawImage =
    data.open_graph_image ||
    data.hero_image_url ||
    org?.logo_organization;

  const image = normalizeOgImage(rawImage);

  const url = `https://www.marcafy.com.br/${slug}/agendar`;

  return {
    title,
    description,
    manifest: `/${slug}/manifest.json`,
    applicationName: org?.name || "Marcafy",

    alternates: {
      canonical: url,
    },

    icons: {
      icon: org?.logo_organization || "/marcafy-logo.jpg",
      apple: org?.logo_organization || "/marcafy-logo.jpg",
      shortcut: org?.logo_organization || "/marcafy-logo.jpg",
    },

    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: org?.name || "Marcafy",
      startupImage: org?.logo_organization,
    },

    formatDetection: {
      telephone: false,
    },

    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "pt_BR",
      siteName: org?.name || "Marcafy",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: org?.name ? `@${org.name.replace(/\s+/g, '')}` : "@marcafy",
    },
  };
}

export default function AgendarLayout({ children }) {
  return <>{children}</>;
}
