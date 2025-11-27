# 🎯 NHIỆM VỤ NGÀY 3 - HOÀN THÀNH

## ✅ Checklist Ngày 3 (28/10): Nguyễn Tuấn Tài

- [x] **(1) Tích hợp `verifyWsJWT` vào Socket.IO**
- [x] **(2) Hoàn thành logic Handshake + Join Rooms**
- [x] **(3) Phát 1 sự kiện test (`bus_position_update`) với data giả**

---

## 🚀 CÁCH CHẠY TEST

### Terminal #1: Khởi động Server

```bash
cd ssb-backend
npm run dev
```

Chờ đến khi thấy:

```
✅ Socket.IO server created
✅ Authentication middleware registered
🚀 Server đang chạy tại http://localhost:4000
```

### Terminal #2: Chạy Test Bus Position

```bash
node src/scripts/test_bus_position.js
```

---

## 📊 KẾT QUẢ MONG ĐỢI

```
══════════════════════════════════════════════════════════════════
🚌 TEST SỰ KIỆN BUS_POSITION_UPDATE
══════════════════════════════════════════════════════════════════

👨‍✈️ Tạo kết nối tài xế...
👨‍👩‍👧 Tạo kết nối phụ huynh...
✅ Tài xế đã kết nối (Socket ID: xyz...)
✅ Phụ huynh đã kết nối (Socket ID: abc...)

✅ Tài xế nhận welcome: Xin chào driver01@ssb.vn! ...
✅ Phụ huynh nhận welcome: Xin chào parent01@ssb.vn! ...

🚪 Tài xế join trip-42...
🚪 Phụ huynh join trip-42...
✅ Tài xế đã join trip-42
✅ Phụ huynh đã join trip-42

📍 Bắt đầu gửi vị trí GPS mỗi 3 giây...

📤 [Tài xế] Gửi vị trí #1:
   GPS: 21.0285, 105.8542
   Tốc độ: 30 km/h

📥 [Phụ huynh] Nhận vị trí xe bus:
   Trip ID: 42, Bus ID: 5
   GPS: 21.0285, 105.8542
   Tốc độ: 30 km/h, Hướng: 90°
   Thời gian: 2025-10-29T12:00:00.000Z

(Lặp lại 4 lần nữa cho tổng 5 vị trí...)

🏁 Đã gửi hết vị trí giả, dừng test

🔌 Ngắt kết nối tài xế và phụ huynh...
🔴 Tài xế ngắt kết nối: client namespace disconnect
🔴 Phụ huynh ngắt kết nối: client namespace disconnect

══════════════════════════════════════════════════════════════════
🎉 TEST HOÀN TẤT!
══════════════════════════════════════════════════════════════════

✅ Nhiệm vụ Ngày 3 - Mục (3) ĐÃ XONG:
   → Phát sự kiện bus_position_update với data giả
   → Phụ huynh nhận được vị trí realtime
```

---

## 📁 CÁC FILE ĐÃ THAY ĐỔI

### 1. `src/ws/index.js` (Thêm handler)

Đã thêm event handler:

```javascript
socket.on("bus_position_update", (data) => {
  console.log(
    `📍 GPS update từ ${user.email}: Trip ${data.tripId}, Bus ${data.busId}`
  );
  console.log(
    `   Tọa độ: ${data.lat}, ${data.lng} | Tốc độ: ${data.speed} km/h`
  );

  // Broadcast vị trí đến tất cả người trong room trip-{tripId}
  io.to(`trip-${data.tripId}`).emit("bus_position_update", {
    ...data,
    driverEmail: user.email,
    driverName: user.hoTen || user.email,
  });
});
```

### 2. `src/scripts/test_bus_position.js` (File mới)

File test tự động:

- Tạo 2 kết nối: Tài xế và Phụ huynh
- Cả 2 join room `trip-42`
- Tài xế gửi 5 vị trí giả (mỗi 3 giây)
- Phụ huynh nhận và hiển thị vị trí

---

## ❓ NẾU GẶP LỖI

### Lỗi: `connect_error: Authentication failed`

**Nguyên nhân:** Database chưa có user ID = 1 hoặc ID = 2

**Giải pháp:**

```bash
# Kiểm tra DB
node src/scripts/test_db.js

# Hoặc chạy seed (nếu có)
node src/scripts/seed.js
```

### Lỗi: `ECONNREFUSED 127.0.0.1:4000`

**Nguyên nhân:** Server chưa chạy

**Giải pháp:**

```bash
# Quay lại Terminal #1
cd ssb-backend
npm run dev
```

### Lỗi: `Module not found: socket.io-client`

**Nguyên nhân:** Chưa cài package

**Giải pháp:**

```bash
npm install socket.io-client --save-dev
```

---

## 🎓 GIẢI THÍCH CHO BẠN BẠN CỦA BẠN

### Câu hỏi: "Vậy tôi làm như nào?"

**Trả lời:**

Bạn cần **2 bước**:

1. **Thêm handler trong `src/ws/index.js`** → Để server biết xử lý event `bus_position_update`
2. **Tạo file test `src/scripts/test_bus_position.js`** → Để chạy thử và demo

### Tại sao cần 2 file?

- **`index.js`**: Là **SERVER** - nhận dữ liệu từ tài xế và phát lại cho phụ huynh
- **`test_bus_position.js`**: Là **CLIENT** - giả lập tài xế và phụ huynh để test

### Flow hoạt động:

```
1. Tài xế kết nối → Server xác thực JWT → OK
2. Tài xế join room "trip-42"
3. Phụ huynh join room "trip-42"
4. Tài xế emit: bus_position_update → Server
5. Server broadcast → All clients trong room "trip-42"
6. Phụ huynh nhận được vị trí
```

---

## 📚 TÀI LIỆU THAM KHẢO

- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO Events](https://socket.io/docs/v4/emitting-events/)
- File: `src/ws/index.js` (có comment chi tiết)

---

## 🎯 BƯỚC TIẾP THEO (NGÀY 4)

1. Tích hợp với REST API: `POST /trips/:id/start` → emit `trip_started`
2. Xử lý geofence (60m) → emit `approach_stop`
3. Tính delay → emit `delay_alert`
4. Hoàn thiện `POST /trips/:id/end` → emit `trip_completed`

---

**Hoàn thành bởi:** Nguyễn Tuấn Tài  
**Ngày:** 29/10/2025 (Ngày 4, nhưng hoàn thành nhiệm vụ Ngày 3)  
**Trạng thái:** ✅ PASS ALL TESTS
