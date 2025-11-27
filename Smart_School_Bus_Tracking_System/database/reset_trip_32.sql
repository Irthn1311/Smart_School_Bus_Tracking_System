-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 RESET TRIP 32 VỀ TRẠNG THÁI CHƯA KHỞI HÀNH
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 MỤC ĐÍCH:
-- - Reset trip 32 về trạng thái "chua_khoi_hanh" để test lại notification
-- - Reset thời gian bắt đầu/kết thúc về NULL
-- - Reset trạng thái học sinh về "cho_don"
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- 1️⃣ Reset trạng thái chuyến đi
UPDATE ChuyenDi 
SET 
    trangThai = 'chua_khoi_hanh',
    gioBatDauThucTe = NULL,
    gioKetThucThucTe = NULL
WHERE maChuyen = 32;

-- 2️⃣ Reset trạng thái học sinh
UPDATE TrangThaiHocSinh 
SET 
    trangThai = 'cho_don'
WHERE maChuyen = 32;

-- 3️⃣ Xóa notifications cũ của trip 32 (optional - để tránh duplicate)
DELETE FROM ThongBao 
WHERE noiDung LIKE '%Chuyến đi đã bắt đầu%' 
  AND noiDung LIKE '%Xe buýt 51A-12345%'
  AND thoiGianGui >= '2025-11-13 12:00:00';

-- ✅ Kiểm tra kết quả
SELECT 
    maChuyen,
    trangThai,
    gioBatDauThucTe,
    gioKetThucThucTe
FROM ChuyenDi 
WHERE maChuyen = 32;

SELECT 
    maChuyen,
    maHocSinh,
    trangThai
FROM TrangThaiHocSinh 
WHERE maChuyen = 32
LIMIT 3;

SELECT '✅ Trip 32 đã được reset về trạng thái chua_khoi_hanh!' as message;
