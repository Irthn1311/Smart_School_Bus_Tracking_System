-- SSB Database Initialization Script
-- Smart School Bus Tracking System
-- Version: 1.0.0
-- Created: 2025-10-25

-- Create database
-- ⚠️ WARNING: This will drop existing database if it exists!
-- Uncomment the line below if you want to completely recreate the database:
-- DROP DATABASE IF EXISTS school_bus_system;

CREATE DATABASE IF NOT EXISTS school_bus_system;
USE school_bus_system;

-- Drop existing tables if they exist (for clean initialization)
DROP TABLE IF EXISTS temp_student_stop_mapping;
DROP TABLE IF EXISTS HocSinh_DiemDung;
DROP TABLE IF EXISTS student_stop_suggestions;
DROP TABLE IF EXISTS trip_stop_status;
DROP TABLE IF EXISTS schedule_student_stops;
DROP TABLE IF EXISTS TrangThaiHocSinh;
DROP TABLE IF EXISTS SuCo;
DROP TABLE IF EXISTS ThongBao;
DROP TABLE IF EXISTS ChuyenDi;
DROP TABLE IF EXISTS LichTrinh;
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS DiemDung;
DROP TABLE IF EXISTS TuyenDuong;
DROP TABLE IF EXISTS HocSinh;
DROP TABLE IF EXISTS TaiXe;
DROP TABLE IF EXISTS XeBuyt;
DROP TABLE IF EXISTS NguoiDung;

-- Create NguoiDung table (Users)
CREATE TABLE NguoiDung (
    maNguoiDung INT AUTO_INCREMENT PRIMARY KEY,
    hoTen VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    matKhau VARCHAR(255) NOT NULL,
    soDienThoai VARCHAR(15) UNIQUE,
    anhDaiDien VARCHAR(255),
    vaiTro ENUM('quan_tri', 'tai_xe', 'phu_huynh') NOT NULL,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    trangThai BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_vaiTro (vaiTro),
    INDEX idx_trangThai (trangThai)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create TaiXe table (Drivers)
CREATE TABLE TaiXe (
    maTaiXe INT PRIMARY KEY,
    tenTaiXe VARCHAR(100) NOT NULL,
    soBangLai VARCHAR(20) NOT NULL UNIQUE,
    ngayHetHanBangLai DATE,
    soNamKinhNghiem INT DEFAULT 0,
    trangThai ENUM('hoat_dong', 'tam_nghi', 'nghi_huu') DEFAULT 'hoat_dong',
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE,
    INDEX idx_soBangLai (soBangLai),
    INDEX idx_trangThai (trangThai)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create XeBuyt table (Buses)
CREATE TABLE XeBuyt (
    maXe INT AUTO_INCREMENT PRIMARY KEY,
    bienSoXe VARCHAR(15) UNIQUE NOT NULL,
    dongXe VARCHAR(50),
    sucChua INT NOT NULL,
    trangThai ENUM('hoat_dong', 'bao_tri', 'ngung_hoat_dong') DEFAULT 'hoat_dong',
    INDEX idx_bienSoXe (bienSoXe),
    INDEX idx_trangThai (trangThai)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create HocSinh table (Students)
CREATE TABLE HocSinh (
    maHocSinh INT AUTO_INCREMENT PRIMARY KEY,
    hoTen VARCHAR(100) NOT NULL,
    ngaySinh DATE,
    lop VARCHAR(50),
    maPhuHuynh INT,
    diaChi TEXT,
    viDo DECIMAL(9,6) NULL COMMENT 'Latitude (vĩ độ) - được geocode từ diaChi',
    kinhDo DECIMAL(9,6) NULL COMMENT 'Longitude (kinh độ) - được geocode từ diaChi',
    anhDaiDien VARCHAR(255),
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    trangThai BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (maPhuHuynh) REFERENCES NguoiDung(maNguoiDung) ON DELETE SET NULL,
    INDEX idx_maPhuHuynh (maPhuHuynh),
    INDEX idx_lop (lop),
    INDEX idx_trangThai (trangThai),
    INDEX idx_coords (viDo, kinhDo)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create TuyenDuong table (Routes)
CREATE TABLE TuyenDuong (
    maTuyen INT AUTO_INCREMENT PRIMARY KEY,
    tenTuyen VARCHAR(255) NOT NULL,
    diemBatDau VARCHAR(255),
    diemKetThuc VARCHAR(255),
    thoiGianUocTinh INT, -- in minutes

    origin_lat DECIMAL(9, 6),
    origin_lng DECIMAL(9, 6),
    dest_lat DECIMAL(9, 6),
    dest_lng DECIMAL(9, 6),
    
    polyline MEDIUMTEXT,

    -- Tuyến đi/về: 'di' (đi), 've' (về), hoặc NULL (cả hai)
    routeType ENUM('di', 've') DEFAULT NULL,
    -- Liên kết với tuyến đối ứng (tuyến đi <-> tuyến về)
    pairedRouteId INT NULL,
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    trangThai BOOLEAN DEFAULT TRUE,

    -- Foreign key cho pairedRouteId
    CONSTRAINT fk_paired_route FOREIGN KEY (pairedRouteId) REFERENCES TuyenDuong(maTuyen) ON DELETE SET NULL,

    INDEX idx_tenTuyen (tenTuyen),
    INDEX idx_trangThai (trangThai),
    INDEX idx_routeType (routeType),
    INDEX idx_pairedRouteId (pairedRouteId),
    INDEX idx_origin (origin_lat, origin_lng),
    INDEX idx_dest (dest_lat, dest_lng)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create DiemDung table (Stops)
CREATE TABLE DiemDung (
    maDiem INT AUTO_INCREMENT PRIMARY KEY,
    tenDiem VARCHAR(255) NOT NULL,
    -- Bỏ maTuyen, thuTu (điểm dừng không còn gắn cứng vào tuyến).
    -- Chú ý: viDo = LAT, kinhDo = LNG
    viDo DECIMAL(9,6) NOT NULL,      -- latitude
    kinhDo DECIMAL(9,6) NOT NULL,    -- longitude
    address VARCHAR(255) NULL,       -- địa chỉ hiển thị (lấy từ Geocoding/Places)
    scheduled_time TIME NULL,        -- giờ dự kiến dừng (nếu có)

    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Index phục vụ tìm kiếm & hiển thị
    INDEX idx_tenDiem (tenDiem),
    INDEX idx_toaDo (viDo, kinhDo),

    -- (khuyến nghị) Tránh trùng điểm: cùng tên & cùng toạ độ
    UNIQUE KEY uniq_stop_name_coords (tenDiem, viDo, kinhDo)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE route_stops (
    route_id INT NOT NULL,
    stop_id  INT NOT NULL,
    sequence INT NOT NULL,              -- thứ tự dừng trong tuyến (1,2,3,...)
    dwell_seconds INT DEFAULT 30,       -- thời gian dừng dự kiến tại stop

    -- Mỗi tuyến có đúng 1 stop cho mỗi sequence
    PRIMARY KEY (route_id, sequence),

    -- Tránh trùng cùng stop lặp nhiều lần trong 1 tuyến
    UNIQUE KEY uniq_route_stop (route_id, stop_id),

    -- FK
    CONSTRAINT fk_rs_route
      FOREIGN KEY (route_id) REFERENCES TuyenDuong(maTuyen) ON DELETE CASCADE,
    CONSTRAINT fk_rs_stop
      FOREIGN KEY (stop_id)  REFERENCES DiemDung(maDiem)    ON DELETE RESTRICT,

    -- Index phục vụ truy vấn phổ biến
    INDEX idx_route_seq (route_id, sequence),  -- lấy danh sách stop theo thứ tự cực nhanh
    INDEX idx_route_stop (route_id, stop_id),
    INDEX idx_stop (stop_id)

)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create LichTrinh table (Schedules)
CREATE TABLE LichTrinh (
    maLichTrinh INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maXe INT NOT NULL,
    maTaiXe INT NOT NULL,
    loaiChuyen ENUM('don_sang', 'tra_chieu') NOT NULL,
    gioKhoiHanh TIME NOT NULL,
    ngayChay DATE NOT NULL,
    dangApDung BOOLEAN DEFAULT TRUE,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen),
    FOREIGN KEY (maXe) REFERENCES XeBuyt(maXe),
    FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung),
    UNIQUE KEY unique_tuyen_xe_taixe_ngay_gio (maTuyen, maXe, maTaiXe, ngayChay, gioKhoiHanh, loaiChuyen),
    INDEX idx_maTuyen (maTuyen),
    INDEX idx_maXe (maXe),
    INDEX idx_maTaiXe (maTaiXe),
    INDEX idx_loaiChuyen (loaiChuyen),
    INDEX idx_gioKhoiHanh (gioKhoiHanh),
    INDEX idx_ngayChay (ngayChay),
    INDEX idx_dangApDung (dangApDung)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create schedule_student_stops table (Schedule Student Stop Mapping)
CREATE TABLE schedule_student_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maLichTrinh INT NOT NULL,
    maHocSinh INT NOT NULL,
    thuTuDiem INT NOT NULL,              -- Thứ tự điểm dừng (sequence) trong route_stops
    maDiem INT NOT NULL,                 -- Mã điểm dừng cụ thể
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Mỗi học sinh chỉ có 1 điểm dừng trong 1 schedule
    UNIQUE KEY uniq_schedule_student (maLichTrinh, maHocSinh),
    
    -- Foreign keys
    CONSTRAINT fk_sss_schedule
        FOREIGN KEY (maLichTrinh) REFERENCES LichTrinh(maLichTrinh) 
        ON DELETE CASCADE,
    CONSTRAINT fk_sss_student
        FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) 
        ON DELETE CASCADE,
    CONSTRAINT fk_sss_stop
        FOREIGN KEY (maDiem) REFERENCES DiemDung(maDiem) 
        ON DELETE RESTRICT,
    
    -- Indexes
    INDEX idx_schedule (maLichTrinh),
    INDEX idx_student (maHocSinh),
    INDEX idx_stop (maDiem),
    INDEX idx_sequence (maLichTrinh, thuTuDiem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create ChuyenDi table (Trips)
CREATE TABLE ChuyenDi (
    maChuyen INT AUTO_INCREMENT PRIMARY KEY,
    maLichTrinh INT NOT NULL,
    ngayChay DATE NOT NULL,
    trangThai ENUM('chua_khoi_hanh', 'dang_chay', 'hoan_thanh', 'huy') DEFAULT 'chua_khoi_hanh',
    gioBatDauThucTe TIMESTAMP NULL,
    gioKetThucThucTe TIMESTAMP NULL,
    ghiChu TEXT,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maLichTrinh) REFERENCES LichTrinh(maLichTrinh),
    UNIQUE KEY unique_lich_trinh_ngay (maLichTrinh, ngayChay),
    INDEX idx_maLichTrinh (maLichTrinh),
    INDEX idx_ngayChay (ngayChay),
    INDEX idx_trangThai (trangThai),
    INDEX idx_gioBatDau (gioBatDauThucTe)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create TrangThaiHocSinh table (Student Status)
CREATE TABLE TrangThaiHocSinh (
    maTrangThai INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT NOT NULL,
    maHocSinh INT NOT NULL,
    thuTuDiemDon INT,
    trangThai ENUM('cho_don', 'da_don', 'da_tra', 'vang') DEFAULT 'cho_don',
    thoiGianThucTe TIMESTAMP NULL,
    ghiChu VARCHAR(255),
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maChuyen) REFERENCES ChuyenDi(maChuyen) ON DELETE CASCADE,
    FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) ON DELETE CASCADE,
    UNIQUE KEY unique_chuyen_hoc_sinh (maChuyen, maHocSinh),
    INDEX idx_maChuyen (maChuyen),
    INDEX idx_maHocSinh (maHocSinh),
    INDEX idx_trangThai (trangThai),
    INDEX idx_thoiGianThucTe (thoiGianThucTe)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create ThongBao table (Notifications)
CREATE TABLE ThongBao (
    maThongBao INT AUTO_INCREMENT PRIMARY KEY,
    maNguoiNhan INT NOT NULL,
    tieuDe VARCHAR(255),
    noiDung TEXT,
    loaiThongBao ENUM('he_thong', 'chuyen_di', 'su_co', 'thong_bao') DEFAULT 'thong_bao',
    thoiGianGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    daDoc BOOLEAN DEFAULT FALSE,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maNguoiNhan) REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE,
    INDEX idx_maNguoiNhan (maNguoiNhan),
    INDEX idx_loaiThongBao (loaiThongBao),
    INDEX idx_daDoc (daDoc),
    INDEX idx_thoiGianGui (thoiGianGui)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create SuCo table (Incidents)
CREATE TABLE SuCo (
    maSuCo INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT,
    moTa TEXT,
    thoiGianBao DATETIME DEFAULT CURRENT_TIMESTAMP,
    mucDo ENUM('nhe', 'trung_binh', 'nghiem_trong') DEFAULT 'nhe',
    trangThai ENUM('moi', 'dang_xu_ly', 'da_xu_ly') DEFAULT 'moi',
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maChuyen) REFERENCES ChuyenDi(maChuyen) ON DELETE CASCADE,
    INDEX idx_maChuyen (maChuyen),
    INDEX idx_mucDo (mucDo),
    INDEX idx_trangThai (trangThai),
    INDEX idx_thoiGianBao (thoiGianBao)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Minimal indexes for MVP2 performance
CREATE INDEX idx_schedules_driver_time ON LichTrinh(maTaiXe, gioKhoiHanh);
CREATE INDEX idx_schedules_bus_time ON LichTrinh(maXe, gioKhoiHanh);

-- ===========================================================================
-- Bảng lưu thời gian đến/rời từng điểm dừng của mỗi chuyến đi (trip_stop_status)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS trip_stop_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT NOT NULL,
    thuTuDiem INT NOT NULL,                -- Thứ tự điểm dừng (1,2,3...)
    thoiGianDen DATETIME NULL,             -- Thời gian xe đến điểm dừng
    thoiGianRoi DATETIME NULL,             -- Thời gian xe rời điểm dừng
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Mỗi chuyến đi chỉ có 1 record cho mỗi điểm dừng
    UNIQUE KEY uniq_trip_stop (maChuyen, thuTuDiem),
    
    -- Foreign key
    CONSTRAINT fk_tss_chuyen_di
        FOREIGN KEY (maChuyen) REFERENCES ChuyenDi(maChuyen) 
        ON DELETE CASCADE,
    
    -- Index để query nhanh
    INDEX idx_ma_chuyen (maChuyen),
    INDEX idx_thoi_gian_den (thoiGianDen),
    INDEX idx_thoi_gian_roi (thoiGianRoi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE trip_stop_status COMMENT = 'Lưu trạng thái thời gian đến/rời từng điểm dừng trong chuyến đi';

-- ===========================================================================
-- Bảng lưu mapping gợi ý học sinh - điểm dừng cho route (student_stop_suggestions)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS student_stop_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maDiemDung INT NOT NULL,
    maHocSinh INT NOT NULL,
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Cho phép 1 học sinh có nhiều điểm dừng gợi ý trong 1 route (để admin chọn)
    -- Chỉ prevent duplicate exact (maTuyen, maHocSinh, maDiemDung)
    UNIQUE KEY uniq_route_student_stop (maTuyen, maHocSinh, maDiemDung),
    
    -- Foreign keys
    CONSTRAINT fk_student_stop_suggestions_route
        FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) 
        ON DELETE CASCADE,
    CONSTRAINT fk_student_stop_suggestions_stop
        FOREIGN KEY (maDiemDung) REFERENCES DiemDung(maDiem) 
        ON DELETE CASCADE,
    CONSTRAINT fk_student_stop_suggestions_student
        FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) 
        ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_student_stop_suggestions_route (maTuyen),
    INDEX idx_student_stop_suggestions_stop (maDiemDung),
    INDEX idx_student_stop_suggestions_student (maHocSinh),
    INDEX idx_student_stop_suggestions_route_stop (maTuyen, maDiemDung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add comment
ALTER TABLE student_stop_suggestions COMMENT = 'Lưu mapping gợi ý học sinh - điểm dừng cho route (tự động tạo khi tạo route auto)';

-- ===========================================================================
-- Bảng lưu mapping học sinh → điểm dừng độc lập (HocSinh_DiemDung)
-- Phục vụ cho hệ thống tối ưu hóa điểm dừng hai tầng
-- ===========================================================================
CREATE TABLE IF NOT EXISTS HocSinh_DiemDung (
    maHocSinh INT NOT NULL,
    maDiemDung INT NOT NULL,
    khoangCachMet INT COMMENT 'Khoảng cách đi bộ từ nhà đến điểm dừng (mét)',
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (maHocSinh, maDiemDung),
    
    FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) 
        ON DELETE CASCADE,
    FOREIGN KEY (maDiemDung) REFERENCES DiemDung(maDiem) 
        ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_maHocSinh (maHocSinh),
    INDEX idx_maDiemDung (maDiemDung),
    INDEX idx_khoangCach (khoangCachMet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add comment
ALTER TABLE HocSinh_DiemDung COMMENT = 'Mapping học sinh → điểm dừng độc lập (tạo từ Greedy Maximum Coverage algorithm)';

-- Display completion message
SELECT 'Database initialization completed successfully!' as message;
