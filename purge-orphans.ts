import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const admin = createClient(supabaseUrl, supabaseServiceKey);

async function purge() {
  const { data: codes } = await admin.from('access_codes').select('code');
  const codeSet = new Set((codes || []).map(c => c.code));

  const { data: profiles } = await admin.from('profiles').select('*').eq('role', 'student');
  for (const p of (profiles || [])) {
    if (p.access_code && !codeSet.has(p.access_code)) {
      console.log('Purging orphaned student:', p.name, p.access_code);
      await admin.auth.admin.deleteUser(p.id);
      await admin.from('profiles').delete().eq('id', p.id);
      await admin.from('game_sessions').delete().eq('user_id', p.id);
    }
  }
  console.log("Done purging");
}
purge();
