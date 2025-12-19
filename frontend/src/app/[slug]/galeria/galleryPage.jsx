"use client";

import { useEffect, useState } from "react";
import Footer from "../../components/Footer";

export default function GalleryPage({ slug }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);

  const [palette, setPalette] = useState(null);
  const [orgData, setOrgData] = useState(null);

  const limit = 12;

  /* ===========================
   * DEBOUNCE DA BUSCA
   =========================== */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  /* ===========================
   * CARREGAMENTO INICIAL
   =========================== */
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [landingRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);

        if (!landingRes.ok || !colorRes.ok) throw new Error();

        setOrgData(await landingRes.json());
        setPalette(await colorRes.json());
      } catch {
        setNotFound(true);
      } finally {
        setLoadingPage(false);
      }
    }

    if (slug) fetchInitialData();
  }, [slug]);

  /* ===========================
   * GALERIA
   =========================== */
  useEffect(() => {
    const controller = new AbortController();

    async function fetchGallery() {
      try {
        setLoadingGallery(true);

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${slug}?page=${page}&limit=${limit}${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`;

        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error();

        setData(await res.json());
      } catch {
        if (!controller.signal.aborted) {
          setNotFound(true);
        }
      } finally {
        setLoadingGallery(false);
      }
    }

    fetchGallery();
    return () => controller.abort();
  }, [slug, page, search]);

  /* ===========================
   * ESTADOS GLOBAIS
   =========================== */
  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Organização não encontrada.
      </div>
    );
  }

  if (loadingPage || !data) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Carregando galeria...
      </div>
    );
  }

  const { organization, imagens, totalPages } = data;

  return (
    <>
      <main
        className="min-h-screen transition-colors"
        style={{ backgroundColor: palette?.background_color_main }}
      >
        {/* NAVBAR */}
        <nav
          className="flex justify-between items-center px-6 py-4 shadow"
          style={{
            backgroundColor: palette?.strong_color,
            color: palette?.text_light_color,
          }}
        >
          <div className="flex items-center gap-2">
            <img
              src={orgData?.organizations?.logo_organization || "/mbranco.jpg"}
              className="w-10 h-10 rounded-full border"
            />
            <span className="font-bold text-lg">{organization?.name}</span>
          </div>

          <div className="flex gap-6 text-sm">
            <a href={`/${slug}`}>Home</a>
            <a href={`/${slug}/agendar`}>Agendar</a>
            <a href={`/${slug}/minha-conta`}>Entrar</a>
          </div>
        </nav>

        {/* CONTEÚDO */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <h1
            className="text-3xl font-bold text-center mb-8"
            style={{ color: palette?.text_dark_color }}
          >
            Nossa Galeria
          </h1>

          {/* BUSCA */}
          <div className="flex justify-center mb-8">
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* GRID */}
          <div className="relative">
            {loadingGallery && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <span className="text-gray-600 animate-pulse">
                  Buscando imagens...
                </span>
              </div>
            )}

            {imagens.length === 0 ? (
              <div className="text-center text-gray-500">
                Nenhuma imagem encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-opacity">
                {imagens.map((img) => (
                  <div
                    key={img.imagem_id}
                    className="cursor-pointer group"
                    onDoubleClick={() => setSelectedImage(img.imagem_url)}
                  >
                    <img
                      src={img.imagem_url}
                      alt={img.imagem_nome}
                      className="w-full h-48 object-cover rounded-lg shadow group-hover:opacity-80 transition"
                    />
                    <div className="mt-1 text-sm text-center truncate">
                      {img.imagem_nome}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded border transition ${
                    page === i + 1
                      ? "bg-purple-700 text-white"
                      : "bg-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* MODAL */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl"
            />
          </div>
        )}
      </main>

      <Footer slug={slug} />
    </>
  );
}
