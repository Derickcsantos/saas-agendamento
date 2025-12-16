import { useState, useEffect } from 'react';

/**
 * Hook customizado para buscar as cores da organização.
 * @param {string} slug - O slug da organização.
 * @returns {{ palette: object | null }} - Retorna o objeto de cores da paleta.
 */
export default function useOrganizationColors(slug) {
  const [palette, setPalette] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const colorRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
          { credentials: "include" }
        );
        
        if (!colorRes.ok) throw new Error("Palette not found");

        const paletteData = await colorRes.json();
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar paleta:", err);
        // Opcional: setar a paleta para um valor padrão em caso de erro.
      }
    }

    // A requisição só é feita se o slug existir (não for null ou undefined)
    if (slug) fetchData();
  }, [slug]);

  return { palette };
}