"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useRef } from "react";

const BRAND = "#5E3BEE";

export function OrganizationSelector() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [organizations, setOrganizations] = useState([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 4;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  
  const loadOrganizations = async () => {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/organizations");
      const data = await res.json();

      const safeArray = Array.isArray(data) ? data : [];

      setOrganizations(safeArray);
      setFiltered(safeArray);
    } catch (err) {
      console.error("Erro ao buscar organizações:", err);
      setOrganizations([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setFiltered([]);
        setPage(1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrar enquanto digita
  useEffect(() => {
    const q = query.toLowerCase();

    if (q.trim() === "") {
      setFiltered([]);
      setPage(1);
      return;
    }

    const results = organizations.filter((org) =>
      (org.name || "").toLowerCase().includes(q) ||
      (org.slug_organization || "").toLowerCase().includes(q) ||
      (org.email || "").toLowerCase().includes(q)
    );

    setFiltered(results);
    setPage(1); 
  }, [query, organizations]);


  const handleSelect = (org) => {
    if (!org.slug_organization) return;
    router.push(`/${org.slug_organization}`);
  };

  return (
    <section className="mx-auto max-w-xl w-full px-6 py-16 md:px-8">
      <div className="mb-6 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
          style={{
            border: `1px solid ${BRAND}20`,
            background: "white",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          🔎 Escolher sua organização
        </span>

        <h2 className="mt-4 text-3xl font-bold tracking-tight">
          Entre no seu painel Marcafy
        </h2>

        <p className="mt-2 text-neutral-600">
          Busque seu salão, clínica, barbearia ou negócio cadastrado.
        </p>
      </div>

      {/* 🔥 CONTÊINER CONTROLADO COM A REF */}
      <div ref={containerRef} className="relative">

        {/* Campo de busca */}
        <div
          className="relative flex items-center rounded-2xl bg-white px-4 py-3 shadow-md"
          style={{ border: `1px solid ${BRAND}26` }}
        >
          <Search size={20} color={BRAND} className="mr-2" />

          <input
            type="text"
            placeholder="Digite o nome da organização..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={loadOrganizations}  
            className="w-full outline-none text-[15px]"
          />
        </div>

        {/* Lista de resultados — só aparece se houver itens */}
        {Array.isArray(filtered) && filtered.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white shadow-lg border border-neutral-200 z-20">
            {loading && (
              <div className="px-4 py-3 text-center text-neutral-500 text-sm">
                Carregando organizações...
              </div>
            )}

            {!loading &&
              paginated.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-neutral-50 transition"
                >
                  <div className="text-left">
                    <div className="font-medium">{org.name}</div>

                    {org.slug_organization ? (
                      <div className="text-sm text-neutral-500">
                        /{org.slug_organization}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400 italic">
                        Nenhum slug definido
                      </div>
                    )}
                  </div>

                  {org.logo_organization && (
                    <img
                      src={org.logo_organization}
                      alt={org.name}
                      className="h-10 w-10 rounded-xl object-cover border border-neutral-200"
                    />
                  )}
                </button>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-between items-center p-3">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="text-sm text-neutral-600 disabled:opacity-40"
                  >
                    ◀ Anterior
                  </button>

                  <span className="text-sm text-neutral-500">
                    Página {page} de {totalPages}
                  </span>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="text-sm text-neutral-600 disabled:opacity-40"
                  >
                    Próxima ▶
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Lista vazia */}
        {!loading && Array.isArray(filtered) && filtered.length === 0 && query !== "" && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white shadow-lg border border-neutral-200 z-20">
            <div className="px-4 py-3 text-center text-neutral-500 text-sm">
              Nenhuma organização encontrada.
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
