// @ts-nocheck
import pool from './src/config/db.js';

async function checkAttendanceData() {
  try {
    console.log('=== Kiểm tra dữ liệu chuyến xe và học sinh ===\n');
    
    // Kiểm tra các chuyến xe gần đây
    const [trips] = await pool.query(`
      SELECT 
        cd.maChuyen,
        cd.ngayChay,
        cd.trangThai,
        COUNT(tths.maHocSinh) as so_hoc_sinh,
        SUM(CASE WHEN tths.trangThai IN ('da_don', 'da_tra') THEN 1 ELSE 0 END) as da_don_tra,
        SUM(CASE WHEN tths.trangThai = 'vang' THEN 1 ELSE 0 END) as vang
      FROM ChuyenDi cd
      LEFT JOIN TrangThaiHocSinh tths ON cd.maChuyen = tths.maChuyen
      GROUP BY cd.maChuyen
      ORDER BY cd.ngayChay DESC
      LIMIT 10
    `);
    
    console.log('📅 10 chuyến xe gần đây:');
    console.table(trips);
    
    // Lấy khoảng thời gian 7 ngày gần đây
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    const from = formatDate(sevenDaysAgo);
    const to = formatDate(today);
    
    console.log(`\n📊 Dữ liệu trong 7 ngày (${from} đến ${to}):`);
    
    // Query giống backend
    const [attendanceRows] = await pool.query(`
      SELECT 
        tths.trangThai,
        COUNT(*) as count
      FROM TrangThaiHocSinh tths
      INNER JOIN ChuyenDi cd ON tths.maChuyen = cd.maChuyen
      WHERE DATE(cd.ngayChay) >= DATE(?) AND DATE(cd.ngayChay) <= DATE(?)
      GROUP BY tths.trangThai
    `, [from, to]);
    
    console.table(attendanceRows);
    
    // Tính tổng
    let present = 0;
    let absent = 0;
    
    attendanceRows.forEach((row) => {
      const status = row.trangThai;
      const count = Number(row.count || 0);
      
      if (status === 'da_don' || status === 'da_tra') {
        present += count;
      } else if (status === 'vang') {
        absent += count;
      }
    });
    
    const total = present + absent;
    console.log(`\n✅ Tổng kết:`);
    console.log(`   Tổng: ${total}`);
    console.log(`   Có mặt: ${present}`);
    console.log(`   Vắng: ${absent}`);
    console.log(`   Tỷ lệ: ${total > 0 ? Math.round((present / total) * 100) : 0}%`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

checkAttendanceData();
