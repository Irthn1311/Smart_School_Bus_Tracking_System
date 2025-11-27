/**
 * Script để tạo ChuyenDi từ các LichTrinh đã tồn tại nhưng chưa có ChuyenDi
 * Chạy: node scripts/backfill-trips-from-schedules.js
 */

import pool from '../src/config/db.js';
import ChuyenDiModel from '../src/models/ChuyenDiModel.js';

async function backfillTripsFromSchedules() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Bắt đầu backfill ChuyenDi từ LichTrinh...');
    
    // Lấy tất cả LichTrinh có ngayChay >= hôm nay và chưa có ChuyenDi
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const [schedules] = await connection.query(`
      SELECT lt.*
      FROM LichTrinh lt
      WHERE lt.ngayChay >= ?
        AND lt.dangApDung = 1
        AND NOT EXISTS (
          SELECT 1 
          FROM ChuyenDi cd 
          WHERE cd.maLichTrinh = lt.maLichTrinh 
            AND DATE(cd.ngayChay) = DATE(lt.ngayChay)
        )
      ORDER BY lt.ngayChay, lt.gioKhoiHanh
    `, [today]);
    
    console.log(`📋 Tìm thấy ${schedules.length} LichTrinh cần tạo ChuyenDi`);
    
    if (schedules.length === 0) {
      console.log('✅ Không có LichTrinh nào cần backfill');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const schedule of schedules) {
      try {
        // Tạo ChuyenDi
        const tripId = await ChuyenDiModel.create({
          maLichTrinh: schedule.maLichTrinh,
          ngayChay: schedule.ngayChay,
          trangThai: 'chua_khoi_hanh',
          ghiChu: null,
        });
        
        console.log(`✅ Đã tạo ChuyenDi ${tripId} cho LichTrinh ${schedule.maLichTrinh} (${schedule.ngayChay})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Lỗi khi tạo ChuyenDi cho LichTrinh ${schedule.maLichTrinh}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Kết quả:');
    console.log(`   ✅ Thành công: ${successCount}`);
    console.log(`   ❌ Lỗi: ${errorCount}`);
    console.log(`   📋 Tổng: ${schedules.length}`);
    
  } catch (error) {
    console.error('❌ Lỗi khi backfill:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Chạy script
backfillTripsFromSchedules()
  .then(() => {
    console.log('✅ Hoàn thành backfill');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });

