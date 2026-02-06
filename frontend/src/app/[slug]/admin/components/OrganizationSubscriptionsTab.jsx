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
import { toast } from "react-toastify";
import {
  FiCreditCard,
  FiCheck,
  FiX,
  FiArrowRight,
  FiRefreshCcw,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiLock,
  FiUser,
  FiCalendar,
  FiShield,
} from "react-icons/fi";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

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
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  });
  const [cardErrors, setCardErrors] = useState({});

  // Buscar planos e assinatura ativa
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, subscriptionRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/plans`),
          fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/active`
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
  }, [org.id]);

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const validateCard = () => {
    const errors = {};

    // Validar número do cartão (Luhn)
    const cardNum = cardData.cardNumber.replace(/\s+/g, "");
    if (!cardNum || cardNum.length < 13 || cardNum.length > 19) {
      errors.cardNumber = "Número do cartão inválido";
    }

    // Validar nome do titular
    if (!cardData.cardholderName || cardData.cardholderName.trim().length < 3) {
      errors.cardholderName = "Nome do titular inválido";
    }

    // Validar expiração
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const expYear = parseInt(cardData.expiryYear, 10);
    const expMonth = parseInt(cardData.expiryMonth, 10);

    if (!expMonth || expMonth < 1 || expMonth > 12) {
      errors.expiryMonth = "Mês inválido";
    }

    if (!expYear || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.expiryYear = "Cartão expirado";
    }

    // Validar CVC
    if (!cardData.cvc || cardData.cvc.length < 3 || cardData.cvc.length > 4) {
      errors.cvc = "CVC inválido";
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlan) {
      toast.error("Selecione um plano");
      return;
    }

    if (!user?.email) {
      toast.error("Email do usuário não encontrado");
      return;
    }

    setProcessing(true);
    try {
      // 1. Criar PaymentMethod no Stripe
      const paymentMethodResponse = await fetch(
        "https://api.stripe.com/v1/payment_methods",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
          },
          body: new URLSearchParams({
            type: "card",
            "card[number]": cardData.cardNumber.replace(/\s+/g, ""),
            "card[exp_month]": cardData.expiryMonth,
            "card[exp_year]": cardData.expiryYear,
            "card[cvc]": cardData.cvc,
            "billing_details[name]": cardData.cardholderName,
            "billing_details[email]": user.email,
          }),
        }
      );

      if (!paymentMethodResponse.ok) {
        const error = await paymentMethodResponse.json();
        toast.error(error.error?.message || "Erro ao processar cartão");
        return;
      }

      const paymentMethod = await paymentMethodResponse.json();

      // 2. Criar assinatura no backend
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}`,
        {
          method: "POST",
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

      // 3. Se precisar confirmar pagamento (SCA/3D Secure)
      if (data.client_secret) {
        const confirmResponse = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/confirm-payment`,
          {
            method: "POST",
            body: JSON.stringify({
              clientSecret: data.client_secret,
            }),
          }
        );

        if (!confirmResponse.ok) {
          const confirmError = await confirmResponse.json();
          toast.error(confirmError.error || "Erro ao confirmar pagamento");
          return;
        }
      }

      toast.success("✅ Assinatura criada com sucesso!");
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setCardData({
        cardNumber: "",
        cardholderName: "",
        expiryMonth: "",
        expiryYear: "",
        cvc: "",
      });

      // Recarregar dados
      const subscriptionRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/active`
      );
      const subscriptionData = await subscriptionRes.json();
      setActiveSubscription(subscriptionData.data || null);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePlan = async (newPlanId) => {
    if (!window.confirm("Tem certeza que deseja trocar de plano?")) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/change-plan`,
        {
          method: "PATCH",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/active`
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

    if (!window.confirm(message)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/cancel`,
        {
          method: "POST",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/active`
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
    if (!window.confirm("Reativar assinatura?")) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/reactivate`,
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-subscriptions/${org.id}/active`
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
                activeSubscription.status === "active"
                  ? "bg-green-100 text-green-800"
                  : activeSubscription.status === "trialing"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {activeSubscription.status === "active"
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
                {new Date(activeSubscription.current_period_end * 1000).toLocaleDateString("pt-BR")}
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
          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              <FiArrowRight size={18} />
              Trocar de Plano
            </button>

            {activeSubscription.cancel_at_period_end ? (
              <button
                onClick={handleReactivateSubscription}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
              >
                <FiRefreshCcw size={18} />
                Reativar
              </button>
            ) : (
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition font-medium"
              >
                <FiX size={18} />
                Cancelar ao Final do Período
              </button>
            )}

            <button
              onClick={() => handleCancelSubscription(true)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition font-medium"
            >
              <FiAlertCircle size={18} />
              Cancelar Agora
            </button>
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
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header com cor da organização */}
            <div
              className="p-8 text-white relative"
              style={{ background: strong }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-3xl font-bold">Finalizar Compra</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <FiX size={24} />
                </button>
              </div>
              <p className="text-white/80">Complete seus dados para ativar a assinatura</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Resumo do Plano */}
                <div className="md:col-span-1 space-y-4">
                  <div
                    className="rounded-xl p-6 text-white"
                    style={{ background: light }}
                  >
                    <p className="text-sm opacity-90 mb-3">Seu Plano</p>
                    <h4 className="text-xl font-bold mb-4">{selectedPlan.productName}</h4>
                    
                    <div className="space-y-3 text-sm border-t border-white/20 pt-4">
                      <div className="flex justify-between">
                        <span className="opacity-90">Valor mensal:</span>
                        <span className="font-bold">
                          R$ {(selectedPlan.amount / 100).toFixed(2)}
                        </span>
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
                  <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleCreateSubscription(); }}>
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
                          <span className="text-sm text-gray-700">
                            {user?.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Número do Cartão */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Número do Cartão
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        value={cardData.cardNumber}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "");
                          value = value.replace(/(\d{4})/g, "$1 ").trim();
                          setCardData({ ...cardData, cardNumber: value });
                          if (cardErrors.cardNumber) setCardErrors({ ...cardErrors, cardNumber: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                          cardErrors.cardNumber
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:ring-blue-200"
                        }`}
                      />
                      {cardErrors.cardNumber && (
                        <p className="text-xs text-red-600 mt-1">{cardErrors.cardNumber}</p>
                      )}
                    </div>

                    {/* Nome do Titular */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Nome do Titular do Cartão
                      </label>
                      <input
                        type="text"
                        placeholder="Como aparece no cartão"
                        value={cardData.cardholderName}
                        onChange={(e) => {
                          setCardData({ ...cardData, cardholderName: e.target.value });
                          if (cardErrors.cardholderName) setCardErrors({ ...cardErrors, cardholderName: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                          cardErrors.cardholderName
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:ring-blue-200"
                        }`}
                      />
                      {cardErrors.cardholderName && (
                        <p className="text-xs text-red-600 mt-1">{cardErrors.cardholderName}</p>
                      )}
                    </div>

                    {/* Linha com Validade e CVC */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Validade */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          <FiCalendar size={14} className="inline mr-1" />
                          Validade
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="MM"
                            maxLength="2"
                            value={cardData.expiryMonth}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                              setCardData({ ...cardData, expiryMonth: value });
                              if (cardErrors.expiryMonth) setCardErrors({ ...cardErrors, expiryMonth: "" });
                            }}
                            className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:outline-none transition text-center ${
                              cardErrors.expiryMonth
                                ? "border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:ring-blue-200"
                            }`}
                          />
                          <span className="flex items-center text-gray-400">/</span>
                          <input
                            type="text"
                            placeholder="YY"
                            maxLength="2"
                            value={cardData.expiryYear}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                              setCardData({ ...cardData, expiryYear: value });
                              if (cardErrors.expiryYear) setCardErrors({ ...cardErrors, expiryYear: "" });
                            }}
                            className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:outline-none transition text-center ${
                              cardErrors.expiryYear
                                ? "border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:ring-blue-200"
                            }`}
                          />
                        </div>
                        {(cardErrors.expiryMonth || cardErrors.expiryYear) && (
                          <p className="text-xs text-red-600 mt-1">
                            {cardErrors.expiryMonth || cardErrors.expiryYear}
                          </p>
                        )}
                      </div>

                      {/* CVC */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          <FiShield size={14} className="inline mr-1" />
                          CVC
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          maxLength="4"
                          value={cardData.cvc}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setCardData({ ...cardData, cvc: value });
                            if (cardErrors.cvc) setCardErrors({ ...cardErrors, cvc: "" });
                          }}
                          className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:outline-none transition text-center ${
                            cardErrors.cvc
                              ? "border-red-500 focus:ring-red-200"
                              : "border-gray-300 focus:ring-blue-200"
                          }`}
                        />
                        {cardErrors.cvc && (
                          <p className="text-xs text-red-600 mt-1">{cardErrors.cvc}</p>
                        )}
                      </div>
                    </div>

                    {/* Informação de Cobrança */}
                    <div
                      className="border-2 rounded-lg p-4"
                      style={{ borderColor: strong }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FiCheckCircle size={18} style={{ color: strong }} />
                        <span className="font-semibold text-gray-900">
                          {selectedPlan.trialDays ? `Teste grátis por ${selectedPlan.trialDays} dias, depois R$ ${(selectedPlan.amount / 100).toFixed(2)}/mês` : `Cobrança de R$ ${(selectedPlan.amount / 100).toFixed(2)}/mês`}
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
                        onClick={() => setShowPaymentModal(false)}
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
      )}
    </div>
  );
}
