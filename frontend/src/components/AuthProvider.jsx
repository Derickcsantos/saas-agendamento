'use client';

import { useEffect } from 'react';

/**
 * AuthProvider - Ativa o monkey-patch de fetch globalmente
 * Deve ser usado no layout raiz para interceptar TODAS as requisições
 */
export default function AuthProvider({ children }) {
  useEffect(() => {
    // Importa e ativa o patch
    import('@/lib/fetchWithAuth').then(() => {
      // O patch é ativado automaticamente ao importar
    });
  }, []);

  return <>{children}</>;
}
