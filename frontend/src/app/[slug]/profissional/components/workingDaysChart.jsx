"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Chart from "chart.js/auto";

export default function AppointmentsByDayLineChart({ dataAppointments, palette }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    if (!dataAppointments) return;

    const monthsSorted = Object.entries(dataAppointments)
      .sort((a, b) => {
        const dateA = new Date(`${a[1].month} 1, ${a[1].year}`);
        const dateB = new Date(`${b[1].month} 1, ${b[1].year}`);
        return dateA - dateB;
      })
      .map(([key]) => key);

    if (monthsSorted.length > 0) {
      setSelectedMonth(monthsSorted[monthsSorted.length - 1]);
    }
  }, [dataAppointments]);

  const chartData = useMemo(() => {
    if (!dataAppointments || !selectedMonth)
      return { labels: [], values: [] };

    const monthData = dataAppointments[selectedMonth];
    if (!monthData) return { labels: [], values: [] };

    const labels = [];
    const values = [];

    for (let day = 1; day <= monthData.days; day++) {
      labels.push(day);
      values.push(monthData.appointments?.[day] || 0);
    }

    return { labels, values };
  }, [selectedMonth, dataAppointments]);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Agendamentos por dia",
            data: chartData.values,
            borderColor: palette?.strong_color || "#5E3BEE",
            backgroundColor: palette?.strong_color || "#5E3BEE",
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
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
          x: {
            title: {
              display: true,
              text: "Dias do mês",
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Quantidade de agendamentos",
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
  }, [chartData, selectedMonth]);

  return (
    <div className="bg-white rounded-xl shadow-md border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Agendamentos por Dia do Mês
      </h3>

      {/* seletor de mês */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mr-2">Mês:</label>
        <select
          value={selectedMonth || ""}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {Object.entries(dataAppointments || {}).map(([key, monthData]) => (
            <option key={key} value={key}>
              {monthData.month} / {monthData.year}
            </option>
          ))}
        </select>
      </div>

      <div className="h-72">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}
