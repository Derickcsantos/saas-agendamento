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
      backgroundColor: palette?.background_color_main || "#FFFFFF",
      color: palette?.text_color || "#111",
    }}
  >
    <nav
      className="flex justify-between items-center p-4 shadow transition-colors duration-300"
      style={{
        backgroundColor: palette?.strong_color || "#5E3BEE",
        color: palette?.background_color_main || "#FFFFFF",
      }}
    >
      <div className="flex items-center gap-2">
        <img src={org?.logo_organization || '/marcafy-logo.jpg'} alt="logo organização" className="rounded-full w-10 h-10" />
        <span className="font-bold text-lg">{org?.name}</span>
      </div>
      <div className="flex gap-4">
        <a
          href={`https://wa.me/${landing.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium transition"
          style={{ color: palette?.background_color_main || "#FFFFFF" }}
        >
          WhatsApp
        </a>
        <a
          href={landing.instagram}
          target="_blank"
          rel="noreferrer"
          className="font-medium transition"
          style={{ color: palette?.background_color_main || "#FFFFFF" }}
        >
          Instagram
        </a>
      </div>
    </nav>

    <section
      className="text-center py-20 px-4 transition-colors duration-300"
      style={{
        backgroundColor: palette?.background_color_main || "#FFFFFF",
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
          color: palette?.background_color_main || "#FFFFFF",
        }}
      >
        Agendar Horário
      </a>
    </section>

    <section
      className="py-16 px-4 text-center transition-colors duration-300"
      style={{
        backgroundColor: palette?.background_color_main || "#FFFFFF",
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
        backgroundColor: palette?.background_color_main || "#FFFFFF",
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

    {/* <footer
      className="py-8 text-center transition-colors duration-300"
      style={{
        backgroundColor: palette?.strong_color || "#5E3BEE",
        color: palette?.background_color_main || "#FFFFFF",
      }}
    >
      <p className="font-semibold">{org?.name}</p>
      <p>{landing.endereco}</p>
      <p>
        {landing.telefone} | {landing.email}
      </p>
    </footer> */}
    <footer className="py-6 dark:text-gray-900" style={{
        backgroundColor: palette?.strong_color || "#5E3BEE",
        color: palette?.background_color_main || "#FFFFFF",
      }}>
      <div className="container px-6 mx-auto space-y-6 divide-y dark:divide-gray-600 md:space-y-12">
        <div className="grid grid-cols-12">
          <div className="pb-6 col-span-full md:pb-0 md:col-span-6">
            <a rel="noopener noreferrer" href="#" className="flex justify-center space-x-3 md:justify-start">
              <div className="flex items-center justify-center w-12 h-12 rounded-full dark:bg-violet-600">
                <img src={org?.logo_organization || '/marcafy-logo.jpg'} alt="logo organização" className="rounded-full" />
              </div>
              <span className="self-center text-2xl font-semibold">{org?.name}</span>
            </a>
          </div>
          <div className="col-span-6 text-center md:text-left md:col-span-3">
            <p className="pb-1 text-lg font-medium">Acesso rápido</p>
            <ul>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/`} className="hover:dark:text-violet-600">Home</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/agendar`} className="hover:dark:text-violet-600">agendar</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/galeria`} className="hover:dark:text-violet-600">Galeria</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/login`} className="hover:dark:text-violet-600">login</a>
              </li>
            </ul>
          </div>
          <div className="col-span-6 text-center md:text-left md:col-span-3">
            <p className="pb-1 text-lg font-medium">Redes sociais</p>
            <ul>
              <li>
                <a rel="noopener noreferrer" href={`https://wa.me/${landing.whatsapp}`}className="hover:dark:text-violet-600">Whatsapp</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={landing.instagram}className="hover:dark:text-violet-600">Instagram</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={landing.email}className="hover:dark:text-violet-600">Email</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={landing.telefone}className="hover:dark:text-violet-600">Telefone</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="grid justify-center pt-6 lg:justify-between">
          <div className="flex flex-col self-center text-sm text-center md:block lg:col-start-1 md:space-x-6">
            <span>©2025 Todos os direitos reservados</span>
            <a rel="noopener noreferrer" href="www.marcafy.com.br">
              <span>Politica de privacidade</span>
            </a>
            <a rel="noopener noreferrer" href="www.marcafy.com.br">
              <span>Termos de uso</span>
            </a>
          </div>
          <div className="flex justify-center pt-4 space-x-4 lg:pt-0 lg:col-end-13">
            <a rel="noopener noreferrer" href="#" title="Email" className="flex items-center justify-center w-10 h-10 rounded-full dark:bg-violet-600 dark:text-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
            </a>
            <a rel="noopener noreferrer" href="#" title="Twitter" className="flex items-center justify-center w-10 h-10 rounded-full dark:bg-violet-600 dark:text-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor" className="w-5 h-5">
                <path d="M 50.0625 10.4375 C 48.214844 11.257813 46.234375 11.808594 44.152344 12.058594 C 46.277344 10.785156 47.910156 8.769531 48.675781 6.371094 C 46.691406 7.546875 44.484375 8.402344 42.144531 8.863281 C 40.269531 6.863281 37.597656 5.617188 34.640625 5.617188 C 28.960938 5.617188 24.355469 10.21875 24.355469 15.898438 C 24.355469 16.703125 24.449219 17.488281 24.625 18.242188 C 16.078125 17.8125 8.503906 13.71875 3.429688 7.496094 C 2.542969 9.019531 2.039063 10.785156 2.039063 12.667969 C 2.039063 16.234375 3.851563 19.382813 6.613281 21.230469 C 4.925781 21.175781 3.339844 20.710938 1.953125 19.941406 C 1.953125 19.984375 1.953125 20.027344 1.953125 20.070313 C 1.953125 25.054688 5.5 29.207031 10.199219 30.15625 C 9.339844 30.390625 8.429688 30.515625 7.492188 30.515625 C 6.828125 30.515625 6.183594 30.453125 5.554688 30.328125 C 6.867188 34.410156 10.664063 37.390625 15.160156 37.472656 C 11.644531 40.230469 7.210938 41.871094 2.390625 41.871094 C 1.558594 41.871094 0.742188 41.824219 -0.0585938 41.726563 C 4.488281 44.648438 9.894531 46.347656 15.703125 46.347656 C 34.617188 46.347656 44.960938 30.679688 44.960938 17.09375 C 44.960938 16.648438 44.949219 16.199219 44.933594 15.761719 C 46.941406 14.3125 48.683594 12.5 50.0625 10.4375 Z"></path>
              </svg>
            </a>
            <a rel="noopener noreferrer" href="#" title="GitHub" className="flex items-center justify-center w-10 h-10 rounded-full dark:bg-violet-600 dark:text-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M10.9,2.1c-4.6,0.5-8.3,4.2-8.8,8.7c-0.5,4.7,2.2,8.9,6.3,10.5C8.7,21.4,9,21.2,9,20.8v-1.6c0,0-0.4,0.1-0.9,0.1 c-1.4,0-2-1.2-2.1-1.9c-0.1-0.4-0.3-0.7-0.6-1C5.1,16.3,5,16.3,5,16.2C5,16,5.3,16,5.4,16c0.6,0,1.1,0.7,1.3,1c0.5,0.8,1.1,1,1.4,1 c0.4,0,0.7-0.1,0.9-0.2c0.1-0.7,0.4-1.4,1-1.8c-2.3-0.5-4-1.8-4-4c0-1.1,0.5-2.2,1.2-3C7.1,8.8,7,8.3,7,7.6C7,7.2,7,6.6,7.3,6 c0,0,1.4,0,2.8,1.3C10.6,7.1,11.3,7,12,7s1.4,0.1,2,0.3C15.3,6,16.8,6,16.8,6C17,6.6,17,7.2,17,7.6c0,0.8-0.1,1.2-0.2,1.4 c0.7,0.8,1.2,1.8,1.2,3c0,2.2-1.7,3.5-4,4c0.6,0.5,1,1.4,1,2.3v2.6c0,0.3,0.3,0.6,0.7,0.5c3.7-1.5,6.3-5.1,6.3-9.3 C22,6.1,16.9,1.4,10.9,2.1z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </main>

  );
}
