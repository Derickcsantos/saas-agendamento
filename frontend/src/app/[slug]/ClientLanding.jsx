"use client";

import { useEffect, useState } from "react";

export default function ClientLanding({ slug }) {
  const [landing, setLanding] = useState(null);
  const [palette, setPalette] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  const normalizeWhatsapp = (phone) => {
    if (!phone) return "";
    const onlyNumbers = phone.replace(/\D/g, "");
    if (onlyNumbers.startsWith("55")) return onlyNumbers;
    return `55${onlyNumbers}`;
  };

  const whatsappLink = (phone) => {
    const n = normalizeWhatsapp(phone);
    return n ? `https://wa.me/${n}` : "#";
  };

  const instagramLink = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `https://instagram.com/${url.replace("@", "")}`;
  };

  // -------------------------------------------------
  // Fetch Data
  // -------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!slug) return;

      setLoading(true);
      setNotFound(false);

      try {
        const [landingRes, colorRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${slug}`,
            { credentials: "include" }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
            { credentials: "include" }
          )
        ]);

        if (!landingRes.ok) throw new Error("not found");

        const landingJson = await landingRes.json();
        const paletteJson = colorRes.ok ? await colorRes.json() : null;

        setLanding(landingJson);
        setPalette(paletteJson);
      } catch (e) {
        console.error(e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  // -------------------------------------------------
  // Loading Screen (Ultra Minimal)
  // -------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <span className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
          <p className="text-xs tracking-widest text-gray-500">
            Carregando sua experiência premium...
          </p>
        </div>
      </main>
    );
  }

  // -------------------------------------------------
  // Not Found
  // -------------------------------------------------
  if (notFound || !landing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-800 p-6 text-center">
        <h1 className="text-3xl font-semibold mb-3">
          Esta página ainda não está disponível
        </h1>
        <p className="text-gray-500 max-w-md mb-6 leading-relaxed">
          O profissional ainda não concluiu a configuração.  
          Assim que estiver tudo pronto, você poderá acessar uma
          página moderna, clara, intuitiva e totalmente otimizada 
          para agendamentos rápidos.
        </p>

        <a
          href="/"
          className="px-6 py-2 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          Voltar ao início
        </a>
      </main>
    );
  }

  // -------------------------------------------------
  // Palette + Defaults
  // -------------------------------------------------
  const STRONG = palette?.strong_color || "#5E3BEE"; // destaque
  const TEXT = "#111827";
  const TEXT_SOFT = "#4B5563";
  const BG = "#ffffff";

  const org = landing.org || landing.organizations || {};

  // Copies longas e persuasivas
  const heroTitle =
    landing.hero_title ||
    "Transforme sua rotina com agendamentos modernos, rápidos e pensados para quem valoriza tempo, bem-estar e praticidade.";

  const heroSubtitle =
    landing.hero_subtitle ||
    "Agendar nunca foi tão fácil. Em poucos cliques você encontra horários disponíveis, confirma sua visita e recebe lembretes automáticos. Ideal para consultórios, clínicas, salões, mentores, estúdios, terapeutas, coaches, nutricionistas, personal trainers e qualquer profissional que deseje oferecer uma experiência impecável.";

  const heroButtonText =
    landing.hero_button_text || "Agendar agora — é rápido, fácil e gratuito";

  // -------------------------------------------------
  // UI — Ultra Premium Light (Linear Style)
  // -------------------------------------------------
  return (
    <main className="font-sans bg-white text-gray-900 min-h-screen">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-50 shadow-sm flex items-center justify-center overflow-hidden border border-black/5">
              {org.logo_organization ? (
                <img
                  src={org.logo_organization}
                  alt={org.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-gray-800">
                  {(org?.name || "MB")
                    .split(" ")
                    .map((i) => i[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                {org?.name || "Seu espaço profissional"}
              </span>
              <span className="text-xs text-gray-500">
                Atendimento moderno e organizado
              </span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href={`/${slug}#sobre`} className="hover:text-gray-900 transition">
              Sobre
            </a>
            <a
              href={`/${slug}#como-funciona`}
              className="hover:text-gray-900 transition"
            >
              Como funciona
            </a>
            <a
              href={`/${slug}#beneficios`}
              className="hover:text-gray-900 transition"
            >
              Benefícios
            </a>
            <a
              href={`/${slug}#contato`}
              className="hover:text-gray-900 transition"
            >
              Contato
            </a>

            <a
              href={`/${slug}/agendar`}
              className="px-4 py-2 rounded-full bg-gray-900 text-white shadow hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs font-semibold"
            >
              Agendar
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative px-4 pt-16 pb-24 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* TEXT */}
        <div className="flex-1 space-y-6 animate-fadeUp">
          <span
            className="inline-flex px-4 py-1 rounded-full text-xs font-medium shadow-sm"
            style={{
              backgroundColor: `${STRONG}15`,
              color: STRONG,
            }}
          >
            Agenda sempre disponível • Atendimento profissional
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            {heroTitle}
          </h1>

          <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-xl">
            {heroSubtitle}
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <a
              href={`/${slug}/agendar`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              style={{
                backgroundColor: STRONG,
                boxShadow: `0 8px 20px ${STRONG}35`,
              }}
            >
              {heroButtonText}
            </a>

            <a
              href={whatsappLink(landing.whatsapp)}
              target="_blank"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-black/5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Falar no WhatsApp
            </a>
          </div>

          <p className="text-xs text-gray-500">
            * Agendar é gratuito. Pagamento feito somente no dia do atendimento.
          </p>
        </div>

        {/* SIDE CARD */}
        <div className="flex-1 flex justify-center animate-fadeUpDelay">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-black/5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Próximos horários</p>
                <p className="text-sm font-semibold text-gray-900">
                  Agende em menos de 1 minuto
                </p>
              </div>

              <span
                className="px-3 py-1 text-[10px] rounded-full font-medium text-white"
                style={{ backgroundColor: STRONG }}
              >
                Atendendo
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* presencial */}
              <div className="rounded-2xl bg-gray-50 p-4 shadow-sm border border-black/5 hover:shadow-md transition-all">
                <p className="font-semibold text-gray-900">Atendimento presencial</p>
                <p className="text-gray-600">
                  Endereço:{" "}
                  {landing.endereco ||
                    org?.address ||
                    "Será informado no momento da confirmação"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 shadow-sm border border-black/5 hover:shadow-md transition-all">
                <p className="font-semibold text-gray-900">Agendamento online</p>
                <p className="text-gray-600">
                  Horários sempre atualizados em tempo real.
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 shadow-sm border border-black/5 hover:shadow-md transition-all">
                <p className="font-semibold text-gray-900">Área do cliente</p>
                <p className="text-gray-600">
                  Consulte histórico, reagende e atualize seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ============================================
          ABOUT — Seção institucional premium
      ============================================= */}
      <section
        id="sobre"
        className="w-full bg-white border-t border-black/5 border-b border-black/5"
      >
        <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">

          {/* TEXT */}
          <div className="space-y-6 animate-fadeUp">
            <span className="text-xs font-semibold tracking-widest text-gray-400">
              SOBRE O PROFISSIONAL
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {landing.about_title ||
                "Profissionais comprometidos com cuidado, excelência e uma experiência inesquecível."}
            </h2>

            <p className="text-gray-600 leading-relaxed text-base md:text-lg">
              {landing.about_text ||
                "Aqui você encontra uma abordagem moderna e acolhedora. Seja para saúde, estética, performance, bem-estar ou desenvolvimento pessoal, o atendimento é pensado para proporcionar conforto, transparência, segurança e uma jornada impecável do início ao fim. Pontualidade, clareza e qualidade fazem parte da essência do nosso trabalho."}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="rounded-2xl bg-gray-50 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Atendimento personalizado
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tratamentos e serviços adaptados às suas necessidades, com atenção aos detalhes.
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Ambiente seguro e acolhedor
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Focado em garantir tranquilidade para você relaxar e aproveitar o momento.
                </p>
              </div>
            </div>
          </div>

          {/* IMAGE */}
          <div className="relative animate-fadeUpDelay">
            <div className="absolute inset-0 rounded-3xl bg-gray-100 blur-2xl opacity-70"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-[0_12px_50px_rgba(0,0,0,0.06)] border border-black/5">
              <img
                src={
                  landing.about_image_url ||
                  landing.hero_image_url ||
                  "https://images.pexels.com/photos/8467412/pexels-photo-8467412.jpeg?auto=compress&cs=tinysrgb&w=1200"
                }
                alt="Ambiente"
                className="w-full h-[320px] md:h-[380px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>


      {/* ============================================
          COMO FUNCIONA — Passo a passo minimalista
      ============================================= */}
      <section
        id="como-funciona"
        className="w-full bg-white py-20 border-b border-black/5"
      >
        <div className="max-w-6xl mx-auto px-4">

          {/* TITLE */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-4 animate-fadeUp">
            <span className="text-xs font-semibold tracking-widest text-gray-400">
              COMO FUNCIONA
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Simples, claro e totalmente intuitivo — do primeiro clique até o atendimento.
            </h2>

            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              O sistema foi pensado para eliminar atritos, facilitar a vida dos clientes e aumentar a organização do profissional. Tudo funciona de maneira fluida, clara e agradável.
            </p>
          </div>

          {/* STEPS */}
          <div className="grid md:grid-cols-3 gap-8">

            {/* Step 1 */}
            <div className="group rounded-3xl bg-white p-7 border border-black/5 shadow-[0_6px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all animate-fadeUp delay-75">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100 text-gray-800 font-semibold shadow-sm mb-4">
                1
              </span>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Escolha o serviço ou profissional
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                Você visualiza rapidamente todas as opções de atendimento e escolhe o serviço ideal ou o profissional preferido.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group rounded-3xl bg-white p-7 border border-black/5 shadow-[0_6px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all animate-fadeUp delay-100">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100 text-gray-800 font-semibold shadow-sm mb-4">
                2
              </span>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Veja os horários disponíveis
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                Os horários aparecem automaticamente em tempo real, sem necessidade de troca de mensagens.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group rounded-3xl bg-white p-7 border border-black/5 shadow-[0_6px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all animate-fadeUp delay-150">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100 text-gray-800 font-semibold shadow-sm mb-4">
                3
              </span>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirme e receba lembretes
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                Após confirmar seus dados, você recebe alertas automáticos para não esquecer seu compromisso.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================
          BENEFÍCIOS — Cards premium e copy forte
      ============================================= */}
      <section
        id="beneficios"
        className="w-full bg-white py-20 border-b border-black/5"
      >
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">

          {/* TEXT */}
          <div className="space-y-6 animate-fadeUp">
            <span className="text-xs font-semibold tracking-widest text-gray-400">
              BENEFÍCIOS
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Menos mensagens, mais organização — e uma experiência impecável para cada cliente.
            </h2>

            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              A agenda online reduz falhas de comunicação, aumenta a confiança do cliente e melhora a rotina do profissional. Tudo fica registrado, organizado e acessível quando você mais precisa.
            </p>

            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Agendamentos 24h sem depender do WhatsApp</li>
              <li>• Lembretes automáticos reduzem faltas e atrasos</li>
              <li>• Histórico completo de cada cliente</li>
              <li>• Perfeito para clínicas, salões, consultórios, mentores e muito mais</li>
            </ul>

            {/* CTAs */}
            <div className="pt-6 flex flex-wrap gap-3">
              <a
                href={`/${slug}/agendar`}
                className="px-8 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                style={{ backgroundColor: STRONG }}
              >
                Ver horários disponíveis
              </a>

              <a
                href={whatsappLink(landing.whatsapp)}
                target="_blank"
                className="px-8 py-3 rounded-full border border-black/5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Tirar dúvidas no WhatsApp
              </a>
            </div>
          </div>

          {/* MINI CARDS */}
          <div className="grid sm:grid-cols-2 gap-4 animate-fadeUpDelay">
            {[
              {
                title: "Perfeito para novos clientes",
                text: "Quem te encontra pelo Instagram, Google ou indicação já consegue marcar o horário imediatamente.",
              },
              {
                title: "Experiência premium desde o início",
                text: "Uma página clara, leve e profissional aumenta confiança e conversões.",
              },
              {
                title: "Funciona para qualquer área",
                text: "Saúde, estética, beleza, desenvolvimento pessoal, performance e muito mais.",
              },
              {
                title: "Organização completa",
                text: "Tenha histórico, dados e controle total dos atendimentos.",
              },
            ].map((card, index) => (
              <div
                key={index}
                className="p-5 rounded-3xl bg-gray-50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ============================================
          GALERIA — Imagens reais (ou placeholder premium)
      ============================================= */}
      {landing.show_gallery && (
        <section
          id="galeria"
          className="w-full bg-white py-20 border-t border-b border-black/5"
        >
          <div className="max-w-6xl mx-auto px-4 text-center space-y-6 animate-fadeUp">

            <span className="text-xs font-semibold tracking-widest text-gray-400">
              GALERIA
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {landing.gallery_title || "Resultados reais, ambientes profissionais e experiências que inspiram confiança."}
            </h2>

            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed text-base md:text-lg">
              {landing.gallery_subtitle ||
                "Assim que o profissional adicionar fotos de atendimentos, bastidores, resultados e ambientes, elas irão aparecer aqui automaticamente. Enquanto isso, você já pode explorar outras áreas da página."}
            </p>

            <a
              href={`/${slug}/galeria`}
              className="inline-flex items-center justify-center mt-4 px-8 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
              style={{ backgroundColor: STRONG }}
            >
              Ver galeria completa
            </a>
          </div>
        </section>
      )}



      {/* ============================================
          TESTEMUNHOS — Credibilidade e Prova Social
      ============================================= */}
      {landing.show_testimonials && (
        <section className="w-full bg-white py-20 border-b border-black/5">
          <div className="max-w-6xl mx-auto px-4 text-center space-y-6 animate-fadeUp">

            <span className="text-xs font-semibold tracking-widest text-gray-400">
              DEPOIMENTOS
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {landing.testimonials_title || "Clientes que viveram uma experiência transformadora."}
            </h2>

            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed text-base md:text-lg">
              {landing.testimonials_subtitle ||
                "Assim que os depoimentos forem cadastrados pelo profissional, eles serão exibidos aqui. Uma forma sincera e poderosa de mostrar como cada atendimento faz a diferença."}
            </p>

            <div className="pt-6 text-xs text-gray-400">
              * Os depoimentos aparecerão automaticamente quando incluídos.
            </div>

          </div>
        </section>
      )}



      {/* ============================================
          EQUIPE — Cards ultra premium e minimalistas
      ============================================= */}
      {landing.show_team && (
        <section className="w-full bg-white py-20 border-b border-black/5">
          <div className="max-w-6xl mx-auto px-4 space-y-6 text-center animate-fadeUp">

            <span className="text-xs font-semibold tracking-widest text-gray-400">
              EQUIPE
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              {landing.team_title || "Conheça os profissionais que estão prontos para te atender."}
            </h2>

            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed text-base md:text-lg">
              {landing.team_subtitle ||
                "Cada integrante da equipe possui formação, especialização e uma paixão genuína pelo que faz. Assim que forem cadastrados, aparecerão aqui com suas fotos, áreas de atuação e breve apresentação."}
            </p>

            <div className="pt-6 text-xs text-gray-400">
              * Os profissionais serão exibidos automaticamente quando cadastrados.
            </div>

          </div>
        </section>
      )}



      {/* ============================================
          CONTATO — CTA Final Premium
      ============================================= */}
      <section
        id="contato"
        className="w-full bg-white py-24 border-b border-black/5"
      >
        <div className="max-w-6xl mx-auto px-4 text-center space-y-10 animate-fadeUp">

          <span className="text-xs font-semibold tracking-widest text-gray-400">
            ENTRE EM CONTATO
          </span>

          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            {landing.contact_title || "Comece agora a transformar sua experiência com agendamentos online."}
          </h2>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-gray-600 leading-relaxed">
            Você pode agendar diretamente pelo site, tirar dúvidas pelo WhatsApp ou acompanhar conteúdos
            no Instagram. Tudo foi pensado para facilitar sua vida e oferecer um atendimento moderno,
            rápido e totalmente transparente.
          </p>

          {/* CONTACT OPTIONS */}
          <div className="grid md:grid-cols-3 gap-6 pt-6">

            {/* AGENDAR */}
            <a
              href={`/${slug}/agendar`}
              className="rounded-3xl p-8 bg-white border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all text-center group"
            >
              <p className="text-xs font-semibold text-gray-400 mb-1">
                AGENDAR ONLINE
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Horários em tempo real
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Veja todas as opções disponíveis e confirme sua visita em poucos segundos.
              </p>
              <span
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold text-white transition"
                style={{ backgroundColor: STRONG }}
              >
                Ver agenda
              </span>
            </a>

            {/* WHATSAPP */}
            <a
              href={whatsappLink(landing.whatsapp)}
              target="_blank"
              className="rounded-3xl p-8 bg-white border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all text-center group"
            >
              <p className="text-xs font-semibold text-gray-400 mb-1">
                WHATSAPP
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Atendimento direto
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Tire dúvidas de forma rápida e prática com a equipe.
              </p>
              <span
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold text-white bg-emerald-500 group-hover:bg-emerald-400 transition"
              >
                Abrir WhatsApp
              </span>
            </a>

            {/* INSTAGRAM */}
            <a
              href={instagramLink(landing.instagram)}
              target="_blank"
              className="rounded-3xl p-8 bg-white border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all text-center group"
            >
              <p className="text-xs font-semibold text-gray-400 mb-1">
                INSTAGRAM
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Conteúdos e bastidores
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Inspire-se com resultados, novidades, rotinas e conteúdos exclusivos.
              </p>
              <span
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold text-white bg-pink-500 group-hover:bg-pink-400 transition"
              >
                Abrir Instagram
              </span>
            </a>
          </div>
        </div>
      </section>
      {/* ============================================
          FOOTER ULTRA PREMIUM
      ============================================= */}
      <footer className="w-full bg-white border-t border-black/5 pt-16 pb-10">
        <div className="max-w-6xl mx-auto px-4">

          {/* TOP GRID */}
          <div className="grid md:grid-cols-3 gap-12 pb-14">

            {/* LOGO + INFO */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-100 border border-black/5 overflow-hidden shadow-sm flex items-center justify-center">
                  {org?.logo_organization ? (
                    <img
                      src={org.logo_organization}
                      alt={org?.name || "Logo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-semibold text-gray-800">
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
                  <span className="text-sm font-semibold text-gray-900">
                    {org?.name || "Seu espaço profissional"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {landing.endereco || org?.address || "Endereço não informado"}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
                Uma página premium criada para elevar sua presença profissional, facilitar agendamentos e oferecer uma experiência impecável para seus clientes.
              </p>
            </div>

            {/* NAVIGATION */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Navegação rápida
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href={`/${slug}`} className="hover:text-gray-900 transition">Home</a></li>
                <li><a href={`/${slug}/agendar`} className="hover:text-gray-900 transition">Agendar</a></li>
                <li><a href={`/${slug}/galeria`} className="hover:text-gray-900 transition">Galeria</a></li>
                <li><a href={`/${slug}/login`} className="hover:text-gray-900 transition">Área do cliente</a></li>
                <li><a href={`/${slug}/cadastro`} className="hover:text-gray-900 transition">Quero uma página</a></li>
              </ul>
            </div>

            {/* CONTACT */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Contato
              </p>
              <ul className="space-y-2 text-sm text-gray-600">

                {landing.whatsapp && (
                  <li>
                    <a
                      href={whatsappLink(landing.whatsapp)}
                      target="_blank"
                      className="hover:text-gray-900 transition"
                    >
                      WhatsApp: {landing.whatsapp}
                    </a>
                  </li>
                )}

                {landing.telefone && (
                  <li>
                    <a
                      href={`tel:${landing.telefone}`}
                      className="hover:text-gray-900 transition"
                    >
                      Telefone: {landing.telefone}
                    </a>
                  </li>
                )}

                {landing.email && (
                  <li>
                    <a
                      href={`mailto:${landing.email}`}
                      className="hover:text-gray-900 transition"
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
                      className="hover:text-gray-900 transition"
                    >
                      Instagram
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="w-full border-t border-black/5 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-3">

            <span>
              © {new Date().getFullYear()} Todos os direitos reservados.
            </span>

            <span>
              Página criada com{" "}
              <a
                href="https://www.marcafy.com.br"
                className="font-semibold text-gray-700 hover:text-gray-900 transition"
              >
                Marcafy
              </a>.
            </span>
          </div>
        </div>
      </footer>


      {/* ============================================
          FLOATING WHATSAPP — Botão premium
      ============================================= */}
      {landing.whatsapp && (
        <a
          href={whatsappLink(landing.whatsapp)}
          target="_blank"
          className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.15)] bg-emerald-500 hover:bg-emerald-400 transition-all hover:-translate-y-1"
          aria-label="Falar no WhatsApp"
        >
          <span className="text-white text-xl">💬</span>
        </a>
      )}

    </main>
  );
}
