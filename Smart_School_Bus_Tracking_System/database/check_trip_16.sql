-- Check Trip 16 status
USE school_bus_system;

SELECT 
  c.*,
  l.loaiChuyen,
  t.tenTuyen,
  x.bienSoXe,
  tx.tenTaiXe
FROM ChuyenDi c
LEFT JOIN LichTrinh l ON c.maLichTrinh = l.maLichTrinh
LEFT JOIN TuyenDuong t ON l.maTuyen = t.maTuyen
LEFT JOIN XeBuyt x ON l.maXe = x.maXe
LEFT JOIN TaiXe tx ON l.maTaiXe = tx.maTaiXe
WHERE c.maChuyen = 16;

-- Check if trip already started
SELECT 
  maChuyen,
  trangThai,
  gioBatDauThucTe,
  gioKetThucThucTe
FROM ChuyenDi
WHERE maChuyen = 16;

UPDATE ChuyenDi 
SET 
  trangThai = 'chua_khoi_hanh',
  gioBatDauThucTe = NULL,
  gioKetThucThucTe = NULL
WHERE maChuyen = 16;
