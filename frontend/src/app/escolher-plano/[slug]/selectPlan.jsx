"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { CreditCard, CheckCircle, ArrowRight } from "lucide-react";

const BRAND = "#5E3BEE";

export default function EscolherPlano({ slug }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [representante, setRepresentante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState("prepaid");

  const [cardData, setCardData] = useState({
    holder_name: "",
    number: "",
    exp_month: "",
    exp_year: "",
    cvv: "",
  });

  const [processing, setProcessing] = useState(false);

  // ==========================================
  // 🔎 Carregar planos
  // ==========================================
  const loadPlans = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pagarme/plans`
      );

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setPlans(list);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
      toast.error("Falha ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    const loadRep = async () => {
      try {
        const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/representative-organization/${slug}`,
        {
          withCredentials: true
        }
        );
        setRepresentante(res.data);
        console.log("FRONT RECEBEU REPRESENTANTE =>", res.data[0]);
      } catch (err) {
        console.error("Erro ao carregar dados do representante:", err);
      }
    };

    loadRep();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlan) return toast.error("Selecione um plano antes");

    setProcessing(true);

    try {
      const body = {
        plan_id: selectedPlan.id,
        billing_type: selectedBilling,
        payment_method: "credit_card",
        slug,
        customer: {
          name: representante?.users?.username?.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          email: representante?.users?.email,
          document: representante?.organizations?.document_number,
          type: representante?.organizations?.document_type === "cnpj" ? "company" : "individual",
          phones: {
            mobile_phone: {
              country_code: "55",
              area_code: representante?.users?.phone?.replace(/\D/g, "").slice(0, 2),
              number: representante?.users?.phone?.replace(/\D/g, "").slice(2),
            }
          }
        },
        card: { ...cardData },
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pagarme/subscriptions`,
        body,
        { headers: { "Content-Type": "application/json" } }
      );

      toast.success("Assinatura criada com sucesso!");

      setTimeout(() => {
        router.push(`/${slug}/login`);
      }, 800);

    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================
  // Helpers
  // ==========================================
  const formatPrice = (p) =>
    (p / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // ==========================================
  // UI
  // ==========================================
  return (
    <main className="min-h-screen flex justify-center items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-10">

        {/* HEADER */}
        <h1 className="text-3xl font-bold text-center mb-2" style={{ color: BRAND }}>
          Escolha seu plano
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Complete seu cadastro selecionando seu plano ideal.
        </p>

        {/* =========================== */}
        {/* STEP 1 — ESCOLHER PLANO */}
        {/* =========================== */}
        {/* STEP 1 — SELECIONAR PLANO */}
        {step === 1 && (
          <div className="space-y-10">

            <h2 className="text-center text-2xl font-bold text-gray-900">
              Escolha o plano ideal para o seu negócio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* =============================== */}
              {/* PLANO BÁSICO */}
              {/* =============================== */}
              <div
                className={`rounded-2xl border p-6 shadow-sm hover:shadow-lg transition bg-white ${
                  selectedPlan?.name === "Básico"
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Básico</h3>

                {/* PREÇO */}
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(
                    plans.find((p) => p.name.includes("ásico") && p.billing_type === "prepaid")?.minimum_price ?? 5000
                  )}
                  <span className="text-sm text-gray-500">/mês</span>
                </p>

                <p className="text-gray-600 text-sm mb-4">
                  Ideal para quem está começando e quer digitalizar o agendamento com praticidade e economia.
                </p>

                {/* LISTA */}
                <ul className="text-sm text-gray-700 space-y-2 mb-5">
                  <li>✔ Agendamento online sem necessidade de login</li>
                  <li>✔ Página de agendamentos personalizada</li>
                  <li>✔ Landing page com CMS e galeria própria</li>
                  <li>✔ Painel do cliente e administrativo</li>
                  <li>✔ Relatórios básicos em PDF/CSV</li>
                  <li>✔ Controle de cupons e promoções básicas</li>
                  <li>✔ Link de agendamento compartilhável</li>
                  <li>✔ Armazenamento seguro em nuvem</li>
                </ul>

                {/* SELECT */}
                <select
                  className="w-full text-gray-950 border rounded-lg p-2 mb-4"
                  value={
                    selectedPlan?.name === "Básico"
                      ? selectedBilling
                      : "prepaid"
                  }
                  onChange={(e) => {
                    setSelectedBilling(e.target.value);
                  }}
                >
                  <option value="prepaid">Pré-pago</option>
                  <option value="postpaid">Pós-pago</option>
                </select>

                {/* BOTÃO */}
                <button
                  onClick={() => {
                    const prepaid = plans.find(
                      (p) => p.name.includes("ásico") && p.billing_type === "prepaid"
                    );
                    const postpaid = plans.find(
                      (p) => p.name.includes("ásico") && p.billing_type === "postpaid"
                    );

                    const chosenPlan =
                      selectedBilling === "prepaid"
                        ? prepaid || postpaid
                        : postpaid || prepaid;
                    setSelectedPlan(chosenPlan);
                    setStep(2);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold"
                >
                  Selecionar plano
                </button>
              </div>

              {/* =============================== */}
              {/* PLANO PLUS */}
              {/* =============================== */}
              <div
                className={`rounded-2xl border p-6 shadow-sm hover:shadow-lg transition bg-white ${
                  selectedPlan?.name === "Plus"
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Plus</h3>

                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(
                    plans.find((p) => p.name.includes("lus") && p.billing_type === "prepaid")?.minimum_price ?? 9990
                  )}
                  <span className="text-sm text-gray-500">/mês</span>
                </p>

                <p className="text-gray-600 text-sm mb-4">
                  Para quem precisa de relatórios completos e mais controle financeiro.
                </p>

                <ul className="text-sm text-gray-700 space-y-2 mb-5">
                  <li>✔ Todas funcionalidades do Básico</li>
                  <li>✔ Painel do funcionário com permissões individuais</li>
                  <li>✔ Emissão automática de NF</li>
                  <li>✔ Backups automáticos de documentos</li>
                  <li>✔ Exportação/importação de massa (Excel, CSV)</li>
                  <li>✔ Controle financeiro completo</li>
                  <li>✔ Relatórios avançados</li>
                  <li>✔ Gestão de clientes com histórico</li>
                </ul>

                <select
                  className="w-full text-gray-950 border rounded-lg p-2 mb-4"
                  value={
                    selectedPlan?.name === "Plus"
                      ? selectedBilling
                      : "prepaid"
                  }
                  onChange={(e) => {
                    setSelectedBilling(e.target.value);
                  }}
                >
                  <option value="prepaid">Pré-pago</option>
                  <option value="postpaid">Pós-pago</option>
                </select>

                <button
                  onClick={() => {
                    const prepaid = plans.find(
                      (p) => p.name.includes("lus") && p.billing_type === "prepaid"
                    );
                    const postpaid = plans.find(
                      (p) => p.name.includes("lus") && p.billing_type === "postpaid"
                    );
                    const chosenPlan = selectedBilling === "prepaid" ? prepaid : postpaid;

                    setSelectedPlan(chosenPlan);
                    setStep(2);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold"
                >
                  Selecionar plano
                </button>
              </div>

              {/* =============================== */}
              {/* PLANO Premium */}
              {/* =============================== */}
              <div
                className={`rounded-2xl border p-6 shadow-sm hover:shadow-lg transition bg-white ${
                  selectedPlan?.name === "Premium"
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>

                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(
                    plans.find((p) => p.name.includes("remium") && p.billing_type === "prepaid")?.minimum_price ?? 14990
                  )}
                  <span className="text-sm text-gray-500">/mês</span>
                </p>

                <p className="text-gray-600 text-sm mb-4">
                  Para empresas em expansão que precisam de performance e suporte premium.
                </p>

                <ul className="text-sm text-gray-700 space-y-2 mb-5">
                  <li>✔ Tudo do plano Plus</li>
                  <li>✔ SEO especializado para sua landing page</li>
                  <li>✔ Suporte 24h + treinamento personalizado</li>
                  <li>✔ Sugestão e priorização de novas features</li>
                  <li>✔ Integração com Google Agenda</li>
                  <li>✔ Controle avançado multiusuário</li>
                  <li>✔ Auditoria de segurança</li>
                  <li>✔ Consultoria personalizada</li>
                </ul>

                <select
                  className="w-full text-gray-950 border rounded-lg p-2 mb-4"
                  value={
                    selectedPlan?.name === "Premium"
                      ? selectedBilling
                      : "prepaid"
                  }
                  onChange={(e) => {
                    setSelectedBilling(e.target.value);
                  }}
                >
                  <option value="prepaid">Pré-pago</option>
                  <option value="postpaid">Pós-pago</option>
                </select>

                <button
                  onClick={() => {
                    const prepaid = plans.find(
                      (p) => p.name.includes("remium") && p.billing_type === "prepaid"
                    );
                    const postpaid = plans.find(
                      (p) => p.name.includes("remium") && p.billing_type === "postpaid"
                    );
                    const chosenPlan = selectedBilling === "prepaid" ? prepaid : postpaid;

                    setSelectedPlan(chosenPlan);
                    setStep(2);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold"
                >
                  Selecionar plano
                </button>
              </div>

            </div>
          </div>
        )}

        <div>
          {!loading && plans.length === 0 && (
            <p className="text-center text-gray-500 mt-4">
              Nenhum plano encontrado.
            </p>
          )}
        </div>

        {/* =========================== */}
        {/* STEP 2 — CARTÃO */}
        {/* =========================== */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">

            {/* Plano selecionado */}
            <div className="border border-purple-500 rounded-xl p-5 mb-6 shadow">
              <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <CheckCircle color={BRAND} size={22} />
                Plano selecionado
              </h2>
              <p className="mt-2 text-gray-700">{selectedPlan?.name}</p>
              <p className="font-semibold text-gray-900 mt-1">
                {selectedPlan?.minimum_price
                  ? formatPrice(selectedPlan.minimum_price)
                  : "R$ --"}
                / mês
              </p>
              <p className="text-sm text-gray-600">
                Pagamento: <strong>{selectedBilling === "prepaid" ? "Pré-pago" : "Pós-pago"}</strong>
              </p>

              <button
                onClick={() => setStep(1)}
                className="text-sm text-purple-600 underline mt-2"
              >
                Trocar plano
              </button>
            </div>

            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <CreditCard size={20} /> Dados do Cartão
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="font-medium text-gray-900 text-sm">Nome do Titular</label>
                <input
                  type="text"
                  required
                  value={cardData.holder_name}
                  onChange={(e) =>
                    setCardData({ ...cardData, holder_name: e.target.value })
                  }
                  className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                />
              </div>

              <div>
                <label className="font-medium text-gray-900 text-sm">Número do Cartão</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={cardData.number}
                  onChange={(e) =>
                    setCardData({ ...cardData, number: e.target.value })
                  }
                  className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="font-medium text-gray-900 text-sm">Mês</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={cardData.exp_month}
                    onChange={(e) =>
                      setCardData({ ...cardData, exp_month: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                  />
                </div>

                <div className="flex-1">
                  <label className="font-medium text-gray-900 text-sm">Ano</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={cardData.exp_year}
                    onChange={(e) =>
                      setCardData({ ...cardData, exp_year: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                  />
                </div>

                <div className="flex-1">
                  <label className="font-medium text-gray-900 text-sm">CVV</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={cardData.cvv}
                    onChange={(e) =>
                      setCardData({ ...cardData, cvv: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                  />
                </div>
              </div>

              <button
                disabled={processing}
                className="w-full py-3 rounded-lg text-white font-semibold shadow transition"
                style={{ backgroundColor: BRAND }}
              >
                {processing ? "Processando..." : "Confirmar Assinatura"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
