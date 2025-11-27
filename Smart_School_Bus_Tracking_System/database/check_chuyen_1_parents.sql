-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 QUERY: TÌM PHỤ HUYNH LIÊN QUAN ĐẾN CHUYẾN 1
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- ───────────────────────────────────────────────────────────────────────────
-- 📊 KIỂM TRA CHUYẾN 1 ĐÃ TẠO CHƯA
-- ───────────────────────────────────────────────────────────────────────────

SELECT 
    cd.maChuyen,
    cd.maLichTrinh,
    cd.ngayChay,
    cd.trangThai,
    cd.ghiChu,
    lt.loaiChuyen,
    lt.gioKhoiHanh,
    td.tenTuyen,
    xb.bienSoXe,
    n.hoTen AS tenTaiXe
FROM ChuyenDi cd
JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
JOIN XeBuyt xb ON lt.maXe = xb.maXe
JOIN NguoiDung n ON lt.maTaiXe = n.maNguoiDung
WHERE cd.maLichTrinh = 1 
  AND cd.ngayChay = '2025-11-13'
LIMIT 1;

-- Expected Result:
-- maChuyen | maLichTrinh | ngayChay   | trangThai       | tenTuyen                | bienSoXe  | tenTaiXe
-- ---------|-------------|------------|-----------------|-------------------------|-----------|---------------
-- 1        | 1           | 2025-11-13 | chua_khoi_hanh | Tuyến Quận 7 - Nhà Bè   | 51A-12345 | Trần Văn Tài


-- ───────────────────────────────────────────────────────────────────────────
-- 👨‍👩‍👧 DANH SÁCH HỌC SINH VÀ PHỤ HUYNH TRONG CHUYẾN 1
-- ───────────────────────────────────────────────────────────────────────────

SELECT 
    tth.maTrangThai,
    tth.maChuyen,
    tth.thuTuDiemDon AS 'Stop #',
    tth.trangThai AS trangThaiHS,
    
    h.maHocSinh,
    h.hoTen AS tenHocSinh,
    h.lop,
    h.diaChi AS diaChiHocSinh,
    
    n.maNguoiDung AS maPhuHuynh,
    n.hoTen AS tenPhuHuynh,
    n.email AS emailPhuHuynh,
    n.soDienThoai AS sdtPhuHuynh
    
FROM TrangThaiHocSinh tth
JOIN HocSinh h ON tth.maHocSinh = h.maHocSinh
JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
WHERE tth.maChuyen = (
    SELECT maChuyen 
    FROM ChuyenDi 
    WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13' 
    LIMIT 1
)
ORDER BY tth.thuTuDiemDon;

-- Expected Result (10 rows):
-- Stop # | tenHocSinh        | tenPhuHuynh      | emailPhuHuynh              | Lớp | Địa chỉ
-- -------|-------------------|------------------|----------------------------|-----|---------------------------
-- 1      | Nguyễn Gia Bảo    | Phạm Thu Hương   | phuhuynh1@schoolbus.vn    | 5A  | 123 Nguyễn Văn Linh, Q7
-- 2      | Trần Khánh Linh   | Ngô Đức Anh      | phuhuynh2@schoolbus.vn    | 6B  | 125 Nguyễn Văn Linh, Q7
-- 3      | Lê Quang Huy      | Võ Thị Lan       | phuhuynh3@schoolbus.vn    | 7A  | 456 Huỳnh Tấn Phát, Q7
-- 4      | Phạm Minh Anh     | Lý Thị Mai       | phuhuynh4@schoolbus.vn    | 5B  | 789 Nguyễn Thị Thập, Q7
-- 5      | Ngô Thị Lan       | Đặng Văn Lâm     | phuhuynh5@schoolbus.vn    | 6A  | 321 Lê Văn Việt, Q7
-- 6      | Võ Đức Minh       | Nguyễn Thị Cẩm   | phuhuynh6@schoolbus.vn    | 7B  | 654 Nguyễn Văn Linh, Q7
-- 7      | Hoàng Thị Hoa     | Trần Văn Hải     | phuhuynh7@schoolbus.vn    | 5C  | 987 Huỳnh Tấn Phát, Q7
-- 8      | Lý Văn Đức        | Lê Thị Hoa       | phuhuynh8@schoolbus.vn    | 6C  | 147 Lê Văn Việt, Q7
-- 9      | Trần Thị Mai      | Phạm Văn Tuấn    | phuhuynh9@schoolbus.vn    | 7C  | 258 Nguyễn Thị Thập, Q7
-- 10     | Nguyễn Văn Tùng   | Hoàng Thị Nga    | phuhuynh10@schoolbus.vn   | 5D  | 369 Lê Văn Việt, Q7


-- ───────────────────────────────────────────────────────────────────────────
-- 🎯 RECOMMENDED TEST ACCOUNTS (3 PHỤ HUYNH)
-- ───────────────────────────────────────────────────────────────────────────

-- Option 1: PHỤ HUYNH ĐẦU TIÊN (Stop #1) ⭐ RECOMMENDED
SELECT 
    '⭐ RECOMMENDED' AS note,
    n.maNguoiDung AS maPhuHuynh,
    n.hoTen AS tenPhuHuynh,
    n.email AS emailPhuHuynh,
    'password' AS matKhau,
    n.soDienThoai,
    h.hoTen AS tenCon,
    h.lop,
    tth.thuTuDiemDon AS 'Stop #'
FROM NguoiDung n
JOIN HocSinh h ON n.maNguoiDung = h.maPhuHuynh
JOIN TrangThaiHocSinh tth ON h.maHocSinh = tth.maHocSinh
WHERE n.email = 'phuhuynh1@schoolbus.vn'
  AND tth.maChuyen = (SELECT maChuyen FROM ChuyenDi WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13' LIMIT 1);

-- Expected Result:
-- tenPhuHuynh      | emailPhuHuynh             | matKhau  | tenCon          | Lớp | Stop #
-- -----------------|---------------------------|----------|-----------------|-----|--------
-- Phạm Thu Hương   | phuhuynh1@schoolbus.vn   | password | Nguyễn Gia Bảo | 5A  | 1


-- Option 2: PHỤ HUYNH GIỮA TUYẾN (Stop #5)
SELECT 
    'Alternative Option' AS note,
    n.maNguoiDung AS maPhuHuynh,
    n.hoTen AS tenPhuHuynh,
    n.email AS emailPhuHuynh,
    'password' AS matKhau,
    n.soDienThoai,
    h.hoTen AS tenCon,
    h.lop,
    tth.thuTuDiemDon AS 'Stop #'
FROM NguoiDung n
JOIN HocSinh h ON n.maNguoiDung = h.maPhuHuynh
JOIN TrangThaiHocSinh tth ON h.maHocSinh = tth.maHocSinh
WHERE n.email = 'phuhuynh5@schoolbus.vn'
  AND tth.maChuyen = (SELECT maChuyen FROM ChuyenDi WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13' LIMIT 1);

-- Expected Result:
-- tenPhuHuynh   | emailPhuHuynh             | matKhau  | tenCon      | Lớp | Stop #
-- --------------|---------------------------|----------|-------------|-----|--------
-- Đặng Văn Lâm  | phuhuynh5@schoolbus.vn   | password | Ngô Thị Lan | 6A  | 5


-- Option 3: PHỤ HUYNH CUỐI TUYẾN (Stop #10)
SELECT 
    'Alternative Option' AS note,
    n.maNguoiDung AS maPhuHuynh,
    n.hoTen AS tenPhuHuynh,
    n.email AS emailPhuHuynh,
    'password' AS matKhau,
    n.soDienThoai,
    h.hoTen AS tenCon,
    h.lop,
    tth.thuTuDiemDon AS 'Stop #'
FROM NguoiDung n
JOIN HocSinh h ON n.maNguoiDung = h.maPhuHuynh
JOIN TrangThaiHocSinh tth ON h.maHocSinh = tth.maHocSinh
WHERE n.email = 'phuhuynh10@schoolbus.vn'
  AND tth.maChuyen = (SELECT maChuyen FROM ChuyenDi WHERE maLichTrinh = 1 AND ngayChay = '2025-11-13' LIMIT 1);

-- Expected Result:
-- tenPhuHuynh    | emailPhuHuynh              | matKhau  | tenCon           | Lớp | Stop #
-- ---------------|----------------------------|----------|------------------|-----|--------
-- Hoàng Thị Nga  | phuhuynh10@schoolbus.vn   | password | Nguyễn Văn Tùng | 5D  | 10


-- ───────────────────────────────────────────────────────────────────────────
-- 🚗 KIỂM TRA TÀI XẾ CHUYẾN 1
-- ───────────────────────────────────────────────────────────────────────────

SELECT 
    n.maNguoiDung AS maTaiXe,
    n.hoTen AS tenTaiXe,
    n.email AS emailTaiXe,
    'password' AS matKhau,
    n.soDienThoai,
    tx.soBangLai,
    tx.soNamKinhNghiem,
    xb.bienSoXe,
    xb.dongXe,
    td.tenTuyen
FROM LichTrinh lt
JOIN NguoiDung n ON lt.maTaiXe = n.maNguoiDung
JOIN TaiXe tx ON lt.maTaiXe = tx.maTaiXe
JOIN XeBuyt xb ON lt.maXe = xb.maXe
JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
WHERE lt.maLichTrinh = 1;

-- Expected Result:
-- tenTaiXe        | emailTaiXe              | matKhau  | bienSoXe  | tenTuyen
-- ----------------|-------------------------|----------|-----------|-------------------------
-- Trần Văn Tài    | taixe1@schoolbus.vn    | password | 51A-12345 | Tuyến Quận 7 - Nhà Bè


-- ───────────────────────────────────────────────────────────────────────────
-- ✅ VERIFICATION: KẾT QUẢ MONG ĐỢI
-- ───────────────────────────────────────────────────────────────────────────

-- ✅ 1 chuyến đi (Chuyến 1)
-- ✅ 10 học sinh trong chuyến
-- ✅ 10 phụ huynh sẽ nhận notification
-- ✅ 1 tài xế (Trần Văn Tài)
-- ✅ 1 xe buýt (51A-12345)
-- ✅ 1 tuyến đường (Tuyến Quận 7 - Nhà Bè)

SELECT '✅ Query completed! Use the accounts above to test.' AS result;
