// app/[slug]/marketing/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  BarChart3,
  Users,
  Image as ImageIcon,
  Zap,
  Calendar,
  MessageSquare,
  Copy,
  Download,
  Globe,
  TrendingUp,
  Palette,
  DoorOpen,
  Sparkles,
  Link as LinkIcon,
  Eye,
  ThumbsUp,
  Share2,
  ChevronRight,
  Bell,
  Search,
  BarChart,
  Target,
  Hash,
  Type,
  MessageCircle,
  Wand2,
  Sparkle,
  Paperclip,
  Send,
  Trash2,
  User,
  Home,
  Settings,
  HelpCircle,
  Shield,
  Briefcase,
} from "lucide-react";

import StatCard from "@/app/components/StatCard";
import ImageUploader from "@/app/components/ImageUploader";

export default function MarketingDashboard() {
  const router = useRouter();
  const params = useParams();
  // Estados
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [palette, setPalette] = useState(null);
  const [stats, setStats] = useState({
    totalClients: 0,
    newClientsThisMonth: 0,
    totalImages: 0,
    galleryImages: 0,
    aiRequestsToday: 0,
    aiRequestsLimit: 25,
    socialMediaPosts: 0,
    engagementRate: 0,
    conversionRate: 0,
  });

  const [images, setImages] = useState([]);
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: "Olá! Sou seu assistente de marketing. Como posso ajudar você a criar legendas incríveis para o Instagram?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [geminiResult, setGeminiResult] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [instagramProfile, setInstagramProfile] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const userMenuRef = useRef(null);

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push(`/login`);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Verificar autenticação
        const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/marcafy/check`, {
          credentials: "include",
        });

        const instagramRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marcafy-instagram`, {
          credentials: "include",
        });

        const authData = await authRes.json();
        const instagramData = await instagramRes.json();

        if (!authData.authenticated) {
          router.push(`/login`);
          return;
        }

        if (!instagramData.success) {
          console.warn('Não foi possivel retornar os dados do instagram');
          return;
        }

        setUser(authData.user);

        const engagementRate =
          instagramData.followers > 0
            ? Number(((instagramData.posts / instagramData.followers) * 100).toFixed(1))
            : 0;

        setStats((prev) => ({
          ...prev,
          socialMediaPosts: instagramData.posts ?? 0,
          totalImages: instagramData.posts ?? 0,
          engagementRate,
        }));

        setInstagramProfile({
          username: instagramData.username,
          profilePic: instagramData.profile_pic_url,
          followers: instagramData.followers,
          following: instagramData.following,
          posts: instagramData.posts,
        });

        // Carregar organização e paleta (Marcafy fixo)
        const [orgRes, paletteRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/marcafy`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/marcafy`),
        ]);

        const orgData = await orgRes.json();
        const paletteData = await paletteRes.json();

        setOrganization(orgData);
        setPalette(paletteData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dashboard");
      } finally {
        setAuthChecked(true);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (files) => {
    const incoming = Array.isArray(files) ? files : [];
    const merged = [...images, ...incoming].slice(0, 3);
    setImages(merged);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && images.length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage("");

    // Se tiver imagens, processar
    if (images.length > 0 || inputMessage.trim()) {
      await generateCaption();
    }
  };

  // Gerar legenda com Gemini
  const generateCaption = async () => {
    try {
      setGenerating(true);

      const formData = new FormData();
      
      // Adicionar imagens
      images.forEach((image, index) => {
        formData.append(`images`, image);
      });

      // Adicionar contexto
      if (context) {
        formData.append("context", context);
      }

      // Adicionar histórico de mensagens
      formData.append("messages", JSON.stringify(messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketing/instagram/marcafy`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setGeminiResult(data);
        
        // Adicionar resposta do assistente ao chat
        const assistantMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Aqui está sua legenda gerada:\n\n**Legenda:** ${data.data.caption}\n\n**CTA:** ${data.data.cta}\n\n**Hashtags:** ${data.data.hashtags.join(" ")}`,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        toast.success("Legenda gerada com sucesso!");
      } else {
        toast.error(data.message || "Erro ao gerar legenda");
      }
    } catch (error) {
      console.error("Erro ao gerar legenda:", error);
      toast.error("Erro ao conectar com a IA");
    } finally {
      setGenerating(false);
    }
  };

  // Copiar legenda para clipboard
  const copyCaption = () => {
    if (!geminiResult) return;
    
    const text = `${geminiResult.data.caption}\n\n${geminiResult.data.cta}\n\n${geminiResult.data.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada!");
  };

  // Limpar chat
  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Olá! Sou seu assistente de marketing. Como posso ajudar você a criar legendas incríveis para o Instagram?",
        timestamp: new Date(),
      },
    ]);
    setContext("");
    setImages([]);
    setGeminiResult(null);
  };

  // Calcular uso da IA
  const aiUsagePercentage = (stats.aiRequestsToday / stats.aiRequestsLimit) * 100;
  const aiUsageColor = aiUsagePercentage > 80 ? "bg-red-500" : 
                      aiUsagePercentage > 60 ? "bg-yellow-500" : 
                      "bg-green-500";

  if (!authChecked) return <div className="p-10 absolute inset-0 flex items-center justify-center text-gray-600">Carregando...</div>;

  // Menu do usuário
  const userMenuItems = [
    { icon: <User className="w-4 h-4" />, label: "Ver Perfil", action: () => router.push("/profile") },
    { icon: <Briefcase className="w-4 h-4" />, label: "Painel Profissional", action: () => router.push("/dashboard") },
    { icon: <Shield className="w-4 h-4" />, label: "Painel Admin", action: () => router.push("/admin") },
    { icon: <Home className="w-4 h-4" />, label: "Home", action: () => router.push("/") },
    { icon: <HelpCircle className="w-4 h-4" />, label: "Suporte", action: () => window.open("mailto:support@marcafy.com", "_blank") },
    { icon: <Settings className="w-4 h-4" />, label: "Configurações", action: () => router.push("/settings") },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Sair", action: logout, danger: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navbar Superior */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Nome */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    Painel de Marketing
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {organization?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Direita: Search, Notifications, Profile */}
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 group"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Responsável do marketing</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold group-hover:ring-2 group-hover:ring-purple-300 transition-all">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{user?.username}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      {userMenuItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            item.action();
                            setUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            item.danger 
                              ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" 
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Marcafy v1.0 • {new Date().getFullYear()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Layout Principal */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="mb-6 md:mb-8 px-2">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Dashboard</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-purple-600 dark:text-purple-400 font-medium">Marketing</span>
          </nav>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2">
            Painel de Marketing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            Gerencie suas campanhas, crie conteúdo e analise resultados
          </p>
        </div>

        {/* Estatísticas Rápidas - Responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 px-2">
          <StatCard
            title="Total de seguidores"
            value={instagramProfile?.followers || 0}
            change={`Estamos seguindo ${instagramProfile?.following || 0} perfis`}
            icon={<Users className="w-5 h-5 md:w-6 md:h-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="Quantidade de posts"
            value={stats.totalImages}
            change={`${stats.galleryImages} disponíveis`}
            icon={<ImageIcon className="w-5 h-5 md:w-6 md:h-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="Uso da IA Hoje"
            value={`${stats.aiRequestsToday}/${stats.aiRequestsLimit}`}
            change={`${aiUsagePercentage.toFixed(0)}% utilizado`}
            icon={<Zap className="w-5 h-5 md:w-6 md:h-6" />}
            color="bg-purple-500"
            progress={aiUsagePercentage}
          />
          <StatCard
            title="Taxa de Engajamento"
            value={`${stats.engagementRate.toFixed(1)}%`}
            change={`+2.3% desde ontem`}
            icon={<TrendingUp className="w-5 h-5 md:w-6 md:h-6" />}
            color="bg-pink-500"
          />
        </div>

        {/* Dashboard Principal - Layout Responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 px-2">
          {/* Coluna Esquerda: Gerador de Legendas */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-500" />
                    Gerador de Legendas com IA
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1">
                    Crie legendas perfeitas para Instagram usando inteligência artificial
                  </p>
                </div>
                <button
                  onClick={clearChat}
                  className="px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition flex items-center gap-2 self-start"
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                  Limpar
                </button>
              </div>

              {/* Upload de Imagens */}
              <div className="mb-4 md:mb-6">
                <ImageUploader
                  images={images}
                  onUpload={handleImageUpload}
                  onRemove={removeImage}
                  maxFiles={3}
                />
              </div>

              {/* Contexto */}
              <div className="mb-4 md:mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Contexto do Post
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Descreva o contexto do post, público-alvo, tom da mensagem, etc..."
                  className="w-full h-32 px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none text-sm md:text-base"
                />
              </div>

              {/* Chat - Melhorado para Mobile */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Conversa com a IA
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {messages.length} mensagens
                  </span>
                </div>

                <div className="h-48 md:h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4 mb-3 md:mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-3 ${message.role === "user" ? "text-right" : ""}`}
                    >
                      <div
                        className={`inline-block max-w-[90%] sm:max-w-[80%] rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm md:text-base ${
                          message.role === "user"
                            ? "bg-purple-500 text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                  {generating && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-purple-500 border-t-transparent"></div>
                      A IA está pensando...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensagem - Responsivo */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex-shrink-0"
                    title="Adicionar imagem"
                  >
                    <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm md:text-base"
                  />
                  
                  <button
                    onClick={sendMessage}
                    disabled={generating || (!inputMessage.trim() && images.length === 0)}
                    className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg md:rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  >
                    <Send className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </div>
              </div>

              {/* Botão Gerar */}
              <button
                onClick={generateCaption}
                disabled={generating || (!context && messages.length <= 1 && images.length === 0)}
                className="w-full py-3 md:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg md:rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3 font-semibold text-sm md:text-base"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent"></div>
                    Gerando Legenda...
                  </>
                ) : (
                  <>
                    <Sparkle className="w-4 h-4 md:w-5 md:h-5" />
                    Gerar Legenda com IA
                  </>
                )}
              </button>
            </div>

            {/* Resultado da Legenda */}
            {geminiResult && (
              <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Legenda Gerada
                  </h4>
                  <div className="flex gap-2 self-start">
                    <button
                      onClick={copyCaption}
                      className="px-3 py-2 md:px-4 md:py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition flex items-center gap-2 text-sm"
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      Copiar
                    </button>
                    <button className="px-3 py-2 md:px-4 md:py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition flex items-center gap-2 text-sm">
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </button>
                  </div>
                </div>

                {/* Preview da Legenda */}
                <div className="space-y-4 md:space-y-6">
                  {/* Preview do Post */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{organization?.name}</p>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Publicado agora</p>
                      </div>
                    </div>

                    {/* Imagens Preview */}
                    {images.length > 0 && (
                      <div className={`grid gap-2 mb-3 md:mb-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {images.map((image, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 md:h-48 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legenda */}
                    <div className="space-y-2 md:space-y-3">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm md:text-base">
                        {geminiResult.data.caption}
                      </p>
                      <p className="font-medium text-purple-600 dark:text-purple-400 text-sm md:text-base">
                        {geminiResult.data.cta}
                      </p>
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        {geminiResult.data.hashtags.map((hashtag, index) => (
                          <span key={index} className="text-xs md:text-sm text-blue-500 dark:text-blue-400">
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Estatísticas do Post */}
                    <div className="flex items-center justify-between pt-3 md:pt-4 mt-3 md:mt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 md:gap-6">
                        <button className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-500 transition text-sm">
                          <ThumbsUp className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="hidden sm:inline">Curtir</span>
                        </button>
                        <button className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-500 transition text-sm">
                          <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="hidden sm:inline">Comentar</span>
                        </button>
                        <button className="flex items-center gap-1 md:gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-500 transition text-sm">
                          <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="hidden sm:inline">Compartilhar</span>
                        </button>
                      </div>
                      <Eye className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Detalhes da Geração */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Modelo IA</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{geminiResult.model}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Imagens usadas</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{geminiResult.input.imagesCount}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Hashtags geradas</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{geminiResult.data.hashtags.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Insights e Ferramentas */}
          <div className="space-y-6 md:space-y-8">
            {/* Uso da IA */}
            <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Limite de IA Diário
              </h4>
              
              <div className="space-y-3 md:space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Usado hoje</span>
                    <span>{stats.aiRequestsToday}/{stats.aiRequestsLimit}</span>
                  </div>
                  <div className="h-2 md:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${aiUsageColor} transition-all duration-500`}
                      style={{ width: `${Math.min(aiUsagePercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  Seu limite é renovado todos os dias às 00:00
                </p>
                
                <button className="w-full py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg md:rounded-xl hover:opacity-90 transition font-medium text-sm md:text-base">
                  <Globe className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
                  Ver plano premium
                </button>
              </div>
            </div>

            {/* Insights Rápidos */}
            <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Insights do Mês
              </h4>
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">Taxa de Conversão</p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Últimos 30 dias</p>
                    </div>
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-green-500">
                    {stats.conversionRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg md:rounded-xl">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                      <Hash className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">Posts no Mês</p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Instagram</p>
                    </div>
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-purple-500">
                    {stats.socialMediaPosts}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg md:rounded-xl">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-pink-100 dark:bg-pink-800 flex items-center justify-center">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">Novos Clientes</p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Este mês</p>
                    </div>
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-pink-500">
                    +{stats.newClientsThisMonth}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Ações Rápidas
              </h4>
              
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg md:rounded-xl hover:shadow-md transition text-center group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-500 mx-auto mb-2 md:mb-3 flex items-center justify-center group-hover:scale-110 transition">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Agendar Post</p>
                </button>
                
                <button onClick={() => window.location.href='http://wa.me/5511953404003'}  className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg md:rounded-xl hover:shadow-md transition text-center group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-500 mx-auto mb-2 md:mb-3 flex items-center justify-center group-hover:scale-110 transition">
                    <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Whatsapp</p>
                </button>
                
                <button onClick={logout} className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg md:rounded-xl hover:shadow-md transition text-center group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-red-500 mx-auto mb-2 md:mb-3 flex items-center justify-center group-hover:scale-110 transition">
                    <DoorOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Sair</p>
                </button>
                
                <button onClick={() => window.location.href='https://www.instagram.com/marcafy.oficial/'} className="p-3 md:p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-lg md:rounded-xl hover:shadow-md transition text-center group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-pink-500 mx-auto mb-2 md:mb-3 flex items-center justify-center group-hover:scale-110 transition">
                    <LinkIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Instagram</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}