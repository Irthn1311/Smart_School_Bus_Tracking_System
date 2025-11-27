CREATE DATABASE school_bus_system;
USE school_bus_system;

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
    trangThai BOOLEAN DEFAULT TRUE
);

CREATE TABLE TaiXe (
    maTaiXe INT PRIMARY KEY,
    soBangLai VARCHAR(20) NOT NULL,
    ngayHetHanBangLai DATE,
    soNamKinhNghiem INT,
    trangThai ENUM('hoat_dong', 'tam_nghi', 'nghi_huu') DEFAULT 'hoat_dong',
    FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE
);

CREATE TABLE HocSinh (
    maHocSinh INT AUTO_INCREMENT PRIMARY KEY,
    hoTen VARCHAR(100) NOT NULL,
    ngaySinh DATE,
    lop VARCHAR(50),
    maPhuHuynh INT,
    diaChi TEXT,
    anhDaiDien VARCHAR(255),
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maPhuHuynh) REFERENCES NguoiDung(maNguoiDung) ON DELETE SET NULL
);

CREATE TABLE XeBuyt (
    maXe INT AUTO_INCREMENT PRIMARY KEY,
    bienSoXe VARCHAR(15) UNIQUE NOT NULL,
    dongXe VARCHAR(50),
    sucChua INT NOT NULL,
    trangThai ENUM('hoat_dong', 'bao_tri', 'ngung_hoat_dong') DEFAULT 'hoat_dong',
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TuyenDuong (
    maTuyen INT AUTO_INCREMENT PRIMARY KEY,
    tenTuyen VARCHAR(255) NOT NULL,
    diemBatDau VARCHAR(255),
    diemKetThuc VARCHAR(255),
    thoiGianUocTinh INT,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LichTrinh (
    maLichTrinh INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maXe INT NOT NULL,
    maTaiXe INT NOT NULL,
    loaiChuyen ENUM('don_sang', 'tra_chieu') NOT NULL,
    gioKhoiHanh TIME NOT NULL,
    dangApDung BOOLEAN DEFAULT TRUE,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen),
    FOREIGN KEY (maXe) REFERENCES XeBuyt(maXe),
    FOREIGN KEY (maTaiXe) REFERENCES NguoiDung(maNguoiDung)
);

CREATE TABLE ChuyenDi (
    maChuyen INT AUTO_INCREMENT PRIMARY KEY,
    maLichTrinh INT NOT NULL,
    ngayChay DATE NOT NULL,
    trangThai ENUM('chua_khoi_hanh', 'dang_chay', 'hoan_thanh', 'huy') DEFAULT 'chua_khoi_hanh',
    gioBatDauThucTe TIMESTAMP NULL,
    gioKetThucThucTe TIMESTAMP NULL,
    ghiChu TEXT,
    FOREIGN KEY (maLichTrinh) REFERENCES LichTrinh(maLichTrinh),
    UNIQUE KEY (maLichTrinh, ngayChay)
);

CREATE TABLE TrangThaiHocSinh (
    maTrangThai INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT NOT NULL,
    maHocSinh INT NOT NULL,
    thuTuDiemDon INT,
    trangThai ENUM('cho_don', 'da_don', 'da_tra', 'vang') DEFAULT 'cho_don',
    thoiGianThucTe TIMESTAMP NULL,
    ghiChu VARCHAR(255),
    FOREIGN KEY (maChuyen) REFERENCES ChuyenDi(maChuyen) ON DELETE CASCADE,
    FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) ON DELETE CASCADE,
    UNIQUE KEY (maChuyen, maHocSinh)
);

CREATE TABLE DiemDung (
    maDiem INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    tenDiem VARCHAR(255),
    kinhDo DOUBLE,
    viDo DOUBLE,
    thuTu INT,
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) ON DELETE CASCADE
);

CREATE TABLE ThongBao (
    maThongBao INT AUTO_INCREMENT PRIMARY KEY,
    maNguoiNhan INT NOT NULL, -- Thêm cột này
    tieuDe VARCHAR(255),
    noiDung TEXT,
    loaiThongBao ENUM('he_thong', 'chuyen_di', 'su_co'), -- Có thể thêm loại để dễ lọc
    thoiGianGui DATETIME DEFAULT CURRENT_TIMESTAMP,
    daDoc BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (maNguoiNhan) REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE -- Liên kết với người nhận
);

CREATE TABLE SuCo (
    maSuCo INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT,
    moTa TEXT,
    thoiGianBao DATETIME DEFAULT CURRENT_TIMESTAMP,
    mucDo ENUM('nhe', 'trung_binh', 'nghiem_trong') DEFAULT 'nhe',
    FOREIGN KEY (maChuyen) REFERENCES ChuyenDi(maChuyen) ON DELETE CASCADE
);

============================================================================================

Quan hệ Người dùng & Vai trò
NguoiDung (1, 1) - TaiXe (1, 1)
Giải thích: Một Người Dùng có thể là một Tài Xế (nếu có vai trò tương ứng), và một Tài Xế phải là một Người Dùng trong hệ thống. Đây là mối quan hệ mở rộng thông tin.

NguoiDung (1, n) - HocSinh (1, 1)
Giải thích: Một Người Dùng (vai trò Phụ huynh) có thể có nhiều Học Sinh, nhưng mỗi Học Sinh chỉ được liên kết với một Phụ huynh.

Quan hệ Lập kế hoạch & Lịch trình
TuyenDuong (1, n) - LichTrinh (1, 1)
Giải thích: Một Tuyến Đường có thể có nhiều Lịch Trình khác nhau (ví dụ: lịch sáng, lịch chiều), nhưng một Lịch Trình chỉ thuộc về một Tuyến Đường duy nhất.

XeBuyt (1, n) - LichTrinh (1, 1)
Giải thích: Một Xe Buýt có thể được phân công cho nhiều Lịch Trình, nhưng một Lịch Trình cụ thể chỉ do một Xe Buýt đảm nhận.

NguoiDung (1, n) - LichTrinh (1, 1)
Giải thích: Một Tài Xế (Người Dùng) có thể lái xe cho nhiều Lịch Trình, nhưng một Lịch Trình chỉ được một Tài Xế phụ trách.

TuyenDuong (1, n) - DiemDung (1, 1)
Giải thích: Một Tuyến Đường bao gồm nhiều Điểm Dừng, nhưng một Điểm Dừng chỉ thuộc về một Tuyến Đường duy nhất.

Quan hệ Vận hành & Theo dõi
LichTrinh (1, n) - ChuyenDi (1, 1)
Giải thích: Một Lịch Trình cố định sẽ tạo ra nhiều Chuyến Đi thực tế vào các ngày khác nhau, nhưng mỗi Chuyến Đi chỉ dựa trên một Lịch Trình gốc.

ChuyenDi (1, n) - TrangThaiHocSinh (1, 1)
Giải thích: Một Chuyến Đi có nhiều dòng Trạng Thái Học Sinh (mỗi học sinh một dòng), nhưng một dòng trạng thái chỉ thuộc về một Chuyến Đi duy nhất.

HocSinh (1, n) - TrangThaiHocSinh (1, 1)
Giải thích: Một Học Sinh có thể có nhiều dòng Trạng Thái khác nhau qua nhiều chuyến đi, nhưng một dòng trạng thái chỉ ghi nhận cho một Học Sinh duy nhất.

Quan hệ Chức năng phụ
ChuyenDi (1, n) - SuCo (1, 1)
Giải thích: Một Chuyến Đi có thể phát sinh nhiều Sự Cố, nhưng một Sự Cố chỉ được ghi nhận cho một Chuyến Đi cụ thể.

NguoiDung (1, n) - ThongBao (1, 1)
Giải thích: Một Người Dùng có thể nhận nhiều Thông Báo, nhưng một Thông Báo chỉ được gửi đến một Người Dùng duy nhất.

============================================================================================

Giải thích thuộc tính của từng bảng
1. Bảng NguoiDung 👤
Bảng này là trung tâm, lưu trữ thông tin đăng nhập và thông tin cơ bản cho tất cả mọi người dùng hệ thống.

maNguoiDung: Mã định danh duy nhất cho mỗi người dùng (ví dụ: 1, 2, 3...).
hoTen: Họ và tên đầy đủ của người dùng.
email: Địa chỉ email, dùng để đăng nhập và không được trùng.
matKhau: Mật khẩu đã được mã hóa của người dùng.
soDienThoai: Số điện thoại, cũng không được trùng.
anhDaiDien: Đường dẫn (URL) đến file ảnh đại diện.
vaiTro: Vai trò của người dùng trong hệ thống (chỉ có thể là 'quan_tri', 'tai_xe', hoặc 'phu_huynh').
ngayTao: Thời gian tài khoản được tạo.
ngayCapNhat: Thời gian thông tin tài khoản được cập nhật lần cuối.
trangThai: Cho biết tài khoản có đang hoạt động hay không (TRUE/FALSE).

2. Bảng TaiXe 👨‍✈️
Bảng này chứa thông tin chuyên biệt chỉ dành cho tài xế.
maTaiXe: Mã định danh của tài xế, liên kết trực tiếp với maNguoiDung.
soBangLai: Số giấy phép lái xe của tài xế.
ngayHetHanBangLai: Ngày hết hạn của giấy phép lái xe.
soNamKinhNghiem: Số năm kinh nghiệm lái xe.
trangThai: Trạng thái làm việc của tài xế ('hoat_dong', 'tam_nghi'...).

3. Bảng HocSinh 🎒
Lưu trữ thông tin của các em học sinh.

maHocSinh: Mã định danh duy nhất cho mỗi học sinh.
hoTen: Họ và tên đầy đủ của học sinh.
ngaySinh: Ngày sinh của học sinh.
lop: Lớp học của học sinh (ví dụ: 'Lớp 5A').
maPhuHuynh: Mã của người dùng là phụ huynh, để liên kết học sinh với cha mẹ.
diaChi: Địa chỉ nhà của học sinh, dùng để sắp xếp điểm đón.
anhDaiDien: Đường dẫn (URL) đến ảnh của học sinh.
ngayTao: Thời gian hồ sơ học sinh được tạo.

4. Bảng XeBuyt 🚌
Quản lý danh sách các xe buýt của trường.

maXe: Mã định danh duy nhất cho mỗi xe.
bienSoXe: Biển số đăng ký của xe (ví dụ: '51A-123.45'), không được trùng.
dongXe: Dòng xe/hãng sản xuất (ví dụ: 'Hyundai County').
sucChua: Số lượng chỗ ngồi tối đa của xe.
trangThai: Tình trạng của xe ('hoat_dong', 'bao_tri'...).
ngayTao: Thời gian thông tin xe được thêm vào hệ thống.

5. Bảng TuyenDuong 🗺️
Lưu trữ thông tin về các tuyến đường đưa đón.

maTuyen: Mã định danh duy nhất cho mỗi tuyến.
tenTuyen: Tên của tuyến đường (ví dụ: 'Tuyến Quận 7 - Nhà Bè').
diemBatDau: Mô tả điểm xuất phát (ví dụ: 'Cổng trường').
diemKetThuc: Mô tả điểm cuối cùng của tuyến.
thoiGianUocTinh: Thời gian dự kiến để hoàn thành tuyến (tính bằng phút).
ngayTao: Thời gian tuyến đường được tạo.

6. Bảng DiemDung 📍
Lưu các điểm dừng cụ thể trên một tuyến đường.

maDiem: Mã định danh duy nhất cho mỗi điểm dừng.
maTuyen: Mã tuyến đường mà điểm dừng này thuộc về.
tenDiem: Tên của điểm dừng (ví dụ: 'Ngã tư Nguyễn Văn Linh').
kinhDo: Tọa độ kinh độ trên bản đồ.
viDo: Tọa độ vĩ độ trên bản đồ.
thuTu: Thứ tự của điểm dừng này trên tuyến (ví dụ: điểm số 1, 2, 3...).

7. Bảng LichTrinh 🗓️
Đây là bảng kế hoạch cố định, gán tài xế, xe cho một tuyến đường vào một khung giờ cụ thể.

maLichTrinh: Mã định danh duy nhất cho mỗi lịch trình.
maTuyen: Mã tuyến đường được áp dụng.
maXe: Mã xe phụ trách lịch trình này.
maTaiXe: Mã tài xế phụ trách lịch trình này.
loaiChuyen: Loại chuyến là đón buổi sáng hay trả buổi chiều.
gioKhoiHanh: Thời gian bắt đầu dự kiến của chuyến (ví dụ: '06:30:00').
dangApDung: Cho biết lịch trình này có đang được sử dụng thường xuyên hay không.
ngayTao: Thời gian lịch trình được tạo.

8. Bảng ChuyenDi 🚀
Ghi lại một chuyến đi thực tế vào một ngày cụ thể, dựa trên một LichTrinh.

maChuyen: Mã định danh duy nhất cho mỗi chuyến đi.
maLichTrinh: Mã lịch trình gốc mà chuyến đi này dựa vào.
ngayChay: Ngày diễn ra chuyến đi.
trangThai: Trạng thái hiện tại của chuyến đi ('chua_khoi_hanh', 'dang_chay'...).
gioBatDauThucTe: Thời gian thực tế khi tài xế bấm nút bắt đầu chuyến.
gioKetThucThucTe: Thời gian thực tế khi tài xế bấm nút kết thúc chuyến.
ghiChu: Ghi chú của tài xế cho chuyến đi này.

9. Bảng TrangThaiHocSinh ✅
Bảng quan trọng nhất để theo dõi việc đón/trả từng học sinh trong từng chuyến đi.

maTrangThai: Mã định danh duy nhất cho dòng trạng thái này.
maChuyen: Mã chuyến đi mà học sinh tham gia.
maHocSinh: Mã học sinh được theo dõi.
thuTuDiemDon: Thứ tự điểm đón của học sinh trên tuyến.
trangThai: Trạng thái của học sinh trong chuyến đi ('cho_don', 'da_don', 'vang'...).
thoiGianThucTe: Thời gian chính xác lúc học sinh được đón/trả.
ghiChu: Ghi chú liên quan (ví dụ: 'Nghỉ có phép').

10. Bảng ThongBao 🔔
Lưu trữ các thông báo gửi đến người dùng.

maThongBao: Mã định danh duy nhất cho mỗi thông báo.
maNguoiNhan: Mã người dùng sẽ nhận thông báo này.
tieuDe: Tiêu đề của thông báo.
noiDung: Nội dung chi tiết của thông báo.
loaiThongBao: Phân loại thông báo ('he_thong', 'chuyen_di'...).
thoiGianGui: Thời gian thông báo được gửi đi.
daDoc: Trạng thái cho biết người dùng đã đọc thông báo hay chưa.

11. Bảng SuCo ⚠️
Ghi lại các sự cố phát sinh trong một chuyến đi.

maSuCo: Mã định danh duy nhất cho mỗi sự cố.
maChuyen: Mã chuyến đi mà sự cố xảy ra.
moTa: Mô tả chi tiết về sự cố.
thoiGianBao: Thời gian sự cố được báo cáo.
mucDo: Mức độ nghiêm trọng của sự cố.

Giải thích các dòng khai báo SQL đặc biệt
AUTO_INCREMENT

Chức năng: Tự động tăng giá trị của cột lên 1 mỗi khi có một dòng mới được thêm vào.
Ví dụ: maNguoiDung INT AUTO_INCREMENT
Giải thích: Bạn không cần phải lo việc gán mã cho người dùng mới. Người đầu tiên sẽ có mã là 1, người thứ hai là 2, và cứ thế tiếp tục. Nó đảm bảo mỗi dòng luôn có một mã định danh duy nhất.

PRIMARY KEY

Chức năng: Đánh dấu một cột là "khóa chính". Dữ liệu trong cột này phải là duy nhất và không được để trống (NULL). Nó dùng để xác định một cách tuyệt đối một dòng trong bảng.
Ví dụ: PRIMARY KEY (maNguoiDung)

UNIQUE

Chức năng: Ràng buộc dữ liệu trong một cột phải là duy nhất, không được trùng lặp. Khác với PRIMARY KEY, cột UNIQUE có thể được để trống (NULL).
Ví dụ: email VARCHAR(100) UNIQUE NOT NULL
Giải thích: Đảm bảo không có hai người dùng nào đăng ký cùng một địa chỉ email.

ENUM('giá_trị_1', 'giá_trị_2', ...)

Chức năng: Là một kiểu dữ liệu đặc biệt, giới hạn giá trị của một cột chỉ được phép là một trong các giá trị đã liệt kê sẵn.
Ví dụ: vaiTro ENUM('quan_tri', 'tai_xe', 'phu_huynh')
Giải thích: Rất hữu ích để tránh sai sót nhập liệu. Cột vaiTro chỉ có thể nhận một trong ba giá trị này, không thể là "Tài xế" hay "admin".

DEFAULT CURRENT_TIMESTAMP

Chức năng: Tự động gán giá trị mặc định cho cột là ngày giờ hiện tại khi một dòng mới được tạo.
Ví dụ: ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
Giải thích: Bạn không cần phải tự nhập thời gian tạo tài khoản, hệ thống sẽ tự động làm việc đó.

ON UPDATE CURRENT_TIMESTAMP

Chức năng: Tự động cập nhật giá trị của cột thành ngày giờ hiện tại mỗi khi dòng đó được chỉnh sửa.
Ví dụ: ngayCapNhat TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP
Giải thích: Rất tiện lợi để theo dõi lần cuối cùng một bản ghi được thay đổi.

FOREIGN KEY (...) REFERENCES TenBang(...)

Chức năng: Tạo một "khóa ngoại", là một liên kết giữa hai bảng để đảm bảo tính toàn vẹn dữ liệu.
Ví dụ: FOREIGN KEY (maPhuHuynh) REFERENCES NguoiDung(maNguoiDung)
Giải thích: Dòng này đảm bảo rằng maPhuHuynh trong bảng HocSinh phải là một maNguoiDung đã tồn tại trong bảng NguoiDung. Bạn không thể tạo một học sinh với mã phụ huynh không có thật.

ON DELETE CASCADE

Chức năng: Là một hành động đi kèm với FOREIGN KEY. Khi dòng dữ liệu ở bảng cha (bảng được tham chiếu) bị xóa, tất cả các dòng dữ liệu liên quan ở bảng con cũng sẽ tự động bị xóa theo.
Ví dụ: Trong bảng TaiXe, ...REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE
Giải thích: Nếu bạn xóa một người dùng có vai trò tài xế khỏi bảng NguoiDung, thông tin chi tiết của tài xế đó trong bảng TaiXe cũng sẽ tự động bị xóa.

ON DELETE SET NULL

Chức năng: Cũng là một hành động của FOREIGN KEY. Khi dòng ở bảng cha bị xóa, giá trị khóa ngoại ở bảng con sẽ được tự động chuyển thành NULL (trống).
Ví dụ: Trong bảng HocSinh, ...REFERENCES NguoiDung(maNguoiDung) ON DELETE SET NULL
Giải thích: Nếu bạn xóa tài khoản phụ huynh, thông tin của học sinh sẽ không bị xóa theo. Thay vào đó, cột maPhuHuynh của học sinh đó sẽ trở thành rỗng.

UNIQUE KEY (cot_1, cot_2)

Chức năng: Tạo một ràng buộc duy nhất trên sự kết hợp của nhiều cột.
Ví dụ: UNIQUE KEY (maChuyen, maHocSinh) trong bảng TrangThaiHocSinh.
Giải thích: Lệnh này đảm bảo rằng không thể có hai dòng trạng thái cho cùng một học sinh trong cùng một chuyến đi. Cặp giá trị (maChuyen, maHocSinh) phải là duy nhất trong toàn bộ bảng.

