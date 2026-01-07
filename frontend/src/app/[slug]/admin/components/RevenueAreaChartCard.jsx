"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

function formatBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatPeriodBR(period) {
  if (!period || !period.includes(" a ")) return period;

  const [start, end] = period.split(" a ");
  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
}


export default function RevenueAreaChartCard({ org }) {
  const { palette } = useOrganizationColors(org.slug_organization);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLatestRevenue() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/revenue/marcafy/latest`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const msg = `Falha ao buscar receitas (${res.status})`;
          throw new Error(msg);
        }

        const data = await res.json();
        if (isMounted) setApiData(data);
      } catch (e) {
        if (isMounted) setError(e?.message || "Erro ao buscar dados");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLatestRevenue();
    return () => {
      isMounted = false;
    };
  }, []);

  // Esperado da API (sugestão):
  // { months: [{ label, total_revenue, appointments_count, ... }], total_revenue, period }
  const months = apiData?.months || [];

  const labels = useMemo(() => months.map((m) => m.label), [months]);
  const values = useMemo(() => months.map((m) => Number(m.total_revenue || 0)), [months]);

  const strong = palette?.strong_color || "#111827"; // fallback

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Receita",
          data: values,
          borderColor: strong,
          backgroundColor: "rgba(0,0,0,0)", // sem fill
          fill: false,
          tension: 0.35, // smooth premium
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 12,
        },
      ],
    }),
    [labels, values, strong]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false, // permite altura fixa responsiva
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: (ctx) => ` ${formatBRL(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            color: "#6B7280",
            font: { size: 12 },
          },
        },
        y: {
          grid: { color: "rgba(17, 24, 39, 0.06)" },
          ticks: {
            color: "#6B7280",
            callback: (value) => formatBRL(value),
          },
        },
      },
    }),
    []
  );

  const headline = apiData?.total_revenue != null ? formatBRL(apiData.total_revenue) : "—";
  const rawPeriod = apiData?.period;
  const period = rawPeriod ? formatPeriodBR(rawPeriod) : "Últimos 12 meses";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Receita (últimos 12 meses)</h2>
          <p className="text-sm text-gray-500">{period}</p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500">Total no período</p>
          <p className="text-2xl font-semibold text-gray-900">{headline}</p>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="h-[280px] w-full rounded-xl bg-gray-50 animate-pulse" />
        ) : error ? (
          <div className="h-[280px] w-full rounded-xl bg-red-50 border border-red-100 flex items-center justify-center px-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
}
