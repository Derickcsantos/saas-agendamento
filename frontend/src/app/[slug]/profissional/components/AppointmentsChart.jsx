"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function AppointmentsChart({ data, palette }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Agendamentos",
            data: data.values || [],
            borderColor: palette?.strong_color || "#5E3BEE",
            backgroundColor: `${palette?.strong_color || "#5E3BEE"}20`,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: palette?.strong_color || "#5E3BEE",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
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
        Seus Agendamentos por Mês
      </h3>
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}
