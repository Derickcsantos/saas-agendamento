"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ChartCard({ id, title, data }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        backgroundColor: "rgba(94, 59, 238, 0.3)",
        borderColor: "rgba(94, 59, 238, 1)",
        borderWidth: 2,
        borderRadius: 6,
        maxBarThickness: 50,
      }
    ]
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <Bar data={chartData} />
    </div>
  );
}
