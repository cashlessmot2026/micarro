import { createClient } from '@supabase/supabase-js';

// La llave "publishable" es pública por diseño: la seguridad la dan las políticas RLS (ver supabase/schema.sql).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cpamyrkqvigilyagtfex.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_zeRQ_uIdqBcOC6QBCqkFsg_HX6kifmK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
