// // src/app/[slug]/page.js
"use client";

import { useEffect, useState } from "react";

export default function ClientLanding({ slug }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
      credentials: 'include'
  })
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setNotFound(true));
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
      <div className="flex h-screen items-center justify-center bg-white text-gray-500">
        <p>Carregando...</p>
      </div>
    );
  }

  const org = data.organizations;
  const landing = data;

  return (
    <main className="font-sans">
      <nav className="flex justify-between items-center p-4 bg-white shadow">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <span className="font-bold text-lg">{org?.name}</span>
        </div>
        <div className="flex gap-4">
          <a href={`https://wa.me/${landing.whatsapp}`} className="text-green-500">WhatsApp</a>
          <a href={landing.instagram} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </nav>

      <section className="bg-gray-50 text-center py-20 px-4">
        <h1 className="text-4xl font-bold mb-4">{landing.hero_title}</h1>
        <p className="max-w-2xl mx-auto text-gray-700">{landing.hero_subtitle}</p>
        <a href={`https://wa.me/${landing.whatsapp}`} className="mt-6 inline-block bg-green-500 text-white px-6 py-3 rounded-lg">
          Agendar Horário
        </a>
      </section>

      <section className="py-16 px-4 bg-white text-center">
        <h2 className="text-2xl font-bold mb-4">{landing.about_title}</h2>
        <p className="max-w-3xl mx-auto text-gray-700">{landing.about_text}</p>
      </section>

      <section className="py-16 px-4 bg-gray-50 text-center">
        <h2 className="text-2xl font-bold mb-4">{landing.services_title}</h2>
        <p className="text-gray-700">Os serviços serão listados aqui futuramente.</p>
      </section>

      <footer className="py-8 bg-gray-900 text-gray-300 text-center">
        <p className="font-semibold">{org?.name}</p>
        <p>{landing.endereco}</p>
        <p>{landing.telefone} | {landing.email}</p>
      </footer>
    </main>
  );
}
