// RevenueTab.jsx - fully corrected, complete and improved UI
"use client";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { toast } from 'react-toastify'
import "jspdf-autotable";

export default function RevenueTab({ org }) {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

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

      const res = await fetch(url);
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
      let url = `${API}/api/admin/${slug}/revenue/export`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
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

      doc.autoTable({
        head: [headers],
        body,
        startY: 55,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
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
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

  return (
    <div className="space-y-6">
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
          className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow"
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

      {/* CARDS RESUMO */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
