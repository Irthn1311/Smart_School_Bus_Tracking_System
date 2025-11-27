# 🚌 GPS Simulator Demo Guide

> **Smart School Bus Tracking System - GPS Testing Tools**  
> **Author**: Nguyễn Tuấn Tài  
> **Date**: 2025-11-13

---

## 📋 Table of Contents

- [Overview](#overview)
- [Demo Mode (Giả lập)](#demo-mode-giả-lập)
- [Real Mode (Thực tế)](#real-mode-thực-tế)
- [Setup Guide](#setup-guide)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Có **2 chế độ test GPS** cho hệ thống:

| Mode     | File               | Mục đích                      | Sử dụng khi                   |
| -------- | ------------------ | ----------------------------- | ----------------------------- |
| **Demo** | `gps_simulator.js` | Giả lập xe chạy theo polyline | Demo trong lớp cho GV         |
| **Real** | `real.html`        | Lấy GPS thiết bị thật         | Chứng minh hệ thống hoạt động |

---

## 🎮 Demo Mode (Giả lập)

### **Tại sao cần Demo Mode?**

Trong lớp **không thể lái xe thật**, nên cần mô phỏng:

- ✅ Xe chạy theo tuyến cố định với tốc độ 20-30 km/h
- ✅ Có tình huống: trễ, hư xe, bỏ lỡ điểm dừng
- ✅ Giảng viên thấy đủ chức năng: vẽ tuyến, theo dõi, cảnh báo
- ✅ GIF/Video minh họa cho báo cáo

### **Cách sử dụng**

#### **Option 1: GPS Simulator (Polyline-based) - RECOMMENDED**

```bash
# From ssb-backend directory
cd scripts

# Login to get token
node test_auth_flow.js

# Copy the accessToken, then run:
node gps_simulator.js --tripId=16 --speed=40 --interval=3
```

**Parameters:**

- `--tripId`: ID chuyến đi cần test (mặc định: 16)
- `--speed`: Tốc độ km/h (mặc định: 40)
- `--interval`: Giây giữa các update (mặc định: 3)
- `--username`: Tài khoản driver (mặc định: driver@ssb.vn)
- `--password`: Mật khẩu (mặc định: driver123)

**Tính năng:**

- ✅ Fetch trip data từ API
- ✅ Decode polyline từ route
- ✅ Interpolate smooth movement
- ✅ Calculate speed & heading
- ✅ Auto login & connect WebSocket
- ✅ Progress bar realtime
- ✅ Listen tất cả events (approach_stop, delay_alert)

#### **Option 2: Simple WS Simulator**

```bash
node ws_gps_simulator.js <tripId> <accessToken>
```

**Tính năng:**

- ✅ Đơn giản hơn, dùng sample stops
- ✅ Interpolate giữa các stops
- ✅ Good for quick testing

### **Expected Output**

```
═══════════════════════════════════════════════════════════════
🚌 GPS SIMULATOR STARTING
═══════════════════════════════════════════════════════════════

🔐 Logging in...
✅ Login successful
   User: Nguyễn Văn A (driver@ssb.vn)
   Role: tai_xe

📡 Fetching trip 16 data...
✅ Trip data fetched
   Trip: 16
   Route: Tuyến Quận 7 - Nhà Bè (2)
   Bus: 51A-12345 (3)

📍 Fetching route 2 polyline...
✅ Route polyline fetched

🚏 Fetching route 2 stops...
✅ Route stops fetched
   Total stops: 5

🗺️  Decoding polyline...
✅ Decoded 125 points

🔄 Interpolating points...
✅ Interpolated to 450 points

🔌 Connecting to WebSocket...
✅ WebSocket connected

═══════════════════════════════════════════════════════════════
🚀 SIMULATION STARTED
═══════════════════════════════════════════════════════════════

📡 Sending GPS updates every 3s...

📍 Point 1/450 (0.2%) | Elapsed: 3s | Remaining: ~1347s | ...
📡 [RECEIVED] bus_position_update: { lat: '10.762622', ... }
🚏 [RECEIVED] approach_stop: { stop: 'Ngã tư Nguyễn Văn Linh', distance: '45m', ... }
⚠️  [RECEIVED] delay_alert: { delay: '7min', ... }

═══════════════════════════════════════════════════════════════
🏁 SIMULATION COMPLETED
═══════════════════════════════════════════════════════════════
```

---

## 📱 Real Mode (Thực tế)

### **Tại sao cần Real Mode?**

Chứng minh hệ thống **hoạt động thật** với GPS thiết bị:

- ✅ Lấy tọa độ thật từ smartphone/laptop
- ✅ Di chuyển quanh trường
- ✅ Hiển thị speed/heading thực tế
- ✅ Reconnect ổn định

### **Cách sử dụng**

#### **Step 1: Open real.html**

```bash
# From ssb-backend/demo/bus-sim/
# Open in browser:
open real.html
# or
start real.html
```

#### **Step 2: Get Driver Token**

```bash
# Login as driver
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@ssb.vn",
    "matKhau": "driver123"
  }'
```

Copy `accessToken` từ response.

#### **Step 3: Configure & Start**

1. Paste **Access Token** vào input
2. Nhập **Trip ID** (ví dụ: 16)
3. Kiểm tra **WebSocket URL** (mặc định: http://localhost:4000)
4. Click **"Start GPS Tracking"**
5. Allow **Location Permission** khi browser hỏi
6. Di chuyển thiết bị và xem updates!

### **UI Features**

- 🟢 **Status**: WebSocket, GPS, Updates count, Accuracy
- 📍 **Coordinates**: Lat, Lng, Speed, Heading (realtime)
- 📊 **Event Log**: Tất cả WS events (bus_position_update, approach_stop, delay_alert)
- ✅ **Server ACK**: Xác nhận server nhận GPS

### **Screenshots**

![Real GPS Test UI](./screenshots/real-gps-test.png)

---

## 🛠️ Setup Guide

### **Prerequisites**

1. **Backend running**:

   ```bash
   cd ssb-backend
   npm run dev
   ```

2. **Frontend running** (để xem bản đồ):

   ```bash
   cd ssb-frontend
   npm run dev
   ```

3. **Database seeded** with trip data:
   ```bash
   mysql -u root -p ssb < database/create_trip_today_13nov.sql
   ```

### **Create Sample Trip**

```bash
# Login as admin
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ssb.vn","matKhau":"admin123"}'

# Create trip
curl -X POST http://localhost:4000/api/v1/trips \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "maLichTrinh": 5,
    "ngayChay": "2025-11-13",
    "trangThai": "chua_khoi_hanh"
  }'

# Start trip (as driver)
curl -X POST http://localhost:4000/api/v1/trips/16/start \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```

---

## 🐛 Troubleshooting

### **Problem: "REQUEST_DENIED" GPS Simulator**

**Cause**: Route không có polyline

**Solution**:

```bash
# Rebuild polyline
node scripts/rebuild-polyline.js --routeId=2
```

### **Problem: "Connection error" WebSocket**

**Cause**: Backend không chạy hoặc JWT token sai

**Solution**:

1. Check backend: `http://localhost:4000/api/v1/health`
2. Get new token: `node scripts/test_auth_flow.js`
3. Check token không expired (< 24h)

### **Problem: "GPS error: PERMISSION_DENIED" (Real Mode)**

**Cause**: Browser không có quyền truy cập location

**Solution**:

1. Chrome: Settings > Privacy > Site Settings > Location
2. Allow location for `localhost`
3. Reload page và try again

### **Problem: "No events received"**

**Cause**: Không join đúng room hoặc trip chưa start

**Solution**:

1. Check trip status: `GET /api/v1/trips/16`
2. Start trip nếu chưa: `POST /api/v1/trips/16/start`
3. Check backend logs: `tail -f logs/combined.log`

### **Problem: Speed = 0 (Real Mode)**

**Cause**: Thiết bị không di chuyển hoặc GPS accuracy thấp

**Solution**:

1. Di chuyển thiết bị ít nhất 5-10 mét
2. Đợi GPS accuracy < 20m
3. Thử outdoor (GPS signal tốt hơn)

---

## 📊 Demo Scenarios

### **Scenario 1: Normal Trip (On-time)**

```bash
node gps_simulator.js --tripId=16 --speed=40 --interval=3
```

**Expected**:

- ✅ bus_position_update mỗi 3s
- ✅ approach_stop khi gần stops (≤60m)
- ✅ KHÔNG có delay_alert (đúng giờ)
- ✅ trip_completed ở cuối

### **Scenario 2: Delayed Trip**

```bash
# Start trip late (sau giờ khởi hành 10 phút)
# Then run simulator
node gps_simulator.js --tripId=16 --speed=30 --interval=3
```

**Expected**:

- ✅ delay_alert xuất hiện (delay ≥5 phút)
- ✅ alert gửi lại mỗi 3 phút

### **Scenario 3: Slow Trip**

```bash
node gps_simulator.js --tripId=16 --speed=15 --interval=5
```

**Expected**:

- ✅ Xe chạy chậm → delay tăng dần
- ✅ Multiple delay_alerts

---

## 📸 GIF/Screenshots for Report

### **Create GIF (30-60s)**

1. Start demo: `node gps_simulator.js`
2. Open frontend: `http://localhost:3000/parent`
3. Record screen với OBS/QuickTime
4. Convert to GIF: `ffmpeg -i demo.mp4 -vf "fps=10,scale=800:-1" demo.gif`

### **Screenshot Checklist**

- [ ] Map với xe đang chạy + stops
- [ ] approach_stop notification banner
- [ ] delay_alert notification
- [ ] Parent sidebar với event history
- [ ] Real GPS test UI
- [ ] Backend logs với events

---

## 🎓 For Report (Báo cáo)

### **Why 2 modes? (Giải thích cho GV)**

| Aspect          | Demo Mode                   | Real Mode                    |
| --------------- | --------------------------- | ---------------------------- |
| **Purpose**     | Trình diễn đầy đủ tính năng | Chứng minh hoạt động thực tế |
| **Environment** | Trong lớp                   | Di chuyển thật               |
| **Data**        | Giả lập (polyline)          | GPS thiết bị thật            |
| **Scenarios**   | Delay, breakdown, skip stop | Movement patterns thật       |
| **Advantages**  | Controllable, repeatable    | Real-world validation        |

### **Technical Highlights**

- ✅ **Haversine formula** cho geofence 60m
- ✅ **WebSocket rooms** cho publish-subscribe
- ✅ **Debounce** 60-90s tránh spam approach_stop
- ✅ **EMA speed tracking** cho ETA chính xác
- ✅ **Interpolation** smooth movement (2-3s updates)

---

## 📞 Contact

- **Developer**: Nguyễn Tuấn Tài (3123410318)
- **Role**: BE Realtime & Trip Lifecycle (M4/M5/M6)
- **GitHub**: Smart_School_Bus_Tracking_System

---

**Happy Testing! 🚀**
