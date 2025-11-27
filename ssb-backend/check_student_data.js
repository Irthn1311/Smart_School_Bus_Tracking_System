import pool from './src/config/db.js';

async function checkData() {
  try {
    console.log('=== KIỂM TRA DỮ LIỆU HỌC SINH ===\n');
    
    // Kiểm tra học sinh có mặt
    const [present] = await pool.query(`
      SELECT DISTINCT 
        hs.maHocSinh, 
        hs.hoTen, 
        hs.lop,
        tths.trangThai
      FROM HocSinh hs 
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh 
      WHERE tths.trangThai IN ('da_don', 'da_tra')
      LIMIT 10
    `);
    
    console.log(`✅ Học sinh CÓ MẶT (${present.length}):`);
    console.table(present);
    
    // Kiểm tra học sinh vắng mặt
    const [absent] = await pool.query(`
      SELECT DISTINCT 
        hs.maHocSinh, 
        hs.hoTen, 
        hs.lop,
        tths.trangThai
      FROM HocSinh hs 
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh 
      WHERE tths.trangThai = 'vang'
      LIMIT 10
    `);
    
    console.log(`\n❌ Học sinh VẮNG MẶT (${absent.length}):`);
    console.table(absent);
    
    // Tổng hợp các trạng thái
    const [statuses] = await pool.query(`
      SELECT 
        trangThai,
        COUNT(*) as soLuong
      FROM TrangThaiHocSinh
      GROUP BY trangThai
    `);
    
    console.log('\n📊 TỔNG HỢP TRẠNG THÁI:');
    console.table(statuses);
    
  } catch (error) {
    console.error('Lỗi:', error.message);
  } finally {
    process.exit(0);
  }
}

checkData();
