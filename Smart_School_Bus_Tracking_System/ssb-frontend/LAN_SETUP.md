# 🔧 Cấu hình Frontend cho LAN Access

## Vấn đề

Khi truy cập từ máy khác trong LAN, frontend vẫn đang gọi `http://localhost:4000` (máy client), không phải máy server.

## ✅ Giải pháp

### Bước 1: Tạo file `.env.local` trong `ssb-frontend`

Tạo file `.env.local` với nội dung:

```env
# Backend API URL - Thay 192.168.31.181 bằng IP máy server của bạn
NEXT_PUBLIC_API_URL=http://192.168.31.181:4000/api/v1

# Socket.IO Server URL - Thay 192.168.31.181 bằng IP máy server của bạn
NEXT_PUBLIC_SOCKET_URL=http://192.168.31.181:4000

# App Configuration
NEXT_PUBLIC_APP_NAME=Smart School Bus Tracking System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Bước 2: Cập nhật Backend `.env`

Mở file `ssb-backend/.env` và cập nhật:

```env
# Thêm IP client vào FE_ORIGIN
FE_ORIGIN=http://localhost:3000,http://192.168.31.181:3000,http://10.110.249.34:3000

# Thêm IP client vào SOCKET_CORS_ORIGIN
SOCKET_CORS_ORIGIN=http://localhost:3000,http://192.168.31.181:3000,http://10.110.249.34:3000
```

### Bước 3: Khởi động lại cả Frontend và Backend

```bash
# Frontend
cd ssb-frontend
npm run dev

# Backend
cd ssb-backend
npm run dev
```

## ⚠️ Lưu ý

- Thay `192.168.31.181` bằng **IP thực của máy server** (dùng `ipconfig` để kiểm tra)
- Thay `10.110.249.34` bằng **IP của máy client** đang truy cập
- Nếu có nhiều máy client, thêm tất cả IP vào `FE_ORIGIN` (phân cách bằng dấu phẩy)

## 🔍 Kiểm tra

1. Mở browser console (F12)
2. Xem log: `🌐 API_BASE_URL: http://192.168.31.181:4000/api/v1`
3. Nếu vẫn thấy `localhost:4000`, kiểm tra lại file `.env.local`

## 📝 Ví dụ

**Máy server**: `192.168.31.181`  
**Máy client 1**: `10.110.249.34`  
**Máy client 2**: `192.168.31.100`

**Backend `.env`**:
```env
FE_ORIGIN=http://localhost:3000,http://192.168.31.181:3000,http://10.110.249.34:3000,http://192.168.31.100:3000
```

**Frontend `.env.local`** (trên mỗi máy client):
```env
NEXT_PUBLIC_API_URL=http://192.168.31.181:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://192.168.31.181:4000
```

