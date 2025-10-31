-- SSB Sample Data Script
-- Smart School Bus Tracking System
-- Version: 1.0.0
-- Created: 2025-10-25

-- ⚠️ IMPORTANT: Run init_db.sql FIRST before running this script!
-- This script inserts sample data and requires the database schema to be created first.
-- If you get "Unknown column 'hoTen'" error, it means the schema doesn't match.
-- Solution: Run init_db.sql first to recreate the database schema.

USE school_bus_system;

-- Verify that the NguoiDung table has the correct schema
-- If this query fails, you need to run init_db.sql first
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'school_bus_system' AND TABLE_NAME = 'NguoiDung' AND COLUMN_NAME = 'hoTen';

-- Insert sample users
INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Minh Quân', 'quantri@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000001', 'quan_tri'),
('Trần Văn Tài', 'taixe1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000002', 'tai_xe'),
('Lê Văn Hùng', 'taixe2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000003', 'tai_xe'),
('Phạm Thu Hương', 'phuhuynh1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000004', 'phu_huynh'),
('Ngô Đức Anh', 'phuhuynh2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000005', 'phu_huynh'),
('Võ Thị Lan', 'phuhuynh3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000006', 'phu_huynh'),
('Hoàng Văn Nam', 'taixe3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000007', 'tai_xe'),
('Lý Thị Mai', 'phuhuynh4@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000008', 'phu_huynh');

-- Insert sample drivers
INSERT INTO TaiXe (maTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(2, 'B2-123456789', '2028-05-20', 5, 'hoat_dong'),
(3, 'B2-987654321', '2027-12-31', 8, 'hoat_dong'),
(7, 'B2-456789123', '2029-03-15', 3, 'hoat_dong');

-- Insert sample buses
INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) VALUES
('51A-12345', 'Hyundai County', 30, 'hoat_dong'),
('51B-67890', 'Thaco Town', 28, 'hoat_dong'),
('51C-11111', 'Isuzu NPR', 35, 'hoat_dong'),
('51D-22222', 'Hyundai County', 30, 'bao_tri'),
('51E-33333', 'Thaco Town', 28, 'hoat_dong'),
('51F-44444', 'Isuzu NPR', 35, 'hoat_dong'),
('51G-55555', 'Hyundai County', 30, 'hoat_dong'),
('51H-66666', 'Thaco Town', 28, 'ngung_hoat_dong');

-- Insert sample students
INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi) VALUES
('Nguyễn Gia Bảo', '2015-06-15', '5A', 4, '123 Nguyễn Văn Linh, Quận 7'),
('Trần Khánh Linh', '2014-11-02', '6B', 4, '456 Huỳnh Tấn Phát, Quận 7'),
('Lê Quang Huy', '2013-08-20', '7A', 5, '12 Lê Văn Lương, Nhà Bè'),
('Phạm Minh Anh', '2015-03-10', '5B', 5, '789 Nguyễn Thị Thập, Quận 7'),
('Ngô Thị Lan', '2014-09-25', '6A', 6, '321 Lê Văn Việt, Quận 7'),
('Võ Đức Minh', '2013-12-05', '7B', 6, '654 Nguyễn Văn Linh, Quận 7'),
('Hoàng Thị Hoa', '2015-01-18', '5C', 8, '987 Huỳnh Tấn Phát, Quận 7'),
('Lý Văn Đức', '2014-07-30', '6C', 8, '147 Lê Văn Lương, Nhà Bè'),
('Trần Thị Mai', '2013-04-12', '7C', 4, '258 Nguyễn Thị Thập, Quận 7'),
('Nguyễn Văn Tùng', '2015-10-08', '5D', 5, '369 Lê Văn Việt, Quận 7');

-- Insert sample routes
INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) VALUES
('Tuyến Quận 7 - Nhà Bè', 'Trường Tiểu học ABC', 'Khu dân cư Phú Xuân', 45),
('Tuyến Quận 4 - Quận 7', 'Trường Tiểu học ABC', 'Khu Him Lam, Quận 7', 35),
('Tuyến Quận 7 - Quận 1', 'Trường Tiểu học ABC', 'Khu trung tâm Quận 1', 60),
('Tuyến Quận 7 - Quận 2', 'Trường Tiểu học ABC', 'Khu Thủ Thiêm, Quận 2', 50),
('Tuyến Quận 7 - Quận 3', 'Trường Tiểu học ABC', 'Khu trung tâm Quận 3', 55);

-- Insert sample stops
INSERT INTO DiemDung (maTuyen, tenDiem, kinhDo, viDo, thuTu) VALUES
-- Route 1 stops
(1, 'Ngã tư Nguyễn Văn Linh', 106.7212, 10.7345, 1),
(1, 'Chung cư Sunrise City', 106.7075, 10.7408, 2),
(1, 'Khu dân cư Phú Xuân', 106.7041, 10.6972, 3),
-- Route 2 stops
(2, 'Ngã tư Khánh Hội', 106.7049, 10.7575, 1),
(2, 'Cầu Kênh Tẻ', 106.7083, 10.7450, 2),
(2, 'Khu Him Lam', 106.7101, 10.7415, 3),
-- Route 3 stops
(3, 'Ngã tư Nguyễn Văn Cừ', 106.6950, 10.7500, 1),
(3, 'Khu trung tâm Quận 1', 106.7000, 10.7600, 2),
-- Route 4 stops
(4, 'Ngã tư Nguyễn Thị Thập', 106.7200, 10.7300, 1),
(4, 'Khu Thủ Thiêm', 106.7300, 10.7400, 2),
-- Route 5 stops
(5, 'Ngã tư Lê Văn Việt', 106.7100, 10.7500, 1),
(5, 'Khu trung tâm Quận 3', 106.6900, 10.7800, 2);

-- Insert sample schedules
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, dangApDung) VALUES
(1, 1, 2, 'don_sang', '06:30:00', TRUE),
(1, 1, 2, 'tra_chieu', '16:45:00', TRUE),
(2, 2, 3, 'don_sang', '06:45:00', TRUE),
(2, 2, 3, 'tra_chieu', '17:00:00', TRUE),
(3, 3, 7, 'don_sang', '07:00:00', TRUE),
(3, 3, 7, 'tra_chieu', '17:15:00', TRUE),
(4, 5, 2, 'don_sang', '06:15:00', TRUE),
(4, 5, 2, 'tra_chieu', '16:30:00', TRUE),
(5, 6, 3, 'don_sang', '07:15:00', TRUE),
(5, 6, 3, 'tra_chieu', '17:30:00', TRUE);

-- Insert sample trips
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-20', 'hoan_thanh', '2025-10-20 06:30:00', '2025-10-20 07:15:00', 'Chuyến đi hoàn thành đúng giờ'),
(2, '2025-10-20', 'dang_chay', '2025-10-20 16:45:00', NULL, 'Đang trong quá trình trả học sinh'),
(3, '2025-10-20', 'chua_khoi_hanh', NULL, NULL, 'Chờ bắt đầu chuyến đi'),
(4, '2025-10-20', 'hoan_thanh', '2025-10-20 17:00:00', '2025-10-20 17:35:00', 'Chuyến đi hoàn thành'),
(5, '2025-10-20', 'hoan_thanh', '2025-10-20 07:00:00', '2025-10-20 08:00:00', 'Chuyến đi hoàn thành'),
(6, '2025-10-20', 'dang_chay', '2025-10-20 17:15:00', NULL, 'Đang trả học sinh'),
(7, '2025-10-20', 'hoan_thanh', '2025-10-20 06:15:00', '2025-10-20 07:05:00', 'Chuyến đi hoàn thành'),
(8, '2025-10-20', 'hoan_thanh', '2025-10-20 16:30:00', '2025-10-20 17:20:00', 'Chuyến đi hoàn thành'),
(9, '2025-10-20', 'hoan_thanh', '2025-10-20 07:15:00', '2025-10-20 08:15:00', 'Chuyến đi hoàn thành'),
(10, '2025-10-20', 'dang_chay', '2025-10-20 17:30:00', NULL, 'Đang trả học sinh');

-- Insert sample student status
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu) VALUES
-- Trip 1 (completed)
(1, 1, 1, 'da_don', '2025-10-20 06:40:00', 'Đón đúng giờ'),
(1, 2, 2, 'da_don', '2025-10-20 06:50:00', 'Đón đúng giờ'),
(1, 3, 3, 'vang', NULL, 'Học sinh vắng mặt'),
-- Trip 2 (in progress)
(2, 4, 1, 'da_don', '2025-10-20 16:50:00', 'Đã đón'),
(2, 5, 2, 'da_don', '2025-10-20 17:00:00', 'Đã đón'),
(2, 6, 3, 'da_tra', '2025-10-20 17:10:00', 'Đã trả'),
-- Trip 3 (not started)
(3, 7, 1, 'cho_don', NULL, 'Chờ đón'),
(3, 8, 2, 'cho_don', NULL, 'Chờ đón'),
(3, 9, 3, 'cho_don', NULL, 'Chờ đón'),
-- Trip 4 (completed)
(4, 10, 1, 'da_tra', '2025-10-20 17:20:00', 'Đã trả'),
-- Trip 5 (completed)
(5, 1, 1, 'da_don', '2025-10-20 07:10:00', 'Đón đúng giờ'),
(5, 2, 2, 'da_don', '2025-10-20 07:20:00', 'Đón đúng giờ'),
-- Trip 6 (in progress)
(6, 3, 1, 'da_don', '2025-10-20 17:25:00', 'Đã đón'),
(6, 4, 2, 'da_tra', '2025-10-20 17:35:00', 'Đã trả'),
-- Trip 7 (completed)
(7, 5, 1, 'da_don', '2025-10-20 06:25:00', 'Đón đúng giờ'),
(7, 6, 2, 'da_don', '2025-10-20 06:35:00', 'Đón đúng giờ'),
-- Trip 8 (completed)
(8, 7, 1, 'da_tra', '2025-10-20 17:00:00', 'Đã trả'),
(8, 8, 2, 'da_tra', '2025-10-20 17:10:00', 'Đã trả'),
-- Trip 9 (completed)
(9, 9, 1, 'da_don', '2025-10-20 07:25:00', 'Đón đúng giờ'),
(9, 10, 2, 'da_don', '2025-10-20 07:35:00', 'Đón đúng giờ'),
-- Trip 10 (in progress)
(10, 1, 1, 'da_don', '2025-10-20 17:40:00', 'Đã đón'),
(10, 2, 2, 'da_tra', '2025-10-20 17:50:00', 'Đã trả');

-- Insert sample notifications
INSERT INTO ThongBao (maNguoiNhan, tieuDe, noiDung, loaiThongBao) VALUES
(4, 'Xe sắp tới điểm đón', 'Xe 51A-12345 sắp tới Ngã tư Nguyễn Văn Linh trong 5 phút.', 'chuyen_di'),
(5, 'Xe đã đến trường', 'Học sinh của bạn đã đến trường an toàn.', 'chuyen_di'),
(2, 'Hệ thống cập nhật lịch trình mới', 'Bạn có lịch trình mới vào sáng mai lúc 6:30.', 'he_thong'),
(6, 'Thông báo trễ xe', 'Xe 51B-67890 sẽ trễ 15 phút do kẹt xe.', 'chuyen_di'),
(8, 'Xe sắp tới điểm đón', 'Xe 51C-11111 sắp tới Ngã tư Khánh Hội trong 3 phút.', 'chuyen_di'),
(4, 'Học sinh đã được đón', 'Học sinh Nguyễn Gia Bảo đã được đón lúc 06:40.', 'chuyen_di'),
(5, 'Học sinh đã được trả', 'Học sinh Trần Khánh Linh đã được trả lúc 17:10.', 'chuyen_di'),
(6, 'Thông báo hệ thống', 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày mai.', 'he_thong');

-- Insert sample incidents
INSERT INTO SuCo (maChuyen, moTa, thoiGianBao, mucDo, trangThai) VALUES
(1, 'Xe bị kẹt xe trên đường Nguyễn Văn Linh', '2025-10-20 06:35:00', 'trung_binh', 'da_xu_ly'),
(2, 'Một học sinh bị say xe nhẹ', '2025-10-20 17:05:00', 'nhe', 'dang_xu_ly'),
(6, 'Xe gặp sự cố kỹ thuật nhỏ', '2025-10-20 17:30:00', 'nhe', 'moi'),
(10, 'Học sinh vắng mặt không báo trước', '2025-10-20 17:45:00', 'nhe', 'da_xu_ly');

-- Insert some additional trips for different dates
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-21', 'hoan_thanh', '2025-10-21 06:30:00', '2025-10-21 07:15:00', 'Chuyến đi hoàn thành đúng giờ'),
(2, '2025-10-21', 'hoan_thanh', '2025-10-21 16:45:00', '2025-10-21 17:30:00', 'Chuyến đi hoàn thành'),
(3, '2025-10-21', 'hoan_thanh', '2025-10-21 06:45:00', '2025-10-21 07:30:00', 'Chuyến đi hoàn thành'),
(4, '2025-10-21', 'hoan_thanh', '2025-10-21 17:00:00', '2025-10-21 17:35:00', 'Chuyến đi hoàn thành'),
(5, '2025-10-21', 'hoan_thanh', '2025-10-21 07:00:00', '2025-10-21 08:00:00', 'Chuyến đi hoàn thành');

-- Insert student status for additional trips
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu) VALUES
-- Trip 11 (completed)
(11, 1, 1, 'da_don', '2025-10-21 06:40:00', 'Đón đúng giờ'),
(11, 2, 2, 'da_don', '2025-10-21 06:50:00', 'Đón đúng giờ'),
(11, 3, 3, 'da_don', '2025-10-21 07:00:00', 'Đón đúng giờ'),
-- Trip 12 (completed)
(12, 4, 1, 'da_tra', '2025-10-21 17:00:00', 'Đã trả'),
(12, 5, 2, 'da_tra', '2025-10-21 17:10:00', 'Đã trả'),
(12, 6, 3, 'da_tra', '2025-10-21 17:20:00', 'Đã trả'),
-- Trip 13 (completed)
(13, 7, 1, 'da_don', '2025-10-21 06:55:00', 'Đón đúng giờ'),
(13, 8, 2, 'da_don', '2025-10-21 07:05:00', 'Đón đúng giờ'),
(13, 9, 3, 'da_don', '2025-10-21 07:15:00', 'Đón đúng giờ'),
-- Trip 14 (completed)
(14, 10, 1, 'da_tra', '2025-10-21 17:05:00', 'Đã trả'),
-- Trip 15 (completed)
(15, 1, 1, 'da_don', '2025-10-21 07:10:00', 'Đón đúng giờ'),
(15, 2, 2, 'da_don', '2025-10-21 07:20:00', 'Đón đúng giờ'),
(15, 3, 3, 'da_don', '2025-10-21 07:30:00', 'Đón đúng giờ');

-- Display completion message
SELECT 'Sample data inserted successfully!' as message;
SELECT COUNT(*) as totalUsers FROM NguoiDung;
SELECT COUNT(*) as totalDrivers FROM TaiXe;
SELECT COUNT(*) as totalBuses FROM XeBuyt;
SELECT COUNT(*) as totalStudents FROM HocSinh;
SELECT COUNT(*) as totalRoutes FROM TuyenDuong;
SELECT COUNT(*) as totalStops FROM DiemDung;
SELECT COUNT(*) as totalSchedules FROM LichTrinh;
SELECT COUNT(*) as totalTrips FROM ChuyenDi;
SELECT COUNT(*) as totalStudentStatus FROM TrangThaiHocSinh;
SELECT COUNT(*) as totalNotifications FROM ThongBao;
SELECT COUNT(*) as totalIncidents FROM SuCo;

-- =====================================================================
-- Test data: Today's trip for driver taixe1@schoolbus.vn (maTaiXe = 2)
-- Purpose: Allow logging in as driver 1 and testing Start/End APIs today
-- Note:
--  - Reuse existing schedule with maLichTrinh = 1 (belongs to maTaiXe = 2)
--  - Use CURDATE() so the trip is always created for the day you run this
--  - Initial status is 'chua_khoi_hanh' to enable testing startTrip endpoint
-- =====================================================================
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, CURDATE(), 'chua_khoi_hanh', NULL, NULL, 'Trip test hôm nay cho taixe1 (driverId=2).');

