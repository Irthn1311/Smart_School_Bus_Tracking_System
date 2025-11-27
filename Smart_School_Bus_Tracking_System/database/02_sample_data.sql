-- SSB Sample Data Script (100 HỌC SINH TP.HCM)
-- Compatible with 01_init_db_ver2.sql (normalized stops + route_stops)
-- Chạy file 01_init_db_ver2.sql TRƯỚC khi chạy file này.
-- 
-- Dữ liệu: 100 học sinh phân bố ở 10 quận/huyện TP.HCM
-- Tạo từng lần 10 học sinh kèm phụ huynh

USE school_bus_system;

-- =================================================================
-- KHỐI 1: TÀI KHOẢN QUẢN TRỊ VÀ TÀI XẾ
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Minh Quân', 'quantri@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000001', 'quan_tri'),
('Trần Văn Tài', 'taixe1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000002', 'tai_xe'),
('Lê Văn Hùng', 'taixe2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000003', 'tai_xe'),
('Hoàng Văn Nam', 'taixe3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000007', 'tai_xe'),
('Phạm Văn Đức', 'taixe4@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000008', 'tai_xe'),
('Võ Thành Long', 'taixe5@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000009', 'tai_xe'),
('Ngô Văn Sơn', 'taixe6@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000010', 'tai_xe'),
('Bùi Văn Kiên', 'taixe7@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000011', 'tai_xe');

INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(2, 'Trần Văn Tài', 'B2-123456789', '2028-05-20', 5, 'hoat_dong'),
(3, 'Lê Văn Hùng', 'B2-987654321', '2027-12-31', 8, 'hoat_dong'),
(4, 'Hoàng Văn Nam', 'B2-456789123', '2029-03-15', 3, 'hoat_dong'),
(5, 'Phạm Văn Đức', 'B2-789123456', '2028-08-10', 6, 'hoat_dong'),
(6, 'Võ Thành Long', 'B2-321654987', '2029-01-25', 4, 'hoat_dong'),
(7, 'Ngô Văn Sơn', 'B2-654987321', '2027-11-30', 7, 'hoat_dong'),
(8, 'Bùi Văn Kiên', 'B2-147258369', '2028-06-15', 5, 'hoat_dong');

-- =================================================================
-- KHỐI 2: XE BUÝT
-- =================================================================

INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai) VALUES
('51A-12345', 'Hyundai County', 30, 'hoat_dong'),
('51B-67890', 'Thaco Town', 28, 'hoat_dong'),
('51C-11111', 'Isuzu NPR', 35, 'hoat_dong'),
('51D-22222', 'Hyundai County', 30, 'hoat_dong'),
('51E-33333', 'Thaco Town', 28, 'hoat_dong'),
('51F-44444', 'Isuzu NPR', 35, 'hoat_dong'),
('51G-55555', 'Hyundai County', 30, 'bao_tri'),
('51H-66666', 'Thaco Town', 28, 'hoat_dong');

-- =================================================================
-- KHỐI 3: LẦN 1 - HỌC SINH 1-10 (QUẬN 7)
-- =================================================================

-- Phụ huynh LẦN 1
INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Phạm Thu Hương', 'phuhuynh1@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000101', 'phu_huynh'),
('Ngô Đức Anh', 'phuhuynh2@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000102', 'phu_huynh'),
('Võ Thị Lan', 'phuhuynh3@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000103', 'phu_huynh'),
('Lý Thị Mai', 'phuhuynh4@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000104', 'phu_huynh'),
('Đặng Văn Lâm', 'phuhuynh5@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000105', 'phu_huynh'),
('Nguyễn Thị Cẩm', 'phuhuynh6@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000106', 'phu_huynh'),
('Trần Văn Hải', 'phuhuynh7@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000107', 'phu_huynh'),
('Lê Thị Hoa', 'phuhuynh8@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000108', 'phu_huynh'),
('Phạm Văn Tuấn', 'phuhuynh9@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000109', 'phu_huynh'),
('Hoàng Thị Nga', 'phuhuynh10@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000110', 'phu_huynh');

-- LAST_INSERT_ID() trả về ID của dòng đầu tiên trong batch, nên cần tính lại
SET @phuhuynh_start_1 := LAST_INSERT_ID();

-- Học sinh LẦN 1 (Quận 7)
INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Nguyễn Gia Bảo', '2015-06-15', '5A', @phuhuynh_start_1 + 0, '123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7345, 106.7212),
('Trần Khánh Linh', '2014-11-02', '6B', @phuhuynh_start_1 + 1, '125 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7346, 106.7213),
('Lê Quang Huy', '2013-08-20', '7A', @phuhuynh_start_1 + 2, '456 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7400, 106.7150),
('Phạm Minh Anh', '2015-03-10', '5B', @phuhuynh_start_1 + 3, '789 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7380, 106.7120),
('Ngô Thị Lan', '2014-09-25', '6A', @phuhuynh_start_1 + 4, '321 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7450, 106.7100),
('Võ Đức Minh', '2013-12-05', '7B', @phuhuynh_start_1 + 5, '654 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7348, 106.7215),
('Hoàng Thị Hoa', '2015-01-18', '5C', @phuhuynh_start_1 + 6, '987 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7402, 106.7152),
('Lý Văn Đức', '2014-07-30', '6C', @phuhuynh_start_1 + 7, '147 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7452, 106.7102),
('Trần Thị Mai', '2013-04-12', '7C', @phuhuynh_start_1 + 8, '258 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7382, 106.7122),
('Nguyễn Văn Tùng', '2015-10-08', '5D', @phuhuynh_start_1 + 9, '369 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7454, 106.7104);

-- =================================================================
-- KHỐI 4: LẦN 2 - HỌC SINH 11-20 (QUẬN 7)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Đỗ Văn Thành', 'phuhuynh11@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000111', 'phu_huynh'),
('Bùi Thị Hương', 'phuhuynh12@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000112', 'phu_huynh'),
('Lương Văn Dũng', 'phuhuynh13@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000113', 'phu_huynh'),
('Vũ Thị Linh', 'phuhuynh14@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000114', 'phu_huynh'),
('Dương Văn Hùng', 'phuhuynh15@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000115', 'phu_huynh'),
('Trịnh Thị Nga', 'phuhuynh16@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000116', 'phu_huynh'),
('Hồ Văn Sơn', 'phuhuynh17@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000117', 'phu_huynh'),
('Mai Thị Hạnh', 'phuhuynh18@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000118', 'phu_huynh'),
('Cao Văn Đạt', 'phuhuynh19@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000119', 'phu_huynh'),
('Tạ Thị Loan', 'phuhuynh20@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000120', 'phu_huynh');

SET @phuhuynh_start_2 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Đỗ Minh Khang', '2015-02-14', '5A', @phuhuynh_start_2 + 0, '111 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7344, 106.7211),
('Bùi Thảo Vy', '2014-05-22', '6B', @phuhuynh_start_2 + 1, '222 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7401, 106.7151),
('Lương Gia Hân', '2013-09-11', '7A', @phuhuynh_start_2 + 2, '333 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7381, 106.7121),
('Vũ Đức An', '2015-11-30', '5B', @phuhuynh_start_2 + 3, '444 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7451, 106.7101),
('Dương Minh Tuấn', '2014-08-17', '6A', @phuhuynh_start_2 + 4, '555 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7347, 106.7214),
('Trịnh Thị Hương', '2013-03-25', '7B', @phuhuynh_start_2 + 5, '666 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7403, 106.7153),
('Hồ Quang Minh', '2015-07-08', '5C', @phuhuynh_start_2 + 6, '777 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7383, 106.7123),
('Mai Văn Đức', '2014-12-19', '6C', @phuhuynh_start_2 + 7, '888 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7453, 106.7103),
('Cao Thị Lan', '2013-01-06', '7C', @phuhuynh_start_2 + 8, '999 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7349, 106.7216),
('Tạ Văn Huy', '2015-04-13', '5D', @phuhuynh_start_2 + 9, '1010 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7404, 106.7154);

-- =================================================================
-- KHỐI 5: LẦN 3 - HỌC SINH 21-30 (QUẬN 4)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lưu Văn Cường', 'phuhuynh21@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000121', 'phu_huynh'),
('Đinh Thị Mai', 'phuhuynh22@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000122', 'phu_huynh'),
('Phan Văn Hải', 'phuhuynh23@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000123', 'phu_huynh'),
('Vương Thị Hoa', 'phuhuynh24@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000124', 'phu_huynh'),
('Tôn Văn Nam', 'phuhuynh25@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000125', 'phu_huynh'),
('Lâm Thị Nga', 'phuhuynh26@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000126', 'phu_huynh'),
('Chu Văn Long', 'phuhuynh27@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000127', 'phu_huynh'),
('Hà Thị Hương', 'phuhuynh28@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000128', 'phu_huynh'),
('Quách Văn Đức', 'phuhuynh29@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000129', 'phu_huynh'),
('Lý Văn Tuấn', 'phuhuynh30@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000130', 'phu_huynh');

SET @phuhuynh_start_3 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Lưu Gia Bảo', '2015-06-20', '5A', @phuhuynh_start_3 + 0, '45 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7575, 106.7049),
('Đinh Khánh Linh', '2014-10-15', '6B', @phuhuynh_start_3 + 1, '67 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7500, 106.7080),
('Phan Quang Huy', '2013-07-22', '7A', @phuhuynh_start_3 + 2, '89 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7520, 106.7050),
('Vương Minh Anh', '2015-03-18', '5B', @phuhuynh_start_3 + 3, '12 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7576, 106.7050),
('Tôn Thị Lan', '2014-09-28', '6A', @phuhuynh_start_3 + 4, '34 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7501, 106.7081),
('Lâm Đức Minh', '2013-11-14', '7B', @phuhuynh_start_3 + 5, '56 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7521, 106.7051),
('Chu Thị Hoa', '2015-01-25', '5C', @phuhuynh_start_3 + 6, '78 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7577, 106.7051),
('Hà Văn Đức', '2014-08-05', '6C', @phuhuynh_start_3 + 7, '90 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7502, 106.7082),
('Quách Thị Mai', '2013-05-12', '7C', @phuhuynh_start_3 + 8, '23 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7522, 106.7052),
('Lý Văn Tùng', '2015-10-30', '5D', @phuhuynh_start_3 + 9, '45 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7578, 106.7052);

-- =================================================================
-- KHỐI 6: LẦN 4 - HỌC SINH 31-40 (QUẬN 4 + QUẬN 1)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Văn Thắng', 'phuhuynh31@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000131', 'phu_huynh'),
('Trần Thị Hạnh', 'phuhuynh32@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000132', 'phu_huynh'),
('Lê Văn Phong', 'phuhuynh33@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000133', 'phu_huynh'),
('Phạm Thị Nhung', 'phuhuynh34@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000134', 'phu_huynh'),
('Ngô Văn Hưng', 'phuhuynh35@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000135', 'phu_huynh'),
('Võ Thị Dung', 'phuhuynh36@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000136', 'phu_huynh'),
('Hoàng Văn Quang', 'phuhuynh37@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000137', 'phu_huynh'),
('Lý Thị Thảo', 'phuhuynh38@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000138', 'phu_huynh'),
('Đặng Văn Sơn', 'phuhuynh39@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000139', 'phu_huynh'),
('Bùi Thị Loan', 'phuhuynh40@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000140', 'phu_huynh');

SET @phuhuynh_start_4 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Nguyễn Gia Khang', '2015-02-08', '5A', @phuhuynh_start_4 + 0, '112 Cầu Kênh Tẻ, Phường 4, Quận 4, TP.HCM', 10.7540, 106.7060),
('Trần Thảo Vy', '2014-05-19', '6B', @phuhuynh_start_4 + 1, '134 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7579, 106.7053),
('Lê Gia Hân', '2013-09-03', '7A', @phuhuynh_start_4 + 2, '156 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7503, 106.7083),
('Phạm Đức An', '2015-11-24', '5B', @phuhuynh_start_4 + 3, '178 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7523, 106.7053),
('Ngô Minh Tuấn', '2014-08-11', '6A', @phuhuynh_start_4 + 4, '190 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7580, 106.7054),
('Võ Thị Hương', '2013-03-17', '7B', @phuhuynh_start_4 + 5, '45 Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM', 10.7750, 106.7000),
('Hoàng Quang Minh', '2015-07-29', '5C', @phuhuynh_start_4 + 6, '67 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', 10.7755, 106.7005),
('Lý Văn Đức', '2014-12-07', '6C', @phuhuynh_start_4 + 7, '89 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM', 10.7720, 106.7020),
('Đặng Thị Lan', '2013-01-21', '7C', @phuhuynh_start_4 + 8, '101 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 10.7725, 106.7025),
('Bùi Văn Huy', '2015-04-16', '5D', @phuhuynh_start_4 + 9, '123 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM', 10.7800, 106.6950);

-- =================================================================
-- KHỐI 7: LẦN 5 - HỌC SINH 41-50 (QUẬN 1 + QUẬN 2)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lương Văn Cường', 'phuhuynh41@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000141', 'phu_huynh'),
('Đỗ Thị Mai', 'phuhuynh42@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000142', 'phu_huynh'),
('Bùi Văn Hải', 'phuhuynh43@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000143', 'phu_huynh'),
('Vũ Thị Hoa', 'phuhuynh44@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000144', 'phu_huynh'),
('Dương Văn Nam', 'phuhuynh45@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000145', 'phu_huynh'),
('Trịnh Thị Nga', 'phuhuynh46@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000146', 'phu_huynh'),
('Hồ Văn Long', 'phuhuynh47@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000147', 'phu_huynh'),
('Mai Thị Hương', 'phuhuynh48@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000148', 'phu_huynh'),
('Cao Văn Đức', 'phuhuynh49@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000149', 'phu_huynh'),
('Tạ Thị Loan', 'phuhuynh50@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000150', 'phu_huynh');

SET @phuhuynh_start_5 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Lương Gia Bảo', '2015-06-12', '5A', @phuhuynh_start_5 + 0, '145 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', 10.7756, 106.7006),
('Đỗ Khánh Linh', '2014-10-28', '6B', @phuhuynh_start_5 + 1, '167 Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM', 10.7751, 106.7001),
('Bùi Quang Huy', '2013-07-15', '7A', @phuhuynh_start_5 + 2, '189 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM', 10.7721, 106.7021),
('Vũ Minh Anh', '2015-03-22', '5B', @phuhuynh_start_5 + 3, '201 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 10.7726, 106.7026),
('Dương Thị Lan', '2014-09-08', '6A', @phuhuynh_start_5 + 4, '223 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM', 10.7801, 106.6951),
('Trịnh Đức Minh', '2013-11-26', '7B', @phuhuynh_start_5 + 5, '245 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM', 10.7780, 106.6920),
('Hồ Thị Hoa', '2015-01-14', '5C', @phuhuynh_start_5 + 6, '12 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.7850, 106.7350),
('Mai Văn Đức', '2014-08-31', '6C', @phuhuynh_start_5 + 7, '34 Nguyễn Đức Cảnh, Phường An Phú, Quận 2, TP.HCM', 10.7855, 106.7355),
('Cao Thị Mai', '2013-05-19', '7C', @phuhuynh_start_5 + 8, '56 Thảo Điền, Phường Thảo Điền, Quận 2, TP.HCM', 10.8000, 106.7400),
('Tạ Văn Tùng', '2015-10-05', '5D', @phuhuynh_start_5 + 9, '78 Nguyễn Thị Định, Phường Bình An, Quận 2, TP.HCM', 10.7900, 106.7380);

-- =================================================================
-- KHỐI 8: LẦN 6 - HỌC SINH 51-60 (QUẬN 2 + QUẬN 3)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lưu Văn Cường', 'phuhuynh51@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000151', 'phu_huynh'),
('Đinh Thị Mai', 'phuhuynh52@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000152', 'phu_huynh'),
('Phan Văn Hải', 'phuhuynh53@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000153', 'phu_huynh'),
('Vương Thị Hoa', 'phuhuynh54@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000154', 'phu_huynh'),
('Tôn Văn Nam', 'phuhuynh55@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000155', 'phu_huynh'),
('Lâm Thị Nga', 'phuhuynh56@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000156', 'phu_huynh'),
('Chu Văn Long', 'phuhuynh57@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000157', 'phu_huynh'),
('Hà Thị Hương', 'phuhuynh58@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000158', 'phu_huynh'),
('Quách Văn Đức', 'phuhuynh59@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000159', 'phu_huynh'),
('Lý Văn Tuấn', 'phuhuynh60@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000160', 'phu_huynh');

SET @phuhuynh_start_6 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Lưu Gia Khang', '2015-02-18', '5A', @phuhuynh_start_6 + 0, '90 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.7851, 106.7351),
('Đinh Thảo Vy', '2014-05-29', '6B', @phuhuynh_start_6 + 1, '112 Nguyễn Đức Cảnh, Phường An Phú, Quận 2, TP.HCM', 10.7856, 106.7356),
('Phan Gia Hân', '2013-09-14', '7A', @phuhuynh_start_6 + 2, '134 Thảo Điền, Phường Thảo Điền, Quận 2, TP.HCM', 10.8001, 106.7401),
('Vương Đức An', '2015-11-07', '5B', @phuhuynh_start_6 + 3, '156 Nguyễn Thị Định, Phường Bình An, Quận 2, TP.HCM', 10.7901, 106.7381),
('Tôn Minh Tuấn', '2014-08-23', '6A', @phuhuynh_start_6 + 4, '178 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.7852, 106.7352),
('Lâm Thị Hương', '2013-03-31', '7B', @phuhuynh_start_6 + 5, '45 Võ Văn Tần, Phường 6, Quận 3, TP.HCM', 10.7900, 106.6900),
('Chu Quang Minh', '2015-07-12', '5C', @phuhuynh_start_6 + 6, '67 Lý Chính Thắng, Phường 8, Quận 3, TP.HCM', 10.7920, 106.6920),
('Hà Văn Đức', '2014-12-28', '6C', @phuhuynh_start_6 + 7, '89 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM', 10.7850, 106.6850),
('Quách Thị Lan', '2013-01-09', '7C', @phuhuynh_start_6 + 8, '101 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 10.7870, 106.6870),
('Lý Văn Huy', '2015-04-25', '5D', @phuhuynh_start_6 + 9, '123 Cách Mạng Tháng 8, Phường 10, Quận 3, TP.HCM', 10.7880, 106.6880);

-- =================================================================
-- KHỐI 9: LẦN 7 - HỌC SINH 61-70 (QUẬN 3 + QUẬN 8)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Văn Thắng', 'phuhuynh61@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000161', 'phu_huynh'),
('Trần Thị Hạnh', 'phuhuynh62@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000162', 'phu_huynh'),
('Lê Văn Phong', 'phuhuynh63@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000163', 'phu_huynh'),
('Phạm Thị Nhung', 'phuhuynh64@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000164', 'phu_huynh'),
('Ngô Văn Hưng', 'phuhuynh65@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000165', 'phu_huynh'),
('Võ Thị Dung', 'phuhuynh66@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000166', 'phu_huynh'),
('Hoàng Văn Quang', 'phuhuynh67@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000167', 'phu_huynh'),
('Lý Thị Thảo', 'phuhuynh68@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000168', 'phu_huynh'),
('Đặng Văn Sơn', 'phuhuynh69@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000169', 'phu_huynh'),
('Bùi Thị Loan', 'phuhuynh70@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000170', 'phu_huynh');

SET @phuhuynh_start_7 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Nguyễn Gia Bảo', '2015-06-03', '5A', @phuhuynh_start_7 + 0, '145 Võ Văn Tần, Phường 6, Quận 3, TP.HCM', 10.7901, 106.6901),
('Trần Khánh Linh', '2014-10-19', '6B', @phuhuynh_start_7 + 1, '167 Lý Chính Thắng, Phường 8, Quận 3, TP.HCM', 10.7921, 106.6921),
('Lê Quang Huy', '2013-07-26', '7A', @phuhuynh_start_7 + 2, '189 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM', 10.7851, 106.6851),
('Phạm Minh Anh', '2015-03-13', '5B', @phuhuynh_start_7 + 3, '201 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 10.7871, 106.6871),
('Ngô Thị Lan', '2014-09-30', '6A', @phuhuynh_start_7 + 4, '223 Cách Mạng Tháng 8, Phường 10, Quận 3, TP.HCM', 10.7881, 106.6881),
('Võ Đức Minh', '2013-11-17', '7B', @phuhuynh_start_7 + 5, '45 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.7400, 106.6600),
('Hoàng Thị Hoa', '2015-01-04', '5C', @phuhuynh_start_7 + 6, '67 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.7420, 106.6620),
('Lý Văn Đức', '2014-08-21', '6C', @phuhuynh_start_7 + 7, '89 Tạ Quang Bửu, Phường 5, Quận 8, TP.HCM', 10.7350, 106.6550),
('Trần Thị Mai', '2013-05-08', '7C', @phuhuynh_start_7 + 8, '101 Bùi Minh Trực, Phường 6, Quận 8, TP.HCM', 10.7370, 106.6570),
('Nguyễn Văn Tùng', '2015-10-15', '5D', @phuhuynh_start_7 + 9, '123 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.7401, 106.6601);

-- =================================================================
-- KHỐI 10: LẦN 8 - HỌC SINH 71-80 (QUẬN 8 + QUẬN 10)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lương Văn Cường', 'phuhuynh71@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000171', 'phu_huynh'),
('Đỗ Thị Mai', 'phuhuynh72@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000172', 'phu_huynh'),
('Bùi Văn Hải', 'phuhuynh73@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000173', 'phu_huynh'),
('Vũ Thị Hoa', 'phuhuynh74@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000174', 'phu_huynh'),
('Dương Văn Nam', 'phuhuynh75@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000175', 'phu_huynh'),
('Trịnh Thị Nga', 'phuhuynh76@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000176', 'phu_huynh'),
('Hồ Văn Long', 'phuhuynh77@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000177', 'phu_huynh'),
('Mai Thị Hương', 'phuhuynh78@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000178', 'phu_huynh'),
('Cao Văn Đức', 'phuhuynh79@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000179', 'phu_huynh'),
('Tạ Thị Loan', 'phuhuynh80@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000180', 'phu_huynh');

SET @phuhuynh_start_8 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Lương Gia Khang', '2015-02-11', '5A', @phuhuynh_start_8 + 0, '145 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.7421, 106.6621),
('Đỗ Thảo Vy', '2014-05-26', '6B', @phuhuynh_start_8 + 1, '167 Tạ Quang Bửu, Phường 5, Quận 8, TP.HCM', 10.7351, 106.6551),
('Bùi Gia Hân', '2013-09-07', '7A', @phuhuynh_start_8 + 2, '189 Bùi Minh Trực, Phường 6, Quận 8, TP.HCM', 10.7371, 106.6571),
('Vũ Đức An', '2015-11-20', '5B', @phuhuynh_start_8 + 3, '201 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.7402, 106.6602),
('Dương Minh Tuấn', '2014-08-04', '6A', @phuhuynh_start_8 + 4, '223 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.7422, 106.6622),
('Trịnh Thị Hương', '2013-03-12', '7B', @phuhuynh_start_8 + 5, '45 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7700, 106.6700),
('Hồ Quang Minh', '2015-07-24', '5C', @phuhuynh_start_8 + 6, '67 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.7710, 106.6710),
('Mai Văn Đức', '2014-12-10', '6C', @phuhuynh_start_8 + 7, '89 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM', 10.7650, 106.6650),
('Cao Thị Lan', '2013-01-23', '7C', @phuhuynh_start_8 + 8, '101 Sư Vạn Hạnh, Phường 9, Quận 10, TP.HCM', 10.7660, 106.6660),
('Tạ Văn Huy', '2015-04-09', '5D', @phuhuynh_start_8 + 9, '123 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7701, 106.6701);

-- =================================================================
-- KHỐI 11: LẦN 9 - HỌC SINH 81-90 (QUẬN 10 + QUẬN 11)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Lưu Văn Cường', 'phuhuynh81@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000181', 'phu_huynh'),
('Đinh Thị Mai', 'phuhuynh82@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000182', 'phu_huynh'),
('Phan Văn Hải', 'phuhuynh83@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000183', 'phu_huynh'),
('Vương Thị Hoa', 'phuhuynh84@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000184', 'phu_huynh'),
('Tôn Văn Nam', 'phuhuynh85@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000185', 'phu_huynh'),
('Lâm Thị Nga', 'phuhuynh86@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000186', 'phu_huynh'),
('Chu Văn Long', 'phuhuynh87@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000187', 'phu_huynh'),
('Hà Thị Hương', 'phuhuynh88@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000188', 'phu_huynh'),
('Quách Văn Đức', 'phuhuynh89@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000189', 'phu_huynh'),
('Lý Văn Tuấn', 'phuhuynh90@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000190', 'phu_huynh');

SET @phuhuynh_start_9 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Lưu Gia Bảo', '2015-06-18', '5A', @phuhuynh_start_9 + 0, '145 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.7711, 106.6711),
('Đinh Khánh Linh', '2014-10-04', '6B', @phuhuynh_start_9 + 1, '167 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM', 10.7651, 106.6651),
('Phan Quang Huy', '2013-07-21', '7A', @phuhuynh_start_9 + 2, '189 Sư Vạn Hạnh, Phường 9, Quận 10, TP.HCM', 10.7661, 106.6661),
('Vương Minh Anh', '2015-03-28', '5B', @phuhuynh_start_9 + 3, '201 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7702, 106.6702),
('Tôn Thị Lan', '2014-09-14', '6A', @phuhuynh_start_9 + 4, '223 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.7712, 106.6712),
('Lâm Đức Minh', '2013-11-01', '7B', @phuhuynh_start_9 + 5, '45 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7600, 106.6500),
('Chu Thị Hoa', '2015-01-16', '5C', @phuhuynh_start_9 + 6, '67 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7620, 106.6520),
('Hà Văn Đức', '2014-08-02', '6C', @phuhuynh_start_9 + 7, '89 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7601, 106.6501),
('Quách Thị Mai', '2013-05-20', '7C', @phuhuynh_start_9 + 8, '101 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7621, 106.6521),
('Lý Văn Tùng', '2015-10-27', '5D', @phuhuynh_start_9 + 9, '123 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7602, 106.6502);

-- =================================================================
-- KHỐI 12: LẦN 10 - HỌC SINH 91-100 (QUẬN 11 + NHÀ BÈ + BÌNH THẠNH)
-- =================================================================

INSERT INTO NguoiDung (hoTen, email, matKhau, soDienThoai, vaiTro) VALUES
('Nguyễn Văn Thắng', 'phuhuynh91@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000191', 'phu_huynh'),
('Trần Thị Hạnh', 'phuhuynh92@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000192', 'phu_huynh'),
('Lê Văn Phong', 'phuhuynh93@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000193', 'phu_huynh'),
('Phạm Thị Nhung', 'phuhuynh94@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000194', 'phu_huynh'),
('Ngô Văn Hưng', 'phuhuynh95@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000195', 'phu_huynh'),
('Võ Thị Dung', 'phuhuynh96@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000196', 'phu_huynh'),
('Hoàng Văn Quang', 'phuhuynh97@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000197', 'phu_huynh'),
('Lý Thị Thảo', 'phuhuynh98@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000198', 'phu_huynh'),
('Đặng Văn Sơn', 'phuhuynh99@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000199', 'phu_huynh'),
('Bùi Thị Loan', 'phuhuynh100@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000200', 'phu_huynh');

SET @phuhuynh_start_10 := LAST_INSERT_ID();

INSERT INTO HocSinh (hoTen, ngaySinh, lop, maPhuHuynh, diaChi, viDo, kinhDo) VALUES
('Nguyễn Gia Khang', '2015-02-25', '5A', @phuhuynh_start_10 + 0, '145 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7622, 106.6522),
('Trần Thảo Vy', '2014-05-16', '6B', @phuhuynh_start_10 + 1, '167 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7603, 106.6503),
('Lê Gia Hân', '2013-09-28', '7A', @phuhuynh_start_10 + 2, '189 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7623, 106.6523),
('Phạm Đức An', '2015-11-13', '5B', @phuhuynh_start_10 + 3, '45 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6972, 106.7041),
('Ngô Minh Tuấn', '2014-08-27', '6A', @phuhuynh_start_10 + 4, '67 Nguyễn Hữu Thọ, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6950, 106.7020),
('Võ Thị Hương', '2013-03-05', '7B', @phuhuynh_start_10 + 5, '89 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6973, 106.7042),
('Hoàng Quang Minh', '2015-07-19', '5C', @phuhuynh_start_10 + 6, '101 Nguyễn Hữu Thọ, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6951, 106.7021),
('Lý Văn Đức', '2014-12-03', '6C', @phuhuynh_start_10 + 7, '123 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6974, 106.7043),
('Đặng Thị Lan', '2013-01-15', '7C', @phuhuynh_start_10 + 8, '45 Xô Viết Nghệ Tĩnh, Phường 25, Quận Bình Thạnh, TP.HCM', 10.8100, 106.7100),
('Bùi Văn Huy', '2015-04-30', '5D', @phuhuynh_start_10 + 9, '67 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP.HCM', 10.8105, 106.7105);

-- =================================================================
-- KHỐI 13: ĐIỂM DỪNG (TRẠM) - Clustering từ địa chỉ học sinh
-- =================================================================
-- Tạo các trạm dừng dựa trên clustering địa chỉ học sinh gần nhau
-- Xe buýt chỉ chạy đường lớn, học sinh sẽ đến trạm gần nhất

-- Điểm đến cuối: Đại học Sài Gòn
INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address, scheduled_time) VALUES
('Đại học Sài Gòn', 10.7602396, 106.6807235, '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', NULL);

SET @school_stop_id := LAST_INSERT_ID();

-- Tạo các trạm dừng cho học sinh (clustering theo quận và đường lớn)
-- Mỗi trạm phục vụ nhiều học sinh gần nhau
INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address, scheduled_time) VALUES
-- Quận 7 - Trạm 1-3
('Trạm Nguyễn Văn Linh - Tân Phong', 10.7345, 106.7212, 'Ngã tư Nguyễn Văn Linh - Tân Phong, Quận 7', NULL),
('Trạm Huỳnh Tấn Phát - Tân Thuận', 10.7400, 106.7150, 'Ngã tư Huỳnh Tấn Phát - Tân Thuận Đông, Quận 7', NULL),
('Trạm Lê Văn Việt - Tân Kiểng', 10.7450, 106.7100, 'Ngã tư Lê Văn Việt - Tân Kiểng, Quận 7', NULL),
-- Quận 4 - Trạm 4-5
('Trạm Khánh Hội - Quận 4', 10.7575, 106.7049, 'Ngã tư Khánh Hội, Quận 4', NULL),
('Trạm Nguyễn Tất Thành - Quận 4', 10.7500, 106.7080, 'Ngã tư Nguyễn Tất Thành, Quận 4', NULL),
-- Quận 1 - Trạm 6-8
('Trạm Nguyễn Du - Lê Lợi', 10.7750, 106.7000, 'Ngã tư Nguyễn Du - Lê Lợi, Quận 1', NULL),
('Trạm Đồng Khởi - Nguyễn Huệ', 10.7720, 106.7020, 'Ngã tư Đồng Khởi - Nguyễn Huệ, Quận 1', NULL),
('Trạm Pasteur - Bến Nghé', 10.7800, 106.6950, 'Ngã tư Pasteur - Bến Nghé, Quận 1', NULL),
-- Quận 2 - Trạm 9-10
('Trạm Mai Chí Thọ - An Phú', 10.7850, 106.7350, 'Ngã tư Mai Chí Thọ - An Phú, Quận 2', NULL),
('Trạm Thảo Điền - Quận 2', 10.8000, 106.7400, 'Khu Thảo Điền, Quận 2', NULL),
-- Quận 3 - Trạm 11-12
('Trạm Võ Văn Tần - Quận 3', 10.7900, 106.6900, 'Ngã tư Võ Văn Tần - Lý Chính Thắng, Quận 3', NULL),
('Trạm Nguyễn Đình Chiểu - Quận 3', 10.7850, 106.6850, 'Ngã tư Nguyễn Đình Chiểu - Lê Văn Sỹ, Quận 3', NULL),
-- Quận 8 - Trạm 13-14
('Trạm Dương Bá Trạc - Quận 8', 10.7400, 106.6600, 'Ngã tư Dương Bá Trạc - Phạm Hùng, Quận 8', NULL),
('Trạm Tạ Quang Bửu - Quận 8', 10.7350, 106.6550, 'Ngã tư Tạ Quang Bửu - Bùi Minh Trực, Quận 8', NULL),
-- Quận 10 - Trạm 15-16
('Trạm Lý Thái Tổ - Quận 10', 10.7700, 106.6700, 'Ngã tư Lý Thái Tổ - 3 Tháng 2, Quận 10', NULL),
('Trạm Nguyễn Tri Phương - Quận 10', 10.7650, 106.6650, 'Ngã tư Nguyễn Tri Phương - Sư Vạn Hạnh, Quận 10', NULL),
-- Quận 11 - Trạm 17
('Trạm Lạc Long Quân - Quận 11', 10.7600, 106.6500, 'Ngã tư Lạc Long Quân - Tân Hương, Quận 11', NULL),
-- Nhà Bè - Trạm 18-19
('Trạm Lê Văn Lương - Nhà Bè', 10.6972, 106.7041, 'Ngã tư Lê Văn Lương - Nguyễn Hữu Thọ, Nhà Bè', NULL),
('Trạm Phú Xuân - Nhà Bè', 10.6900, 106.7000, 'Khu dân cư Phú Xuân, Nhà Bè', NULL),
-- Bình Thạnh - Trạm 20
('Trạm Xô Viết Nghệ Tĩnh - Bình Thạnh', 10.8100, 106.7100, 'Ngã tư Xô Viết Nghệ Tĩnh - Điện Biên Phủ, Bình Thạnh', NULL);

-- =================================================================
-- KHỐI 14: PHÂN BỔ HỌC SINH VÀO 10 TUYẾN (mỗi tuyến 20-30 học sinh)
-- =================================================================
-- Tạo bảng tạm để mapping học sinh -> trạm -> tuyến
-- Tuyến 1: Quận 7 (học sinh 1-20) -> 3 trạm -> Đại học Sài Gòn
-- Tuyến 2: Quận 4 (học sinh 21-30) + Quận 7 (học sinh 11-20) -> 5 trạm -> Đại học Sài Gòn
-- Tuyến 3: Quận 1 (học sinh 31-50) -> 3 trạm -> Đại học Sài Gòn
-- Tuyến 4: Quận 2 (học sinh 41-60) -> 2 trạm -> Đại học Sài Gòn
-- Tuyến 5: Quận 3 (học sinh 51-70) -> 2 trạm -> Đại học Sài Gòn
-- Tuyến 6: Quận 8 (học sinh 61-80) -> 2 trạm -> Đại học Sài Gòn
-- Tuyến 7: Quận 10 (học sinh 71-90) -> 2 trạm -> Đại học Sài Gòn
-- Tuyến 8: Quận 11 (học sinh 81-100) -> 1 trạm -> Đại học Sài Gòn
-- Tuyến 9: Nhà Bè (học sinh 91-100) -> 2 trạm -> Đại học Sài Gòn
-- Tuyến 10: Bình Thạnh (học sinh 91-100) + Quận 7 (học sinh 1-10) -> 2 trạm -> Đại học Sài Gòn

-- Tạo bảng tạm để lưu mapping học sinh -> trạm
CREATE TEMPORARY TABLE temp_student_stop_mapping (
    maHocSinh INT,
    maDiem INT,
    tenDiem VARCHAR(255),
    route_number INT
);

-- Mapping học sinh vào trạm dựa trên địa chỉ
-- Tuyến 1: Quận 7 (học sinh 1-20) - 3 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 1
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Nguyễn Văn Linh%' AND hs.diaChi LIKE '%Tân Phong%' AND d.tenDiem = 'Trạm Nguyễn Văn Linh - Tân Phong') OR
    (hs.diaChi LIKE '%Huỳnh Tấn Phát%' AND hs.diaChi LIKE '%Tân Thuận%' AND d.tenDiem = 'Trạm Huỳnh Tấn Phát - Tân Thuận') OR
    (hs.diaChi LIKE '%Lê Văn Việt%' AND hs.diaChi LIKE '%Tân Kiểng%' AND d.tenDiem = 'Trạm Lê Văn Việt - Tân Kiểng')
)
WHERE hs.diaChi LIKE '%Quận 7%' AND hs.maHocSinh BETWEEN 1 AND 20;

-- Tuyến 2: Quận 4 (học sinh 21-30) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 2
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Khánh Hội%' AND d.tenDiem = 'Trạm Khánh Hội - Quận 4') OR
    (hs.diaChi LIKE '%Nguyễn Tất Thành%' AND d.tenDiem = 'Trạm Nguyễn Tất Thành - Quận 4')
)
WHERE hs.diaChi LIKE '%Quận 4%' AND hs.maHocSinh BETWEEN 21 AND 30;

-- Tuyến 3: Quận 1 (học sinh 31-50) - 3 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 3
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Nguyễn Du%' AND d.tenDiem = 'Trạm Nguyễn Du - Lê Lợi') OR
    (hs.diaChi LIKE '%Đồng Khởi%' AND d.tenDiem = 'Trạm Đồng Khởi - Nguyễn Huệ') OR
    (hs.diaChi LIKE '%Pasteur%' AND d.tenDiem = 'Trạm Pasteur - Bến Nghé')
)
WHERE hs.diaChi LIKE '%Quận 1%' AND hs.maHocSinh BETWEEN 31 AND 50;

-- Tuyến 4: Quận 2 (học sinh 41-60) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 4
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Mai Chí Thọ%' AND d.tenDiem = 'Trạm Mai Chí Thọ - An Phú') OR
    (hs.diaChi LIKE '%Thảo Điền%' AND d.tenDiem = 'Trạm Thảo Điền - Quận 2')
)
WHERE hs.diaChi LIKE '%Quận 2%' AND hs.maHocSinh BETWEEN 41 AND 60;

-- Tuyến 5: Quận 3 (học sinh 51-70) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 5
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Võ Văn Tần%' AND d.tenDiem = 'Trạm Võ Văn Tần - Quận 3') OR
    (hs.diaChi LIKE '%Nguyễn Đình Chiểu%' AND d.tenDiem = 'Trạm Nguyễn Đình Chiểu - Quận 3')
)
WHERE hs.diaChi LIKE '%Quận 3%' AND hs.maHocSinh BETWEEN 51 AND 70;

-- Tuyến 6: Quận 8 (học sinh 61-80) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 6
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Dương Bá Trạc%' AND d.tenDiem = 'Trạm Dương Bá Trạc - Quận 8') OR
    (hs.diaChi LIKE '%Tạ Quang Bửu%' AND d.tenDiem = 'Trạm Tạ Quang Bửu - Quận 8')
)
WHERE hs.diaChi LIKE '%Quận 8%' AND hs.maHocSinh BETWEEN 61 AND 80;

-- Tuyến 7: Quận 10 (học sinh 71-90) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 7
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Lý Thái Tổ%' AND d.tenDiem = 'Trạm Lý Thái Tổ - Quận 10') OR
    (hs.diaChi LIKE '%Nguyễn Tri Phương%' AND d.tenDiem = 'Trạm Nguyễn Tri Phương - Quận 10')
)
WHERE hs.diaChi LIKE '%Quận 10%' AND hs.maHocSinh BETWEEN 71 AND 90;

-- Tuyến 8: Quận 11 (học sinh 81-100) - 1 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 8
FROM HocSinh hs
JOIN DiemDung d ON d.tenDiem = 'Trạm Lạc Long Quân - Quận 11'
WHERE hs.diaChi LIKE '%Quận 11%' AND hs.maHocSinh BETWEEN 81 AND 100;

-- Tuyến 9: Nhà Bè (học sinh 91-100) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 9
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Lê Văn Lương%' AND d.tenDiem = 'Trạm Lê Văn Lương - Nhà Bè') OR
    (hs.diaChi LIKE '%Phú Xuân%' AND d.tenDiem = 'Trạm Phú Xuân - Nhà Bè')
)
WHERE hs.diaChi LIKE '%Nhà Bè%' AND hs.maHocSinh BETWEEN 91 AND 100;

-- Tuyến 10: Bình Thạnh (học sinh 91-100) + Quận 7 (học sinh 1-10) - 2 trạm
INSERT INTO temp_student_stop_mapping (maHocSinh, maDiem, tenDiem, route_number)
SELECT hs.maHocSinh, d.maDiem, d.tenDiem, 10
FROM HocSinh hs
JOIN DiemDung d ON (
    (hs.diaChi LIKE '%Bình Thạnh%' AND d.tenDiem = 'Trạm Xô Viết Nghệ Tĩnh - Bình Thạnh') OR
    (hs.diaChi LIKE '%Quận 7%' AND hs.maHocSinh BETWEEN 1 AND 10 AND d.tenDiem = 'Trạm Nguyễn Văn Linh - Tân Phong')
)
WHERE (hs.diaChi LIKE '%Bình Thạnh%' OR (hs.diaChi LIKE '%Quận 7%' AND hs.maHocSinh BETWEEN 1 AND 10)) AND hs.maHocSinh BETWEEN 1 AND 100;

-- =================================================================
-- KHỐI 15: TẠO TUYẾN ĐƯỜNG ĐI (don_sang) - 10 tuyến
-- =================================================================
-- Mỗi tuyến có 20-30 điểm dừng (trạm + trường)
-- Điểm cuối: Đại học Sài Gòn

-- INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, origin_lat, origin_lng, dest_lat, dest_lng, polyline) VALUES
-- ('Tuyến 1 - Đi', 'Khu vực Quận 7', 'Đại học Sài Gòn', 45, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 2 - Đi', 'Khu vực Quận 4', 'Đại học Sài Gòn', 40, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 3 - Đi', 'Khu vực Quận 1', 'Đại học Sài Gòn', 35, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 4 - Đi', 'Khu vực Quận 2', 'Đại học Sài Gòn', 50, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 5 - Đi', 'Khu vực Quận 3', 'Đại học Sài Gòn', 30, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 6 - Đi', 'Khu vực Quận 8', 'Đại học Sài Gòn', 40, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 7 - Đi', 'Khu vực Quận 10', 'Đại học Sài Gòn', 35, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 8 - Đi', 'Khu vực Quận 11', 'Đại học Sài Gòn', 40, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 9 - Đi', 'Khu vực Nhà Bè', 'Đại học Sài Gòn', 55, NULL, NULL, 10.7602396, 106.6807235, NULL),
-- ('Tuyến 10 - Đi', 'Khu vực Bình Thạnh', 'Đại học Sài Gòn', 50, NULL, NULL, 10.7602396, 106.6807235, NULL);

-- -- Tạo tuyến về (tra_chieu) - 10 tuyến
-- INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, origin_lat, origin_lng, dest_lat, dest_lng, polyline) VALUES
-- ('Tuyến 1 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 7', 45, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 2 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 4', 40, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 3 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 1', 35, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 4 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 2', 50, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 5 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 3', 30, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 6 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 8', 40, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 7 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 10', 35, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 8 - Về', 'Đại học Sài Gòn', 'Khu vực Quận 11', 40, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 9 - Về', 'Đại học Sài Gòn', 'Khu vực Nhà Bè', 55, 10.7602396, 106.6807235, NULL, NULL, NULL),
-- ('Tuyến 10 - Về', 'Đại học Sài Gòn', 'Khu vực Bình Thạnh', 50, 10.7602396, 106.6807235, NULL, NULL, NULL);

-- =================================================================
-- KHỐI 16: ROUTE_STOPS - Tuyến đi (don_sang)
-- =================================================================
-- Tuyến 1 - Đi: Quận 7 -> Đại học Sài Gòn
-- Lấy các trạm từ temp_student_stop_mapping cho route_number = 1
-- Sắp xếp theo khoảng cách từ xa đến gần trường (đơn giản: sắp xếp theo viDo tăng dần)
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 1, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 1
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Thêm điểm cuối: Đại học Sài Gòn
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 1, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 1), 60;

-- -- Tuyến 2 - Đi: Quận 4 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 2, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 2
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 2, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 2), 60;

-- -- Tuyến 3 - Đi: Quận 1 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 3, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 3
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 3, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 3), 60;

-- -- Tuyến 4 - Đi: Quận 2 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 4, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 4
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 4, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 4), 60;

-- -- Tuyến 5 - Đi: Quận 3 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 5, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 5
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 5, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 5), 60;

-- -- Tuyến 6 - Đi: Quận 8 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 6, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 6
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 6, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 6), 60;

-- -- Tuyến 7 - Đi: Quận 10 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 7, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 7
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 7, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 7), 60;

-- -- Tuyến 8 - Đi: Quận 11 -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 8, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 8
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 8, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 8), 60;

-- -- Tuyến 9 - Đi: Nhà Bè -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 9, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 9
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 9, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 9), 60;

-- -- Tuyến 10 - Đi: Bình Thạnh -> Đại học Sài Gòn
-- SET @seq := 0;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 10, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 10
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 10, @school_stop_id, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM route_stops WHERE route_id = 10), 60;

-- -- =================================================================
-- -- KHỐI 17: ROUTE_STOPS - Tuyến về (tra_chieu) - Sequence ngược lại
-- -- =================================================================
-- -- Tuyến về: Đại học Sài Gòn -> các trạm (sequence ngược lại tuyến đi)

-- -- Tuyến 1 - Về: Đại học Sài Gòn -> Quận 7 (sequence ngược lại)
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 11, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 11, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 1
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- -- Tuyến 2 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 12, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 12, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 2
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- -- Tuyến 3 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 13, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 13, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 3
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Tuyến 4 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 14, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 14, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 4
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Tuyến 5 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 15, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 15, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 5
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Tuyến 6 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 16, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 16, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 6
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- -- Tuyến 7 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 17, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 17, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 7
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Tuyến 8 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 18, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 18, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 8
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- Tuyến 9 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 19, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 19, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 9
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo DESC;

-- -- Tuyến 10 - Về
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 20, @school_stop_id, 1, 60;

-- SET @seq := 1;
-- INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
-- SELECT 20, tssm.maDiem, (@seq := @seq + 1), 30
-- FROM temp_student_stop_mapping tssm
-- JOIN DiemDung d ON d.maDiem = tssm.maDiem
-- WHERE tssm.route_number = 10
-- GROUP BY tssm.maDiem, d.viDo
-- ORDER BY d.viDo ASC;

-- -- =================================================================
-- -- KHỐI 18: BACKFILL ORIGIN/DEST CHO TUYẾN ĐƯỜNG
-- -- =================================================================

-- -- Update origin (stop có MIN(sequence))
-- UPDATE TuyenDuong r
-- JOIN route_stops rs_origin ON rs_origin.route_id = r.maTuyen
-- JOIN (
--     SELECT route_id, MIN(sequence) AS min_sequence
--     FROM route_stops
--     GROUP BY route_id
-- ) min_seq ON min_seq.route_id = rs_origin.route_id AND min_seq.min_sequence = rs_origin.sequence
-- JOIN DiemDung d_origin ON d_origin.maDiem = rs_origin.stop_id
-- SET r.origin_lat = d_origin.viDo, r.origin_lng = d_origin.kinhDo;

-- -- Update dest (stop có MAX(sequence))
-- UPDATE TuyenDuong r
-- JOIN route_stops rs_dest ON rs_dest.route_id = r.maTuyen
-- JOIN (
--     SELECT route_id, MAX(sequence) AS max_sequence
--     FROM route_stops
--     GROUP BY route_id
-- ) max_seq ON max_seq.route_id = rs_dest.route_id AND max_seq.max_sequence = rs_dest.sequence
-- JOIN DiemDung d_dest ON d_dest.maDiem = rs_dest.stop_id
-- SET r.dest_lat = d_dest.viDo, r.dest_lng = d_dest.kinhDo;

-- -- =================================================================
-- -- KHỐI 19: LỊCH TRÌNH MẪU
-- -- =================================================================
-- -- Tuyến đi (don_sang): maTuyen 1-10
-- -- Tuyến về (tra_chieu): maTuyen 11-20

-- INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
-- -- Sáng: đón học sinh (tuyến đi)
-- (1, 1, 2, 'don_sang', '06:30:00', '2025-11-12', TRUE),
-- (2, 2, 3, 'don_sang', '06:45:00', '2025-11-12', TRUE),
-- (3, 3, 4, 'don_sang', '07:00:00', '2025-11-12', TRUE),
-- (4, 4, 5, 'don_sang', '06:15:00', '2025-11-12', TRUE),
-- (5, 5, 6, 'don_sang', '07:15:00', '2025-11-12', TRUE),
-- (6, 6, 7, 'don_sang', '06:30:00', '2025-11-12', TRUE),
-- (7, 1, 2, 'don_sang', '07:00:00', '2025-11-12', TRUE),
-- (8, 2, 3, 'don_sang', '06:45:00', '2025-11-12', TRUE),
-- (9, 3, 4, 'don_sang', '06:00:00', '2025-11-12', TRUE),
-- (10, 4, 5, 'don_sang', '06:15:00', '2025-11-12', TRUE),
-- -- Chiều: trả học sinh (tuyến về)
-- (11, 1, 2, 'tra_chieu', '16:45:00', '2025-11-12', TRUE),
-- (12, 2, 3, 'tra_chieu', '17:00:00', '2025-11-12', TRUE),
-- (13, 3, 4, 'tra_chieu', '17:15:00', '2025-11-12', TRUE),
-- (14, 4, 5, 'tra_chieu', '16:30:00', '2025-11-12', TRUE),
-- (15, 5, 6, 'tra_chieu', '17:30:00', '2025-11-12', TRUE),
-- (16, 6, 7, 'tra_chieu', '16:45:00', '2025-11-12', TRUE),
-- (17, 1, 2, 'tra_chieu', '17:00:00', '2025-11-12', TRUE),
-- (18, 2, 3, 'tra_chieu', '17:15:00', '2025-11-12', TRUE),
-- (19, 3, 4, 'tra_chieu', '16:30:00', '2025-11-12', TRUE),
-- (20, 4, 5, 'tra_chieu', '16:45:00', '2025-11-12', TRUE);

-- -- =================================================================
-- -- KHỐI 20: SCHEDULE_STUDENT_STOPS - Gán học sinh vào schedule
-- -- =================================================================
-- -- Gán học sinh vào schedule với điểm dừng tương ứng
-- -- Lấy sequence của điểm dừng từ route_stops
-- -- Đảm bảo mỗi học sinh chỉ được gán vào một điểm dừng trong một schedule

-- -- Gán học sinh vào schedule đi (don_sang)
-- -- Chọn điểm dừng có sequence nhỏ nhất cho mỗi học sinh trong mỗi schedule
-- INSERT INTO schedule_student_stops (maLichTrinh, maHocSinh, thuTuDiem, maDiem)
-- SELECT 
--     lt.maLichTrinh,
--     tssm.maHocSinh,
--     MIN(rs.sequence) AS thuTuDiem,
--     -- Lấy maDiem tương ứng với sequence nhỏ nhất bằng cách sử dụng subquery
--     (SELECT tssm2.maDiem 
--      FROM temp_student_stop_mapping tssm2
--      JOIN route_stops rs2 ON rs2.route_id = lt.maTuyen AND rs2.stop_id = tssm2.maDiem
--      WHERE tssm2.maHocSinh = tssm.maHocSinh 
--        AND tssm2.route_number = tssm.route_number
--      ORDER BY rs2.sequence ASC
--      LIMIT 1
--     ) AS maDiem
-- FROM temp_student_stop_mapping tssm
-- JOIN LichTrinh lt ON lt.loaiChuyen = 'don_sang' AND lt.maTuyen = tssm.route_number AND lt.ngayChay = '2025-11-12'
-- JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = tssm.maDiem
-- GROUP BY lt.maLichTrinh, tssm.maHocSinh
-- ON DUPLICATE KEY UPDATE
--     thuTuDiem = VALUES(thuTuDiem),
--     maDiem = VALUES(maDiem),
--     ngayCapNhat = CURRENT_TIMESTAMP;

-- -- Gán học sinh vào schedule về (tra_chieu)
-- -- Chọn điểm dừng có sequence nhỏ nhất cho mỗi học sinh trong mỗi schedule
-- INSERT INTO schedule_student_stops (maLichTrinh, maHocSinh, thuTuDiem, maDiem)
-- SELECT 
--     lt.maLichTrinh,
--     tssm.maHocSinh,
--     MIN(rs.sequence) AS thuTuDiem,
--     -- Lấy maDiem tương ứng với sequence nhỏ nhất bằng cách sử dụng subquery
--     (SELECT tssm2.maDiem 
--      FROM temp_student_stop_mapping tssm2
--      JOIN route_stops rs2 ON rs2.route_id = lt.maTuyen AND rs2.stop_id = tssm2.maDiem
--      WHERE tssm2.maHocSinh = tssm.maHocSinh 
--        AND tssm2.route_number = tssm.route_number
--      ORDER BY rs2.sequence ASC
--      LIMIT 1
--     ) AS maDiem
-- FROM temp_student_stop_mapping tssm
-- JOIN LichTrinh lt ON lt.loaiChuyen = 'tra_chieu' AND lt.maTuyen = tssm.route_number + 10 AND lt.ngayChay = '2025-11-12'
-- JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = tssm.maDiem
-- GROUP BY lt.maLichTrinh, tssm.maHocSinh
-- ON DUPLICATE KEY UPDATE
--     thuTuDiem = VALUES(thuTuDiem),
--     maDiem = VALUES(maDiem),
--     ngayCapNhat = CURRENT_TIMESTAMP;

-- -- =================================================================
-- -- KHỐI 21: TRANGTHAIHOCSINH - Gán học sinh vào chuyến đi
-- -- =================================================================
-- -- Gán học sinh vào chuyến đi với thuTuDiemDon tương ứng với sequence của điểm dừng

-- -- Tạo chuyến đi mẫu từ lịch trình
-- INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu)
-- SELECT maLichTrinh, '2025-11-12', 'chua_khoi_hanh', NULL, NULL, 'Chuyến đi mẫu'
-- FROM LichTrinh
-- WHERE ngayChay = '2025-11-12';

-- -- Gán học sinh vào chuyến đi với thuTuDiemDon
-- -- Lấy sequence của điểm dừng từ route_stops
-- -- Tách riêng cho tuyến đi (don_sang) và tuyến về (tra_chieu) để tránh duplicate

-- -- Gán học sinh vào chuyến đi (don_sang)
-- -- GROUP BY để đảm bảo mỗi học sinh chỉ được gán một lần cho mỗi chuyến đi
-- INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu)
-- SELECT 
--     cd.maChuyen,
--     tssm.maHocSinh,
--     MIN(rs.sequence) AS thuTuDiemDon,  -- Lấy sequence nhỏ nhất nếu có nhiều stops
--     'cho_don' AS trangThai,
--     NULL AS thoiGianThucTe,
--     NULL AS ghiChu
-- FROM temp_student_stop_mapping tssm
-- JOIN LichTrinh lt ON lt.loaiChuyen = 'don_sang' AND lt.maTuyen = tssm.route_number
-- JOIN ChuyenDi cd ON cd.maLichTrinh = lt.maLichTrinh AND cd.ngayChay = '2025-11-12'
-- JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = tssm.maDiem
-- WHERE lt.ngayChay = '2025-11-12'
-- GROUP BY cd.maChuyen, tssm.maHocSinh;

-- -- Gán học sinh vào chuyến về (tra_chieu)
-- -- GROUP BY để đảm bảo mỗi học sinh chỉ được gán một lần cho mỗi chuyến đi
-- INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai, thoiGianThucTe, ghiChu)
-- SELECT 
--     cd.maChuyen,
--     tssm.maHocSinh,
--     MIN(rs.sequence) AS thuTuDiemDon,  -- Lấy sequence nhỏ nhất nếu có nhiều stops
--     'cho_don' AS trangThai,
--     NULL AS thoiGianThucTe,
--     NULL AS ghiChu
-- FROM temp_student_stop_mapping tssm
-- JOIN LichTrinh lt ON lt.loaiChuyen = 'tra_chieu' AND lt.maTuyen = tssm.route_number + 10
-- JOIN ChuyenDi cd ON cd.maLichTrinh = lt.maLichTrinh AND cd.ngayChay = '2025-11-12'
-- JOIN route_stops rs ON rs.route_id = lt.maTuyen AND rs.stop_id = tssm.maDiem
-- WHERE lt.ngayChay = '2025-11-12'
-- GROUP BY cd.maChuyen, tssm.maHocSinh;

-- -- Xóa bảng tạm
-- DROP TEMPORARY TABLE IF EXISTS temp_student_stop_mapping;

-- -- =================================================================
-- -- KHỐI 22: VALIDATION & KIỂM TRA
-- -- =================================================================

-- -- Đếm số lượng
-- SELECT '=== THỐNG KÊ DỮ LIỆU ===' as info;
-- SELECT COUNT(*) AS totalHocSinh FROM HocSinh;
-- SELECT COUNT(*) AS totalPhuHuynh FROM NguoiDung WHERE vaiTro = 'phu_huynh';
-- SELECT COUNT(*) AS totalTaiXe FROM TaiXe;
-- SELECT COUNT(*) AS totalXeBuyt FROM XeBuyt;
-- SELECT COUNT(*) AS totalTuyenDuong FROM TuyenDuong;
-- SELECT COUNT(*) AS totalDiemDung FROM DiemDung;
-- SELECT COUNT(*) AS totalRouteStops FROM route_stops;
-- SELECT COUNT(*) AS totalLichTrinh FROM LichTrinh;
-- SELECT COUNT(*) AS totalChuyenDi FROM ChuyenDi;
-- SELECT COUNT(*) AS totalScheduleStudentStops FROM schedule_student_stops;

-- -- Kiểm tra phân bố học sinh theo quận
-- SELECT 
--     CASE 
--         WHEN diaChi LIKE '%Quận 7%' THEN 'Quận 7'
--         WHEN diaChi LIKE '%Quận 4%' THEN 'Quận 4'
--         WHEN diaChi LIKE '%Quận 1%' THEN 'Quận 1'       
--         WHEN diaChi LIKE '%Quận 2%' THEN 'Quận 2'
--         WHEN diaChi LIKE '%Quận 3%' THEN 'Quận 3'
--         WHEN diaChi LIKE '%Quận 8%' THEN 'Quận 8'
--         WHEN diaChi LIKE '%Quận 10%' THEN 'Quận 10'
--         WHEN diaChi LIKE '%Quận 11%' THEN 'Quận 11'
--         WHEN diaChi LIKE '%Nhà Bè%' THEN 'Nhà Bè'
--         WHEN diaChi LIKE '%Bình Thạnh%' THEN 'Bình Thạnh'
--         ELSE 'Khác'
--     END AS quan,
--     COUNT(*) AS soLuong
-- FROM HocSinh
-- GROUP BY quan
-- ORDER BY soLuong DESC;

-- -- Kiểm tra tuyến đường đã có origin/dest
-- SELECT maTuyen, tenTuyen, origin_lat, origin_lng, dest_lat, dest_lng
-- FROM TuyenDuong
-- ORDER BY maTuyen;

-- -- Kiểm tra số điểm dừng mỗi tuyến
-- SELECT t.maTuyen, t.tenTuyen, COUNT(rs.stop_id) AS soDiemDung
-- FROM TuyenDuong t
-- LEFT JOIN route_stops rs ON rs.route_id = t.maTuyen
-- GROUP BY t.maTuyen, t.tenTuyen
-- ORDER BY t.maTuyen;

-- -- Kiểm tra số học sinh mỗi tuyến (từ TrangThaiHocSinh)
-- SELECT 
--     lt.maTuyen,
--     t.tenTuyen,
--     lt.loaiChuyen,
--     COUNT(DISTINCT tths.maHocSinh) AS soHocSinh
-- FROM LichTrinh lt
-- JOIN TuyenDuong t ON t.maTuyen = lt.maTuyen
-- LEFT JOIN ChuyenDi cd ON cd.maLichTrinh = lt.maLichTrinh
-- LEFT JOIN TrangThaiHocSinh tths ON tths.maChuyen = cd.maChuyen
-- WHERE lt.ngayChay = '2025-11-12'
-- GROUP BY lt.maTuyen, t.tenTuyen, lt.loaiChuyen
-- ORDER BY lt.maTuyen;

-- -- Kiểm tra tuyến đi có điểm cuối là Đại học Sài Gòn
-- SELECT 
--     t.maTuyen,
--     t.tenTuyen,
--     d.tenDiem AS diemCuoi,
--     rs.sequence AS sequenceCuoi
-- FROM TuyenDuong t
-- JOIN route_stops rs ON rs.route_id = t.maTuyen
-- JOIN (
--     SELECT route_id, MAX(sequence) AS max_seq
--     FROM route_stops
--     GROUP BY route_id
-- ) max_seq ON max_seq.route_id = rs.route_id AND max_seq.max_seq = rs.sequence
-- JOIN DiemDung d ON d.maDiem = rs.stop_id
-- WHERE t.tenTuyen LIKE '%Đi%'
-- ORDER BY t.maTuyen;

-- -- Kiểm tra tuyến về có điểm đầu là Đại học Sài Gòn
-- SELECT 
--     t.maTuyen,
--     t.tenTuyen,
--     d.tenDiem AS diemDau,
--     rs.sequence AS sequenceDau
-- FROM TuyenDuong t
-- JOIN route_stops rs ON rs.route_id = t.maTuyen
-- JOIN (
--     SELECT route_id, MIN(sequence) AS min_seq
--     FROM route_stops
--     GROUP BY route_id
-- ) min_seq ON min_seq.route_id = rs.route_id AND min_seq.min_seq = rs.sequence
-- JOIN DiemDung d ON d.maDiem = rs.stop_id
-- WHERE t.tenTuyen LIKE '%Về%'
-- ORDER BY t.maTuyen;

-- SELECT 'Sample data (100 HỌC SINH TP.HCM - 10 TUYẾN ĐI/VỀ) inserted successfully!' as message;