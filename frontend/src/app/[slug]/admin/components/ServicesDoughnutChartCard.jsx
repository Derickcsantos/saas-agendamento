"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

ChartJS.register(ArcElement, Tooltip, Legend);

function withAlpha(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") return `rgba(59,130,246,${alpha})`;

  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const raw = isShort
    ? normalized
        .split("")
        .map((c) => c + c)
        .join("")
    : normalized;

  const int = Number.parseInt(raw, 16);
  if (Number.isNaN(int)) return `rgba(59,130,246,${alpha})`;

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ServicesDoughnutChartCard({ org, data = [] }) {
  const { palette } = useOrganizationColors(org.slug_organization);

  const labels = useMemo(() => data.map((item) => item.service), [data]);
  const values = useMemo(() => data.map((item) => Number(item.count || 0)), [data]);

  const colors = useMemo(() => {
    const strong = palette?.strong_color || "#4f46e5";
    return [
      withAlpha(strong, 1),
      "#0ea5e9",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#14b8a6",
      "#f97316",
    ];
  }, [palette?.strong_color]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    }),
    [labels, values, colors]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
          },
        },
      },
      cutout: "62%",
    }),
    []
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold mb-4">Serviços mais populares</h2>

      {!values.length ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">
          Sem dados para exibir
        </div>
      ) : (
        <div className="h-[280px]">
          <Doughnut data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
