// RevenueTab.jsx - fully corrected, complete and improved UI
"use client";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { toast } from 'react-toastify'
import autoTable from 'jspdf-autotable';
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import SecretCodeModal from "@/components/SecretCodeModal";
import TrialExpiredModal from "./TrialExpireModal";

export default function RevenueTab({ org, setActiveTab }) {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawingBalance, setWithdrawingBalance] = useState(false);
  const [secretCodeModalOpen, setSecretCodeModalOpen] = useState(false);
  const [pendingWithdrawAmount, setPendingWithdrawAmount] = useState(null);
  const { palette } = useOrganizationColors(org.slug_organization);

  const [showPaywall, setShowPaywall] = useState(false);

  const { confirm } = useConfirm()

  const API = process.env.NEXT_PUBLIC_API_URL;
  const slug = org.slug_organization;

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const formatPeriod = () => {
    if (!startDate || !endDate) return "Todos os períodos";
    return `${new Date(startDate).toLocaleDateString("pt-BR")} a ${new Date(
      endDate
    ).toLocaleDateString("pt-BR")}`;
  };


  const loadRevenue = async (start = null, end = null) => {
    try {
      setLoading(true);
      let url = `${API}/api/admin/revenue/${slug}`;
      const params = new URLSearchParams();
      if (start) params.append("start_date", start);
      if (end) params.append("end_date", end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        credentials: 'include'
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Erro ao carregar dados");
      setData(json);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      let url = `${API}/api/admin/revenue/${slug}/export`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        credentials: 'include'
      });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) throw new Error("Erro ao exportar relatório");

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `relatorio-receitas-${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success("Dados exportados com sucesso!");
    } catch (err) {
      toast.error("Falha na exportação");
    }
  };

  const handleExportPDF = () => {
    if (!data) return;
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica");
      doc.setFontSize(18);
      doc.text("Relatório de Receitas", 105, 15, { align: "center" });

      doc.setFontSize(12);
      doc.text(formatPeriod(), 14, 25);

      doc.setFontSize(11);
      doc.text(`Total de Agendamentos: ${data.total_appointments}`, 14, 35);
      doc.text(`Faturamento Total: ${formatCurrency(data.total_revenue)}`, 14, 40);
      doc.text(`Total de Comissões: ${formatCurrency(data.total_commissions)}`, 14, 45);

      const headers = [
        "Profissional",
        "Agendamentos",
        "Faturamento",
        "Comissão %",
        "Valor Comissão",
        "Lucro Líquido",
      ];

      const body = data.details.map((d) => [
        d.name,
        d.appointments_count,
        formatCurrency(d.total_revenue),
        `${d.commission_rate}%`,
        formatCurrency(d.commission_value),
        formatCurrency(d.net_profit),
      ]);

      autoTable(doc, {
        head: [headers],
        body,
        startY: 55,
        theme: "grid",
        headStyles: { fillColor: [161, 156, 156], textColor: 255 },
        styles: { fontSize: 9 },
      });


      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        14,
        doc.lastAutoTable.finalY + 15
      );

      doc.save(
        `relatorio-receitas-${new Date()
          .toLocaleDateString("pt-BR")
          .replace(/\//g, "-")}.pdf`
      );

      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF: ");
      console.log(err)
    }
  };

  const loadBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await fetch(`${API}/api/payments/${slug}/balance`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar saldo");
      setBalance(json);
    } catch (err) {
      toast.error("Erro ao carregar saldo disponível");
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API}/api/payments/${slug}/history?limit=15`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar histórico");
      setHistory(json.history || []);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRevenue();
    loadBalance();
    loadHistory();
  }, []);

  const handleSecretCodeVerified = async (code) => {
    if (!pendingWithdrawAmount) return;

    try {
      setWithdrawingBalance(true);
      const res = await fetch(`${API}/api/payments/${slug}/withdraw`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: pendingWithdrawAmount,
          secret_code: code 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao solicitar saque");
      
      toast.success("Saque solicitado com sucesso!");
      setWithdrawAmount("");
      setPendingWithdrawAmount(null);
      setSecretCodeModalOpen(false);
      loadBalance();
      loadHistory();
    } catch (err) {
      toast.error(err.message || "Falha ao solicitar saque");
    } finally {
      setWithdrawingBalance(false);
    }
  };

  return (
    <div className="space-y-6">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      {/* FILTROS */}
      <div className="bg-white p-5 rounded-lg shadow-sm border flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded-md"
          />
        </div>

        <button
          onClick={() => loadRevenue(startDate, endDate)}
          className="text-white px-4 py-2 rounded-md shadow"
          style={{backgroundColor: palette?.strong_color}}
        >
          Aplicar Filtro
        </button>

        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            loadRevenue();
          }}
          className="border px-4 py-2 rounded-md shadow"
        >
          Limpar
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-3 py-2 rounded-md text-sm shadow"
          >
            Exportar Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-red-600 text-white px-3 py-2 rounded-md text-sm shadow"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* SALDO DISPONÍVEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white text-gray-800 p-6 rounded-2xl shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm uppercase tracking-wide text-gray-800">Saldo disponível para saque</p>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full border border-white/10">PIX</span>
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="text-4xl font-bold">
              {loadingBalance ? "--" : formatCurrency((balance?.available_balance || 0) / 100)}
            </h3>
            <p className="text-gray-800 text-sm">Atualize suas políticas para alterar a chave PIX.</p>
          </div>
          <p className="text-xs text-gray-500 mb-4">O saque será enviado para a chave PIX cadastrada nas Configurações. Uma taxa de R$ 1,00 será descontada do valor solicitado.</p>
          
          <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
            <label className="block text-sm text-gray-800 mb-2">Informe o valor do saque (R$)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-white/10 text-gray-800 placeholder-gray-600 rounded-lg px-3 py-2 border border-white/20 focus:border-white/40 outline-none"
              />
              <button
                onClick={() => {
                  const maxAmount = (balance?.available_balance || 0) / 100;
                  setWithdrawAmount(Math.max(0, maxAmount).toFixed(2));
                }}
                className="px-3 py-2 bg-white/20 text-gray-800 text-sm rounded-lg hover:bg-white/30 transition border border-white/20"
              >
                Máx
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">Valor que será recebido após taxa: <strong>{withdrawAmount ? formatCurrency(Math.max(0, withdrawAmount - 1)) : "--"}</strong></p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
                  toast.info("Informe um valor válido para saque.");
                  return;
                }
                const requestedAmount = parseFloat(withdrawAmount);
                const maxAmount = (balance?.available_balance || 0) / 100;
                if (requestedAmount > maxAmount) {
                  toast.error("Valor solicitado maior que o saldo disponível.");
                  return;
                }
                // const confirmed = window.confirm(`Confirmar saque de R$ ${requestedAmount.toFixed(2)}?\n\nTaxa: R$ 1,00\nValor a receber: R$ ${(requestedAmount - 1).toFixed(2)}\n\nA chave PIX cadastrada em Configurações será usada.`);
                // if (!confirmed) return;

                const confirmed = await confirm({
                  title: "Confirmar saque",
                  message: `Confirmar saque de R$ ${requestedAmount.toFixed(2)}?\n\nTaxa: R$ 1,00\nValor a receber: R$ ${(requestedAmount - 1).toFixed(2)}\n\nA chave PIX cadastrada em Configurações será usada.`,
                  confirmVariant: "primary",
                  confirmColor: palette?.strong_color
                });

                if (!confirmed) return

                try {
                  setWithdrawingBalance(true);
                  const res = await fetch(`${API}/api/payments/${slug}/withdraw`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: requestedAmount }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "Erro ao solicitar saque");
                  toast.success("Saque solicitado com sucesso!");
                  setWithdrawAmount("");
                  loadBalance();
                  loadHistory();
                } catch (err) {
                  toast.error(err.message || "Falha ao solicitar saque");
                } finally {
                  setWithdrawingBalance(false);
                }

                // Abrir modal de verificação do secret code
                setPendingWithdrawAmount(requestedAmount);
                setSecretCodeModalOpen(true);
              }}
              disabled={withdrawingBalance || !withdrawAmount}
              className="px-5 py-3 rounded-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {withdrawingBalance ? "Processando..." : "Sacar agora"}
            </button>
            <button
              onClick={loadBalance}
              className="px-4 py-3 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
            >
              Atualizar saldo
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Chave PIX cadastrada</h4>
          <p className="text-gray-600 text-sm">Consulte e edite em Configurações &rarr; Pagamento antecipado.</p>
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 border rounded-lg p-3">Por segurança, não exibimos a chave aqui.</div>
        </div>
      </div>

      {/* CARDS RESUMO */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border shadow-sm text-center">
            <p className="text-sm text-gray-500">Total de Agendamentos</p>
            <h3 className="text-2xl font-semibold text-indigo-600">
              {data.total_appointments}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm text-center">
            <p className="text-sm text-gray-500">Faturamento Total</p>
            <h3 className="text-2xl font-semibold text-green-600">
              {formatCurrency(data.total_revenue)}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm text-center">
            <p className="text-sm text-gray-500">Ticket Médio</p>
            <h3 className="text-2xl font-semibold text-blue-600">
              {formatCurrency(data.average_ticket)}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm text-center">
            <p className="text-sm text-gray-500">Total de Comissões</p>
            <h3 className="text-2xl font-semibold text-red-600">
              {formatCurrency(data.total_commissions)}
            </h3>
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-white p-5 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">
          Relatório — {formatPeriod()}
        </h4>

        {loading ? (
          <p>Carregando...</p>
        ) : !data?.details?.length ? (
          <p className="text-gray-500 text-center py-6">Nenhum dado encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Profissional</th>
                  <th className="px-3 py-2 text-left">Agendamentos</th>
                  <th className="px-3 py-2 text-left">Faturamento</th>
                  <th className="px-3 py-2 text-left">Comissão %</th>
                  <th className="px-3 py-2 text-left">Valor Comissão</th>
                  <th className="px-3 py-2 text-left">Lucro Líquido</th>
                  <th className="px-3 py-2 text-left">Dias trabalhados</th>
                  <th className="px-3 py-2 text-left">Valor do dia</th>
                  <th className="px-3 py-2 text-left">Valor total à receber</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50 transition">
                    <td className="px-3 py-2">{d.name}</td>
                    <td className="px-3 py-2">{d.appointments_count}</td>
                    <td className="px-3 py-2">{formatCurrency(d.total_revenue)}</td>
                    <td className="px-3 py-2">{d.commission_rate}%</td>
                    <td className="px-3 py-2">{formatCurrency(d.commission_value)}</td>
                    <td className="px-3 py-2">{formatCurrency(d.net_profit)}</td>
                    <td className="px-3 py-2">{d.worked_days}</td>
                    <td className="px-3 py-2">{formatCurrency(d.salary)}</td>
                    <td className="px-3 py-2">{formatCurrency(d.total_to_receive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE TRANSAÇÕES */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Histórico de Transações</h4>

        {loadingHistory ? (
          <div className="text-center py-8 text-gray-500">Carregando histórico...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhuma transação encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Descrição</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Valor</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const isAppointment = item.type === "appointment";
                  const date = new Date(item.appointment_date || item.created_at);
                  const dateFormatted = date.toLocaleDateString("pt-BR");
                  const timeFormatted = date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-600">
                        <div className="text-xs">{dateFormatted}</div>
                        <div className="text-xs text-gray-400">{timeFormatted}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          isAppointment
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {isAppointment ? "Agendamento" : "Transação"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isAppointment
                          ? `${item.client_name || "Cliente"} - ${item.service_name || "Serviço"}`
                          : item.description || "Transferência PIX"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency((item.amount || 0) / 100)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          (item.status === "confirmed" || item.status === "completed")
                            ? "bg-green-100 text-green-800"
                            : item.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {item.status === "confirmed" || item.status === "completed"
                            ? "Confirmado"
                            : item.status === "pending"
                            ? "Pendente"
                            : "Falhou"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECRET CODE MODAL */}
      <SecretCodeModal
        isOpen={secretCodeModalOpen}
        title="🔐 Código de Segurança"
        description={`Digite seu código de 4 dígitos para confirmar o saque de R$ ${pendingWithdrawAmount?.toFixed(2) || '0.00'}`}
        onVerify={handleSecretCodeVerified}
        onCancel={() => {
          setSecretCodeModalOpen(false);
          setPendingWithdrawAmount(null);
        }}
        slug={slug}
        isLoading={withdrawingBalance}
        strongColor={palette?.strong_color}
        mode="verify"
      />
    </div>
  );
}
