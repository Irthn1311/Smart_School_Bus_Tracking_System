import bcrypt from "bcryptjs";
import pool from "./src/config/db.js";

(async () => {
  try {
    // Test: Hash mật khẩu "123456"
    const password = "123456";
    const hash = await bcrypt.hash(password, 10);

    console.log("🔑 Mật khẩu gốc:", password);
    console.log("🔐 Hash mới:", hash);

    // Update vào database
    const [result] = await pool.query(
      `UPDATE NguoiDung SET matKhau = ? WHERE email = 'taixe1@schoolbus.vn'`,
      [hash]
    );

    console.log("\n✅ Đã update mật khẩu cho taixe1@schoolbus.vn");
    console.log("📊 Rows affected:", result.affectedRows);

    // Verify
    const [user] = await pool.query(
      `SELECT email, matKhau FROM NguoiDung WHERE email = 'taixe1@schoolbus.vn'`
    );

    console.log("\n🔍 Kiểm tra trong DB:");
    console.log("Email:", user[0].email);
    console.log("Hash:", user[0].matKhau);

    // Test compare
    const isValid = await bcrypt.compare(password, user[0].matKhau);
    console.log("\n✅ Test bcrypt.compare:", isValid ? "PASS" : "FAIL");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    pool.end();
  }
})();
