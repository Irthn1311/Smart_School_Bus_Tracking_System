import pool from './src/config/db.js';

async function checkTripDates() {
  try {
    console.log('=== KIỂM TRA NGÀY CHẠY CHUYẾN ĐI ===\n');
    
    // Kiểm tra các chuyến đi có học sinh
    const [trips] = await pool.query(`
      SELECT DISTINCT
        cd.maChuyen,
        DATE(cd.ngayChay) as ngayChay,
        COUNT(DISTINCT tths.maHocSinh) as soHocSinh,
        SUM(CASE WHEN tths.trangThai IN ('da_don', 'da_tra') THEN 1 ELSE 0 END) as coMat,
        SUM(CASE WHEN tths.trangThai = 'vang' THEN 1 ELSE 0 END) as vang
      FROM ChuyenDi cd
      INNER JOIN TrangThaiHocSinh tths ON cd.maChuyen = tths.maChuyen
      GROUP BY cd.maChuyen, DATE(cd.ngayChay)
      ORDER BY cd.ngayChay DESC
      LIMIT 10
    `);
    
    console.log('📅 10 Chuyến đi gần nhất:');
    console.table(trips);
    
    // Tính khoảng thời gian mặc định (7 ngày gần nhất)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const formatDate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    
    const from = formatDate(sevenDaysAgo);
    const to = formatDate(today);
    
    console.log(`\n🔍 Khoảng thời gian mặc định: ${from} → ${to}\n`);
    
    // Query giống backend
    const [presentStudents] = await pool.query(`
      SELECT DISTINCT
        hs.maHocSinh,
        hs.hoTen,
        hs.lop
      FROM HocSinh hs
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh
      INNER JOIN ChuyenDi cd ON tths.maChuyen = cd.maChuyen
      WHERE DATE(cd.ngayChay) >= DATE(?) 
        AND DATE(cd.ngayChay) <= DATE(?)
        AND tths.trangThai IN ('da_don', 'da_tra')
      ORDER BY hs.lop, hs.hoTen
    `, [from, to]);
    
    console.log(`✅ Học sinh CÓ MẶT trong khoảng ${from} → ${to}: ${presentStudents.length} học sinh`);
    if (presentStudents.length > 0) {
      console.table(presentStudents.slice(0, 5));
    }
    
    const [absentStudents] = await pool.query(`
      SELECT DISTINCT
        hs.maHocSinh,
        hs.hoTen,
        hs.lop
      FROM HocSinh hs
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh
      INNER JOIN ChuyenDi cd ON tths.maChuyen = cd.maChuyen
      WHERE DATE(cd.ngayChay) >= DATE(?) 
        AND DATE(cd.ngayChay) <= DATE(?)
        AND tths.trangThai = 'vang'
      ORDER BY hs.lop, hs.hoTen
    `, [from, to]);
    
    console.log(`\n❌ Học sinh VẮNG MẶT trong khoảng ${from} → ${to}: ${absentStudents.length} học sinh`);
    if (absentStudents.length > 0) {
      console.table(absentStudents.slice(0, 5));
    }
    
  } catch (error) {
    console.error('Lỗi:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTripDates();
