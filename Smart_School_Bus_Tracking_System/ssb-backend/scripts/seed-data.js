const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

async function seedData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    const saltRounds = 12;

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", saltRounds);
    await connection.query(
      `
      INSERT INTO NguoiDung (hoTen, email, matKhau, vaiTro, trangThai) 
      VALUES (?, ?, ?, ?, ?)
    `,
      ["Admin User", "admin@example.com", adminPassword, "quan_tri", true]
    );
    console.log("✅ Created admin user");

    // Create driver user
    const driverPassword = await bcrypt.hash("driver123", saltRounds);
    const [driverResult] = await connection.query(
      `
      INSERT INTO NguoiDung (hoTen, email, matKhau, vaiTro, trangThai) 
      VALUES (?, ?, ?, ?, ?)
    `,
      ["Driver User", "driver@example.com", driverPassword, "tai_xe", true]
    );
    console.log("✅ Created driver user");

    // Create driver info
    await connection.query(
      `
      INSERT INTO TaiXe (maTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) 
      VALUES (?, ?, ?, ?, ?)
    `,
      [driverResult.insertId, "DL123456", "2025-12-31", 5, "hoat_dong"]
    );
    console.log("✅ Created driver info");

    // Create parent user
    const parentPassword = await bcrypt.hash("parent123", saltRounds);
    await connection.query(
      `
      INSERT INTO NguoiDung (hoTen, email, matKhau, vaiTro, trangThai) 
      VALUES (?, ?, ?, ?, ?)
    `,
      ["Parent User", "parent@example.com", parentPassword, "phu_huynh", true]
    );
    console.log("✅ Created parent user");

    // Create sample buses
    await connection.query(`
      INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) 
      VALUES 
      ('29A-12345', 'Hyundai County', 29, 'hoat_dong'),
      ('29B-67890', 'Ford Transit', 25, 'hoat_dong'),
      ('29C-11111', 'Mercedes Sprinter', 35, 'bao_tri')
    `);
    console.log("✅ Created sample buses");

    // Create sample routes
    await connection.query(`
      INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) 
      VALUES 
      ('Tuyến 1', 'Trường Tiểu học ABC', 'Khu dân cư XYZ', 30),
      ('Tuyến 2', 'Trường THCS DEF', 'Khu dân cư UVW', 45)
    `);
    console.log("✅ Created sample routes");

    console.log("🎉 Data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed.");
    }
  }
}

seedData();
