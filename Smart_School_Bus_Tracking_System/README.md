# Smart School Bus Tracking System (SSB 1.0)

Hệ thống **Smart School Bus Tracking (SSB 1.0)** là web application hỗ trợ nhà trường, tài xế và phụ huynh quản lý và theo dõi xe buýt đưa đón học sinh theo thời gian thực.

**Mục tiêu:**
- Theo dõi chuyến xe từ **Start Trip → End Trip** trên web.
- Hiển thị **vị trí xe trên bản đồ**, trạng thái chuyến đi, thông tin học sinh.
- Gửi **cảnh báo “đến gần điểm dừng” (~60m)** và **cảnh báo trễ** cho Admin / Phụ huynh.
- Đảm bảo **minh bạch, an toàn** và **giảm tải cho nhà trường** trong việc tổ chức xe buýt.

---

## 1. Tính năng chính

### 1.1. Dành cho Admin (Nhà trường)
- **Quản lý danh mục**: Xe buýt, Tài xế, Học sinh, Tuyến đường & Điểm dừng.
- **Lập lịch & Phân công**: Gán tuyến – xe – tài xế – ngày/giờ, kiểm tra trùng lịch.
- **Theo dõi Realtime**: Bản đồ vị trí xe, trạng thái chuyến (chưa chạy, đang chạy, hoàn thành, huỷ).
- **Báo cáo**: Thống kê số chuyến, tỉ lệ đúng giờ/trễ, trạng thái xe.

### 1.2. Dành cho Tài xế
- **Quản lý chuyến**: Xem danh sách chuyến được phân công.
- **Thao tác**: Start Trip / End Trip, cập nhật vị trí GPS.
- **Hỗ trợ**: Xem tuyến đường, điểm dừng, danh sách học sinh, gửi báo cáo sự cố.

### 1.3. Dành cho Phụ huynh
- **Theo dõi con**: Xem danh sách con, xe/tuyến đang đi.
- **Bản đồ Realtime**: Xem vị trí xe đưa đón con.
- **Thông báo**: Nhận cảnh báo khi xe sắp đến điểm đón (~60m) hoặc xe bị trễ.

---

## 2. Kiến trúc hệ thống

Mô hình tổng thể: **Frontend ↔ Backend API ↔ Database + Realtime Service**

- **Frontend**: Next.js (React) dashboard cho Admin, Driver, Parent.
- **Backend**: Node.js + Express REST API.
- **Database**: MySQL lưu trữ dữ liệu nghiệp vụ.
- **Realtime**: Socket.IO xử lý vị trí GPS và thông báo tức thời.

---

## 3. Công nghệ sử dụng

### Frontend (`ssb-frontend`)
- **Core**: Next.js 15, React 19
- **Styling**: Tailwind CSS v4, Radix UI (Shadcn), Lucide React
- **Maps**: React Leaflet / Google Maps JS API
- **State/Data**: React Hooks, TanStack Query

### Backend (`ssb-backend`)
- **Core**: Node.js, Express v5
- **Database**: MySQL2, Sequelize (hoặc raw SQL tuỳ module)
- **Realtime**: Socket.IO
- **Auth**: JWT, Firebase Admin (nếu dùng)
- **Tools**: TSX, Nodemon, ESLint

---

## 4. Cấu trúc thư mục

```text
Smart_School_Bus_Tracking_System/
├── ssb-frontend/          # Source code Frontend (Next.js)
├── ssb-backend/           # Source code Backend (Express)
├── database/              # Scripts SQL (init, sample data)
├── docs/                  # Tài liệu dự án (Requirements, Design)
└── README.md              # File hướng dẫn này
```

---

## 5. Cài đặt & Chạy dự án

### 5.1. Yêu cầu
- Node.js (>= 18.x)
- MySQL Server
- Git

### 5.2. Khởi tạo Database
Dự án có sẵn scripts để tạo và nạp dữ liệu mẫu. Thực hiện từ thư mục `ssb-backend`:

1. Tạo database `school_bus_system` trong MySQL Workbench hoặc Command Line.
2. Chạy lệnh nạp schema và dữ liệu mẫu:
   ```bash
   cd ssb-backend
   npm run db:init   # Chạy script database/01_init_db_ver2.sql
   npm run db:seed   # Chạy script database/02_sample_data.sql
   ```
   *Lưu ý: Cần cấu hình kết nối database trong `.env` của backend trước hoặc đảm bảo user `root` không có mật khẩu (hoặc sửa script trong `package.json` nếu cần).*

### 5.3. Cài đặt Backend
1. Di chuyển vào thư mục backend:
   ```bash
   cd ssb-backend
   ```
2. Cấu hình biến môi trường:
   ```bash
   cp .env.example .env
   ```
   *Cập nhật các thông tin DB_HOST, DB_USER, DB_PASS, JWT_SECRET, GOOGLE_MAPS_API_KEY trong file `.env`.*

3. Cài đặt dependencies và chạy server:
   ```bash
   npm install
   npm run dev
   ```
   Server sẽ chạy tại `http://localhost:4000` (mặc định).

### 5.4. Cài đặt Frontend
1. Di chuyển vào thư mục frontend:
   ```bash
   cd ssb-frontend
   ```
2. Cấu hình biến môi trường:
   ```bash
   cp env.example .env.local
   ```
   *Đảm bảo `NEXT_PUBLIC_API_BASE_URL` trỏ đúng về backend (vd: `http://localhost:4000/api/v1`).*

3. Cài đặt dependencies và chạy:
   ```bash
   npm install
   npm run dev
   ```
   Truy cập Web App tại `http://localhost:3000`.

---

## 6. Thành viên nhóm

- **Nguyễn Hữu Tri** – Leader, Backend Lead & DevOps
- **Nguyễn Tuấn Tài** – Database Engineer, Realtime
- **Lư Hồng Phúc** – Backend Core APIs, Documentation
- **Phạm Hồng Thái** – Frontend Maps/Realtime, QA
- **Tạ Quang Thắng** – Requirements, Auth & Reporting
- **Trịnh Việt Thắng** – FE Lead UI & Data Binding

---

## 7. Ghi chú
- Đây là đồ án môn học Software Engineering.
- Mật khẩu mặc định cho các tài khoản mẫu (nếu có) thường được quy ước chung hoặc băm sẵn trong `sample_data.sql`.
- API Documentation có thể xuất ra Postman bằng lệnh `npm run export-postman` tại `ssb-backend`.