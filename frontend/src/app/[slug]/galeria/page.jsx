"use client";

import { useEffect, useState } from "react";

export default function GalleryPage({ params }) {
  const { slug } = params;
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);

  const limit = 12;

  // Carrega imagens
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/galeria/${slug}?page=${page}&limit=${limit}${
          search ? `&termo=${encodeURIComponent(search)}` : ""
        }`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Not found");

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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-800 shadow">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <span className="font-bold text-gray-900 dark:text-gray-200 text-lg">
            {organization?.name || "Galeria"}
          </span>
        </div>
        <a
          href={`/${slug}`}
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
        >
          Voltar à página inicial
        </a>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-center mb-8">Nossa Galeria</h1>

        {/* Busca */}
        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={handleSearch}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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

      {/* Rodapé simples */}
      <footer className="py-6 bg-gray-900 text-gray-300 text-center">
        <p className="text-sm">
          © {new Date().getFullYear()} {organization?.name || "Galeria"}. Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
