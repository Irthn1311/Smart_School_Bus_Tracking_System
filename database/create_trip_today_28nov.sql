-- ═══════════════════════════════════════════════════════════════════════════
-- 🚌 TẠO CHUYẾN ĐI HÔM NAY (2025-11-28) - TEST GPS TRACKING
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 HƯỚNG DẪN:
-- 1. Mở phpMyAdmin (XAMPP)
-- 2. Chọn database: school_bus_system
-- 3. Chạy 01_init_db_ver2.sql TRƯỚC (nếu chưa chạy)
-- 4. Chạy 02_sample_data.sql TRƯỚC (nếu chưa chạy)
-- 5. Copy toàn bộ script này và Execute
-- 6. Kiểm tra kết quả: SELECT * FROM ChuyenDi WHERE ngayChay = '2025-11-28';
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- ───────────────────────────────────────────────────────────────────────────
-- 🗑️ XÓA DỮ LIỆU CŨ (nếu có)
-- ───────────────────────────────────────────────────────────────────────────

DELETE FROM TrangThaiHocSinh WHERE maChuyen IN (
  SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-28'
);

DELETE FROM ChuyenDi WHERE ngayChay = '2025-11-28';

-- Xóa lịch trình ngày hôm nay (nếu có) để tạo lại
DELETE FROM schedule_student_stops WHERE maLichTrinh IN (
  SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-28'
);
DELETE FROM LichTrinh WHERE ngayChay = '2025-11-28';

-- ───────────────────────────────────────────────────────────────────────────
-- 🛣️ TẠO TUYẾN ĐƯỜNG (nếu chưa có)
-- ───────────────────────────────────────────────────────────────────────────

-- Kiểm tra và tạo Tuyến 1 (Chuyến ĐI) nếu chưa tồn tại
INSERT IGNORE INTO TuyenDuong (maTuyen, tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, routeType, trangThai) VALUES
(1, 'Tuyến Quận 7 - Nhà Bè (Đi)', 'Đại học Sài Gòn', 'Lê Văn Việt', 90, 'di', TRUE);

-- Tạo Tuyến 2 (Chuyến VỀ - NGƯỢC LẠI) nếu chưa tồn tại
INSERT IGNORE INTO TuyenDuong (maTuyen, tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, routeType, trangThai) VALUES
(2, 'Tuyến Quận 7 - Nhà Bè (Về)', 'Lê Văn Việt', 'Đại học Sài Gòn', 90, 've', TRUE);

-- ───────────────────────────────────────────────────────────────────────────
-- 📍 CẬP NHẬT TỌA ĐỘ ĐIỂM DỪNG - Dùng tọa độ THẬT từ database
-- ───────────────────────────────────────────────────────────────────────────

-- Cập nhật 4 điểm dừng với tọa độ CHÍNH XÁC từ SQL hiện tại
-- ⚠️ CHÚ Ý MAPPING (tên điểm NGƯỢC LẠI giữa chuyến đi và chuyến về):
-- CHUYẾN ĐI (đón sáng):    Điểm 1 = Đại học SG → Điểm 2 = HTP → Điểm 3 = NVL → Điểm 4 = LVV (trường)
-- CHUYẾN VỀ (trả chiều):   Điểm 1 = LVV (trường) → Điểm 2 = NVL → Điểm 3 = HTP → Điểm 4 = Đại học SG
UPDATE DiemDung SET viDo = 10.759800, kinhDo = 106.676500, tenDiem = 'Đại học Sài Gòn - Cổng Phụ', address = 'Số 4 Nguyễn Văn Cừ, Phường 1, Quận 5, TP.HCM' WHERE maDiem = 1;
UPDATE DiemDung SET viDo = 10.758000, kinhDo = 106.687000, tenDiem = 'Trạm HTP - Tân Thuận Nam', address = 'Huỳnh Tấn Phát, Phường Tân Thuận Nam, Quận 7, TP.HCM' WHERE maDiem = 2;
UPDATE DiemDung SET viDo = 10.761800, kinhDo = 106.690000, tenDiem = 'Trạm NVL - Tân Phong Đông', address = 'Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM' WHERE maDiem = 3;
UPDATE DiemDung SET viDo = 10.768000, kinhDo = 106.691900, tenDiem = 'Trạm LVV - Tân Kiểng Bắc', address = 'Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM' WHERE maDiem = 4;

-- Xóa route_stops cũ và tạo lại với 4 điểm đã cập nhật
DELETE FROM route_stops WHERE route_id IN (1, 2);

-- Xóa route_stops cũ và tạo lại với 4 điểm đã cập nhật
DELETE FROM route_stops WHERE route_id IN (1, 2);

-- Tuyến đi (Chuyến 1): Đại học Sài Gòn - Cổng Phụ → Trạm HTP - Tân Thuận Nam → Trạm NVL - Tân Phong Đông → Trạm LVV - Tân Kiểng Bắc
INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds) VALUES
(1, 1, 1, 60),  -- Điểm 1: Đại học Sài Gòn - Cổng Phụ
(1, 2, 2, 60),  -- Điểm 2: Trạm HTP - Tân Thuận Nam
(1, 3, 3, 60),  -- Điểm 3: Trạm NVL - Tân Phong Đông
(1, 4, 4, 60);  -- Điểm 4: Trạm LVV - Tân Kiểng Bắc

-- Tuyến về (Chuyến 2): Trạm LVV - Tân Kiểng Bắc → Trạm NVL - Tân Phong Đông → Trạm HTP - Tân Thuận Nam → Đại học Sài Gòn - Cổng Phụ
INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds) VALUES
(2, 4, 1, 60),  -- Điểm 1: Trạm LVV - Tân Kiểng Bắc
(2, 3, 2, 60),  -- Điểm 2: Trạm NVL - Tân Phong Đông
(2, 2, 3, 60),  -- Điểm 3: Trạm HTP - Tân Thuận Nam
(2, 1, 4, 60);  -- Điểm 4: Đại học Sài Gòn - Cổng Phụ

-- ───────────────────────────────────────────────────────────────────────────
-- ───────────────────────────────────────────────────────────────────────────
-- 📅 TẠO LỊCH TRÌNH CHO HÔM NAY (2025-11-27)
-- ───────────────────────────────────────────────────────────────────────────

-- Lịch trình 1: Tuyến 1 (Đi) - Đón sáng - Tài xế: Trần Văn Tài (ID: 2) - Xe 51A-12345
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
(1, 1, 2, 'don_sang', '07:00:00', '2025-11-28', TRUE);

-- Lịch trình 2: Tuyến 2 (Về - NGƯỢC LẠI) - Đưa chiều - Tài xế: Trần Văn Tài (ID: 2) - Xe 51A-12345
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
(2, 1, 2, 'tra_chieu', '15:00:00', '2025-11-28', TRUE);

-- Lấy ID của lịch trình vừa tạo
SET @lichTrinh1 = (SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-28' AND loaiChuyen = 'don_sang' AND maTaiXe = 2 LIMIT 1);
SET @lichTrinh2 = (SELECT maLichTrinh FROM LichTrinh WHERE ngayChay = '2025-11-28' AND loaiChuyen = 'tra_chieu' AND maTaiXe = 2 LIMIT 1);
-- ───────────────────────────────────────────────────────────────────────────
-- 🚌 TẠO CHUYẾN ĐI MỚI CHO HÔM NAY (2025-11-27)
-- ───────────────────────────────────────────────────────────────────────────

-- Chuyến 1: Tuyến Quận 7 - Nhà Bè - Đón sáng (Tài xế: Trần Văn Tài - ID: 2) - ⏰ CHƯA BẮT ĐẦU
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(@lichTrinh1, '2025-11-28', 'chua_khoi_hanh', '⏰ Tuyến Quận 7 - Nhà Bè - Đón sáng - Xe 51A-12345 - CHƯA BẮT ĐẦU');

-- Chuyến 2: Tuyến Quận 7 - Nhà Bè - Đưa chiều (Tài xế: Trần Văn Tài - ID: 2) - ⏰ CHƯA BẮT ĐẦU
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(@lichTrinh2, '2025-11-28', 'chua_khoi_hanh', '⏰ Tuyến Quận 7 - Nhà Bè - Đưa chiều - Xe 51A-12345 - CHƯA BẮT ĐẦU');

-- ───────────────────────────────────────────────────────────────────────────
-- 📋 TẠO TRẠNG THÁI HỌC SINH CHO TỪNG CHUYẾN ĐI
-- ───────────────────────────────────────────────────────────────────────────

-- Lấy ID của các chuyến đi vừa tạo
SET @chuyen1 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-28' AND maLichTrinh = @lichTrinh1 LIMIT 1);
SET @chuyen2 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-28' AND maLichTrinh = @lichTrinh2 LIMIT 1);

-- ⏰ Chuyến 1 (Đón sáng - CHƯA BẮT ĐẦU): Học sinh chờ đón
-- 🚌 LOGIC ĐÓN SÁNG: Đón học sinh từ nhà → đưa đến trường
-- Điểm 1 (Đại học SG): Đón 3 học sinh (1,2,3)
-- Điểm 2 (Huỳnh Tấn Phát): Đón 3 học sinh (4,5,6)
-- Điểm 3 (Nguyễn Văn Linh): Đón 4 học sinh (7,8,9,10)
-- Điểm 4 (Lê Văn Việt - TRƯỜNG): Điểm đích (không đón)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
-- Điểm 1: Đại học Sài Gòn - Đón 3 HS
(@chuyen1, 1, 1, 'cho_don'),  -- Nguyễn Gia Bảo
(@chuyen1, 2, 1, 'cho_don'),
(@chuyen1, 3, 1, 'cho_don'),
-- Điểm 2: Trạm Huỳnh Tấn Phát - Đón 3 HS
(@chuyen1, 4, 2, 'cho_don'),
(@chuyen1, 5, 2, 'cho_don'),
(@chuyen1, 6, 2, 'cho_don'),
-- Điểm 3: Trạm Nguyễn Văn Linh - Đón 4 HS
(@chuyen1, 7, 3, 'cho_don'),
(@chuyen1, 8, 3, 'cho_don'),
(@chuyen1, 9, 3, 'cho_don'),
(@chuyen1, 10, 3, 'cho_don');
-- Điểm 4 = Trường: KHÔNG có học sinh đón (chỉ trả xuống)

-- ⏰ Chuyến 2 (Đưa chiều - CHƯA BẮT ĐẦU): Học sinh chờ trả về nhà
-- 🏠 LOGIC ĐƯA CHIỀU: Xuất phát từ trường → trả học sinh về nhà (NGƯỢC LẠI tên điểm)
-- 🔄 TÊN ĐIỂM NGƯỢC LẠI:
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ CHUYẾN ĐI:  Điểm 1(ĐH SG) → Điểm 2(HTP) → Điểm 3(NVL) → Điểm 4(LVV-trường)     │
-- │ CHUYẾN VỀ:  Điểm 1(LVV-trường) → Điểm 2(NVL) → Điểm 3(HTP) → Điểm 4(ĐH SG)     │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- Điểm 1 (Lê Văn Việt - trường): Xuất phát (10 HS lên xe, KHÔNG ghi DB)
-- Điểm 2 (Nguyễn Văn Linh): Trả 4 HS (7,8,9,10) - GIỐNG điểm 3 chuyến đi
-- Điểm 3 (Huỳnh Tấn Phát): Trả 3 HS (4,5,6) - GIỐNG điểm 2 chuyến đi
-- Điểm 4 (Đại học Sài Gòn): Trả 3 HS (1,2,3) - GIỐNG điểm 1 chuyến đi ← ĐIỂM CUỐI
--
-- 💡 Chú ý: Chỉ ghi học sinh được TRẢ, không ghi điểm xuất phát (trường)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
-- Điểm 2 (Nguyễn Văn Linh): Trả 4 HS - GIỐNG điểm 3 chuyến đi
(@chuyen2, 7, 2, 'cho_don'),
(@chuyen2, 8, 2, 'cho_don'),
(@chuyen2, 9, 2, 'cho_don'),
(@chuyen2, 10, 2, 'cho_don'),
-- Điểm 3 (Huỳnh Tấn Phát): Trả 3 HS - GIỐNG điểm 2 chuyến đi
(@chuyen2, 4, 3, 'cho_don'),
(@chuyen2, 5, 3, 'cho_don'),
(@chuyen2, 6, 3, 'cho_don'),
-- Điểm 4 (Đại học Sài Gòn): Trả 3 HS - GIỐNG điểm 1 chuyến đi - ĐIỂM CUỐI
(@chuyen2, 1, 4, 'cho_don'),  -- Nguyễn Gia Bảo
(@chuyen2, 2, 4, 'cho_don'),
(@chuyen2, 3, 4, 'cho_don');

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
