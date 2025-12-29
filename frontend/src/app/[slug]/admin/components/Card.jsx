'use client'

import { useEffect, useState } from "react";

export default function Card({ title, value, org, icon }) {
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {title}
          </h3>

          <p
            className="mt-2 text-3xl font-bold"
            style={{ color: palette?.strong_color || "#111827" }}
          >
            {value ?? 0}
          </p>

          {/* opcional: subtítulo */}
          {/* <p className="mt-1 text-sm text-gray-400">Total no período</p> */}
        </div>

        {icon && (
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${palette?.strong_color || "#5E3BEE"}15`,
              color: palette?.strong_color || "#5E3BEE",
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}