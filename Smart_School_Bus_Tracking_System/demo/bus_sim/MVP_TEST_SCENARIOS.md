# MVP Test Scenarios - Realtime Tracking

## Tổng quan

Tài liệu này mô tả các kịch bản test cho MVP Realtime Tracking với 2 chế độ: DEMO và REAL GPS.

---

## Chế độ 1: DEMO Mode (Script mô phỏng)

### Mục đích
Test hệ thống với dữ liệu GPS được mô phỏng từ script backend, đảm bảo demo mượt mà không phụ thuộc GPS thật.

### Prerequisites
1. Backend đang chạy: `cd ssb-backend && npm run dev`
2. Frontend đang chạy: `cd ssb-frontend && npm run dev`
3. Database đã có sample trip với status "chua_khoi_hanh" cho hôm nay
4. Trip có route với polyline và stops
5. **Kiểm tra driver account:**
   ```bash
   cd ssb-backend
   npm run check:drivers
   ```
   Nếu không có driver account, tạo mới:
   ```bash
   npm run create:driver
   # Hoặc với custom email/password:
   node scripts/check_drivers.js --create --email=driver@ssb.vn --password=password
   ```

### Test Flow

#### Bước 1: Chuẩn bị
```bash
# Terminal 1: Start backend
cd ssb-backend
npm run dev

# Terminal 2: Start frontend
cd ssb-frontend
npm run dev
```

#### Bước 2: Login Admin
1. Mở browser: `http://localhost:3000/login`
2. Login với: `admin@ssb.vn` / `admin123`
3. Vào trang: `/admin/tracking`
4. Verify: Thấy map với routes và stops

#### Bước 3: Login Driver
1. Mở tab mới hoặc browser khác: `http://localhost:3000/login`
2. Login với: `driver@ssb.vn` / `driver123`
3. Vào trang: `/driver/trip/[tripId]` (thay [tripId] bằng ID trip hôm nay)
4. Chọn chế độ: **DEMO - Script mô phỏng (server)**
5. Verify: Thấy message "Đang chờ script demo gửi vị trí..."

#### Bước 4: Start Trip
1. Trên driver page, nhấn **"Bắt đầu chuyến đi"**
2. Verify: Trip status chuyển thành "dang_chay"
3. Verify: Không tự động bật GPS (vì đang ở DEMO mode)

#### Bước 5: Chạy Demo Script
```bash
# Terminal 3: Chạy GPS simulator
cd ssb-backend

npm run ws:demo -- --tripId=24 --username=taixe1@schoolbus.vn --password=password
```

**Expected Output:**
```
🚌 GPS SIMULATOR STARTING
🔐 Logging in...
✅ Login successful
📡 Fetching trip 16 data...
✅ Trip data fetched
📍 Fetching route polyline...
✅ Route polyline fetched
🗺️  Decoding polyline...
✅ Decoded 125 points
🔄 Interpolating points...
✅ Interpolated to 450 points
🔌 Connecting to WebSocket...
✅ WebSocket connected
🚀 SIMULATION STARTED
📡 Sending GPS updates every 3s...
📍 Point 1/450 (0.2%) | Elapsed: 3s | Remaining: ~1347s | ...
```

#### Bước 6: Verify Admin Page
1. Quay lại admin tracking page
2. Verify:
   - ✅ Xe xuất hiện trên map và di chuyển
   - ✅ Bus marker cập nhật vị trí realtime
   - ✅ Speed và heading hiển thị đúng
   - ✅ Khi xe đến gần điểm dừng (≤60m):
     - Toast notification: "🚏 Xe sắp đến điểm dừng"
     - Console log: `approach_stop` event
   - ✅ Nếu xe trễ >5 phút:
     - Toast notification: "⏰ Cảnh báo chậm trễ"
     - Bus status chuyển thành "late"
     - Console log: `delay_alert` event

#### Bước 7: Verify Parent Page
1. Mở tab mới: `http://localhost:3000/login`
2. Login với: `parent@ssb.vn` / `parent123`
3. Vào trang: `/parent`
4. Verify:
   - ✅ Thấy cùng xe đang di chuyển trên map
   - ✅ Nhận được `approach_stop` notifications
   - ✅ Nhận được `delay_alert` nếu có

#### Bước 8: End Trip
1. Trên driver page, nhấn **"Kết thúc chuyến đi"** khi đến điểm cuối
2. Verify: Trip status chuyển thành "hoan_thanh"
3. Verify: Script tự động dừng khi hoàn thành

---

## Chế độ 2: REAL Mode (GPS thiết bị)

### Mục đích
Test hệ thống với GPS thật từ điện thoại/thiết bị, chứng minh hệ thống hoạt động thực tế.

### Prerequisites
1. Backend và Frontend đang chạy (giống DEMO mode)
2. Điện thoại có trình duyệt (Chrome/Safari) + kết nối mạng
3. Web app có thể truy cập từ điện thoại (LAN hoặc ngrok)

### Test Flow

#### Bước 1: Chuẩn bị
```bash
# Terminal 1: Start backend
cd ssb-backend
npm run dev

# Terminal 2: Start frontend
cd ssb-frontend
npm run dev
```

#### Bước 2: Login Driver trên điện thoại
1. Mở browser trên điện thoại: `http://[YOUR_IP]:3000/login`
   - Hoặc dùng ngrok: `https://[ngrok-url].ngrok.io/login`
2. Login với: `driver@ssb.vn` / `driver123`
3. Vào trang: `/driver/trip/[tripId]`
4. Chọn chế độ: **REAL - GPS từ thiết bị**

#### Bước 3: Request Location Permission
1. Browser sẽ hỏi "Allow location access?"
2. Chọn **"Allow"**
3. Verify: Thấy message "✅ GPS đang hoạt động"

#### Bước 4: Start Trip
1. Nhấn **"Bắt đầu chuyến đi"**
2. Verify: GPS tự động bắt đầu tracking
3. Verify: Thấy coordinates (lat, lng) cập nhật realtime

#### Bước 5: Di chuyển thiết bị
1. Đi bộ vài bước trong khuôn viên
2. Verify trên Admin/Parent page:
   - ✅ Marker xe di chuyển theo vị trí thật
   - ✅ Speed và heading cập nhật
   - ✅ Nếu đi gần điểm dừng (≤60m): Nhận `approach_stop`
   - ✅ Nếu trễ >5 phút: Nhận `delay_alert`

#### Bước 6: Verify Events
1. Trên Admin page, verify:
   - ✅ Toast notifications cho `approach_stop`
   - ✅ Toast notifications cho `delay_alert`
   - ✅ Bus status cập nhật đúng
2. Trên Parent page, verify:
   - ✅ Banner hiển thị khi approach stop
   - ✅ Warning banner khi delay

---

## Test Cases

### TC1: DEMO Mode - Normal Trip
**Steps:**
1. Chạy demo script với speed 40 km/h
2. Verify: Xe di chuyển mượt trên map
3. Verify: approach_stop events được emit đúng
4. Verify: Không có delay_alert (nếu đúng giờ)

**Expected:** ✅ Tất cả events hoạt động đúng

### TC2: DEMO Mode - Delayed Trip
**Steps:**
1. Start trip sau giờ khởi hành 10 phút
2. Chạy demo script với speed 30 km/h (chậm)
3. Verify: delay_alert được emit sau 5 phút
4. Verify: Alert được gửi lại mỗi 3 phút

**Expected:** ✅ Delay detection hoạt động

### TC3: REAL Mode - GPS Permission Denied
**Steps:**
1. Chọn REAL mode
2. Từ chối location permission
3. Verify: Hiển thị warning message
4. Verify: GPS không bật

**Expected:** ✅ Error handling đúng

### TC4: REAL Mode - Network Error
**Steps:**
1. Bật REAL mode và start trip
2. Tắt WiFi/4G
3. Verify: GPS vẫn chạy nhưng không gửi được
4. Bật lại mạng
5. Verify: GPS tự động reconnect và gửi lại

**Expected:** ✅ Reconnection hoạt động

### TC5: Multiple Clients
**Steps:**
1. Mở Admin page trên laptop
2. Mở Parent page trên tab khác
3. Chạy DEMO script
4. Verify: x1Cả 2 clients đều nhận được updates

**Expected:** ✅ Broadcast hoạt động đúng

---

## Troubleshooting

### Problem: Script không kết nối được WebSocket
**Solution:**
- Check backend đang chạy: `curl http://localhost:4000/api/v1/health`
- Check token không expired
- Check CORS settings trong backend

### Problem: Frontend không nhận được events
**Solution:**
- Check WebSocket connection: Mở DevTools → Network → WS
- Verify đã join trip room: `socket.emit('join_trip', tripId)`
- Check console logs cho errors

### Problem: GPS không hoạt động trên điện thoại
**Solution:**
- Check browser permissions: Settings → Site Settings → Location
- Verify HTTPS hoặc localhost (HTTP chỉ hoạt động trên localhost)
- Check GPS signal: Thử outdoor

### Problem: approach_stop không được emit
**Solution:**
- Check geofence radius: Mặc định 60m
- Verify stops có coordinates đúng
- Check console logs trong backend

---

## Acceptance Criteria

1. ✅ **DEMO Mode**: Script chạy → Xe di chuyển → Approach stop → Delay alert → End trip
2. ✅ **REAL Mode**: GPS bật → Gửi vị trí thật → Hiển thị trên map → Events hoạt động
3. ✅ **Admin/Parent**: Nhận được realtime updates, notifications, alerts
4. ✅ **Error Handling**: GPS permission denied, network errors được xử lý đúng

