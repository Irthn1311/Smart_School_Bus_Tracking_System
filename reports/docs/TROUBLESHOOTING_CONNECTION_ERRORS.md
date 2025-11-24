# 🔧 Troubleshooting: Connection Errors

## Lỗi: ERR_CONNECTION_REFUSED / ERR_NETWORK

### Triệu chứng
```
[api-client] Request error (no response):
  URL: /maps/directions
  Method: post
  Message: Network Error
  Code: ERR_NETWORK
  ⚠️  Issue: Network error - Check CORS or network connectivity
```

Hoặc:
```
POST http://localhost:4000/api/v1/maps/directions net::ERR_CONNECTION_REFUSED
```

### Nguyên nhân
**Backend server không chạy hoặc không thể kết nối được.**

## ✅ Các bước khắc phục

### 1. Kiểm tra Backend Server có đang chạy không

Mở terminal và chạy:
```bash
# Kiểm tra port 4000 có đang được sử dụng không
# Windows PowerShell:
netstat -ano | findstr :4000

# Hoặc thử curl/Postman:
curl http://localhost:4000/api/v1/health
```

**Nếu không có response** → Backend không chạy

### 2. Khởi động Backend Server

```bash
cd ssb-backend
npm run dev
```

Bạn sẽ thấy log như:
```
Server is running on port 4000
✅ Database connected
✅ Redis connected (nếu có)
```

### 3. Kiểm tra Backend đang chạy trên port nào

Kiểm tra file `ssb-backend/.env`:
```env
PORT=4000
```

Hoặc xem log khi start backend:
```
Server is running on http://localhost:4000
```

### 4. Kiểm tra Frontend đang gọi đúng URL không

Mở browser console và tìm:
```
🌐 API_BASE_URL: http://localhost:4000/api/v1
```

Hoặc kiểm tra file `ssb-frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 5. Nếu dùng LAN (truy cập từ máy khác)

**Frontend `.env.local`:**
```env
# Thay localhost bằng IP máy server
NEXT_PUBLIC_API_BASE=http://192.168.1.100:4000/api/v1
NEXT_PUBLIC_API_URL=http://192.168.1.100:4000/api/v1
```

**Backend `.env`:**
```env
# Thêm IP client vào CORS
FE_ORIGIN=http://localhost:3000,http://192.168.1.100:3000,http://192.168.1.50:3000
```

### 6. Kiểm tra Firewall

**Windows:**
```powershell
# Kiểm tra firewall có block port 4000 không
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*4000*"}
```

Nếu bị block, thêm rule:
```powershell
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### 7. Kiểm tra CORS Configuration

Kiểm tra `ssb-backend/src/middlewares/cors.ts` hoặc `ssb-backend/src/server.ts`:
- Đảm bảo frontend origin được thêm vào CORS whitelist
- Nếu dùng LAN, thêm IP client vào `FE_ORIGIN`

## 🔍 Debug Checklist

- [ ] Backend server đang chạy (`npm run dev` trong `ssb-backend/`)
- [ ] Backend chạy trên port 4000 (kiểm tra log)
- [ ] Frontend `.env.local` có `NEXT_PUBLIC_API_BASE` hoặc `NEXT_PUBLIC_API_URL`
- [ ] URL trong `.env.local` khớp với backend port
- [ ] Không có firewall block port 4000
- [ ] CORS được cấu hình đúng (nếu dùng LAN)
- [ ] Đã restart frontend sau khi thay đổi `.env.local`

## 🧪 Test Connection

### Test 1: Health Check
```bash
curl http://localhost:4000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": "..."
}
```

### Test 2: Browser Console
Mở browser console và chạy:
```javascript
fetch('http://localhost:4000/api/v1/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Nếu lỗi CORS → Cần cấu hình CORS trong backend
Nếu lỗi connection refused → Backend không chạy

## 📝 Common Issues

### Issue 1: Port đã được sử dụng
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Giải pháp:**
```bash
# Windows: Tìm và kill process
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Hoặc đổi port trong .env
PORT=4001
```

### Issue 2: Backend crash khi start
Kiểm tra logs để xem lỗi gì:
- Database connection failed?
- Missing environment variables?
- Port conflict?

### Issue 3: Frontend không load .env.local
- Đảm bảo file tên đúng: `.env.local` (không phải `.env`)
- Restart Next.js dev server sau khi thay đổi `.env.local`
- Biến môi trường phải bắt đầu với `NEXT_PUBLIC_`

## 🚀 Quick Fix

1. **Start Backend:**
   ```bash
   cd ssb-backend
   npm run dev
   ```

2. **Verify Backend running:**
   - Mở browser: `http://localhost:4000/api/v1/health`
   - Phải thấy JSON response

3. **Restart Frontend:**
   ```bash
   cd ssb-frontend
   # Stop current process (Ctrl+C)
   npm run dev
   ```

4. **Check Console:**
   - Browser console không còn lỗi `ERR_CONNECTION_REFUSED`
   - Thấy log: `🌐 API_BASE_URL: http://localhost:4000/api/v1`

