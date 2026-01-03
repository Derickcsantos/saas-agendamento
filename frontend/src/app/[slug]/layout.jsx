export async function generateMetadata({ params }) {
  const { slug } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return {
      title: "Marcafy — Agendamento Online",
      description: "Plataforma de agendamento online profissional.",
      robots: { index: false, follow: false },
    };
  }

  const data = await res.json();
  const org = data.organizations;

  const title =
    data.open_graph_title ||
    data.meta_title ||
    org?.name ||
    "Agendamento Online";

  const description =
    data.open_graph_description ||
    data.meta_description ||
    `Agende seu horário em ${org?.name || "nossa empresa"} de forma rápida e online.`;

  const ogImage =
    data.open_graph_image ||
    data.hero_image_url ||
    org?.logo_organization ||
    "https://www.marcafy.com.br/og-default.png";

  const icon =
    data.favicon_url ||
    org?.logo_organization ||
    "/marcafy-logo.jpg";

  const url = `https://www.marcafy.com.br/${slug}/agendar`;

  return {
    title,
    description,
    applicationName: "Marcafy",
    category: "Agendamento Online",
    keywords: data.meta_keywords || "",
    authors: [{ name: org?.name || "Marcafy" }],
    alternates: {
      canonical: url,
    },

    icons: {
      icon: [{ url: icon }],
      shortcut: [{ url: icon }],
      apple: [{ url: icon }],
    },

    themeColor: "#ffffff",

    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: "default",
    },

    formatDetection: {
      telephone: false,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },

    openGraph: {
      title,
      description,
      url,
      siteName: org?.name || "Marcafy",
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },

    other: {
      "og:locale:alternate": "pt_PT",
      "business:contact_data:street_address": data.endereco || "",
      "business:contact_data:phone_number": data.telefone || "",
      "business:contact_data:email": data.email || "",
    },
  };
}
