/**
 * Script để kiểm tra dữ liệu schedule_student_stops
 * Chạy: node scripts/check_schedule_students.js [scheduleId]
 */

import pool from "../src/config/db.js";

async function checkScheduleStudents(scheduleId = null) {
  try {
    console.log("=".repeat(60));
    console.log("Checking schedule_student_stops data...");
    console.log("=".repeat(60));

    // 1. Kiểm tra tổng số schedules
    const [schedules] = await pool.query(
      `SELECT maLichTrinh, maTuyen, ngayChay, gioKhoiHanh, loaiChuyen 
       FROM LichTrinh 
       ORDER BY ngayChay DESC, maLichTrinh DESC 
       LIMIT 10`
    );
    console.log(`\n📋 Recent schedules (${schedules.length}):`);
    schedules.forEach(s => {
      console.log(`  - Schedule ${s.maLichTrinh}: Route ${s.maTuyen}, ${s.ngayChay} ${s.gioKhoiHanh} (${s.loaiChuyen})`);
    });

    // 2. Kiểm tra schedule_student_stops
    let query = `
      SELECT 
        sss.maLichTrinh,
        COUNT(*) as studentCount,
        lt.maTuyen,
        lt.ngayChay
      FROM schedule_student_stops sss
      LEFT JOIN LichTrinh lt ON sss.maLichTrinh = lt.maLichTrinh
      ${scheduleId ? 'WHERE sss.maLichTrinh = ?' : ''}
      GROUP BY sss.maLichTrinh, lt.maTuyen, lt.ngayChay
      ORDER BY sss.maLichTrinh DESC
      LIMIT 10
    `;
    const params = scheduleId ? [scheduleId] : [];
    const [scheduleStudents] = await pool.query(query, params);
    
    console.log(`\n👥 Schedules with students (${scheduleStudents.length}):`);
    scheduleStudents.forEach(s => {
      console.log(`  - Schedule ${s.maLichTrinh}: ${s.studentCount} students (Route ${s.maTuyen}, ${s.ngayChay})`);
    });

    // 3. Nếu có scheduleId, hiển thị chi tiết
    if (scheduleId) {
      const [details] = await pool.query(
        `SELECT 
          sss.*,
          hs.hoTen,
          hs.viDo,
          hs.kinhDo,
          d.tenDiem,
          d.viDo as stopViDo,
          d.kinhDo as stopKinhDo,
          rs.sequence
         FROM schedule_student_stops sss
         LEFT JOIN HocSinh hs ON sss.maHocSinh = hs.maHocSinh
         LEFT JOIN DiemDung d ON sss.maDiem = d.maDiem
         LEFT JOIN LichTrinh lt ON sss.maLichTrinh = lt.maLichTrinh
         LEFT JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = sss.maDiem
         WHERE sss.maLichTrinh = ?
         ORDER BY sss.thuTuDiem, hs.hoTen`,
        [scheduleId]
      );
      
      console.log(`\n📊 Details for schedule ${scheduleId} (${details.length} students):`);
      details.forEach((d, i) => {
        console.log(`  ${i + 1}. Student ${d.maHocSinh} (${d.hoTen}) → Stop ${d.maDiem} (${d.tenDiem}), sequence: ${d.sequence || d.thuTuDiem}`);
        console.log(`     Student coords: ${d.viDo}, ${d.kinhDo || 'N/A'}`);
        console.log(`     Stop coords: ${d.stopViDo || 'N/A'}, ${d.stopKinhDo || 'N/A'}`);
      });
    }

    // 4. Kiểm tra học sinh có tọa độ
    const [studentsWithCoords] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM HocSinh 
       WHERE viDo IS NOT NULL AND kinhDo IS NOT NULL AND trangThai = TRUE`
    );
    const [studentsWithoutCoords] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM HocSinh 
       WHERE (viDo IS NULL OR kinhDo IS NULL) AND trangThai = TRUE`
    );
    
    console.log(`\n📍 Students with coordinates: ${studentsWithCoords[0].count}`);
    console.log(`   Students without coordinates: ${studentsWithoutCoords[0].count}`);

    // 5. Kiểm tra route stops có tọa độ
    const [stopsWithCoords] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM route_stops rs
       JOIN DiemDung d ON rs.stop_id = d.maDiem
       WHERE d.viDo IS NOT NULL AND d.kinhDo IS NOT NULL`
    );
    const [stopsWithoutCoords] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM route_stops rs
       JOIN DiemDung d ON rs.stop_id = d.maDiem
       WHERE d.viDo IS NULL OR d.kinhDo IS NULL`
    );
    
    console.log(`\n🚏 Route stops with coordinates: ${stopsWithCoords[0].count}`);
    console.log(`   Route stops without coordinates: ${stopsWithoutCoords[0].count}`);

    // 6. Kiểm tra TrangThaiHocSinh
    const [tripStudents] = await pool.query(
      `SELECT 
        maChuyen,
        COUNT(*) as studentCount
       FROM TrangThaiHocSinh
       GROUP BY maChuyen
       ORDER BY maChuyen DESC
       LIMIT 10`
    );
    
    console.log(`\n🚌 Recent trips with students (${tripStudents.length}):`);
    tripStudents.forEach(t => {
      console.log(`  - Trip ${t.maChuyen}: ${t.studentCount} students`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("Check completed!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

// Get scheduleId from command line args
const scheduleId = process.argv[2] ? parseInt(process.argv[2]) : null;
checkScheduleStudents(scheduleId);

