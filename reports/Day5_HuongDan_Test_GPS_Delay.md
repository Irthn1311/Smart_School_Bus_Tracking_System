# 📋 HƯỚNG DẪN TEST DAY 5: GPS TRACKING & DELAY ALERT

---

## 1. Chuẩn bị môi trường

- Đảm bảo backend, frontend, database đều chạy ổn định
- Cấu hình lại CORS, API URL cho phép truy cập từ nhiều thiết bị (IP LAN, localhost)
- Tạo dữ liệu chuyến đi mới cho ngày 31/10/2025 bằng script SQL bên dưới

### 🚌 Script tạo chuyến đi hôm nay (2025-10-31)

```sql
-- XÓA DỮ LIỆU CŨ (nếu có)
DELETE FROM TrangThaiHocSinh WHERE maChuyen IN (
  SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-10-31'
);
DELETE FROM ChuyenDi WHERE ngayChay = '2025-10-31';

-- TẠO CHUYẾN ĐI MỚI CHO HÔM NAY
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(1, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 7 - Nhà Bè - Đón sáng - Xe 51A-12345'),
(2, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 7 - Nhà Bè - Trả chiều - Xe 51A-12345'),
(3, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 4 - Quận 7 - Đón sáng - Xe 51B-67890'),
(4, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 4 - Quận 7 - Trả chiều - Xe 51B-67890'),
(5, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 7 - Quận 1 - Đón sáng - Xe 51C-11111'),
(6, '2025-10-31', 'chua_khoi_hanh', 'Tuyến Quận 7 - Quận 1 - Trả chiều - Xe 51C-11111');

-- THÊM HỌC SINH VÀO CHUYẾN ĐI
-- (Giả sử ID chuyến bắt đầu từ 22)
SET @trip1 = LAST_INSERT_ID() - 5;
SET @trip2 = LAST_INSERT_ID() - 4;
SET @trip3 = LAST_INSERT_ID() - 3;
SET @trip4 = LAST_INSERT_ID() - 2;
SET @trip5 = LAST_INSERT_ID() - 1;
SET @trip6 = LAST_INSERT_ID();

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, ghiChu) VALUES
(@trip1, 1, 1, 'cho_don', 'Nguyễn Gia Bảo - Điểm 1'),
(@trip1, 2, 2, 'cho_don', 'Trần Khánh Linh - Điểm 2'),
(@trip1, 3, 3, 'cho_don', 'Lê Quang Huy - Điểm 3'),
(@trip2, 1, 1, 'cho_don', 'Nguyễn Gia Bảo - Điểm 1'),
(@trip2, 2, 2, 'cho_don', 'Trần Khánh Linh - Điểm 2'),
(@trip2, 3, 3, 'cho_don', 'Lê Quang Huy - Điểm 3'),
(@trip3, 4, 1, 'cho_don', 'Phạm Minh Anh - Điểm 1'),
(@trip3, 5, 2, 'cho_don', 'Ngô Thị Lan - Điểm 2'),
(@trip3, 6, 3, 'cho_don', 'Võ Đức Minh - Điểm 3'),
(@trip4, 4, 1, 'cho_don', 'Phạm Minh Anh - Điểm 1'),
(@trip4, 5, 2, 'cho_don', 'Ngô Thị Lan - Điểm 2'),
(@trip4, 6, 3, 'cho_don', 'Võ Đức Minh - Điểm 3'),
(@trip5, 7, 1, 'cho_don', 'Hoàng Thị Hoa - Điểm 1'),
(@trip5, 8, 2, 'cho_don', 'Lý Văn Đức - Điểm 2'),
(@trip5, 9, 3, 'cho_don', 'Trần Thị Mai - Điểm 3'),
(@trip6, 7, 1, 'cho_don', 'Hoàng Thị Hoa - Điểm 1'),
(@trip6, 8, 2, 'cho_don', 'Lý Văn Đức - Điểm 2'),
(@trip6, 9, 3, 'cho_don', 'Trần Thị Mai - Điểm 3');

-- KIỂM TRA KẾT QUẢ
SELECT * FROM ChuyenDi WHERE ngayChay = '2025-10-31';
```

---

## 2. Đăng nhập trên laptop khác

- Đảm bảo laptop khác kết nối cùng mạng LAN với server
- Truy cập frontend qua địa chỉ: `http://<IP-server>:3000` (ví dụ: `http://192.168.31.217:3000`)
- Đăng nhập tài khoản tài xế: `taixe1@schoolbus.vn / password`
- Nếu bị lỗi định vị:
  - Mở Windows Settings > Privacy & Security > Location > Bật Location Service
  - Mở Edge/Chrome, cho phép truy cập vị trí
  - Nếu vẫn bị block, mở DevTools (F12) > Sensors > Location > "No override"
  - **Hoặc dùng lệnh sau để mở Edge với quyền định vị đặc biệt:**
    - Nhấn `Win + R` nhập dòng lệnh:
      ```
      "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --unsafely-treat-insecure-origin-as-secure=http://192.168.31.217:3000 --user-data-dir=C:\temp\edge-dev http://192.168.31.217:3000/driver
      ```
    - Edge sẽ mở cửa sổ mới, cho phép định vị trên IP LAN

---

## 3. Test GPS Tracking

- Đăng nhập tài xế trên laptop/Edge (bật định vị)
- Vào Driver Dashboard, chọn chuyến đi hôm nay
- Click "Bắt đầu chuyến đi"
- Kiểm tra GPS gửi vị trí lên backend mỗi 3 giây
- Xác nhận dữ liệu cập nhật realtime trên Firebase Realtime Database

---

## 4. Test Geofence (gần điểm đón)

- Mở DevTools (F12) > Ctrl+Shift+P > gõ "Sensors" > Show Sensors
- Set Location về các điểm đón:
  - Ngã tư Nguyễn Văn Linh: Lat 10.7345, Lng 106.7212
  - Chung cư Sunrise City: Lat 10.7408, Lng 106.7075
- Backend sẽ phát hiện xe gần điểm dừng, emit event `approach_stop`
- Xác nhận log backend và frontend nhận event đúng

---

## 5. Test Delay Alert (chuyến đi trễ)

- Chỉnh giờ khởi hành trong database để giả lập xe trễ >5 phút:

  - Mở phpMyAdmin/MySQL, chạy script bên dưới để test delay alert:

  ### 🧪 Script test delay alert (giả lập xe trễ)

  ```sql
  -- Đặt giờ khởi hành = 10 phút trước để giả lập xe trễ
  UPDATE LichTrinh
  SET gioKhoiHanh = TIME(DATE_SUB(NOW(), INTERVAL 10 MINUTE))
  WHERE maLichTrinh = 1;

  -- Kiểm tra số phút trễ
  SELECT cd.maChuyen, cd.ngayChay, lt.gioKhoiHanh as 'Giờ khởi hành (lịch)',
    cd.gioBatDauThucTe as 'Giờ bắt đầu thực tế', cd.trangThai,
    TIMESTAMPDIFF(MINUTE, TIMESTAMP(cd.ngayChay, lt.gioKhoiHanh), NOW()) as 'Số phút trễ'
  FROM ChuyenDi cd
  JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
  WHERE cd.maChuyen = 22;
  ```

- Backend phát hiện delay, emit event `delay_alert`
- Frontend nhận và hiển thị toast cảnh báo chậm trễ
- Delay alert sẽ gửi lại sau mỗi 3 phút nếu vẫn trễ

---

## 6. Fix các vấn đề phát sinh

- Sửa logic backend để tránh spam delay alert
- Sửa format dữ liệu để FE nhận đúng số phút trễ
- Clear cache khi kết thúc chuyến đi

---

## 7. Reset về trạng thái ban đầu (sau khi test xong)

- Đặt lại giờ khởi hành về đúng lịch:
  ```sql
  UPDATE LichTrinh SET gioKhoiHanh = '06:30:00' WHERE maLichTrinh = 1;
  ```
- Tắt fake GPS (DevTools > Sensors > Location > "No override")

---

## 8. Tổng kết

- Đã hoàn thành toàn bộ luồng test Day 5: GPS tracking, geofence, delay alert, Firebase sync
- Hệ thống hoạt động ổn định, không spam, không lag
- Sẵn sàng cho production!
