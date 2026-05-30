import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  const email = 'adamridler89@gmail.com'; // User's email
  const password = 'password123'; // Guess?
  // Let's try signing up a test user
  const testEmail = 'testdude123@vocabhub.local';
  
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: 'password123!'
  });
  console.log('authData:', authData.user?.id, authErr);
  
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
