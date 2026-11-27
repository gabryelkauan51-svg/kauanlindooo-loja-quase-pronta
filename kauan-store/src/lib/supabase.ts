import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente único do Supabase. A sessão de login (Google/Discord) é mantida e renovada
 * automaticamente. Pedidos, favoritos, perfil e carteira ficam SEMPRE no banco.
 */
export const supabase = createClient(url || 'https://missing.supabase.co', anon || 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const supabaseConfigured = Boolean(url && anon);
