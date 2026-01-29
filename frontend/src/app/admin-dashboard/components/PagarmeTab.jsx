'use client';

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiXCircle, FiTrash2 } from "react-icons/fi";
import dynamic from "next/dynamic";
import { toast } from 'react-toastify'
import { useConfirm } from "@/components/ConfirmDialogProvider";

const Modal = dynamic(() => import("./PagarmeTabModal"), { ssr: false });

export default function PagarmeTab() {
  const API = `${process.env.NEXT_PUBLIC_API_URL}/api/pagarme`;
  const primary = "#711b96";

  // ================================
  // STATES
  // ================================
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Modals
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);

  const [planToEdit, setPlanToEdit] = useState(null);

  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    interval: "month",
    interval_count: 1,
    minimum_price: 0,
    trial_period_days: 0,
    billing_type: "postpaid",
    payment_methods: ["credit_card"],
  });

  const { confirm } = useConfirm()

  // ================================
  // FETCH PLANS & SUBSCRIPTIONS
  // ================================
  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, []);

  async function fetchPlans() {
    try {
      setLoadingPlans(true);
      const res = await fetch(`${API}/plans`);
      const json = await res.json();

      // Pagar.me v5 retorna { data: [...] }
      setPlans(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlans(false);
    }
  }

  async function fetchSubscriptions() {
    try {
      setLoadingSubs(true);
      const res = await fetch(`${API}/subscriptions`);
      const json = await res.json();

      setSubscriptions(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  }

  // ================================
  // CREATE PLAN
  // ================================
  async function createPlan(e) {
    e.preventDefault();

    const payload = {
      ...newPlan,
      interval_count: Number(newPlan.interval_count),
      minimum_price: Number(newPlan.minimum_price),
      trial_period_days: Number(newPlan.trial_period_days),

      items: [
        {
          name: newPlan.name,
          quantity: 1,
          pricing_scheme: {
            price: Number(newPlan.minimum_price),
          },
        },
      ],
    };

    const res = await fetch(`${API}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return toast.error("Erro ao criar plano");

    await fetchPlans();
    setShowCreatePlan(false);

    setNewPlan({
      name: "",
      description: "",
      interval: "month",
      interval_count: 1,
      minimum_price: 0,
      trial_period_days: 0,
      billing_type: "postpaid",
      payment_methods: ["credit_card"],
    });
  }

  // ================================
  // UPDATE PLAN
  // ================================
  async function updatePlan(e) {
    e.preventDefault();

    const payload = {
      ...planToEdit,
      minimum_price: Number(planToEdit.minimum_price),
      interval_count: Number(planToEdit.interval_count),
      trial_period_days: Number(planToEdit.trial_period_days),
    };

    const res = await fetch(`${API}/plans/${planToEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return toast.error("Erro ao atualizar plano");

    await fetchPlans();
    setShowEditPlan(false);
  }

  async function deletePlan(id) {
    // if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    const confirmed = await confirm({
      title: "Excluir plano",
      message: "Tem certeza que deseja excluir este plano?"
    });

    if (!confirmed) return

    try {
      const res = await fetch(`${API}/plans/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) return toast.error("Erro ao excluir plano.");

      await fetchPlans();
      toast.success("Plano excluído com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro interno ao excluir plano.");
    }
  }

  // ================================
  // CANCEL SUBSCRIPTION
  // ================================
  async function cancelSubscription(id) {
    // if (!confirm("Deseja cancelar esta assinatura?")) return;

    const confirmed = await confirm({
      title: "Cancelar assinatura",
      message: "Deseja cancelar esta assinatura?"
    });

    if (!confirmed) return

    await fetch(`${API}/subscriptions/${id}/cancel`, {
      method: "POST",
    });

    fetchSubscriptions();
    toast.success("Assinatura cancelada.");
  }

  // ================================
  // UI — STRIPE PREMIUM STYLE
  // ================================
  return (
    <div className="space-y-12">

      <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">
        Gestão Recorrente — Pagar.me
      </h1>

      {/* ===================================== */}
      {/* PLANS TABLE */}
      {/* ===================================== */}
      <section className="bg-white border shadow-sm rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            Planos
          </h2>

          <button
            onClick={() => setShowCreatePlan(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: primary }}
          >
            <FiPlus size={18} /> Criar Plano
          </button>
        </div>

        {loadingPlans ? (
          <div className="text-gray-500 animate-pulse">Carregando planos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    ID
                  </th>
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    Nome
                  </th>
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    Preço
                  </th>
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    Tipo
                  </th>
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    Intervalo
                  </th>
                  <th className="py-3 px-2 text-left font-semibold text-gray-800 uppercase tracking-wide text-xs">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                  >
                    <td className="py-3 px-2 font-medium text-gray-700">{plan.id}</td>
                    <td className="py-3 px-2 text-gray-800">{plan.name}</td>
                    <td className="py-3 px-2 text-gray-800">{formatBRL(plan.minimum_price)}</td>
                    <td className="py-3 px-2 capitalize text-gray-800">{plan.billing_type}</td>
                    <td className="py-3 px-2 text-gray-800">
                      {plan.interval}/{plan.interval_count}
                    </td>

                    <td className="py-3 px-2 flex gap-3">
                      {/* EDITAR */}
                      <button
                        onClick={() => {
                          setPlanToEdit(plan);
                          setShowEditPlan(true);
                        }}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-black transition"
                      >
                        <FiEdit2 size={18} />
                      </button>

                      {/* EXCLUIR */}
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 transition"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}

                {plans.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-gray-500">
                      Nenhum plano encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================== */}
      {/* SUBSCRIPTIONS TABLE */}
      {/* ===================================== */}
      <section className="bg-white border shadow-sm rounded-xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 tracking-tight">
          Assinaturas
        </h2>

        {loadingSubs ? (
          <div className="text-gray-500 animate-pulse">Carregando assinaturas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Cliente</th>
                  <th className="py-2 text-left">Plano</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Ações</th>
                </tr>
              </thead>

              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b">
                    <td className="py-2">{sub.id}</td>
                    <td className="py-2">{sub.customer?.name}</td>
                    <td className="py-2">{sub.items?.[0]?.plan?.name}</td>
                    <td className="py-2">{sub.status}</td>

                    <td className="py-2">
                      <button
                        onClick={() => cancelSubscription(sub.id)}
                        className="p-2 rounded-lg border text-red-600 hover:bg-red-50 transition"
                      >
                        <FiXCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}

                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-500">
                      Nenhuma assinatura encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================== */}
      {/* CREATE PLAN MODAL */}
      {/* ===================================== */}
      {showCreatePlan && (
        <Modal title="Criar Plano" onClose={() => setShowCreatePlan(false)}>
          <PlanForm 
            data={newPlan}
            setData={setNewPlan}
            onSubmit={createPlan}
          />
        </Modal>
      )}

      {/* ===================================== */}
      {/* EDIT PLAN MODAL */}
      {/* ===================================== */}
      {showEditPlan && planToEdit && (
        <Modal title="Editar Plano" onClose={() => setShowEditPlan(false)}>
          <PlanForm 
            data={planToEdit}
            setData={setPlanToEdit}
            onSubmit={updatePlan}
          />
        </Modal>
      )}
    </div>
  );
}

/* ================================ */
/* UTILS */
/* ================================ */
function formatBRL(cents) {
  if (!cents) return "R$ 0,00";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ================================ */
/* PLAN FORM — PREMIUM STYLE */
/* ================================ */
function PlanForm({ data, setData, onSubmit }) {
  function update(field, value) {
    setData({ ...data, [field]: value });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">

      <Input label="Nome" value={data.name} onChange={(v) => update("name", v)} />
      <Input label="Descrição" value={data.description} onChange={(v) => update("description", v)} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Intervalo" value={data.interval} onChange={(v) => update("interval", v)} />
        <Input label="Interval Count" type="number" value={data.interval_count} onChange={(v) => update("interval_count", v)} />
      </div>

      <Input label="Preço (centavos)" type="number" value={data.minimum_price} onChange={(v) => update("minimum_price", v)} />

      <Input label="Trial (dias)" type="number" value={data.trial_period_days} onChange={(v) => update("trial_period_days", v)} />

      {/* Billing Type */}
      <label className="block">
        <span className="text-sm font-medium text-gray-900">Tipo de Cobrança</span>

        <select
          value={data.billing_type}
          onChange={(e) => update("billing_type", e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300
          bg-white text-gray-900 focus:ring-2 focus:ring-purple-200 focus:border-purple-500
          outline-none transition shadow-sm"
        >
          <option value="postpaid">Pós Pago</option>
          <option value="prepaid">Pré Pago</option>
        </select>
      </label>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-white shadow-sm"
          style={{ backgroundColor: "#711b96" }}
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  function handleChange(e) {
    let val = e.target.value;

    // Converte formatos brasileiros para centavos
    if (type === "number") {
      // Remove espaços
      val = val.replace(/\s/g, "");

      // 49,90 → 4990
      if (val.includes(",")) {
        val = val.replace(",", ".");
      }

      // Se tiver ponto → trata como decimal
      if (val.includes(".")) {
        const asFloat = parseFloat(val);
        if (!isNaN(asFloat)) {
          val = Math.round(asFloat * 100); // ex: 49.90 * 100 = 4990
        }
      }
    }

    onChange(val);
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300
        bg-white text-gray-900 placeholder-gray-400
        focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none
        transition-all shadow-sm"
      />
    </label>
  );
}
