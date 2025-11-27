-- Kiểm tra Trip 32
USE school_bus_system;

-- Kiểm tra trip 32 có tồn tại không
SELECT 
    cd.maChuyen,
    cd.maLichTrinh,
    cd.ngayChay,
    cd.trangThai,
    cd.gioBatDauThucTe,
    cd.gioKetThucThucTe,
    cd.ghiChu,
    lt.loaiChuyen,
    lt.gioKhoiHanh,
    lt.maTuyen,
    lt.maXe,
    lt.maTaiXe
FROM ChuyenDi cd
LEFT JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
WHERE cd.maChuyen = 32;

-- Kiểm tra học sinh trong trip 32
SELECT 
    tts.maChuyen,
    tts.maHocSinh,
    hs.hoTen as tenHocSinh,
    hs.maPhuHuynh,
    ph.hoTen as tenPhuHuynh,
    ph.email as emailPhuHuynh,
    tts.trangThai
FROM TrangThaiHocSinh tts
LEFT JOIN HocSinh hs ON tts.maHocSinh = hs.maHocSinh
LEFT JOIN NguoiDung ph ON hs.maPhuHuynh = ph.maNguoiDung
WHERE tts.maChuyen = 32;

-- Kiểm tra tất cả trips hôm nay
SELECT 
    maChuyen,
    maLichTrinh,
    trangThai,
    gioBatDauThucTe,
    ghiChu
FROM ChuyenDi 
WHERE ngayChay = '2025-11-13'
ORDER BY maChuyen;
