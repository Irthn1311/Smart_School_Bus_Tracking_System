# Hướng dẫn kết nối Model với Database

## Tổng quan

Hệ thống Smart School Bus Tracking System đã được cấu hình để kết nối với MySQL database. Tài liệu này hướng dẫn bạn cách thiết lập và sử dụng kết nối database.

## Cấu trúc Database

### 1. Database Configuration (`src/config/db.config.js`)

```javascript
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
});

module.exports = pool;
```

### 2. Environment Variables (`.env`)

Tạo file `.env` trong thư mục `ssb-backend` với nội dung:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=school_bus_system
DB_PORT=3306

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Thiết lập Database

### 1. Tạo Database

Chạy script SQL trong file `database/SSB.sql`:

```sql
CREATE DATABASE school_bus_system;
USE school_bus_system;

-- Tạo các bảng...
```

### 2. Cấu hình MySQL

Đảm bảo MySQL server đang chạy và có thể kết nối với thông tin trong file `.env`.

## Sử dụng Models

### 1. Import Model

```javascript
const NguoiDungModel = require("../models/NguoiDungModel.js");
const XeBuytModel = require("../models/XeBuytModel.js");
```

### 2. Sử dụng Model Methods

```javascript
// Lấy tất cả người dùng
const users = await NguoiDungModel.getAll();

// Lấy người dùng theo ID
const user = await NguoiDungModel.getById(1);

// Tạo người dùng mới
const newUser = await NguoiDungModel.create({
  hoTen: "Nguyễn Văn A",
  email: "nguyenvana@example.com",
  matKhau: "hashed_password",
  vaiTro: "phu_huynh",
});

// Cập nhật người dùng
const updated = await NguoiDungModel.update(1, {
  hoTen: "Nguyễn Văn B",
});
```

## Các Model Available

### 1. NguoiDungModel

- `getAll()` - Lấy tất cả người dùng
- `getById(id)` - Lấy người dùng theo ID
- `getByEmail(email)` - Lấy người dùng theo email
- `create(data)` - Tạo người dùng mới
- `update(id, data)` - Cập nhật người dùng
- `delete(id)` - Xóa người dùng

### 2. XeBuytModel

- `getAll()` - Lấy tất cả xe buýt
- `getById(id)` - Lấy xe buýt theo ID
- `getByPlate(bienSoXe)` - Lấy xe buýt theo biển số
- `create(data)` - Tạo xe buýt mới
- `update(id, data)` - Cập nhật xe buýt

### 3. TaiXeModel

- `getAll()` - Lấy tất cả tài xế
- `getById(id)` - Lấy tài xế theo ID
- `getWithUserInfo()` - Lấy tài xế với thông tin người dùng
- `create(data)` - Tạo tài xế mới

### 4. HocSinhModel

- `getAll()` - Lấy tất cả học sinh
- `getById(id)` - Lấy học sinh theo ID
- `getByClass(lop)` - Lấy học sinh theo lớp
- `create(data)` - Tạo học sinh mới

### 5. TuyenDuongModel

- `getAll()` - Lấy tất cả tuyến đường
- `getById(id)` - Lấy tuyến đường theo ID
- `create(data)` - Tạo tuyến đường mới

### 6. LichTrinhModel

- `getAll()` - Lấy tất cả lịch trình
- `getById(id)` - Lấy lịch trình theo ID
- `getByBusId(busId)` - Lấy lịch trình theo xe buýt
- `create(data)` - Tạo lịch trình mới

### 7. ChuyenDiModel

- `getAll()` - Lấy tất cả chuyến đi
- `getById(id)` - Lấy chuyến đi theo ID
- `getByDate(date)` - Lấy chuyến đi theo ngày
- `create(data)` - Tạo chuyến đi mới

### 8. DiemDungModel

- `getAll()` - Lấy tất cả điểm dừng
- `getByRouteId(routeId)` - Lấy điểm dừng theo tuyến
- `create(data)` - Tạo điểm dừng mới

### 9. TrangThaiHocSinhModel

- `getAll()` - Lấy tất cả trạng thái học sinh
- `getByTripId(tripId)` - Lấy trạng thái theo chuyến đi
- `create(data)` - Tạo trạng thái mới

## Test Database Connection

Chạy script test để kiểm tra kết nối:

```bash
cd ssb-backend
node test-db.js
```

Script này sẽ:

- Kiểm tra kết nối database
- Kiểm tra database và tables tồn tại
- Test import tất cả models
- Hiển thị cấu trúc bảng

## Error Handling

### 1. Connection Errors

```javascript
try {
  const result = await pool.query("SELECT * FROM NguoiDung");
  return result[0];
} catch (error) {
  console.error("Database error:", error.message);
  throw error;
}
```

### 2. Model Errors

```javascript
try {
  const user = await NguoiDungModel.getById(999);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
} catch (error) {
  console.error("Model error:", error.message);
  throw error;
}
```

## Best Practices

### 1. Always use async/await

```javascript
// ✅ Good
const users = await NguoiDungModel.getAll();

// ❌ Bad
NguoiDungModel.getAll().then((users) => {
  // handle users
});
```

### 2. Handle errors properly

```javascript
try {
  const result = await SomeModel.someMethod();
  return result;
} catch (error) {
  console.error("Error:", error.message);
  throw error;
}
```

### 3. Use transactions for multiple operations

```javascript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  await connection.query("INSERT INTO ...");
  await connection.query("UPDATE ...");

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

## Troubleshooting

### 1. Connection Refused

- Kiểm tra MySQL server đang chạy
- Kiểm tra thông tin kết nối trong `.env`
- Kiểm tra firewall/port 3306

### 2. Database Not Found

- Chạy script SQL trong `database/SSB.sql`
- Kiểm tra tên database trong `.env`

### 3. Table Not Found

- Kiểm tra script SQL đã chạy đầy đủ
- Kiểm tra tên bảng trong model

### 4. Permission Denied

- Kiểm tra quyền user MySQL
- Đảm bảo user có quyền CREATE, SELECT, INSERT, UPDATE, DELETE

## Production Notes

1. **Security**: Đổi JWT_SECRET trong production
2. **Connection Pool**: Điều chỉnh connectionLimit phù hợp
3. **SSL**: Sử dụng SSL connection trong production
4. **Backup**: Thiết lập backup database định kỳ
5. **Monitoring**: Theo dõi performance và errors

## Support

Nếu gặp vấn đề, hãy:

1. Kiểm tra logs trong console
2. Chạy script test database
3. Kiểm tra cấu hình `.env`
4. Xem lại tài liệu này
