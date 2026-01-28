"use client";
import { useEffect, useState } from "react";
import { toast } from 'react-toastify'
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import Select from "react-select"

export default function SubscriptionsTab({ org }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [usersList, setUserList] = useState([])
  const [planList, setPlanList] = useState([])
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const { palette } = useOrganizationColors(org.slug_organization);
  const [form, setForm] = useState({
    idUser: null,
    idPlan: null,
    methodPayment: "",
    isActive: null,
    startDate: ""
  });
  const [showModal, setShowModal] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState(null); // histórico carregado
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  const optionsUser = usersList.map((user) => ({
    value: user.id,
    label: user.username,
  }));

  const optionsPlan = planList.map((plan) => ({
    value: plan.id_plansubscription,
    label: plan.name_plansubscription,
  }));

  const methodPayment = [
    { name: "CRÉDITO" },
    { name: "DÉBITO" },
    { name: "PIX" }
  ]

  const apiBase = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/subscriptions/${org.slug_organization}`;
  const usersApi = `${process.env.NEXT_PUBLIC_API_URL}/api/users/${org.slug_organization}`
  const plansApi = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/plans/${org.slug_organization}/form-data`

  async function loadSubscriptions(query = "") {
    setLoading(true);
    try {
      const url = query ? `${apiBase}?search=${encodeURIComponent(query)}` : apiBase;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      setSubscriptions(data);
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
        const res = await fetch(usersApi, { credentials: "include" });
        const data = await res.json();

        setUserList(data);
    } catch (error) {
        console.error("Erro ao carregar usuários:", err);
        toast.error("Erro ao carregar usuários");
    }
  }

  async function loadPlans() {
    try {
        const res = await fetch(plansApi, { credentials: "include" });
        const data = await res.json();

        setPlanList(data);
    } catch (error) {
        console.error("Erro ao carregar planos:", err);
        toast.error("Erro ao carregar planos");
    }
  }

  async function loadHistory(subscriptionId) {
    setLoadingHistory(true)
    setShowModal(true)
    setSelectedHistory(null)

    setHistoryStartDate("")
    setHistoryEndDate("")

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/subscriptions/${org.slug_organization}/${subscriptionId}/history`, {
        credentials: "include"
      });

      if (!res.ok) throw new Error("Erro ao carregar histórico")

      const data = await res.json();

      setSelectedHistory(data);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      toast.error("Erro ao carregar histórico da assinatura");
      setSelectedHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadSubscriptions()
    loadUsers()
    loadPlans()
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.methodPayment.trim()) {
      toast.info("O método de pagamento da assinatura é obrigatório.");
      return;
    }

    try {
      const method = editing ? "PUT" : "POST";
      const endpoint = editing ? `${apiBase}/${editing}` : apiBase;

      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error("Erro ao salvar assinatura");
      toast.success("Assinatura salva com sucesso!");
      await loadSubscriptions();
      resetForm();
    } catch (err) {
      console.log("Erro ao salvar assinatura: ", err);
      toast.error('Erro ao salvar dados')
    }
  }

  function handleEdit(subscription) {
    setEditing(subscription.id_subscription);
    setForm({
      idUser: subscription.users.id ?? null,
      idPlan: subscription.id_plan ?? null,
      methodPayment: subscription.method_payment || "",
      isActive: subscription.is_active ?? null,
      startDate: subscription.start_date
    });
  }

  async function handleDelete(id) {
    if (!confirm("Deseja realmente excluir essa assinatura?")) return;

    try {
      const res = await fetch(`${apiBase}/${id}`, {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!res.ok) throw new Error("Erro ao excluir assinatura");
      toast.success("Assinatura deletada com sucesso!");
      await loadSubscriptions();
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
      toast.error("Erro ao excluir plano: ");
    }
  }

  function resetForm() {
    setForm({ idUser: null, idPlan: null, methodPayment: "", isActive: null, startDate: "" });
    setEditing(null);
  }

  async function handleSearch(e) {
    e.preventDefault();
    await loadSubscriptions(search);
  }

  function formatarformaData(dataBanco) {
    const data = new Date(dataBanco);

    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();

    return `${dia}/${mes}/${ano}`;
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const filteredHistory = selectedHistory?.filter(item => {
    if (!historyStartDate && !historyEndDate) return true;

    const dueDate = new Date(item.due_date);

    if (historyStartDate && dueDate < new Date(historyStartDate)) {
      return false;
    }

    if (historyEndDate && dueDate > new Date(historyEndDate)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Assinatura" : "Cadastrar Assinatura"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                placeholder="Nome do cliente"
                options={optionsUser}
                value={optionsUser.find(opt => opt.value === form.idUser) || null}
                isSearchable
                isClearable
                onChange={(option) => setForm({ ...form, idUser: option ? option.value : null })}
                required
            />
                        
            <Select
                placeholder="Nome do plano"
                options={optionsPlan}
                value={optionsPlan.find(opt => opt.value === form.idPlan) || null}
                isSearchable
                isClearable
                onChange={(option) => setForm({ ...form, idPlan: option ? option.value : null })}
                required
            />

            <select 
                className="w-full md:basis-[calc(50%-0.5rem)] bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
                value={form.methodPayment}
                onChange={(e) => setForm({ ...form, methodPayment: e.target.value })}
                required
            >
                <option value="">Método de pagamento</option>
                {methodPayment.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                ))}
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Situação da Assinatura</span>
                    <div className="flex flex-wrap gap-6 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="isActive"
                                value="true"
                                checked={form.isActive === true}
                                onChange={(e) =>
                                    setForm({ ...form, isActive: true })
                                }
                            />
                            Ativado
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="isActive"
                                value="false"
                                checked={form.isActive === false}
                                onChange={(e) =>
                                    setForm({ ...form, isActive: false })
                                }
                            />
                            Desativado
                        </label>
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Data de início da assinatura</span>
                    <input 
                        type="date"
                        className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-2"
                        value={form.startDate}
                        onChange={(e) =>
                            setForm({ ...form, startDate: e.target.value })
                        }
                        disabled={editing}
                        required={!editing}
                    />
                </div>
            </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="text-white px-4 py-2 rounded-md"
            style={{backgroundColor: palette?.strong_color}}
          >
            {editing ? "Atualizar" : "Salvar"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar assinatura..."
          className="border p-2 rounded-md flex-1 min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className=" text-white px-4 py-2 rounded-md"
          style={{backgroundColor: palette?.strong_color}}
        >
          Buscar
        </button>
        <button
          onClick={() => {
            setSearch("");
            loadSubscriptions();
          }}
          className="border px-4 py-2 rounded-md"
        >
          Limpar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Assinaturas</h4>

        {loading ? (
          <p className="text-gray-500 text-center py-4">Carregando...</p>
        ) : subscriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhuma assinatura encontrada
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => {

              const statusColor =
                    sub.status === "ATRASADO"
                      ? "bg-red-500"
                      : sub.status === "PAGO"
                      ? "bg-green-500"
                      : "bg-yellow-400";

              return(
                <div 
                  key={sub.id_subscription}
                  className={`
                    rounded-lg border shadow hover:shadow-md transition flex flex-col overflow-hidden
                    ${sub.is_active ? 
                      "bg-gray-50 hover:shadow-md" : 
                      "bg-gray-100 opacity-50"}
                  `}
                 >

                  <div className="flex justify-center p-3 items-center" style={{backgroundColor: palette?.strong_color}}>
                    <h5 className="text-white">{sub.plans_subscriptions.name_plansubscription}</h5>
                  </div>

                  <div 
                    className="p-4 flex flex-col gap-3 cursor-pointer"
                    onClick={() => loadHistory(sub.id_subscription)}
                  >

                    <div>
                      <h6 className="font-semibold mb-1">Usuário: </h6>
                      <div className="ml-3 space-y-0.5">
                        <p>{sub.users.username}</p>
                        <p>{sub.users.email}</p>
                        <p>{sub.users.phone}</p>
                      </div>
                    </div>

                    <hr />

                    <div>
                      <h6 className="font-semibold mb-1">Assinatura: </h6>
                      <div className="ml-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
                          <p>{sub.status}</p>
                        </div>
                        <p>Valor: {formatCurrency(sub.plans_subscriptions.value_plansubscription) || "-"}</p>
                        <p>Método de pagamento: {sub.method_payment}</p>
                        <p>Data de vencimento: {formatarformaData(sub.due_date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(sub)
                      }}
                      className="py-3 px-5 bg-green-500 text-white cursor-pointer flex-1"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(sub.id_subscription)
                      }}
                      className="py-3 px-5 bg-red-500 text-white cursor-pointer flex-1">
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700 text-center">
              Histórico da assinatura
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600">
                  A partir de
                </label>
                <input
                  type="date"
                  className="border rounded-md p-2"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600">
                  Até
                </label>
                <input
                  type="date"
                  className="border rounded-md p-2"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                />
              </div>
            </div>

            {loadingHistory ? (
              <p className="text-gray-500 text-center py-4">Carregando histórico...</p>
            ) : filteredHistory && filteredHistory.length > 0 ? (
              <div className="max-h-96 overflow-y-auto pr-2">
                <ul className="space-y-4">
                  {filteredHistory.map((item, id) => (
                    <li
                      key={id}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-2x00 dark:border-gray-700 rounded-lg p-4 shadow-md"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Data do pagamento:</span>
                        <span>{formatarformaData(item.date_payment)}</span>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Data de vencimento:</span>
                        <span>{formatarformaData(item.due_date)}</span>
                      </div>

                      <hr className="my-2 border-gray-300 dark:border-gray-700" />

                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Método de pagamento:</span>
                        <span>{item.method_payment}</span>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Valor do plano:</span>
                        <span>{formatCurrency(item.value)}</span>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Valor pago:</span>
                        <span>{formatCurrency(item.paid_amount)}</span>
                      </div>

                      <hr className="my-2 border-gray-300 dark:border-gray-700" />

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Status:</span>
                        <span
                          className={`font-semibold ${
                            item.status === "ATRASADO"
                              ? "text-red-600"
                              : item.status === "PAGO"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum histórico encontrado.</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false)
                  setHistoryStartDate("")
                  setHistoryEndDate("")
                }}
                className="px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: palette?.strong_color }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
