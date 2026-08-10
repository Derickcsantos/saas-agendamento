"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { getUserDestination } from "@/lib/userDestination";
import Footer from "../../components/Footer";
import ProfileModal from "../../components/ProfileModal";
import { 
  Menu, 
  X, 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  MessageCircle,
  ChevronRight,
  Star,
  Award,
  Shield,
  Sparkles,
  CalendarDays,
  Scissors,
  Palette,
  Home
} from "lucide-react";

export default function MyAccountPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug;

  const [palette, setPalette] = useState(null);
  const [landingData, setLandingData] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    appointments: 0,
    upcoming: 0,
    completed: 0
  });

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`);
        const data = await res.json();
        
        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        const destination = getUserDestination(slug, data.user);
        if (destination !== `/${slug}/minha-conta`) {
          router.replace(destination);
          return;
        }

        setUser(data.user);
        
        // Simular dados de estatísticas do usuário
        setStats({
          appointments: 12,
          upcoming: 2,
          completed: 10
        });
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
        const [landingRes, colorRes, orgRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`, {
            credentials: "include",
          }),
        ]);

        if (!landingRes.ok || !colorRes.ok || !orgRes.ok) throw new Error();

        const landingData = await landingRes.json();
        const paletteData = await colorRes.json();
        const orgData = await orgRes.json();

        setLandingData(landingData);
        setPalette(paletteData);
        setOrganization(orgData);
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
    sessionStorage.removeItem('token');
    router.push(`/${slug}/login`);
  };

  const quickActions = [
    {
      icon: <CalendarDays className="w-6 h-6" />,
      title: "Agendar Serviço",
      description: "Marque um novo horário",
      action: () => router.push(`/${slug}/agendar`),
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Ver Agendamentos",
      description: "Consulte seus horários",
      action: () => router.push(`/${slug}/minha-conta/agendamentos`),
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <User className="w-6 h-6" />,
      title: "Meu Perfil",
      description: "Editar informações",
      action: () => setShowProfile(true),
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Scissors className="w-6 h-6" />,
      title: "Serviços",
      description: "Conheça nossos serviços",
      action: () => router.push(`/${slug}/servicos`),
      color: "from-orange-500 to-red-500"
    }
  ];

  const contactInfo = [
    {
      icon: <Phone className="w-5 h-5" />,
      label: "Telefone",
      value: landingData?.telefone || organization?.phone,
      href: `tel:${landingData?.telefone || organization?.phone}`
    },
    {
      icon: <Mail className="w-5 h-5" />,
      label: "E-mail",
      value: landingData?.email || organization?.email,
      href: `mailto:${landingData?.email || organization?.email}`
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: "Endereço",
      value: landingData?.endereco || organization?.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(landingData?.endereco || organization?.address)}`
    },
    {
      icon: <Instagram className="w-5 h-5" />,
      label: "Instagram",
      value: landingData?.instagram,
      href: `https://instagram.com/${landingData?.instagram?.replace('@', '')}`
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-transparent border-t-purple-500 border-r-purple-300 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-transparent border-b-purple-700 border-l-purple-400 rounded-full animate-spin animate-reverse"></div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
          Carregando sua experiência...
        </p>
      </div>
    );
  }

  const strong = palette?.strong_color || "#6b4ce6";
  const light = palette?.light_color || "#f3f2f5";
  const textLight = palette?.text_light_color || "#ffffff";
  const bgMain = palette?.strong_color || "#6b4ce6";

  return (
    <div 
      className="min-h-screen transition-all duration-500"
      style={{
        '--primary': strong,
        '--primary-light': light,
        '--bg-main': bgMain,
      }
    }
    >
      {/* NAVBAR */}
      <nav
        className="sticky top-0 z-50 shadow-lg backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 transition-all duration-300"
        style={{ backgroundColor: theme === 'dark' ? `${bgMain}E6` : `${strong}10` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* LOGO */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => router.push(`/${slug}/minha-conta`)}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <img
                  src={organization?.logo_organization || landingData?.organizations?.logo_organization || "/mTopbar.jpg"}
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-lg relative z-10"
                  alt="Logo"
                />
              </div>
              <div className="flex flex-col">
                <span 
                className="font-bold text-xl bg-clip-text text-transparent"
                style={{color: palette?.strong_color}}
                >
                  {organization?.name || "Marcafy"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Minha Conta</span>
              </div>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => router.push(`/${slug}/minha-conta`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
              <button
                onClick={() => router.push(`/${slug}/agendar`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Calendar className="w-4 h-4" />
                Agendar
              </button>
              <button
                onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Clock className="w-4 h-4" />
                Agendamentos
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ml-2"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative group ml-2">
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg  text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  style={{backgroundColor: palette?.strong_color}}
                >
                  <User className="w-4 h-4" />
                  {user?.username?.split(' ')[0] || "Perfil"}
                </button>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all ml-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* MOBILE DROPDOWN */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    router.push(`/${slug}/minha-conta`);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Início
                </button>
                <button
                  onClick={() => {
                    router.push(`/${slug}/agendar`);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  Agendar
                </button>
                <button
                  onClick={() => {
                    router.push(`/${slug}/minha-conta/agendamentos`);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Clock className="w-5 h-5" />
                  Agendamentos
                </button>

                <div className="flex gap-2 px-4 py-3">
                  <button
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {theme === "dark" ? "Claro" : "Escuro"}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                  >
                    <User className="w-5 h-5" />
                    Perfil
                  </button>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold mx-4"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da Conta
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HERO SECTION */}
        <div className="relative mb-8 overflow-hidden rounded-3xl shadow-2xl">
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${landingData?.hero_image_url || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1887"}')`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-pink-900/60 to-transparent"></div>
            <div style={{backgroundColor: palette?.strong_color}} className="absolute inset-0 via-transparent to-transparent"></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 p-8 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-medium text-white">Bem-vindo(a) de volta!</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Olá, <span className="text-white-500 ">{user?.username || "Cliente"}</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-200 mb-8">
                Seu espaço de beleza e bem-estar está pronto para te atender com excelência.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push(`/${slug}/agendar`)}
                  className="group bg-white/20 backdrop-blur-sm text-white font-bold px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Agendar Agora
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <button
                  onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}
                  className="group bg-white/20 backdrop-blur-sm text-white font-bold px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Ver Agendamentos
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 cursor-pointer"
               onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total de Agendamentos</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.appointments}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-green-500">↑ 15% vs último mês</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 cursor-pointer"
               onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Próximos Agendamentos</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.upcoming}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Confirme sua presença</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105 cursor-pointer"
               onClick={() => router.push(`/${slug}/minha-conta/agendamentos`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Serviços Concluídos</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Award className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Obrigado pela confiança!</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QUICK ACTIONS */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Ações Rápidas</h2>
              <p className="text-gray-600 dark:text-gray-400">Tudo o que você precisa em um só lugar</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{action.description}</p>
                      <div className="flex items-center text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Acessar
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CONTACT & INFO SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* ORGANIZATION INFO */}
              <div 
              className="rounded-2xl p-6 text-white mb-6 shadow-2xl"
              style={{backgroundColor:palette?.strong_color}}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-70 blur"></div>
                    <img
                      src={organization?.logo_organization}
                      className="w-16 h-16 rounded-full border-2 border-white relative z-10"
                      alt={organization?.name}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{organization?.name}</h3>
                    <p className="text-sm text-gray-300">{landingData?.meta_description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {contactInfo.map((info, index) => (
                    info.value && info.value !== "sem instagram" && (
                      <a
                        key={index}
                        href={info.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-white/20">
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">{info.label}</p>
                          <p className="font-medium truncate">{info.value}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )
                  ))}
                </div>

                {landingData?.whatsapp && (
                  <a
                    href={`https://wa.me/${landingData.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Conversar no WhatsApp
                  </a>
                )}
              </div>

              {/* FEATURES */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Por que escolher {organization?.name}?</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
                      <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Profissionais qualificados</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                      <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Atendimento premium</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                      <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Ambiente exclusivo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ABOUT SECTION */}
        {landingData?.about_text && (
          <div className="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                  {landingData?.about_title || "Sobre Nós"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {landingData.about_text}
                </p>
                <button
                  onClick={() => router.push(`/${slug}/sobre`)}
                  className="inline-flex items-center gap-2 font-semibold hover:gap-3 transition-all"
                  style={{color: palette?.strong_color}}
                >
                  Conheça mais sobre nós
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl opacity-20 blur-xl"></div>
                <img
                  src={landingData?.about_image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1674"}
                  className="relative rounded-2xl shadow-2xl w-full h-64 object-cover"
                  alt="Sobre nós"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PROFILE MODAL */}
      {showProfile && (
        <ProfileModal 
          user={user} 
          slug={slug} 
          setUser={setUser} 
          onClose={() => setShowProfile(false)} 
        />
      )}

      {/* FOOTER */}
      <div className="mt-12">
        <Footer slug={slug} />
      </div>

      {/* FLOATING WHATSAPP BUTTON */}
      {landingData?.whatsapp && (
        <a
          href={`https://wa.me/${landingData.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-40 group"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Fale conosco
          </div>
        </a>
      )}
    </div>
  );
}
