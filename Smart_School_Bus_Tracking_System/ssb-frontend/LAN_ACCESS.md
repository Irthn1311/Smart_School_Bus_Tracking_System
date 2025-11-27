# Hướng dẫn truy cập từ mạng LAN

## ⚠️ QUAN TRỌNG

**KHÔNG** truy cập địa chỉ `0.0.0.0` trong browser!

`0.0.0.0` chỉ là cấu hình để server lắng nghe trên tất cả network interfaces. Bạn phải truy cập bằng IP thực của máy.

## ✅ Cách truy cập đúng

### 1. Từ máy chạy server (localhost):
```
http://localhost:3000
```

### 2. Từ máy khác trong mạng LAN:
```
http://192.168.31.181:3000
```
(Thay `192.168.31.181` bằng IP thực của máy server)

### 3. Kiểm tra IP của máy:
- **Windows**: Mở Command Prompt và chạy `ipconfig`
- Tìm dòng `IPv4 Address` trong kết quả
- Ví dụ: `192.168.31.181`

## 🚀 Khởi động server

```bash
cd ssb-frontend
npm run dev
```

Server sẽ hiển thị URLs trong console:
- Local: `http://localhost:3000`
- Network: `http://192.168.31.181:3000` (hoặc IP khác tùy máy)

## 🔧 Cấu hình đã thiết lập

1. ✅ Server lắng nghe trên `0.0.0.0` (tất cả interfaces)
2. ✅ CORS đã cấu hình cho các IP trong `allowedDevOrigins`
3. ✅ Đã thêm IP `10.110.249.34` vào whitelist

## ❌ Lỗi thường gặp

### "ERR_CONNECTION_TIMED_OUT" khi truy cập `0.0.0.0`
→ **Nguyên nhân**: Đang truy cập sai địa chỉ
→ **Giải pháp**: Dùng `http://192.168.31.181:3000` thay vì `http://0.0.0.0:3000`

### "Blocked cross-origin request"
→ **Nguyên nhân**: IP client chưa được thêm vào `allowedDevOrigins`
→ **Giải pháp**: Thêm IP vào `ssb-frontend/next.config.mjs`

### Không kết nối được từ máy khác
→ **Kiểm tra**:
1. Windows Firewall có cho phép port 3000 không?
2. Server có đang chạy không?
3. IP có đúng không? (dùng `ipconfig` để kiểm tra)

