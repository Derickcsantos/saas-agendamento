import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { slug } = params;

  // Buscar dados da organização
  let organizationData = null;
  let organizationName = "Marcafy";
  let organizationLogo = null;
  let themeColor = "#5E3BEE";
  let description = "Sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.";

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const org = data.organizations;

      if (org) {
        organizationName = org.name || "Marcafy";
        organizationLogo = org.logo_organization;
        themeColor = org.primary_color || "#5E3BEE";
        
        // Descrição personalizada
        description = data.meta_description || 
          `Agende seus horários em ${organizationName} de forma rápida e prática. Sistema de agendamento online.`;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados da organização:", error);
  }

  // Define ícones: usa logo da organização se disponível, senão usa padrão
  const icons = organizationLogo ? [
    {
      src: organizationLogo,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: organizationLogo,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: organizationLogo,
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: organizationLogo,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ] : [
    {
      src: "/icons/icon-72x72.png",
      sizes: "72x72",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-96x96.png",
      sizes: "96x96",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-128x128.png",
      sizes: "128x128",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-144x144.png",
      sizes: "144x144",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-152x152.png",
      sizes: "152x152",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-384x384.png",
      sizes: "384x384",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  const manifest = {
    name: organizationName,
    short_name: organizationName.length > 12 ? organizationName.substring(0, 12) : organizationName,
    description: description,
    start_url: `/${slug}/agendar`,
    scope: `/${slug}/`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    orientation: "portrait-primary",
    icons: icons,
    shortcuts: [
      {
        name: "Fazer Agendamento",
        short_name: "Agendar",
        description: `Agendar em ${organizationName}`,
        url: `/${slug}/agendar`,
        icons: organizationLogo 
          ? [{ src: organizationLogo, sizes: "192x192" }]
          : [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    categories: ["business", "productivity", "lifestyle"],
    prefer_related_applications: false,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
