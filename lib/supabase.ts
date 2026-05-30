import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

// @ts-ignore - Create an empty proxy or client if url is missing so app doesn't immediately crash.
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : new Proxy({}, {
  get: () => {
    return () => {
      throw new Error("Supabase URL or Anon Key is missing. Check your environment variables.");
    };
  }
}) as any;

