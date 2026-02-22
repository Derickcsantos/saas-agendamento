"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { format, isSameMonth, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import TrialExpiredModal from "./TrialExpireModal";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const statusColors = {
  pendente: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-800",
  cancelada: "bg-gray-100 text-gray-600",
  default: "bg-blue-100 text-blue-800",
};

function StatCard({ title, value, sub, color }) {
  return (
    <div className="rounded-2xl p-5 shadow-sm bg-white border flex flex-col gap-2">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold" style={{ color }}>{value}</span>
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>
    </div>
  );
}

function ExpenseRow({ expense, onOpenAttachment, onOpenView }) {
  const statusClass = statusColors[expense.status_expense] || statusColors.default;
  return (
    <tr className="border-b hover:bg-gray-50 transition">
      <td className="px-4 py-3 font-medium text-gray-900">{expense.name_expense}</td>
      <td className="px-4 py-3 text-gray-600">{expense.category?.name_category || "Sem categoria"}</td>
      <td className="px-4 py-3 text-gray-600">{expense.payment_method?.name || "-"}</td>
      <td className="px-4 py-3 text-gray-800 font-semibold">{Number(expense.value_expense || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
      <td className="px-4 py-3 text-gray-600">{expense.payment_date ? format(parseISO(expense.payment_date), "dd/MM/yyyy") : "-"}</td>
      <td className="px-4 py-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
          {expense.status_expense || "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onOpenAttachment(expense)}
            className="px-3 py-1 rounded-lg border text-sm text-gray-700 hover:bg-gray-100"
          >
            Anexos
          </button>
          <button
            onClick={() => onOpenView(expense)}
            className="px-3 py-1 rounded-lg border text-sm text-gray-700 hover:bg-gray-100"
          >
            Detalhes
          </button>
        </div>
      </td>
    </tr>
  );
}

function InstallmentsList({ installments, onToggleStatus }) {
  const total = installments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = installments
    .filter((i) => (i.status || "").toLowerCase() === "pago")
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const pending = total - paid;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">Pago: {paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">Em aberto: {pending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Parcela</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Vencimento</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Valor</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => {
              const statusCls = statusColors[inst.status] || statusColors.default;
              return (
                <tr key={inst.id} className="border-b">
                  <td className="px-4 py-2 font-medium text-gray-900">{inst.installment_number}/{inst.installments_total}</td>
                  <td className="px-4 py-2 text-gray-700">{inst.due_date ? format(parseISO(inst.due_date), "dd/MM/yyyy") : "-"}</td>
                  <td className="px-4 py-2 text-gray-900 font-semibold">{Number(inst.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusCls}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      {inst.status !== "pago" && (
                        <button
                          className="px-3 py-1 rounded-lg border text-xs text-emerald-700 hover:bg-emerald-50"
                          onClick={() => onToggleStatus(inst, "pago")}
                        >Marcar pago</button>
                      )}
                      {inst.status === "pago" && (
                        <button
                          className="px-3 py-1 rounded-lg border text-xs text-amber-700 hover:bg-amber-50"
                          onClick={() => onToggleStatus(inst, "pendente")}
                        >Reabrir</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExpensesTab({ org, setActiveTab }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);
  const [viewInstallments, setViewInstallments] = useState([]);
  const [viewAttachments, setViewAttachments] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: null, name_category: "", description_category: "" });
  const [categorySaving, setCategorySaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSaving, setImportSaving] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);

  const [form, setForm] = useState({
    name_expense: "",
    description_expense: "",
    value_expense: "",
    category_expense_id: "",
    payment_method_id: "",
    payment_date: "",
    status_expense: "pendente",
    is_installment: false,
    installments_total: 2,
    first_due_date: "",
  });

  const strong = palette?.strong_color || "#5E3BEE";
  const light = palette?.light_color || "#F5F5F5";
  const globalCategoryNames = useMemo(() => new Set(categories.filter((c) => !c.organization_id).map((c) => c.name_category)), [categories]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    onDrop: (accepted) => {
      setFiles((prev) => [...prev, ...accepted]);
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes, payRes, sumRes] = await Promise.all([
        fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/categories/${org.slug_organization}`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/payment-methods`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}/summary`),
      ]);

      if (expRes.status === 402 || catRes.status === 402 || payRes.status === 402 || sumRes.status === 402) {
        setShowPaywall(true);
        return;
      }

      const [expData, catData, payData, sumData] = await Promise.all([
        expRes.json(), catRes.json(), payRes.json(), sumRes.json(),
      ]);

      setExpenses(Array.isArray(expData) ? expData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setPaymentMethods(Array.isArray(payData) ? payData : []);
      setSummary(sumData || null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar despesas");
    } finally {
      setLoading(false);
    }
  };

  const openExpenseDetails = async (expense) => {
    setViewExpense({ ...expense, loading: true });
    setViewInstallments([]);
    setViewAttachments([]);
    setDetailsLoading(true);
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}/${expense.expense_id}`);
      
      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }
      
      const data = await res.json();
      setViewExpense(data);
      setViewInstallments(Array.isArray(data.installments) ? data.installments : []);
      setViewAttachments(Array.isArray(data.attachments) ? data.attachments : []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar detalhes");
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleInstallmentStatus = async (inst, status) => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}/installments/${inst.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      } 

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao atualizar");
      }
      setViewInstallments((prev) => prev.map((i) => (i.id === inst.id ? { ...i, status, paid_at: status === "pago" ? new Date().toISOString() : null } : i)));
      toast.success("Status atualizado");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar parcela");
    }
  };

  const resetCategoryForm = () => setCategoryForm({ id: null, name_category: "", description_category: "" });

  const saveCategory = async () => {
    if (!categoryForm.name_category.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    setCategorySaving(true);
    try {
      const payload = {
        name_category: categoryForm.name_category.trim(),
        description_category: categoryForm.description_category.trim() || null,
      };
      let res;
      if (categoryForm.id) {
        res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/categories/${org.slug_organization}/${categoryForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/categories/${org.slug_organization}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao salvar categoria");
      }
      toast.success("Categoria salva");
      resetCategoryForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar categoria");
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (cat) => {
    const ok = window.confirm(`Excluir categoria "${cat.name_category}"?`);
    if (!ok) return;
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/categories/${org.slug_organization}/${cat.category_expense_id}`, {
        method: "DELETE",
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao excluir categoria");
      }
      toast.success("Categoria removida");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir categoria");
    }
  };

  const handleImportStatement = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo PDF ou CSV");
      return;
    }
    setImportSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}/ai-import`, {
        method: "POST",
        body: fd,
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao importar extrato");
      }
      toast.success(`Importado${data.imported ? `: ${data.imported}` : ""}`);
      setImportModalOpen(false);
      setImportFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao importar extrato");
    } finally {
      setImportSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const now = new Date();
    const payableThisMonth = expenses
      .filter((e) => e.payment_date && isSameMonth(parseISO(e.payment_date), now))
      .filter((e) => (e.status_expense || "").toLowerCase() !== "pago")
      .reduce((sum, e) => sum + Number(e.value_expense || 0), 0);

    const pending = expenses
      .filter((e) => (e.status_expense || "").toLowerCase() !== "pago")
      .reduce((sum, e) => sum + Number(e.value_expense || 0), 0);

    const total = expenses.reduce((sum, e) => sum + Number(e.value_expense || 0), 0);

    let topCategory = "-";
    if (summary?.by_category) {
      const entries = Object.entries(summary.by_category || {});
      if (entries.length) {
        entries.sort((a, b) => (b[1]?.total || 0) - (a[1]?.total || 0));
        topCategory = `${entries[0][0]} • ${entries[0][1].total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
      }
    }

    return {
      payableThisMonth,
      pending,
      total,
      topCategory,
    };
  }, [expenses, summary]);

  const chartByCategory = useMemo(() => {
    const labels = [];
    const series = [];
    const colors = [];
    const paletteOrg = [strong, "#10b981", "#f97316", "#6366f1", "#14b8a6", "#ef4444", "#a855f7"];
    const paletteGlobal = ["#0ea5e9", "#22d3ee", "#38bdf8", "#0284c7", "#0369a1", "#0f172a"];
    let orgIdx = 0;
    let globalIdx = 0;
    if (summary?.by_category) {
      for (const [key, val] of Object.entries(summary.by_category)) {
        const isGlobal = globalCategoryNames.has(key);
        labels.push(isGlobal ? `${key} (global)` : key);
        series.push(Number(val.total || 0));
        colors.push(isGlobal ? paletteGlobal[globalIdx++ % paletteGlobal.length] : paletteOrg[orgIdx++ % paletteOrg.length]);
      }
    }
    return { labels, series, colors, hasGlobal: globalCategoryNames.size > 0 };
  }, [summary, globalCategoryNames, strong]);

  const chartByMonth = useMemo(() => {
    const map = new Map();
    expenses.forEach((e) => {
      const date = e.payment_date || e.created_at;
      if (!date) return;
      const d = parseISO(date);
      const key = format(d, "yyyy-MM");
      map.set(key, (map.get(key) || 0) + Number(e.value_expense || 0));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    return {
      labels: sorted.map(([k]) => format(parseISO(`${k}-01`), "MMM yyyy", { locale: ptBR })),
      series: sorted.map(([, v]) => v),
    };
  }, [expenses]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      let installments_config = null;
      if (form.is_installment) {
        const totalParc = Number(form.installments_total || 0) || 1;
        const perValue = (Number(form.value_expense || 0) || 0) / totalParc;
        const due_dates = Array.from({ length: totalParc }).map((_, idx) => ({
          due_date: form.first_due_date
            ? format(addMonths(parseISO(form.first_due_date), idx), "yyyy-MM-dd")
            : null,
          amount: Number(perValue.toFixed(2)),
        }));
        installments_config = { installments_total: totalParc, due_dates };
      }

      const payload = {
        ...form,
        value_expense: Number(form.value_expense || 0),
        category_expense_id: form.category_expense_id || null,
        payment_method_id: form.payment_method_id || null,
        payment_date: form.payment_date || null,
        installments_config,
      };

      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao criar despesa");
      }

      const expenseCreated = await res.json();

      // Upload anexos se houver
      if (files.length) {
        const uploads = files.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("note", file.name);
          const uploadRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/expenses/${org.slug_organization}/${expenseCreated.expense_id}/attachments`, {
            method: "POST",
            body: fd,
          });

          if (res.status === 402) {
            setShowPaywall(true);
            return;
          }
  
          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error || "Erro ao enviar anexo");
          }
        });
        await Promise.all(uploads);
      }

      toast.success("Despesa criada");
      setModalOpen(false);
      setFiles([]);
      setForm({
        name_expense: "",
        description_expense: "",
        value_expense: "",
        category_expense_id: "",
        payment_method_id: "",
        payment_date: "",
        status_expense: "pendente",
        is_installment: false,
        installments_total: 2,
        first_due_date: "",
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao criar despesa");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-16 text-gray-500">Carregando despesas...</div>
    );
  }

  return (
    <div className="space-y-6">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="A pagar este mês" value={totals.payableThisMonth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} color={strong} />
        <StatCard title="Em aberto" value={totals.pending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} color="#f97316" />
        <StatCard title="Total" value={totals.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} color="#111" />
        <StatCard title="Categoria com mais gastos" value={totals.topCategory} color={strong} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Evolução de despesas</h3>
          </div>
          <ApexChart
            type="area"
            height={260}
            options={{
              chart: { toolbar: { show: false } },
              dataLabels: { enabled: false },
              stroke: { curve: "smooth", width: 3 },
              colors: [strong],
              xaxis: { categories: chartByMonth.labels },
              yaxis: { labels: { formatter: (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) } },
              tooltip: { y: { formatter: (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) } },
              grid: { strokeDashArray: 4 },
            }}
            series={[{ name: "Despesas", data: chartByMonth.series }]}
          />
        </div>

        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Por categoria</h3>
            {chartByCategory.hasGlobal && <span className="text-xs text-gray-500">(global) = categoria compartilhada</span>}
          </div>
          <ApexChart
            type="donut"
            height={260}
            options={{
              labels: chartByCategory.labels,
              legend: { position: "bottom" },
              colors: chartByCategory.colors,
              dataLabels: { enabled: false },
              tooltip: { y: { formatter: (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) } },
            }}
            series={chartByCategory.series}
          />
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Despesas</h3>
            <p className="text-sm text-gray-500">Controle completo das despesas da organização</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
            >
              Gerenciar categorias
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
            >
              Importar extrato (Gemini)
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: strong }}
            >
              Nova despesa
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Despesa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.expense_id}
                  expense={expense}
                  onOpenAttachment={() => openExpenseDetails(expense)}
                  onOpenView={() => openExpenseDetails(expense)}
                />
              ))}
              {!expenses.length && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">Nenhuma despesa cadastrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => { setCategoryModalOpen(false); resetCategoryForm(); }}
            >
              ✕
            </button>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Categorias</p>
                <h3 className="text-2xl font-semibold text-gray-900">Globais e da organização</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">{categories.length} itens</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm text-gray-600">Nome</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={categoryForm.name_category}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name_category: e.target.value })}
                  placeholder="Ex: Energia"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Descrição</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={categoryForm.description_category}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description_category: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-6">
              <button
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                onClick={() => resetCategoryForm()}
              >
                Limpar
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: categorySaving ? "#94a3b8" : strong }}
                onClick={saveCategory}
                disabled={categorySaving}
              >
                {categoryForm.id ? "Atualizar" : "Adicionar"}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y border rounded-xl">
              {categories.map((c) => (
                <div key={c.category_expense_id} className="flex items-center justify-between px-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.name_category}</p>
                    <p className="text-xs text-gray-500 truncate">{c.description_category || "Sem descrição"}</p>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-block mt-1">
                      {c.organization_id ? "Organização" : "Global"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-lg border text-xs text-gray-700 hover:bg-gray-100"
                      onClick={() => setCategoryForm({ id: c.category_expense_id, name_category: c.name_category, description_category: c.description_category || "" })}
                    >
                      Editar
                    </button>
                    {c.organization_id && (
                      <button
                        className="px-3 py-1 rounded-lg border text-xs text-red-600 hover:bg-red-50"
                        onClick={() => deleteCategory(c)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!categories.length && (
                <div className="px-3 py-6 text-center text-gray-500">Nenhuma categoria cadastrada</div>
              )}
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => { setImportModalOpen(false); setImportFile(null); }}
            >
              ✕
            </button>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Importar extrato com Gemini</h3>
            <p className="text-sm text-gray-600 mb-4">Envie um PDF ou CSV que será analisado pela IA para criar despesas automaticamente.</p>

            <label className="block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
              <input
                type="file"
                accept=".pdf,.csv"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-gray-700">Clique para selecionar ou arraste aqui</p>
              {importFile && <p className="mt-2 text-sm text-gray-900 font-semibold">{importFile.name}</p>}
              <p className="text-xs text-gray-500 mt-1">Formatos suportados: PDF, CSV • Máx 50 itens por envio</p>
            </label>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                onClick={() => { setImportModalOpen(false); setImportFile(null); }}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: importSaving ? "#94a3b8" : strong }}
                onClick={handleImportStatement}
                disabled={importSaving}
              >
                {importSaving ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => { setViewExpense(null); setViewInstallments([]); setViewAttachments([]); }}
            >
              ✕
            </button>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Despesa</p>
                <h3 className="text-2xl font-semibold text-gray-900">{viewExpense.name_expense}</h3>
                <p className="text-sm text-gray-600 mt-1">{viewExpense.description_expense || "Sem descrição"}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-700">
                  <span className="px-3 py-1 rounded-full bg-gray-100">{viewExpense.category?.name_category || "Sem categoria"}</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100">{viewExpense.payment_method?.name || "Sem forma"}</span>
                  <span className={`px-3 py-1 rounded-full font-semibold ${statusColors[viewExpense.status_expense] || statusColors.default}`}>
                    {viewExpense.status_expense}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Valor</p>
                <p className="text-3xl font-bold text-gray-900">{Number(viewExpense.value_expense || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                <p className="text-xs text-gray-500 mt-1">Pagamento: {viewExpense.payment_date ? format(parseISO(viewExpense.payment_date), "dd/MM/yyyy") : "-"}</p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="py-10 text-center text-gray-500">Carregando detalhes...</div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Criado em" value={viewExpense.created_at ? format(parseISO(viewExpense.created_at), "dd/MM/yyyy") : "-"} color={strong} />
                  <StatCard title="Atualizado" value={viewExpense.updated_at ? format(parseISO(viewExpense.updated_at), "dd/MM/yyyy") : "-"} color="#475569" />
                  <StatCard title="Parcelado" value={viewExpense.is_installment ? "Sim" : "Não"} color={viewExpense.is_installment ? "#0ea5e9" : "#16a34a"} />
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Parcelas</h4>
                    {viewInstallments.length === 0 && <span className="text-sm text-gray-500">Nenhuma parcela cadastrada</span>}
                  </div>
                  {viewInstallments.length > 0 && (
                    <InstallmentsList
                      installments={viewInstallments}
                      onToggleStatus={(inst, status) => toggleInstallmentStatus(inst, status)}
                    />
                  )}
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Anexos</h4>
                    <span className="text-sm text-gray-500">Armazenado no bucket</span>
                  </div>
                  {viewAttachments.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum anexo enviado</p>
                  ) : (
                    <div className="space-y-2">
                      {viewAttachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-gray-900 truncate">{att.note || "Anexo"}</span>
                            <span className="text-xs text-gray-500">{att.uploaded_at ? format(parseISO(att.uploaded_at), "dd/MM/yyyy HH:mm") : ""}</span>
                          </div>
                          <a
                            href={att.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            Abrir
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                    onClick={() => { setViewExpense(null); setViewInstallments([]); setViewAttachments([]); }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => { setModalOpen(false); setFiles([]); }}
            >
              ✕
            </button>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Nova despesa</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Nome</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.name_expense}
                  onChange={(e) => setForm({ ...form, name_expense: e.target.value })}
                  placeholder="Ex: Conta de energia"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Valor</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  type="number"
                  value={form.value_expense}
                  onChange={(e) => setForm({ ...form, value_expense: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Categoria</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.category_expense_id}
                  onChange={(e) => setForm({ ...form, category_expense_id: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c.category_expense_id} value={c.category_expense_id}>{c.name_category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Forma de pagamento</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.payment_method_id}
                  onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Data de pagamento</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.status_expense}
                  onChange={(e) => setForm({ ...form, status_expense: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm text-gray-600">Descrição</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  value={form.description_expense}
                  onChange={(e) => setForm({ ...form, description_expense: e.target.value })}
                  placeholder="Detalhes adicionais"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-gray-600">Anexos (pdf, png, jpg, webp)</label>
              <div
                {...getRootProps()}
                className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${isDragActive ? "bg-indigo-50 border-indigo-300" : "bg-gray-50"}`}
              >
                <input {...getInputProps()} />
                <p className="text-sm text-gray-700">Arraste e solte ou clique para selecionar arquivos</p>
                {files.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    {files.map((f) => (
                      <div key={f.name} className="flex items-center justify-between text-left">
                        <span className="truncate max-w-60">{f.name}</span>
                        <button className="text-red-500 text-xs" onClick={(e) => {
                          e.stopPropagation();
                          setFiles((prev) => prev.filter((file) => file.name !== f.name));
                        }}>remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                onClick={() => { setModalOpen(false); setFiles([]); }}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: saving ? "#94a3b8" : strong }}
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
