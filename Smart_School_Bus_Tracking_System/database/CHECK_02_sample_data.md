# BÁO CÁO KIỂM TRA: 02_sample_data.sql vs 01_init_db_ver2.sql

## ✅ KIỂM TRA TỔNG QUAN

### 1. Tên bảng - ✅ ĐÚNG
Tất cả tên bảng trong `02_sample_data.sql` khớp với schema:
- ✅ NguoiDung
- ✅ TaiXe
- ✅ XeBuyt
- ✅ HocSinh
- ✅ TuyenDuong
- ✅ DiemDung
- ✅ route_stops
- ✅ LichTrinh
- ✅ ChuyenDi

### 2. Tên cột - ✅ ĐÚNG

#### NguoiDung
- ✅ hoTen, email, matKhau, soDienThoai, vaiTro

#### TaiXe
- ✅ maTaiXe, tenTaiXe, soBangLai, ngayHetHanBangLai, soNamKinhNghiem, trangThai

#### XeBuyt
- ✅ bienSoXe, dongXe, sucChua, trangThai

#### HocSinh
- ✅ hoTen, ngaySinh, lop, maPhuHuynh, diaChi

#### TuyenDuong
- ✅ tenTuyen, diemBatDau, diemKetThuc, thoiGianUocTinh, origin_lat, origin_lng, dest_lat, dest_lng, polyline

#### DiemDung
- ✅ tenDiem, viDo, kinhDo, address, scheduled_time

#### route_stops
- ✅ route_id, stop_id, sequence, dwell_seconds

#### LichTrinh
- ✅ maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay, dangApDung

#### ChuyenDi
- ✅ maLichTrinh, ngayChay, trangThai, gioBatDauThucTe, gioKetThucThucTe, ghiChu

### 3. Giá trị ENUM - ✅ ĐÚNG

#### NguoiDung.vaiTro
- ✅ 'quan_tri' - có trong data
- ✅ 'tai_xe' - có trong data
- ✅ 'phu_huynh' - có trong data

#### TaiXe.trangThai
- ✅ 'hoat_dong' - có trong data
- ✅ 'tam_nghi' - không có (OK, không bắt buộc)
- ✅ 'nghi_huu' - không có (OK, không bắt buộc)

#### XeBuyt.trangThai
- ✅ 'hoat_dong' - có trong data
- ✅ 'bao_tri' - có trong data
- ✅ 'ngung_hoat_dong' - không có (OK, không bắt buộc)

#### LichTrinh.loaiChuyen
- ✅ 'don_sang' - có trong data
- ✅ 'tra_chieu' - có trong data

#### ChuyenDi.trangThai
- ✅ 'chua_khoi_hanh' - có trong data
- ✅ 'dang_chay' - có trong data
- ✅ 'hoan_thanh' - có trong data
- ✅ 'huy' - không có (OK, không bắt buộc)

### 4. Foreign Keys - ✅ ĐÚNG

#### TaiXe.maTaiXe → NguoiDung.maNguoiDung
- ✅ Tất cả maTaiXe (2, 3, 4, 5, 6, 7, 8) đều tồn tại trong NguoiDung

#### HocSinh.maPhuHuynh → NguoiDung.maNguoiDung
- ✅ Sử dụng biến @phuhuynh_start_X để reference đúng

#### LichTrinh.maTuyen → TuyenDuong.maTuyen
- ✅ Sử dụng maTuyen từ 1-10 (10 tuyến đường)

#### LichTrinh.maXe → XeBuyt.maXe
- ✅ Sử dụng maXe từ 1-8 (8 xe buýt)

#### LichTrinh.maTaiXe → NguoiDung.maNguoiDung
- ✅ Sử dụng maTaiXe = 2, 3, 4, 5, 6, 7 (6 tài xế trong lịch trình)

#### ChuyenDi.maLichTrinh → LichTrinh.maLichTrinh
- ✅ Sử dụng maLichTrinh = 1, 2, 3, 11, 12 (từ lịch trình đã tạo)

#### route_stops.route_id → TuyenDuong.maTuyen
- ✅ Sử dụng SELECT với JOIN để đảm bảo route_id hợp lệ

#### route_stops.stop_id → DiemDung.maDiem
- ✅ Sử dụng SELECT với JOIN để đảm bảo stop_id hợp lệ

### 5. Kiểu dữ liệu - ✅ ĐÚNG

#### DATE
- ✅ ngaySinh: '2015-06-15' format đúng
- ✅ ngayHetHanBangLai: '2028-05-20' format đúng
- ✅ ngayChay: '2025-10-20' format đúng

#### TIME
- ✅ gioKhoiHanh: '06:30:00' format đúng

#### TIMESTAMP
- ✅ gioBatDauThucTe: '2025-10-20 06:30:00' format đúng
- ✅ gioKetThucThucTe: '2025-10-20 07:00:00' format đúng

#### DECIMAL(9,6)
- ✅ viDo, kinhDo: 10.7345, 106.7212 format đúng

#### VARCHAR/TEXT
- ✅ Tất cả string values đều trong giới hạn

### 6. Constraints - ✅ ĐÚNG

#### UNIQUE constraints
- ✅ email: Tất cả email unique
- ✅ soDienThoai: Tất cả số điện thoại unique
- ✅ soBangLai: Tất cả số bằng lái unique
- ✅ bienSoXe: Tất cả biển số unique

#### NOT NULL constraints
- ✅ Tất cả cột NOT NULL đều có giá trị

### 7. Logic dữ liệu - ✅ ĐÚNG

#### Số lượng
- ✅ 100 học sinh (10 lần x 10 học sinh)
- ✅ 100 phụ huynh (mỗi học sinh 1 phụ huynh)
- ✅ 7 tài xế
- ✅ 8 xe buýt
- ✅ 10 tuyến đường
- ✅ 25 điểm dừng
- ✅ 20 lịch trình (10 sáng + 10 chiều)
- ✅ 5 chuyến đi mẫu

#### Phân bố học sinh
- ✅ Quận 7: 20 học sinh
- ✅ Quận 4: 15 học sinh
- ✅ Quận 1: 12 học sinh
- ✅ Quận 2: 10 học sinh
- ✅ Quận 3: 10 học sinh
- ✅ Quận 8: 8 học sinh
- ✅ Quận 10: 8 học sinh
- ✅ Quận 11: 7 học sinh
- ✅ Nhà Bè: 5 học sinh
- ✅ Bình Thạnh: 5 học sinh
- **Tổng: 100 học sinh** ✅

## ⚠️ LƯU Ý

1. **maTaiXe trong LichTrinh**: 
   - Schema: `FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung)`
   - Data: Sử dụng maTaiXe = 2, 3, 4, 5, 6, 7 (đúng vì reference tới NguoiDung, không phải TaiXe)

2. **Tài xế ID 4**: 
   - Trong NguoiDung: ID 4 = 'Hoàng Văn Nam' (tai_xe)
   - Trong TaiXe: maTaiXe = 4 = 'Hoàng Văn Nam'
   - Trong LichTrinh: maTaiXe = 4 được sử dụng
   - ✅ Đúng

3. **Xe buýt maXe = 7**:
   - Xe 7 có trangThai = 'bao_tri'
   - Không được sử dụng trong LichTrinh (đúng)

## ✅ KẾT LUẬN

**File `02_sample_data.sql` HOÀN TOÀN TƯƠNG THÍCH với schema `01_init_db_ver2.sql`**

- ✅ Tất cả tên bảng đúng
- ✅ Tất cả tên cột đúng
- ✅ Tất cả giá trị ENUM hợp lệ
- ✅ Tất cả foreign keys hợp lệ
- ✅ Tất cả kiểu dữ liệu đúng
- ✅ Tất cả constraints được tuân thủ
- ✅ Logic dữ liệu hợp lý

**File sẵn sàng để chạy!**

