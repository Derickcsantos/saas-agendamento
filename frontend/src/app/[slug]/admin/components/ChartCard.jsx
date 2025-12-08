"use client";

import { Bar } from "react-chartjs-2";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ChartCard({ id, title, data, org }) {
  const [palette, setPalette] = useState(null);
  
  useEffect(() => {
      async function fetchData() {
        try {
          // Executa ambas as chamadas em paralelo
          const [colorRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${org?.slug_organization}`, {
              credentials: "include",
            }),
          ]);
    
          if (!colorRes.ok) throw new Error("Palette not found");
    
          const paletteData = await colorRes.json();
    
          setPalette(paletteData); 
    
        } catch (err) {
          console.error("Erro ao buscar dados:", err);
          setNotFound(true);
        }
      }

    
      if (org?.slug_organization) fetchData();
    }, [org]);

    console.log(palette)

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
