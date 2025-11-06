"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  BarChart2,
  Settings,
  Wand2,
  LineChart,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
  Mail,
  Database,
  CloudUpload,
} from "lucide-react";

const BRAND = "#5E3BEE"; // cor principal

// Badge minimalista de seção
function Chip({ children }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
      style={{
        border: `1px solid ${BRAND}20`,
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
        background: "white",
        color: "#111",
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: BRAND }}
      />
      {children}
    </span>
  );
}

// Card com sombra clara e borda roxa
function SoftCard({ className = "", children, hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl bg-white ${className}`}
      style={{
        border: `1px solid ${BRAND}26`,
        boxShadow:
          "0 1px 1px rgba(17,17,17,0.02), 0 10px 20px rgba(17,17,17,0.04), 0 24px 40px rgba(17,17,17,0.03)",
      }}
    >
      {children}
    </motion.div>
  );
}

// Ícone com hover 180°
function FlipIcon({ Icon }) {
  return (
    <motion.div
      whileHover={{ rotate: 180, scale: 1.1 }}
      transition={{ type: "spring", stiffness: 220, damping: 12 }}
      className="inline-flex items-center justify-center rounded-2xl p-3"
      style={{
        border: `1px solid ${BRAND}26`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        background: "white",
      }}
    >
      <Icon size={24} color={BRAND} />
    </motion.div>
  );
}

// Item de lista com check
function Li({ children }) {
  return (
    <li className="flex items-start gap-3 text-left">
      <CheckCircle2 size={20} color={BRAND} className="mt-1 shrink-0" />
      <span className="text-[15px] leading-6 text-neutral-800">{children}</span>
    </li>
  );
}

// Card de plano com bullets de acordo com sua descrição
function PricingCard({ destaque = false, nome, preco, descricao, bullets, cta }) {
  return (
    <SoftCard
      className={`p-8 md:p-10 relative ${
        destaque ? "scale-[1.02]" : ""
      }`}
    >
      {destaque && (
        <span
          className="absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: `${BRAND}10`, color: BRAND }}
        >
          Mais escolhido
        </span>
      )}

      <div className="mb-6 flex items-center gap-3">
        <FlipIcon Icon={Sparkles} />
        <h4 className="text-2xl font-bold tracking-tight">{nome}</h4>
      </div>

      <div className="mb-2 text-4xl font-extrabold" style={{ color: BRAND }}>
        {preco}
        <span className="ml-1 align-middle text-base font-medium text-neutral-500">
          /mês
        </span>
      </div>

      <p className="mb-6 text-sm text-neutral-600">{descricao}</p>

      <ul className="mb-8 space-y-3">
        {bullets.map((b, i) => (
          <Li key={i}>{b}</Li>
        ))}
      </ul>

      <a
        href={cta || "https://wa.me/5511999999999"}
        className="inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-semibold text-white transition"
        style={{
          background: BRAND,
          boxShadow: "0 10px 24px rgba(94,59,238,0.25)",
        }}
      >
        Contratar
      </a>
    </SoftCard>
  );
}

export default function MarcafyLanding() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* HEADER */}
      <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/marcafy-logo.jpg"
              alt="Marcafy"
              className="h-9 w-9 rounded-xl"
              style={{ border: `1px solid ${BRAND}26` }}
            />
            <span className="text-xl font-extrabold tracking-tight">Marcafy</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#recursos" className="text-sm text-neutral-700 hover:opacity-70">
              Recursos
            </a>
            <a href="#como-funciona" className="text-sm text-neutral-700 hover:opacity-70">
              Como funciona
            </a>
            <a href="#planos" className="text-sm text-neutral-700 hover:opacity-70">
              Planos
            </a>
          </nav>

          <a
            href="https://wa.me/5511999999999"
            className="rounded-full px-5 py-5 text-sm font-semibold text-white transition"
            style={{ background: BRAND, boxShadow: "0 10px 22px rgba(94,59,238,0.25)" }}
          >
            Fale com a equipe
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-24 pt-16 md:grid-cols-2 md:px-8">
        {/* texto */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Chip>Plataforma brasileira de agendamentos</Chip>

          <h1 className="mt-5 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Otimize sua agenda e aumente seus {" "}
            <span style={{ color: BRAND }}>resultados.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-7 text-neutral-700">
            Um sistema de agendamento online feito para simplificar sua rotina e aumentar seus resultados.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <a
              href="https://wa.me/5511999999999"
              className="rounded-full px-8 py-3 font-semibold text-white transition"
              style={{ background: BRAND, boxShadow: "0 14px 28px rgba(94,59,238,0.25)" }}
            >
              Começar agora
            </a>
            <a
              href="#recursos"
              className="rounded-full px-8 py-3 font-semibold transition"
              style={{ border: `1px solid ${BRAND}40` }}
            >
              Ver recursos
            </a>
          </div>

          {/* mini métricas */}
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md">
            <SoftCard className="p-4 text-center">
              <div className="text-3xl font-extrabold" style={{ color: BRAND }}>
                98%
              </div>
              <div className="text-xs text-neutral-500">Satisfação dos clientes</div>
            </SoftCard>
            <SoftCard className="p-4 text-center">
              <div className="text-3xl font-extrabold" style={{ color: BRAND }}>
                +90%
              </div>
              <div className="text-xs text-neutral-500">Mais eficiência operacional</div>
            </SoftCard>
          </div>
        </motion.div>

        {/* mockup celular animado */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative flex items-center justify-center"
        >
          <motion.img
            src="/mockupCelular.png" // coloque o arquivo em /public/mobile.avif
            alt="App Marcafy no celular"
            className="w-[290px] md:w-[360px] rounded-[36px] border"
            style={{
              borderColor: "#ffffff",
              boxShadow:
                "0 8px 18px rgba(0,0,0,0.05), 0 30px 60px rgba(0,0,0,0.06)",
            }}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="absolute -z-10 h-72 w-72 rounded-full blur-3xl"
            style={{ background: `${BRAND}15` }}
          />
        </motion.div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-7xl px-6 pb-10 md:px-8">
        <div className="mb-12 text-center">
          <Chip>Recursos principais</Chip>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">
            Feita para simplificar a gestão e encantar seus clientes
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Calendar,
              title: "Agendamento sem login",
              desc: "Fluxo rápido, conversão alta e zero atrito para o cliente.",
            },
            {
              icon: Users,
              title: "Painéis completos",
              desc: "Administrador, funcionário e cliente — cada um com o que importa.",
            },
            {
              icon: Settings,
              title: "100% personalizável",
              desc: "Cores da marca, landing page com CMS e identidade visual.",
            },
            {
              icon: BarChart2,
              title: "Relatórios avançados",
              desc: "Indicadores e dashboards com filtros e exportação.",
            },
            {
              icon: Wand2,
              title: "Marketing & Cupons",
              desc: "Campanhas, e-mail marketing e gestão de cupons.",
            },
            {
              icon: LineChart,
              title: "Gestão financeira",
              desc: "Comissões, notas fiscais, controle de caixa e muito mais.",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <SoftCard key={i} className="p-8">
              <div className="mb-4">
                <FlipIcon Icon={Icon} />
              </div>
              <h3 className="mb-1 text-lg font-semibold">{title}</h3>
              <p className="text-sm text-neutral-600">{desc}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      {/* BENEFÍCIOS EM BLOCOS (estilo cápsulas) */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="mb-14 text-center">
          <Chip>Benefícios</Chip>
          <h2 className="mt-4 text-4xl font-bold">Transforme seu negócio</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Escala", value: "Milhões+" },
            { label: "Disponibilidade", value: "99,9%" },
            { label: "Atendimentos/sem", value: "↑ 90%" },
            { label: "Exportações", value: "CSV & PDF" },
            { label: "Backups", value: "Diários" },
            { label: "Latência média", value: "Baixa" },
          ].map((k, i) => (
            <SoftCard key={i} className="rounded-[32px] p-6 text-center">
              <div className="text-3xl font-extrabold" style={{ color: BRAND }}>
                {k.value}
              </div>
              <div className="text-sm text-neutral-500">{k.label}</div>
            </SoftCard>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-7xl grid items-center gap-10 px-6 py-10 md:grid-cols-2 md:px-8">
        <div className="order-2 md:order-1">
          <SoftCard className="p-6">
            <Chip>Como funciona</Chip>
            <h3 className="mt-4 text-3xl font-bold">3 passos simples</h3>
            <ul className="mt-6 space-y-5">
              <Li>
                <strong>Registro rápido e personalizado:</strong> crie sua URL,
                defina o tipo de negócio e já comece a receber agendamentos.
              </Li>
              <Li>
                <strong>Configure sua agenda:</strong> horários, serviços,
                preços, profissionais e disponibilidades.
              </Li>
              <Li>
                <strong>Página pública pronta:</strong> landing page profissional
                com CMS e galeria — sem precisar programar.
              </Li>
            </ul>
          </SoftCard>
        </div>

        <div className="order-1 flex items-center justify-center md:order-2">
          <motion.img
            src="/mobile.avif"
            alt="Fluxo no celular"
            className="w-[260px] md:w-[320px] rounded-[32px] border"
            style={{ borderColor: "#ececec" }}
            animate={{ rotate: [0, -2, 2, 0] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          />
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <div className="mb-12 text-center">
          <Chip>Planos</Chip>
          <h2 className="mt-4 text-4xl font-bold">Escolha o plano ideal</h2>
          <p className="mt-2 text-neutral-600 max-w-2xl mx-auto">
            Todos os planos incluem armazenamento em nuvem, visão geral do calendário, link
            de agendamento personalizado, notificações automáticas e adaptação de cores da sua marca.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* ====================== BÁSICO ====================== */}
          <SoftCard className="p-8 md:p-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles size={22} color="#5E3BEE" /> Básico
                </h3>
              </div>

              <p className="text-4xl font-extrabold text-[#5E3BEE]">R$ 50<span className="text-base font-medium text-neutral-500">/mês</span></p>
              <p className="mt-2 text-sm text-neutral-600 mb-6">
                Ideal para quem está começando e quer digitalizar o agendamento com praticidade e economia.
              </p>

              <ul className="space-y-3 text-sm">
                <Li>Agendamento online sem necessidade de login</Li>
                <Li>Página de agendamentos personalizada</Li>
                <Li>Landing page com CMS e galeria própria</Li>
                <Li>Painel do cliente e painel administrativo</Li>
                <Li>Relatórios personalizados e exportação em PDF/CSV</Li>
                <Li>Controle de cupons e promoções básicas</Li>
                <Li>Controle de escala de trabalho e comissões</Li>
                <Li>Controle financeiro simplificado</Li>
                <Li>Link de agendamento compartilhável</Li>
                <Li>Armazenamento seguro em nuvem</Li>
                <Li>Sem painel do funcionário</Li>
                <Li>Sem emissão de Nota Fiscal (somente comprovante de agendamento)</Li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/5511999999999"
                className="w-full inline-block text-center rounded-full bg-[#5E3BEE] px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg transition"
              >
                Contratar
              </a>
            </div>
          </SoftCard>

          {/* ====================== PLUS ====================== */}
          <SoftCard className="p-8 md:p-10 flex flex-col justify-between h-full relative scale-[1.01] border-[#5E3BEE] border-opacity-40">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5E3BEE] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              Mais escolhido
            </span>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles size={22} color="#5E3BEE" /> Plus
                </h3>
              </div>

              <p className="text-4xl font-extrabold text-[#5E3BEE]">R$ 100<span className="text-base font-medium text-neutral-500">/mês</span></p>
              <p className="mt-2 text-sm text-neutral-600 mb-6">
                Plano completo para quem precisa de controle total, automações e relatórios financeiros detalhados.
              </p>

              <ul className="space-y-3 text-sm">
                <Li>Todas as funcionalidades do plano Básico</Li>
                <Li>Painel do funcionário com permissões individuais</Li>
                <Li>Emissão automática de Notas Fiscais</Li>
                <Li>Backups automáticos e armazenamento de documentos</Li>
                <Li>Exportar e importar dados em massa (CSV, Excel, JSON)</Li>
                <Li>E-mail marketing integrado</Li>
                <Li>Controle financeiro completo (entradas, despesas e gráficos)</Li>
                <Li>Controle de escala de trabalho e comissões detalhadas</Li>
                <Li>Integração com ferramentas externas (Google Drive, Zapier, etc.)</Li>
                <Li>Relatórios de desempenho e produtividade por colaborador</Li>
                <Li>Gestão de clientes com histórico e lembretes automáticos</Li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/5511999999999"
                className="w-full inline-block text-center rounded-full bg-[#5E3BEE] px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg transition"
              >
                Contratar
              </a>
            </div>
          </SoftCard>

          {/* ====================== PRO ====================== */}
          <SoftCard className="p-8 md:p-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles size={22} color="#5E3BEE" /> Pro
                </h3>
              </div>

              <p className="text-4xl font-extrabold text-[#5E3BEE]">R$ 150<span className="text-base font-medium text-neutral-500">/mês</span></p>
              <p className="mt-2 text-sm text-neutral-600 mb-6">
                Para negócios em expansão que desejam maximizar o alcance e performance com suporte prioritário.
              </p>

              <ul className="space-y-3 text-sm">
                <Li>Todas as funcionalidades do plano Plus</Li>
                <Li>SEO especializado para sua landing page</Li>
                <Li>Suporte 24h e treinamento personalizado</Li>
                <Li>Painel de sugestões de novas funcionalidades</Li>
                <Li>Envio de confirmação automática para o cliente</Li>
                <Li>Integração completa com Google Agenda</Li>
                <Li>Controle de acesso avançado e multiusuário</Li>
                <Li>Monitoramento de desempenho em tempo real</Li>
                <Li>Prioridade em atualizações e releases da plataforma</Li>
                <Li>Auditoria de segurança e logs detalhados</Li>
                <Li>Consultoria de implantação e otimização personalizada</Li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/5511999999999"
                className="w-full inline-block text-center rounded-full bg-[#5E3BEE] px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg transition"
              >
                Contratar
              </a>
            </div>
          </SoftCard>
        </div>
      </section>


      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8">
        <SoftCard className="flex flex-col items-center justify-between gap-6 p-10 md:flex-row">
          <div>
            <h3 className="text-2xl font-bold">Pronto para elevar o nível do seu negócio?</h3>
            <p className="mt-2 max-w-xl text-neutral-700">
              Centralize agendamentos, finanças e relatórios. A Marcafy cresce com você.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://wa.me/551199999999999"
              className="rounded-full px-7 py-3 font-semibold text-white transition"
              style={{ background: BRAND, boxShadow: "0 14px 28px rgba(94,59,238,0.25)" }}
            >
              Solicitar demonstração
            </a>
            <a
              href="#planos"
              className="rounded-full px-7 py-3 font-semibold transition"
              style={{ border: `1px solid ${BRAND}40` }}
            >
              Ver planos
            </a>
          </div>
        </SoftCard>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10" style={{ borderColor: `${BRAND}12` }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row md:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/marcafy-logo.jpg"
              alt="Marcafy"
              className="h-8 w-8 rounded-xl"
              style={{ border: `1px solid ${BRAND}26` }}
            />
            <span className="text-sm text-neutral-600">
              © {new Date().getFullYear()} Marcafy — Todos os direitos reservados.
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a href="#recursos" className="text-neutral-700 hover:opacity-70">
              Recursos
            </a>
            <a href="#como-funciona" className="text-neutral-700 hover:opacity-70">
              Como funciona
            </a>
            <a href="#planos" className="text-neutral-700 hover:opacity-70">
              Planos
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
