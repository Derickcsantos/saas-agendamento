import "../globals.css";

export async function generateMetadata({ params }) {
  const { slug } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return {
      title: "Marcafy",
      description: "Agendamento online profissional",
    };
  }

  const data = await res.json();
  const org = data.organizations;

  const title =
    data.open_graph_title ||
    data.meta_title ||
    org?.name ||
    "Marcafy";

  const description =
    data.open_graph_description ||
    data.meta_description ||
    `Agende online em ${org?.name}.`;

  const ogImage =
    data.open_graph_image ||
    org?.logo_organization ||
    "https://www.marcafy.com.br/og-default.png";

  return {
    title,
    description,

    icons: {
      icon: org?.logo_organization || "/marcafy-logo.jpg",
      apple: org?.logo_organization || "/marcafy-logo.jpg",
    },

    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      siteName: org?.name || "Marcafy",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
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

export default function SlugLayout({ children }) {
  return <>{children}</>;
}
