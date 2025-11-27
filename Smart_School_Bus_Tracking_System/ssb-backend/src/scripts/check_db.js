import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  try {
    // Query trực tiếp database
    const [rows] = await pool.query(`
      SELECT * FROM ChuyenDi WHERE maChuyen = 3
    `);

    console.log("📊 Data từ database:");
    console.log(rows[0]);
    console.log("\n🔍 gioBatDauThucTe type:", typeof rows[0].gioBatDauThucTe);
    console.log("🔍 gioBatDauThucTe value:", rows[0].gioBatDauThucTe);

    // Query với JOIN như trong Model
    const [joined] = await pool.query(`
      SELECT cd.*, 
             lt.loaiChuyen, lt.gioKhoiHanh, 
             td.tenTuyen, 
             xb.bienSoXe, 
             nd.hoTen AS tenTaiXe
      FROM ChuyenDi cd
      JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
      JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
      JOIN XeBuyt xb ON lt.maXe = xb.maXe
      JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
      WHERE cd.maChuyen = 3
    `);

    console.log("\n📊 Data với JOIN:");
    console.log("gioBatDauThucTe:", joined[0].gioBatDauThucTe);
    console.log("Full data:", joined[0]);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    pool.end();
  }
})();
