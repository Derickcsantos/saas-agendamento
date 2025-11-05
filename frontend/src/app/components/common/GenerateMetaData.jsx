
export async function GenerateMetadata({ params }) {
  const slug = params?.slug;

  // Busca os dados da empresa (como seu logo e SEO)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      title: "Marcafy - Agendamentos Online",
      description: "Agende serviços com praticidade e rapidez.",
      icons: [{ rel: "icon", url: "/marcafy-logo.jpg" }],
    };
  }

  const data = await res.json();

  return {
    title: data.meta_title || data.organizations?.name || "Marcafy",
    description: data.meta_description || "Sistema de agendamento online",
    keywords: data.meta_keywords || "agendamento, salão, marcafy, beleza",
    openGraph: {
      title: data.meta_title || data.organizations?.name,
      description: data.meta_description,
      url: `https://marcafy.vercel.app/${slug}`,
      siteName: "Marcafy",
      images: [
        {
          url: data.organizations?.logo || "/marcafy-logo.jpg",
          width: 800,
          height: 600,
        },
      ],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: data.meta_title || "Marcafy",
      description: data.meta_description,
      images: [data.organizations?.logo || "/marcafy-logo.jpg"],
    },
    icons: {
      icon: data.organizations?.logo || "/marcafy-logo.jpg",
      shortcut: data.organizations?.logo || "/marcafy-logo.jpg",
      apple: data.organizations?.logo || "/marcafy-logo.jpg",
    },
  };
}
