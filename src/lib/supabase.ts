import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:3001';
// Este identificador solo satisface el contrato del cliente. La API no lo usa para autorizar.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-client-id';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
      const storedAuth = localStorage.getItem('auth');
      let token = sessionStorage.getItem('pending_password_change_token');
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          token = parsed.token || token;
        } catch {
          // Una sesión corrupta no puede aportar un token válido.
        }
      }
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401 && token) {
        console.warn('⚠️ Sesión expirada o token JWT inválido (401). Limpiando sesión local...');
        localStorage.removeItem('auth');
        window.dispatchEvent(new Event('auth:expired'));
      }

      return response;
    }
  }
});
