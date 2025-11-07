
import "./../globals.css";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  // Chama sua API interna
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      title: "Página não encontrada - Marcafy",
      description: "Organização não encontrada",
      icons: {
        icon: "/marcafy-logo.jpg",
      },
    };
  }

  const data = await res.json();
  const org = data.organizations;

  return {
    title: data.meta_title || org?.name || "Marcafy",
    description: data.meta_description || "Página personalizada de agendamentos.",
    keywords: data.meta_keywords || "",
    icons: {
      icon: org?.logo_organization || "/marcafy-logo.jpg",
      apple: org?.logo_organization || "/marcafy-logo.jpg",
    },
  };
}

// Corrige o warning do themeColor
export const viewport = {
  themeColor: "#ffffff",
};

export default function SlugLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}