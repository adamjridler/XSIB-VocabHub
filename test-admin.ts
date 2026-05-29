import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected!');
    process.exit(0);
  } catch (e) {
    console.log('Failed:', e.message);
    process.exit(1);
  }
}
test();
