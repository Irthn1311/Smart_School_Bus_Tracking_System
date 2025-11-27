-- ═══════════════════════════════════════════════════════════════════════════
-- 🚌 CREATE TRIPS & STUDENT STATUS FOR A GIVEN DATE (SAFE VERSION)
--  - Không hardcode maLichTrinh, maChuyen
--  - Tạo ChuyenDi từ LichTrinh
--  - Gán học sinh vào chuyến dựa trên schedule_student_stops (nếu có)
--  - Nếu chưa có LichTrinh hoặc schedule_student_stops thì chỉ không insert, KHÔNG lỗi
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- Force UTF-8 session to avoid collation conflicts
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
SET collation_connection = 'utf8mb4_0900_ai_ci';
-- 📌 NGÀY CẦN TẠO CHUYẾN
-- Use today by default to match UI date range
SET @target_date := CURDATE();

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ TẠO CÁC CHUYẾN ĐI (ChuyenDi) TỪ LICH_TRINH TRONG NGÀY @target_date
--    - Mỗi LichTrinh trong ngày mà CHƯA có ChuyenDi -> tạo 1 dòng
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, ghiChu)
SELECT 
    lt.maLichTrinh,
    @target_date AS ngayChay,
    'chua_khoi_hanh' AS trangThai,
    CONCAT('Auto trip for schedule #', lt.maLichTrinh, ' - ', lt.loaiChuyen) AS ghiChu
FROM LichTrinh lt
LEFT JOIN ChuyenDi cd
    ON cd.maLichTrinh = lt.maLichTrinh
   AND DATE(cd.ngayChay)    = @target_date
WHERE DATE(lt.ngayChay) = @target_date
  AND cd.maChuyen IS NULL;

-- Thông tin kiểm tra số chuyến vừa tạo
SELECT 
    @target_date AS ngayChay,
    COUNT(*) AS soChuyenTrongNgay
FROM ChuyenDi
WHERE DATE(ngayChay) = @target_date;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ GÁN HỌC SINH VÀO CHUYẾN (TrangThaiHocSinh) DỰA TRÊN schedule_student_stops
--    - Giả sử: schedule_student_stops.maLichTrinh đã mapping học sinh -> điểm dừng
--    - Mỗi học sinh trong 1 lịch trình -> 1 dòng TrangThaiHocSinh cho chuyến tương ứng
--    - Nếu schedule_student_stops trống -> không insert gì, không lỗi
-- ═══════════════════════════════════════════════════════════════════════════

-- Gán cho tất cả chuyến trong ngày (cả đón sáng & trả chiều)
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu)
SELECT 
    cd.maChuyen,
    sss.maHocSinh,
    sss.thuTuDiem AS thuTuDiemDon,
    'cho_don' AS trangThai,
    NULL AS thoiGianThucTe,
    NULL AS ghiChu
FROM ChuyenDi cd
JOIN LichTrinh lt 
    ON lt.maLichTrinh = cd.maLichTrinh
JOIN schedule_student_stops sss
    ON sss.maLichTrinh = lt.maLichTrinh
WHERE DATE(cd.ngayChay) = @target_date
-- Tránh insert trùng nếu đã có sẵn
ON DUPLICATE KEY UPDATE
    thuTuDiemDon    = VALUES(thuTuDiemDon),
    trangThai       = VALUES(trangThai),
    thoiGianThucTe  = VALUES(thoiGianThucTe),
    ghiChu          = VALUES(ghiChu),
    ngayCapNhat     = CURRENT_TIMESTAMP;

-- Thông tin kiểm tra số record trạng thái học sinh
SELECT 
    cd.ngayChay,
    COUNT(DISTINCT tths.maHocSinh) AS soHocSinhTrongNgay,
    COUNT(*) AS tongRecordTrangThai
FROM TrangThaiHocSinh tths
JOIN ChuyenDi cd ON cd.maChuyen = tths.maChuyen
WHERE DATE(cd.ngayChay) = @target_date
GROUP BY cd.ngayChay;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ TRUY VẤN KIỂM TRA CHI TIẾT
-- ═══════════════════════════════════════════════════════════════════════════

-- Danh sách chuyến trong ngày + thông tin tuyến/xe/tài xế
SELECT 
  c.maChuyen,
  c.ngayChay,
  c.trangThai,
  l.maLichTrinh,
  l.loaiChuyen,
  t.tenTuyen,
  x.bienSoXe,
  tx.tenTaiXe
FROM ChuyenDi c
JOIN LichTrinh l ON c.maLichTrinh = l.maLichTrinh
JOIN TuyenDuong t ON l.maTuyen = t.maTuyen
JOIN XeBuyt x ON l.maXe = x.maXe
JOIN TaiXe tx ON l.maTaiXe = tx.maTaiXe
WHERE DATE(c.ngayChay) = @target_date
ORDER BY c.maChuyen;

-- Ensure message uses UTF8 collation to avoid mix errors
SELECT CONVERT(CONCAT('✅ Trips & student statuses for ', @target_date, ' processed successfully!') USING utf8mb4) AS message;
