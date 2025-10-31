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
DROP TABLE IF EXISTS TrangThaiHocSinh;
DROP TABLE IF EXISTS SuCo;
DROP TABLE IF EXISTS ThongBao;
DROP TABLE IF EXISTS ChuyenDi;
DROP TABLE IF EXISTS LichTrinh;
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
);

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
);

-- Create XeBuyt table (Buses)
CREATE TABLE XeBuyt (
    maXe INT AUTO_INCREMENT PRIMARY KEY,
    bienSoXe VARCHAR(15) UNIQUE NOT NULL,
    dongXe VARCHAR(50),
    sucChua INT NOT NULL,
    trangThai ENUM('hoat_dong', 'bao_tri', 'ngung_hoat_dong') DEFAULT 'hoat_dong',
    INDEX idx_bienSoXe (bienSoXe),
    INDEX idx_trangThai (trangThai)
);

-- Create HocSinh table (Students)
CREATE TABLE HocSinh (
    maHocSinh INT AUTO_INCREMENT PRIMARY KEY,
    hoTen VARCHAR(100) NOT NULL,
    ngaySinh DATE,
    lop VARCHAR(50),
    maPhuHuynh INT,
    diaChi TEXT,
    anhDaiDien VARCHAR(255),
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    trangThai BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (maPhuHuynh) REFERENCES NguoiDung(maNguoiDung) ON DELETE SET NULL,
    INDEX idx_maPhuHuynh (maPhuHuynh),
    INDEX idx_lop (lop),
    INDEX idx_trangThai (trangThai)
);

-- Create TuyenDuong table (Routes)
CREATE TABLE TuyenDuong (
    maTuyen INT AUTO_INCREMENT PRIMARY KEY,
    tenTuyen VARCHAR(255) NOT NULL,
    diemBatDau VARCHAR(255),
    diemKetThuc VARCHAR(255),
    thoiGianUocTinh INT, -- in minutes
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    trangThai BOOLEAN DEFAULT TRUE,
    INDEX idx_tenTuyen (tenTuyen),
    INDEX idx_trangThai (trangThai)
);

-- Create DiemDung table (Stops)
CREATE TABLE DiemDung (
    maDiem INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    tenDiem VARCHAR(255),
    kinhDo DOUBLE,
    viDo DOUBLE,
    thuTu INT,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) ON DELETE CASCADE,
    INDEX idx_maTuyen (maTuyen),
    INDEX idx_thuTu (thuTu),
    INDEX idx_toaDo (kinhDo, viDo)
);

-- Create LichTrinh table (Schedules)
CREATE TABLE LichTrinh (
    maLichTrinh INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maXe INT NOT NULL,
    maTaiXe INT NOT NULL,
    loaiChuyen ENUM('don_sang', 'tra_chieu') NOT NULL,
    gioKhoiHanh TIME NOT NULL,
    dangApDung BOOLEAN DEFAULT TRUE,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen),
    FOREIGN KEY (maXe) REFERENCES XeBuyt(maXe),
    FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung),
    INDEX idx_maTuyen (maTuyen),
    INDEX idx_maXe (maXe),
    INDEX idx_maTaiXe (maTaiXe),
    INDEX idx_loaiChuyen (loaiChuyen),
    INDEX idx_gioKhoiHanh (gioKhoiHanh),
    INDEX idx_dangApDung (dangApDung)
);

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
);

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
);

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
);

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
);

-- Minimal indexes for MVP2 performance
CREATE INDEX idx_schedules_driver_time ON LichTrinh(maTaiXe, gioKhoiHanh);
CREATE INDEX idx_schedules_bus_time ON LichTrinh(maXe, gioKhoiHanh);

-- Display completion message
SELECT 'Database initialization completed successfully!' as message;
