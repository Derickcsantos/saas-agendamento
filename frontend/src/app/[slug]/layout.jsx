import "../globals.css";

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

    alternates: {
      canonical: url,
    },

    icons: {
      icon: icon,
      apple: icon,
    },

    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "pt_BR",
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
  };
}

/**
 * ✅ OBRIGATÓRIO
 * Layout SEMPRE precisa de default export
 */
export default function AgendarLayout({ children }) {
  return <>{children}</>;
}
