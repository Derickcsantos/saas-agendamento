"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";
import { Menu, X } from "lucide-react";

export default function MyAccountPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [palette, setPalette] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });

        const data = await res.json();
        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        setUser(data.user);
      } catch (error) {
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

  useEffect(() => {
    async function fetchData() {
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

        const landingData = await landingRes.json();
        const paletteData = await colorRes.json();

        setOrgData(landingData);
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
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

  const strong = palette?.strong_color || "#6b4ce6";
  const textLight = palette?.text_light_color || "#ffffff";

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav
        className="shadow-md sticky top-0 z-40"
        style={{ backgroundColor: strong, color: textLight }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/${slug}/minha-conta`)}>
            <img
              src={orgData?.organizations?.logo_organization || "/mTopbar.jpg"}
              className="w-11 h-11 rounded-full border border-white shadow-sm"
              alt="Logo"
            />
            <span className="font-bold text-xl">Marcafy</span>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push(`/${slug}/minha-conta`)} className="hover:underline font-semibold">
              Início
            </button>
            <button onClick={() => router.push(`/${slug}/agendar`)} className="hover:underline">
              Agendar
            </button>
            <button onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)} className="hover:underline">
              Meus Agendamentos
            </button>

            <button
              onClick={toggleTheme}
              className="px-3 py-1 rounded-lg bg-white/20 text-white shadow-sm hover:bg-white/30 transition"
            >
              {theme === "dark" ? "bi bi-brightness-low" : "bi bi-moon"}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="bg-white text-purple-700 px-4 py-2 rounded-lg font-bold shadow hover:bg-purple-100 transition"
            >
              Perfil
            </button>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-semibold shadow"
            >
              Sair
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* MOBILE DROPDOWN */}
        {mobileMenuOpen && (
          <div className="md:hidden flex flex-col gap-3 px-4 pb-4 animate-fadeIn">
            <button onClick={() => router.push(`/${slug}/minha-conta`)} className="py-2 text-left">Início</button>
            <button onClick={() => router.push(`/${slug}/agendar`)} className="py-2 text-left">Agendar</button>
            <button onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)} className="py-2 text-left">Meus Agendamentos</button>

            <button
              onClick={toggleTheme}
              className="py-2 bg-white/20 rounded-lg shadow text-center"
            >
              {theme === "dark" ? "☀️ Tema Claro" : "🌙 Tema Escuro"}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="bg-white text-purple-700 px-3 py-2 rounded-lg font-bold shadow text-center"
            >
              Perfil
            </button>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white font-semibold shadow text-center"
            >
              Sair
            </button>
          </div>
        )}
      </nav>

      {/* HERO / CONTEÚDO */}
      <main className="flex-grow py-12 px-4">
        <section className="max-w-4xl mx-auto text-center">
          <div
            className="rounded-3xl p-10 shadow-xl backdrop-blur-md bg-white/10 dark:bg-black/20 border border-white/20"
            style={{ backgroundColor: strong, color: textLight }}
          >
            <h1 className="text-4xl font-bold mb-3">Bem-vindo(a), {user?.username}</h1>
            <p className="text-md mb-6 opacity-90">
              Seu espaço de beleza e bem-estar, criado para cuidar de você com excelência.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.push(`/${slug}/agendar`)}
                className="bg-white text-gray-800 font-semibold px-6 py-3 rounded-xl shadow hover:bg-purple-50 transition"
              >
                Agendar Agora
              </button>
              <button
                onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}
                className="border border-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-purple-700 transition"
              >
                Meus Agendamentos
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL */}
      {showProfile && (
        <ProfileModal user={user} slug={slug} setUser={setUser} onClose={() => setShowProfile(false)} />
      )}

      {/* FOOTER */}
      <Footer slug={slug} />
    </div>
  );
}
