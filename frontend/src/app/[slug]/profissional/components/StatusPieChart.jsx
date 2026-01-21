"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function StatusPieChart({ data, palette }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const colors = [
      palette?.strong_color || "#5E3BEE",
      palette?.medium_color || "#FFA500",
      "#EF4444",
    ];

    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            data: data.values || [],
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, palette]);

  return (
    <div className="bg-white rounded-xl shadow-md border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Status dos Agendamentos
      </h3>
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}
