/**
 * fetchWithAuth - Wrapper para fetch que:
 * 1. Tenta usar cookie (credentials: 'include')
 * 2. Se token existe em sessionStorage (fallback iOS/Safari), injeta no header Authorization
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
