# Hướng dẫn Demo MVP Realtime Tracking

## Tổng quan

Tài liệu này hướng dẫn cách demo hệ thống theo dõi xe buýt realtime cho giảng viên, với 2 chế độ: DEMO (script mô phỏng) và REAL (GPS thiết bị).

---

## Phần 1: DEMO Mode - Script mô phỏng

### Mục đích
Demo đầy đủ tính năng hệ thống với dữ liệu GPS được mô phỏng, đảm bảo demo mượt mà và kiểm soát được.

### Chuẩn bị (5 phút)

1. **Start Backend:**
   ```bash
   cd ssb-backend
   npm run dev
   ```
   Verify: Thấy message "Server running on port 4000"

2. **Start Frontend:**
   ```bash
   cd ssb-frontend
   npm run dev
   ```
   Verify: Thấy message "Ready on http://localhost:3000"

3. **Kiểm tra Driver Account:**
   ```bash
   cd ssb-backend
   npm run check:drivers
   ```
   Nếu không có driver account, tạo mới:
   ```bash
   npm run create:driver
   # Hoặc với custom credentials:
   node scripts/check_drivers.js --create --email=driver@ssb.vn --password=driver123
   ```

4. **Kiểm tra Database:**
   - Verify có trip với status "chua_khoi_hanh" cho hôm nay
   - Verify trip có route với polyline
   - Verify route có stops với coordinates

### Demo Flow (10-15 phút)

#### Bước 1: Giới thiệu hệ thống (2 phút)
1. Mở Admin Dashboard: `http://localhost:3000/admin/tracking`
2. Login: `admin@ssb.vn` / `admin123`
3. Giải thích:
   - "Đây là trang theo dõi realtime của admin"
   - "Hiện tại chưa có xe nào đang chạy"
   - "Map hiển thị routes và stops"

#### Bước 2: Driver Start Trip (2 phút)
1. Mở tab mới: `http://localhost:3000/driver/trip/[tripId]`
2. Login: `driver@ssb.vn` / `driver123`
3. Giải thích:
   - "Đây là giao diện tài xế"
   - "Có 2 chế độ: DEMO (script) và REAL (GPS thiết bị)"
   - "Hôm nay demo bằng DEMO mode"
4. Chọn: **DEMO - Script mô phỏng (server)**
5. Nhấn **"Bắt đầu chuyến đi"**
6. Verify: Trip status chuyển thành "dang_chay"

#### Bước 3: Chạy Demo Script (1 phút)
1. Mở terminal mới
2. Chạy:
   ```bash
   cd ssb-backend
   npm run ws:demo -- --tripId=16 --speed=40 --interval=3
   ```
   **Nếu gặp lỗi login**, thử với credentials cụ thể:
   ```bash
   npm run ws:demo -- --tripId=16 --username=driver@ssb.vn --password=driver123
   ```
   Hoặc kiểm tra driver accounts có sẵn:
   ```bash
   npm run check:drivers
   ```
3. Giải thích:
   - "Script này mô phỏng xe chạy theo route với polyline thật"
   - "Tốc độ 40 km/h, gửi GPS mỗi 3 giây"
   - "Tất cả logic geofence, delay detection đều là logic thật"

#### Bước 4: Quan sát Realtime Tracking (5 phút)
1. Quay lại Admin page
2. Giải thích khi xe di chuyển:
   - ✅ "Xe đang di chuyển trên map realtime"
   - ✅ "Marker cập nhật mỗi 3 giây"
   - ✅ "Speed và heading hiển thị đúng"
3. Khi xe đến gần điểm dừng (≤60m):
   - ✅ "Hệ thống tự động phát hiện và bắn event approach_stop"
   - ✅ "Toast notification xuất hiện"
   - ✅ "Đây là geofence detection với bán kính 60m"
4. Nếu xe trễ >5 phút:
   - ✅ "Hệ thống phát hiện delay và bắn delay_alert"
   - ✅ "Bus status chuyển thành 'late'"
   - ✅ "Alert được gửi lại mỗi 3 phút"

#### Bước 5: Parent View (2 phút)
1. Mở tab mới: `http://localhost:3000/parent`
2. Login: `parent@ssb.vn` / `parent123`
3. Giải thích:
   - "Phụ huynh thấy cùng xe đang di chuyển"
   - "Nhận được notifications khi xe đến gần điểm dừng"
   - "Nhận được alerts khi xe trễ"

#### Bước 6: Kết thúc (1 phút)
1. Trên driver page, nhấn **"Kết thúc chuyến đi"**
2. Verify: Trip status chuyển thành "hoan_thanh"
3. Script tự động dừng

### Điểm nhấn khi demo
- ✅ **Geofence Detection**: "Hệ thống tự động phát hiện khi xe trong vòng 60m từ điểm dừng"
- ✅ **Delay Detection**: "So sánh thời gian thực tế với lịch trình, phát hiện trễ >5 phút"
- ✅ **Realtime Updates**: "WebSocket đảm bảo độ trễ <3 giây"
- ✅ **Multi-client**: "Nhiều người có thể theo dõi cùng lúc"

---

## Phần 2: REAL Mode - GPS thiết bị

### Mục đích
Chứng minh hệ thống hoạt động thật với GPS từ điện thoại, không chỉ là demo.

### Chuẩn bị (3 phút)

1. **Setup Network Access:**
   - Option 1: Dùng LAN (cùng WiFi)
   - Option 2: Dùng ngrok: `ngrok http 3000`
   - Option 3: Deploy lên server

2. **Verify Backend/Frontend đang chạy**

### Demo Flow (5-7 phút)

#### Bước 1: Giới thiệu REAL Mode (1 phút)
1. Trên driver page, chuyển sang **REAL - GPS từ thiết bị**
2. Giải thích:
   - "Bây giờ không dùng script nữa"
   - "Sẽ lấy GPS thật từ điện thoại"
   - "Tất cả logic vẫn giống DEMO mode"

#### Bước 2: Request GPS Permission (1 phút)
1. Browser hỏi "Allow location access?"
2. Chọn **"Allow"**
3. Verify: Thấy "✅ GPS đang hoạt động"
4. Giải thích:
   - "Trình duyệt đã có quyền truy cập GPS"
   - "Hệ thống sẽ gửi vị trí lên server mỗi 3-5 giây"

#### Bước 3: Start Trip và Di chuyển (3 phút)
1. Nhấn **"Bắt đầu chuyến đi"**
2. Verify: GPS tự động bắt đầu
3. Đi bộ vài bước trong phòng/hành lang
4. Giải thích:
   - "Điện thoại đang gửi vị trí thật lên server"
   - "Admin/Parent thấy marker di chuyển theo mình"
   - "Nếu đi gần điểm dừng → approach_stop event"
   - "Nếu trễ → delay_alert event"

#### Bước 4: Verify trên Admin Page (1 phút)
1. Quay lại Admin page
2. Verify: Marker di chuyển theo vị trí thật
3. Giải thích:
   - "Đây là GPS thật, không phải mô phỏng"
   - "Hệ thống có thể deploy và chạy thật ngoài thực tế"

### Điểm nhấn khi demo
- ✅ **Real GPS**: "Hệ thống hoạt động với GPS thật từ thiết bị"
- ✅ **Same Pipeline**: "Cùng pipeline xử lý như DEMO mode"
- ✅ **Production Ready**: "Có thể deploy và chạy thật"

---

## So sánh 2 chế độ

| Aspect | DEMO Mode | REAL Mode |
|--------|-----------|-----------|
| **Nguồn GPS** | Script backend | Thiết bị thật |
| **Môi trường** | Trong lớp | Di chuyển thật |
| **Ưu điểm** | Kiểm soát được, mượt mà | Chứng minh hoạt động thật |
| **Khi nào dùng** | Demo cho GV | Chứng minh thực tế |

---

## Troubleshooting

### Script không chạy
- Check backend đang chạy
- Check trip ID đúng
- Check route có polyline
- **Lỗi login**: Kiểm tra driver account:
  ```bash
  npm run check:drivers
  ```
  Nếu không có, tạo mới:
  ```bash
  npm run create:driver
  ```
  Hoặc reset password:
  ```bash
  node scripts/check_drivers.js --reset-password --email=driver@ssb.vn --password=driver123
  ```

### GPS không hoạt động
- Check browser permissions
- Check HTTPS/localhost
- Check GPS signal (thử outdoor)

### Events không xuất hiện
- Check WebSocket connection
- Check console logs
- Verify đã join trip room

---

## Kết luận

Hệ thống hỗ trợ cả 2 chế độ:
- **DEMO Mode**: Đảm bảo demo mượt mà, kiểm soát được
- **REAL Mode**: Chứng minh hoạt động thật với GPS thiết bị

Cả 2 chế độ dùng chung pipeline xử lý, chỉ khác nguồn GPS.

