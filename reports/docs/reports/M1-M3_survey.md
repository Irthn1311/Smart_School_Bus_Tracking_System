# M1-M3 Survey - CRUD & Scheduler Hiện Trạng

**Date:** 2025-11-11  
**Scope:** M1 (Buses/Drivers/Students), M2 (Routes/Stops), M3 (Schedules)  
**Purpose:** Đánh giá hiện trạng trước khi chuẩn hóa M1-M3

## 1. Backend - Hiện Trạng

### 1.1 Controllers & Services
- ✅ **Controllers đã có**: BusController, DriverController, StudentController, RouteController, StopController, ScheduleController
- ✅ **Services đã có**: BusService, DriverService, StudentService, RouteService, StopService, ScheduleService
- ⚠️ **Response envelope**: Một số dùng response helper, một số trả inline → cần chuẩn hóa
- ⚠️ **Pagination**: Đã có nhưng format khác nhau (pagination vs meta) → cần thống nhất

### 1.2 Models
- ✅ **Models đã có**: XeBuytModel, TaiXeModel, HocSinhModel, TuyenDuongModel, DiemDungModel, LichTrinhModel
- ✅ **DB schema**: Đã có bảng tương ứng với đầy đủ fields

### 1.3 Validation
- ✅ **ValidationMiddleware**: Đã có validateBus, validateDriver, validateStudent, validateRoute, validateStop
- ⚠️ **Schedule validation**: Chưa có conflict detection → cần thêm

### 1.4 Routes
- ✅ **Routes đã có**: `/buses`, `/drivers`, `/students`, `/routes`, `/stops`, `/schedules`
- ❌ **Stops reorder**: Chưa có endpoint `/routes/:routeId/stops/reorder` → cần thêm
- ⚠️ **Schedule conflict**: Chưa có endpoint check conflict → cần thêm vào POST/PUT

### 1.5 RBAC
- ✅ **AuthMiddleware.authorize()**: Đã có từ M0
- ⚠️ **Driver visibility**: Chưa filter theo assignments → cần thêm
- ⚠️ **Parent visibility**: Chưa filter students theo parent → cần thêm

## 2. Frontend - Hiện Trạng

### 2.1 Admin Pages
- ✅ **Pages đã có**: `/admin/buses`, `/admin/drivers`, `/admin/students`, `/admin/routes`, `/admin/schedule`
- ✅ **UI components**: Tables, forms, dialogs đã có
- ⚠️ **API services**: Một số dùng apiClient, một số dùng hooks → cần chuẩn hóa

### 2.2 Features
- ✅ **CRUD**: Create/Edit/Delete dialogs đã có
- ✅ **Search/Sort**: Đã có nhưng chưa nhất quán
- ❌ **Conflict UI**: Chưa có banner hiển thị 409 conflict → cần thêm
- ⚠️ **Stops reorder**: Có UI drag-drop nhưng chưa gọi API reorder → cần hoàn thiện

## 3. Kế Hoạch File-Level

### 3.1 Backend - Files Cần Sửa

**Controllers (chuẩn hóa response envelope):**
- `src/controllers/BusController.js` - Dùng response helper, chuẩn hóa meta
- `src/controllers/DriverController.js` - Dùng response helper, chuẩn hóa meta
- `src/controllers/StudentController.js` - Dùng response helper, chuẩn hóa meta
- `src/controllers/RouteController.js` - Dùng response helper, chuẩn hóa meta
- `src/controllers/StopController.js` - Dùng response helper
- `src/controllers/ScheduleController.js` - Dùng response helper, thêm conflict check

**Services (thêm conflict detection):**
- `src/services/ScheduleService.js` - Thêm `checkScheduleConflict()`, `create()` và `update()` gọi conflict check
- `src/services/RouteService.js` - Thêm `reorderStops()` atomic với transaction

**Routes (thêm endpoints):**
- `src/routes/api/route.js` - Thêm `POST /routes/:routeId/stops/reorder`
- `src/routes/api/schedule.js` - Thêm conflict check vào POST/PUT

**Models (thêm indexes):**
- Tạo migration script hoặc SQL để thêm indexes:
  - `schedules(bus_id, start_time, end_time)`
  - `schedules(driver_id, start_time, end_time)`
  - `stops(route_id, order)`

### 3.2 Frontend - Files Cần Sửa

**Services:**
- `lib/services/bus.service.ts` - Chuẩn hóa query builder
- `lib/services/driver.service.ts` - Chuẩn hóa query builder
- `lib/services/student.service.ts` - Chuẩn hóa query builder
- `lib/services/route.service.ts` - Thêm `reorderStops()`
- `lib/services/schedule.service.ts` - Thêm conflict handling

**Pages:**
- `app/admin/buses/page.tsx` - Chuẩn hóa pagination/search/sort
- `app/admin/drivers/page.tsx` - Chuẩn hóa pagination/search/sort
- `app/admin/students/page.tsx` - Chuẩn hóa pagination/search/sort
- `app/admin/routes/[id]/page.tsx` - Thêm reorder API call
- `app/admin/schedule/page.tsx` - Thêm conflict UI banner

**Components:**
- `components/admin/schedule-form.tsx` - Thêm conflict error display

### 3.3 Documentation - Files Cần Sửa

**OpenAPI:**
- `docs/openapi.yaml` - Thêm schemas: Bus, Driver, Student, Route, Stop, Schedule, PaginationMeta
- Thêm paths đầy đủ cho CRUD + stops/reorder
- Thêm 409 response cho schedules với ScheduleConflict schema

**Postman:**
- `docs/postman_collection.json` - Cập nhật theo OpenAPI

### 3.4 Tests - Files Cần Tạo

**Backend:**
- `scripts/test_crud_scheduler.js` - E2E test script

## 4. Tóm Tắt

### ✅ Đã Có (Re-use)
- Controllers, Services, Models cho tất cả entities
- Validation middleware
- RBAC middleware
- Frontend pages và components
- Pagination/search/sort (chưa chuẩn hóa)

### ⚠️ Cần Chuẩn Hóa
- Response envelope (dùng response helper nhất quán)
- Pagination format (meta: { page, pageSize, total, sortBy, sortOrder, q })
- Query params (page, pageSize, q, sortBy, sortOrder)

### ❌ Cần Thêm
- Schedule conflict detection (409)
- Stops reorder endpoint (atomic)
- Conflict UI banner (frontend)
- Database indexes
- E2E test script

## 5. Ưu Tiên Thực Thi

1. **Backend Response Envelope** - Chuẩn hóa tất cả controllers
2. **Backend Conflict Detection** - Thêm vào ScheduleService
3. **Backend Stops Reorder** - Thêm endpoint atomic
4. **Backend Indexes** - Thêm DB indexes
5. **Frontend Services** - Chuẩn hóa query builder
6. **Frontend Conflict UI** - Thêm banner 409
7. **Frontend Reorder** - Hoàn thiện stops reorder
8. **OpenAPI + Postman** - Cập nhật đầy đủ
9. **Tests + README** - E2E script và documentation

