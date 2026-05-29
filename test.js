import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/vocab-insights',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.write(JSON.stringify({ word: 'ubiquitous', type: 'examples' }));
req.end();
