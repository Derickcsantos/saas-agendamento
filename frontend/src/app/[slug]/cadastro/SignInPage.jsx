"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage({ slug }) {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    aniversario: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [palette, setPalette] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ==========================
  // 1️⃣ Verifica autenticação (cookie JWT)
  // ==========================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`,
          { credentials: "include" }
        );
        const data = await res.json();

        if (res.ok && data.authenticated && data.user) {
          const tipo = data.user.tipo;
          if (tipo === "admin") router.push(`/${slug}/admin`);
          else if (tipo === "funcionario") router.push(`/${slug}/funcionario`);
          else router.push(`/${slug}/logado`);
          return;
        }
      } catch {
        // não autenticado
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, slug]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Executa ambas as chamadas em paralelo
        const [colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);
  
        if (!colorRes.ok) throw new Error("Palette not found");
  
        const paletteData = await colorRes.json();
  
        setPalette(paletteData); 
  
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setNotFound(true);
      }
    }
  
    if (slug) fetchData();
  }, [slug]);

  // ==========================
  // 2️⃣ Envia cadastro
  // ==========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const { username, email, aniversario, phone, password, confirmPassword } =
      form;

    if (!username || !email || !password) {
      return setErrorMsg("Preencha todos os campos obrigatórios.");
    }

    if (password !== confirmPassword) {
      return setErrorMsg("As senhas não coincidem.");
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/register/${slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            aniversario,
            phone,
            password_plaintext: password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cadastrar.");
      }

      setSuccessMsg("Cadastro realizado com sucesso! Redirecionando...");
      setTimeout(() => router.push(`/${slug}/login`), 2000);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao cadastrar usuário.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-700">
        Verificando autenticação...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6" style={{color: palette?.strong_color}}>
          Criar Conta — {slug}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-900 font-medium mb-1">Nome completo</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-900 font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite seu email"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-sm text-gray-900 font-medium mb-1">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm text-gray-900 font-medium mb-1">Data de nascimento</label>
              <input
                type="date"
                value={form.aniversario}
                onChange={(e) => setForm({ ...form, aniversario: e.target.value })}
                className="w-full text-gray-900 border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-900 text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <div>
            <label className="block text-gray-900 text-sm font-medium mb-1">Confirmar senha</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Confirme sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full hover:bg-green-700 text-white py-2 rounded-md font-medium transition"
            style={{backgroundColor: palette?.strong_color}}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        {errorMsg && (
          <p className="mt-4 text-red-600 text-sm text-center">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="mt-4 text-green-600 text-sm text-center">{successMsg}</p>
        )}

        <div className="text-center text-gray-900 mt-4 text-sm">
          Já tem conta?{" "}
          <button
            onClick={() => router.push(`/${slug}/login`)}
            className=" hover:underline"
            style={{color: palette?.strong_color}}
          >
            Faça login
          </button>
        </div>
      </div>
    </main>
  );
}
