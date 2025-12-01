'use client';

import { useState, useEffect } from 'react'
import { useRouter,} from "next/navigation";

export default function Topbar({ org, slug }) {
  const [palette, setPalette] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Executa ambas as chamadas em paralelo
        const [colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
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
  
    if (slug) fetchData();
  }, [slug]);

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { 
      method: "POST",
      credentials: "include" 
    });
    router.push(`/${slug}/login`);
  };

  return (
    <header className=" shadow-sm px-6 py-3 flex justify-between items-center bg-white" >
      <h1 className="text-lg font-semibold " style={{color: palette?.strong_color || '#511456'}}>
        Painel Administrativo — {org.name}
      </h1>
      <button
        onClick={logout}
        className=" font-medium "
        style={{color: palette?.strong_color || '#511456'}}
      >
        <svg width="30" height="40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 12a1 1 0 0 0 1 1h7.59l-2.3 2.29a1 1 0 0 0 0 1.42a1 1 0 0 0 1.42 0l4-4a1 1 0 0 0 .21-.33a1 1 0 0 0 0-.76a1 1 0 0 0-.21-.33l-4-4a1 1 0 1 0-1.42 1.42l2.3 2.29H5a1 1 0 0 0-1 1M17 2H7a3 3 0 0 0-3 3v3a1 1 0 0 0 2 0V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3a1 1 0 0 0-2 0v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3"/></svg>
      </button>
    </header>
  );
}
