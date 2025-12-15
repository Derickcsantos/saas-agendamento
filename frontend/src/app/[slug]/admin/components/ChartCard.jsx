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
import useOrganizationColors from "@/app/utils/useOrganizationColors";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ChartCard({ id, title, data, org }) {
  const { palette } = useOrganizationColors(org.slug_organization);

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        backgroundColor: palette?.strong_color,
        borderColor: palette?.strong_color,
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
