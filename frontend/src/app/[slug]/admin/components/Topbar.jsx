'use client';

import { useState, useEffect, useRef } from 'react'
import { useRouter } from "next/navigation";
import PWAInstallButton from '@/components/PWAInstallButton';
import { SEARCH_ACTIONS } from '../../../utils/searchAdminActions'

// Adicionada a prop setActiveTab para controlar o estado do Sidebar
export default function Topbar({ org, slug, setActiveTab, user, appInstalled, onAppInstalled, palette: paletteFromProps }) {
  const [palette, setPalette] = useState(paletteFromProps || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
          credentials: "include",
        });
        if (res.ok) setPalette(await res.json());
      } catch (err) { console.error(err); }
    }
    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }
    const filtered = SEARCH_ACTIONS.filter(action =>
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.keywords.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setResults(filtered);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Alterado: Agora ativa a aba em vez de fazer router.push
  const handleAction = (action) => {
    setActiveTab(action.path); // 'path' no seu array SEARCH_ACTIONS corresponde ao 'key' do sidebar
    setSearchTerm("");
    setIsFocused(false);

    // Se houver uma query action (ex: ?action=new), você pode tratar aqui ou emitir um evento
    if (action.path.includes('?action=')) {
        const tab = action.path.split('?')[0];
        setActiveTab(tab);
    }
  };

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { 
      method: "POST", 
      credentials: "include" 
    });
    // 🔥 Limpa token do sessionStorage
    sessionStorage.removeItem('token');
    router.push(`/${slug}/login`);
  };

  return (
    <header className="shadow-sm px-6 py-3 flex justify-between items-center bg-white relative ">
      <h1 className="text-lg font-semibold hidden md:block" style={{color: palette?.strong_color || '#511456'}}>
        Painel Administrativo
      </h1>

      <div className="flex-1 max-w-md mx-4 relative" ref={searchRef}>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            placeholder="Buscar funcionalidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:outline-none transition-all"
            style={{ 
              border: `1px solid ${palette?.strong_color}20`,
              outlineColor: palette?.strong_color 
            }}
          />
        </div>

        {isFocused && results.length > 0 && (
          <div className="absolute mt-2 w-full bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-[70]">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleAction(result)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-none"
              >
                <i className="bi bi-arrow-return-right text-gray-400"></i>
                <span className="font-medium text-gray-700">{result.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Botão PWA Install */}
      {!appInstalled && user && (
        <PWAInstallButton 
          userId={user.id} 
          palette={palette}
          onInstallSuccess={onAppInstalled}
        />
      )}

      <button onClick={logout} className="hover:opacity-80 transition-opacity p-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" fill={palette?.strong_color || '#511456'} fillOpacity="0.1"/>
          <path d="M15.75 8.25L19.5 12M19.5 12L15.75 15.75M19.5 12H9.75M9.75 4.5H7.5C5.84315 4.5 4.5 5.84315 4.5 7.5V16.5C4.5 18.1569 5.84315 19.5 7.5 19.5H9.75" stroke={palette?.strong_color || '#511456'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </header>
  );
}