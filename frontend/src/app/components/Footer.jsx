"use client";

import { useEffect, useState } from "react";

export default function Footer({ slug }) {
  const [data, setData] = useState(null);
  const [palette, setPalette] = useState(null)
  const [orgData, setOrgData] = useState(null)
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

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center text-center text-gray-700">
        <p>Organização não encontrada 😢</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <p>Carregando...</p>
      </div>
    );
  }

  const org = data.organizations;
  const landing = data;

  return (
    <footer
      className="relative overflow-hidden"
      style={{ backgroundColor: palette?.strong_color || "#5E3BEE" }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.2), transparent 40%)",
        }}
      ></div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <img
                  src={org?.logo_organization || "/marcafy-logo.jpg"}
                  alt="logo organização"
                  className="w-10 h-10 rounded-full"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{org?.name}</h3>
                <p className="text-white/70 text-sm">Sua agenda em um só lugar</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-sm uppercase tracking-widest text-white/70 mb-3">Acesso rápido</p>
            <ul className="space-y-2 text-white/90">
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/`} className="hover:text-white transition">Home</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/agendar`} className="hover:text-white transition">Agendar</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/galeria`} className="hover:text-white transition">Galeria</a>
              </li>
              <li>
                <a rel="noopener noreferrer" href={`/${slug}/login`} className="hover:text-white transition">Login</a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4">
            <p className="text-sm uppercase tracking-widest text-white/70 mb-3">Contato</p>
            <ul className="space-y-2 text-white/90">
              {landing.whatsapp && (
                <li>
                  <a rel="noopener noreferrer" href={`https://wa.me/${landing.whatsapp}`} className="hover:text-white transition">Whatsapp</a>
                </li>
              )}
              {landing.instagram && (
                <li>
                  <a rel="noopener noreferrer" href={landing.instagram} className="hover:text-white transition">Instagram</a>
                </li>
              )}
              {landing.email && (
                <li>
                  <a rel="noopener noreferrer" href={`mailto:${landing.email}`} className="hover:text-white transition">Email</a>
                </li>
              )}
              {landing.telefone && (
                <li>
                  <a rel="noopener noreferrer" href={`tel:${landing.telefone}`} className="hover:text-white transition">Telefone</a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/80">
            &copy; {new Date().getFullYear()} {landing?.name}. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <a rel="noopener noreferrer" href="https://www.marcafy.com.br" className="hover:text-white transition">Política de privacidade</a>
            <a rel="noopener noreferrer" href="https://www.marcafy.com.br" className="hover:text-white transition">Termos de uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
