import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  const testEmail = 'testdude1234@gmail.com';
  
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: 'password123!'
  });
  console.log('authData err:', authErr);
  
  if (authData.user) {
    const { data: pData, error: pErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      role: 'teacher',
      name: 'Test Dude'
    }).select();
    console.log('Profiles insert:', pData, pErr);
  }
}
testAuth();
