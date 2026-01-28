"use client";
import { useEffect, useState } from "react";
import { toast } from 'react-toastify'
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function PlansTab({ org }) {
  const [plans, setPlans] = useState([]);
  const [serviceList, setServiceList] = useState([])
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const { palette } = useOrganizationColors(org.slug_organization);
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    paymentInterval: "",
    isActive: null,
    services: []
  });
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  const apiBase = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/plans/${org.slug_organization}`;
  const servicesApi = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/slug/${org.slug_organization}`

  async function loadPlans(query = "") {
    setLoading(true);
    try {
      const url = query ? `${apiBase}?search=${encodeURIComponent(query)}` : apiBase;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      setPlans(data);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadServices() {
    try {
      const res = await fetch(servicesApi, { credentials: "include" });
      const data = await res.json();

      setServiceList(data);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
      toast.error("Erro ao carregar serviços");
    }
  }

  useEffect(() => {
    loadPlans();
    loadServices()
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.info("O nome do plano é obrigatório.");
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


      if (!res.ok) throw new Error("Erro ao salvar plano");
      toast.success("Plano salvo com sucesso!");
      await loadPlans();
      resetForm();
    } catch (err) {
      console.log("Erro ao salvar plano: ", err);
      toast.error('Erro ao salvar dados')
    }
  }

  function handleEdit(plan) {
    setEditing(plan.id_plansubscription);
    setForm({
      name: plan.name_plansubscription || "",
      value: plan.value_plansubscription || "",
      description: plan.description_plansubscription || "",
      paymentInterval: plan.paymentinterval_plansubscription || "",
      isActive: plan.is_active ?? null,
      services: plan.plan_services
        ? plan.plan_services.map(ps => ps.id_service)
        : []
    });
  }

  async function handleDelete(id) {
    if (!confirm("Deseja realmente excluir este Plano?")) return;

    try {
      const res = await fetch(`${apiBase}/${id}`, {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!res.ok) throw new Error("Erro ao excluir plano");
      toast.success("Plano deletado com sucesso!");
      await loadPlans();
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
      toast.error("Erro ao excluir plano: ");
    }
  }

  function resetForm() {
    setForm({ name: "", value: "", description: "", paymentInterval: "", isActive: null, services: [] });
    setEditing(null);
  }

  async function handleSearch(e) {
    e.preventDefault();
    await loadPlans(search);
  }

  function toggleService(serviceId) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId],
    }));
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const filteredServices = serviceList.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Plano" : "Cadastrar Plano"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome do plano"
            className="border p-2 rounded-md"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Valor do plano"
            className="border p-2 rounded-md"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <textarea
            placeholder="Descrição do plano"
            className="border p-2 rounded-md col-span-1 md:col-span-2"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          ></textarea>
          <input
            type="number"
            placeholder="Intervalo de pagamento"
            className="border p-2 rounded-md"
            value={form.paymentInterval}
            onChange={(e) => setForm({ ...form, paymentInterval: e.target.value })}
          />          
          <div className="flex flex-col flex-wrap gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Situação da Assinatura</span>
              <div className="flex gap-5">
                <label className="flex gap-2 cursor-pointer">
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
                <label className="flex gap-2 cursor-pointer">
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
        </div>

        <div className="space-y-2">

          <button
            type="button"
            onClick={() => setShowServicesModal(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md"
          >
            Adicionar serviços
          </button>

          <div className="flex flex-wrap gap-2 mt-2">
            {form.services.length ? (
              form.services.map((serviceId) => {
                const service = serviceList.find(s => s.id === serviceId);
                if (!service) return null;

                return (
                  <span
                    key={serviceId}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm"
                  >
                    {service.name}
                    <button
                      type="button"
                      onClick={() => toggleService(serviceId)}
                      className="text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400">
                Nenhum serviço adicionado
              </span>
            )}
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
          placeholder="Buscar plano..."
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
            loadPlans();
          }}
          className="border px-4 py-2 rounded-md"
        >
          Limpar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Planos</h4>

        {loading ? (
          <p className="text-gray-500 text-center py-4">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Intervalo de pagamento (Em meses)</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left w-[120px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {plans.length ? (
                  plans.map((p) => (
                    <tr 
                      key={p.id_plansubscription} 
                      className={`
                        border-b hover:bg-gray-50
                        ${p.is_active ? 
                          "bg-gray-50 hover:shadow-md" : 
                          "bg-gray-100 opacity-50"}
                      `}
                    >
                      <td className="px-3 py-2 font-medium">{p.name_plansubscription}</td>
                      <td className="px-3 py-2"> {formatCurrency(p.value_plansubscription) || "-"}</td>
                      <td className="px-3 py-2">{p.paymentinterval_plansubscription || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {p.description_plansubscription?.slice(0, 60) || "-"}
                      </td>
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-blue-500 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id_plansubscription)}
                          className="text-red-500 hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-4">
                      Nenhum plano encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700">
              Adicionar serviços
            </h4>

            <input
              type="text"
              placeholder="Buscar serviço..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="border p-2 rounded-md w-full text-sm"
            />

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredServices.length ? (
                filteredServices.map((service) => {
                  const added = form.services.includes(service.id);

                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between border rounded-md p-2"
                    >
                      <span>{service.name}</span>

                      <button
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                          added
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        {added ? "Remover" : "Adicionar"}
                      </button>
                    </div>
                  );
                })
              ): (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhum serviço encontrado
                </p>
              )}
              
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowServicesModal(false)
                  setServiceSearch("")
                }}
                className="border px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowServicesModal(false)
                  setServiceSearch("")
                }}
                className="text-white px-4 py-2 rounded-md"
                style={{ backgroundColor: palette?.strong_color }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}