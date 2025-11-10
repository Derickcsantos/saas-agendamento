"use client";
import { useEffect } from "react";
import { Chart } from "chart.js/auto";

export default function ChartCard({ title, id }) {
  useEffect(() => {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    new Chart(ctx, {
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
      options: { responsive: true, maintainAspectRatio: false },
    });
  }, [id, title]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border h-72">
      <h4 className="font-semibold text-gray-700 mb-4">{title}</h4>
      <canvas id={id} className="w-full h-full" />
    </div>
  );
}
