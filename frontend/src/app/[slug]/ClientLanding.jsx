// // src/app/[slug]/page.js
"use client";

import { useEffect, useState } from "react";

export default function ClientLanding({ slug }) {
  const [data, setData] = useState(null);
  const [palette, setPalette] = useState(null);
  const [notFound, setNotFound] = useState(false);

useEffect(() => {
  async function fetchData() {
    try {
      // Executa ambas as chamadas em paralelo
      const [landingRes, colorRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
          credentials: "include",
        }),
      ]);

      // Se alguma falhar, lança erro
      if (!landingRes.ok) throw new Error("Landing not found");
      if (!colorRes.ok) throw new Error("Palette not found");

      // Converte ambas as respostas
      const landingData = await landingRes.json();
      const paletteData = await colorRes.json();

      // Armazena nos estados (ou constantes)
      setData(landingData);
      setPalette(paletteData); // <- crie um useState pra isso

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
        <p>Carregando...</p>
      </div>
    );
  }

  const org = data.organizations;
  const landing = data;

  return (
      <main
    className="font-sans min-h-screen transition-colors duration-300"
    style={{
      backgroundColor: palette?.light_color || "#FFFFFF",
      color: palette?.text_color || "#111",
    }}
  >
    <nav
      className="flex justify-between items-center p-4 shadow transition-colors duration-300"
      style={{
        backgroundColor: palette?.strong_color || "#5E3BEE",
        color: palette?.light_color || "#FFFFFF",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-full"
          style={{ backgroundColor: palette?.light_color || "#FFFFFF" }}
        />
        <span className="font-bold text-lg">{org?.name}</span>
      </div>
      <div className="flex gap-4">
        <a
          href={`https://wa.me/${landing.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium transition"
          style={{ color: palette?.light_color || "#FFFFFF" }}
        >
          WhatsApp
        </a>
        <a
          href={landing.instagram}
          target="_blank"
          rel="noreferrer"
          className="font-medium transition"
          style={{ color: palette?.light_color || "#FFFFFF" }}
        >
          Instagram
        </a>
      </div>
    </nav>

    <section
      className="text-center py-20 px-4 transition-colors duration-300"
      style={{
        backgroundColor: palette?.light_color || "#FFFFFF",
        color: palette?.text_color || "#111",
      }}
    >
      <h1
        className="text-4xl font-bold mb-4"
        style={{ color: palette?.strong_color || "#5E3BEE" }}
      >
        {landing.hero_title}
      </h1>
      <p className="max-w-2xl mx-auto">{landing.hero_subtitle}</p>
      <a
        href={`/${slug}/agendar`}
        className="mt-6 inline-block px-6 py-3 rounded-lg font-medium transition"
        style={{
          backgroundColor: palette?.strong_color || "#5E3BEE",
          color: palette?.light_color || "#FFFFFF",
        }}
      >
        Agendar Horário
      </a>
    </section>

    <section
      className="py-16 px-4 text-center transition-colors duration-300"
      style={{
        backgroundColor: palette?.light_color || "#FFFFFF",
        color: palette?.text_color || "#111",
      }}
    >
      <h2
        className="text-2xl font-bold mb-4"
        style={{ color: palette?.strong_color || "#5E3BEE" }}
      >
        {landing.about_title}
      </h2>
      <p className="max-w-3xl mx-auto">{landing.about_text}</p>
    </section>

    <section
      className="py-16 px-4 text-center transition-colors duration-300"
      style={{
        backgroundColor: palette?.light_color || "#FFFFFF",
        color: palette?.text_color || "#111",
      }}
    >
      <h2
        className="text-2xl font-bold mb-4"
        style={{ color: palette?.strong_color || "#5E3BEE" }}
      >
        {landing.services_title}
      </h2>
      <p>Os serviços serão listados aqui futuramente.</p>
    </section>

    <footer
      className="py-8 text-center transition-colors duration-300"
      style={{
        backgroundColor: palette?.strong_color || "#5E3BEE",
        color: palette?.light_color || "#FFFFFF",
      }}
    >
      <p className="font-semibold">{org?.name}</p>
      <p>{landing.endereco}</p>
      <p>
        {landing.telefone} | {landing.email}
      </p>
    </footer>
  </main>

  );
}
