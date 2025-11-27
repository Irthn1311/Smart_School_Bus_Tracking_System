/**
 * Script để geocode tất cả học sinh chưa có tọa độ
 * Sử dụng Google Geocoding API để lấy viDo/kinhDo từ địa chỉ
 * 
 * Usage: node scripts/geocode_all_students.js
 */

import HocSinhModel from "../src/models/HocSinhModel.js";
import StopSuggestionService from "../src/services/StopSuggestionService.js";
import pool from "../src/config/db.js";

// Delay giữa các requests để tránh rate limit (ms)
const DELAY_BETWEEN_REQUESTS = 100; // 100ms = ~10 requests/second (an toàn hơn 50 req/s limit)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAllStudents() {
  console.log("[GeocodeScript] ========================================");
  console.log("[GeocodeScript] Starting to geocode all students...");
  console.log("[GeocodeScript] ========================================");
  
  const connection = await pool.getConnection();
  
  try {
    // Lấy tất cả học sinh
    const allStudents = await HocSinhModel.getAll();
    console.log(`[GeocodeScript] Found ${allStudents.length} total students`);
    
    // Filter học sinh chưa có tọa độ nhưng có địa chỉ
    const studentsToGeocode = allStudents.filter(
      (s) => (!s.viDo || !s.kinhDo || isNaN(s.viDo) || isNaN(s.kinhDo)) 
        && s.diaChi 
        && s.diaChi.trim()
        && s.trangThai // Chỉ geocode học sinh đang hoạt động
    );
    
    console.log(`[GeocodeScript] ${studentsToGeocode.length} students need geocoding`);
    console.log(`[GeocodeScript] ${allStudents.length - studentsToGeocode.length} students already have coordinates`);
    
    if (studentsToGeocode.length === 0) {
      console.log("[GeocodeScript] ✅ No students need geocoding");
      return {
        success: true,
        total: allStudents.length,
        geocoded: 0,
        failed: 0,
        skipped: 0,
      };
    }
    
    // Chia thành batches để tránh quá tải
    const BATCH_SIZE = 50; // Geocode 50 học sinh mỗi batch
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < studentsToGeocode.length; i += BATCH_SIZE) {
      const batch = studentsToGeocode.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(studentsToGeocode.length / BATCH_SIZE);
      
      console.log(`[GeocodeScript] Processing batch ${batchNum}/${totalBatches} (${batch.length} students)...`);
      
      // Geocode batch với retry
      const enriched = await StopSuggestionService.enrichStudentCoordinates(
        batch,
        3 // Retry 3 lần
      );
      
      // Update vào database
      for (const student of enriched) {
        if (student.viDo && student.kinhDo && !student.missingCoords && 
            !isNaN(student.viDo) && !isNaN(student.kinhDo)) {
          try {
            await connection.query(
              `UPDATE HocSinh 
               SET viDo = ?, kinhDo = ?, ngayCapNhat = CURRENT_TIMESTAMP
               WHERE maHocSinh = ?`,
              [parseFloat(student.viDo), parseFloat(student.kinhDo), student.maHocSinh]
            );
            successCount++;
            
            if (successCount % 10 === 0) {
              console.log(`[GeocodeScript] ✅ Geocoded ${successCount} students so far...`);
            }
          } catch (updateError) {
            console.error(`[GeocodeScript] Failed to update student ${student.maHocSinh}:`, updateError.message);
            failCount++;
          }
        } else {
          console.warn(`[GeocodeScript] ⚠️ Failed to geocode student ${student.maHocSinh}: ${student.diaChi}`);
          failCount++;
        }
      }
      
      // Delay giữa các batches để tránh rate limit
      if (i + BATCH_SIZE < studentsToGeocode.length) {
        await sleep(DELAY_BETWEEN_REQUESTS * BATCH_SIZE);
      }
    }
    
    console.log("[GeocodeScript] ========================================");
    console.log(`[GeocodeScript] ✅ Successfully geocoded ${successCount} students`);
    console.log(`[GeocodeScript] ⚠️ Failed to geocode ${failCount} students`);
    console.log(`[GeocodeScript] 📊 Total processed: ${studentsToGeocode.length}`);
    console.log("[GeocodeScript] ========================================");
    
    return {
      success: true,
      total: allStudents.length,
      geocoded: successCount,
      failed: failCount,
      skipped: skipCount,
    };
    
  } catch (error) {
    console.error("[GeocodeScript] ❌ Error:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run script
geocodeAllStudents()
  .then((result) => {
    console.log("[GeocodeScript] ✅ Script completed successfully");
    console.log("[GeocodeScript] Result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("[GeocodeScript] ❌ Script failed:", error);
    process.exit(1);
  });

