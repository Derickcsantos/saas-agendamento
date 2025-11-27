"use client";

import { motion } from "framer-motion";
import { OrganizationSelector } from '@/app/components/OrganizationSelector'
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

export default function TermsAndPolicies() {
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
            <a href="/" className="text-sm text-neutral-700 hover:opacity-70">
              Home
            </a>
            <a href="#como-funciona" className="text-sm text-neutral-700 hover:opacity-70">
              Como funciona
            </a>
            <a href="#planos" className="text-sm text-neutral-700 hover:opacity-70">
              Planos
            </a>
          </nav>

          <div>
            <a href="/login" className="text-sm mr-5 text-neutral-700 hover:opacity-70">
              Entrar
            </a>
            <a
              href="/criar-conta"
              className="rounded-full px-5 py-5 ml-2.5 text-sm font-semibold text-white transition"
              style={{ background: BRAND, boxShadow: "0 10px 22px rgba(94,59,238,0.25)" }}
            >
              Cadastre-se
            </a>
          </div>
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

          <h1 className="mt-5 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Termos e politicas 
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-7 text-neutral-700">
            Leia todos os nossos termos e condições, e nossa política de privacidade de dados, seguindo o padrão vigente, incluindo a LGPD (Lei nº 13.709/2018).
          </p>

        </motion.div>

        <motion.div
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="relative flex items-center justify-center"
                >
                  <motion.img
                    src="/logoM.jpg" // coloque o arquivo em /public/mobile.avif
                    alt="Logo da marcafy"
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

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8">
        <div style={{ color: "rgb(68, 68, 68)" }}>
          A Marcafy é uma plataforma digital operada por DERICK CAMPOS SANTOS DESENVOLVIMENTO DE SOFTWARE LTDA, CNPJ nº 63.675.731/0001-57, que fornece soluções para otimização do processo de agendamento online, oferecendo também controle empresarial, site e galeria customizáveis, gerenciamento de colaboradores, gerenciamento de clientes e muito mais, com foco em barbeiro(a)s, cabelereiro(a)s, clinicas, consultórios, mentores, manicure e negócios que trabalham com serviços. Nosso objetivo é oferecer uma solução rápida e completa para gerenciamento total da sua empresa, respeitando a legislação vigente, incluindo a LGPD (Lei nº 13.709/2018).
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8">
        <SoftCard className="flex flex-col items-center justify-between gap-6 p-10 md:flex-row">
          <div>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>1. Termos</span>
              </h2>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Ao acessar ao site <a href="https://www.marcafy.com.br">Marcafy</a>,
                  concorda em cumprir estes termos de serviço, todas as leis e regulamentos
                  aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as
                  leis locais aplicáveis. Se você não concordar com algum desses termos,
                  está proibido de usar ou acessar este site. Os materiais contidos neste
                  site são protegidos pelas leis de direitos autorais e marcas comerciais
                  aplicáveis.
                </span>
              </p>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>2. Uso de Licença</span>
              </h2>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  É concedida permissão para baixar temporariamente uma cópia dos materiais
                  (informações ou software) no site Marcafy , apenas para visualização
                  transitória pessoal e não comercial. Esta é a concessão de uma licença,
                  não uma transferência de título e, sob esta licença, você não pode:&nbsp;
                </span>
              </p>
              <ol>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    modificar ou copiar os materiais;&nbsp;
                  </span>
                </li>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    usar os materiais para qualquer finalidade comercial ou para exibição
                    pública (comercial ou não comercial);&nbsp;
                  </span>
                </li>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    tentar descompilar ou fazer engenharia reversa de qualquer software
                    contido no site Marcafy;&nbsp;
                  </span>
                </li>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    remover quaisquer direitos autorais ou outras notações de propriedade
                    dos materiais; ou&nbsp;
                  </span>
                </li>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    transferir os materiais para outra pessoa ou 'espelhe' os materiais em
                    qualquer outro servidor.
                  </span>
                </li>
              </ol>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Esta licença será automaticamente rescindida se você violar alguma dessas
                  restrições e poderá ser rescindida por Marcafy a qualquer momento. Ao
                  encerrar a visualização desses materiais ou após o término desta licença,
                  você deve apagar todos os materiais baixados em sua posse, seja em formato
                  eletrónico ou impresso.
                </span>
              </p>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  3. Isenção de responsabilidade
                </span>
              </h2>
              <ol>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    Os materiais no site da Marcafy são fornecidos 'como estão'. Marcafy não
                    oferece garantias, expressas ou implícitas, e, por este meio, isenta e
                    nega todas as outras garantias, incluindo, sem limitação, garantias
                    implícitas ou condições de comercialização, adequação a um fim
                    específico ou não violação de propriedade intelectual ou outra violação
                    de direitos.
                  </span>
                </li>
                <li>
                  <span style={{ color: "rgb(68, 68, 68)" }}>
                    Além disso, o Marcafy não garante ou faz qualquer representação relativa
                    à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos
                    materiais em seu site ou de outra forma relacionado a esses materiais ou
                    em sites vinculados a este site.
                  </span>
                </li>
              </ol>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>4. Limitações</span>
              </h2>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Em nenhum caso o Marcafy ou seus fornecedores serão responsáveis ​​por
                  quaisquer danos (incluindo, sem limitação, danos por perda de dados ou
                  lucro ou devido a interrupção dos negócios) decorrentes do uso ou da
                  incapacidade de usar os materiais em Marcafy, mesmo que Marcafy ou um
                  representante autorizado da Marcafy tenha sido notificado oralmente ou por
                  escrito da possibilidade de tais danos. Como algumas jurisdições não
                  permitem limitações em garantias implícitas, ou limitações de
                  responsabilidade por danos conseqüentes ou incidentais, essas limitações
                  podem não se aplicar a você.
                </span>
              </p>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>5. Precisão dos materiais</span>
              </h2>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Os materiais exibidos no site da Marcafy podem incluir erros técnicos,
                  tipográficos ou fotográficos. Marcafy não garante que qualquer material em
                  seu site seja preciso, completo ou atual. Marcafy pode fazer alterações
                  nos materiais contidos em seu site a qualquer momento, sem aviso prévio.
                  No entanto, Marcafy não se compromete a atualizar os materiais.
                </span>
              </p>
              <h2>
                <span style={{ color: "rgb(68, 68, 68)" }}>6. Links</span>
              </h2>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  O Marcafy não analisou todos os sites vinculados ao seu site e não é
                  responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer
                  link não implica endosso por Marcafy do site. O uso de qualquer site
                  vinculado é por conta e risco do usuário.
                </span>
              </p>
              <p>
                <br />
              </p>
              <h3>
                <span style={{ color: "rgb(68, 68, 68)" }}>Modificações</span>
              </h3>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  O Marcafy pode revisar estes termos de serviço do site a qualquer momento,
                  sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à
                  versão atual desses termos de serviço.
                </span>
              </p>
              <h3>
                <span style={{ color: "rgb(68, 68, 68)" }}>Lei aplicável</span>
              </h3>
              <p>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Estes termos e condições são regidos e interpretados de acordo com as leis
                  do Marcafy e você se submete irrevogavelmente à jurisdição exclusiva dos
                  tribunais naquele estado ou localidade.
                </span>
              </p>
          </div>
          
        </SoftCard>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-8">
        <SoftCard className="flex flex-col items-center justify-between gap-6 p-10 md:flex-row">
          <div>
            <h2>
              <span style={{ color: "rgb(68, 68, 68)" }}>Política Privacidade</span>
            </h2>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                A sua privacidade é importante para nós. É política do Marcafy respeitar a
                sua privacidade em relação a qualquer informação sua que possamos coletar
                no site <a href="https://www.marcafy.com.br">Marcafy</a>, e outros sites
                que possuímos e operamos.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Solicitamos informações pessoais apenas quando realmente precisamos delas
                para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o
                seu conhecimento e consentimento. Também informamos por que estamos
                coletando e como será usado.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Apenas retemos as informações coletadas pelo tempo necessário para
                fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro
                de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como
                acesso, divulgação, cópia, uso ou modificação não autorizados.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Não compartilhamos informações de identificação pessoal publicamente ou
                com terceiros, exceto quando exigido por lei.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                O nosso site pode ter links para sites externos que não são operados por
                nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas
                desses sites e não podemos aceitar responsabilidade por suas
                respectivas&nbsp;
              </span>
              <a
                href="https://politicaprivacidade.com/"
                rel="noopener noreferrer"
                target="_blank"
                style={{ backgroundColor: "transparent", color: "rgb(68, 68, 68)" }}
              >
                políticas de privacidade
              </a>
              <span style={{ color: "rgb(68, 68, 68)" }}>.</span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Você é livre para recusar a nossa solicitação de informações pessoais,
                entendendo que talvez não possamos fornecer alguns dos serviços desejados.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                O uso continuado de nosso site será considerado como aceitação de nossas
                práticas em torno de privacidade e informações pessoais. Se você tiver
                alguma dúvida sobre como lidamos com dados do usuário e informações
                pessoais, entre em contacto connosco.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }} />
            </p>
            <ul>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  O serviço Google AdSense que usamos para veicular publicidade usa um
                  cookie DoubleClick para veicular anúncios mais relevantes em toda a Web
                  e limitar o número de vezes que um determinado anúncio é exibido para
                  você.
                </span>
              </li>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Para mais informações sobre o Google AdSense, consulte as FAQs oficiais
                  sobre privacidade do Google AdSense.
                </span>
              </li>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Utilizamos anúncios para compensar os custos de funcionamento deste site
                  e fornecer financiamento para futuros desenvolvimentos. Os cookies de
                  publicidade comportamental usados ​​por este site foram projetados para
                  garantir que você forneça os anúncios mais relevantes sempre que
                  possível, rastreando anonimamente seus interesses e apresentando coisas
                  semelhantes que possam ser do seu interesse.
                </span>
              </li>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  Vários parceiros anunciam em nosso nome e os cookies de rastreamento de
                  afiliados simplesmente nos permitem ver se nossos clientes acessaram o
                  site através de um dos sites de nossos parceiros, para que possamos
                  creditá-los adequadamente e, quando aplicável, permitir que nossos
                  parceiros afiliados ofereçam qualquer promoção que pode fornecê-lo para
                  fazer uma compra.
                </span>
              </li>
            </ul>
            <p>
              <br />
            </p>
            <p />
            <h3>
              <span style={{ color: "rgb(68, 68, 68)" }}>Compromisso do Usuário</span>
            </h3>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                O usuário se compromete a fazer uso adequado dos conteúdos e da informação
                que o Marcafy oferece no site e com caráter enunciativo, mas não
                limitativo:
              </span>
            </p>
            <ul>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  A) Não se envolver em atividades que sejam ilegais ou contrárias à boa
                  fé a à ordem pública;
                </span>
              </li>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica,
                  jogos de sorte ou azar, qualquer tipo de pornografia ilegal, de apologia
                  ao terrorismo ou contra os direitos humanos;
                </span>
              </li>
              <li>
                <span style={{ color: "rgb(68, 68, 68)" }}>
                  C) Não causar danos aos sistemas físicos (hardwares) e lógicos
                  (softwares) do Marcafy, de seus fornecedores ou terceiros, para
                  introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas
                  de hardware ou software que sejam capazes de causar danos anteriormente
                  mencionados.
                </span>
              </li>
            </ul>
            <h3>
              <span style={{ color: "rgb(68, 68, 68)" }}>Mais informações</span>
            </h3>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Esperemos que esteja esclarecido e, como mencionado anteriormente, se
                houver algo que você não tem certeza se precisa ou não, geralmente é mais
                seguro deixar os cookies ativados, caso interaja com um dos recursos que
                você usa em nosso site.
              </span>
            </p>
            <p>
              <span style={{ color: "rgb(68, 68, 68)" }}>
                Esta política é efetiva a partir de&nbsp;27 November 2025 14:35
              </span>
            </p>
          </div>
         
        </SoftCard>
      </section>


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
              Termos e condições
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
