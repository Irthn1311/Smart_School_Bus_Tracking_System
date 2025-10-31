-- SSB Sample Data Script (FIXED VERSION)
-- Chạy file init_db.sql TRƯỚC khi chạy file này.

USE school_bus_system;

-- =================================================================
-- KHỐI 1: DỮ LIỆU GỐC
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Minh Quân', 'quantri@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000001', 'quan_tri'),
('Trần Văn Tài', 'taixe1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000002', 'tai_xe'),
('Lê Văn Hùng', 'taixe2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000003', 'tai_xe'),
('Phạm Thu Hương', 'phuhuynh1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000004', 'phu_huynh'),
('Ngô Đức Anh', 'phuhuynh2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000005', 'phu_huynh'),
('Võ Thị Lan', 'phuhuynh3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000006', 'phu_huynh'),
('Hoàng Văn Nam', 'taixe3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000007', 'tai_xe'),
('Lý Thị Mai', 'phuhuynh4@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000008', 'phu_huynh');

INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(2, 'Trần Văn Tài', 'B2-123456789', '2028-05-20', 5, 'hoat_dong'),
(3, 'Lê Văn Hùng', 'B2-987654321', '2027-12-31', 8, 'hoat_dong'),
(7, 'Hoàng Văn Nam', 'B2-456789123', '2029-03-15', 3, 'hoat_dong');

INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) VALUES
('51A-12345', 'Hyundai County', 30, 'hoat_dong'),
('51B-67890', 'Thaco Town', 28, 'hoat_dong'),
('51C-11111', 'Isuzu NPR', 35, 'hoat_dong'),
('51D-22222', 'Hyundai County', 30, 'bao_tri'),
('51E-33333', 'Thaco Town', 28, 'hoat_dong'),
('51F-44444', 'Isuzu NPR', 35, 'hoat_dong'),
('51G-55555', 'Hyundai County', 30, 'hoat_dong'),
('51H-66666', 'Thaco Town', 28, 'ngung_hoat_dong');

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

INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) VALUES
('Tuyến Quận 7 - Nhà Bè', 'Trường Tiểu học ABC', 'Khu dân cư Phú Xuân', 45),
('Tuyến Quận 4 - Quận 7', 'Trường Tiểu học ABC', 'Khu Him Lam, Quận 7', 35),
('Tuyến Quận 7 - Quận 1', 'Trường Tiểu học ABC', 'Khu trung tâm Quận 1', 60),
('Tuyến Quận 7 - Quận 2', 'Trường Tiểu học ABC', 'Khu Thủ Thiêm, Quận 2', 50),
('Tuyến Quận 7 - Quận 3', 'Trường Tiểu học ABC', 'Khu trung tâm Quận 3', 55);

INSERT INTO DiemDung (maTuyen, tenDiem, kinhDo, viDo, thuTu) VALUES
(1, 'Ngã tư Nguyễn Văn Linh', 106.7212, 10.7345, 1),
(1, 'Chung cư Sunrise City', 106.7075, 10.7408, 2),
(1, 'Khu dân cư Phú Xuân', 106.7041, 10.6972, 3),
(2, 'Ngã tư Khánh Hội', 106.7049, 10.7575, 1),
(2, 'Cầu Kênh Tẻ', 106.7083, 10.7450, 2),
(2, 'Khu Him Lam', 106.7101, 10.7415, 3),
(3, 'Ngã tư Nguyễn Văn Cừ', 106.6950, 10.7500, 1),
(3, 'Khu trung tâm Quận 1', 106.7000, 10.7600, 2),
(4, 'Ngã tư Nguyễn Thị Thập', 106.7200, 10.7300, 1),
(4, 'Khu Thủ Thiêm', 106.7300, 10.7400, 2),
(5, 'Ngã tư Lê Văn Việt', 106.7100, 10.7500, 1),
(5, 'Khu trung tâm Quận 3', 106.6900, 10.7800, 2);

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

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu) VALUES
(1, 1, 1, 'da_don', '2025-10-20 06:40:00', 'Đón đúng giờ'),
(1, 2, 2, 'da_don', '2025-10-20 06:50:00', 'Đón đúng giờ'),
(1, 3, 3, 'vang', NULL, 'Học sinh vắng mặt'),
(2, 4, 1, 'da_don', '2025-10-20 16:50:00', 'Đã đón'),
(2, 5, 2, 'da_don', '2025-10-20 17:00:00', 'Đã đón'),
(2, 6, 3, 'da_tra', '2025-10-20 17:10:00', 'Đã trả'),
(3, 7, 1, 'cho_don', NULL, 'Chờ đón'),
(3, 8, 2, 'cho_don', NULL, 'Chờ đón'),
(3, 9, 3, 'cho_don', NULL, 'Chờ đón'),
(4, 10, 1, 'da_tra', '2025-10-20 17:20:00', 'Đã trả'),
(5, 1, 1, 'da_don', '2025-10-20 07:10:00', 'Đón đúng giờ'),
(5, 2, 2, 'da_don', '2025-10-20 07:20:00', 'Đón đúng giờ'),
(6, 3, 1, 'da_don', '2025-10-20 17:25:00', 'Đã đón'),
(6, 4, 2, 'da_tra', '2025-10-20 17:35:00', 'Đã trả'),
(7, 5, 1, 'da_don', '2025-10-20 06:25:00', 'Đón đúng giờ'),
(7, 6, 2, 'da_don', '2025-10-20 06:35:00', 'Đón đúng giờ'),
(8, 7, 1, 'da_tra', '2025-10-20 17:00:00', 'Đã trả'),
(8, 8, 2, 'da_tra', '2025-10-20 17:10:00', 'Đã trả'),
(9, 9, 1, 'da_don', '2025-10-20 07:25:00', 'Đón đúng giờ'),
(9, 10, 2, 'da_don', '2025-10-20 07:35:00', 'Đón đúng giờ'),
(10, 1, 1, 'da_don', '2025-10-20 17:40:00', 'Đã đón'),
(10, 2, 2, 'da_tra', '2025-10-20 17:50:00', 'Đã trả');

INSERT INTO ThongBao (maNguoiNhan, tieuDe, noiDung, loaiThongBao) VALUES
(4, 'Xe sắp tới điểm đón', 'Xe 51A-12345 sắp tới Ngã tư Nguyễn Văn Linh trong 5 phút.', 'chuyen_di'),
(5, 'Xe đã đến trường', 'Học sinh của bạn đã đến trường an toàn.', 'chuyen_di'),
(2, 'Hệ thống cập nhật lịch trình mới', 'Bạn có lịch trình mới vào sáng mai lúc 6:30.', 'he_thong'),
(6, 'Thông báo trễ xe', 'Xe 51B-67890 sẽ trễ 15 phút do kẹt xe.', 'chuyen_di'),
(8, 'Xe sắp tới điểm đón', 'Xe 51C-11111 sắp tới Ngã tư Khánh Hội trong 3 phút.', 'chuyen_di'),
(4, 'Học sinh đã được đón', 'Học sinh Nguyễn Gia Bảo đã được đón lúc 06:40.', 'chuyen_di'),
(5, 'Học sinh đã được trả', 'Học sinh Trần Khánh Linh đã được trả lúc 17:10.', 'chuyen_di'),
(6, 'Thông báo hệ thống', 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày mai.', 'he_thong');

INSERT INTO SuCo (maChuyen, moTa, thoiGianBao, mucDo, trangThai) VALUES
(1, 'Xe bị kẹt xe trên đường Nguyễn Văn Linh', '2025-10-20 06:35:00', 'trung_binh', 'da_xu_ly'),
(2, 'Một học sinh bị say xe nhẹ', '2025-10-20 17:05:00', 'nhe', 'dang_xu_ly'),
(6, 'Xe gặp sự cố kỹ thuật nhỏ', '2025-10-20 17:30:00', 'nhe', 'moi'),
(10, 'Học sinh vắng mặt không báo trước', '2025-10-20 17:45:00', 'nhe', 'da_xu_ly');

INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-21', 'hoan_thanh', '2025-10-21 06:30:00', '2025-10-21 07:15:00', 'Chuyến đi hoàn thành đúng giờ'),
(2, '2025-10-21', 'hoan_thanh', '2025-10-21 16:45:00', '2025-10-21 17:30:00', 'Chuyến đi hoàn thành'),
(3, '2025-10-21', 'hoan_thanh', '2025-10-21 06:45:00', '2025-10-21 07:30:00', 'Chuyến đi hoàn thành'),
(4, '2025-10-21', 'hoan_thanh', '2025-10-21 17:00:00', '2025-10-21 17:35:00', 'Chuyến đi hoàn thành'),
(5, '2025-10-21', 'hoan_thanh', '2025-10-21 07:00:00', '2025-10-21 08:00:00', 'Chuyến đi hoàn thành');

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu) VALUES
(11, 1, 1, 'da_don', '2025-10-21 06:40:00', 'Đón đúng giờ'),
(11, 2, 2, 'da_don', '2025-10-21 06:50:00', 'Đón đúng giờ'),
(11, 3, 3, 'da_don', '2025-10-21 07:00:00', 'Đón đúng giờ'),
(12, 4, 1, 'da_tra', '2025-10-21 17:00:00', 'Đã trả'),
(12, 5, 2, 'da_tra', '2025-10-21 17:10:00', 'Đã trả'),
(12, 6, 3, 'da_tra', '2025-10-21 17:20:00', 'Đã trả'),
(13, 7, 1, 'da_don', '2025-10-21 06:55:00', 'Đón đúng giờ'),
(13, 8, 2, 'da_don', '2025-10-21 07:05:00', 'Đón đúng giờ'),
(13, 9, 3, 'da_don', '2025-10-21 07:15:00', 'Đón đúng giờ'),
(14, 10, 1, 'da_tra', '2025-10-21 17:05:00', 'Đã trả'),
(15, 1, 1, 'da_don', '2025-10-21 07:10:00', 'Đón đúng giờ'),
(15, 2, 2, 'da_don', '2025-10-21 07:20:00', 'Đón đúng giờ'),
(15, 3, 3, 'da_don', '2025-10-21 07:30:00', 'Đón đúng giờ');

-- =================================================================
-- KHỐI 2: DỮ LIỆU MỚI (SỬA LỖI)
-- =================================================================

-- 
-- NGÀY 2025-10-17 (Thêm 5 chuyến)
--
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-17', 'hoan_thanh', '2025-10-17 06:31:00', '2025-10-17 07:18:00', 'Lịch sử (17/10) - Hoàn thành');
SET @chuyen16 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(2, '2025-10-17', 'hoan_thanh', '2025-10-17 16:45:00', '2025-10-17 17:32:00', 'Lịch sử (17/10) - Hoàn thành');
SET @chuyen17 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(3, '2025-10-17', 'hoan_thanh', '2025-10-17 06:45:00', '2025-10-17 07:33:00', 'Lịch sử (17/10) - Hoàn thành');
SET @chuyen18 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(4, '2025-10-17', 'hoan_thanh', '2025-10-17 17:00:00', '2025-10-17 17:35:00', 'Lịch sử (17/10) - Hoàn thành');
SET @chuyen19 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(5, '2025-10-17', 'hoan_thanh', '2025-10-17 07:00:00', '2025-10-17 08:02:00', 'Lịch sử (17/10) - Hoàn thành');
SET @chuyen20 := LAST_INSERT_ID();

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe) VALUES
(@chuyen16, 1, 1, 'da_don', '2025-10-17 06:41:00'),
(@chuyen16, 2, 2, 'da_don', '2025-10-17 06:51:00'),
(@chuyen17, 4, 1, 'da_tra', '2025-10-17 17:01:00'),
(@chuyen17, 5, 2, 'da_tra', '2025-10-17 17:11:00'),
(@chuyen18, 7, 1, 'da_don', '2025-10-17 06:55:00'),
(@chuyen18, 8, 2, 'da_don', '2025-10-17 07:05:00'),
(@chuyen19, 10, 1, 'da_tra', '2025-10-17 17:21:00'),
(@chuyen20, 1, 1, 'da_don', '2025-10-17 07:10:00');

-- 
-- NGÀY 2025-10-16 (Thêm 3 chuyến ĐẶC BIỆT)
--
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
-- Chuyến 21: Bị HỦY (để test cancelledTrips)
(6, '2025-10-16', 'huy', NULL, NULL, 'Hủy do tài xế ốm'),
-- Chuyến 22: Bị TRỄ NẶNG (để test delayedTrips)
(7, '2025-10-16', 'hoan_thanh', '2025-10-16 06:45:00', '2025-10-16 07:40:00', 'Chuyến đi bị trễ 30 phút do xe hỏng vặt'),
-- Chuyến 23: ĐÚNG GIỜ (để test onTimeTrips)
(8, '2025-10-16', 'hoan_thanh', '2025-10-16 16:30:00', '2025-10-16 17:15:00', 'Chuyến đi đúng giờ');

SET @chuyen21 := LAST_INSERT_ID() - 2; -- ID của chuyến hủy (6, '2025-10-16')
SET @chuyen22 := LAST_INSERT_ID() - 1; -- ID của chuyến trễ (7, '2025-10-16')
SET @chuyen23 := LAST_INSERT_ID(); -- ID của chuyến đúng giờ (8, '2025-10-16')

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe) VALUES
(@chuyen22, 5, 1, 'da_don', '2025-10-16 06:55:00'),
(@chuyen22, 6, 2, 'da_don', '2025-10-16 07:05:00'),
(@chuyen23, 7, 1, 'da_tra', '2025-10-16 17:00:00'),
(@chuyen23, 8, 2, 'da_tra', '2025-10-16 17:10:00');

-- 
-- NGÀY 2025-10-15 (Thêm 10 chuyến)
--
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-15', 'hoan_thanh', '2025-10-15 06:30:00', '2025-10-15 07:15:00', 'Lịch sử (15/10) - Đúng giờ');
SET @chuyen24 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(2, '2025-10-15', 'hoan_thanh', '2025-10-15 16:45:00', '2025-10-15 17:30:00', 'Lịch sử (15/10) - Hoàn thành');
SET @chuyen25 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(3, '2025-10-15', 'huy', NULL, NULL, 'Lịch sử (15/10) - Hủy do xe hỏng');
SET @chuyen26 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(4, '2025-10-15', 'hoan_thanh', '2025-10-15 17:00:00', '2025-10-15 17:35:00', 'Lịch sử (15/10) - Hoàn thành');
SET @chuyen27 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(5, '2025-10-15', 'hoan_thanh', '2025-10-15 07:10:00', '2025-10-15 08:05:00', 'Lịch sử (15/10) - Trễ 10 phút');
SET @chuyen28 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(6, '2025-10-15', 'hoan_thanh', '2025-10-15 17:15:00', '2025-10-15 18:00:00', 'Lịch sử (15/10) - Hoàn thành');
SET @chuyen29 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(7, '2025-10-15', 'hoan_thanh', '2025-10-15 06:15:00', '2025-10-15 07:00:00', 'Lịch sử (15/10) - Đúng giờ');
SET @chuyen30 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(8, '2025-10-15', 'hoan_thanh', '2025-10-15 16:30:00', '2025-10-15 17:15:00', 'Lịch sử (15/10) - Hoàn thành');
SET @chuyen31 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(9, '2025-10-15', 'hoan_thanh', '2025-10-15 07:15:00', '2025-10-15 08:10:00', 'Lịch sử (15/10) - Đúng giờ');
SET @chuyen32 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(10, '2025-10-15', 'hoan_thanh', '2025-10-15 17:35:00', '2025-10-15 18:20:00', 'Lịch sử (15/10) - Trễ 5 phút');
SET @chuyen33 := LAST_INSERT_ID();

INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe) VALUES
(@chuyen24, 1, 1, 'da_don', '2025-10-15 06:40:00'),
(@chuyen24, 2, 2, 'da_don', '2025-10-15 06:50:00'),
(@chuyen25, 4, 1, 'da_tra', '2025-10-15 17:00:00'),
(@chuyen25, 5, 2, 'da_tra', '2025-10-15 17:10:00'),
-- Chuyến 26 HỦY
(@chuyen27, 10, 1, 'da_tra', '2025-10-15 17:20:00'),
(@chuyen28, 1, 1, 'da_don', '2025-10-15 07:20:00'),
(@chuyen28, 2, 2, 'da_don', '2025-10-15 07:30:00'),
(@chuyen30, 5, 1, 'da_don', '2025-10-15 06:25:00'),
(@chuyen30, 6, 2, 'da_don', '2025-10-15 06:35:00'),
(@chuyen31, 7, 1, 'da_tra', '2025-10-15 17:00:00'),
(@chuyen31, 8, 2, 'da_tra', '2025-10-15 17:10:00'),
(@chuyen32, 9, 1, 'da_don', '2025-10-15 07:25:00'),
(@chuyen32, 10, 2, 'da_don', '2025-10-15 07:35:00'),
(@chuyen33, 1, 1, 'da_tra', '2025-10-15 17:45:00'),
(@chuyen33, 2, 2, 'da_tra', '2025-10-15 17:55:00');

-- 
-- NGÀY 2025-10-14 (Thêm 5 chuyến, có học sinh VẮNG)
--
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(1, '2025-10-14', 'hoan_thanh', '2025-10-14 06:30:00', '2025-10-14 07:15:00', 'Lịch sử (14/10) - Đúng giờ');
SET @chuyen34 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(2, '2025-10-14', 'hoan_thanh', '2025-10-14 16:45:00', '2025-10-14 17:30:00', 'Lịch sử (14/10) - Hoàn thành');
SET @chuyen35 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(3, '2025-10-14', 'hoan_thanh', '2025-10-14 06:45:00', '2025-10-14 07:30:00', 'Lịch sử (14/10) - Đúng giờ');
SET @chuyen36 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(4, '2025-10-14', 'hoan_thanh', '2025-10-14 17:00:00', '2025-10-14 17:35:00', 'Lịch sử (14/10) - Hoàn thành');
SET @chuyen37 := LAST_INSERT_ID();
INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu) VALUES
(5, '2025-10-14', 'huy', NULL, NULL, 'Lịch sử (14/10) - Hủy');
SET @chuyen38 := LAST_INSERT_ID();

-- 
-- KHỐI DỮ LIỆU "MỒ CÔI" VÀ HỌC SINH MỚI
--

-- Tài xế nghỉ phép
INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lê Thị Tám', 'taixe_nghi_phep@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909111555', 'tai_xe');
SET @taixe_tam_id := LAST_INSERT_ID();
INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(@taixe_tam_id, 'Lê Thị Tám', 'B2-888888888', '2029-01-01', 6, 'tam_nghi');

-- Phụ huynh và học sinh mới
INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Đặng Văn Lâm', 'phuhuynh5@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909111333', 'phu_huynh'),
('Nguyễn Thị Cẩm', 'phuhuynh6@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909111444', 'phu_huynh');

SET @phuhuynh_5_id := LAST_INSERT_ID() - 1;
SET @phuhuynh_6_id := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi) VALUES
('Đặng Gia Hân', '2016-01-01', '4A', @phuhuynh_5_id, '45 Lý Thường Kiệt, Quận 7');
SET @hocsinh_11_id := LAST_INSERT_ID();
INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi) VALUES
('Nguyễn Văn Khang', '2016-02-02', '4B', @phuhuynh_6_id, '46 Lý Thường Kiệt, Quận 7');
SET @hocsinh_12_id := LAST_INSERT_ID();

-- Thêm học sinh cho các chuyến ngày 14/10
INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe) VALUES
(@chuyen34, 1, 1, 'da_don', '2025-10-14 06:40:00'),
(@chuyen34, 2, 2, 'vang', NULL), -- Học sinh VẮNG
(@chuyen34, 3, 3, 'da_don', '2025-10-14 07:00:00'),
(@chuyen35, 4, 1, 'da_tra', '2025-10-14 17:00:00'),
(@chuyen35, 5, 2, 'vang', NULL), -- Học sinh VẮNG
(@chuyen35, 6, 3, 'da_tra', '2025-10-14 17:20:00'),
(@chuyen36, 7, 1, 'da_don', '2025-10-14 06:55:00'),
(@chuyen36, 8, 2, 'da_don', '2025-10-14 07:05:00'),
(@chuyen37, 10, 1, 'da_tra', '2025-10-14 17:20:00'),
(@chuyen37, @hocsinh_11_id, 2, 'da_tra', '2025-10-14 17:25:00'), -- Học sinh mới
(@chuyen37, @hocsinh_12_id, 3, 'da_tra', '2025-10-14 17:30:00'); -- Học sinh mới

-- Tài xế dự phòng
INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Bùi Văn Kiên', 'taixe_nghi@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909111222', 'tai_xe');
SET @taixe_kien_id := LAST_INSERT_ID();
INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(@taixe_kien_id, 'Bùi Văn Kiên', 'B2-111111111', '2029-01-01', 7, 'tam_nghi');

-- Xe dự phòng
INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) VALUES
('51P-00000', 'Ford Transit', 16, 'hoat_dong');
SET @xe_duphong_id := LAST_INSERT_ID();

-- Tuyến dự phòng
INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) VALUES
('Tuyến dự phòng', 'Bãi xe', 'Bãi xe', 10);
SET @tuyen_duphong_id := LAST_INSERT_ID();

-- Lịch trình không áp dụng
INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, dangApDung) VALUES
(@tuyen_duphong_id, @xe_duphong_id, 2, 'don_sang', '08:00:00', FALSE);

-- Cập nhật xe 4
UPDATE XeBuyt SET trangThai = 'bao_tri' WHERE maXe = 4;

-- Kết thúc
SELECT 'Sample data (FIXED SCRIPT V2) inserted successfully!' as message;