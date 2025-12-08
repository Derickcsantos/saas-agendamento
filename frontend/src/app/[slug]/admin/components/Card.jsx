'use client'

import { useEffect, useState } from "react";

export default function Card({ title, value, org }) {
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
    <div className="bg-white rounded-lg shadow-sm p-4 border">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-semibold" style={{color: palette?.strong_color || '#000000'}}>{value ?? 0}</p>
    </div>
  );
}
