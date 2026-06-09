import { api } from './lib/api';
async function test() {
  const result = await api.getPublicMessage();
  console.log('Result:', result);
}
test();
