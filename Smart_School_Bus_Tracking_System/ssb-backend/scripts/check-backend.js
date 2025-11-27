#!/usr/bin/env node
/**
 * Script để kiểm tra backend server có đang chạy không
 * Chạy: node scripts/check-backend.js
 */

import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const HEALTH_ENDPOINT = `${BACKEND_URL}/api/v1/health`;

console.log('='.repeat(60));
console.log('🔍 Kiểm tra Backend Server');
console.log('='.repeat(60));
console.log(`\n📡 Đang kiểm tra: ${HEALTH_ENDPOINT}\n`);

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Backend server đang chạy!');
      console.log(`   Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('   Response:', JSON.stringify(json, null, 2));
      } catch {
        console.log('   Response:', data);
      }
      console.log('\n' + '='.repeat(60));
      process.exit(0);
    } else {
      console.log('⚠️  Backend server trả về status code:', res.statusCode);
      console.log('   Response:', data);
      console.log('\n' + '='.repeat(60));
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Không thể kết nối đến backend server!');
  console.error(`   Error: ${error.message}`);
  console.error('\n💡 Có thể backend server chưa được khởi động.');
  console.error('   Hãy chạy: cd ssb-backend && npm run dev');
  console.error('\n' + '='.repeat(60));
  process.exit(1);
});

req.on('timeout', () => {
  console.error('⏱️  Request timeout - Backend server không phản hồi');
  req.destroy();
  process.exit(1);
});

req.end();

