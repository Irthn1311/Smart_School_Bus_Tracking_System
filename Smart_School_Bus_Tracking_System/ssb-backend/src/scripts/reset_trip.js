import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  try {
    // Reset chuyến đi về trạng thái ban đầu để test
    const [result] = await pool.query(`
      UPDATE ChuyenDi 
      SET trangThai = 'chua_khoi_hanh',
          gioBatDauThucTe = NULL,
          gioKetThucThucTe = NULL
      WHERE maChuyen = 3
    `);

    console.log(
      '✅ Đã reset chuyến đi maChuyen=3 về trạng thái "chua_khoi_hanh"'
    );
    console.log(`   Updated ${result.affectedRows} row(s)`);

    // Kiểm tra lại
    const [trip] = await pool.query(
      "SELECT * FROM ChuyenDi WHERE maChuyen = 3"
    );
    console.log("\n📋 Trạng thái hiện tại:");
    console.log(`   maChuyen: ${trip[0].maChuyen}`);
    console.log(`   trangThai: ${trip[0].trangThai}`);
    console.log(`   gioBatDauThucTe: ${trip[0].gioBatDauThucTe}`);
    console.log("\n🚀 Sẵn sàng test lại API Start Trip!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    pool.end();
  }
})();
