-- ═══════════════════════════════════════════════════════════════════════════
-- 🚌 TẠO CHUYẾN ĐI HÔM NAY (2025-11-27) - TEST GPS TRACKING
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 HƯỚNG DẪN:
-- 1. Mở phpMyAdmin (XAMPP)
-- 2. Chọn database: school_bus_system
-- 3. Chạy 01_init_db_ver2.sql TRƯỚC (nếu chưa chạy)
-- 4. Chạy 02_sample_data.sql TRƯỚC (nếu chưa chạy)
-- 5. Copy toàn bộ script này và Execute
-- 6. Kiểm tra kết quả: SELECT * FROM ChuyenDi WHERE ngayChay = '2025-11-27';
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- ───────────────────────────────────────────────────────────────────────────
-- 🗑️ XÓA DỮ LIỆU CŨ (nếu có)
-- ───────────────────────────────────────────────────────────────────────────

DELETE FROM TrangThaiHocSinh WHERE maChuyen IN (
  SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-27'
);

DELETE FROM ChuyenDi WHERE ngayChay = '2025-11-27';

-- Xóa lịch trình ngày hôm nay (nếu có) để tạo lại
DELETE FROM schedule_student_stops WHERE maLichTrinh IN (
  SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-27'
);
DELETE FROM LichTrinh WHERE ngayChay = '2025-11-27';

-- ───────────────────────────────────────────────────────────────────────────
-- 🛣️ TẠO TUYẾN ĐƯỜNG (nếu chưa có)
-- ───────────────────────────────────────────────────────────────────────────

-- Kiểm tra và tạo Tuyến 1 nếu chưa tồn tại
INSERT IGNORE INTO TuyenDuong (maTuyen, tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, routeType, trangThai) VALUES
(1, 'Tuyến Quận 7 - Nhà Bè', 'Quận 7', 'Nhà Bè', 90, 'di', TRUE);

-- ───────────────────────────────────────────────────────────────────────────
-- 📍 CẬP NHẬT TỌA ĐỘ ĐIỂM DỪNG - Dùng tọa độ THẬT từ database
-- ───────────────────────────────────────────────────────────────────────────

-- Cập nhật 4 điểm dừng với tọa độ CHÍNH XÁC từ SQL hiện tại
UPDATE DiemDung SET viDo = 10.760240, kinhDo = 106.680724, tenDiem = 'Đại học Sài Gòn', address = '273 An Dương Vương, Phường 3, Quận 5, TP.HCM' WHERE maDiem = 1;
UPDATE DiemDung SET viDo = 10.761120, kinhDo = 106.684360, tenDiem = 'Trạm Nguyễn Văn Linh - Tân Phong', address = 'Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM' WHERE maDiem = 2;
UPDATE DiemDung SET viDo = 10.762440, kinhDo = 106.688040, tenDiem = 'Trạm Huỳnh Tấn Phát - Tân Thuận', address = 'Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM' WHERE maDiem = 3;
UPDATE DiemDung SET viDo = 10.763800, kinhDo = 106.691680, tenDiem = 'Trạm Lê Văn Việt - Tân Kiểng', address = 'Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM' WHERE maDiem = 4;

-- Xóa route_stops cũ và tạo lại với 4 điểm đã cập nhật
DELETE FROM route_stops WHERE route_id = 1;

-- Gán điểm dừng cho Tuyến 1 (sequence: thứ tự đi qua)
INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds) VALUES
(1, 1, 1, 60),  -- Đại học Sài Gòn: dừng 60s
(1, 2, 2, 60),  -- Trạm Nguyễn Văn Linh: dừng 60s
(1, 3, 3, 60),  -- Trạm Huỳnh Tấn Phát: dừng 60s
(1, 4, 4, 60);  -- Trạm Lê Văn Việt: điểm cuối

-- ───────────────────────────────────────────────────────────────────────────
-- ───────────────────────────────────────────────────────────────────────────
-- 📅 TẠO LỊCH TRÌNH CHO HÔM NAY (2025-11-27)
-- ───────────────────────────────────────────────────────────────────────────

-- Lịch trình 1: Tuyến 1 (Quận 7 - Nhà Bè) - Đón sáng - Tài xế: Trần Văn Tài (ID: 2) - Xe 51A-12345
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
(1, 1, 2, 'don_sang', '07:00:00', '2025-11-27', TRUE);

-- Lịch trình 2: Tuyến 1 (Quận 7 - Nhà Bè) - Đưa chiều - Tài xế: Trần Văn Tài (ID: 2) - Xe 51A-12345
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
(1, 1, 2, 'tra_chieu', '15:00:00', '2025-11-27', TRUE);

-- Lấy ID của lịch trình vừa tạo
SET @lichTrinh1 = (SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-27' AND loaiChuyen = 'don_sang' AND maTaiXe = 2 LIMIT 1);
SET @lichTrinh2 = (SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-27' AND loaiChuyen = 'tra_chieu' AND maTaiXe = 2 LIMIT 1);
-- ───────────────────────────────────────────────────────────────────────────
-- 🚌 TẠO CHUYẾN ĐI MỚI CHO HÔM NAY (2025-11-27)
-- ───────────────────────────────────────────────────────────────────────────

-- Chuyến 1: Tuyến Quận 7 - Nhà Bè - Đón sáng (Tài xế: Trần Văn Tài - ID: 2) - ⏰ CHƯA BẮT ĐẦU
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(@lichTrinh1, '2025-11-27', 'chua_khoi_hanh', '⏰ Tuyến Quận 7 - Nhà Bè - Đón sáng - Xe 51A-12345 - CHƯA BẮT ĐẦU');

-- Chuyến 2: Tuyến Quận 7 - Nhà Bè - Đưa chiều (Tài xế: Trần Văn Tài - ID: 2) - ⏰ CHƯA BẮT ĐẦU
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(@lichTrinh2, '2025-11-27', 'chua_khoi_hanh', '⏰ Tuyến Quận 7 - Nhà Bè - Đưa chiều - Xe 51A-12345 - CHƯA BẮT ĐẦU');

-- ───────────────────────────────────────────────────────────────────────────
-- 📋 TẠO TRẠNG THÁI HỌC SINH CHO TỪNG CHUYẾN ĐI
-- ───────────────────────────────────────────────────────────────────────────

-- Lấy ID của các chuyến đi vừa tạo
SET @chuyen1 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-27' AND maLichTrinh = @lichTrinh1 LIMIT 1);
SET @chuyen2 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-27' AND maLichTrinh = @lichTrinh2 LIMIT 1);

-- ⏰ Chuyến 1 (Đón sáng - CHƯA BẮT ĐẦU): Học sinh chờ đón
-- 🚌 LOGIC ĐÓN SÁNG: Đón học sinh từ nhà → đưa đến trường
-- Điểm 1 (sequence=1): Đón 3 học sinh (1, 2, 3)
-- Điểm 2 (sequence=2): Đón 3 học sinh (4, 5, 6)
-- Điểm 3 (sequence=3): Đón 4 học sinh (7, 8, 9, 10)
-- Điểm 4 (sequence=4): TRƯỜNG - Điểm đích (KHÔNG ĐÓN, chỉ TRẢ)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen1, 1, 1, 'cho_don'),  -- Nguyễn Gia Bảo - Điểm 1
(@chuyen1, 2, 1, 'cho_don'),  -- Điểm 1
(@chuyen1, 3, 1, 'cho_don'),  -- Điểm 1
(@chuyen1, 4, 2, 'cho_don'),  -- Điểm 2
(@chuyen1, 5, 2, 'cho_don'),  -- Điểm 2
(@chuyen1, 6, 2, 'cho_don'),  -- Điểm 2
(@chuyen1, 7, 3, 'cho_don'),  -- Điểm 3
(@chuyen1, 8, 3, 'cho_don'),  -- Điểm 3
(@chuyen1, 9, 3, 'cho_don'),  -- Điểm 3
(@chuyen1, 10, 3, 'cho_don'); -- Điểm 3
-- Điểm 4 = Trường: KHÔNG có học sinh đón (chỉ trả xuống)

-- ⏰ Chuyến 2 (Đưa chiều - CHƯA BẮT ĐẦU): Học sinh chờ trả về nhà
-- 🏠 LOGIC ĐƯA CHIỀU: Xuất phát từ trường → trả học sinh về nhà
-- Điểm 1 (sequence=1): TRƯỜNG - Điểm xuất phát (10 học sinh LÊN XE, không đón thêm)
-- Điểm 2 (sequence=2): Trả 4 học sinh (7, 8, 9, 10)
-- Điểm 3 (sequence=3): Trả 3 học sinh (4, 5, 6)
-- Điểm 4 (sequence=4): Trả 3 học sinh (1, 2, 3)
-- 💡 Chú ý: Chuyến chiều, học sinh KHÔNG có trạng thái "cho_don", mà là "tren_xe" ngay từ đầu
-- Nhưng để đơn giản test, ta dùng "cho_don" và thuTuDiemDon để map điểm trả
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen2, 7, 2, 'cho_don'),  -- Trả tại Điểm 2
(@chuyen2, 8, 2, 'cho_don'),  -- Trả tại Điểm 2
(@chuyen2, 9, 2, 'cho_don'),  -- Trả tại Điểm 2
(@chuyen2, 10, 2, 'cho_don'), -- Trả tại Điểm 2
(@chuyen2, 4, 3, 'cho_don'),  -- Trả tại Điểm 3
(@chuyen2, 5, 3, 'cho_don'),  -- Trả tại Điểm 3
(@chuyen2, 6, 3, 'cho_don'),  -- Trả tại Điểm 3
(@chuyen2, 1, 4, 'cho_don'),  -- Nguyễn Gia Bảo - Trả tại Điểm 4
(@chuyen2, 2, 4, 'cho_don'),  -- Trả tại Điểm 4
(@chuyen2, 3, 4, 'cho_don');  -- Trả tại Điểm 4

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ HOÀN THÀNH - KIỂM TRA KẾT QUẢ
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '✅ Đã tạo 2 chuyến đi cho tài xế Trần Văn Tài (ID: 2) - ngày 2025-11-27!' as message;
SELECT '⏰ Chuyến 1: CHƯA BẮT ĐẦU (10 học sinh chờ đón - sáng)' as detail_1;
SELECT '⏰ Chuyến 2: CHƯA BẮT ĐẦU (10 học sinh chờ đón - chiều)' as detail_2;
SELECT '👨‍🎓 Học sinh test: Nguyễn Gia Bảo (ID: 1) - Phụ huynh: Phạm Thu Hương (ID: 9)' as student_info;
SELECT '📍 Đã cập nhật tọa độ 4 điểm dừng với dữ liệu THẬT từ database' as coordinates_updated;
SELECT CONCAT('📊 Tổng số chuyến đi: ', COUNT(*)) as summary FROM ChuyenDi WHERE ngayChay = '2025-11-27';
SELECT CONCAT('📋 Tổng số trạng thái HS: ', COUNT(*)) as summary FROM TrangThaiHocSinh 
WHERE maChuyen IN (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-27');

-- Hiển thị tọa độ 4 điểm dừng đã cập nhật
SELECT '📍 TỌA ĐỘ CÁC ĐIỂM DỪNG:' as title;
SELECT maDiem, tenDiem, viDo, kinhDo, address FROM DiemDung WHERE maDiem IN (1,2,3,4) ORDER BY maDiem;
