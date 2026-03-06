/**
 * fetchWithAuth - Wrapper universal para fetch que:
 * 1. Tenta usar cookie (credentials: 'include')
 * 2. Se token existe em sessionStorage (fallback iOS/Safari), injeta no header Authorization
 * 3. Funciona para TODAS as requisições, autenticadas ou não
 */
export async function fetchWithAuth(url, options = {}) {
  if (!url) {
    throw new Error('fetchWithAuth: url é obrigatório');
  }

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const headers = {
    ...options.headers,
  };

  // Se houver token em sessionStorage (fallback para iOS/Safari), injeta no header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Resolve URL relativa para evitar erros de origem / mixed content
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' && window.location?.origin) ||
    '';
  const resolvedUrl = url.startsWith('http') ? url : `${base}${url}`;

  // Sempre tenta incluir credenciais (cookies) para outros navegadores
  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  try {
    return await fetch(resolvedUrl, config);
  } catch (error) {
    console.warn('fetchWithAuth: falha na requisição', resolvedUrl);
    return new Response(null, {status: 500});
  }
}

/**
 * Monkey-patch fetch global para injetar token automaticamente em TODAS as requisições
 * sem precisar alterar cada chamada individualmente
 */
if (typeof window !== 'undefined' && !window.__fetchAuthPatched) {
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
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

    try {
      return await originalFetch.apply(this, [url, newOptions]);
    } catch (error) {
      console.warn('fetch (patched) falhou', url);
      return new Response(null, { status: 500});
    }
  };

  window.__fetchAuthPatched = true;
}

