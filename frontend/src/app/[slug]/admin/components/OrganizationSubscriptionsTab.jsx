/**
 * OrganizationSubscriptionsTab
 * 
 * Componente para gerenciamento de assinaturas da organização
 * 
 * Variáveis de ambiente necessárias no .env.local:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Chave pública do Stripe (necessária para criar PaymentMethods)
 * - NEXT_PUBLIC_API_URL: URL base da API (ex: http://localhost:3000)
 */

"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "react-toastify";
import {
  FiCreditCard,
  FiCheck,
  FiX,
  FiArrowRight,
  FiRefreshCcw,
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
  FiUser,
  FiCalendar,
  FiShield,
} from "react-icons/fi";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function OrganizationSubscriptionsTab({ org, user }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const strong = palette?.strong_color || "#5E3BEE";
  const light = palette?.light_color || "#F5F5F5";

  const [plans, setPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { confirm } = useConfirm();

  // Buscar planos e assinatura ativa
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, subscriptionRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/plans`),
          fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/active`
          ),
        ]);

        const plansData = await plansRes.json();
        const subscriptionData = await subscriptionRes.json();

        setPlans(plansData.data || []);
        setActiveSubscription(subscriptionData.data || null);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar informações");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [org.slug_organization]);

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const refreshActiveSubscription = async () => {
    const subscriptionRes = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/active`
    );
    const subscriptionData = await subscriptionRes.json();
    setActiveSubscription(subscriptionData.data || null);
  };

  const handleChangePlan = async (newPlanId) => {
    const confirmed = await confirm({
      title: "Trocar de plano",
      message: "Deseja trocar seu plano?",
      confirmColor: strong,
    });

    if (!confirmed) return

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/change-plan`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPriceId: newPlanId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erro ao trocar plano");
        return;
      }

      toast.success("Plano alterado com sucesso!");

      // Recarregar dados
      const subscriptionRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/active`
      );
      const subscriptionData = await subscriptionRes.json();
      setActiveSubscription(subscriptionData.data || null);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao trocar plano");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async (immediate = false) => {
    const message = immediate
      ? "Cancelar assinatura imediatamente?"
      : "Cancelar assinatura ao final do período?";

    const confirmed = await confirm({
      title: "Cancelar assinatura",
      message: message,
      confirmVariant: "danger",
      confirmColor: strong,
    });

    if (!confirmed) return

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ immediate }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erro ao cancelar assinatura");
        return;
      }

      toast.success(immediate ? "Assinatura cancelada!" : "Assinatura será cancelada ao final do período");

      // Recarregar dados
      const subscriptionRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/active`
      );
      const subscriptionData = await subscriptionRes.json();
      setActiveSubscription(subscriptionData.data || null);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao cancelar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivateSubscription = async () => {
    const confirmed = await confirm({
      title: "Reativar a assinatura",
      message: "Deseja reativar sua assinatura?",
      confirmVariant: "primary",
      confirmColor: strong,
    });

    if (!confirmed) return

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/reactivate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erro ao reativar assinatura");
        return;
      }

      toast.success("Assinatura reativada!");

      // Recarregar dados
      const subscriptionRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}/active`
      );
      const subscriptionData = await subscriptionRes.json();
      setActiveSubscription(subscriptionData.data || null);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao reativar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações de assinatura...</p>
        </div>
      </div>
    );
  }

  const periodStart = activeSubscription?.current_period_start
    ? new Date(activeSubscription.current_period_start)
    : null;
  const periodEnd = activeSubscription?.current_period_end
    ? new Date(activeSubscription.current_period_end)
    : null;
  const isActiveByPeriod = !!(
    periodStart &&
    periodEnd &&
    new Date() >= periodStart &&
    new Date() <= periodEnd
  );

  return (
    <div className="space-y-8">
      {/* Assinatura Ativa */}
      {activeSubscription ? (
        <div className="bg-white rounded-xl shadow-lg border border-green-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiCheckCircle size={24} className="text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Assinatura Ativa</h2>
              </div>
              <p className="text-gray-600">
                {activeSubscription.stripe?.items.data[0]?.price.product.name ||
                  "Seu plano atual"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                activeSubscription.status === "active" || isActiveByPeriod
                  ? "bg-green-100 text-green-800"
                  : activeSubscription.status === "trialing"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {activeSubscription.status === "active" || isActiveByPeriod
                  ? "Ativa"
                  : activeSubscription.status === "trialing"
                  ? "Em Teste"
                  : "Pausada"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Preço Mensal */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Valor Mensal</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {(activeSubscription.stripe?.items.data[0]?.price.unit_amount / 100).toFixed(2)}
              </p>
            </div>

            {/* Próxima Cobrança */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Próxima Cobrança</p>
              <p className="text-lg font-semibold text-gray-900">
                {periodEnd ? periodEnd.toLocaleDateString("pt-BR") : "-"}
              </p>
            </div>

            {/* Período Atual */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Período Atual</p>
              <p className="text-sm font-semibold text-gray-900">
                {periodStart ? periodStart.toLocaleDateString("pt-BR") : "-"} — {periodEnd ? periodEnd.toLocaleDateString("pt-BR") : "-"}
              </p>
            </div>

            {/* Trial */}
            {activeSubscription.stripe?.trial_end && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">Período de Teste</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(activeSubscription.stripe.trial_end * 1000).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}

            {/* Renovação Automática */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Renovação Automática</p>
              <div className="flex items-center gap-2">
                {activeSubscription.cancel_at_period_end ? (
                  <>
                    <FiX className="text-red-600" />
                    <span className="text-lg font-semibold text-red-600">Não</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="text-green-600" />
                    <span className="text-lg font-semibold text-green-600">Sim</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={processing}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-95 disabled:opacity-50 transition font-semibold shadow-sm"
            >
              <FiArrowRight size={18} />
              Trocar de Plano
            </button>

            <button
              type="button"
              disabled={processing}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition font-semibold"
            >
              <FiCreditCard size={18} />
              Atualizar Forma de Pagamento
            </button>

            {activeSubscription.cancel_at_period_end ? (
              <button
                onClick={handleReactivateSubscription}
                disabled={processing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-semibold"
              >
                <FiRefreshCcw size={18} />
                Reativar
              </button>
            ) : (
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={processing}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 transition font-semibold"
              >
                <FiX size={18} />
                Solicitar Cancelamento
              </button>
            )}
          </div>
        </div>
      ) : (
        // Sem Assinatura
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <FiCreditCard size={32} className="text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma Assinatura Ativa</h2>
          <p className="text-gray-600 mb-6">
            Escolha um plano para começar a usar todos os recursos da plataforma
          </p>
        </div>
      )}

      {/* Planos Disponíveis */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Planos Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border-2 overflow-hidden transition ${
                activeSubscription?.stripe?.items.data[0]?.price.id === plan.id
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {/* Destaque se plano ativo */}
              {activeSubscription?.stripe?.items.data[0]?.price.id === plan.id && (
                <div className="bg-green-500 text-white text-center py-2 text-sm font-semibold">
                  Plano Atual
                </div>
              )}

              <div className="p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2">{plan.productName}</h4>
                <p className="text-gray-600 text-sm mb-6">{plan.productDescription}</p>

                {/* Preço */}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-gray-900">
                    R$ {(plan.amount / 100).toFixed(2)}
                  </div>
                  <p className="text-gray-600 text-sm">
                    por {plan.interval === "month" ? "mês" : "ano"}
                  </p>
                </div>

                {/* Metadata */}
                {plan.trialDays && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      🎉 {plan.trialDays} dias de teste grátis
                    </p>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="space-y-3">
                  {activeSubscription?.stripe?.items.data[0]?.price.id === plan.id ? (
                    <button
                      disabled
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    >
                      <FiCheck size={18} />
                      Plano Atual
                    </button>
                  ) : !activeSubscription ? (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={processing}
                      className="w-full px-4 py-3 text-white rounded-lg font-medium  disabled:opacity-50 transition flex items-center justify-center gap-2"
                      style={{backgroundColor: palette?.strong_color}}
                    >
                      <FiArrowRight size={18} />
                      Escolher Plano
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={processing}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      <FiArrowRight size={18} />
                      Trocar para este Plano
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && selectedPlan && (
        <Elements stripe={stripePromise} options={{ locale: "pt-BR" }}>
          <PaymentModal
            org={org}
            user={user}
            selectedPlan={selectedPlan}
            strong={strong}
            light={light}
            processing={processing}
            setProcessing={setProcessing}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={async () => {
              setShowPaymentModal(false);
              setSelectedPlan(null);
              await refreshActiveSubscription();
            }}
          />
        </Elements>
      )}
    </div>
  );
}

function PaymentModal({
  org,
  user,
  selectedPlan,
  strong,
  light,
  processing,
  setProcessing,
  onClose,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [cardholderName, setCardholderName] = useState("");
  const [cardError, setCardError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);

  const handleCreateSubscription = async () => {
    if (!selectedPlan) {
      toast.error("Selecione um plano");
      return;
    }

    if (!user?.email) {
      toast.error("Email do usuário não encontrado");
      return;
    }

    if (!stripe || !elements) {
      toast.error("Stripe não inicializado");
      return;
    }

    if (!cardholderName || cardholderName.trim().length < 3) {
      setCardError("Nome do titular inválido");
      return;
    }

    if (!cardComplete) {
      toast.error("Dados do cartão incompletos");
      return;
    }

    setProcessing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.error("Cartão não carregado");
        return;
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: user.email,
        },
      });

      if (pmError || !paymentMethod?.id) {
        toast.error(pmError?.message || "Erro ao validar cartão");
        return;
      }

      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.slug_organization}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: selectedPlan.id,
            customerEmail: user.email,
            paymentMethodId: paymentMethod.id,
            organizationData: {
              name: org.name,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar assinatura");
        return;
      }

      const clientSecret = data.clientSecret || data.client_secret;

      if (clientSecret) {
        const confirmResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethod.id,
        });

        if (confirmResult.error) {
          toast.error(confirmResult.error.message || "Erro ao confirmar pagamento");
          return;
        }
      }

      toast.success("✅ Assinatura criada com sucesso!");
      await onSuccess();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header com cor da organização */}
        <div className="p-8 text-white relative" style={{ background: strong }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-3xl font-bold">Finalizar Compra</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
              <FiX size={24} />
            </button>
          </div>
          <p className="text-white/80">Complete seus dados para ativar a assinatura</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Resumo do Plano */}
            <div className="md:col-span-1 space-y-4">
              <div className="rounded-xl p-6 text-white" style={{ background: light }}>
                <p className="text-sm opacity-90 mb-3">Seu Plano</p>
                <h4 className="text-xl font-bold mb-4">{selectedPlan.productName}</h4>

                <div className="space-y-3 text-sm border-t border-white/20 pt-4">
                  <div className="flex justify-between">
                    <span className="opacity-90">Valor mensal:</span>
                    <span className="font-bold">R$ {(selectedPlan.amount / 100).toFixed(2)}</span>
                  </div>

                  {selectedPlan.trialDays && (
                    <div className="flex justify-between bg-white/10 px-3 py-2 rounded">
                      <span className="opacity-90">Teste grátis:</span>
                      <span className="font-bold">{selectedPlan.trialDays} dias</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-white/20 text-base font-bold">
                    <span>Total hoje:</span>
                    <span>
                      {selectedPlan.trialDays ? "R$ 0,00" : `R$ ${(selectedPlan.amount / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {selectedPlan.trialDays && (
                  <div className="mt-4 p-3 bg-white/20 rounded-lg text-sm">
                    <p>🎉 Comece seu período de teste grátis agora</p>
                  </div>
                )}
              </div>

              {/* Segurança */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiLock size={16} />
                <span>Pagamento seguro</span>
              </div>
            </div>

            {/* Formulário de Pagamento */}
            <div className="md:col-span-2">
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateSubscription();
                }}
              >
                {/* Informação de Segurança */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <FiShield className="text-green-600 mt-0.5 shrink-0" size={18} />
                  <div className="text-sm text-green-700">
                    <p className="font-semibold mb-1">✓ Dados Seguros</p>
                    <p>Seus dados são transmitidos criptografados ao Stripe e nunca armazenados em nossos servidores.</p>
                  </div>
                </div>

                {/* Dados do Usuário (somente leitura) */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-3 font-semibold">Dados da Conta</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FiUser size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-700">
                        <strong>{user?.name || "Usuário"}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCreditCard size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-700">{user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Nome do Titular */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome do Titular do Cartão
                  </label>
                  <input
                    type="text"
                    placeholder="Como aparece no cartão"
                    value={cardholderName}
                    onChange={(e) => {
                      setCardholderName(e.target.value);
                      if (cardError) setCardError("");
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                      cardError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
                    }`}
                  />
                  {cardError && <p className="text-xs text-red-600 mt-1">{cardError}</p>}
                </div>

                {/* Cartão via Stripe Elements */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Dados do Cartão</label>
                  <div className="w-full px-4 py-3 border rounded-lg focus-within:ring-2 focus-within:ring-blue-200 border-gray-300">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: "16px",
                            color: "#111827",
                            "::placeholder": { color: "#9CA3AF" },
                          },
                          invalid: { color: "#DC2626" },
                        },
                        hidePostalCode: true,
                      }}
                      onChange={(event) => {
                        setCardComplete(event.complete);
                        if (event.error?.message) {
                          setCardError(event.error.message);
                        } else if (cardError) {
                          setCardError("");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Informação de Cobrança */}
                <div className="border-2 rounded-lg p-4" style={{ borderColor: strong }}>
                  <div className="flex items-center gap-2 mb-3">
                    <FiCheckCircle size={18} style={{ color: strong }} />
                    <span className="font-semibold text-gray-900">
                      {selectedPlan.trialDays
                        ? `Teste grátis por ${selectedPlan.trialDays} dias, depois R$ ${(selectedPlan.amount / 100).toFixed(2)}/mês`
                        : `Cobrança de R$ ${(selectedPlan.amount / 100).toFixed(2)}/mês`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Seu cartão será cobrado automaticamente. Você pode cancelar a qualquer momento.
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-3 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    style={{ background: strong }}
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FiLock size={18} />
                        Ativar Assinatura
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Ao continuar, você concorda com nossos Termos de Serviço
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
