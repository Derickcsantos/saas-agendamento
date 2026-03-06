import "../globals.css";

function normalizeOgImage(imageUrl) {
  if (!imageUrl) return "https://www.marcafy.com.br/og-default.png";
  if (imageUrl.endsWith(".webp")) {
    return "https://www.marcafy.com.br/og-default.png";
  }
  return imageUrl;
}

export async function generateMetadata({ params }) {
  const slug = params?.slug;

  // 🟢 FALLBACK ABSOLUTO (NUNCA QUEBRA)
  const fallback = {
    title: "Marcafy",
    description: "Agendamento online profissional",
    openGraph: {
      title: "Marcafy",
      description: "Agendamento online profissional",
      images: ["https://www.marcafy.com.br/og-default.png"],
    },
  };

  // 🔒 Se não tiver slug, nem tenta fetch
  if (!slug) return fallback;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) return fallback;

    const data = await res.json();
    const org = data.organizations;

    const title = data.meta_title || org?.name || "Marcafy";
    const description =
      data.meta_description ||
      `Conheça ${org?.name} e agende online com facilidade.`;

    const rawImage =
      data.open_graph_image || org?.logo_organization;

    const image = normalizeOgImage(rawImage);
    const url = `https://www.marcafy.com.br/${slug}`;

    return {
      title,
      description,
      alternates: { canonical: url },

      icons: {
        icon: org?.logo_organization || "/marcafy-logo.jpg",
        apple: org?.logo_organization || "/marcafy-logo.jpg",
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
            alt: title,
          },
        ],
      },

      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    // 🚫 NUNCA LOGA ERRO AQUI — evita poluir console
    return fallback;
  }
}

export default function SlugLayout({ children }) {
  return <>{children}</>;
}
