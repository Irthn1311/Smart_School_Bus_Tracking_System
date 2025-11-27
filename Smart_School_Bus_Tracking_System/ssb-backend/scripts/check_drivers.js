/**
 * Script để kiểm tra và liệt kê các driver accounts trong database
 * 
 * Usage:
 *   node scripts/check_drivers.js
 *   node scripts/check_drivers.js --create
 *   node scripts/check_drivers.js --reset-password --email=driver@ssb.vn --password=driver123
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: join(__dirname, "../.env") });

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_bus_system",
};

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    acc[key.slice(2)] = value || true;
  }
  return acc;
}, {});

async function listDrivers() {
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    console.log("🔍 Đang tìm các driver accounts...\n");

    const [drivers] = await connection.query(`
      SELECT 
        u.maNguoiDung,
        u.email,
        u.hoTen,
        u.vaiTro,
        u.trangThai,
        t.soBangLai,
        t.trangThai as driverStatus
      FROM NguoiDung u
      LEFT JOIN TaiXe t ON u.maNguoiDung = t.maTaiXe
      WHERE u.vaiTro = 'tai_xe'
      ORDER BY u.maNguoiDung
    `);

    if (drivers.length === 0) {
      console.log("❌ Không tìm thấy driver account nào trong database!\n");
      console.log("💡 Bạn có thể tạo driver account bằng:");
      console.log("   node scripts/check_drivers.js --create\n");
      return;
    }

    console.log(`✅ Tìm thấy ${drivers.length} driver account(s):\n`);
    console.log("┌─────┬─────────────────────┬──────────────────┬──────────────┐");
    console.log("│ ID  │ Email               │ Họ tên           │ Trạng thái   │");
    console.log("├─────┼─────────────────────┼──────────────────┼──────────────┤");

    drivers.forEach((driver) => {
      const id = String(driver.maNguoiDung).padEnd(3);
      const email = (driver.email || "").padEnd(19);
      const name = (driver.hoTen || "").substring(0, 16).padEnd(16);
      const status = driver.trangThai ? "✅ Active" : "❌ Inactive";
      console.log(`│ ${id} │ ${email} │ ${name} │ ${status.padEnd(12)} │`);
    });

    console.log("└─────┴─────────────────────┴──────────────────┴──────────────┘\n");

    console.log("💡 Để test login với một driver:");
    console.log(`   npm run ws:demo -- --tripId=24 --username=${drivers[0].email} --password=YOUR_PASSWORD\n`);

    return drivers;
  } finally {
    await connection.end();
  }
}

async function createDriver(email = "driver@ssb.vn", password = "driver123", hoTen = "Tài xế Demo") {
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    console.log(`🔨 Đang tạo driver account: ${email}\n`);

    // Check if email already exists
    const [existing] = await connection.query(
      "SELECT maNguoiDung FROM NguoiDung WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log(`❌ Email ${email} đã tồn tại!`);
      console.log(`💡 Bạn có thể reset password bằng:`);
      console.log(`   node scripts/check_drivers.js --reset-password --email=${email} --password=${password}\n`);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await connection.query(
      `INSERT INTO NguoiDung (hoTen, email, matKhau, vaiTro, trangThai)
       VALUES (?, ?, ?, 'tai_xe', TRUE)`,
      [hoTen, email, hashedPassword]
    );

    const userId = result.insertId;

    // Create driver record
    await connection.query(
      `INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 YEAR), 5, 'hoat_dong')`,
      [userId, hoTen, `DL${userId.toString().padStart(6, "0")}`]
    );

    console.log(`✅ Đã tạo driver account thành công!`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   License: DL${userId.toString().padStart(6, "0")}\n`);

    console.log(`💡 Bây giờ bạn có thể test login:`);
    console.log(`   npm run ws:demo -- --tripId=24 --username=${email} --password=${password}\n`);
  } finally {
    await connection.end();
  }
}

async function resetPassword(email, newPassword) {
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    console.log(`🔑 Đang reset password cho: ${email}\n`);

    // Check if user exists
    const [users] = await connection.query(
      "SELECT maNguoiDung FROM NguoiDung WHERE email = ? AND vaiTro = 'tai_xe'",
      [email]
    );

    if (users.length === 0) {
      console.log(`❌ Không tìm thấy driver với email: ${email}\n`);
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await connection.query(
      "UPDATE NguoiDung SET matKhau = ? WHERE email = ?",
      [hashedPassword, email]
    );

    console.log(`✅ Đã reset password thành công!`);
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}\n`);

    console.log(`💡 Bây giờ bạn có thể test login:`);
    console.log(`   npm run ws:demo -- --tripId=24 --username=${email} --password=${newPassword}\n`);
  } finally {
    await connection.end();
  }
}

// Main
async function main() {
  try {
    if (args.create) {
      const email = args.email || "driver@ssb.vn";
      const password = args.password || "driver123";
      const hoTen = args.name || "Tài xế Demo";
      await createDriver(email, password, hoTen);
    } else if (args["reset-password"]) {
      const email = args.email;
      const password = args.password || "driver123";

      if (!email) {
        console.error("❌ Cần cung cấp email: --email=driver@ssb.vn\n");
        process.exit(1);
      }

      await resetPassword(email, password);
    } else {
      await listDrivers();
    }
  } catch (error) {
    console.error("\n❌ Lỗi:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

