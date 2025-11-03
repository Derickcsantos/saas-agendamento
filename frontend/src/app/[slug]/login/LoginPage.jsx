"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage({ slug }) {
  const router = useRouter();

  const [formData, setFormData] = useState({ login: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ==============================
  // 1️⃣ Verifica se já está autenticado
  // ==============================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`,
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
      } catch (err) {
        console.warn("Não autenticado:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, slug]);

  // ========================
  // LOGIN NORMAL
  // ========================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login/${slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciais inválidas");
      }

      const tipo = data.user?.tipo;
      setSuccessMsg("Login realizado com sucesso!");

      setTimeout(() => {
        if (tipo === "admin") router.push(`/${slug}/admin`);
        else if (tipo === "funcionario") router.push(`/${slug}/funcionario`);
        else router.push(`/${slug}/logado`);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao efetuar login");
    } finally {
      setLoading(false);
    }
  };

   // ========================
  // LOGIN GOOGLE
  // ========================
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?slug=${slug}`;
  };

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Verificando autenticação...
      </div>
    );
  }


  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl text-green-500 font-semibold text-center mb-6">
          Login — {slug}
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-900 font-medium mb-1">Usuário ou Email</label>
            <input
              type="text"
              value={formData.login}
              onChange={(e) =>
                setFormData({ ...formData, login: e.target.value })
              }
              className="w-full border  text-gray-900  border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
              required
              placeholder="Digite seu usuário ou e-mail"
            />
          </div>

          <div>
            <label className="block text-sm  text-gray-900  font-medium mb-1">Senha</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full border  text-gray-900  border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
              required
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-700 text-white py-2 rounded-md font-medium transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full border  text-gray-900  border-gray-300 mt-4 py-2 rounded-md flex justify-center items-center gap-2 hover:bg-gray-50"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            className="w-5 h-5"
          />
          Entrar com Google
        </button>

        {errorMsg && (
          <div className="mt-4 text-red-600 text-sm text-center">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="mt-4 text-green-600 text-sm text-center">
            {successMsg}
          </div>
        )}
      </div>
    </main>
  );
}
