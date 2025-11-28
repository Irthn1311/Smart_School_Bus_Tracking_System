-- Script để kiểm tra và xóa duplicate trong student_stop_suggestions
-- Chạy script này để fix vấn đề hiển thị sai số lượng học sinh

USE school_bus_system;

-- Bước 1: Kiểm tra duplicate
SELECT 
    maTuyen,
    maDiemDung,
    maHocSinh,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id ORDER BY id) as record_ids
FROM student_stop_suggestions
GROUP BY maTuyen, maDiemDung, maHocSinh
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, maTuyen, maDiemDung;

-- Bước 2: Xóa duplicate (giữ lại record mới nhất - id lớn nhất)
-- LƯU Ý: Chạy Bước 1 trước để xem có bao nhiêu duplicate
DELETE s1 FROM student_stop_suggestions s1
INNER JOIN student_stop_suggestions s2 
WHERE s1.maTuyen = s2.maTuyen 
  AND s1.maDiemDung = s2.maDiemDung 
  AND s1.maHocSinh = s2.maHocSinh
  AND s1.id < s2.id;

-- Bước 3: Verify - Kiểm tra lại xem còn duplicate không
SELECT 
    maTuyen,
    maDiemDung,
    maHocSinh,
    COUNT(*) as count
FROM student_stop_suggestions
GROUP BY maTuyen, maDiemDung, maHocSinh
HAVING COUNT(*) > 1;

-- Nếu query trên trả về 0 rows, nghĩa là đã xóa hết duplicate

-- Bước 4: Kiểm tra unique constraint đã có chưa
-- (Đã có trong 01_init_db_ver2.sql: UNIQUE KEY uniq_route_student_stop)
-- Nếu chưa có, thêm constraint:
-- ALTER TABLE student_stop_suggestions 
-- ADD UNIQUE KEY uniq_route_student_stop (maTuyen, maHocSinh, maDiemDung);

