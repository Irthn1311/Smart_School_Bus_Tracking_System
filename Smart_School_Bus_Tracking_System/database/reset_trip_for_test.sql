-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 RESET TRIP VỀ TRẠNG THÁI CHƯA KHỞI HÀNH ĐỂ TEST LẠI
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 MỤC ĐÍCH:
-- - Reset tất cả trip hôm nay về trạng thái "chua_khoi_hanh" để test lại notification
-- - Reset thời gian bắt đầu/kết thúc về NULL
-- - Reset trạng thái học sinh về "cho_don"
-- - Xóa notifications cũ để tránh duplicate
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- 1️⃣ Reset tất cả trip hôm nay về trạng thái chưa khởi hành
UPDATE ChuyenDi 
SET 
    trangThai = 'chua_khoi_hanh',
    gioBatDauThucTe = NULL,
    gioKetThucThucTe = NULL
WHERE ngayChay = CURDATE();

-- 2️⃣ Reset trạng thái học sinh về "cho_don" cho tất cả trip hôm nay
UPDATE TrangThaiHocSinh tts
JOIN ChuyenDi cd ON tts.maChuyen = cd.maChuyen
SET tts.trangThai = 'cho_don',
    tts.thoiGianThucTe = NULL,
    tts.ghiChu = NULL
WHERE cd.ngayChay = CURDATE();

-- 3️⃣ Xóa notifications cũ của hôm nay (optional - để tránh duplicate)
DELETE FROM ThongBao 
WHERE DATE(thoiGianGui) = CURDATE()
  AND (noiDung LIKE '%Chuyến đi đã bắt đầu%' 
    OR noiDung LIKE '%Chuyến đi đã hoàn thành%'
    OR noiDung LIKE '%đã lên xe%'
    OR noiDung LIKE '%đã đến nơi%');

-- ✅ Kiểm tra kết quả
SELECT 
    maChuyen,
    trangThai,
    gioBatDauThucTe,
    gioKetThucThucTe,
    ngayChay
FROM ChuyenDi 
WHERE ngayChay = CURDATE()
ORDER BY maChuyen;

SELECT 
    tts.maChuyen,
    COUNT(*) as soHocSinh,
    SUM(CASE WHEN tts.trangThai = 'cho_don' THEN 1 ELSE 0 END) as cho_don,
    SUM(CASE WHEN tts.trangThai = 'da_don' THEN 1 ELSE 0 END) as da_don,
    SUM(CASE WHEN tts.trangThai = 'da_tra' THEN 1 ELSE 0 END) as da_tra
FROM TrangThaiHocSinh tts
JOIN ChuyenDi cd ON tts.maChuyen = cd.maChuyen
WHERE cd.ngayChay = CURDATE()
GROUP BY tts.maChuyen;

SELECT CONCAT('✅ Đã reset ', COUNT(*), ' trip hôm nay (', CURDATE(), ')!') as message
FROM ChuyenDi 
WHERE ngayChay = CURDATE();

