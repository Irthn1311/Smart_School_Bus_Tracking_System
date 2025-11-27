-- ════════════════════════════════════════════════
-- 🔄 CẬP NHẬT SCHEDULE CHO NGÀY HÔM NAY (CURDATE)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- 📝 MỤC ĐÍCH:
-- - Cập nhật tất cả schedule có ngayChay = '2025-11-12' thành ngày hôm nay
-- - Hoặc tạo schedule mới cho ngày hôm nay dựa trên schedule mẫu
-- - Đảm bảo có schedule cho ngày hôm nay để query tìm được
--
-- ═══════════════════════════════════════════════════════════════════════════

USE school_bus_system;

-- ───────────────────────────────────────────────────────────────────────────
-- 🔄 CÁCH 1: Cập nhật schedule cũ thành ngày hôm nay
-- ───────────────────────────────────────────────────────────────────────────

-- Cập nhật tất cả schedule có ngayChay = '2025-11-12' thành ngày hôm nay
UPDATE LichTrinh 
SET ngayChay = CURDATE()
WHERE ngayChay = '2025-11-12';

-- ───────────────────────────────────────────────────────────────────────────
-- 🔄 CÁCH 2: Tạo schedule mới cho ngày hôm nay (nếu muốn giữ schedule cũ)
-- ───────────────────────────────────────────────────────────────────────────
-- Uncomment phần này nếu muốn tạo schedule mới thay vì cập nhật

/*
-- Lấy schedule mẫu từ ngày 2025-11-12 và tạo bản sao cho ngày hôm nay
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung)
SELECT maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, CURDATE(), dangApDung
FROM LichTrinh
WHERE ngayChay = '2025-11-12'
  AND NOT EXISTS (
    SELECT 1 FROM LichTrinh lt2 
    WHERE lt2.maTuyen = LichTrinh.maTuyen 
      AND lt2.maXe = LichTrinh.maXe 
      AND lt2.maTaiXe = LichTrinh.maTaiXe 
      AND lt2.loaiChuyen = LichTrinh.loaiChuyen 
      AND lt2.gioKhoiHanh = LichTrinh.gioKhoiHanh
      AND lt2.ngayChay = CURDATE()
  );
*/

-- ───────────────────────────────────────────────────────────────────────────
-- ✅ KIỂM TRA KẾT QUẢ
-- ───────────────────────────────────────────────────────────────────────────

SELECT 
    '📊 Tổng số schedule hôm nay:' as info,
    COUNT(*) as total
FROM LichTrinh 
WHERE ngayChay = CURDATE();

SELECT 
    maLichTrinh,
    maTuyen,
    maXe,
    maTaiXe,
    loaiChuyen,
    gioKhoiHanh,
    ngayChay,
    dangApDung
FROM LichTrinh 
WHERE ngayChay = CURDATE()
ORDER BY loaiChuyen, gioKhoiHanh
LIMIT 10;

SELECT '✅ Đã cập nhật schedule cho ngày hôm nay!' as message;

