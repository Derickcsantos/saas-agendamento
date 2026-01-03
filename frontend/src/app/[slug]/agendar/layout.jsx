export async function generateMetadata({ params }) {
  const { slug } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return {
      title: "Agende agora | Marcafy",
      description: "Agendamento online rápido e fácil.",
    };
  }

  const data = await res.json();
  const org = data.organizations;

  const title = `Agende agora em ${org?.name}`;
  const description = `Escolha o melhor horário e agende online em ${org?.name}.`;

  const image =
    data.open_graph_image ||
    org?.logo_organization ||
    "https://www.marcafy.com.br/og-default.png";

  const url = `https://www.marcafy.com.br/${slug}/agendar`;

  return {
    title,
    description,

    alternates: { canonical: url },

    icons: {
      icon: org?.logo_organization,
      apple: org?.logo_organization,
    },

    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "pt_BR",
      images: [{ url: image, width: 1200, height: 630 }],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function AgendarLayout({ children }) {
  return <>{children}</>;
}
