"use client";
import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

export default function ChartCard({ title, id }) {
  const chartInstance = useRef(null);

  useEffect(() => {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    // Se já existe um chart anterior, destrói antes de criar outro
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
        datasets: [
          {
            label: title,
            data: [5, 10, 8, 12, 6, 9],
            backgroundColor: "rgba(99, 102, 241, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    // Cleanup quando o componente desmontar
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [id, title]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border h-72">
      <h4 className="font-semibold text-gray-700 mb-4">{title}</h4>
      <canvas id={id} className="w-full h-full" />
    </div>
  );
}
