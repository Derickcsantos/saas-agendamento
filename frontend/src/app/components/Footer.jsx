"use client";

import { useEffect, useState } from "react";

export default function Footer({ slug }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/api/landing-page/${slug}`)
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
      <div className="flex h-screen items-center justify-center text-gray-500">
        <p>Carregando...</p>
      </div>
    );
  }

  const org = data.organizations;
  const landing = data;

  return (
    <footer className="bg-purple-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3 text-center md:text-left">
        <p className="text-sm text-purple-100">
          &copy; {new Date().getFullYear()} {landing?.name}. Todos os direitos reservados.
        </p>
        <p className="text-sm text-purple-200">
          Desenvolvido por <span className="font-semibold text-white">Marcafy</span>
        </p>
      </div>
    </footer>
  );
}
