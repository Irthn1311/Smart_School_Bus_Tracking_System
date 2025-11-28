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
('Bùi Văn Kiên', 'taixe7@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000011', 'tai_xe'),
('Vũ Văn Thanh',    'taixe08@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000021', 'tai_xe'),
('Nguyễn Tuấn Anh', 'taixe09@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000022', 'tai_xe'),
('Phan Văn Đức',    'taixe10@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000023', 'tai_xe'),
('Đỗ Hùng Dũng',    'taixe11@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000024', 'tai_xe'),
('Quế Ngọc Hải',    'taixe12@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000025', 'tai_xe'),
('Bùi Tiến Dũng',   'taixe13@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000026', 'tai_xe'),
('Nguyễn Quang Hải','taixe14@schoolbus.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0909000027', 'tai_xe');

INSERT INTO TaiXe (maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai) VALUES
(2, 'Trần Văn Tài', 'B2-123456789', '2028-05-20', 5, 'hoat_dong'),
(3, 'Lê Văn Hùng', 'B2-987654321', '2027-12-31', 8, 'hoat_dong'),
(4, 'Hoàng Văn Nam', 'B2-456789123', '2029-03-15', 3, 'hoat_dong'),
(5, 'Phạm Văn Đức', 'B2-789123456', '2028-08-10', 6, 'hoat_dong'),
(6, 'Võ Thành Long', 'B2-321654987', '2029-01-25', 4, 'hoat_dong'),
(7, 'Ngô Văn Sơn', 'B2-654987321', '2027-11-30', 7, 'hoat_dong'),
(8, 'Bùi Văn Kiên', 'B2-147258369', '2028-06-15', 5, 'hoat_dong'),
(9, 'Vũ Văn Thanh',    'B2-888111222', '2029-05-20', 6, 'hoat_dong'),
(10, 'Nguyễn Tuấn Anh', 'B2-888333444', '2028-11-15', 4, 'hoat_dong'),
(11, 'Phan Văn Đức',    'B2-888555666', '2030-01-10', 5, 'hoat_dong'),
(12, 'Đỗ Hùng Dũng',    'B2-888777888', '2027-08-22', 7, 'hoat_dong'),
(13, 'Quế Ngọc Hải',    'B2-888999000', '2028-12-30', 8, 'hoat_dong'),
(14, 'Bùi Tiến Dũng',   'B2-888000111', '2029-07-07', 3, 'hoat_dong'),
(15, 'Nguyễn Quang Hải','B2-888222333', '2030-04-12', 4, 'hoat_dong');

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
('51H-66666', 'Thaco Town', 28, 'hoat_dong'),
('51B-301.12', 'Samco Felix', 34, 'hoat_dong'),
('51B-302.25', 'Thaco Garden 79s', 29, 'hoat_dong'),
('51B-303.38', 'Hyundai Solati', 16, 'hoat_dong'),
('51B-304.41', 'Ford Transit', 16, 'bao_tri'), 
('51B-305.56', 'Thaco Meadow 85s', 29, 'hoat_dong'),
('51B-306.69', 'Hyundai New County', 29, 'hoat_dong'),
('51B-307.72', 'Toyota Hiace', 16, 'hoat_dong');

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
('Nguyễn Gia Bảo', '2015-06-15', '5A', @phuhuynh_start_1 + 0, '123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7292386, 106.7098433),
('Trần Khánh Linh', '2014-11-02', '6B', @phuhuynh_start_1 + 1, '125 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7292386, 106.7098444),
('Lê Quang Huy', '2013-08-20', '7A', @phuhuynh_start_1 + 2, '456 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.745138, 106.7290962),
('Phạm Minh Anh', '2015-03-10', '5B', @phuhuynh_start_1 + 3, '789 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7384643, 106.7134656),
('Ngô Thị Lan', '2014-09-25', '6A', @phuhuynh_start_1 + 4, '321 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7420707, 106.704021),
('Võ Đức Minh', '2013-12-05', '7B', @phuhuynh_start_1 + 5, '654 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7292472, 106.7101139),
('Hoàng Thị Hoa', '2015-01-18', '5C', @phuhuynh_start_1 + 6, '987 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7545072, 106.7284512),
('Lý Văn Đức', '2014-07-30', '6C', @phuhuynh_start_1 + 7, '147 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7485987, 106.7049111),
('Trần Thị Mai', '2013-04-12', '7C', @phuhuynh_start_1 + 8, '258 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7385119, 106.7150603),
('Nguyễn Văn Tùng', '2015-10-08', '5D', @phuhuynh_start_1 + 9, '369 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7505247, 106.7051507);

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
('Đỗ Minh Khang', '2015-02-14', '5A', @phuhuynh_start_2 + 0, '111 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7292384, 106.7098372),
('Bùi Thảo Vy', '2014-05-22', '6B', @phuhuynh_start_2 + 1, '222 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7550698, 106.7250086),
('Lương Gia Hân', '2013-09-11', '7A', @phuhuynh_start_2 + 2, '333 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7383393, 106.7147327),
('Vũ Đức An', '2015-11-30', '5B', @phuhuynh_start_2 + 3, '444 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7371106, 106.7031415),
('Dương Minh Tuấn', '2014-08-17', '6A', @phuhuynh_start_2 + 4, '555 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7292456, 106.7100635),
('Trịnh Thị Hương', '2013-03-25', '7B', @phuhuynh_start_2 + 5, '666 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.755069, 106.725013),
('Hồ Quang Minh', '2015-07-08', '5C', @phuhuynh_start_2 + 6, '777 Nguyễn Thị Thập, Phường Tân Thuận Tây, Quận 7, TP.HCM', 10.7384643, 106.7134656),
('Mai Văn Đức', '2014-12-19', '6C', @phuhuynh_start_2 + 7, '888 Lê Văn Việt, Phường Tân Kiểng, Quận 7, TP.HCM', 10.7152158, 106.7007766),
('Cao Thị Lan', '2013-01-06', '7C', @phuhuynh_start_2 + 8, '999 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 10.7290965, 106.7035172),
('Tạ Văn Huy', '2015-04-13', '5D', @phuhuynh_start_2 + 9, '1010 Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM', 10.7543973, 106.7279105);

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
('Lưu Gia Bảo', '2015-06-20', '5A', @phuhuynh_start_3 + 0, '45 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7542365, 106.7018965),
('Đinh Khánh Linh', '2014-10-15', '6B', @phuhuynh_start_3 + 1, '67 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7642, 106.7077048),
('Phan Quang Huy', '2013-07-22', '7A', @phuhuynh_start_3 + 2, '89 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7626386, 106.7029648),
('Vương Minh Anh', '2015-03-18', '5B', @phuhuynh_start_3 + 3, '12 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7609368, 106.6977063),
('Tôn Thị Lan', '2014-09-28', '6A', @phuhuynh_start_3 + 4, '34 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7663515, 106.7065652),
('Lâm Đức Minh', '2013-11-14', '7B', @phuhuynh_start_3 + 5, '56 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7639198, 106.7040346),
('Chu Thị Hoa', '2015-01-25', '5C', @phuhuynh_start_3 + 6, '78 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7547923, 106.7021484),
('Hà Văn Đức', '2014-08-05', '6C', @phuhuynh_start_3 + 7, '90 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7653569, 106.7069399),
('Quách Thị Mai', '2013-05-12', '7C', @phuhuynh_start_3 + 8, '23 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.7592643, 106.7023869),
('Lý Văn Tùng', '2015-10-30', '5D', @phuhuynh_start_3 + 9, '45 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.7542365, 106.7018965);

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
('Nguyễn Gia Khang', '2015-02-08', '5A', @phuhuynh_start_4 + 0, '112 Cầu Kênh Tẻ, Phường 4, Quận 4, TP.HCM', 10.7536306, 106.7021318),
('Trần Thảo Vy', '2014-05-19', '6B', @phuhuynh_start_4 + 1, '134 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.757462, 106.7002739),
('Lê Gia Hân', '2013-09-03', '7A', @phuhuynh_start_4 + 2, '156 Nguyễn Tất Thành, Phường 2, Quận 4, TP.HCM', 10.7633951, 106.7077708),
('Phạm Đức An', '2015-11-24', '5B', @phuhuynh_start_4 + 3, '178 Hoàng Diệu, Phường 3, Quận 4, TP.HCM', 10.762888, 106.702883),
('Ngô Minh Tuấn', '2014-08-11', '6A', @phuhuynh_start_4 + 4, '190 Khánh Hội, Phường 1, Quận 4, TP.HCM', 10.758495, 106.699597),
('Võ Thị Hương', '2013-03-17', '7B', @phuhuynh_start_4 + 5, '45 Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM', 10.780499, 106.7013816),
('Hoàng Quang Minh', '2015-07-29', '5C', @phuhuynh_start_4 + 6, '67 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', 10.7734026, 106.7008291),
('Lý Văn Đức', '2014-12-07', '6C', @phuhuynh_start_4 + 7, '89 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM', 10.7747064, 106.7044077),
('Đặng Thị Lan', '2013-01-21', '7C', @phuhuynh_start_4 + 8, '101 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 10.7735357, 106.7038137),
('Bùi Văn Huy', '2015-04-16', '5D', @phuhuynh_start_4 + 9, '123 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM', 10.781702, 106.6938115);

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
('Lương Gia Bảo', '2015-06-12', '5A', @phuhuynh_start_5 + 0, '145 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', 10.772169, 106.6998725),
('Đỗ Khánh Linh', '2014-10-28', '6B', @phuhuynh_start_5 + 1, '167 Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM', 10.7720732, 106.6926606),
('Bùi Quang Huy', '2013-07-15', '7A', @phuhuynh_start_5 + 2, '189 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM', 10.7765884, 106.7018913),
('Vũ Minh Anh', '2015-03-22', '5B', @phuhuynh_start_5 + 3, '201 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 10.7761791, 106.7010799),
('Dương Thị Lan', '2014-09-08', '6A', @phuhuynh_start_5 + 4, '223 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM', 10.7856388, 106.689827),
('Trịnh Đức Minh', '2013-11-26', '7B', @phuhuynh_start_5 + 5, '245 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM', 10.7901803, 106.7047591),
('Hồ Thị Hoa', '2015-01-14', '5C', @phuhuynh_start_5 + 6, '12 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.8033661, 106.752398),
('Mai Văn Đức', '2014-08-31', '6C', @phuhuynh_start_5 + 7, '34 Nguyễn Đức Cảnh, Phường An Phú, Quận 2, TP.HCM', 10.7987164, 106.738542),
('Cao Thị Mai', '2013-05-19', '7C', @phuhuynh_start_5 + 8, '56 Thảo Điền, Phường Thảo Điền, Quận 2, TP.HCM', 10.8083325, 106.7333191),
('Tạ Văn Tùng', '2015-10-05', '5D', @phuhuynh_start_5 + 9, '78 Nguyễn Thị Định, Phường Bình An, Quận 2, TP.HCM', 10.7842404, 106.760988);

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
('Lưu Gia Khang', '2015-02-18', '5A', @phuhuynh_start_6 + 0, '90 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.7961815, 106.7527792),
('Đinh Thảo Vy', '2014-05-29', '6B', @phuhuynh_start_6 + 1, '112 Nguyễn Đức Cảnh, Phường An Phú, Quận 2, TP.HCM', 10.7935216, 106.7308195),
('Phan Gia Hân', '2013-09-14', '7A', @phuhuynh_start_6 + 2, '134 Thảo Điền, Phường Thảo Điền, Quận 2, TP.HCM', 10.8087161, 106.7327733),
('Vương Đức An', '2015-11-07', '5B', @phuhuynh_start_6 + 3, '156 Nguyễn Thị Định, Phường Bình An, Quận 2, TP.HCM', 10.7878822, 106.7553505),
('Tôn Minh Tuấn', '2014-08-23', '6A', @phuhuynh_start_6 + 4, '178 Mai Chí Thọ, Phường An Phú, Quận 2, TP.HCM', 10.8076091, 106.7560988),
('Lâm Thị Hương', '2013-03-31', '7B', @phuhuynh_start_6 + 5, '45 Võ Văn Tần, Phường 6, Quận 3, TP.HCM', 10.7777802, 106.6915841),
('Chu Quang Minh', '2015-07-12', '5C', @phuhuynh_start_6 + 6, '67 Lý Chính Thắng, Phường 8, Quận 3, TP.HCM', 10.7787259, 106.6816889),
('Hà Văn Đức', '2014-12-28', '6C', @phuhuynh_start_6 + 7, '89 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM', 10.7797103, 106.6915166),
('Quách Thị Lan', '2013-01-09', '7C', @phuhuynh_start_6 + 8, '101 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 10.7875, 106.6738437),
('Lý Văn Huy', '2015-04-25', '5D', @phuhuynh_start_6 + 9, '123 Cách Mạng Tháng 8, Phường 10, Quận 3, TP.HCM', 10.7798144, 106.6800732);

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
('Nguyễn Gia Bảo', '2015-06-03', '5A', @phuhuynh_start_7 + 0, '145 Võ Văn Tần, Phường 6, Quận 3, TP.HCM', 10.7760587, 106.6900683),
('Trần Khánh Linh', '2014-10-19', '6B', @phuhuynh_start_7 + 1, '167 Lý Chính Thắng, Phường 8, Quận 3, TP.HCM', 10.7834191, 106.6842741),
('Lê Quang Huy', '2013-07-26', '7A', @phuhuynh_start_7 + 2, '189 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM', 10.7745151, 106.6864458),
('Phạm Minh Anh', '2015-03-13', '5B', @phuhuynh_start_7 + 3, '201 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', 10.7861414, 106.680524),
('Ngô Thị Lan', '2014-09-30', '6A', @phuhuynh_start_7 + 4, '223 Cách Mạng Tháng 8, Phường 10, Quận 3, TP.HCM', 10.7798697, 106.6778773),
('Võ Đức Minh', '2013-11-17', '7B', @phuhuynh_start_7 + 5, '45 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.749318, 106.6894797),
('Hoàng Thị Hoa', '2015-01-04', '5C', @phuhuynh_start_7 + 6, '67 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.740405, 106.6690003),
('Lý Văn Đức', '2014-08-21', '6C', @phuhuynh_start_7 + 7, '89 Tạ Quang Bửu, Phường 5, Quận 8, TP.HCM', 10.7375303, 106.6729944),
('Trần Thị Mai', '2013-05-08', '7C', @phuhuynh_start_7 + 8, '101 Bùi Minh Trực, Phường 6, Quận 8, TP.HCM', 10.7362793, 106.6533598),
('Nguyễn Văn Tùng', '2015-10-15', '5D', @phuhuynh_start_7 + 9, '123 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.7480284, 106.6888627);

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
('Lương Gia Khang', '2015-02-11', '5A', @phuhuynh_start_8 + 0, '145 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.742374, 106.6690492),
('Đỗ Thảo Vy', '2014-05-26', '6B', @phuhuynh_start_8 + 1, '167 Tạ Quang Bửu, Phường 5, Quận 8, TP.HCM', 10.7343374, 106.6629087),
('Bùi Gia Hân', '2013-09-07', '7A', @phuhuynh_start_8 + 2, '189 Bùi Minh Trực, Phường 6, Quận 8, TP.HCM', 10.7354622, 106.6512707),
('Vũ Đức An', '2015-11-20', '5B', @phuhuynh_start_8 + 3, '201 Dương Bá Trạc, Phường 1, Quận 8, TP.HCM', 10.7469159, 106.6895967),
('Dương Minh Tuấn', '2014-08-04', '6A', @phuhuynh_start_8 + 4, '223 Phạm Hùng, Phường 4, Quận 8, TP.HCM', 10.7363745, 106.6716351),
('Trịnh Thị Hương', '2013-03-12', '7B', @phuhuynh_start_8 + 5, '45 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7667371, 106.6767133),
('Hồ Quang Minh', '2015-07-24', '5C', @phuhuynh_start_8 + 6, '67 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.770232, 106.6607615),
('Mai Văn Đức', '2014-12-10', '6C', @phuhuynh_start_8 + 7, '89 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM', 10.7664396, 106.6675825),
('Cao Thị Lan', '2013-01-23', '7C', @phuhuynh_start_8 + 8, '101 Sư Vạn Hạnh, Phường 9, Quận 10, TP.HCM', 10.7628848, 106.6725218),
('Tạ Văn Huy', '2015-04-09', '5D', @phuhuynh_start_8 + 9, '123 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7675817, 106.6766846);

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
('Lưu Gia Bảo', '2015-06-18', '5A', @phuhuynh_start_9 + 0, '145 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.770232, 106.6607615),
('Đinh Khánh Linh', '2014-10-04', '6B', @phuhuynh_start_9 + 1, '167 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM', 10.7664503, 106.6675801),
('Phan Quang Huy', '2013-07-21', '7A', @phuhuynh_start_9 + 2, '189 Sư Vạn Hạnh, Phường 9, Quận 10, TP.HCM', 10.7648024, 106.6721109),
('Vương Minh Anh', '2015-03-28', '5B', @phuhuynh_start_9 + 3, '201 Lý Thái Tổ, Phường 1, Quận 10, TP.HCM', 10.7675108, 106.6731175),
('Tôn Thị Lan', '2014-09-14', '6A', @phuhuynh_start_9 + 4, '223 3 Tháng 2, Phường 12, Quận 10, TP.HCM', 10.7675955, 106.6670452),
('Lâm Đức Minh', '2013-11-01', '7B', @phuhuynh_start_9 + 5, '45 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7588122, 106.6405568),
('Chu Thị Hoa', '2015-01-16', '5C', @phuhuynh_start_9 + 6, '67 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7892812, 106.626626),
('Hà Văn Đức', '2014-08-02', '6C', @phuhuynh_start_9 + 7, '89 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7593427, 106.641484),
('Quách Thị Mai', '2013-05-20', '7C', @phuhuynh_start_9 + 8, '101 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7894398, 106.6257932),
('Lý Văn Tùng', '2015-10-27', '5D', @phuhuynh_start_9 + 9, '123 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7583374, 106.6382668);

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
('Nguyễn Gia Khang', '2015-02-25', '5A', @phuhuynh_start_10 + 0, '145 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.7895996, 106.624318),
('Trần Thảo Vy', '2014-05-16', '6B', @phuhuynh_start_10 + 1, '167 Lạc Long Quân, Phường 1, Quận 11, TP.HCM', 10.7626977, 106.6420024),
('Lê Gia Hân', '2013-09-28', '7A', @phuhuynh_start_10 + 2, '189 Tân Hương, Phường Tân Quy, Quận 11, TP.HCM', 10.789987, 106.621079),
('Phạm Đức An', '2015-11-13', '5B', @phuhuynh_start_10 + 3, '45 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.7045508, 106.7240446),
('Ngô Minh Tuấn', '2014-08-27', '6A', @phuhuynh_start_10 + 4, '67 Nguyễn Hữu Thọ, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.665507, 106.7259679),
('Võ Thị Hương', '2013-03-05', '7B', @phuhuynh_start_10 + 5, '89 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6951459, 106.7043254),
('Hoàng Quang Minh', '2015-07-19', '5C', @phuhuynh_start_10 + 6, '101 Nguyễn Hữu Thọ, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.6688103, 106.7251271),
('Lý Văn Đức', '2014-12-03', '6C', @phuhuynh_start_10 + 7, '123 Lê Văn Lương, Xã Phú Xuân, Huyện Nhà Bè, TP.HCM', 10.703064, 106.7041571),
('Đặng Thị Lan', '2013-01-15', '7C', @phuhuynh_start_10 + 8, '45 Xô Viết Nghệ Tĩnh, Phường 25, Quận Bình Thạnh, TP.HCM', 10.8029237, 106.7124877),
('Bùi Văn Huy', '2015-04-30', '5D', @phuhuynh_start_10 + 9, '67 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP.HCM', 10.8035563, 106.7131672);

-- =================================================================
-- KHỐI 13: ĐIỂM DỪNG (TRẠM) - Clustering từ địa chỉ học sinh
-- =================================================================
-- Tạo các trạm dừng dựa trên clustering địa chỉ học sinh gần nhau
-- Xe buýt chỉ chạy đường lớn, học sinh sẽ đến trạm gần nhất

-- -- Điểm đến cuối: Đại học Sài Gòn
-- INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address, scheduled_time) VALUES
-- ('Đại học Sài Gòn', 10.7600193, 106.6822534, '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', NULL);

-- SET @school_stop_id := LAST_INSERT_ID();

-- -- Tạo các trạm dừng cho học sinh (clustering theo quận và đường lớn)
-- -- Mỗi trạm phục vụ nhiều học sinh gần nhau
-- INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address, scheduled_time) VALUES
-- -- Quận 7 - Trạm 1-3
-- ('Trạm Nguyễn Văn Linh - Tân Phong', 10.7345, 106.7212, 'Ngã tư Nguyễn Văn Linh - Tân Phong, Quận 7', NULL),
-- ('Trạm Huỳnh Tấn Phát - Tân Thuận', 10.7400, 106.7150, 'Ngã tư Huỳnh Tấn Phát - Tân Thuận Đông, Quận 7', NULL),
-- ('Trạm Lê Văn Việt - Tân Kiểng', 10.7450, 106.7100, 'Ngã tư Lê Văn Việt - Tân Kiểng, Quận 7', NULL),
-- -- Quận 4 - Trạm 4-5
-- ('Trạm Khánh Hội - Quận 4', 10.7575, 106.7049, 'Ngã tư Khánh Hội, Quận 4', NULL),
-- ('Trạm Nguyễn Tất Thành - Quận 4', 10.7500, 106.7080, 'Ngã tư Nguyễn Tất Thành, Quận 4', NULL),
-- -- Quận 1 - Trạm 6-8
-- ('Trạm Nguyễn Du - Lê Lợi', 10.7750, 106.7000, 'Ngã tư Nguyễn Du - Lê Lợi, Quận 1', NULL),
-- ('Trạm Đồng Khởi - Nguyễn Huệ', 10.7720, 106.7020, 'Ngã tư Đồng Khởi - Nguyễn Huệ, Quận 1', NULL),
-- ('Trạm Pasteur - Bến Nghé', 10.7800, 106.6950, 'Ngã tư Pasteur - Bến Nghé, Quận 1', NULL),
-- -- Quận 2 - Trạm 9-10
-- ('Trạm Mai Chí Thọ - An Phú', 10.7850, 106.7350, 'Ngã tư Mai Chí Thọ - An Phú, Quận 2', NULL),
-- ('Trạm Thảo Điền - Quận 2', 10.8000, 106.7400, 'Khu Thảo Điền, Quận 2', NULL),
-- -- Quận 3 - Trạm 11-12
-- ('Trạm Võ Văn Tần - Quận 3', 10.7900, 106.6900, 'Ngã tư Võ Văn Tần - Lý Chính Thắng, Quận 3', NULL),
-- ('Trạm Nguyễn Đình Chiểu - Quận 3', 10.7850, 106.6850, 'Ngã tư Nguyễn Đình Chiểu - Lê Văn Sỹ, Quận 3', NULL),
-- -- Quận 8 - Trạm 13-14
-- ('Trạm Dương Bá Trạc - Quận 8', 10.7400, 106.6600, 'Ngã tư Dương Bá Trạc - Phạm Hùng, Quận 8', NULL),
-- ('Trạm Tạ Quang Bửu - Quận 8', 10.7350, 106.6550, 'Ngã tư Tạ Quang Bửu - Bùi Minh Trực, Quận 8', NULL),
-- -- Quận 10 - Trạm 15-16
-- ('Trạm Lý Thái Tổ - Quận 10', 10.7700, 106.6700, 'Ngã tư Lý Thái Tổ - 3 Tháng 2, Quận 10', NULL),
-- ('Trạm Nguyễn Tri Phương - Quận 10', 10.7650, 106.6650, 'Ngã tư Nguyễn Tri Phương - Sư Vạn Hạnh, Quận 10', NULL),
-- -- Quận 11 - Trạm 17
-- ('Trạm Lạc Long Quân - Quận 11', 10.7600, 106.6500, 'Ngã tư Lạc Long Quân - Tân Hương, Quận 11', NULL),
-- -- Nhà Bè - Trạm 18-19
-- ('Trạm Lê Văn Lương - Nhà Bè', 10.6972, 106.7041, 'Ngã tư Lê Văn Lương - Nguyễn Hữu Thọ, Nhà Bè', NULL),
-- ('Trạm Phú Xuân - Nhà Bè', 10.6900, 106.7000, 'Khu dân cư Phú Xuân, Nhà Bè', NULL),
-- -- Bình Thạnh - Trạm 20
-- ('Trạm Xô Viết Nghệ Tĩnh - Bình Thạnh', 10.8100, 106.7100, 'Ngã tư Xô Viết Nghệ Tĩnh - Điện Biên Phủ, Bình Thạnh', NULL);

-- =================================================================
-- NOTE: Các phần tạo routes, schedules, và student mappings đã được xóa
-- vì không còn phù hợp với schema mới (đã bỏ HocSinh_DiemDung).
-- File này chỉ seed dữ liệu cơ bản: users, drivers, buses, students, stops.
-- Routes và schedules sẽ được tạo thông qua API/admin interface.
-- =================================================================

SELECT 'Sample data (100 HỌC SINH TP.HCM) inserted successfully!' as message;