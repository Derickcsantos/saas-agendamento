"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { CreditCard, CheckCircle, ArrowRight } from "lucide-react";
import { CreditCardComponent } from '../../components/CreditCard'

const BRAND = "#5E3BEE";

export default function EscolherPlano({ slug }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [representante, setRepresentante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState(null);
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

      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

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
        console.log("🔍 REPRESENTANTE COMPLETO =>", res.data);
        console.log("🔍 ORGANIZATION_ID =>", res.data?.organization_id || res.data?.organizations?.id);
        console.log("🔍 ESTRUTURA =>", JSON.stringify(res.data, null, 2));
      } catch (err) {
        console.error("Erro ao carregar dados do representante:", err);
      }
    };

    if (slug) {
      loadRep();
    }
  }, [slug]);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return toast.error("Digite um cupom");

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/validate?code=${couponCode}`, {
          withCredentials: true
        }
      );

      if (!res.data.valid) {
        toast.error(res.data.message || "Cupom inválido");
        return;
      }

      setDiscountValue(res.data.discount);
      setDiscountType(res.data.type);

      toast.success("Cupom aplicado!");
    } catch (err) {
      toast.error("Erro ao validar cupom");
    }
  };

  const finalPrice = (() => {
    if (!selectedPlan) return 0;

    if (!discountType) return selectedPlan.minimum_price;

    if (discountType === "percentage") {
      return selectedPlan.minimum_price - (selectedPlan.minimum_price * discountValue / 100);
    }

    if (discountType === "fixed") {
      return Math.max(0, selectedPlan.minimum_price - discountValue * 100);
    }

    return selectedPlan.minimum_price;
  })();



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlan) {
      toast.error("Selecione um plano antes");
      return;
    }

    if (!finalPrice || finalPrice <= 0) {
      toast.error("Valor final inválido");
      return;
    }

    // Validar campos do cartão
    if (!cardData.holder_name || cardData.holder_name.trim().length < 3) {
      toast.error("Nome do titular inválido");
      return;
    }

    const cleanCardNumber = cardData.number.replace(/\D/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast.error("Número do cartão inválido");
      return;
    }

    if (!cardData.exp_month || !cardData.exp_year || !cardData.cvv) {
      toast.error("Preencha todos os dados do cartão");
      return;
    }

    setProcessing(true);

    try {
      // A API retorna um objeto único, não array
      const rep = representante;

      console.log("🔍 REP COMPLETO =>", rep);
      console.log("🔍 REP.organization_id =>", rep?.organization_id);
      console.log("🔍 REP.organizations.id =>", rep?.organizations?.id);

      // Extrair organization_id (pode vir diretamente ou dentro de organizations)
      const organizationId = rep?.organization_id || rep?.organizations?.id;

      console.log("🎯 ORGANIZATION_ID FINAL =>", organizationId);

      if (!organizationId) {
        console.error("❌ Estrutura completa do representante:", JSON.stringify(rep, null, 2));
        toast.error("Não foi possível identificar sua organização. Verifique se o cadastro está completo.");
        setProcessing(false);
        return;
      }

      // Limpar e formatar telefone
      const cleanPhone = (rep?.users?.phone || "").replace(/\D/g, "");
      const areaCode = cleanPhone.slice(0, 2) || "11";
      const phoneNumber = cleanPhone.slice(2) || "999999999";

      // Limpar número do cartão
      const cleanCardNumber = cardData.number.replace(/\D/g, "");

      // Normalizar nome do titular
      const cleanHolderName = cardData.holder_name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      const body = {
        organization_id: Number(organizationId),
        plan_id: selectedPlan.id,
        billing_type: selectedBilling,
        payment_method: "credit_card",
        amount: Math.round(finalPrice),
        slug,
        customer: {
          name: (rep?.users?.username || "Cliente")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim(),
          email: rep?.users?.email || "",
          document: (rep?.organizations?.document_number || "").replace(/\D/g, ""),
          type: rep?.organizations?.document_type === "cnpj" ? "company" : "individual",
          phones: {
            mobile_phone: {
              country_code: "55",
              area_code: areaCode,
              number: phoneNumber,
            }
          }
        },
        card: {
          holder_name: cleanHolderName,
          number: cleanCardNumber,
          exp_month: parseInt(cardData.exp_month),
          exp_year: parseInt(cardData.exp_year),
          cvv: cardData.cvv,
          billing_address: {
            line_1: rep?.organizations?.address || "Rua Exemplo, 123",
            zip_code: (rep?.organizations?.zip_code || "01310100").replace(/\D/g, ""),
            city: rep?.organizations?.city || "São Paulo",
            state: rep?.organizations?.state || "SP",
            country: "BR"
          }
        },
      };

      console.log("📤 Payload sendo enviado:", JSON.stringify(body, null, 2));

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
      console.error("❌ Erro completo:", err);
      console.error("❌ Resposta da API:", err.response?.data);
      
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.errors?.[0]?.message
        || err.message 
        || "Erro ao criar assinatura";
      
      toast.error(errorMessage);
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

<p
  onClick={() => window.location.href = `/${slug}/login`}
  className="fixed top-4 right-4 cursor-pointer text-sm font-medium text-gray-800 hover:underline z-50"
>
  Assinar depois
</p>

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
                  <li>✔ Landing page com CMS</li>
                  <li>✔ Galeria de fotos</li>
                  <li>✔ Painel para o cliente</li>
                  <li>✔ Painel administrativo</li>
                  <li>✔ Relatórios básicos em PDF/CSV</li>
                  <li>✔ Controle de cupons</li>
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
                  className="w-full text-white py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: BRAND }}
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
                  <li>✔ Integração com Google Agenda</li>
                  <li>✔ Integração com Google meet</li>
                  <li>✔ treinamento e suporte</li>
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
                  className="w-full text-white py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: BRAND }}
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
                  <li>✔ Suporte 24h</li>
                  <li>✔ Sugestão e priorização de novas funcionalidades</li>
                  <li>✔ Gestão de assinaturas</li>
                  <li>✔ Pagamento antecipado no agendamento</li>
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
                  className="w-full text-white py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: BRAND }}
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

            <div className="flex justify-center">
              <CreditCardComponent name={cardData.holder_name} number={cardData.number} month={cardData.exp_month} year={cardData.exp_year} cvv={cardData.cvv}/>
            </div>

            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <CreditCard size={20} /> Dados do Cartão
            </h2>

            <div className="border rounded-xl p-4 bg-gray-50">
              <label className="font-medium text-gray-900 text-sm">
                Cupom de desconto
              </label>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Digite seu cupom"
                  className="w-full min-w-0 flex-1 border rounded-lg p-3 text-gray-900"
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg text-white font-semibold whitespace-nowrap"
                  style={{ backgroundColor: BRAND }}
                >
                  Aplicar
                </button>
              </div>

              {discountType && (
                <p className="mt-2 text-green-600 font-semibold">
                  Desconto aplicado: {discountValue}
                  {discountType === "percentage" ? "%" : "R$"}
                </p>
              )}
            </div>


            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="font-medium text-gray-900 text-sm">Nome do Titular</label>
                <input
                  type="text"
                  placeholder="ANDRE F SANTOS"
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
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  value={cardData.number}
                  onChange={(e) => {
                    // Remove tudo que não é número
                    const value = e.target.value.replace(/\D/g, "");
                    // Adiciona espaços a cada 4 dígitos para melhor visualização
                    const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardData({ ...cardData, number: formatted });
                  }}
                  className="w-full border rounded-lg p-3 mt-1 text-gray-900"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="font-medium text-gray-900 text-sm">Mês</label>
                  <input
                    type="text"
                    required
                    placeholder="MM"
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
                    placeholder="YYYY"
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
                    placeholder="CVV"
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
