# M0 Survey - Auth & Guard Hiện Trạng

**Date:** 2025-11-11  
**Scope:** Authentication & Authorization (BE/FE/WS)  
**Purpose:** Đánh giá hiện trạng trước khi chuẩn hóa M0

## 1. Backend - Hiện Trạng

### 1.1 Controllers & Routes
- ✅ **AuthController.js** (`src/controllers/AuthController.js`):
  - `login()`: Có JWT access + refresh token (15m/7d), bcrypt password
  - `refreshToken()`: Có refresh logic, dùng JWT_REFRESH_SECRET
  - `getProfile()`: Có endpoint lấy profile từ token
  - `register()`: Có đăng ký (không thuộc M0)
- ✅ **Routes** (`src/routes/api/auth.js`):
  - POST `/auth/login` - Không có rate limit
  - POST `/auth/refresh` - Không có auth middleware (đúng)
  - GET `/auth/profile` - Có auth middleware

### 1.2 Middleware
- ✅ **AuthMiddleware.js** (`src/middlewares/AuthMiddleware.js`):
  - `authenticate()`: Verify JWT, check user exists, check trangThai
  - `authorize(...roles)`: RBAC middleware cho 3 roles (quan_tri, tai_xe, phu_huynh)
  - `requireAdmin()`, `requireDriver()`, `requireParent()`: Helper methods
- ❌ **Rate Limit**: Chưa có rate limit riêng cho `/auth/login`
- ✅ **CORS** (`src/middlewares/cors.ts`): Có config, hỗ trợ multiple origins

### 1.3 Response Envelope
- ❌ **Chưa có utils/response.js**: Controllers đang trả inline `{ success, data, message }`
- ⚠️ **Không nhất quán**: Một số dùng `code`, một số không

### 1.4 Socket.IO
- ✅ **JWT Handshake** (`src/ws/index.js:49-66`):
  - Có `io.use()` middleware verify JWT từ `socket.handshake.auth.token`
  - Dùng `verifyWsJWT()` từ `utils/wsAuth.js`
  - Gắn `socket.data.user = { userId, email, vaiTro, userInfo }`
- ✅ **Rooms** (`src/ws/index.js:77-79`):
  - Auto join `user-{userId}` khi connect
  - Có `join_trip`, `leave_trip`, `join_route`, `leave_route`
- ❌ **auth/hello event**: Chưa có event test ACL

### 1.5 Config & Env
- ✅ **env.ts** (`src/config/env.ts`): Có config loader, validate required vars
- ✅ **env.example** (`src/config/env.example`): Có JWT_SECRET, JWT_REFRESH_SECRET, FE_ORIGIN
- ⚠️ **JWT_EXPIRES_IN**: Đang hardcode "15m" trong code, không dùng env

### 1.6 Database
- ✅ **NguoiDungModel**: Có bảng Users với `matKhau` (bcrypt hash), `vaiTro`, `trangThai`
- ✅ **Password**: Đã hash bằng bcrypt (12 rounds)

## 2. Frontend - Hiện Trạng

### 2.1 Auth Store & Context
- ✅ **auth-context.tsx** (`lib/auth-context.tsx`):
  - `AuthProvider`: Quản lý user state, loading
  - `login()`: Gọi authService.login(), lưu token, connect socket
  - `logout()`: Clear token, disconnect socket, redirect
  - `useAuth()`: Hook để dùng trong components
- ✅ **auth.service.ts** (`lib/services/auth.service.ts`):
  - `login()`: POST `/auth/login`, lưu token vào localStorage
  - `fetchProfile()`: GET `/auth/profile`
  - `logout()`: Clear localStorage

### 2.2 API Client
- ✅ **api.ts** (`lib/api.ts`):
  - Có `ApiClient` class với `setToken()`, `clearToken()`
  - Có interceptor refresh token (401 → auto refresh → retry)
  - Base URL từ `NEXT_PUBLIC_API_URL`
- ✅ **api-client.ts** (`lib/api-client.ts`):
  - Axios instance với interceptors
  - Có refresh token logic tương tự

### 2.3 Login UI
- ✅ **login/page.tsx** (`app/login/page.tsx`):
  - Form email/password
  - Submit → gọi `login()` → redirect theo role
  - Auto redirect nếu đã login

### 2.4 Guards
- ✅ **RequireAuth.tsx** (`lib/guards/RequireAuth.tsx`):
  - Check `user` và `loading`, redirect `/login` nếu chưa login
- ✅ **RequireRole.tsx** (`lib/guards/RequireRole.tsx`):
  - Check role, redirect về dashboard của role nếu không đúng

### 2.5 Socket Client
- ✅ **socket.ts** (`lib/socket.ts`):
  - `SocketService` class với `connect(token)`
  - Truyền token vào `auth.token` khi connect
  - Auto reconnect logic
- ⚠️ **Token refresh**: Chưa tự động reconnect socket khi token refresh

### 2.6 Env
- ✅ **env.example** (`env.example`):
  - Có `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_GMAPS_API_KEY`

## 3. Documentation

### 3.1 OpenAPI
- ✅ **openapi.yaml** (`docs/openapi.yaml`):
  - Có `/auth/login`, `/auth/refresh`, `/auth/profile`
  - Có schemas: User, ErrorResponse
  - ⚠️ Request body của `/auth/refresh` sai (đang dùng body, thực tế dùng header)

### 3.2 Postman
- ✅ **SSB_API_Collection.postman_collection.json**: Có collection
- ⚠️ Cần cập nhật theo OpenAPI mới

## 4. Kế Hoạch File-Level

### 4.1 Backend - Files Cần Tạo/Sửa

**Tạo mới:**
- `ssb-backend/src/utils/response.js` - Response envelope helper
- `ssb-backend/scripts/test_auth_flow.js` - E2E test script
- `ssb-backend/scripts/ws_auth_demo.js` - WS auth test script

**Sửa đổi:**
- `ssb-backend/src/config/env.example` - Chuẩn hóa JWT_EXPIRES_IN, thêm WS_ENABLED
- `ssb-backend/src/routes/api/auth.js` - Thêm rate limit cho `/auth/login`
- `ssb-backend/src/controllers/AuthController.js` - Dùng response helper, chuẩn hóa envelope
- `ssb-backend/src/ws/index.js` - Thêm `auth/hello` event handler
- `ssb-backend/src/middlewares/cors.ts` - Bật credentials nếu cần (hiện đang false)

### 4.2 Frontend - Files Cần Tạo/Sửa

**Tạo mới:**
- `ssb-frontend/app/auth-check/page.tsx` - Trang test auth + socket

**Sửa đổi:**
- `ssb-frontend/env.example` - Chuẩn hóa tên biến (NEXT_PUBLIC_API_BASE_URL)
- `ssb-frontend/lib/api.ts` - Đảm bảo interceptor refresh hoạt động đúng
- `ssb-frontend/lib/socket.ts` - Auto reconnect khi token refresh

### 4.3 Documentation - Files Cần Tạo/Sửa

**Tạo mới:**
- `docs/reports/M0_status.md` - Checklist hoàn thành
- `docs/reports/M0_done.md` - Báo cáo cuối cùng

**Sửa đổi:**
- `docs/openapi.yaml` - Sửa `/auth/refresh` request (dùng header, không phải body)
- `docs/postman_collection.json` - Cập nhật theo OpenAPI
- `ssb-backend/README.md` - Thêm hướng dẫn M0
- `ssb-frontend/README.md` - Thêm hướng dẫn M0

## 5. Tóm Tắt

### ✅ Đã Có (Không Cần Làm Lại)
- JWT access + refresh token flow
- RBAC middleware (authorize)
- Socket.IO JWT handshake
- Frontend auth context + guards
- Login UI
- API client với refresh interceptor

### ⚠️ Cần Chuẩn Hóa
- Response envelope (tạo utils/response.js)
- Rate limit cho login endpoint
- JWT_EXPIRES_IN từ env (không hardcode)
- CORS credentials (nếu cần cookie)

### ❌ Cần Thêm
- `auth/hello` socket event
- `/auth-check` test page
- E2E test scripts
- OpenAPI sửa `/auth/refresh` request format

## 6. Ưu Tiên Thực Thi

1. **Backend Response Envelope** - Tạo utils/response.js, refactor controllers
2. **Backend Rate Limit Login** - Thêm express-rate-limit cho `/auth/login`
3. **Backend WS auth/hello** - Thêm event test
4. **Frontend /auth-check** - Tạo test page
5. **Frontend Socket Reconnect** - Auto reconnect khi token refresh
6. **OpenAPI + Postman** - Sửa và cập nhật
7. **Tests + README** - E2E scripts và documentation

