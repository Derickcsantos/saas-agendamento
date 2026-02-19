"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Chart from "chart.js/auto";

export default function SalaryChart({ dataSalary, palette }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // tipo de visualização
  const [viewType, setViewType] = useState("total");

  // calcula os valores de acordo com o filtro selecionado
  const chartData = useMemo(() => {
    if (!dataSalary) return { labels: [], values: [] };

    let values = [];

    if (viewType === "salary") {
      values = dataSalary.salary;
    }

    if (viewType === "commission") {
      values = dataSalary.commission;
    }

    if (viewType === "total") {
      values = dataSalary.total
    }

    return {
      labels: dataSalary.labels,
      values,
    };
  }, [viewType, dataSalary]);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label:
              viewType === "salary"
                ? "Salário"
                : viewType === "commission"
                ? "Comissão"
                : "Salário + Comissão",
            data: chartData.values,
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
  }, [palette, chartData, viewType]);

  return (
    <div className="bg-white rounded-xl shadow-md border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Seu Salário por Mês
      </h3>

      {/* FILTRO */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mr-2">
          Tipo de visualização:
        </label>

        <select
          value={viewType}
          onChange={(e) => setViewType(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="total">Salário + comissão</option>
          <option value="salary">Salário</option>
          <option value="commission">Comissão</option>
        </select>
      </div>

      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}