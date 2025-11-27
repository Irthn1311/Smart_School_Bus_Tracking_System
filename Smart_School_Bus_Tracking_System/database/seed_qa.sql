    -- =================================================================
    -- FILE: seed_qa.sql (Chạy SAU 01_init_db_ver2.sql và 02_sample_data.sql)
    -- MỤC ĐÍCH: Tạo dữ liệu test E2E cho Phạm Hồng Thái 
    -- DỮ LIỆU: 2 tuyến (mỗi tuyến >= 5 stops), 2 tài xế, 2 xe, 2 ngày
    -- =================================================================

    USE school_bus_system;

    -- Lấy các ID có sẵn từ file 02_sample_data.sql
    SET @school_stop_id = (SELECT maDiem FROM DiemDung WHERE tenDiem = 'Đại học Sài Gòn');
    SET @qa_driver_1 = 2; -- Trần Văn Tài
    SET @qa_driver_2 = 3; -- Lê Văn Hùng
    SET @qa_bus_1 = 1;    -- 51A-12345
    SET @qa_bus_2 = 2;    -- 51B-67890

    -- Ngày test (Hôm nay và Ngày mai)
    SET @qa_day_1 = '2025-11-14'; -- (Hôm nay, 14/11)
    SET @qa_day_2 = '2025-11-15'; -- (Ngày mai)

    -- =================================================================
    -- KHỐI 1: TẠO 10 ĐIỂM DỪNG MỚI (5 stops / tuyến)
    -- =================================================================
    INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address) VALUES
    ('QA Stop 1.1 - E2E', 10.730001, 106.710001, '111 QA Street, Quan 7'),
    ('QA Stop 1.2 - E2E', 10.732002, 106.712002, '222 QA Street, Quan 7'),
    ('QA Stop 1.3 - E2E', 10.734003, 106.714003, '333 QA Street, Quan 7'),
    ('QA Stop 1.4 - E2E', 10.736004, 106.716004, '444 QA Street, Quan 7'),
    ('QA Stop 1.5 - E2E', 10.738005, 106.718005, '555 QA Street, Quan 7'),
    ('QA Stop 2.1 - E2E', 10.750001, 106.700001, '666 QA Street, Quan 4'),
    ('QA Stop 2.2 - E2E', 10.752002, 106.702002, '777 QA Street, Quan 4'),
    ('QA Stop 2.3 - E2E', 10.754003, 106.704003, '888 QA Street, Quan 4'),
    ('QA Stop 2.4 - E2E', 10.756004, 106.706004, '999 QA Street, Quan 4'),
    ('QA Stop 2.5 - E2E', 10.758005, 106.708005, '1010 QA Street, Quan 4');

    -- Lấy ID của 10 stop vừa tạo
    SET @qa_stop_1_1 = LAST_INSERT_ID();
    SET @qa_stop_1_2 = @qa_stop_1_1 + 1;
    SET @qa_stop_1_3 = @qa_stop_1_1 + 2;
    SET @qa_stop_1_4 = @qa_stop_1_1 + 3;
    SET @qa_stop_1_5 = @qa_stop_1_1 + 4;
    SET @qa_stop_2_1 = @qa_stop_1_1 + 5;
    SET @qa_stop_2_2 = @qa_stop_1_1 + 6;
    SET @qa_stop_2_3 = @qa_stop_1_1 + 7;
    SET @qa_stop_2_4 = @qa_stop_1_1 + 8;
    SET @qa_stop_2_5 = @qa_stop_1_1 + 9;

    -- =================================================================
    -- KHỐI 2: TẠO 4 TUYẾN ĐƯỜNG MỚI (2 tuyến đi, 2 tuyến về)
    -- =================================================================
    INSERT INTO TuyenDuong (tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh) VALUES
    ('Tuyen QA 1 - Sang', 'QA Quan 7', 'ĐH Sài Gòn', 30),
    ('Tuyen QA 1 - Chieu', 'ĐH Sài Gòn', 'QA Quan 7', 30),
    ('Tuyen QA 2 - Sang', 'QA Quan 4', 'ĐH Sài Gòn', 25),
    ('Tuyen QA 2 - Chieu', 'ĐH Sài Gòn', 'QA Quan 4', 25);

    -- Lấy ID 4 tuyến vừa tạo
    SET @qa_route_1_sang = LAST_INSERT_ID();
    SET @qa_route_1_chieu = @qa_route_1_sang + 1;
    SET @qa_route_2_sang = @qa_route_1_sang + 2;
    SET @qa_route_2_chieu = @qa_route_1_sang + 3;

    -- =================================================================
    -- KHỐI 3: GÁN ĐIỂM DỪNG VÀO TUYẾN (route_stops)
    -- =================================================================
    INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds) VALUES
    -- Tuyen QA 1 - Sang (6 stops: 5 đón + 1 trường)
    (@qa_route_1_sang, @qa_stop_1_1, 1, 30),
    (@qa_route_1_sang, @qa_stop_1_2, 2, 30),
    (@qa_route_1_sang, @qa_stop_1_3, 3, 30),
    (@qa_route_1_sang, @qa_stop_1_4, 4, 30),
    (@qa_route_1_sang, @qa_stop_1_5, 5, 30),
    (@qa_route_1_sang, @school_stop_id, 6, 60),
    -- Tuyen QA 1 - Chieu (6 stops: 1 trường + 5 trả)
    (@qa_route_1_chieu, @school_stop_id, 1, 60),
    (@qa_route_1_chieu, @qa_stop_1_5, 2, 30), -- Ngược lại
    (@qa_route_1_chieu, @qa_stop_1_4, 3, 30),
    (@qa_route_1_chieu, @qa_stop_1_3, 4, 30),
    (@qa_route_1_chieu, @qa_stop_1_2, 5, 30),
    (@qa_route_1_chieu, @qa_stop_1_1, 6, 30),
    -- Tuyen QA 2 - Sang (6 stops: 5 đón + 1 trường)
    (@qa_route_2_sang, @qa_stop_2_1, 1, 30),
    (@qa_route_2_sang, @qa_stop_2_2, 2, 30),
    (@qa_route_2_sang, @qa_stop_2_3, 3, 30),
    (@qa_route_2_sang, @qa_stop_2_4, 4, 30),
    (@qa_route_2_sang, @qa_stop_2_5, 5, 30),
    (@qa_route_2_sang, @school_stop_id, 6, 60),
    -- Tuyen QA 2 - Chieu (6 stops: 1 trường + 5 trả)
    (@qa_route_2_chieu, @school_stop_id, 1, 60),
    (@qa_route_2_chieu, @qa_stop_2_5, 2, 30), -- Ngược lại
    (@qa_route_2_chieu, @qa_stop_2_4, 3, 30),
    (@qa_route_2_chieu, @qa_stop_2_3, 4, 30),
    (@qa_route_2_chieu, @qa_stop_2_2, 5, 30),
    (@qa_route_2_chieu, @qa_stop_2_1, 6, 30);

    -- =================================================================
    -- KHỐI 4: TẠO LỊCH TRÌNH (Schedules) CHO 2 NGÀY
    -- =================================================================
    INSERT INTO LichTrinh (maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung) VALUES
    -- NGÀY 1: 2025-11-14 (2 tài xế, 2 xe, 2 tuyến)
    (@qa_route_1_sang, @qa_bus_1, @qa_driver_1, 'don_sang', '06:30:00', @qa_day_1, TRUE),
    (@qa_route_1_chieu, @qa_bus_1, @qa_driver_1, 'tra_chieu', '16:30:00', @qa_day_1, TRUE),
    (@qa_route_2_sang, @qa_bus_2, @qa_driver_2, 'don_sang', '07:00:00', @qa_day_1, TRUE),
    (@qa_route_2_chieu, @qa_bus_2, @qa_driver_2, 'tra_chieu', '17:00:00', @qa_day_1, TRUE),
    -- NGÀY 2: 2025-11-15 (2 tài xế, 2 xe, 2 tuyến)
    (@qa_route_1_sang, @qa_bus_1, @qa_driver_1, 'don_sang', '06:30:00', @qa_day_2, TRUE),
    (@qa_route_1_chieu, @qa_bus_1, @qa_driver_1, 'tra_chieu', '16:30:00', @qa_day_2, TRUE),
    (@qa_route_2_sang, @qa_bus_2, @qa_driver_2, 'don_sang', '07:00:00', @qa_day_2, TRUE),
    (@qa_route_2_chieu, @qa_bus_2, @qa_driver_2, 'tra_chieu', '17:00:00', @qa_day_2, TRUE);

    -- =================================================================
    -- KHỐI 5: TẠO CHUYẾN ĐI (Trips) TỪ LỊCH TRÌNH
    -- =================================================================
    INSERT INTO ChuyenDi (maLichTrinh, ngayChay, trangThai)
    SELECT maLichTrinh, ngayChay, 'chua_khoi_hanh'
    FROM LichTrinh
    WHERE maTuyen IN (@qa_route_1_sang, @qa_route_1_chieu, @qa_route_2_sang, @qa_route_2_chieu);

    -- =================================================================
    -- KHỐI 6: GÁN HỌC SINH VÀO CHUYẾN ĐI (TrangThaiHocSinh)
    -- (Sử dụng 10 học sinh đầu tiên: 1-5 cho Tuyến 1, 6-10 cho Tuyến 2)
    -- =================================================================
    -- Lấy 8 ID chuyến đi vừa tạo
    SET @trip_r1_s_d1 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_1_sang AND lt.ngayChay = @qa_day_1);
    SET @trip_r1_c_d1 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_1_chieu AND lt.ngayChay = @qa_day_1);
    SET @trip_r2_s_d1 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_2_sang AND lt.ngayChay = @qa_day_1);
    SET @trip_r2_c_d1 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_2_chieu AND lt.ngayChay = @qa_day_1);
    SET @trip_r1_s_d2 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_1_sang AND lt.ngayChay = @qa_day_2);
    SET @trip_r1_c_d2 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_1_chieu AND lt.ngayChay = @qa_day_2);
    SET @trip_r2_s_d2 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_2_sang AND lt.ngayChay = @qa_day_2);
    SET @trip_r2_c_d2 = (SELECT maChuyen FROM ChuyenDi cd JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh WHERE lt.maTuyen = @qa_route_2_chieu AND lt.ngayChay = @qa_day_2);

    -- Gán 10 học sinh (1-10) vào 8 chuyến đi
    INSERT INTO TrangThaiHocSinh (maChuyen, maHocSinh, thuTuDiemDon, trangThai) VALUES
    -- NGÀY 1: 2025-11-14
    -- Tuyến 1 Sáng (Học sinh 1-5, tại sequence 1-5)
    (@trip_r1_s_d1, 1, 1, 'cho_don'), (@trip_r1_s_d1, 2, 2, 'cho_don'), (@trip_r1_s_d1, 3, 3, 'cho_don'), (@trip_r1_s_d1, 4, 4, 'cho_don'), (@trip_r1_s_d1, 5, 5, 'cho_don'),
    -- Tuyến 1 Chiều (Học sinh 1-5, tại sequence 2-6)
    (@trip_r1_c_d1, 5, 2, 'cho_don'), (@trip_r1_c_d1, 4, 3, 'cho_don'), (@trip_r1_c_d1, 3, 4, 'cho_don'), (@trip_r1_c_d1, 2, 5, 'cho_don'), (@trip_r1_c_d1, 1, 6, 'cho_don'),
    -- Tuyến 2 Sáng (Học sinh 6-10, tại sequence 1-5)
    (@trip_r2_s_d1, 6, 1, 'cho_don'), (@trip_r2_s_d1, 7, 2, 'cho_don'), (@trip_r2_s_d1, 8, 3, 'cho_don'), (@trip_r2_s_d1, 9, 4, 'cho_don'), (@trip_r2_s_d1, 10, 5, 'cho_don'),
    -- Tuyến 2 Chiều (Học sinh 6-10, tại sequence 2-6)
    (@trip_r2_c_d1, 10, 2, 'cho_don'), (@trip_r2_c_d1, 9, 3, 'cho_don'), (@trip_r2_c_d1, 8, 4, 'cho_don'), (@trip_r2_c_d1, 7, 5, 'cho_don'), (@trip_r2_c_d1, 6, 6, 'cho_don'),

    -- NGÀY 2: 2025-11-15 (Tương tự)
    -- Tuyến 1 Sáng
    (@trip_r1_s_d2, 1, 1, 'cho_don'), (@trip_r1_s_d2, 2, 2, 'cho_don'), (@trip_r1_s_d2, 3, 3, 'cho_don'), (@trip_r1_s_d2, 4, 4, 'cho_don'), (@trip_r1_s_d2, 5, 5, 'cho_don'),
    -- Tuyến 1 Chiều
    (@trip_r1_c_d2, 5, 2, 'cho_don'), (@trip_r1_c_d2, 4, 3, 'cho_don'), (@trip_r1_c_d2, 3, 4, 'cho_don'), (@trip_r1_c_d2, 2, 5, 'cho_don'), (@trip_r1_c_d2, 1, 6, 'cho_don'),
    -- Tuyến 2 Sáng
    (@trip_r2_s_d2, 6, 1, 'cho_don'), (@trip_r2_s_d2, 7, 2, 'cho_don'), (@trip_r2_s_d2, 8, 3, 'cho_don'), (@trip_r2_s_d2, 9, 4, 'cho_don'), (@trip_r2_s_d2, 10, 5, 'cho_don'),
    -- Tuyến 2 Chiều
    (@trip_r2_c_d2, 10, 2, 'cho_don'), (@trip_r2_c_d2, 9, 3, 'cho_don'), (@trip_r2_c_d2, 8, 4, 'cho_don'), (@trip_r2_c_d2, 7, 5, 'cho_don'), (@trip_r2_c_d2, 6, 6, 'cho_don');

    -- =================================================================
    SELECT 'File seed_qa.sql đã chạy thành công!' as message;
    SELECT 'Đã tạo 2 tuyến QA (đi/về), 10 điểm dừng, 8 lịch trình và 8 chuyến đi cho 2 ngày test.' as message;
    -- =================================================================