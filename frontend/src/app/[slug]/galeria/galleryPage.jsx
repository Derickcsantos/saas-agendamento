"use client";

import { useEffect, useState } from "react";
import Footer from "../../components/Footer";

export default function GalleryPage({ slug }) {
  // const { slug } = params;
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const [palette, setPalette] = useState(null)
  const [orgData, setOrgData] = useState(null)
  

  const limit = 12;

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
        setOrgData(landingData);
        setPalette(paletteData); // <- crie um useState pra isso
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setNotFound(true);
      }
    }

  if (slug) fetchData();
}, [slug]);

  // Carrega imagens
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/galeria/${slug}?page=${page}&limit=${limit}${
          search ? `&termo=${encodeURIComponent(search)}` : ""
        }`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          console.log('Imagens não encontradas')
          return (
            <div className="flex h-screen items-center justify-center bg-white text-gray-700 text-center">
              <p>Nenhuma imagem encontrada.</p>
            </div>
          );
        }

        const json = await res.json();
        if (!json || !json.organization) throw new Error("Not found");

        setData(json);
      } catch (err) {
        console.error("Erro ao carregar galeria:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [slug, page, search]);

  // Estados visuais
  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-700 text-center">
        <p>Organização não encontrada.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-500">
        <p>Carregando galeria...</p>
      </div>
    );
  }

  const { organization, imagens, totalPages } = data;

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <>
      <main className="min-h-screen bg-gray-500 dark:text-gray-100 font-sans" style={{backgroundColor: palette?.background_color_main}}>
        {/* NAVBAR */}
        <nav className="flex justify-between items-center px-6 py-4 bg-white dark:bg-red-800 shadow" style={{backgroundColor: palette?.strong_color || '#dfdfdf', color: palette?.text_light_color || '#ffffff'}}>
          <div className="flex items-center gap-2">
            <img
              src={orgData?.organizations?.logo_organization || './mbranco.jpg'}
              alt="Logo"
              className="w-10 h-10 rounded-full border border-white"
            />
            <span className="font-bold text-gray-900 dark:text-gray-200 text-lg">
              {organization?.name || "Galeria"}
            </span>
          </div>
          <div className="flex justify-between w-[200px]">
            <a
              href={`/${slug}`}
              className="text-sm hover:underline"
              style={{color: palette?.text_light_color}}
            >
              Home
            </a>
            <a
              href={`/${slug}/agendar`}
              className="text-sm hover:underline"
              style={{color: palette?.text_light_color}}
            >
              Agendar
            </a>
            <a
              href={`/${slug}/minha-conta`}
              className="text-sm hover:underline"
              style={{color: palette?.text_light_color}}
            >
              Entrar
            </a>
          </div>
        </nav>

        {/* CONTEÚDO PRINCIPAL */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-center mb-8" style={{color: palette?.text_dark_color}}>Nossa Galeria</h1>

          {/* Busca */}
          <div className="flex justify-center mb-8">
            <input
              type="text"
              placeholder="Buscar por título..."
              value={search}
              onChange={handleSearch}
              style={{border: 'solid 1px #ccc'}}
              className="w-full md:w-1/2 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder-gray-600"
            />
          </div>

          {/* Grid de imagens */}
          {imagens.length === 0 ? (
            <div className="text-center text-gray-500">
              <i className="far fa-images text-3xl"></i>
              <p className="mt-3">Nenhuma imagem encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imagens.map((img) => (
                <div
                  key={img.imagem_id}
                  className="relative cursor-pointer group"
                  onDoubleClick={() => setSelectedImage(img.imagem_url)}
                >
                  <img
                    src={img.imagem_url}
                    alt={img.imagem_nome}
                    className="w-full h-48 object-cover rounded-lg shadow-md group-hover:opacity-80 transition"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 bg-black/50 text-white text-sm p-2 rounded-b-lg w-full text-center truncate">
                    {img.imagem_nome}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded-lg border ${
                    page === i + 1
                      ? "bg-purple-700 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Modal de imagem ampliada */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl border border-white"
            />
          </div>
        )}

      </main>
      <Footer slug={slug}/>
    </>
  );
}
