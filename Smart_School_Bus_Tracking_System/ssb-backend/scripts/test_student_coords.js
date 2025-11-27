/**
 * Quick test script để kiểm tra học sinh có tọa độ
 * Chạy: node scripts/test_student_coords.js
 */

import HocSinhModel from "../src/models/HocSinhModel.js";

async function test() {
  console.log("=== TEST: Kiểm tra học sinh có tọa độ ===\n");
  
  try {
    const students = await HocSinhModel.getAll();
    console.log(`✓ Tổng số học sinh từ getAll(): ${students.length}`);
    
    if (students.length > 0) {
      const sample = students[0];
      console.log("\n✓ Sample student đầu tiên:");
      console.log(JSON.stringify({
        maHocSinh: sample.maHocSinh,
        hoTen: sample.hoTen,
        viDo: sample.viDo,
        kinhDo: sample.kinhDo,
        viDoType: typeof sample.viDo,
        kinhDoType: typeof sample.kinhDo,
        trangThai: sample.trangThai,
        trangThaiType: typeof sample.trangThai,
      }, null, 2));
      
      // Test filter
      const withCoords = students.filter((s) => {
        const hasValidCoords = 
          s.viDo != null && 
          s.kinhDo != null &&
          s.viDo !== '' &&
          s.kinhDo !== '' &&
          !isNaN(parseFloat(s.viDo)) &&
          !isNaN(parseFloat(s.kinhDo)) &&
          isFinite(parseFloat(s.viDo)) &&
          isFinite(parseFloat(s.kinhDo));
        
        const isActive = s.trangThai === true || s.trangThai === 1 || s.trangThai === '1';
        
        return hasValidCoords && isActive;
      });
      
      console.log(`\n✓ Học sinh có tọa độ hợp lệ: ${withCoords.length}`);
      
      if (withCoords.length === 0) {
        console.log("\n⚠ KHÔNG TÌM THẤY HỌC SINH CÓ TỌA ĐỘ!");
        console.log("\nDebug info:");
        students.slice(0, 5).forEach((s, idx) => {
          console.log(`\nStudent ${idx + 1}:`);
          console.log(`  - viDo: ${s.viDo} (${typeof s.viDo})`);
          console.log(`  - kinhDo: ${s.kinhDo} (${typeof s.kinhDo})`);
          console.log(`  - trangThai: ${s.trangThai} (${typeof s.trangThai})`);
        });
      } else {
        console.log("\n✓ SUCCESS! Tìm thấy học sinh có tọa độ.");
      }
    } else {
      console.log("⚠ KHÔNG CÓ HỌC SINH NÀO TRONG DATABASE!");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("✗ Lỗi:", error);
    process.exit(1);
  }
}

test();

