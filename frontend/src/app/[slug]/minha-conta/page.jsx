"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";
import { Menu, X } from "lucide-react";

/* =======================
   UTIL
======================= */
function getTimeRemaining(date, time) {
  if (!date || !time) return null;

  const appointment = new Date(`${date}T${time}`);
  const now = new Date();

  const diff = appointment - now;

  if (diff <= 0) return "⏰ Seu agendamento é agora ou já passou";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `📅 Faltam ${days} dia(s)`;
  if (hours > 0) return `⏳ Faltam ${hours} hora(s)`;
  return `⏱️ Faltam ${minutes} minuto(s)`;
}

/* =======================
   PAGE
======================= */
export default function MyAccountPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [palette, setPalette] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [user, setUser] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* =======================
     AUTH
  ======================= */
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`
        );

        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        console.log("🟢 FRONTEND → user autenticado:", data.user);
        setUser(data.user);
      } catch (err) {
        console.error("Erro auth:", err);
        router.push(`/${slug}/login`);
      } finally {
        setLoading(false);
      }
    }

    if (slug) checkAuth();
  }, [slug, router]);

  /* =======================
     NEXT APPOINTMENT
  ======================= */
  useEffect(() => {
    if (!user?.id) return;

    console.log("🟢 FRONTEND → user.id:", user.id);

    async function fetchNextAppointment() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/client/${user.id}/next`,
          { credentials: "include" }
        );

        const data = await res.json();

        console.log("🟣 FRONTEND → nextAppointment recebido:", data);

        setNextAppointment(data && Object.keys(data).length ? data : null);
      } catch (err) {
        console.error("🔴 Erro ao buscar próximo agendamento:", err);
        setNextAppointment(null);
      }
    }

    fetchNextAppointment();
  }, [user]);

  /* =======================
     ORG DATA
  ======================= */
  useEffect(() => {
    async function fetchData() {
      try {
        const [landingRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
            credentials: "include",
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
            { credentials: "include" }
          ),
        ]);

        const landingData = await landingRes.json();
        const paletteData = await colorRes.json();

        setOrgData(landingData);
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar dados da org:", err);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    sessionStorage.removeItem("token");
    router.push(`/${slug}/login`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  const strong = palette?.strong_color || "#6b4ce6";
  const textLight = palette?.text_light_color || "#ffffff";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* NAVBAR */}
      <nav
        className="sticky top-0 z-40 shadow"
        style={{ backgroundColor: strong, color: textLight }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="font-bold text-xl">Marcafy</span>

          <div className="hidden md:flex gap-6">
            <button onClick={() => router.push(`/${slug}/agendar`)}>
              Agendar
            </button>
            <button onClick={() => setShowProfile(true)}>Perfil</button>
            <button onClick={logout}>Sair</button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <main className="py-12 px-4">
        <section className="max-w-4xl mx-auto text-center">
          <div
            className="rounded-3xl p-10 shadow-xl"
            style={{ backgroundColor: strong, color: textLight }}
          >
            <h1 className="text-4xl font-bold mb-3">
              Bem-vindo(a), {user?.username}
            </h1>

            <p className="mb-6">
              {nextAppointment
                ? getTimeRemaining(
                    nextAppointment.appointment_date,
                    nextAppointment.start_time
                  )
                : "Você ainda não possui agendamentos futuros."}
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push(`/${slug}/agendar`)}
                className="bg-white text-black px-6 py-3 rounded-xl"
              >
                Agendar Agora
              </button>

              <button
                onClick={() =>
                  router.push(`/${slug}/minha-conta/agendamentos`)
                }
                className="border border-white px-6 py-3 rounded-xl"
              >
                Meus Agendamentos
              </button>
            </div>
          </div>
        </section>
      </main>

      {showProfile && (
        <ProfileModal
          user={user}
          slug={slug}
          setUser={setUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      <Footer slug={slug} />
    </div>
  );
}
