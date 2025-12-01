"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const BRAND = "#5E3BEE";

export default function GlobalLogin() {
  const router = useRouter();

  const containerRef = useRef(null);
  const [organizations, setOrganizations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 4;

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const [formData, setFormData] = useState({ login: "", password: "" });
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ===========================
  // 🔎 GET ORGANIZATIONS
  // ===========================
  const loadOrganizations = async () => {
    try {
      setLoadingOrgs(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations`);
      const data = await res.json();

      const list = Array.isArray(data) ? data : [];
      setOrganizations(list);
      setFiltered(list);

    } catch (err) {
      console.error("Erro ao buscar organizações:", err);
      setOrganizations([]);
      setFiltered([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setFiltered([]);
        setPage(1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtragem em tempo real
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

  // Selecionar organização
  const handleSelect = (org) => {
    setSelectedOrg(org);
    setQuery(org.name);
    setFiltered([]);
  };

  // ===========================
  // 🔐 LOGIN
  // ===========================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedOrg?.slug_organization) {
      setErrorMsg("Por favor, selecione uma organização.");
      setLoadingLogin(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login/${selectedOrg.slug_organization}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciais inválidas");
      }

      setSuccessMsg("Login realizado com sucesso!");

      setTimeout(() => {
        const tipo = data.user?.tipo;

        if (tipo === "admin") router.push(`/${selectedOrg.slug_organization}/admin`);
        else if (tipo === "funcionario") router.push(`/${selectedOrg.slug_organization}/profissional`);
        else if (tipo === "master") router.push(`/admin-dashboard`);
        else router.push(`/${selectedOrg.slug_organization}/minha-conta`);
      }, 700);

    } catch (err) {
      setErrorMsg(err.message || "Erro ao fazer login");
    } finally {
      setLoadingLogin(false);
    }
  };

  // ===========================
  // UI
  // ===========================
  return (
    
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">

        {/* Título */}
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: BRAND }}>
          Acesse sua conta
        </h1>

        {/* ORGANIZAÇÃO */}
        <div ref={containerRef} className="relative mb-6">
          <label className="block text-sm text-gray-950 font-medium mb-1">
            Selecione sua organização
          </label>

          <div
            className="relative flex items-center rounded-xl bg-white px-4 py-3 shadow-sm border"
            style={{ borderColor: `${BRAND}40` }}
          >
            <Search size={18} color={BRAND} className="mr-2" />

            <input
              type="text"
              value={query}
              placeholder="Buscar organização..."
              onFocus={loadOrganizations}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-gray-950 outline-none text-[15px]"
            />
          </div>

          {filtered.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl bg-white border shadow-md z-20">
              {loadingOrgs && (
                <div className="p-3 text-sm text-gray-500">Carregando...</div>
              )}

              {!loadingOrgs &&
                paginated.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelect(org)}
                    className="w-full flex text-gray-950 justify-between px-4 py-3 border-b hover:bg-gray-50"
                  >
                    <div className="text-left">
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-gray-800">/{org.slug_organization}</div>
                    </div>

                    {org.logo_organization && (
                      <img
                        src={org.logo_organization}
                        className="h-8 w-8 rounded-lg border-gray-500 object-cover"
                        alt={org.name}
                      />
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-950 text-sm font-medium mb-1">Usuário ou Email</label>
            <input
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-gray-950"
              placeholder="Digite seu usuário"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-950 font-medium mb-1">Senha</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="w-full border text-gray-950 border-gray-300 rounded-md p-2"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full text-white py-2 rounded-md font-medium transition"
            style={{ backgroundColor: BRAND }}
          >
            {loadingLogin ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div className="w-full mt-4 flex justify-center">
          <p className="text-gray-500 mr-1">Deseja voltar?</p>
          <a style={{color: "#5E3BEE"}}  href="/">clique aqui</a>
        </div>

        {/* MENSAGENS */}
        {errorMsg && (
          <div className="mt-4 text-red-600 text-sm text-center">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="mt-4 text-green-600 text-sm text-center">{successMsg}</div>
        )}
      </div>
    </main>
  );
}
