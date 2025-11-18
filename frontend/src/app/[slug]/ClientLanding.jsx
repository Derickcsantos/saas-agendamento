"use client";

import { useEffect, useState } from "react";

export default function ClientLanding({ slug }) {
  const [data, setData] = useState(null);
  const [palette, setPalette] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [landingRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
            credentials: "include",
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
            { credentials: "include" }
          ),
        ]);

        if (!landingRes.ok) throw new Error("Landing not found");
        if (!colorRes.ok) throw new Error("Palette not found");

        const landingData = await landingRes.json();
        const paletteData = await colorRes.json();

        setData(landingData);
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setNotFound(true);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-500">
        <p className="animate-pulse">Carregando...</p>
      </div>
    );
  }

  const org = data.organizations;
  const landing = data;

  /* ==== BACKGROUND DINÂMICO (opção imagem / pattern / blur) ==== */
  const dynamicBackground = landing.background_image_url
    ? {
        backgroundImage: `url(${landing.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backdropFilter: `blur(${landing.background_blur || 0}px)`,
      }
    : {
        backgroundColor:
          palette?.background_color_main || landing?.background_color || "#FFF",
      };

  return (
    <main
      className="font-sans min-h-screen transition-all duration-300"
      style={{
        ...dynamicBackground,
        color: palette?.text_color || "#111",
        opacity: landing.background_opacity || 1,
      }}
    >
      {/* =========================
          NAVBAR
      ========================== */}
      <nav
        className="flex justify-between items-center p-4 shadow-lg backdrop-blur-md bg-opacity-80 sticky top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: palette?.strong_color || "#5E3BEE",
          color: palette?.background_color_main || "#FFF",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={org?.logo_organization || "/marcafy-logo.jpg"}
            alt="Logo organização"
            className="rounded-full w-12 h-12 shadow-md"
          />
          <span className="font-bold text-xl tracking-wide">{org?.name}</span>
        </div>

        <div className="flex gap-6 text-lg font-medium">
          <a
            href={`https://wa.me/${landing.whatsapp}`}
            target="_blank"
            className="hover:opacity-75 transition"
          >
            WhatsApp
          </a>
          <a
            href={landing.instagram}
            target="_blank"
            className="hover:opacity-75 transition"
          >
            Instagram
          </a>
        </div>
      </nav>

      {/* =========================
          HERO SECTION
      ========================== */}
      <section className="relative w-full min-h-[70vh] flex items-center justify-center px-6 py-24 text-center overflow-hidden">
        {/* Imagem do hero */}
        <img
          src={landing.hero_image_url}
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover brightness-75"
        />

        {/* Overlay animado */}
        <div className="absolute inset-0 bg-opacity-40 backdrop-blur-sm" style={{backgroundColor: palette?.strong_color || '##e6e0df'}}></div>

        <div className="relative z-20 max-w-3xl animate-fadeInUp">
          <h1
            className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg"
            style={{ color: "#FFF" }}
          >
            {landing.hero_title}
          </h1>

          <p className="text-lg md:text-xl text-gray-100 mb-8 drop-shadow">
            {landing.hero_subtitle}
          </p>

          <a
            href={landing.hero_button_url || `/${slug}/agendar`}
            className="px-8 py-4 rounded-xl shadow-lg text-lg font-semibold transition hover:scale-105 hover:shadow-xl"
            style={{
              backgroundColor: palette?.strong_color || "#5E3BEE",
              color: palette?.background_color_main || "#FFFFFF",
            }}
          >
            {landing.hero_button_text || "Agendar Horário"}
          </a>
        </div>
      </section>

      {/* =========================
          ABOUT SECTION
      ========================== */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* imagem */}
          <div className="rounded-xl overflow-hidden shadow-xl hover:scale-[1.02] transition-all">
            <img
              src={landing.about_image_url || 'https://ajftnlczmdyuzezrmzsq.supabase.co/storage/v1/object/public/landing-page-images/Design%20sem%20nome%20(1).png'}
              alt="Sobre"
              className="w-full h-full object-cover"
            />
          </div>

          {/* texto */}
          <div className="space-y-4 animate-fadeIn">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: palette?.strong_color || "#5E3BEE" }}
            >
              {landing.about_title}
            </h2>

            <p 
            className="text-lg leading-relaxed opacity-90">
              {landing.about_text}
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          SERVICES SECTION
      ========================== */}
      <section className="py-20 px-6 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: palette?.strong_color || "#5E3BEE" }}
        >
          {landing.services_title}
        </h2>

        <p className="text-gray-700 dark:text-gray-300">
          Os serviços serão listados aqui futuramente.
        </p>
      </section>

      {/* =========================
          GALLERY (se ativado)
      ========================== */}
      {landing.show_gallery && (
        <section className="py-20 px-6 text-center animate-fadeIn">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ color: palette?.strong_color }}
          >
            {landing.gallery_title}
          </h2>
          <p className="max-w-xl mx-auto mb-10 opacity-80">
            {landing.gallery_subtitle}
          </p>

          <p className="italic opacity-60">Galeria será adicionada no futuro.</p>
        </section>
      )}

      {/* =========================
          TESTIMONIALS (se ativado)
      ========================== */}
      {landing.show_testimonials && (
        <section className="py-20 px-6 text-center animate-fadeInUp">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ color: palette?.strong_color }}
          >
            {landing.testimonials_title}
          </h2>
          <p className="max-w-xl mx-auto mb-10 opacity-80">
            {landing.testimonials_subtitle}
          </p>

          <p className="italic opacity-60">Depoimentos serão adicionados em breve.</p>
        </section>
      )}

      {/* =========================
          TEAM (se ativado)
      ========================== */}
      {landing.show_team && (
        <section className="py-20 px-6 text-center animate-fadeInUp">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ color: palette?.strong_color }}
          >
            {landing.team_title}
          </h2>
          <p className="max-w-xl mx-auto mb-10 opacity-80">
            {landing.team_subtitle}
          </p>

          <p className="italic opacity-60">Equipe será exibida futuramente.</p>
        </section>
      )}

      {/* =========================
          FOOTER
      ========================== */}
      {/** Mantido praticamente igual, apenas com pequenas melhorias visuais **/}
      <footer
        className="py-6 dark:text-gray-900 shadow-inner mt-20"
        style={{
          backgroundColor: palette?.strong_color || "#5E3BEE",
          color: palette?.background_color_main || "#FFFFFF",
        }}
      >
        {/** (O mesmo footer que você tinha, sem mudanças que prejudiquem seu design) **/}
        {/* Conteúdo original mantido */}
        <div className="container px-6 mx-auto space-y-6 divide-y dark:divide-gray-600 md:space-y-12">
          <div className="grid grid-cols-12">
            <div className="pb-6 col-span-full md:pb-0 md:col-span-6">
              <a
                rel="noopener noreferrer"
                href="#"
                className="flex justify-center space-x-3 md:justify-start"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full dark:bg-violet-600 shadow-lg">
                  <img
                    src={org?.logo_organization || "/marcafy-logo.jpg"}
                    alt="logo organização"
                    className="rounded-full"
                  />
                </div>
                <span className="self-center text-2xl font-semibold">
                  {org?.name}
                </span>
              </a>
            </div>

            {/* Links rápidos */}
            <div className="col-span-6 text-center md:text-left md:col-span-3">
              <p className="pb-1 text-lg font-medium">Acesso rápido</p>
              <ul className="space-y-1">
                <li>
                  <a href={`/${slug}/`} className="hover:underline">
                    Home
                  </a>
                </li>
                <li>
                  <a href={`/${slug}/agendar`} className="hover:underline">
                    Agendar
                  </a>
                </li>
                <li>
                  <a href={`/${slug}/galeria`} className="hover:underline">
                    Galeria
                  </a>
                </li>
                <li>
                  <a href={`/${slug}/login`} className="hover:underline">
                    Login
                  </a>
                </li>
              </ul>
            </div>

            {/* Redes sociais */}
            <div className="col-span-6 text-center md:text-left md:col-span-3">
              <p className="pb-1 text-lg font-medium">Contato</p>
              <ul className="space-y-1">
                <li>
                  <a href={`https://wa.me/${landing.whatsapp}`} target="_blank">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={landing.instagram} target="_blank">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={`mailto:${landing.email}`} target="_blank">
                    Email
                  </a>
                </li>
                <li>
                  <a href={`tel:${landing.telefone}`} target="_blank">
                    Telefone
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="grid justify-center pt-6 lg:justify-between">
            <div className="flex flex-col self-center text-sm text-center md:block lg:col-start-1 md:space-x-6">
              <span>©2025 Todos os direitos reservados</span>
              <a href="www.marcafy.com.br">
                <span>Política de privacidade</span>
              </a>
              <a href="www.marcafy.com.br">
                <span>Termos de uso</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
