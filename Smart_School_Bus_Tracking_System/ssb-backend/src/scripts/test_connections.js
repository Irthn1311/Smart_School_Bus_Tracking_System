// Script test kết nối SQL và Firebase
import pool from "../config/db.js";
import admin from 'firebase-admin';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);

// ============================================
// TEST KẾT NỐI SQL
// ============================================
async function testSQLConnection() {
  console.log('\n🔍 Đang kiểm tra kết nối MySQL...\n');
  
  try {
    // Test 1: Kết nối cơ bản
    const connection = await pool.getConnection();
    console.log('✅ Kết nối MySQL thành công!');
    
    // Test 2: Query đơn giản
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✅ Query test thành công:', rows);
    
    // Test 3: Kiểm tra database
    const [dbInfo] = await connection.query('SELECT DATABASE() as db');
    console.log('✅ Database hiện tại:', dbInfo[0].db);
    
    // Test 4: Kiểm tra bảng có tồn tại không
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    console.log('✅ Số lượng bảng trong database:', tables[0].count);
    
    // Test 5: Kiểm tra một số bảng quan trọng
    const importantTables = ['NguoiDung', 'XeBuyt', 'TaiXe', 'HocSinh', 'TuyenDuong', 'ChuyenDi'];
    for (const table of importantTables) {
      try {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   - Bảng ${table}: ${count[0].count} bản ghi`);
      } catch (err) {
        console.log(`   - Bảng ${table}: ❌ Không tồn tại hoặc lỗi`);
      }
    }
    
    connection.release();
    console.log('\n✅ TẤT CẢ TEST SQL ĐỀU THÀNH CÔNG!\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ LỖI KẾT NỐI SQL:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('\n💡 Kiểm tra:');
    console.error('   - MySQL server có đang chạy không?');
    console.error('   - Thông tin trong .env có đúng không?');
    console.error('   - Database đã được tạo chưa? (chạy npm run db:init)\n');
    return false;
  }
}

// ============================================
// TEST KẾT NỐI FIREBASE
// ============================================
async function testFirebaseConnection() {
  console.log('\n🔍 Đang kiểm tra kết nối Firebase...\n');
  
  try {
    // Kiểm tra file serviceAccountKey.json
    let serviceAccount;
    try {
      serviceAccount = require('../config/serviceAccountKey.json');
      console.log('✅ Đã tìm thấy file serviceAccountKey.json');
    } catch (err) {
      console.error('❌ Không tìm thấy file serviceAccountKey.json');
      console.error('   Đường dẫn mong đợi: src/config/serviceAccountKey.json');
      return false;
    }
    
    // Khởi tạo Firebase Admin
    let app;
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://ssb-tracking-system-default-rtdb.asia-southeast1.firebasedatabase.app/'
      });
      console.log('✅ Khởi tạo Firebase Admin thành công');
    } catch (err) {
      console.error('❌ Lỗi khởi tạo Firebase Admin:', err.message);
      return false;
    }
    
    // Test kết nối Realtime Database
    const db = admin.database();
    const testRef = db.ref('test_connection');
    
    // Test write
    const testData = {
      timestamp: Date.now(),
      message: 'Test connection from SSB Backend'
    };
    
    await testRef.set(testData);
    console.log('✅ Ghi dữ liệu test lên Firebase thành công');
    
    // Test read
    const snapshot = await testRef.once('value');
    const data = snapshot.val();
    console.log('✅ Đọc dữ liệu từ Firebase thành công:', data);
    
    // Xóa dữ liệu test
    await testRef.remove();
    console.log('✅ Đã xóa dữ liệu test');
    
    // Đóng app
    await admin.app().delete();
    console.log('\n✅ TẤT CẢ TEST FIREBASE ĐỀU THÀNH CÔNG!\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ LỖI KẾT NỐI FIREBASE:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('\n💡 Kiểm tra:');
    console.error('   - File serviceAccountKey.json có đúng không?');
    console.error('   - Database URL có đúng không?');
    console.error('   - Firebase project có đang hoạt động không?');
    console.error('   - Quyền truy cập Firebase có đúng không?\n');
    return false;
  }
}

// ============================================
// CHẠY TẤT CẢ TEST
// ============================================
(async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST KẾT NỐI SQL VÀ FIREBASE');
  console.log('═══════════════════════════════════════════════════');
  
  const sqlResult = await testSQLConnection();
  const firebaseResult = await testFirebaseConnection();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   KẾT QUẢ TỔNG HỢP');
  console.log('═══════════════════════════════════════════════════');
  console.log(`SQL:        ${sqlResult ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}`);
  console.log(`Firebase:   ${firebaseResult ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (sqlResult && firebaseResult) {
    console.log('🎉 TẤT CẢ KẾT NỐI ĐỀU HOẠT ĐỘNG TỐT!');
    process.exit(0);
  } else {
    console.log('⚠️  CÓ LỖI XẢY RA, VUI LÒNG KIỂM TRA LẠI!');
    process.exit(1);
  }
})();

