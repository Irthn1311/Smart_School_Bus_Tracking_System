# 🛠️ Test & Utility Scripts

Folder này chứa các scripts hỗ trợ testing và debug trong quá trình development.

---

## 📁 Danh sách Scripts

### 1. **test_db.js**

**Mục đích:** Kiểm tra kết nối database MySQL

**Chức năng:**

- Test connection pool
- Query dữ liệu mẫu từ các bảng
- Verify database schema

**Cách dùng:**

```bash
node src/scripts/test_db.js
```

**Output mẫu:**

```
✅ Database connection successful!
📊 Tables found: NguoiDung, XeBuyt, ChuyenDi, ...
```

---

### 2. **reset_trip.js**

**Mục đích:** Reset trạng thái chuyến đi để test lại API Start Trip

**Chức năng:**

- Reset `trangThai` → `"chua_khoi_hanh"`
- Xóa `gioBatDauThucTe` → `NULL`
- Xóa `gioKetThucThucTe` → `NULL`

**Cách dùng:**

```bash
node src/scripts/reset_trip.js
```

**Output:**

```
✅ Đã reset chuyến đi maChuyen=3 về trạng thái "chua_khoi_hanh"
   Updated 1 row(s)

📋 Trạng thái hiện tại:
   maChuyen: 3
   trangThai: chua_khoi_hanh
   gioBatDauThucTe: null

🚀 Sẵn sàng test lại API Start Trip!
```

**Use case:**

- Test API `POST /api/v1/trips/3/start` nhiều lần
- Reset sau mỗi lần test thành công

---

### 3. **check_db.js**

**Mục đích:** Debug dữ liệu trong database (dùng khi `gioBatDauThucTe` bị lỗi)

**Chức năng:**

- Query trực tiếp bảng `ChuyenDi`
- Show raw data types và values
- Kiểm tra JOIN với các bảng liên quan

**Cách dùng:**

```bash
node src/scripts/check_db.js
```

**Output:**

```
📊 Data từ database:
{
  maChuyen: 3,
  trangThai: 'dang_chay',
  gioBatDauThucTe: 2025-10-27T07:46:22.000Z,
  ...
}

🔍 gioBatDauThucTe type: object
🔍 gioBatDauThucTe value: 2025-10-27T07:46:22.000Z
```

**Use case:**

- Debug khi API trả về `null` nhưng DB có data
- Kiểm tra data type mismatch
- Verify TIMESTAMP format

---

## 🎯 Khi Nào Dùng Scripts Này?

| Tình huống         | Script          | Lý do                            |
| ------------------ | --------------- | -------------------------------- |
| Kiểm tra DB setup  | `test_db.js`    | Verify connection và schema      |
| Test API nhiều lần | `reset_trip.js` | Reset trip về trạng thái ban đầu |
| API trả về data lạ | `check_db.js`   | Debug raw data từ MySQL          |
| Sau khi migrate DB | `test_db.js`    | Đảm bảo tables tồn tại           |

---

## ⚠️ Lưu Ý

1. **Chỉ dùng trong development!** Không chạy trên production server
2. **Check file `.env`** trước khi chạy (cần DB credentials)
3. **MySQL phải đang chạy** (`net start MySQL80`)
4. Scripts tự động `pool.end()` sau khi xong

---

## 🔧 Customize Scripts

### Sửa trip ID cần reset:

```javascript
// reset_trip.js (dòng 14)
WHERE maChuyen = 3  // ← Đổi thành ID khác
```

### Thêm test data mới:

```javascript
// test_db.js
const [rows] = await pool.query("SELECT * FROM TenBang WHERE ...");
console.log(rows);
```

---

**📅 Created:** 27/10/2025  
**👤 Author:** Nguyễn Tuấn Tài  
**📝 Purpose:** Development utilities for Day 2 testing
