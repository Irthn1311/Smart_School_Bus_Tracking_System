import mysql from 'mysql2/promise';

async function checkTripStatus() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'VThang',
    password: 'vietthangai@27',
    database: 'school_bus_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🔍 Checking trip status on Nov 27...\n');

    const [trips] = await pool.query(`
      SELECT 
        maChuyen,
        ngayChay,
        trangThai,
        gioBatDauThucTe,
        gioKetThucThucTe,
        maLichTrinh
      FROM ChuyenDi 
      WHERE DATE(ngayChay) = '2025-11-27'
    `);

    console.log('📊 Trip data:');
    console.table(trips);

    console.log('\n🔍 Testing getDailyTrend query...\n');

    const [trendRaw] = await pool.query(`
      SELECT 
        DATE(cd.ngayChay) as date,
        COUNT(cd.maChuyen) AS total,
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe <= lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS onTime,
        SUM(CASE 
          WHEN cd.trangThai = 'hoan_thanh' AND cd.gioBatDauThucTe > lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS late
      FROM ChuyenDi cd
      JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      WHERE cd.ngayChay BETWEEN '2025-11-22' AND '2025-11-28'
      GROUP BY DATE(cd.ngayChay) 
      ORDER BY DATE(cd.ngayChay)
    `);

    console.log('📈 Trend data from getDailyTrend query:');
    console.table(trendRaw);

    console.log('\n🔍 Testing modified query (counts ALL trips, not just hoan_thanh)...\n');

    const [trendModified] = await pool.query(`
      SELECT 
        DATE(cd.ngayChay) as date,
        COUNT(cd.maChuyen) AS total,
        SUM(CASE 
          WHEN cd.gioBatDauThucTe IS NOT NULL AND cd.gioBatDauThucTe <= lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS onTime,
        SUM(CASE 
          WHEN cd.gioBatDauThucTe IS NOT NULL AND cd.gioBatDauThucTe > lt.gioKhoiHanh THEN 1 ELSE 0 
        END) AS late
      FROM ChuyenDi cd
      JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      WHERE cd.ngayChay BETWEEN '2025-11-22' AND '2025-11-28'
      GROUP BY DATE(cd.ngayChay) 
      ORDER BY DATE(cd.ngayChay)
    `);

    console.log('📈 Modified trend data (without trangThai = hoan_thanh filter):');
    console.table(trendModified);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTripStatus();
