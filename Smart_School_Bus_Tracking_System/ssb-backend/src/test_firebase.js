import admin from 'firebase-admin';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// 1. Nạp file "khóa" bí mật bạn vừa tải về
const serviceAccount = require('./config/serviceAccountKey.json');

// 2. Khởi tạo kết nối đến Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Thay URL này bằng URL database của BẠN (xem trong Firebase Console)
  databaseURL: 'https://ssb-tracking-system-default-rtdb.asia-southeast1.firebasedatabase.app/' 
});

// 3. Lấy tham chiếu đến Realtime Database
const db = admin.database();

// 4. Trỏ đến đường dẫn 'live_locations'. 
//    Ngay cả khi nó chưa tồn tại, code này vẫn chạy.
const ref = db.ref('live_locations');

// 5. GHI DỮ LIỆU. 
//    Đây chính là khoảnh khắc nhánh "live_locations" và "chuyen_test_101" được TẠO RA!
async function testWriteFirebase() {
  try {
    await ref.child('chuyen_test_101').set({
      lat: 10.7769,
      lng: 106.7009,
      maXe: 1,
      maTaiXe: 2,
      timestamp: Date.now()
    });
    
    console.log('✅ Ghi dữ liệu lên Firebase thành công!');
    console.log('👉 Hãy kiểm tra Firebase Console, nhánh "live_locations" đã xuất hiện!');

  } catch (error) {
    console.error('❌ Lỗi khi ghi dữ liệu Firebase:', error);
  } finally {
    // Đóng ứng dụng admin để chương trình kết thúc
    admin.app().delete();
  }
}

// Chạy hàm test
testWriteFirebase();