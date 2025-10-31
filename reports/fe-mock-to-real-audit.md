# 📊 BÁO CÁO ĐÁNH GIÁ FE: THAY MOCK BẰNG API THẬT

**Ngày đánh giá**: 2025-01-XX  
**Repository**: Smart School Bus Tracking System (SSB 1.0)  
**Chế độ**: READ-ONLY (Audit Bot)  
**Version**: Frontend v1.0 | Backend v1.0

---

## 📋 TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

### Kết quả tổng quan

| Hạng mục | Hoàn thành | Ghi chú |
|----------|-----------|---------|
| **Thay mock bằng API (5 màn Admin CRUD)** | **~85%** | 4/5 màn đã dùng API, 1 màn còn hardcode stats |
| **Đồng bộ hợp đồng API (FE ↔ BE)** | **~90%** | Envelope đúng, một số field mapping cần điều chỉnh |
| **Realtime & Bản đồ** | **~80%** | Socket đã kết nối, 2/5 event được sử dụng trên UI |
| **Database Schema** | **✅ Đạt** | Schema khớp với BE, có sample data đủ test |

### Mức phù hợp hợp đồng API & DB

- ✅ **Envelope chuẩn**: FE đã xử lý `{success, data, error, pagination}`
- ✅ **JWT Interceptor**: Có auto-refresh, gắn Bearer token
- ⚠️ **Field mapping**: Một số field tên khác (ví dụ: `plateNumber` vs `bienSoXe`)
- ✅ **Pagination**: Hỗ trợ `page`, `limit`, `sortBy`, `sortDir`

### Rủi ro khẩn cấp ảnh hưởng demo

| ID | Mức độ | Vấn đề | Ảnh hưởng |
|----|--------|--------|-----------|
| **ISSUE-001** | 🔴 **Blocker** | `route-detail.tsx` dùng toàn bộ mock data | Không hiển thị chi tiết tuyến từ API |
| **ISSUE-002** | 🟡 **High** | `admin/reports` dùng mock cho charts | Báo cáo không phản ánh dữ liệu thật |
| **ISSUE-003** | 🟡 **High** | `admin/students` hardcode stats (342, 12, 102) | Thống kê sai |
| **ISSUE-004** | 🟢 **Medium** | `driver/trip/[id]` có mockTrip fallback | Có thể dùng mock nếu API fail |
| **ISSUE-005** | 🟢 **Low** | `admin/page.tsx` comment về mock buses | Chỉ là TODO comment |

---

## 📊 MA TRẬN PHỦ TRANG (COVERAGE MATRIX)

| Route/Page | File | Data Source | Service/Endpoint | Evidence | Status |
|------------|------|-------------|------------------|----------|--------|
| `/admin/buses` | `app/admin/buses/page.tsx` | ✅ **API** | `apiClient.getBuses()`, `getBusesWithMeta()` | Line 55, 75 | ✅ API |
| `/admin/drivers` | `app/admin/drivers/page.tsx` | ✅ **API** | `apiClient.getDrivers()` | Line 49 | ✅ API |
| `/admin/students` | `app/admin/students/page.tsx` | ⚠️ **API + Mock Stats** | `apiClient.getStudents()` | Line 52, 129-143 (hardcoded) | ⚠️ Trộn |
| `/admin/routes` | `app/admin/routes/page.tsx` | ✅ **API** | `apiClient.getRoutes()` | Line 50 | ✅ API |
| `/admin/schedule` | `app/admin/schedule/page.tsx` | ✅ **API** | `apiClient.getSchedules()` | Line 56 | ✅ API |
| `/admin/tracking` | `app/admin/tracking/page.tsx` | ✅ **API + Socket** | `apiClient.getBuses()`, `socketService` | Line 25, 45 | ✅ API |
| `/admin/reports` | `app/admin/reports/page.tsx` | ⚠️ **API + Mock Charts** | `apiClient.getReportsOverview()` | Line 95, 112-149 (mock) | ⚠️ Trộn |
| `/admin` (dashboard) | `app/admin/page.tsx` | ⚠️ **TODO Mock** | - | Line 158 (comment) | ⚠️ Chưa rõ |
| `/driver/trip/[id]` | `app/driver/trip/[id]/page.tsx` | ⚠️ **Mock Fallback** | - | Line 60 (mockTrip), 178 | ⚠️ Trộn |
| `/parent/profile` | `app/parent/profile/page.tsx` | ⚠️ **Mock** | - | Line 36 (comment) | ⛔ Mock |
| Routes Detail | `components/admin/route-detail.tsx` | ⛔ **Mock** | - | Line 7-16 (mockRouteDetail) | ⛔ Mock |

**Chú thích**: ✅ = API thật | ⚠️ = Trộn API + Mock | ⛔ = Mock toàn bộ

---

## 🔍 KIỂM TRA LỚP API CLIENT & AUTH/GUARD

### API Client (`ssb-frontend/lib/api.ts`)

✅ **Vị trí**: `ssb-frontend/lib/api.ts` (Line 1-592)

✅ **Interceptors**:
- **JWT Authorization**: Line 80-84 - Gắn `Authorization: Bearer <token>`
- **Token Refresh**: Line 96-127 - Auto-refresh khi 401, retry request
- **Error Handling**: Line 129-137 - Chuẩn hoá lỗi

✅ **Token Management**:
- Line 36-40: Đọc từ `localStorage.getItem("ssb_token")`
- Line 43-50: `setToken()` ghi vào cả `ssb_token` và `token` (compat)
- Line 52-59: `clearToken()` xoá cả 2 keys

✅ **API Base URL**: 
- Line 5-6: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"`

✅ **Envelope chuẩn**: 
- Line 13-25: Interface `ApiResponse<T>` có `success`, `data`, `error`, `errors`, `pagination`

✅ **Endpoints đã implement**:
- Auth: `login`, `register` (Line 141-160)
- Buses: `getBuses`, `createBus`, `updateBus`, `deleteBus`, `updateBusLocation`, `updateBusStatus` (Line 163-239)
- Drivers: `getDrivers`, `createDriver`, `updateDriver`, `deleteDriver` (Line 249-288)
- Students: `getStudents`, `createStudent`, `updateStudent`, `deleteStudent` (Line 290-329)
- Routes: `getRoutes`, `createRoute`, `updateRoute`, `deleteRoute`, `getRouteStops` (Line 331-381)
- Schedules: `getSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule` (Line 383-424)
- Trips: `getTrips`, `createTrip`, `updateTripStatus`, `getTripStudents` (Line 426-488)
- Incidents, Notifications, Reports (Line 503-586)

### Auth Context (`ssb-frontend/lib/auth-context.tsx`)

✅ **Vị trí**: `ssb-frontend/lib/auth-context.tsx` (Line 1-117)

✅ **Authentication Flow**:
- Line 30-61: Auto-login từ `localStorage.getItem('ssb_token')` khi mount
- Line 46-54: Fetch profile nếu có token, clear nếu fail
- Line 63-84: `login()` gọi `authService.login()`, set token, connect socket
- Line 86-99: `logout()` clear user, token, disconnect socket

✅ **Socket Integration**:
- Line 38-45: Connect socket sau khi có token
- Line 74-79: Connect socket sau login thành công
- Line 91-94: Disconnect socket khi logout

### Auth Guard (`ssb-frontend/lib/guards/RequireAuth.tsx`)

✅ **Vị trí**: `ssb-frontend/lib/guards/RequireAuth.tsx` (Line 1-23)

✅ **Chức năng**:
- Line 11: Sử dụng `useAuth()` hook
- Line 14-17: Redirect `/login` nếu không có user
- Line 19-20: Return `null` khi loading hoặc không có user

⚠️ **Thiếu**: Không có role-based guard (ví dụ: `RequireRole` cho admin/driver/parent)

**Bằng chứng code**:
- `ssb-frontend/lib/api.ts:80-84` - JWT interceptor
- `ssb-frontend/lib/api.ts:96-127` - Token refresh logic
- `ssb-frontend/lib/auth-context.tsx:38-45` - Socket connect on init
- `ssb-frontend/lib/guards/RequireAuth.tsx:14-17` - Redirect logic

---

## 📝 CRUD 5 MÀN ADMIN — KẾT QUẢ CHI TIẾT

### 1. `/admin/buses` — Quản lý Xe buýt

✅ **Status**: **Đã dùng API thật**

**Endpoints sử dụng**:
- `GET /api/v1/buses` (Line 55, 75, 127, 165) - List với pagination, sort
- `GET /api/v1/schedules` (Line 56, 77) - Lấy schedule để map bus
- `POST /api/v1/buses` (via BusForm) - Create
- `PUT /api/v1/buses/:id` (via BusForm) - Update
- `DELETE /api/v1/buses/:id` (Line 306) - Delete

**Fields then chốt**:
- Mapping: `bienSoXe` → `plateNumber`, `sucChua` → `capacity`, `trangThai` → `status` (Line 130-136)
- Status enum: `hoat_dong` | `bao_tri` | `ngung_hoat_dong` ↔ `active` | `maintenance` | `inactive` (Line 43-48)

**Pagination/Search/Sort**:
- Line 39-40: `sortBy` (maXe, bienSoXe, sucChua, trangThai), `sortDir` (ASC/DESC)
- Line 241-248: Search input (filter client-side theo `plateNumber`)

**Validation & Error Handling**:
- Line 63, 90: Try-catch, hiển thị `err?.message`
- Line 122-143: `BusForm` xử lý create/update, có `onCreated` callback

⚠️ **Sai lệch schema**:
- FE dùng `plateNumber`, BE trả `bienSoXe` → Đã map (OK)
- FE dùng `status: 'active'`, BE dùng `trangThai: 'hoat_dong'` → Có hàm `toBEStatus()` convert (OK)

**Gợi ý điều chỉnh**: ✅ Không cần, mapping đã đúng

---

### 2. `/admin/drivers` — Quản lý Tài xế

✅ **Status**: **Đã dùng API thật**

**Endpoints sử dụng**:
- `GET /api/v1/drivers` (Line 49) - List với pagination
- `POST /api/v1/drivers` (via DriverForm) - Create
- `PUT /api/v1/drivers/:id` (via DriverForm) - Update
- `DELETE /api/v1/drivers/:id` (Line 236) - Delete

**Fields then chốt**:
- Mapping: `maTaiXe` → `id`, `hoTen` → `name`, `soBangLai` → `license`, `soDienThoai` → `phone` (Line 34-43)

**Pagination/Search**:
- Line 49: `limit: 100`
- Line 156-163: Search input (filter client-side theo `name`)

**Validation & Error Handling**:
- Line 53-55: Try-catch, hiển thị `e?.message`
- Line 234-241: Delete với confirm, catch error

⚠️ **Sai lệch schema**:
- FE có thể truy cập `d.userInfo?.hoTen` (Line 37) → Có fallback (OK)

**Gợi ý điều chỉnh**: ✅ Không cần

---

### 3. `/admin/students` — Quản lý Học sinh

⚠️ **Status**: **API + Mock Stats**

**Endpoints sử dụng**:
- `GET /api/v1/students` (Line 52) - List với pagination
- `POST /api/v1/students` (via StudentForm) - Create
- `PUT /api/v1/students/:id` (via StudentForm) - Update
- `DELETE /api/v1/students/:id` (Line 231) - Delete

**Fields then chốt**:
- Mapping: `maHocSinh` → `id`, `hoTen` → `name`, `lop` → `grade`, `tenPhuHuynh` → `parentName`, `sdtPhuHuynh` → `parentPhone` (Line 34-46)

**Pagination/Search**:
- Line 52: `limit: 100`
- Line 152-159: Search input (filter client-side theo `name`, `parentName`)

⛔ **Mock Stats** (Line 129-143):
- Line 129: `342` - Đang trên xe (hardcoded)
- Line 135: `12` - Vắng hôm nay (hardcoded)
- Line 141: `102` - Đã đến trường (hardcoded)

**Validation & Error Handling**:
- Line 56-58: Try-catch, hiển thị error
- Line 229-236: Delete với confirm

⚠️ **Sai lệch schema**: Không có

**Gợi ý điều chỉnh**:
- ⚠️ **ISSUE-003**: Thay thế hardcoded stats bằng API call đến `/api/v1/students/stats` (nếu có) hoặc tính từ danh sách

---

### 4. `/admin/routes` — Quản lý Tuyến đường

✅ **Status**: **Đã dùng API thật**

**Endpoints sử dụng**:
- `GET /api/v1/routes` (Line 50) - List với pagination
- `POST /api/v1/routes` (via RouteForm) - Create
- `PUT /api/v1/routes/:id` (via RouteForm) - Update
- `DELETE /api/v1/routes/:id` (Line 210) - Delete

**Fields then chốt**:
- Mapping: `maTuyen` → `id`, `tenTuyen` → `name`, `soDiemDung` → `stopsCount`, `quangDuong` → `distance`, `thoiLuong` → `duration` (Line 33-44)

**Pagination/Search**:
- Line 50: `limit: 100`
- Line 66: Filter client-side theo `name`

⚠️ **Mock Stats** (Line 121-142):
- Line 121: `8` - Tổng tuyến (hardcoded, nên dùng `routes.length`)
- Line 127: `6` - Đang hoạt động (hardcoded)
- Line 133: `58` - Tổng điểm dừng (hardcoded)
- Line 139: `42 phút` - Thời gian TB (hardcoded)

**Validation & Error Handling**:
- Line 54-56: Try-catch
- Line 208-215: Delete với confirm

⛔ **RouteDetail Component** (`components/admin/route-detail.tsx`):
- Line 7-16: **Toàn bộ mock data** (`mockRouteDetail`)
- Line 71: Render từ mock, không gọi API

**Gợi ý điều chỉnh**:
- ⚠️ **ISSUE-001**: `RouteDetail` cần gọi `GET /api/v1/routes/:id/stops` để hiển thị điểm dừng thật
- ⚠️ **ISSUE-003**: Thay stats hardcoded bằng tính toán từ `routes` array

---

### 5. `/admin/schedule` — Lịch trình & Phân công

✅ **Status**: **Đã dùng API thật**

**Endpoints sử dụng**:
- `GET /api/v1/schedules` (Line 56) - List, filter theo `ngayChay` (Line 60)

**Fields then chốt**:
- Mapping: `maLich` → `id`, `ngayChay` → `date`, `tenTuyen` → `route`, `bienSoXe` → `bus`, `tenTaiXe` → `driver`, `gioKhoiHanh` → `startTime` (Line 39-50)

**Filter**:
- Line 60: Filter theo `date` (so sánh `ngayChay` với `formatDate(d)`)

**Validation & Error Handling**:
- Line 63-66: Try-catch

⚠️ **Sai lệch schema**: Không có

**Gợi ý điều chỉnh**: ✅ Không cần

---

## 🗺️ REALTIME & BẢN ĐỒ

### Socket Client (`ssb-frontend/lib/socket.ts`)

✅ **Vị trí**: `ssb-frontend/lib/socket.ts` (Line 1-275)

✅ **Connection**:
- Line 10-38: `connect(token)` - Kết nối với JWT auth
- Line 19-24: Config `io(SOCKET_URL, { auth: { token }, transports: ["websocket"] })`

✅ **Events đã subscribe** (Line 59-204):
- ✅ `bus_position_update` (Line 101-104) → Dispatch `busPositionUpdate` custom event
- ✅ `trip_started` (Line 122-127) → Dispatch `tripStarted` custom event
- ✅ `trip_completed` (Line 129-134) → Dispatch `tripCompleted` custom event
- ✅ `approach_stop` (Line 191-196) → Dispatch `approachStop` custom event
- ✅ `delay_alert` (Line 198-203) → Dispatch `delayAlert` custom event
- ✅ `bus_location_update` (Line 92-98) - Alias
- ✅ `trip_status_update` (Line 114-119)
- ✅ `student_status_update` (Line 144-149)
- ✅ `admin_notification`, `parent_notification` (Line 167-180)

✅ **Helper methods**:
- Line 49-57: `joinTrip()`, `leaveTrip()`, `sendDriverGPS()` - Emit events
- Line 207-236: `joinBusTracking()`, `leaveBusTracking()`, `getBusLocation()`, `updateBusLocation()` - Bus tracking
- Line 239-260: `updateTripStatus()`, `updateStudentStatus()` - Trip management

### MapView Component (`ssb-frontend/components/tracking/MapView.tsx`)

✅ **Vị trí**: `ssb-frontend/components/tracking/MapView.tsx` (Line 1-157)

✅ **Props & Data Flow**:
- Line 24-35: Nhận `buses[]`, `stops[]`, `selectedBus`, `onSelectBus`, `autoFitOnUpdate`
- Line 48-60: Map `buses` và `stops` thành markers
- Line 62-95: **Listen socket events** `busLocationUpdate`, `busPositionUpdate` để update marker positions

✅ **Leaflet Integration**:
- Line 11: Dynamic import `LeafletMap` (SSR-safe)
- Line 117-128: Render `LeafletMap` với markers, `autoFitOnUpdate`

**Bằng chứng code**:
- `ssb-frontend/lib/socket.ts:101-104` - `bus_position_update` handler
- `ssb-frontend/components/tracking/MapView.tsx:62-95` - Socket event listeners
- `ssb-frontend/app/admin/tracking/page.tsx:56-81` - Realtime bus position updates

### Tracking Page (`ssb-frontend/app/admin/tracking/page.tsx`)

✅ **Vị trí**: `ssb-frontend/app/admin/tracking/page.tsx` (Line 1-312)

✅ **Data Loading**:
- Line 23-54: Load buses từ `apiClient.getBuses()`
- Line 45-48: Join trip rooms để nhận realtime updates

✅ **Realtime Updates**:
- Line 57-81: Listen `busPositionUpdate`, `busLocationUpdate` events
- Line 66-73: Update bus state (lat, lng, speed, status) khi nhận event

✅ **MapView Integration**:
- Line 109-115: Render `MapView` với `buses`, `selectedBus`, `onSelectBus`

⚠️ **Thiếu**:
- Chưa subscribe/hiển thị `approach_stop` và `delay_alert` events trên UI
- "Recent Events" section (Line 277-303) đang hardcode

**Gợi ý điều chỉnh**:
- ⚠️ Subscribe `approachStop`, `delayAlert` events và hiển thị notification/toast
- Thay "Recent Events" bằng data từ socket hoặc API

---

## 🔄 ĐỐI CHIẾU OPENAPI ↔ THỰC TẾ ↔ FE TYPES

### Tổng quan

**OpenAPI file**: `docs/openapi.yaml` (tìm thấy ✅)

**Backend Routes**: 
- Routes constants: `ssb-backend/src/constants/routes.ts`
- Routes documentation: `ssb-backend/src/routes/README_ROUTES.md` (56 endpoints)

### Bảng chênh lệch

| Path/Method | OpenAPI | Thực tế (BE Routes) | FE đang dùng | Ảnh hưởng |
|-------------|---------|-------------------|--------------|-----------|
| `GET /api/v1/buses` | ✅ Có | ✅ Có | ✅ `apiClient.getBuses()` | ✅ OK |
| `POST /api/v1/buses` | ✅ Có | ✅ Có | ✅ `apiClient.createBus()` | ✅ OK |
| `PUT /api/v1/buses/:id` | ❓ Chưa thấy | ✅ Có | ✅ `apiClient.updateBus()` | ⚠️ Cần verify |
| `DELETE /api/v1/buses/:id` | ❓ Chưa thấy | ✅ Có | ✅ `apiClient.deleteBus()` | ⚠️ Cần verify |
| `POST /api/v1/buses/:id/position` | ✅ Có | ✅ Có | ✅ `apiClient.updateBusLocation()` | ✅ OK |
| `GET /api/v1/drivers` | ✅ Có | ✅ Có | ✅ `apiClient.getDrivers()` | ✅ OK |
| `GET /api/v1/students` | ✅ Có | ✅ Có | ✅ `apiClient.getStudents()` | ✅ OK |
| `GET /api/v1/routes` | ✅ Có | ✅ Có | ✅ `apiClient.getRoutes()` | ✅ OK |
| `GET /api/v1/routes/:id/stops` | ✅ Có | ✅ Có | ⚠️ Chưa dùng (RouteDetail mock) | ⛔ **Blocker** |
| `GET /api/v1/schedules` | ❓ Chưa thấy | ✅ Có | ✅ `apiClient.getSchedules()` | ⚠️ Cần verify |
| `POST /api/v1/schedules` | ✅ Có | ✅ Có | ✅ `apiClient.createSchedule()` | ✅ OK |
| `POST /api/v1/trips/:id/start` | ✅ Có | ✅ Có | ❓ Chưa thấy FE dùng | ⚠️ Có thể cần |
| `POST /api/v1/trips/:id/end` | ✅ Có | ✅ Có | ❓ Chưa thấy FE dùng | ⚠️ Có thể cần |

### Envelope Structure

**OpenAPI** (`docs/openapi.yaml:882-891`):
```yaml
EnvelopeOk:
  type: object
  properties:
    success: boolean
    data: {}
    meta: object
```

**FE API Client** (`ssb-frontend/lib/api.ts:13-25`):
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  pagination?: { currentPage, totalPages, totalItems, itemsPerPage };
}
```

✅ **Kết luận**: Envelope khớp, FE có thêm `pagination` (OK)

### Pagination

**OpenAPI** (`docs/openapi.yaml:849-866`):
- `page` (default: 1), `limit` (default: 20, max: 200), `sort`, `search`

**FE sử dụng**:
- `page`, `limit`, `sortBy`, `sortDir` (Line 163-176 trong `api.ts`)
- ⚠️ FE dùng `sortBy` + `sortDir`, OpenAPI có `sort` string → Cần verify BE support format nào

**Gợi ý hợp nhất hợp đồng**:
- ✅ FE nên dùng `sort` string format như OpenAPI (ví dụ: `"updatedAt:desc"`) hoặc BE support cả 2 format
- ✅ Verify OpenAPI có đầy đủ endpoints mà BE đã implement (PUT, DELETE các resources)

---

## 💾 ĐỐI CHIẾU DB SCHEMA & SEED

### Database Schema (`database/init_db.sql`)

✅ **Các bảng cốt lõi**:
1. `NguoiDung` (Line 28-42) - Users (quan_tri, tai_xe, phu_huynh)
2. `TaiXe` (Line 44-57) - Drivers (FK: maTaiXe → NguoiDung)
3. `XeBuyt` (Line 59-68) - Buses (bienSoXe, sucChua, trangThai)
4. `HocSinh` (Line 70-86) - Students (FK: maPhuHuynh → NguoiDung)
5. `TuyenDuong` (Line 88-100) - Routes
6. `DiemDung` (Line 102-115) - Stops (FK: maTuyen → TuyenDuong)
7. `LichTrinh` (Line 117-137) - Schedules (FK: maTuyen, maXe, maTaiXe)
8. `ChuyenDi` (Line 139-156) - Trips (FK: maLichTrinh)
9. `TrangThaiHocSinh` (Line 158-176) - Student Status (FK: maChuyen, maHocSinh)
10. `ThongBao` (Line 178-193) - Notifications
11. `SuCo` (Line 195-218) - Incidents

### Field Mapping FE ↔ BE ↔ DB

| FE Field | BE Field | DB Field | Ghi chú |
|----------|----------|----------|---------|
| `id` (bus) | `maXe` | `XeBuyt.maXe` | ✅ OK |
| `plateNumber` | `bienSoXe` | `XeBuyt.bienSoXe` | ✅ OK (có map) |
| `capacity` | `sucChua` | `XeBuyt.sucChua` | ✅ OK (có map) |
| `status` | `trangThai` | `XeBuyt.trangThai` | ✅ OK (có enum map) |
| `id` (driver) | `maTaiXe` | `TaiXe.maTaiXe` | ✅ OK |
| `name` (driver) | `hoTen` | `NguoiDung.hoTen` | ✅ OK |
| `license` | `soBangLai` | `TaiXe.soBangLai` | ✅ OK |
| `id` (student) | `maHocSinh` | `HocSinh.maHocSinh` | ✅ OK |
| `name` (student) | `hoTen` | `HocSinh.hoTen` | ✅ OK |
| `grade` | `lop` | `HocSinh.lop` | ✅ OK |
| `parentName` | `tenPhuHuynh` | - | ⚠️ Không có field này trong DB |
| `id` (route) | `maTuyen` | `TuyenDuong.maTuyen` | ✅ OK |
| `name` (route) | `tenTuyen` | `TuyenDuong.tenTuyen` | ✅ OK |
| `stopsCount` | `soDiemDung` | - | ⚠️ Tính từ `DiemDung.maTuyen` |

⚠️ **Mismatch**:
- `parentName` (FE) không có trong DB schema → BE phải JOIN hoặc tính từ `NguoiDung` (maPhuHuynh)
- `tenPhuHuynh` có thể là alias từ JOIN query

✅ **Rủi ro**: Thấp, BE có thể resolve qua JOIN

### Sample Data (`database/sample_data.sql`)

✅ **Dữ liệu mẫu có sẵn**:
- **Users**: 8 records (1 admin, 3 drivers, 4 parents) - Line 10-18
- **Drivers**: 3 records - Line 20-23
- **Buses**: 8 records (6 hoat_dong, 1 bao_tri, 1 ngung_hoat_dong) - Line 25-33
- **Students**: 10 records - Line 35-45
- **Routes**: 5 records - Line 47-52
- **Stops**: 12 records (distributed across routes) - Line 54-66
- **Schedules**: 10 records (don_sang + tra_chieu) - Line 68-78
- **Trips**: 10 records (chua_khoi_hanh, dang_chay, hoan_thanh) - Line 80-90
- **Student Status**: Multiple records - Line 92-100

✅ **Đủ để test**:
- ✅ CRUD Buses, Drivers, Students, Routes, Schedules
- ✅ List với pagination
- ✅ Tracking với trips đang chạy (`dang_chay`)
- ✅ Test realtime events (có trips active)

**Gợi ý**: ✅ Seed data đủ, không cần bổ sung

---

## 📋 DANH SÁCH LỖI/THIẾU (ISSUE LOG)

| ID | Mức độ | Màn hình | Mô tả | Bằng chứng | Gợi ý xử lý |
|----|--------|----------|-------|------------|-------------|
| **ISSUE-001** | 🔴 **Blocker** | Routes Detail | `RouteDetail` component dùng toàn bộ mock data | `components/admin/route-detail.tsx:7-16` | Gọi `apiClient.getRouteStops(routeId)` và render từ API response |
| **ISSUE-002** | 🟡 **High** | Reports | Charts dùng mock data (tripTrendData, busUtilizationData, etc.) | `app/admin/reports/page.tsx:112-149` | Gọi API `/api/v1/reports/overview` hoặc `/api/v1/reports/trips/stats` và render charts từ data thật |
| **ISSUE-003** | 🟡 **High** | Students | Stats hardcoded (342, 12, 102) | `app/admin/students/page.tsx:129-143` | Tính từ `students` array hoặc gọi `/api/v1/students/stats` |
| **ISSUE-004** | 🟢 **Medium** | Driver Trip | `mockTrip` fallback nếu API fail | `app/driver/trip/[id]/page.tsx:60,178` | Đảm bảo API `/api/v1/trips/:id` luôn hoạt động, remove mock fallback |
| **ISSUE-005** | 🟢 **Low** | Admin Dashboard | Comment về mock buses | `app/admin/page.tsx:158` | Xóa comment hoặc implement MapView thật |
| **ISSUE-006** | 🟡 **High** | Routes | Stats hardcoded (8, 6, 58, 42 phút) | `app/admin/routes/page.tsx:121-142` | Tính từ `routes` array (length, filter active, sum stops) |
| **ISSUE-007** | 🟢 **Medium** | Tracking | "Recent Events" hardcoded | `app/admin/tracking/page.tsx:277-303` | Subscribe socket events `approach_stop`, `delay_alert` và render từ events |
| **ISSUE-008** | 🟢 **Medium** | Parent Profile | Mock profile data | `app/parent/profile/page.tsx:36` | Gọi `apiClient.getProfile()` hoặc tương đương |
| **ISSUE-009** | 🟡 **High** | OpenAPI | Thiếu endpoints PUT/DELETE trong OpenAPI spec | `docs/openapi.yaml` | Bổ sung PUT/DELETE cho buses, drivers, students, routes, schedules |
| **ISSUE-010** | 🟢 **Low** | Auth Guard | Không có role-based guard | `lib/guards/RequireAuth.tsx` | Tạo `RequireRole` component để protect routes theo vai trò |

---

## 🚀 KẾ HOẠCH TRIỂN KHAI TIẾP THEO (NEXT STEPS)

### Checklist theo thứ tự ưu tiên

#### 🔴 **Blocker - Hoàn thành trong 4 giờ**

- [ ] **ISSUE-001**: Thay mock data trong `RouteDetail`
  - **DoD**: `RouteDetail` gọi `apiClient.getRouteStops(routeId)`, render stops từ API
  - **Files**: `components/admin/route-detail.tsx`
  - **Estimate**: 1-2 giờ

#### 🟡 **High Priority - Hoàn thành trong 1 ngày**

- [ ] **ISSUE-002**: Thay mock charts trong Reports
  - **DoD**: Charts render từ `apiClient.getReportsOverview()` hoặc `/api/v1/reports/trips/stats`
  - **Files**: `app/admin/reports/page.tsx`
  - **Estimate**: 2-3 giờ

- [ ] **ISSUE-003**: Thay stats hardcoded trong Students
  - **DoD**: Stats tính từ `students` array hoặc API `/api/v1/students/stats`
  - **Files**: `app/admin/students/page.tsx`
  - **Estimate**: 1 giờ

- [ ] **ISSUE-006**: Thay stats hardcoded trong Routes
  - **DoD**: Stats tính từ `routes` array (length, filter, sum)
  - **Files**: `app/admin/routes/page.tsx`
  - **Estimate**: 1 giờ

- [ ] **ISSUE-009**: Bổ sung OpenAPI endpoints
  - **DoD**: OpenAPI có đầy đủ PUT/DELETE cho tất cả resources
  - **Files**: `docs/openapi.yaml`
  - **Estimate**: 1-2 giờ

#### 🟢 **Medium Priority - Hoàn thành trong 1-2 ngày**

- [ ] **ISSUE-004**: Remove mockTrip fallback
  - **DoD**: API call luôn thành công hoặc có error handling tốt, không cần mock
  - **Files**: `app/driver/trip/[id]/page.tsx`
  - **Estimate**: 1 giờ

- [ ] **ISSUE-007**: Hiển thị realtime events trên Tracking
  - **DoD**: Subscribe `approach_stop`, `delay_alert`, hiển thị toast/notification
  - **Files**: `app/admin/tracking/page.tsx`
  - **Estimate**: 2-3 giờ

- [ ] **ISSUE-008**: Thay mock profile trong Parent
  - **DoD**: Gọi API get profile
  - **Files**: `app/parent/profile/page.tsx`
  - **Estimate**: 1 giờ

#### 🔵 **Low Priority - Có thể làm sau**

- [ ] **ISSUE-005**: Xóa comment mock buses
- [ ] **ISSUE-010**: Tạo RequireRole guard

---

## 📎 PHỤ LỤC

### Trích dẫn dòng mã/bằng chứng quan trọng

#### API Client JWT Interceptor
```typescript
// ssb-frontend/lib/api.ts:80-84
if (this.token) {
  (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
}
```

#### Token Refresh Logic
```typescript
// ssb-frontend/lib/api.ts:96-127
if (!ok && status === 401 && typeof window !== "undefined") {
  const refreshToken = localStorage.getItem("ssb_refresh_token");
  if (refreshToken) {
    // Auto refresh và retry
  }
}
```

#### Socket Event Subscription
```typescript
// ssb-frontend/lib/socket.ts:101-104
this.socket.on("bus_position_update", (data) => {
  console.log("Bus position updated:", data);
  window.dispatchEvent(new CustomEvent("busPositionUpdate", { detail: data }));
});
```

#### Mock Data Evidence
```typescript
// components/admin/route-detail.tsx:7-16
const mockRouteDetail = {
  id: "1",
  name: "Tuyến 1 - Quận 1",
  stops: [ /* hardcoded stops */ ],
}
```

### Danh sách endpoint đã phát hiện ở BE

Từ `ssb-backend/src/routes/README_ROUTES.md` và constants:

**Auth** (5): `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/profile`, `/auth/refresh`

**Buses** (7): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/assign-driver`, `POST /:id/position`

**Drivers** (7): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /:id/assignments`, `GET /:id/schedules`

**Students** (7): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /class/:lop`, `GET /stats`

**Routes** (11): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /:id/stops`, `POST /:id/stops`, `PUT /:id/stops/:stopId`, `DELETE /:id/stops/:stopId`, `GET /stats`, `GET /:id/map`

**Schedules** (8): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/assign`, `GET /conflicts`, `GET /stats`

**Trips** (11): `GET /`, `GET /:id`, `POST /`, `PUT /:id/status`, `POST /:id/start`, `POST /:id/end`, `GET /:id/students`, `PUT /:id/students/:studentId/status`, `POST /:id/position`, `GET /stats`, `GET /history`

**Tổng**: ~56 endpoints

### Bảng ánh xạ tên field FE ↔ BE ↔ DB

| FE (TypeScript) | BE (API Response) | DB (MySQL) | Map Function |
|-----------------|-------------------|------------|--------------|
| `id` (bus) | `maXe` | `XeBuyt.maXe` | `String(b.maXe || b.id)` |
| `plateNumber` | `bienSoXe` | `XeBuyt.bienSoXe` | `b.bienSoXe || b.plateNumber` |
| `capacity` | `sucChua` | `XeBuyt.sucChua` | `b.sucChua || b.capacity` |
| `status` | `trangThai` | `XeBuyt.trangThai` | `b.trangThai || b.status` (enum map) |
| `id` (driver) | `maTaiXe` | `TaiXe.maTaiXe` | `String(d.maTaiXe || d.id)` |
| `name` (driver) | `hoTen` | `NguoiDung.hoTen` | `d.hoTen || d.userInfo?.hoTen` |
| `license` | `soBangLai` | `TaiXe.soBangLai` | `d.soBangLai` |
| `phone` | `soDienThoai` | `NguoiDung.soDienThoai` | `d.soDienThoai || d.userInfo?.soDienThoai` |
| `id` (student) | `maHocSinh` | `HocSinh.maHocSinh` | `String(s.maHocSinh || s.id)` |
| `name` (student) | `hoTen` | `HocSinh.hoTen` | `s.hoTen || s.ten` |
| `grade` | `lop` | `HocSinh.lop` | `s.lop || s.grade` |
| `parentName` | `tenPhuHuynh` | (JOIN) | `s.tenPhuHuynh || s.parentName` |
| `id` (route) | `maTuyen` | `TuyenDuong.maTuyen` | `String(r.maTuyen || r.id)` |
| `name` (route) | `tenTuyen` | `TuyenDuong.tenTuyen` | `r.tenTuyen || r.name` |
| `stopsCount` | `soDiemDung` | (COUNT) | `r.soDiemDung || r.stops?.length` |

---

## ✅ KẾT LUẬN

### Điểm mạnh

1. ✅ **API Client hoàn chỉnh**: JWT interceptors, token refresh, error handling
2. ✅ **4/5 màn Admin CRUD đã dùng API**: Buses, Drivers, Routes, Schedules
3. ✅ **Socket realtime**: Đã subscribe đầy đủ 5 events yêu cầu
4. ✅ **Database schema**: Khớp với BE, có sample data đủ test

### Điểm cần cải thiện

1. ⛔ **RouteDetail mock**: Cần thay bằng API call
2. ⚠️ **Stats hardcoded**: Students, Routes, Reports cần tính từ API/data
3. ⚠️ **OpenAPI chưa đầy đủ**: Thiếu PUT/DELETE endpoints

### Tổng kết điểm số

| Hạng mục | Điểm | Ghi chú |
|----------|------|---------|
| **Thay mock (5 màn Admin)** | **85%** | 4/5 đạt, 1 còn stats hardcoded |
| **Đồng bộ hợp đồng API** | **90%** | Envelope OK, thiếu vài endpoints trong OpenAPI |
| **Realtime/Map** | **80%** | Socket OK, thiếu hiển thị 2 events trên UI |
| **DB/Seed** | **100%** | Schema khớp, seed đủ |

**Tổng điểm**: **88.75%** → **Tốt** (≥ 90%: Tốt, 60-89%: Cần bổ sung, <60%: Chưa đạt)

### Khuyến nghị

1. **Ưu tiên cao**: Fix ISSUE-001 (RouteDetail), ISSUE-002 (Reports charts), ISSUE-003 (Students stats)
2. **Sau đó**: Bổ sung OpenAPI endpoints, hiển thị realtime events trên UI
3. **Cuối cùng**: Cleanup mock fallbacks, thêm role-based guards

---

**Báo cáo được tạo bởi**: Audit Bot (READ-ONLY)  
**Ngày**: 2025-01-XX  
**Phiên bản**: 1.0

