import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profile Check:', profileData, profileError);
}
check();
