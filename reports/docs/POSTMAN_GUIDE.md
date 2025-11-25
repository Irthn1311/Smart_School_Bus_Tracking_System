# Hướng dẫn sử dụng Postman Collection

## 📥 Import vào Postman

### Bước 1: Import Collection

1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn file `SSB_Postman_Collection.json`
4. Click **Import**

### Bước 2: Import Environment

1. Click biểu tượng **Environments** (icon bánh răng ⚙️ hoặc icon mắt 👁️) góc trên bên phải
2. Click **Import**
3. Chọn file `SSB_Local_Environment.json`
4. Click **Import**
5. **Chọn environment "SSB Local"** từ dropdown

---

## 🚀 Sử dụng

### 1. Login để lấy token

**Request:** `Auth > Login`

**Body mặc định:**

```json
{
  "email": "quantri@schoolbus.vn",
  "password": "password"
}
```

**Kết quả:** Token sẽ tự động lưu vào environment variable `{{token}}`

### 2. Test các API

Sau khi login, tất cả request khác sẽ tự động dùng token:

#### **Buses API**

- ✅ `GET /buses` - Danh sách xe buýt (có phân trang)
- ✅ `GET /buses/:id` - Chi tiết xe buýt
- ✅ `POST /buses` - Tạo xe mới
- ✅ `PUT /buses/:id` - Cập nhật xe
- ✅ `DELETE /buses/:id` - Xóa xe
- ✅ `POST /buses/:id/assign-driver` - Phân công tài xế
- ✅ `POST /buses/:id/position` - Cập nhật GPS

#### **Drivers API**

- ✅ `GET /drivers` - Danh sách tài xế
- ✅ `GET /drivers/:id` - Chi tiết tài xế
- ✅ `GET /drivers/:id/schedules` - Lịch trình của tài xế

#### **Students API**

- ✅ `GET /students` - Danh sách học sinh
- ✅ `GET /students/:id` - Chi tiết học sinh
- ✅ `GET /students/stats` - Thống kê

---

## 🔧 Environment Variables

| Variable         | Value                    | Mô tả                   |
| ---------------- | ------------------------ | ----------------------- |
| `base_url`       | `http://localhost:4000`  | URL server backend      |
| `api_version`    | `v1`                     | Version API             |
| `token`          | (auto)                   | JWT token sau khi login |
| `admin_email`    | `quantri@schoolbus.vn`   | Email admin             |
| `admin_password` | `password`               | Password mẫu            |
| `driver_email`   | `taixe1@schoolbus.vn`    | Email tài xế            |
| `parent_email`   | `phuhuynh1@schoolbus.vn` | Email phụ huynh         |

---

## 📝 Ví dụ Body Request

### Tạo xe buýt mới

```json
{
  "bienSoXe": "51B-99999",
  "dongXe": "Hyundai Universe",
  "sucChua": 45,
  "trangThai": "hoat_dong"
}
```

### Cập nhật xe buýt

```json
{
  "dongXe": "Hyundai Universe - Updated",
  "sucChua": 50,
  "trangThai": "bao_tri"
}
```

### Phân công tài xế

```json
{
  "driverId": 2
}
```

### Cập nhật vị trí GPS

```json
{
  "lat": 21.0285,
  "lng": 105.8542,
  "speed": 45.5,
  "heading": 90,
  "timestamp": "2025-10-27T10:30:00Z"
}
```

---

## 🔐 Tài khoản mẫu

| Vai trò     | Email                    | Password   |
| ----------- | ------------------------ | ---------- |
| Admin       | `quantri@schoolbus.vn`   | `password` |
| Tài xế 1    | `taixe1@schoolbus.vn`    | `password` |
| Tài xế 2    | `taixe2@schoolbus.vn`    | `password` |
| Phụ huynh 1 | `phuhuynh1@schoolbus.vn` | `password` |

---

## ⚡ Tips

1. **Auto-save token:** Script trong request Login sẽ tự động lưu token
2. **Query params:** Có thể enable/disable từng param bằng checkbox
3. **Multiple environments:** Có thể tạo thêm env cho Production, Staging
4. **Variables:** Dùng `{{variable_name}}` trong bất kỳ field nào

---

## 🐛 Troubleshooting

### Lỗi "Could not send request"

- ✅ Kiểm tra server đã chạy: `npm run dev`
- ✅ Kiểm tra port đúng: `http://localhost:4000`

### Lỗi 401 Unauthorized

- ✅ Chạy lại request Login
- ✅ Kiểm tra token trong environment variables

### Lỗi 403 Forbidden

- ✅ Tài khoản không có quyền
- ✅ Login bằng tài khoản admin: `quantri@schoolbus.vn`

---

## 📚 API Documentation

Xem chi tiết tại: `docs/API_DOCUMENTATION.md`
