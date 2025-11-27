const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

class DatabaseInitializer {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true,
      });
      console.log("✅ Connected to MySQL server");
    } catch (error) {
      console.error("❌ Failed to connect to MySQL:", error.message);
      throw error;
    }
  }

  async createDatabase() {
    try {
      const databaseName = process.env.DB_NAME || "school_bus_system";

      // Check if database exists
      const [databases] = await this.connection.execute(
        `SHOW DATABASES LIKE ?`,
        [databaseName]
      );

      if (databases.length > 0) {
        console.log(`⚠️  Database '${databaseName}' already exists`);
        await this.connection.execute(`DROP DATABASE ${databaseName}`);
        console.log(`🗑️  Dropped existing database '${databaseName}'`);
      }

      // Create database
      await this.connection.execute(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Created database '${databaseName}'`);

      // Use database
      await this.connection.execute(`USE ${databaseName}`);
      console.log(`✅ Using database '${databaseName}'`);
    } catch (error) {
      console.error("❌ Failed to create database:", error.message);
      throw error;
    }
  }

  async createTables() {
    try {
      // Read SQL file
      const sqlPath = path.join(__dirname, "../../database/SSB.sql");
      const sqlContent = fs.readFileSync(sqlPath, "utf8");

      // Split by semicolon and filter out empty statements
      const statements = sqlContent
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      // Execute each statement
      for (const statement of statements) {
        if (
          statement.toUpperCase().startsWith("CREATE DATABASE") ||
          statement.toUpperCase().startsWith("USE")
        ) {
          continue; // Skip these as they're handled separately
        }

        try {
          await this.connection.execute(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          console.error(
            `❌ Failed to execute statement: ${statement.substring(0, 50)}...`
          );
          console.error(`Error: ${error.message}`);
        }
      }

      console.log("✅ All tables created successfully");
    } catch (error) {
      console.error("❌ Failed to create tables:", error.message);
      throw error;
    }
  }

  async seedData() {
    try {
      console.log("🌱 Seeding sample data...");

      // Seed NguoiDung (Users)
      const users = [
        {
          hoTen: "Nguyễn Văn Admin",
          email: "admin@schoolbus.com",
          matKhau:
            "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdR8WZ6U4xK9C", // password: admin123
          soDienThoai: "0901234567",
          vaiTro: "quan_tri",
          trangThai: true,
        },
        {
          hoTen: "Trần Văn Tài Xế",
          email: "driver1@schoolbus.com",
          matKhau:
            "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdR8WZ6U4xK9C", // password: admin123
          soDienThoai: "0901234568",
          vaiTro: "tai_xe",
          trangThai: true,
        },
        {
          hoTen: "Lê Thị Phụ Huynh",
          email: "parent1@schoolbus.com",
          matKhau:
            "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdR8WZ6U4xK9C", // password: admin123
          soDienThoai: "0901234569",
          vaiTro: "phu_huynh",
          trangThai: true,
        },
      ];

      for (const user of users) {
        await this.connection.execute(
          `INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro, trangThai) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.hoTen,
            user.email,
            user.matKhau,
            user.soDienThoai,
            user.vaiTro,
            user.trangThai,
          ]
        );
      }
      console.log("✅ Seeded users data");

      // Seed TaiXe (Driver)
      await this.connection.execute(
        `INSERT INTO TaiXe (maTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) 
         VALUES (2, 'A1234567', DATE_ADD(NOW(), INTERVAL 2 YEAR), 5, 'hoat_dong')`
      );
      console.log("✅ Seeded driver data");

      // Seed XeBuyt (Buses)
      const buses = [
        {
          bienSoXe: "29A-12345",
          dongXe: "Hyundai County",
          sucChua: 29,
          trangThai: "hoat_dong",
        },
        {
          bienSoXe: "29B-67890",
          dongXe: "Ford Transit",
          sucChua: 16,
          trangThai: "hoat_dong",
        },
        {
          bienSoXe: "51A-11111",
          dongXe: "Toyota Hiace",
          sucChua: 15,
          trangThai: "bao_tri",
        },
      ];

      for (const bus of buses) {
        await this.connection.execute(
          `INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) 
           VALUES (?, ?, ?, ?)`,
          [bus.bienSoXe, bus.dongXe, bus.sucChua, bus.trangThai]
        );
      }
      console.log("✅ Seeded buses data");

      // Seed HocSinh (Students)
      const students = [
        {
          hoTen: "Nguyễn Minh Anh",
          ngaySinh: "2015-03-15",
          lop: "3A",
          maPhuHuynh: 3,
          diaChi: "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
        },
        {
          hoTen: "Trần Hoàng Nam",
          ngaySinh: "2014-07-22",
          lop: "4B",
          maPhuHuynh: 3,
          diaChi: "456 Lê Văn Việt, Quận 9, TP.HCM",
        },
        {
          hoTen: "Lê Thị Mai",
          ngaySinh: "2016-01-10",
          lop: "2C",
          maPhuHuynh: 3,
          diaChi: "789 Nguyễn Thị Thập, Quận 7, TP.HCM",
        },
      ];

      for (const student of students) {
        await this.connection.execute(
          `INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            student.hoTen,
            student.ngaySinh,
            student.lop,
            student.maPhuHuynh,
            student.diaChi,
          ]
        );
      }
      console.log("✅ Seeded students data");

      // Seed TuyenDuong (Routes)
      const routes = [
        {
          tenTuyen: "Tuyến Quận 7 - Nhà Bè",
          diemBatDau: "Trường Tiểu học Nguyễn Văn Linh",
          diemKetThuc: "Nhà Bè",
          thoiGianUocTinh: 45,
        },
        {
          tenTuyen: "Tuyến Quận 9 - Thủ Đức",
          diemBatDau: "Trường Tiểu học Lê Văn Việt",
          diemKetThuc: "Thủ Đức",
          thoiGianUocTinh: 60,
        },
      ];

      for (const route of routes) {
        await this.connection.execute(
          `INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) 
           VALUES (?, ?, ?, ?)`,
          [
            route.tenTuyen,
            route.diemBatDau,
            route.diemKetThuc,
            route.thoiGianUocTinh,
          ]
        );
      }
      console.log("✅ Seeded routes data");

      // Seed DiemDung (Stops)
      const stops = [
        {
          maTuyen: 1,
          tenDiem: "Ngã tư Nguyễn Văn Linh - Huỳnh Tấn Phát",
          kinhDo: 106.7208,
          viDo: 10.7409,
          thuTu: 1,
        },
        {
          maTuyen: 1,
          tenDiem: "Chợ Bình Thuận",
          kinhDo: 106.7321,
          viDo: 10.7456,
          thuTu: 2,
        },
        {
          maTuyen: 1,
          tenDiem: "Trung tâm Nhà Bè",
          kinhDo: 106.7456,
          viDo: 10.7534,
          thuTu: 3,
        },
        {
          maTuyen: 2,
          tenDiem: "Ngã tư Lê Văn Việt - Kha Vạn Cân",
          kinhDo: 106.7738,
          viDo: 10.8514,
          thuTu: 1,
        },
        {
          maTuyen: 2,
          tenDiem: "Khu công nghệ cao",
          kinhDo: 106.7845,
          viDo: 10.8623,
          thuTu: 2,
        },
        {
          maTuyen: 2,
          tenDiem: "Trung tâm Thủ Đức",
          kinhDo: 106.7967,
          viDo: 10.8756,
          thuTu: 3,
        },
      ];

      for (const stop of stops) {
        await this.connection.execute(
          `INSERT INTO DiemDung (maTuyen, tenDiem, kinhDo, viDo, thuTu) 
           VALUES (?, ?, ?, ?, ?)`,
          [stop.maTuyen, stop.tenDiem, stop.kinhDo, stop.viDo, stop.thuTu]
        );
      }
      console.log("✅ Seeded stops data");

      // Seed LichTrinh (Schedules)
      const schedules = [
        {
          maTuyen: 1,
          maXe: 1,
          maTaiXe: 2,
          loaiChuyen: "don_sang",
          gioKhoiHanh: "06:30:00",
          dangApDung: true,
        },
        {
          maTuyen: 1,
          maXe: 1,
          maTaiXe: 2,
          loaiChuyen: "tra_chieu",
          gioKhoiHanh: "16:30:00",
          dangApDung: true,
        },
        {
          maTuyen: 2,
          maXe: 2,
          maTaiXe: 2,
          loaiChuyen: "don_sang",
          gioKhoiHanh: "06:45:00",
          dangApDung: true,
        },
      ];

      for (const schedule of schedules) {
        await this.connection.execute(
          `INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, dangApDung) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            schedule.maTuyen,
            schedule.maXe,
            schedule.maTaiXe,
            schedule.loaiChuyen,
            schedule.gioKhoiHanh,
            schedule.dangApDung,
          ]
        );
      }
      console.log("✅ Seeded schedules data");

      console.log("🎉 Sample data seeded successfully!");
    } catch (error) {
      console.error("❌ Failed to seed data:", error.message);
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log("✅ Database connection closed");
    }
  }
}

async function main() {
  const initializer = new DatabaseInitializer();

  try {
    console.log("🚀 Starting database initialization...");
    await initializer.connect();
    await initializer.createDatabase();
    await initializer.createTables();
    await initializer.seedData();
    console.log("✅ Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  } finally {
    await initializer.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseInitializer;
