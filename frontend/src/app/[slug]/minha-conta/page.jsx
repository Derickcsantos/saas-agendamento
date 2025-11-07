"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";

export default function MyAccountPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams()
  const slug = params?.slug;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);

  // =========================
  // 1️⃣ Verifica autenticação
  // =========================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }
        setUser(data.user);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push(`/${slug}/login`);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, slug]);

  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { 
      method: "POST",
      credentials: "include" 
    });
    router.push(`/${slug}/login`);
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 dark:text-gray-200">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mr-2"></div>
        Carregando...
      </div>
    );

  // =========================
  // 3️⃣ Render
  // =========================
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors">
      {/* NAVBAR */}
      <nav className="bg-purple-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => router.push(`/${slug}/minha-conta`)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/img/LogoPaulaTrancas.png"
              alt="Logo"
              className="w-10 h-10 rounded-full border border-white"
            />
            <span className="font-semibold text-lg">Marcafy</span>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push(`/${slug}/minha-conta`)}
              className={`hover:underline font-semibold`}
            >
              Início
            </button>
            <button
              onClick={() => router.push(`/${slug}/agendar`)}
              className="hover:underline"
            >
              Agendar
            </button>
            <button
              onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}
              className="hover:underline"
            >
              Meus Agendamentos
            </button>

            <button
              onClick={toggleTheme}
              className="text-white bg-purple-900 hover:bg-purple-800 px-3 py-1 rounded-lg transition"
              title="Alternar tema"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="bg-white text-purple-700 px-3 py-1 rounded-lg font-medium hover:bg-purple-100 transition"
            >
              Perfil
            </button>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow py-10">
        <section className="max-w-5xl mx-auto text-center">
          <div className="bg-purple-700 text-white rounded-3xl p-10 shadow-lg">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Bem-vindo(a), {user?.username}
            </h1>
            <p className="text-lg mb-6 text-purple-100">
              Seu espaço de beleza e bem-estar, onde cada detalhe é pensado para realçar sua beleza
              única.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push(`/${slug}/agendar`)}
                className="bg-white text-purple-700 font-semibold px-6 py-3 rounded-lg hover:bg-purple-50 transition"
              >
                Agendar Agora
              </button>
              <button
                onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}
                className="border border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-700 transition"
              >
                Meus Agendamentos
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL DE PERFIL */}
      {showProfile && (
        <ProfileModal
          user={user}
          setUser={setUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* FOOTER */}
      <Footer slug={slug}/>
    </div>
  );
}
