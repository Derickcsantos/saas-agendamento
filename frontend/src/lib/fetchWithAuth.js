/**
 * fetchWithAuth - Wrapper universal para fetch que:
 * 1. Tenta usar cookie (credentials: 'include')
 * 2. Se token existe em sessionStorage (fallback iOS/Safari), injeta no header Authorization
 * 3. Funciona para TODAS as requisições, autenticadas ou não
 */
export async function fetchWithAuth(url, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const headers = {
    ...options.headers,
  };

  // Se houver token em sessionStorage (fallback para iOS/Safari), injeta no header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Sempre tenta incluir credenciais (cookies) para outros navegadores
  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  return fetch(url, config);
}

/**
 * Monkey-patch fetch global para injetar token automaticamente em TODAS as requisições
 * sem precisar alterar cada chamada individualmente
 */
if (typeof window !== 'undefined' && !window.__fetchAuthPatched) {
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};

    // Evita loop infinito - não patcha requisições já tratadas
    if (options.__fetchAuthApplied) {
      return originalFetch.apply(this, args);
    }

    const token = sessionStorage.getItem('token');
    const headers = {
      ...options.headers,
    };

    // Se houver token, injeta no header
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Marca como já processado e inclui credenciais
    const newOptions = {
      ...options,
      headers,
      credentials: options.credentials || 'include',
      __fetchAuthApplied: true,
    };

    return originalFetch.apply(this, [url, newOptions]);
  };

  window.__fetchAuthPatched = true;
}

