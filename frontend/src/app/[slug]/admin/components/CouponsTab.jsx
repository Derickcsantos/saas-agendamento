"use client";
import { useEffect, useState } from "react";
import { toast } from 'react-toastify'
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";

export default function CouponsTab({ org }) {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    discount_type: "percentage",
    discount_value: "",
    valid_from: "",
    valid_until: "",
    max_uses: 0,
    min_service_value: 0,
    description: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const { palette } = useOrganizationColors(org.slug_organization);
  const { confirm } = useConfirm() 

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/${org.slug_organization}`,
      { cache: "no-store", credentials: 'include'}
    );
    const data = await res.json();
    setCoupons(data);
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const method = form.id ? "PUT" : "POST";
    const url = form.id
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/${org.slug_organization}/${form.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/${org.slug_organization}`;

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Erro ao salvar cupom");
      return;
    }

    resetForm();
    loadCoupons();
  };

  const handleEdit = (coupon) => {
    setForm({
      id: coupon.id,
      name: coupon.name,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      valid_from: coupon.valid_from
        ? formatDateToInput(coupon.valid_from)
        : "",
      valid_until: coupon.valid_until
        ? formatDateToInput(coupon.valid_until)
        : "",
      max_uses: coupon.max_uses || 0,
      min_service_value: coupon.min_service_value || 0,
      description: coupon.description || "",
      is_active: coupon.is_active,
    });
  };

  const handleDelete = async (id) => {
    // if (!confirm("Deseja realmente excluir este cupom?")) return;

    const confirmed = await confirm({
      title: "Excluir cupom",
      message: "Deseja realmente excluir este cupom?",
      confirmVariant: "danger"
    });

    if (!confirmed) return    

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/${org.slug_organization}/${id}`, {  
        method: "DELETE",
        credentials: 'include',
       }
    );

    if (!res.ok) {
      toast.error("Erro ao excluir cupom");
      return;
    }

    loadCoupons();
  };

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      code: "",
      discount_type: "percentage",
      discount_value: "",
      valid_from: "",
      valid_until: "",
      max_uses: 0,
      min_service_value: 0,
      description: "",
      is_active: true,
    });
  };

  function formatDateToInput(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  }

  return (
    <div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {form.id ? "Editar Cupom" : "Novo Cupom"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-800 text-sm">Nome do Cupom</label>
            <input
              type="text"
              placeholder="Nome do Cupom"
              className="border p-2 rounded-md w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-gray-800 text-sm">Código</label>
            <input
              type="text"
              placeholder="Código"
              className="border p-2 rounded-md w-full"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-800 text-sm">Tipo de Desconto</label>
            <select
              className="border p-2 rounded-md w-full"
              value={form.discount_type}
              onChange={(e) =>
                setForm({ ...form, discount_type: e.target.value })
              }
            >
              <option value="percentage">Porcentagem (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
            </select>
          </div>

          <div>
            <label className="text-gray-800 text-sm">Valor do Desconto</label>
            <input
              type="number"
              step="0.01"
              placeholder="Valor do Desconto"
              className="border p-2 rounded-md w-full"
              value={form.discount_value}
              onChange={(e) =>
                setForm({ ...form, discount_value: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-800 text-sm">Válido De</label>
            <input
              type="datetime-local"
              className="border p-2 rounded-md w-full"
              value={form.valid_from}
              onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-800 text-sm">Válido Até</label>
            <input
              type="datetime-local"
              className="border p-2 rounded-md w-full"
              value={form.valid_until}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-800 text-sm">Máximo de Usos</label>
            <input
              type="number"
              className="border p-2 rounded-md w-full"
              min="0"
              value={form.max_uses}
              onChange={(e) =>
                setForm({ ...form, max_uses: Number(e.target.value) })
              }
              placeholder="0 = ilimitado"
            />
          </div>

          <div>
            <label className="text-gray-800 text-sm">Valor Mínimo do Serviço</label>
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded-md w-full"
              min="0"
              value={form.min_service_value}
              onChange={(e) =>
                setForm({
                  ...form,
                  min_service_value: Number(e.target.value),
                })
              }
              placeholder="Valor mínimo"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-800 text-sm">Descrição</label>
          <textarea
            className="border p-2 rounded-md w-full"
            rows={2}
            placeholder="Descrição do cupom"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          Cupom Ativo
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className=" text-white px-4 py-2 rounded-md"
            style={{backgroundColor: palette?.strong_color}}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>

          {form.id && (
            <button
              type="button"
              className="border px-4 py-2 rounded-md"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Cupons</h4>

        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Desconto</th>
                <th className="px-3 py-2 text-left">Validade</th>
                <th className="px-3 py-2 text-left">Usos</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="px-3 py-2 font-bold">{c.code}</td>
                  <td className="px-3 py-2">{c.name}</td>

                  <td className="px-3 py-2">
                    {c.discount_type === "percentage"
                      ? `${c.discount_value}%`
                      : `R$ ${c.discount_value.toFixed(2)}`}
                  </td>

                  <td className="px-3 py-2">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString()
                      : "Indeterminado"}
                  </td>

                  <td className="px-3 py-2">
                    {c.current_uses}
                    {c.max_uses ? `/${c.max_uses}` : ""}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-md text-white text-xs ${
                        c.is_active ? "bg-green-500" : "bg-gray-500"
                      }`}
                    >
                      {c.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="px-3 py-2 flex gap-2">
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => handleEdit(c)}
                    >
                      Editar
                    </button>

                    <button
                      className="text-red-500 hover:underline"
                      onClick={() => handleDelete(c.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}

              {!coupons.length && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-4">
                    Nenhum cupom cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
