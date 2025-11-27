import pool from './src/config/db.js';

async function testAPI() {
  try {
    const dateFrom = '2025-11-22';
    const dateTo = '2025-11-28';
    
    console.log('=== TESTING STUDENTS API ===\n');
    
    // Query giống hệt trong ReportsController
    const presentStudentsQuery = `
      SELECT DISTINCT
        hs.maHocSinh,
        hs.hoTen,
        hs.lop,
        nd.soDienThoai as sdtPhuHuynh,
        nd.hoTen as tenPhuHuynh
      FROM HocSinh hs
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh
      INNER JOIN ChuyenDi cd ON tths.maChuyen = cd.maChuyen
      LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
      WHERE DATE(cd.ngayChay) >= DATE(?) 
        AND DATE(cd.ngayChay) <= DATE(?)
        AND tths.trangThai IN ('da_don', 'da_tra')
      ORDER BY hs.lop, hs.hoTen
    `;
    
    const [presentStudents] = await pool.query(presentStudentsQuery, [dateFrom, dateTo]);
    
    const absentStudentsQuery = `
      SELECT DISTINCT
        hs.maHocSinh,
        hs.hoTen,
        hs.lop,
        nd.soDienThoai as sdtPhuHuynh,
        nd.hoTen as tenPhuHuynh
      FROM HocSinh hs
      INNER JOIN TrangThaiHocSinh tths ON hs.maHocSinh = tths.maHocSinh
      INNER JOIN ChuyenDi cd ON tths.maChuyen = cd.maChuyen
      LEFT JOIN NguoiDung nd ON hs.maPhuHuynh = nd.maNguoiDung
      WHERE DATE(cd.ngayChay) >= DATE(?) 
        AND DATE(cd.ngayChay) <= DATE(?)
        AND tths.trangThai = 'vang'
      ORDER BY hs.lop, hs.hoTen
    `;
    
    const [absentStudents] = await pool.query(absentStudentsQuery, [dateFrom, dateTo]);
    
    // Tạo response giống API
    const response = {
      success: true,
      data: {
        presentStudents,
        absentStudents,
        attendance: {
          present: presentStudents.length,
          absent: absentStudents.length,
        }
      },
      meta: {
        type: 'students',
        from: dateFrom,
        to: dateTo
      }
    };
    
    console.log('📊 API Response Structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n✅ Present Students:', presentStudents.length);
    console.log('❌ Absent Students:', absentStudents.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testAPI();
