
export async function fetchWithAuth(url, options = {}) {
  if (!url) {
    throw new Error('fetchWithAuth: url é obrigatório');
  }

  const isMapboxUrl = (target) => {
    const raw = typeof target === 'string' ? target : target?.url;
    return typeof raw === 'string' && (raw.includes('api.mapbox.com') || raw.includes('events.mapbox.com'));
  };

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  const headers = {
    ...options.headers,
  };


  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
    console.error('fetchWithAuth: falha na requisição', { resolvedUrl, error });
    throw error;
  }
}


if (typeof window !== 'undefined' && !window.__fetchAuthPatched) {
  const originalFetch = window.fetch;

  const isMapboxUrl = (target) => {
    const raw = typeof target === 'string' ? target : target?.url;
    return typeof raw === 'string' && (raw.includes('api.mapbox.com') || raw.includes('events.mapbox.com'));
  };

  window.fetch = async function(...args) {
    const url = args[0];
    const options = args[1] || {};

    if (options.__fetchAuthApplied) {
      return originalFetch.apply(this, args);
    }

    if (isMapboxUrl(url)) {
      if (url instanceof Request) {
        const safeRequest = new Request(url, { credentials: 'omit' });
        return originalFetch.apply(this, [safeRequest]);
      }

      const safeOptions = { ...options, credentials: 'omit' };
      return originalFetch.apply(this, [url, safeOptions]);
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
      console.error('fetch (patched) falhou', { url, error });
      throw error;
    }
  };

  window.__fetchAuthPatched = true;
}

