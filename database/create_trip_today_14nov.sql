-- ═══════════════════════════════════════════════════════════════════════════
-- 🚌 TẠO CHUYẾN ĐI HÔM NAY (2025-11-14) - TEST GPS TRACKING
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 HƯỚNG DẪN:
-- 1. Mở phpMyAdmin (XAMPP)
-- 2. Chọn database: school_bus_system
-- 3. Copy toàn bộ script này và Execute
-- 4. Kiểm tra kết quả: SELECT * FROM ChuyenDi WHERE ngayChay = '2025-11-14';
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- ───────────────────────────────────────────────────────────────────────────
-- 🗑️ XÓA DỮ LIỆU CŨ (nếu có)
-- ───────────────────────────────────────────────────────────────────────────

DELETE tth FROM TrangThaiHocSinh tth
INNER JOIN ChuyenDi cd ON tth.maChuyen = cd.maChuyen
WHERE cd.ngayChay = '2025-11-14';

DELETE FROM ChuyenDi WHERE ngayChay = '2025-11-14';

-- ───────────────────────────────────────────────────────────────────────────
-- 🚌 TẠO CHUYẾN ĐI MỚI CHO HÔM NAY (2025-11-14)
-- ───────────────────────────────────────────────────────────────────────────

-- Chuyến 1: Tuyến Quận 7 - Nhà Bè - Đón sáng (Tài xế: Trần Văn Tài - ID: 2)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(1, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 7 - Nhà Bè - Đón sáng - Xe 51A-12345');

-- Chuyến 2: Tuyến Quận 7 - Nhà Bè - Đưa chiều (Tài xế: Trần Văn Tài - ID: 2)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(2, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 7 - Nhà Bè - Đưa chiều - Xe 51A-12345');

-- Chuyến 3: Tuyến Quận 4 - Quận 1 - Đón sáng (Tài xế: Lê Văn Hùng - ID: 3)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(3, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 4 - Quận 1 - Đón sáng - Xe 51B-67890');

-- Chuyến 4: Tuyến Quận 4 - Quận 1 - Đưa chiều (Tài xế: Lê Văn Hùng - ID: 3)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(4, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 4 - Quận 1 - Đưa chiều - Xe 51B-67890');

-- Chuyến 5: Tuyến Quận 1 - Quận 2 - Đón sáng (Tài xế: Hoàng Văn Nam - ID: 4)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(5, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 1 - Quận 2 - Đón sáng - Xe 51C-11111');

-- Chuyến 6: Tuyến Quận 1 - Quận 2 - Đưa chiều (Tài xế: Hoàng Văn Nam - ID: 4)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(6, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 1 - Quận 2 - Đưa chiều - Xe 51C-11111');

-- Chuyến 7: Tuyến Quận 2 - Quận 3 - Đón sáng (Tài xế: Phạm Văn Đức - ID: 5)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(7, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 2 - Quận 3 - Đón sáng - Xe 51D-22222');

-- Chuyến 8: Tuyến Quận 2 - Quận 3 - Đưa chiều (Tài xế: Phạm Văn Đức - ID: 5)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(8, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 2 - Quận 3 - Đưa chiều - Xe 51D-22222');

-- Chuyến 9: Tuyến Quận 3 - Quận 8 - Đón sáng (Tài xế: Võ Thành Long - ID: 6)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(9, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 3 - Quận 8 - Đón sáng - Xe 51E-33333');

-- Chuyến 10: Tuyến Quận 3 - Quận 8 - Đưa chiều (Tài xế: Võ Thành Long - ID: 6)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(10, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 3 - Quận 8 - Đưa chiều - Xe 51E-33333');

-- Chuyến 11: Tuyến Quận 8 - Quận 10 - Đón sáng (Tài xế: Ngô Văn Sơn - ID: 7)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(11, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 8 - Quận 10 - Đón sáng - Xe 51F-44444');

-- Chuyến 12: Tuyến Quận 8 - Quận 10 - Đưa chiều (Tài xế: Ngô Văn Sơn - ID: 7)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(12, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 8 - Quận 10 - Đưa chiều - Xe 51F-44444');

-- Chuyến 13: Tuyến Quận 10 - Quận 11 - Đón sáng (Tài xế: Bùi Văn Kiên - ID: 8)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(13, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Quận 10 - Quận 11 - Đón sáng - Xe 51H-66666');

-- Chuyến 14: Tuyến Quận 10 - Quận 11 - Đưa chiều (Tài xế: Bùi Văn Kiên - ID: 8)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(14, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Quận 10 - Quận 11 - Đưa chiều - Xe 51H-66666');

-- Chuyến 15: Tuyến Nhà Bè - Bình Thạnh - Đón sáng (Tài xế: Lê Văn Hùng - ID: 3)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(15, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Nhà Bè - Bình Thạnh - Đón sáng - Xe 51B-67890');

-- Chuyến 16: Tuyến Nhà Bè - Bình Thạnh - Đưa chiều (Tài xế: Lê Văn Hùng - ID: 3)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(16, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Nhà Bè - Bình Thạnh - Đưa chiều - Xe 51B-67890');

-- Chuyến 17: Tuyến Bình Thạnh - Thủ Đức - Đón sáng (Tài xế: Hoàng Văn Nam - ID: 4)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(17, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Bình Thạnh - Thủ Đức - Đón sáng - Xe 51C-11111');

-- Chuyến 18: Tuyến Bình Thạnh - Thủ Đức - Đưa chiều (Tài xế: Hoàng Văn Nam - ID: 4)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(18, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Bình Thạnh - Thủ Đức - Đưa chiều - Xe 51C-11111');

-- Chuyến 19: Tuyến Thủ Đức - Bình Dương - Đón sáng (Tài xế: Phạm Văn Đức - ID: 5)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(19, '2025-11-14', 'chua_khoi_hanh', '🌅 Tuyến Thủ Đức - Bình Dương - Đón sáng - Xe 51D-22222');

-- Chuyến 20: Tuyến Thủ Đức - Bình Dương - Đưa chiều (Tài xế: Phạm Văn Đức - ID: 5)
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu) VALUES
(20, '2025-11-14', 'chua_khoi_hanh', '🌆 Tuyến Thủ Đức - Bình Dương - Đưa chiều - Xe 51D-22222');

-- ───────────────────────────────────────────────────────────────────────────
-- 📋 TẠO TRẠNG THÁI HỌC SINH CHO TỪNG CHUYẾN ĐI
-- ───────────────────────────────────────────────────────────────────────────

-- Lấy ID của các chuyến đi vừa tạo
SET @chuyen1 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 1 LIMIT 1);
SET @chuyen2 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 2 LIMIT 1);
SET @chuyen3 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 3 LIMIT 1);
SET @chuyen4 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 4 LIMIT 1);
SET @chuyen5 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 5 LIMIT 1);
SET @chuyen6 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 6 LIMIT 1);
SET @chuyen7 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 7 LIMIT 1);
SET @chuyen8 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 8 LIMIT 1);
SET @chuyen9 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 9 LIMIT 1);
SET @chuyen10 = (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14' AND maLichTrinh = 10 LIMIT 1);

-- Trạng thái học sinh cho chuyến 1 (Đón sáng - Tuyến 1)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen1, 1, 1, 'cho_don'),
(@chuyen1, 2, 2, 'cho_don'),
(@chuyen1, 3, 3, 'cho_don'),
(@chuyen1, 4, 4, 'cho_don'),
(@chuyen1, 5, 5, 'cho_don'),
(@chuyen1, 6, 6, 'cho_don'),
(@chuyen1, 7, 7, 'cho_don'),
(@chuyen1, 8, 8, 'cho_don'),
(@chuyen1, 9, 9, 'cho_don'),
(@chuyen1, 10, 10, 'cho_don');

-- Trạng thái học sinh cho chuyến 2 (Đưa chiều - Tuyến 1)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen2, 1, 1, 'cho_don'),
(@chuyen2, 2, 2, 'cho_don'),
(@chuyen2, 3, 3, 'cho_don'),
(@chuyen2, 4, 4, 'cho_don'),
(@chuyen2, 5, 5, 'cho_don'),
(@chuyen2, 6, 6, 'cho_don'),
(@chuyen2, 7, 7, 'cho_don'),
(@chuyen2, 8, 8, 'cho_don'),
(@chuyen2, 9, 9, 'cho_don'),
(@chuyen2, 10, 10, 'cho_don');

-- Trạng thái học sinh cho chuyến 3 (Đón sáng - Tuyến 2)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen3, 11, 1, 'cho_don'),
(@chuyen3, 12, 2, 'cho_don'),
(@chuyen3, 13, 3, 'cho_don'),
(@chuyen3, 14, 4, 'cho_don'),
(@chuyen3, 15, 5, 'cho_don'),
(@chuyen3, 16, 6, 'cho_don'),
(@chuyen3, 17, 7, 'cho_don'),
(@chuyen3, 18, 8, 'cho_don'),
(@chuyen3, 19, 9, 'cho_don'),
(@chuyen3, 20, 10, 'cho_don');

-- Trạng thái học sinh cho chuyến 4 (Đưa chiều - Tuyến 2)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen4, 11, 1, 'cho_don'),
(@chuyen4, 12, 2, 'cho_don'),
(@chuyen4, 13, 3, 'cho_don'),
(@chuyen4, 14, 4, 'cho_don'),
(@chuyen4, 15, 5, 'cho_don'),
(@chuyen4, 16, 6, 'cho_don'),
(@chuyen4, 17, 7, 'cho_don'),
(@chuyen4, 18, 8, 'cho_don'),
(@chuyen4, 19, 9, 'cho_don'),
(@chuyen4, 20, 10, 'cho_don');

-- Trạng thái học sinh cho chuyến 5-10 (tương tự)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
(@chuyen5, 21, 1, 'cho_don'),
(@chuyen5, 22, 2, 'cho_don'),
(@chuyen5, 23, 3, 'cho_don'),
(@chuyen5, 24, 4, 'cho_don'),
(@chuyen5, 25, 5, 'cho_don'),
(@chuyen5, 26, 6, 'cho_don'),
(@chuyen5, 27, 7, 'cho_don'),
(@chuyen5, 28, 8, 'cho_don'),
(@chuyen5, 29, 9, 'cho_don'),

(@chuyen5, 30, 10, 'cho_don');

SELECT '✅ Đã tạo 20 chuyến đi cho ngày 2025-11-14!' as message;
SELECT CONCAT('📊 Tổng số chuyến đi: ', COUNT(*)) as summary FROM ChuyenDi WHERE ngayChay = '2025-11-14';
SELECT CONCAT('📋 Tổng số trạng thái HS: ', COUNT(*)) as summary FROM TrangThaiHocSinh 
WHERE maChuyen IN (SELECT maChuyen FROM ChuyenDi WHERE ngayChay = '2025-11-14');
