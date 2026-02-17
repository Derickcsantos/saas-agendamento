"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function SalaryChart({ dataSalary, palette }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // dados fictícios de salário por mês
    const data = {
      labels: dataSalary?.labels || [],
      values: dataSalary?.values || []
    };

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Salário (R$)",
            data: data.values,
            backgroundColor: palette?.strong_color || "#5E3BEE",
            borderRadius: 8,
            barThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `R$ ${value}`,
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
  }, [palette, dataSalary]);

  return (
    <div className="bg-white rounded-xl shadow-md border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Seu Salário por Mês
      </h3>
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}