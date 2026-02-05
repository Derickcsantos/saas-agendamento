"use client";

import { useEffect, useState } from "react";

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
  const PRIMARY = palette?.strong_color || "#3B82F6";
  const org = organization || { name: "Empresa", logo_organization: null };

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif' }} className="bg-white">
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      {/* HEADER PREMIUM */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm flex items-center justify-center overflow-hidden border border-gray-200">
              {orgData?.organizations?.logo_organization ? (
                <img
                  src={orgData.organizations.logo_organization}
                  alt={org.name}
                  className="h-full w-full object-cover p-1"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800">
                  {(org.name || "MB")
                    .split(" ")
                    .map((i) => i[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 tracking-tight">{org.name}</span>
              <span className="text-xs text-gray-500">Galeria de fotos</span>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href={`/${slug}`} className="hover:text-gray-900 transition-colors duration-200">
              Home
            </a>
            <a href={`/${slug}/agendar`} className="hover:text-gray-900 transition-colors duration-200">
              Agendar
            </a>
            <a href={`/${slug}/galeria`} className="text-gray-900 font-semibold">
              Galeria
            </a>
          </nav>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <a
              href={`/${slug}/minha-conta`}
              className="hidden sm:inline-flex items-center justify-center text-gray-700 text-sm font-medium px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Entrar
            </a>
            <a
              href={`/${slug}/minha-conta`}
              className="sm:hidden inline-flex items-center justify-center text-gray-700 p-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              aria-label="Login"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
            <a
              href={`/${slug}/agendar`}
              style={{ 
                backgroundColor: PRIMARY,
                boxShadow: `0 4px 14px ${PRIMARY}40`
              }}
              className="hidden sm:inline-flex text-white text-sm font-semibold px-6 py-3 rounded-full hover:opacity-95 transition-all duration-200 hover:-translate-y-0.5"
            >
              Agendar agora
            </a>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Mensagem de Boas-vindas */}
          <div className="text-center mb-12 animate-fadeIn">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                {orgData?.organizations?.logo_organization ? (
                  <img
                    src={orgData.organizations.logo_organization}
                    alt={org.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">
                      {(org.name || "MB")
                        .split(" ")
                        .map((i) => i[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span
                className="text-sm font-semibold tracking-wide"
                style={{ color: PRIMARY }}
              >
                {org.name}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Nossa Galeria
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Confira nosso trabalho e se inspire com nossos melhores momentos
            </p>
          </div>

          {/* BUSCA */}
          <div className="flex justify-center mb-12">
            <div className="w-full md:w-2/3 lg:w-1/2 relative">
              <input
                type="text"
                placeholder="Buscar por título..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:border-transparent shadow-sm transition-all duration-200"
                style={{ 
                  focusRingColor: `${PRIMARY}40`,
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${PRIMARY}20`}
                onBlur={(e) => e.target.style.boxShadow = ''}
              />
              <svg
                className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* GRID DE IMAGENS */}
          <div className="relative">
            {loadingGallery && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-900 mb-4"></div>
                  <p className="text-gray-600 font-medium">Buscando imagens...</p>
                </div>
              </div>
            )}

            {imagens.length === 0 ? (
              <div className="text-center py-20">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 text-lg">Nenhuma imagem encontrada.</p>
                {search && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                    }}
                    className="mt-4 text-sm font-medium hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {imagens.map((img) => (
                  <div
                    key={img.imagem_id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedImage(img.imagem_url)}
                  >
                    <div className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                      <div className="aspect-square relative">
                        <img
                          src={img.imagem_url}
                          alt={img.imagem_nome}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        
                        {/* Overlay com informações no hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          <h3 className="text-white font-bold text-lg mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            {img.imagem_nome}
                          </h3>
                          {img.imagem_descricao && (
                            <p className="text-gray-200 text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                              {img.imagem_descricao}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Borda colorida sutil */}
                      <div
                        className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-current transition-colors duration-300"
                        style={{ color: PRIMARY }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center mt-12 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Mostrar apenas algumas páginas para não sobrecarregar em mobile
                if (
                  totalPages <= 7 ||
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pageNum)}
                      style={{
                        backgroundColor: page === pageNum ? PRIMARY : 'white',
                        color: page === pageNum ? 'white' : '#374151',
                        borderColor: page === pageNum ? PRIMARY : '#E5E7EB'
                      }}
                      className="px-4 py-2 rounded-lg border font-medium transition-all duration-200 hover:shadow-md min-w-[40px]"
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={i} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE IMAGEM AMPLIADA */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/50 hover:bg-black/70"
            aria-label="Fechar"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedImage}
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* FOOTER PREMIUM */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Logo e Descrição */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {orgData?.organizations?.logo_organization && (
                  <img
                    src={orgData.organizations.logo_organization}
                    alt={org.name}
                    className="h-10 w-10 object-contain"
                  />
                )}
                <span className="font-bold text-gray-900 text-lg">{org.name}</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Experiências de excelência e atendimento premium.
              </p>
            </div>

            {/* Links Rápidos */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Links Rápidos</h3>
              <div className="space-y-2">
                <a href={`/${slug}`} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Home
                </a>
                <a href={`/${slug}/agendar`} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Agendar Horário
                </a>
                <a href={`/${slug}/galeria`} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Galeria
                </a>
                <a href={`/${slug}/minha-conta`} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Minha Conta
                </a>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
              <div className="space-y-3">
                {orgData?.organizations?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{orgData.organizations.phone}</span>
                  </div>
                )}
                {orgData?.organizations?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="break-all">{orgData.organizations.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé Inferior */}
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {org.name}. Todos os direitos reservados.
              <span className="block md:inline mt-2 md:mt-0 md:ml-2">
                Desenvolvido com tecnologia moderna.
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
