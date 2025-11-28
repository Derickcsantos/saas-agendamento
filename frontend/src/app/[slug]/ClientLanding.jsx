"use client";

import { useEffect, useState } from "react";

export default function ClientLanding({ slug }) {
  const [landing, setLanding] = useState(null);
  const [palette, setPalette] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // =========================
  // Helpers
  // =========================
  const normalizeWhatsapp = (phone) => {
    if (!phone) return "";
    const onlyNumbers = phone.replace(/\D/g, "");
    if (onlyNumbers.startsWith("55")) return onlyNumbers;
    return `55${onlyNumbers}`;
  };

  const whatsappLink = (phone) => {
    const norm = normalizeWhatsapp(phone);
    if (!norm) return "#";
    return `https://wa.me/${norm}`;
  };

  const instagramLink = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `https://instagram.com/${url.replace("@", "")}`;
  };

  // =========================
  // Fetch
  // =========================
  useEffect(() => {
    async function fetchData() {
      if (!slug) return;

      setLoading(true);
      setNotFound(false);

      try {
        const [landingRes, colorRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
            {
              credentials: "include",
            }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
            { credentials: "include" }
          ),
        ]);

        if (!landingRes.ok) {
          throw new Error("Landing not found");
        }

        const landingData = await landingRes.json();
        const paletteData = colorRes.ok ? await colorRes.json() : null;

        setLanding(landingData);
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar dados da landing:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // =========================
  // Estados de carregamento / erro
  // =========================
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Preparando sua página profissional...
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !landing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 text-center">
        <h1 className="text-4xl font-bold mb-3">
          Essa página ainda não está pronta 😕
        </h1>
        <p className="text-slate-400 max-w-xl mb-6">
          Parece que o profissional ainda não configurou a página. Assim que
          isso acontecer, você poderá agendar online de forma rápida e simples.
        </p>

        <a
          href="/"
          className="px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
        >
          Voltar para o início
        </a>
      </main>
    );
  }

  const org = landing.org || landing.organizations || null;

  // =========================
  // Cores padrão
  // =========================
  const STRONG = palette?.strong_color || "#5E3BEE";
  const BG_MAIN = palette?.background_color_main || "#f5f5f7";
  const TEXT = palette?.text_color || "#111827";
  const SOFT = palette?.soft_color || "#E5E7EB";

  // =========================
  // Background dinâmico
  // =========================
  const dynamicBackground = landing.background_image_url
    ? {
        backgroundImage: `url(${landing.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `radial-gradient(circle at top left, ${STRONG}11, transparent 55%), radial-gradient(circle at bottom right, ${STRONG}22, transparent 55%), ${BG_MAIN}`,
      };

  const blurValue = Number(landing.background_blur || 0);
  const opacityValue = Number(landing.background_opacity || 1);

  // =========================
  // Defaults de conteúdo (copy)
  // =========================
  const heroTitleDefault =
    landing.hero_title ||
    "Agende seu horário em poucos cliques, sem filas e sem espera.";

  const heroSubtitleDefault =
    landing.hero_subtitle ||
    "Facilite sua rotina e ofereça uma experiência moderna para seus clientes — agenda online, confirmação automática e tudo organizado em um só lugar.";

  const heroButtonText = landing.hero_button_text || "Agendar agora";

  const aboutTitle = landing.about_title || "Profissionais que cuidam de você";
  const aboutText =
    landing.about_text ||
    "Aqui você encontra atendimento humanizado, pontualidade e cuidado em cada detalhe. Seja para um tratamento de saúde, um cuidado com a beleza ou uma sessão de mentoria, nossa missão é oferecer uma experiência leve, acolhedora e profissional.";

  const servicesTitle =
    landing.services_title || "Como podemos transformar o seu dia";

  const contactTitle =
    landing.contact_title || "Pronto para agendar seu próximo horário?";

  const galleryTitle =
    landing.gallery_title || "Veja resultados reais do nosso trabalho";

  const gallerySubtitle =
    landing.gallery_subtitle ||
    "Em breve você poderá conferir aqui fotos reais de atendimentos, ambientes e transformações incríveis.";

  const testimonialsTitle =
    landing.testimonials_title || "O que nossos clientes dizem";

  const testimonialsSubtitle =
    landing.testimonials_subtitle ||
    "Depoimentos de pessoas que já confiaram em nosso trabalho e hoje fazem parte da nossa história.";

  const teamTitle =
    landing.team_title || "Uma equipe preparada para te atender";
  const teamSubtitle =
    landing.team_subtitle ||
    "Profissionais atualizados, apaixonados pelo que fazem e focados em oferecer o melhor atendimento possível.";

  // =========================
  // UI
  // =========================
  return (
    <main
      className="font-sans min-h-screen text-slate-900"
      style={{ ...dynamicBackground, color: TEXT, opacity: opacityValue }}
    >
      {/* GRADIENT OVERLAY + BLUR GLOBAL */}
      <div
        className="min-h-screen"
        style={{
          backdropFilter: `blur(${blurValue}px)`,
        }}
      >
        {/* =========================
            NAVBAR / HEADER FIXO
        ========================== */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            {/* Logo + nome */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/70 shadow-lg shadow-black/40 overflow-hidden border border-white/10">
                {org?.logo_organization ? (
                  <img
                    src={org.logo_organization}
                    alt={org.name || "Logo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {(org?.name || "Seu negócio")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {org?.name || "Seu espaço, sua marca"}
                </span>
                <span className="text-xs text-slate-400">
                  Agendamento simples, profissionalismo em cada detalhe.
                </span>
              </div>
            </div>

            {/* Links principais */}
            <div className="hidden gap-6 text-sm font-medium text-slate-200 md:flex">
              <a href={`/${slug}#sobre`} className="hover:text-white">
                Sobre
              </a>
              <a href={`/${slug}#como-funciona`} className="hover:text-white">
                Como funciona
              </a>
              <a href={`/${slug}#beneficios`} className="hover:text-white">
                Benefícios
              </a>
              <a href={`/${slug}#contato`} className="hover:text-white">
                Contato
              </a>
            </div>

            {/* CTA agendar */}
            <div className="flex items-center gap-3">
              <a
                href={`/${slug}/login`}
                className="hidden text-xs font-medium text-slate-300 hover:text-white md:inline"
              >
                Área do cliente
              </a>
              <a
                href={`/${slug}/agendar`}
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:shadow-xl transition"
              >
                Agendar agora
              </a>
            </div>
          </nav>
        </header>

        {/* =========================
            HERO SECTION
        ========================== */}
        <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          {/* background hero image */}
          {landing.hero_image_url && (
            <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light">
              <img
                src={landing.hero_image_url}
                alt="Hero"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* decorative blobs */}
          <div className="pointer-events-none absolute -left-10 top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_top,_#ffffff20,_transparent_60%)] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_bottom,_#6366f180,_transparent_60%)] blur-3xl" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:flex-row md:items-center md:py-24">
            {/* Texto */}
            <div className="md:w-1/2 space-y-6 animate-[fadeInUp_0.6s_ease-out]">
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-slate-300 shadow-lg shadow-black/40">
                Agenda aberta • Vagas limitadas
              </p>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
                {heroTitleDefault}
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-xl">
                {heroSubtitleDefault}
              </p>

              {/* bullet highlights */}
              <div className="grid gap-3 text-xs sm:text-sm text-slate-200 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] text-emerald-300">
                    ✓
                  </span>
                  <p>
                    Agendamento 24/7 direto do celular, sem precisar falar com
                    ninguém.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] text-sky-300">
                    ✓
                  </span>
                  <p>Confirmação automática e lembretes por WhatsApp.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[11px] text-violet-300">
                    ✓
                  </span>
                  <p>Ideal para clínicas, consultórios, salões e mentores.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px] text-amber-300">
                    ✓
                  </span>
                  <p>
                    Experiência profissional desde o primeiro contato com o
                    cliente.
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <a
                  href={landing.hero_button_url || `/${slug}/agendar`}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-xl shadow-black/40 hover:-translate-y-0.5 hover:shadow-2xl transition"
                >
                  {heroButtonText}
                </a>

                <a
                  href={whatsappLink(landing.whatsapp)}
                  target="_blank"
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-white/40 px-6 py-3 text-xs font-medium text-slate-100 hover:bg-white/10 transition"
                >
                  Falar no WhatsApp
                </a>
              </div>

              {/* info */}
              <p className="text-[11px] text-slate-400">
                * Você não paga nada para agendar. O pagamento do serviço é
                feito diretamente com o profissional, no dia do atendimento.
              </p>
            </div>

            {/* Card lateral */}
            <div className="md:w-1/2 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-white/5 bg-slate-900/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">
                      Próximos horários disponíveis
                    </p>
                    <p className="text-sm font-semibold text-slate-100">
                      Agende em menos de 1 minuto
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-300">
                    Atendendo normalmente
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-50">
                        Atendimento presencial
                      </p>
                      <p className="text-slate-400">
                        Endereço:{" "}
                        {landing.endereco || org?.address || "Será informado na confirmação"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                      {org?.phone || landing.telefone || "Contato direto"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-800/40 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-50">
                        Agendamento online
                      </p>
                      <p className="text-slate-400">
                        Horários em tempo real, sem precisar chamar no WhatsApp.
                      </p>
                    </div>
                    <a
                      href={`/${slug}/agendar`}
                      className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition"
                    >
                      Ver horários
                    </a>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-800/40 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-50">
                        Área do cliente
                      </p>
                      <p className="text-slate-400">
                        Consulte histórico, reagende e gerencie suas visitas.
                      </p>
                    </div>
                    <a
                      href={`/${slug}/login`}
                      className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700/80 transition"
                    >
                      Acessar
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-3 text-[11px] text-slate-400">
                  <span>
                    Página criada com tecnologia{" "}
                    <strong className="font-semibold text-slate-100">
                      Marcafy
                    </strong>
                  </span>
                  <a
                    href={`/${slug}/cadastro`}
                    className="text-[11px] font-semibold text-violet-300 hover:text-violet-200"
                  >
                    Sou profissional e quero uma página dessas
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ABOUT SECTION
        ========================== */}
        <section
          id="sobre"
          className="bg-slate-950/95 border-b border-white/10"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
            {/* texto */}
            <div className="space-y-4 animate-[fadeIn_0.6s_ease-out]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                Sobre o atendimento
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {aboutTitle}
              </h2>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                {aboutText}
              </p>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40">
                  <p className="text-xs font-semibold text-violet-200 mb-1">
                    Para quem é ideal?
                  </p>
                  <p className="text-sm text-slate-200">
                    Perfeito para quem valoriza pontualidade, atendimento
                    organizado e um ambiente acolhedor — seja em clínicas,
                    consultórios, salões de beleza, studios de manicure,
                    barbearias ou sessões de mentoria.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40">
                  <p className="text-xs font-semibold text-violet-200 mb-1">
                    Como funciona o atendimento?
                  </p>
                  <p className="text-sm text-slate-200">
                    Você escolhe o horário, preenche alguns dados básicos e
                    recebe a confirmação. Antes do atendimento, enviaremos
                    lembretes para que você não esqueça do seu compromisso.
                  </p>
                </div>
              </div>
            </div>

            {/* imagem */}
            <div className="relative h-[280px] md:h-[360px] animate-[fadeInUp_0.6s_ease-out]">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/40 via-indigo-500/30 to-sky-400/40 blur-3xl opacity-60" />
              <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/60">
                <img
                  src={
                    landing.about_image_url ||
                    landing.hero_image_url ||
                    "https://images.pexels.com/photos/8467412/pexels-photo-8467412.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  }
                  alt="Ambiente de atendimento"
                  className="h-full w-full object-cover brightness-95"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            COMO FUNCIONA / BENEFÍCIOS
        ========================== */}
        <section
          id="como-funciona"
          className="border-b border-white/10 bg-slate-950"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 space-y-10">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                Passo a passo simples
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Do primeiro clique até o pós-atendimento.
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                Todo o fluxo foi pensado para profissionais que querem
                organização e para clientes que desejam praticidade — sem
                burocracia, sem fricção.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Escolha o serviço ou profissional",
                  text: "Você será direcionado para a página de agendamento, onde poderá escolher o tipo de atendimento ou o profissional desejado.",
                },
                {
                  step: "02",
                  title: "Selecione o melhor horário",
                  text: "Veja os horários livres em tempo real, sem troca de mensagens. Basta escolher o que se encaixa melhor na sua agenda.",
                },
                {
                  step: "03",
                  title: "Confirme e seja lembrado",
                  text: "Preencha seus dados, confirme o agendamento e receba lembretes automáticos antes do horário marcado.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl shadow-black/40"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/15 via-transparent to-sky-500/10 opacity-0 group-hover:opacity-100 transition" />
                  <div className="relative flex flex-col gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-800 text-xs font-bold text-slate-200 shadow-md shadow-black/30">
                      {item.step}
                    </span>
                    <h3 className="text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-300">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================
            BENEFÍCIOS / CARDS
        ========================== */}
        <section
          id="beneficios"
          className="border-b border-white/10 bg-slate-950/98"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 space-y-10">
            <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                  Por que agendar online?
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Menos mensagens, mais organização e clientes mais felizes.
                </h2>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                  Com a agenda online, você não depende de disponibilidade no
                  WhatsApp, evita desencontros de comunicação e ainda passa uma
                  imagem muito mais profissional para quem está chegando agora.
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>• Clientes escolhem o horário no melhor momento para eles;</li>
                  <li>
                    • Você reduz faltas com lembretes automáticos e confirmações;
                  </li>
                  <li>
                    • Tudo fica registrado em um só lugar, com histórico e dados
                    organizados;
                  </li>
                  <li>
                    • Ideal para consultórios, clínicas, salões, studios e
                    mentores.
                  </li>
                </ul>

                <div className="pt-5 flex flex-wrap gap-3">
                  <a
                    href={`/${slug}/agendar`}
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-xl shadow-black/40 hover:-translate-y-0.5 hover:shadow-2xl transition"
                  >
                    Ver horários disponíveis
                  </a>
                  <a
                    href={whatsappLink(landing.whatsapp)}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-xs font-medium text-slate-200 hover:bg-slate-800/60 transition"
                  >
                    Tirar dúvidas no WhatsApp
                  </a>
                </div>
              </div>

              {/* mini cards */}
              <div className="grid gap-4">
                {[
                  {
                    title: "Perfeito para novos clientes",
                    text: "Quem te encontra pelo Instagram, Google ou indicação já consegue reservar o horário na hora, sem precisar esperar você responder.",
                  },
                  {
                    title: "Experiência premium desde o primeiro contato",
                    text: "Uma landing page bonita, leve e profissional aumenta a confiança e a conversão de novos agendamentos.",
                  },
                  {
                    title: "Funciona para qualquer tipo de serviço",
                    text: "Saúde, beleza, bem-estar, estética, terapia, consultorias e mentorias — se você trabalha com horário agendado, essa página é para você.",
                  },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-white/5 bg-slate-900/80 p-4 shadow-xl shadow-black/40"
                  >
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {card.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            GALERIA
        ========================== */}
        {landing.show_gallery && (
          <section
            id="galeria"
            className="border-b border-white/10 bg-slate-950"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                {galleryTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Em breve: imagens reais dos resultados.
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                {gallerySubtitle}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                * Assim que o profissional começar a publicar fotos dos
                atendimentos, elas aparecerão aqui automaticamente.
              </p>

              <a
                href={`/${slug}/galeria`}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition"
              >
                Ver galeria completa
              </a>
            </div>
          </section>
        )}

        {/* =========================
            TESTIMONIALS
        ========================== */}
        {landing.show_testimonials && (
          <section className="border-b border-white/10 bg-slate-950/98">
            <div className="mx-auto max-w-6xl px-4 py-16 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                {testimonialsTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Clientes que já tiveram uma ótima experiência.
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                {testimonialsSubtitle}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                * Depoimentos reais serão exibidos aqui assim que forem
                cadastrados pelo profissional.
              </p>
            </div>
          </section>
        )}

        {/* =========================
            TEAM
        ========================== */}
        {landing.show_team && (
          <section className="border-b border-white/10 bg-slate-950">
            <div className="mx-auto max-w-6xl px-4 py-16 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                {teamTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {teamSubtitle}
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                Os profissionais serão cadastrados e aparecerão aqui com suas
                fotos, cargos e especialidades.
              </p>
            </div>
          </section>
        )}

        {/* =========================
            CONTATO / CTA FINAL
        ========================== */}
        <section
          id="contato"
          className="border-b border-white/10 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 space-y-8">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                {contactTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Escolha como prefere falar com a gente.
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
                Você pode agendar direto pelo site, tirar dúvidas no WhatsApp ou
                nos chamar pelo Instagram. O importante é dar o primeiro passo —
                o resto a gente cuida.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <a
                href={`/${slug}/agendar`}
                className="group rounded-3xl border border-violet-500/60 bg-slate-900/80 p-6 text-center shadow-xl shadow-black/40 hover:-translate-y-1 hover:shadow-2xl transition"
              >
                <p className="text-xs font-semibold text-violet-300 mb-1">
                  Agendar online
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Horários em tempo real
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  Veja todas as opções disponíveis e confirme sua visita em
                  segundos.
                </p>
                <span className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold text-white group-hover:bg-violet-400 transition">
                  Ver agenda
                </span>
              </a>

              <a
                href={whatsappLink(landing.whatsapp)}
                target="_blank"
                className="group rounded-3xl border border-emerald-500/50 bg-slate-900/80 p-6 text-center shadow-xl shadow-black/40 hover:-translate-y-1 hover:shadow-2xl transition"
              >
                <p className="text-xs font-semibold text-emerald-300 mb-1">
                  WhatsApp
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Atendimento direto
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  Fale com a equipe para tirar dúvidas rápidas ou combinar
                  detalhes do atendimento.
                </p>
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 group-hover:bg-emerald-400 transition">
                  Abrir WhatsApp
                </span>
              </a>

              <a
                href={instagramLink(landing.instagram)}
                target="_blank"
                className="group rounded-3xl border border-pink-500/50 bg-slate-900/80 p-6 text-center shadow-xl shadow-black/40 hover:-translate-y-1 hover:shadow-2xl transition"
              >
                <p className="text-xs font-semibold text-pink-300 mb-1">
                  Instagram
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Acompanhe o dia a dia
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  Veja bastidores, resultados, conteúdos e dicas exclusivas.
                </p>
                <span className="inline-flex items-center justify-center rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white group-hover:bg-pink-400 transition">
                  Abrir Instagram
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* =========================
            FOOTER
        ========================== */}
        <footer className="bg-slate-950 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-start">
              {/* marca */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-white/10 shadow-md shadow-black/40 overflow-hidden">
                    {org?.logo_organization ? (
                      <img
                        src={org.logo_organization}
                        alt={org.name || "Logo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        {(org?.name || "MB")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {org?.name || "Seu espaço profissional"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {landing.endereco || org?.address || ""}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Página profissional criada para facilitar o agendamento de
                  serviços e oferecer uma experiência moderna para seus
                  clientes.
                </p>
              </div>

              {/* navegação */}
              <div>
                <p className="pb-1 text-sm font-medium text-white">
                  Acesso rápido
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    <a href={`/${slug}/`} className="hover:text-white">
                      Home
                    </a>
                  </li>
                  <li>
                    <a href={`/${slug}/agendar`} className="hover:text-white">
                      Agendar
                    </a>
                  </li>
                  <li>
                    <a href={`/${slug}/galeria`} className="hover:text-white">
                      Galeria
                    </a>
                  </li>
                  <li>
                    <a href={`/${slug}/login`} className="hover:text-white">
                      Login
                    </a>
                  </li>
                  <li>
                    <a href={`/${slug}/cadastro`} className="hover:text-white">
                      Cadastro
                    </a>
                  </li>
                </ul>
              </div>

              {/* contato */}
              <div>
                <p className="pb-1 text-sm font-medium text-white">Contato</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {landing.whatsapp && (
                    <li>
                      <a
                        href={whatsappLink(landing.whatsapp)}
                        target="_blank"
                        className="hover:text-white"
                      >
                        WhatsApp: {landing.whatsapp}
                      </a>
                    </li>
                  )}
                  {landing.telefone && (
                    <li>
                      <a
                        href={`tel:${landing.telefone}`}
                        className="hover:text-white"
                      >
                        Telefone: {landing.telefone}
                      </a>
                    </li>
                  )}
                  {landing.email && (
                    <li>
                      <a
                        href={`mailto:${landing.email}`}
                        className="hover:text-white"
                      >
                        E-mail: {landing.email}
                      </a>
                    </li>
                  )}
                  {landing.instagram && (
                    <li>
                      <a
                        href={instagramLink(landing.instagram)}
                        target="_blank"
                        className="hover:text-white"
                      >
                        Instagram
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-4 text-[11px] text-slate-500 md:flex-row">
              <span>© {new Date().getFullYear()} Todos os direitos reservados.</span>
              <span>
                Página criada com{" "}
                <a
                  href="https://www.marcafy.com.br"
                  className="font-semibold text-slate-300 hover:text-white"
                >
                  Marcafy
                </a>
                .
              </span>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp */}
        {landing.whatsapp && (
          <a
            href={whatsappLink(landing.whatsapp)}
            target="_blank"
            className="fixed bottom-4 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-2xl shadow-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(16,185,129,0.75)] transition"
            aria-label="Falar no WhatsApp"
          >
            <span className="text-white text-xl">💬</span>
          </a>
        )}
      </div>
    </main>
  );
}