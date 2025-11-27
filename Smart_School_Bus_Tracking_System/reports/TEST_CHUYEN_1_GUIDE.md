# 🚌 Hướng dẫn Test Chuyến 1 - GPS Tracking & Notifications

> **Test Date**: 2025-11-13  
> **Chuyến đi**: Tuyến Quận 7 - Nhà Bè - Đón sáng  
> **Tester**: Nguyễn Tuấn Tài

---

## 📋 Thông tin Chuyến 1

| **Thuộc tính**  | **Giá trị**                                  |
| --------------- | -------------------------------------------- |
| **Trip ID**     | Sẽ được tạo tự động (thường là 1 nếu DB mới) |
| **Lịch trình**  | maLichTrinh = 1                              |
| **Tuyến đường** | Tuyến Quận 7 - Nhà Bè (maTuyen = 1)          |
| **Xe buýt**     | 51A-12345 (maXe = 1)                         |
| **Tài xế**      | Trần Văn Tài (maTaiXe = 2)                   |
| **Loại chuyến** | Đón sáng (don_sang)                          |
| **Trạng thái**  | chua_khoi_hanh                               |
| **Học sinh**    | 10 học sinh (ID: 1-10)                       |

---

## 👨‍👩‍👧 Danh sách Phụ huynh liên quan

### **Option 1: Phụ huynh của Học sinh #1** ⭐ RECOMMENDED

| **Thông tin**     | **Giá trị**                                              |
| ----------------- | -------------------------------------------------------- |
| **Tên phụ huynh** | Phạm Thu Hương                                           |
| **Email**         | `phuhuynh1@schoolbus.vn`                                 |
| **Mật khẩu**      | `password` (hoặc `123456` nếu dùng bcrypt hash mặc định) |
| **SĐT**           | 0909000101                                               |
| **Con**           | Nguyễn Gia Bảo (Học sinh #1)                             |
| **Lớp**           | 5A                                                       |
| **Địa chỉ**       | 123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7            |
| **Thứ tự đón**    | Stop #1 (đầu tiên)                                       |

### **Option 2: Phụ huynh của Học sinh #2**

| **Thông tin**     | **Giá trị**                                   |
| ----------------- | --------------------------------------------- |
| **Tên phụ huynh** | Ngô Đức Anh                                   |
| **Email**         | `phuhuynh2@schoolbus.vn`                      |
| **Mật khẩu**      | `password`                                    |
| **SĐT**           | 0909000102                                    |
| **Con**           | Trần Khánh Linh (Học sinh #2)                 |
| **Lớp**           | 6B                                            |
| **Địa chỉ**       | 125 Nguyễn Văn Linh, Phường Tân Phong, Quận 7 |
| **Thứ tự đón**    | Stop #2                                       |

### **Option 3: Phụ huynh của Học sinh #5**

| **Thông tin**     | **Giá trị**                               |
| ----------------- | ----------------------------------------- |
| **Tên phụ huynh** | Đặng Văn Lâm                              |
| **Email**         | `phuhuynh5@schoolbus.vn`                  |
| **Mật khẩu**      | `password`                                |
| **SĐT**           | 0909000105                                |
| **Con**           | Ngô Thị Lan (Học sinh #5)                 |
| **Lớp**           | 6A                                        |
| **Địa chỉ**       | 321 Lê Văn Việt, Phường Tân Kiểng, Quận 7 |
| **Thứ tự đón**    | Stop #5 (giữa tuyến)                      |

---

## 🧪 Kịch bản Test

### **Step 1: Chuẩn bị Database**

```bash
# Chạy script tạo chuyến đi hôm nay
cd d:\CôngNghePhanMem\DoAnSSBCursor\Smart_School_Bus_Tracking_System\database
mysql -u root -p school_bus_system < create_trip_today_13nov.sql
```

**Kiểm tra**:

```sql
USE school_bus_system;

-- Kiểm tra chuyến 1 đã tạo chưa
SELECT * FROM ChuyenDi WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13';

-- Kiểm tra học sinh trong chuyến 1
SELECT
    t.maTrangThai,
    t.maChuyen,
    t.maHocSinh,
    h.hoTen AS tenHocSinh,
    n.hoTen AS tenPhuHuynh,
    n.email AS emailPhuHuynh,
    t.thuTuDiemDon,
    t.trangThai
FROM TrangThaiHocSinh t
JOIN HocSinh h ON t.maHocSinh = h.maHocSinh
JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
WHERE t.maChuyen = (SELECT maChuyen FROM ChuyenDi WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13')
ORDER BY t.thuTuDiemDon;
```

---

### **Step 2: Khởi động Backend & Frontend**

**Terminal 1 - Backend**:

```bash
cd ssb-backend
npm run dev
```

**Terminal 2 - Frontend**:

```bash
cd ssb-frontend
npm run dev
```

**Kiểm tra**:

- Backend: http://localhost:4000/api/v1/health
- Frontend: http://localhost:3000

---

### **Step 3: Login Tài xế (Trần Văn Tài)**

**Option A: API Call**:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "taixe1@schoolbus.vn",
    "matKhau": "password"
  }'
```

**Option B: Frontend**:

1. Mở http://localhost:3000/login
2. Email: `taixe1@schoolbus.vn`
3. Mật khẩu: `password`

**Lưu lại `accessToken`** để dùng cho GPS Simulator!

---

### **Step 4: Bắt đầu Chuyến 1**

**Option A: API Call** (Nhanh):

```bash
# Lấy Trip ID trước
curl http://localhost:4000/api/v1/trips?ngayChay=2025-11-13

# Start trip (thay <DRIVER_TOKEN> và <TRIP_ID>)
curl -X POST http://localhost:4000/api/v1/trips/<TRIP_ID>/start \
  -H "Authorization: Bearer <DRIVER_TOKEN>" \
  -H "Content-Type: application/json"
```

**Option B: Frontend**:

1. Login as driver → Dashboard
2. Tìm "Tuyến 1 - Đi" (ngày 2025-11-13)
3. Click **"Bắt đầu chuyến đi"**

**Expected Result**:

- ✅ Trip status → `dang_chay`
- ✅ `gioBatDauThucTe` được set
- ✅ WebSocket event `trip_started` được emit
- ✅ **Thông báo gửi đến 10 phụ huynh** (học sinh 1-10)

---

### **Step 5: Login Phụ huynh (Phạm Thu Hương)**

**Option A: API Call**:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "phuhuynh1@schoolbus.vn",
    "matKhau": "password"
  }'
```

**Option B: Frontend**:

1. Mở **Incognito/Private Window** (để không bị conflict session)
2. http://localhost:3000/login
3. Email: `phuhuynh1@schoolbus.vn`
4. Mật khẩu: `password`

**Expected View**:

- ✅ Dashboard phụ huynh
- ✅ Thấy con: **Nguyễn Gia Bảo**
- ✅ Thông báo: **"Chuyến đi đã bắt đầu"** 🚌
- ✅ Có thể theo dõi vị trí xe realtime

---

### **Step 6: Chạy GPS Simulator**

**Terminal 3**:

```bash
cd ssb-backend/scripts

# Lấy token driver từ Step 3, sau đó chạy:
node gps_simulator.js --tripId=<TRIP_ID> --speed=40 --interval=3
```

**Hoặc dùng WS Simulator đơn giản hơn**:

```bash
node ws_gps_simulator.js <TRIP_ID> <DRIVER_TOKEN>
```

**Expected Events** (sẽ thấy trong Parent UI):

- 📍 `bus_position_update`: Xe đang di chuyển (mỗi 3 giây)
- 🚏 `approach_stop`: Xe sắp đến điểm dừng #1 (≤60m) → **NOTIFICATION #1**
- ⏰ `delay_alert`: Xe trễ ≥5 phút (nếu có) → **NOTIFICATION #2**
- 🏁 `trip_completed`: Chuyến đi hoàn thành → **NOTIFICATION #3**

---

## 🔔 Expected Notifications (Parent UI)

### **Notification #1: Trip Started**

```
🚌 Chuyến đi đã bắt đầu!
Xe buýt 51A-12345 bắt đầu đón con bạn (Nguyễn Gia Bảo).
Thời gian: 06:30:00
Tài xế: Trần Văn Tài
```

### **Notification #2: Approaching Stop**

```
🚏 Xe buýt sắp đến điểm đón!
Xe buýt đang ở cách điểm đón 45m.
Thời gian: ~2 phút nữa
Điểm dừng: Nguyễn Văn Linh (Stop #1)
```

### **Notification #3: Delay Alert** (nếu có)

```
⏰ Chuyến đi bị trễ!
Xe buýt trễ hơn dự kiến 7 phút.
Vui lòng kiên nhẫn chờ đợi.
```

### **Notification #4: Trip Completed**

```
✅ Chuyến đi hoàn thành!
Xe buýt đã đưa con bạn đến trường an toàn.
Thời gian kết thúc: 07:15:32
```

---

## 📊 Checklist Test

### **Backend (Tài - M4/M5/M6)**

- [ ] Trip lifecycle: start/end/cancel works
- [ ] WebSocket events emit correctly
- [ ] `trip_started` → gửi notifications cho 10 parents
- [ ] `bus_position_update` → update realtime
- [ ] `approach_stop` → detect geofence 60m
- [ ] `delay_alert` → detect delay ≥5 min
- [ ] `trip_completed` → gửi notifications
- [ ] Firebase sync hoạt động
- [ ] FCM push notifications sent

### **Frontend (Parent Interface - Meeting 5)**

- [ ] Parent login thành công
- [ ] Dashboard hiển thị thông tin con
- [ ] Realtime map hiển thị vị trí xe
- [ ] Notification banner/toast hiển thị
- [ ] approach_stop notification (≤60m)
- [ ] delay_alert notification (≥5 min)
- [ ] trip_completed notification
- [ ] Event history sidebar
- [ ] Responsive trên mobile

---

## 🐛 Troubleshooting

### **Problem: Không nhận notification khi start trip**

**Cause**:

- Backend không emit `trip_started` event
- Parent chưa join đúng room

**Solution**:

```javascript
// Check backend logs
tail -f ssb-backend/logs/combined.log | grep trip_started

// Check parent joined rooms
// Should see: user-9, user-<PARENT_ID>, role-phu_huynh
```

### **Problem: Parent không thấy con trong dashboard**

**Cause**:

- Học sinh không có trong chuyến đi hôm nay
- maPhuHuynh không match

**Solution**:

```sql
-- Kiểm tra relationship
SELECT
    h.maHocSinh,
    h.hoTen,
    h.maPhuHuynh,
    n.email AS emailPhuHuynh
FROM HocSinh h
JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
WHERE n.email = 'phuhuynh1@schoolbus.vn';
```

### **Problem: GPS Simulator không connect**

**Cause**:

- JWT token expired (>24h)
- Backend không chạy
- Trip chưa start

**Solution**:

1. Get new token: `node test_auth_flow.js`
2. Check backend: `http://localhost:4000/api/v1/health`
3. Check trip status: `GET /api/v1/trips/<TRIP_ID>`

---

## 🎬 Demo Video Script

### **Part 1: Driver starts trip (30s)**

1. Open driver dashboard
2. Select "Tuyến 1 - Đi"
3. Click "Bắt đầu chuyến đi"
4. Show confirmation

### **Part 2: Parent receives notification (30s)**

1. Switch to parent account (Incognito)
2. Show dashboard with child info
3. Notification banner appears: "Chuyến đi đã bắt đầu"
4. Open notification details

### **Part 3: GPS tracking (60s)**

1. Start GPS simulator
2. Map shows bus moving
3. Notification: "Xe sắp đến điểm đón" (approach_stop)
4. Show event history
5. Trip completes → Final notification

---

## 📸 Screenshots cho Báo cáo

- [ ] Driver dashboard với button "Bắt đầu chuyến đi"
- [ ] Parent dashboard với child info
- [ ] Notification banner: "Chuyến đi đã bắt đầu"
- [ ] Map với bus icon moving realtime
- [ ] Notification: "Xe sắp đến điểm đón" (≤60m)
- [ ] Event history sidebar với tất cả events
- [ ] Final notification: "Chuyến đi hoàn thành"

---

## 📞 Contact

- **Developer**: Nguyễn Tuấn Tài
- **Role**: BE Realtime & Trip Lifecycle (M4/M5/M6)
- **Test Date**: 2025-11-13

**Happy Testing! 🚀**
