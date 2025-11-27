# 🎯 QUICK TEST GUIDE - Chuyến 1

## 📌 TL;DR - Thông tin nhanh

**Phụ huynh để test**: Phạm Thu Hương  
**Email**: `phuhuynh1@schoolbus.vn`  
**Password**: `password`  
**Con**: Nguyễn Gia Bảo (Học sinh #1)

**Tài xế**: Trần Văn Tài  
**Email**: `taixe1@schoolbus.vn`  
**Password**: `password`

---

## 🚀 4 Steps Test

### **1. Start Backend & Frontend**

```bash
# Terminal 1
cd ssb-backend && npm run dev

# Terminal 2
cd ssb-frontend && npm run dev
```

### **2. Login Driver & Start Trip**

```bash
# Get driver token
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"taixe1@schoolbus.vn","matKhau":"password"}'

# Start trip (replace <TOKEN> and <TRIP_ID>)
curl -X POST http://localhost:4000/api/v1/trips/<TRIP_ID>/start \
  -H "Authorization: Bearer <TOKEN>"
```

### **3. Login Parent (Incognito Window)**

- URL: http://localhost:3000/login
- Email: `phuhuynh1@schoolbus.vn`
- Password: `password`

### **4. Check Notification**

✅ Phụ huynh sẽ thấy notification: **"🚌 Chuyến đi đã bắt đầu!"**

---

## 📱 Expected Notification

```
🚌 Chuyến đi đã bắt đầu!
Xe buýt 51A-12345 đã bắt đầu đón con bạn (Tuyến Quận 7 - Nhà Bè).
Thời gian: 06:30
Tài xế: Trần Văn Tài
```

---

## 🎬 Demo GPS Simulator (Optional)

```bash
cd ssb-backend/scripts
node gps_simulator.js --tripId=<TRIP_ID> --speed=40 --interval=3
```

**Expected events**:

- 📍 `bus_position_update`: Mỗi 3 giây
- 🚏 `approach_stop`: Khi gần điểm dừng ≤60m → **NOTIFICATION**
- ⏰ `delay_alert`: Khi trễ ≥5 phút → **NOTIFICATION**
- 🏁 `trip_completed`: Khi kết thúc → **NOTIFICATION**

---

## ✅ What I Changed (M5)

Đã thêm vào `TripController.startTrip()`:

1. ✅ Lấy danh sách học sinh trong chuyến
2. ✅ Lấy danh sách phụ huynh từ học sinh
3. ✅ Tạo bulk notifications cho tất cả phụ huynh
4. ✅ Emit WebSocket event `notification:new` đến room `user-{parentId}`

**Files changed**:

- `ssb-backend/src/controllers/TripController.js` (+90 lines)

---

## 📞 Troubleshooting

**Problem**: Không nhận notification?

**Solution**:

1. Check backend logs: `tail -f ssb-backend/logs/combined.log`
2. Check parent joined room: Should see `user-9`, `role-phu_huynh`
3. Check WebSocket connected: Browser DevTools → Network → WS tab

---

**Happy Testing! 🚀**
