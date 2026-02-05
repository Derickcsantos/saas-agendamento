"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { CheckCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const BRAND = "#5E3BEE";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

export default function EscolherPlano({ slug }) {
  const [step, setStep] = useState(1);
  const [representante, setRepresentante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState("prepaid");
  const [clientSecret, setClientSecret] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ==========================================
  // 🔎 Carregar planos
  // ==========================================
  const loadPlans = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/prices`
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

  const getPlanPrice = (name, billingType) => {
    const normalized = name.toLowerCase();
    return plans.find((p) => {
      const productName = p?.product?.name?.toLowerCase() || "";
      const metaBilling = p?.metadata?.billing_type;
      const billingOk = metaBilling ? metaBilling === billingType : true;
      return productName.includes(normalized) && billingOk;
    });
  };

  const finalPrice = useMemo(() => {
    if (!selectedPlan) return 0;

    const base = selectedPlan?.unit_amount || 0;

    if (!discountType) return base;

    if (discountType === "percentage") {
      return Math.max(0, base - (base * discountValue / 100));
    }

    if (discountType === "fixed") {
      return Math.max(0, base - discountValue * 100);
    }

    return base;
  }, [selectedPlan, discountType, discountValue]);

  const basicPlan = useMemo(() => getPlanPrice("básico", selectedBilling) || getPlanPrice("basico", selectedBilling), [plans, selectedBilling]);
  const plusPlan = useMemo(() => getPlanPrice("plus", selectedBilling), [plans, selectedBilling]);
  const premiumPlan = useMemo(() => getPlanPrice("premium", selectedBilling), [plans, selectedBilling]);



  const createCheckoutSession = async () => {
    if (!selectedPlan || !slug) return;
    if (!representante) return;

    if (!finalPrice || finalPrice <= 0) {
      toast.error("Valor final inválido");
      return;
    }

    setCheckoutLoading(true);

    try {
      const rep = representante;
      const organizationId = rep?.organization_id || rep?.organizations?.id;

      if (!organizationId) {
        toast.error("Não foi possível identificar sua organização.");
        return;
      }

      const returnUrl = `${window.location.origin}/${slug}/login?session_id={CHECKOUT_SESSION_ID}`;
      const useCustomPrice = Boolean(discountType);

      const payload = {
        organization_id: organizationId,
        customer_email: rep?.users?.email || "",
        return_url: returnUrl,
        price_id: useCustomPrice ? undefined : selectedPlan.id,
        amount: useCustomPrice ? Math.round(finalPrice) : undefined,
        interval: selectedPlan?.recurring?.interval || "month",
        interval_count: selectedPlan?.recurring?.interval_count || 1,
        plan_name: selectedPlan?.product?.name || "Plano",
        plan_description: selectedPlan?.product?.description || "",
      };

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/checkout/session`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      setClientSecret(res.data.client_secret);
    } catch (err) {
      console.error("Erro ao iniciar checkout:", err);
      toast.error("Erro ao iniciar checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (step === 2) {
      setClientSecret(null);
      createCheckoutSession();
    }
  }, [step, selectedPlan, discountType, discountValue, representante]);

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
                  selectedPlan?.id && basicPlan?.id && selectedPlan.id === basicPlan.id
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Básico</h3>

                {/* PREÇO */}
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(basicPlan?.unit_amount ?? 5000)}
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
                    selectedPlan?.id && basicPlan?.id && selectedPlan.id === basicPlan.id
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
                    if (!basicPlan) {
                      toast.error("Plano Básico não encontrado no Stripe");
                      return;
                    }
                    setSelectedPlan(basicPlan);
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
                  selectedPlan?.id && plusPlan?.id && selectedPlan.id === plusPlan.id
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Plus</h3>

                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(plusPlan?.unit_amount ?? 9990)}
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
                    selectedPlan?.id && plusPlan?.id && selectedPlan.id === plusPlan.id
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
                    if (!plusPlan) {
                      toast.error("Plano Plus não encontrado no Stripe");
                      return;
                    }
                    setSelectedPlan(plusPlan);
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
                  selectedPlan?.id && premiumPlan?.id && selectedPlan.id === premiumPlan.id
                    ? "border-purple-500 border-2"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>

                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(premiumPlan?.unit_amount ?? 14990)}
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
                    selectedPlan?.id && premiumPlan?.id && selectedPlan.id === premiumPlan.id
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
                    if (!premiumPlan) {
                      toast.error("Plano Premium não encontrado no Stripe");
                      return;
                    }
                    setSelectedPlan(premiumPlan);
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
              <p className="mt-2 text-gray-700">{selectedPlan?.product?.name || "Plano"}</p>
              <p className="font-semibold text-gray-900 mt-1">
                {selectedPlan?.unit_amount
                  ? formatPrice(selectedPlan.unit_amount)
                  : "R$ --"}
                / mês
              </p>
              <p className="text-sm text-gray-600">
                Tipo: <strong>{selectedPlan?.metadata?.billing_type || selectedBilling}</strong>
              </p>

              <button
                onClick={() => setStep(1)}
                className="text-sm text-purple-600 underline mt-2"
              >
                Trocar plano
              </button>
            </div>

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

            <div className="border rounded-xl p-4 bg-white shadow-sm">
              {checkoutLoading && (
                <p className="text-sm text-gray-500">Gerando checkout seguro...</p>
              )}

              {clientSecret && (
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
