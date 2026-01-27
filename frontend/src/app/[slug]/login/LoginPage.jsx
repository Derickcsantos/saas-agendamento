"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function LoginPage({ slug }) {
  const router = useRouter();

  const [formData, setFormData] = useState({ login: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { palette } = useOrganizationColors(slug);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`
        );
        const data = await res.json();

        if (res.ok && data.authenticated && data.user) {
          
          const tipo = data.user?.tipo;

          switch (tipo) {
            case "admin":
              router.push(`/${slug}/admin`);
              break;

            case "funcionario":
              router.push(`/${slug}/profissional`);
              break;

            case "marketing":
              router.push(`/marketing`);
              break;

            case "master":
              router.push(`/admin-dashboard`);
              break;

            default:
              router.push(`/${slug}/minha-conta`);
              break;
          }
        }
      console.log(data.user.tipo)
      } catch (err) {
        console.warn("Não autenticado:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
    loadOrganizations();
  }, [router, slug]);

  const loadOrganizations = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`);
      const data = await res.json();

      setOrganization(data);
    } catch (err) {
      console.error("Erro ao buscar organização:", err);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

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

      // 🔥 Lê o token do header Authorization (fallback para iOS/Safari)
      const authHeader = res.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        sessionStorage.setItem('token', token);
      }

      const tipo = data.user?.tipo;
      setSuccessMsg("Login realizado com sucesso!");

      setTimeout(() => {
        if (tipo === "admin") router.push(`/${slug}/admin`);
        else if (tipo === "funcionario") router.push(`/${slug}/profissional`);
        else router.push(`/${slug}/minha-conta`);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao efetuar login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`);
      const org = await res.json();

      if (!org?.id) {
        return toast.error("Organização não encontrada.");
      }

      window.location.href =
        `${process.env.NEXT_PUBLIC_API_URL}/auth/google?organization_id=${org.id}`;
    } catch (err) {
      toast.error("Erro ao iniciar login com Google.");
    }
  };


  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-500">
        Verificando autenticação...
      </div>
    );
  }


  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="absolute top-1 left-4 w-10 h-10 ">
        <a href={`/${slug}/agendar`} >
        <img width="30" height="30" src="https://img.icons8.com/ios/50/left--v1.png" alt="left--v1"/>
        </a>
      </div>
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6" style={{color: palette?.strong_color}}>
          Login — {organization?.name || slug}
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
            <label className="block text-sm text-gray-900 font-medium mb-1">
              Senha
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full border text-gray-900 border-gray-300 rounded-md p-2 pr-10 focus:ring-purple-500 focus:border-purple-500"
                required
                placeholder="Digite sua senha"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 rounded-md font-medium transition"
            style={{backgroundColor: palette?.strong_color}}
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
        <p className="flex justify-center mt-5 text-gray-800">Não tem conta? <a href={`/${slug}/cadastro`} className="px-1 " style={{color: palette?.strong_color}}>Clique aqui</a>
        </p>
      </div>
    </main>
  );
}
