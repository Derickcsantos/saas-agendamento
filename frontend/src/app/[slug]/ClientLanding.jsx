"use client";
import { useEffect, useState } from "react";

export default function ClientLanding({ 
  slug, 
  injectedLanding = null, 
  injectedPalette = null, 
  isPreview = false 
}) {
  const [landing, setLanding] = useState(injectedLanding);
  const [organization, setOrganization] = useState(null);
  const [palette, setPalette] = useState(injectedPalette);
  const [services, setServices] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(!isPreview);

  const normalizeWhatsapp = (phone) => {
    if (!phone) return null;
    return phone.replace(/[^\d]/g, "");
  };

  const whatsappLink = (phone) => {
    const normalized = normalizeWhatsapp(phone);
    return normalized ? `https://wa.me/${normalized}` : "#";
  };

  const instagramLink = (url) => {
    if (!url || url === "sem instagram") return null;
    if (url.startsWith("http")) return url;
    return `https://instagram.com/${url.replace("@", "")}`;
  };

  useEffect(() => {
    if (isPreview) {
      setLanding(injectedLanding);
      setPalette(injectedPalette);
      return;
    }

    (async () => {
      try {
        const [landingRes, orgRes, paletteRes, servicesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`, { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`, { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/services/${slug}`, { credentials: "include" }),
        ]);

        if (!landingRes.ok || !orgRes.ok) {
          setNotFound(true);
          return;
        }

        const landingData = await landingRes.json();
        const orgData = await orgRes.json();
        const paletteData = paletteRes.ok ? await paletteRes.json() : {};
        const servicesData = servicesRes.ok ? await servicesRes.json() : [];

        setLanding(landingData);
        setOrganization(orgData);
        setPalette(paletteData);
        setServices(servicesData);
      } catch (err) {
        console.error("[ClientLanding] Erro:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, isPreview, injectedLanding, injectedPalette]);

  // CSS animations inline para garantir funcionamento
  const fadeUpStyle = {
    animation: "fadeUp 0.6s ease-out forwards",
    opacity: 0,
    transform: "translateY(20px)"
  };

  const fadeUpDelayStyle = {
    animation: "fadeUp 0.6s ease-out 0.2s forwards",
    opacity: 0,
    transform: "translateY(20px)"
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-800 rounded-full animate-spin" 
             style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (notFound || !landing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Página não encontrada</h1>
          <p className="text-gray-500">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const PRIMARY = palette?.strong_color || "#3B82F6";
  const org = organization || { name: landing?.slug || "Empresa", logo_organization: null };

  const heroTitle = landing?.hero_title || 
    `Agende seu horário com ${org.name} de forma rápida e descomplicada`;
  
  const heroSubtitle = landing?.hero_subtitle || 
    "Escolha o melhor horário para você, receba confirmação instantânea e lembretes automáticos. Simples, rápido e sem burocracia.";
  
  const heroButtonText = landing?.hero_button_text || "Agendar agora";
  
  const aboutTitle = landing?.about_title || "Por que escolher a gente?";
  
  const aboutText = landing?.about_text || 
    "Profissionais qualificados, atendimento personalizado e horários flexíveis. Trabalhamos para oferecer a melhor experiência desde o agendamento até o atendimento.";

  const contact = {
    whatsapp: landing?.whatsapp || org?.phone,
    instagram: landing?.instagram,
    email: landing?.email || org?.email,
    telefone: landing?.telefone || org?.phone,
    endereco: landing?.endereco || org?.address,
  };

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif' }} className="bg-white">
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeUp {
          animation: fadeUp 0.6s ease-out forwards;
        }
        .animate-fadeUpDelay {
          animation: fadeUp 0.6s ease-out 0.2s forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      {/* Header Premium */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm flex items-center justify-center overflow-hidden border border-gray-200">
              {org.logo_organization ? (
                <img
                  src={org.logo_organization}
                  alt={org.name}
                  className="h-full w-full object-cover p-1"
                />
              ) : (
                <span className="text-sm font-bold text-gray-800">
                  {(org.name || "MB")
                    .split(" ")
                    .map((i) => i[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 tracking-tight">{org.name}</span>
              <span className="text-xs text-gray-500">Atendimento premium</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#servicos" className="hover:text-gray-900 transition-colors duration-200">Serviços</a>
            <a href="#sobre" className="hover:text-gray-900 transition-colors duration-200">Sobre</a>
            <a href="#beneficios" className="hover:text-gray-900 transition-colors duration-200">Benefícios</a>
            <a href="#contato" className="hover:text-gray-900 transition-colors duration-200">Contato</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`/${slug}/login`}
              className="hidden sm:inline-flex items-center justify-center text-gray-700 text-sm font-medium px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Entrar
            </a>
            <a
              href={`/${slug}/login`}
              className="sm:hidden inline-flex items-center justify-center text-gray-700 p-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              aria-label="Login"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
            <a
              href={`/${slug}/agendar`}
              style={{ 
                backgroundColor: PRIMARY,
                boxShadow: `0 4px 14px ${PRIMARY}40`
              }}
              className="text-white text-sm font-semibold px-6 py-3 rounded-full hover:opacity-95 transition-all duration-200 hover:-translate-y-0.5"
            >
              Agendar agora
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section Premium */}
        <section className="relative bg-gradient-to-b from-gray-50 via-white to-white overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div style={fadeUpStyle}>
                  <span 
                    className="inline-flex px-4 py-2 rounded-full text-xs font-semibold tracking-wide mb-6"
                    style={{
                      backgroundColor: `${PRIMARY}15`,
                      color: PRIMARY,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    🎯 AGENDAMENTO INTELIGENTE
                  </span>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                    {heroTitle}
                  </h1>
                  
                  <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mt-6">
                    {heroSubtitle}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4" style={fadeUpDelayStyle}>
                  <a
                    href={`/${slug}/agendar`}
                    style={{ 
                      backgroundColor: PRIMARY,
                      boxShadow: `0 6px 20px ${PRIMARY}40`
                    }}
                    className="inline-flex items-center justify-center text-white font-semibold px-8 py-4 rounded-full hover:opacity-95 transition-all duration-300 hover:-translate-y-1 text-center group"
                  >
                    <span>{heroButtonText}</span>
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  
                  {contact.whatsapp && (
                    <a
                      href={whatsappLink(contact.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 text-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.507 14.307l-.009.075c-2.199-1.096-2.429-1.242-2.713-.816-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.293-.506.32-.578.878-1.634.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.576-.05-.997-.05-1.368.344-1.614 1.774-1.207 3.604.174 5.55 2.714 3.552 4.16 4.206 6.8 5.114.714.227 1.365.195 1.88.121.574-.091 1.754-.721 2-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                        <path d="M20.52 3.449C12.975-2.333 2.457-.638 3.894 10.237c.1.75-1.6 3.566-1.6 3.566-.796 2.603.53 6.645 4.919 8.299 4.492 1.693 8.617.78 10.69-.638 1.417-1.003 3.206-2.456 3.206-2.456l3.55 1.076c1.456.453 2.008-.595 2.008-.595.996-2.237-.472-3.696-.472-3.696.93-1.395 1.708-2.408 1.989-3.878C24.975 8.21 23.656 6.588 20.52 3.449z"/>
                      </svg>
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {landing?.hero_image_url && (
                <div className="relative" style={fadeUpDelayStyle}>
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                    <img
                      src={landing.hero_image_url}
                      alt={org.name}
                      className="w-full h-[400px] md:h-[500px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicos" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Serviços Premium
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Experiências cuidadosamente elaboradas para você
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.length > 0 ? (
                services.slice(0, 6).map((service, i) => (
                  <div
                    key={service.id || i}
                    className="group bg-white rounded-2xl border border-gray-200 p-8 hover:border-gray-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}CC)`,
                          boxShadow: `0 8px 20px ${PRIMARY}40`
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      {service.price && (
                        <span className="text-lg font-bold text-gray-900">
                          R$ {parseFloat(service.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {service.description || "Serviço de excelência com profissionais especializados."}
                    </p>
                    {service.duration && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.duration} minutos
                      </div>
                    )}
                  </div>
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-200 p-8"
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-6 shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}CC)`,
                        boxShadow: `0 8px 20px ${PRIMARY}40`
                      }}
                    >
                      {String(i).padStart(2, '0')}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Serviço {i}
                    </h3>
                    <p className="text-gray-600">
                      Descrição do serviço premium oferecido com qualidade excepcional.
                    </p>
                  </div>
                ))
              )}
            </div>

            {services.length > 6 && (
              <div className="text-center mt-12">
                <a
                  href={`/${slug}/agendar`}
                  className="inline-flex items-center text-gray-700 font-semibold hover:text-gray-900 transition-colors group"
                >
                  Ver todos os serviços
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {landing?.about_image_url && (
                <div className="order-2 lg:order-1">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                    <img
                      src={landing.about_image_url}
                      alt="Sobre nós"
                      className="w-full h-[400px] object-cover transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </div>
                </div>
              )}

              <div className={`space-y-8 ${landing?.about_image_url ? 'order-1 lg:order-2' : ''}`}>
                <div>
                  <span className="text-sm font-semibold text-gray-500 tracking-widest uppercase">
                    SOBRE NÓS
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                    {aboutTitle}
                  </h2>
                </div>
                
                <p className="text-gray-600 text-lg leading-relaxed">
                  {aboutText}
                </p>

                <div className="grid sm:grid-cols-2 gap-6 pt-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Profissionais Certificados</h3>
                    <p className="text-sm text-gray-600">Equipe com formação e experiência comprovada</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5" style={{ color: PRIMARY }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Atendimento Puntual</h3>
                    <p className="text-sm text-gray-600">Respeitamos seu tempo com agendamentos precisos</p>
                  </div>
                </div>

                {contact.whatsapp && (
                  <a
                    href={whatsappLink(contact.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: PRIMARY }}
                    className="inline-flex items-center justify-center text-white font-semibold px-8 py-4 rounded-full hover:opacity-95 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.507 14.307l-.009.075c-2.199-1.096-2.429-1.242-2.713-.816-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.293-.506.32-.578.878-1.634.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.576-.05-.997-.05-1.368.344-1.614 1.774-1.207 3.604.174 5.55 2.714 3.552 4.16 4.206 6.8 5.114.714.227 1.365.195 1.88.121.574-.091 1.754-.721 2-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                    </svg>
                    Falar com a equipe
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="beneficios" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Por que escolher nosso método?
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Tecnologia e humanização trabalhando juntas para sua melhor experiência
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: "📱",
                  title: "Agendamento 24/7",
                  description: "Marque seu horário a qualquer momento, sem depender do horário comercial."
                },
                {
                  icon: "🔔",
                  title: "Lembretes Automáticos",
                  description: "Receba notificações por WhatsApp e e-mail para não esquecer seu compromisso."
                },
                {
                  icon: "📊",
                  title: "Histórico Completo",
                  description: "Acesse todos seus agendamentos e histórico de serviços em um só lugar."
                },
                {
                  icon: "💳",
                  title: "Sem Taxas Escondidas",
                  description: "Transparência total nos valores. Você só paga pelo serviço realizado."
                },
                {
                  icon: "⭐",
                  title: "Avaliações Verificadas",
                  description: "Feedback real de clientes para ajudar na sua escolha."
                },
                {
                  icon: "🔄",
                  title: "Reagendamento Fácil",
                  description: "Precisa mudar? Reagende com poucos cliques, sem burocracia."
                }
              ].map((benefit, i) => (
                <div
                  key={i}
                  className="group bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300"
                >
                  <div className="text-3xl mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-white" style={{backgroundColor: palette?.strong_color}}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para viver uma experiência premium?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Agende seu horário agora e descubra por que nossos clientes nos recomendam.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`/${slug}/agendar`}
                className="inline-flex items-center justify-center bg-white text-gray-900 font-semibold px-8 py-4 rounded-full hover:bg-gray-100 transition-all duration-300 hover:-translate-y-1 shadow-lg"
              >
                Ver horários disponíveis
              </a>
              {contact.whatsapp && (
                <a
                  href={whatsappLink(contact.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border-2 border-white text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
                >
                  Falar com atendente
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contato" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Entre em Contato</h2>
                <p className="text-gray-600 mb-8">
                  Estamos aqui para ajudar. Escolha a forma de contato mais conveniente para você.
                </p>
                
                <div className="space-y-6">
                  {contact.whatsapp && (
                    <a
                      href={whatsappLink(contact.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.507 14.307l-.009.075c-2.199-1.096-2.429-1.242-2.713-.816-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.293-.506.32-.578.878-1.634.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.576-.05-.997-.05-1.368.344-1.614 1.774-1.207 3.604.174 5.55 2.714 3.552 4.16 4.206 6.8 5.114.714.227 1.365.195 1.88.121.574-.091 1.754-.721 2-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">WhatsApp</h3>
                        <p className="text-gray-600">{contact.whatsapp}</p>
                      </div>
                      <svg className="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  )}

                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">E-mail</h3>
                        <p className="text-gray-600 break-all">{contact.email}</p>
                      </div>
                    </a>
                  )}

                  {contact.endereco && (
                    <div className="flex items-start p-4 rounded-xl border border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mr-4 mt-1">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Endereço</h3>
                        <p className="text-gray-600">{contact.endereco}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {contact.instagram && contact.instagram !== "sem instagram" && instagramLink(contact.instagram) && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 border border-pink-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Siga-nos no Instagram</h3>
                  <p className="text-gray-600 mb-6">
                    Acompanhe novidades, promoções exclusivas e o dia a dia do nosso trabalho.
                  </p>
                  <a
                    href={instagramLink(contact.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold px-8 py-4 rounded-full hover:opacity-95 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Seguir no Instagram
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              {org.logo_organization && (
                <img src={org.logo_organization} alt={org.name} className="h-8 w-8 object-contain" />
              )}
              <span className="font-semibold text-gray-900">{org.name}</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 justify-center">
              <a href="#servicos" className="hover:text-gray-900 transition">Serviços</a>
              <a href="#sobre" className="hover:text-gray-900 transition">Sobre</a>
              <a href="#beneficios" className="hover:text-gray-900 transition">Benefícios</a>
              <a href="#contato" className="hover:text-gray-900 transition">Contato</a>
              <a href={`/${slug}/agendar`} className="hover:text-gray-900 transition">Agendar</a>
              <a href={`/${slug}/rota`} className="hover:text-gray-900 transition">Endereço</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {org.name}. Todos os direitos reservados.
              <span className="block md:inline mt-2 md:mt-0 md:ml-2">
                Desenvolvido com tecnologia moderna para sua melhor experiência.
              </span>
            </p>
            {/* Texto Marcafy no bottom */}
            <div className="w-full flex justify-center mt-2">
              <a
                href="/"
                className="text-[6px] text-gray-500 hover:text-gray-900 transition"
                style={{ opacity: 0.6 }}
              >
                Criado por Marcafy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {contact.whatsapp && (
        <a
          href={whatsappLink(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-xl bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 hover:-translate-y-1 hover:scale-110 animate-fadeIn"
          aria-label="Falar no WhatsApp"
          style={{ animationDelay: '1s' }}
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.507 14.307l-.009.075c-2.199-1.096-2.429-1.242-2.713-.816-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.293-.506.32-.578.878-1.634.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.576-.05-.997-.05-1.368.344-1.614 1.774-1.207 3.604.174 5.55 2.714 3.552 4.16 4.206 6.8 5.114.714.227 1.365.195 1.88.121.574-.091 1.754-.721 2-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
