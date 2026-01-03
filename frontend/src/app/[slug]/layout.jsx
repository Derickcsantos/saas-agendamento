import "../globals.css";

function normalizeOgImage(imageUrl) {
  if (!imageUrl) return "https://www.marcafy.com.br/og-default.png";
  if (imageUrl.endsWith(".webp")) {
    return "https://www.marcafy.com.br/og-default.png";
  }
  return imageUrl;
}

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

  const title = data.meta_title || org?.name || "Marcafy";
  const description =
    data.meta_description ||
    `Conheça ${org?.name} e agende online com facilidade.`;

  const rawImage =
    data.open_graph_image ||
    org?.logo_organization;

  const image = normalizeOgImage(rawImage);

  const url = `https://www.marcafy.com.br/${slug}`;

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
      siteName: org?.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          type: "image/png",
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
}

export default function SlugLayout({ children }) {
  return <>{children}</>;
}
