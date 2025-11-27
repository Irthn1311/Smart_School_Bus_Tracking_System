# Backend Audit Report v1.1
## Smart School Bus Tracking System - Schema Refactoring

**Date:** 2025-01-XX  
**Purpose:** Audit hiện trạng backend trước khi refactor để khớp schema DB mới (normalized stops + route_stops)

---

## 1. Tổng quan cấu trúc

### 1.1 Thư mục chính
```
ssb-backend/
├── src/
│   ├── config/          # DB, env, firebase config
│   ├── controllers/     # 11 controllers
│   ├── models/          # 12 models (MySQL)
│   ├── routes/          # API routes
│   ├── services/        # Business logic layer
│   ├── middlewares/     # Auth, validation, error handling
│   ├── utils/           # Geo utilities (haversine)
│   └── ws/              # Socket.IO
├── docs/                # Documentation
├── postman/             # Postman collections
└── scripts/             # Utility scripts
```

### 1.2 Công nghệ stack
- **Runtime:** Node.js (ES modules)
- **Framework:** Express.js 5.1.0
- **Database:** MySQL 2 (mysql2)
- **Auth:** JWT (jsonwebtoken)
- **Validation:** Joi
- **WebSocket:** Socket.IO 4.8.1
- **Firebase:** Firebase Admin SDK
- **Cache:** ❌ Chưa có (cần Redis)
- **Maps API:** ❌ Chưa có backend integration

---

## 2. Models hiện trạng

### 2.1 TuyenDuongModel (`src/models/TuyenDuongModel.js`)
**Vấn đề:**
- ✅ Có đầy đủ CRUD methods
- ❌ `getById()` query `DiemDung` với `maTuyen` (cột cũ - không tồn tại trong schema mới)
- ❌ Chưa hỗ trợ `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`, `polyline`
- ❌ Chưa có method để lấy stops qua `route_stops`

**Code cần sửa:**
```javascript
// Line 24-29: Query cũ (SAI)
const [diemDung] = await pool.query(
  `SELECT * FROM DiemDung 
   WHERE maTuyen = ? 
   ORDER BY thuTu`,
  [id]
);
```

### 2.2 DiemDungModel (`src/models/DiemDungModel.js`)
**Vấn đề:**
- ❌ Có `maTuyen`, `thuTu` trong model (cột không tồn tại trong schema mới)
- ❌ `create()` method yêu cầu `maTuyen`, `thuTu` (SAI)
- ❌ `getByRoute()`, `getByRouteAndOrder()` query với `maTuyen`, `thuTu` (SAI)
- ❌ `reorder()` update `thuTu` trong DiemDung (SAI - nên update `route_stops.sequence`)
- ✅ Có `viDo`, `kinhDo` (đúng với schema mới)
- ❌ Chưa có `address`, `scheduled_time`

**Code cần sửa:**
```javascript
// Line 5-10: Query cũ (SAI)
async getByRoute(maTuyen) {
  const [rows] = await pool.query(
    `SELECT * FROM DiemDung WHERE maTuyen = ? ORDER BY thuTu`,
    [maTuyen]
  );
  return rows;
}
```

### 2.3 RouteStopModel
**Vấn đề:**
- ❌ **Chưa có model này** - cần tạo mới
- Cần methods: `addStop()`, `removeStop()`, `reorder()`, `getByRoute()`, `getByStop()`

---

## 3. Controllers hiện trạng

### 3.1 RouteController (`src/controllers/RouteController.js`)
**Endpoints:**
- ✅ `GET /routes` - getAllRoutes
- ✅ `GET /routes/:id` - getRouteById
- ✅ `POST /routes` - createRoute
- ✅ `PUT /routes/:id` - updateRoute
- ✅ `DELETE /routes/:id` - deleteRoute
- ✅ `GET /routes/:id/stops` - getRouteStops
- ✅ `POST /routes/:id/stops` - addStopToRoute
- ✅ `PUT /routes/:id/stops/:stopId` - updateStop
- ✅ `DELETE /routes/:id/stops/:stopId` - removeStopFromRoute
- ✅ `GET /routes/stats` - getRouteStats

**Vấn đề:**
- ❌ Tất cả methods dùng logic cũ (maTuyen, thuTu trong DiemDung)
- ❌ `addStopToRoute()` tạo stop mới với `maTuyen` (SAI - nên tạo stop độc lập rồi thêm vào route_stops)
- ❌ `updateStop()` update `thuTu` trong DiemDung (SAI - nên update route_stops.sequence)
- ❌ `removeStopFromRoute()` xóa stop (SAI - chỉ nên xóa khỏi route_stops, không xóa stop gốc)
- ❌ Chưa có endpoint `POST /routes/:id/rebuild-polyline`
- ❌ Chưa có endpoint `PATCH /routes/:id/stops/reorder`

### 3.2 StopController
**Vấn đề:**
- ❌ **Chưa có controller này** - cần tạo mới
- Cần endpoints: `GET /stops`, `POST /stops`, `PUT /stops/:id`, `DELETE /stops/:id`

### 3.3 MapsController
**Vấn đề:**
- ❌ **Chưa có controller này** - cần tạo mới
- Cần endpoints: `/maps/directions`, `/maps/distance-matrix`, `/maps/geocode`, `/maps/roads/snap`

---

## 4. Services hiện trạng

### 4.1 RouteService (`src/services/RouteService.js`)
**Vấn đề:**
- ❌ Tất cả methods dùng logic cũ
- ❌ `getById()` gọi `DiemDungModel.getByRoute()` (SAI)
- ❌ `createStop()` yêu cầu `maTuyen` (SAI)
- ❌ `reorderStops()` update `thuTu` trong DiemDung (SAI)

### 4.2 MapsService
**Vấn đề:**
- ❌ **Chưa có service này** - cần tạo mới
- Cần methods: `getDirections()`, `getDistanceMatrix()`, `geocode()`, `reverseGeocode()`, `snapToRoads()`
- Cần Redis cache với TTL phù hợp
- Cần rate limiting per IP + per API key

---

## 5. Routes hiện trạng

### 5.1 Route routes (`src/routes/api/route.js`)
**Endpoints:**
- ✅ `GET /api/v1/routes`
- ✅ `GET /api/v1/routes/:id`
- ✅ `POST /api/v1/routes`
- ✅ `PUT /api/v1/routes/:id`
- ✅ `DELETE /api/v1/routes/:id`
- ✅ `GET /api/v1/routes/:id/stops`
- ✅ `POST /api/v1/routes/:id/stops`
- ✅ `PUT /api/v1/routes/:id/stops/:stopId`
- ✅ `DELETE /api/v1/routes/:id/stops/:stopId`

**Vấn đề:**
- ❌ Chưa có `PATCH /api/v1/routes/:id/stops/reorder`
- ❌ Chưa có `POST /api/v1/routes/:id/rebuild-polyline`

### 5.2 Stop routes
**Vấn đề:**
- ❌ **Chưa có routes này** - cần tạo mới
- Cần: `GET /api/v1/stops`, `POST /api/v1/stops`, `PUT /api/v1/stops/:id`, `DELETE /api/v1/stops/:id`

### 5.3 Maps routes
**Vấn đề:**
- ❌ **Chưa có routes này** - cần tạo mới
- Cần: `POST /api/v1/maps/directions`, `POST /api/v1/maps/distance-matrix`, `POST /api/v1/maps/geocode`, `POST /api/v1/maps/roads/snap`

---

## 6. Middleware hiện trạng

### 6.1 AuthMiddleware (`src/middlewares/AuthMiddleware.js`)
- ✅ Có `authenticate()` - JWT verification
- ✅ Có `authorize()` - Role-based access control
- ✅ Hoạt động tốt, không cần sửa

### 6.2 ValidationMiddleware (`src/middlewares/ValidationMiddleware.js`)
- ✅ Có `validateRoute()`, `validateStop()`, `validateId()`, `validatePagination()`
- ⚠️ Cần cập nhật `validateStop()` để bỏ `maTuyen`, `thuTu`
- ⚠️ Cần thêm validation cho Maps API requests

### 6.3 RateLimitMiddleware
**Vấn đề:**
- ❌ **Chưa có middleware này** - cần tạo mới
- Cần rate limiting cho Maps API (per IP, per API key)
- Cần config từ `.env`: `RATE_LIMIT_*`

### 6.4 ErrorHandler
- ✅ Có error handling trong `app.js`
- ⚠️ Cần chuẩn hóa format lỗi: `{error: {code, message}}`

---

## 7. Utilities hiện trạng

### 7.1 Geo utils (`src/utils/geo.js`)
- ✅ Có `haversine()` - tính khoảng cách
- ✅ Có `inGeofence()` - kiểm tra geofence
- ✅ Hoạt động tốt, không cần sửa

### 7.2 Maps utils
**Vấn đề:**
- ❌ **Chưa có utils này** - cần tạo mới
- Cần: polyline encoding/decoding, coordinate validation

---

## 8. Configuration hiện trạng

### 8.1 Database (`src/config/db.js`)
- ✅ MySQL pool configuration
- ✅ Hoạt động tốt, không cần sửa

### 8.2 Environment (`src/config/env.example`)
**Vấn đề:**
- ❌ Chưa có `MAPS_API_KEY`
- ❌ Chưa có `REDIS_URL` (chỉ có `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- ❌ Chưa có `RATE_LIMIT_*` configs
- ❌ Chưa có `CACHE_TTL_*` configs

### 8.3 Redis
**Vấn đề:**
- ❌ **Chưa có Redis client** - cần tạo mới
- Cần file `src/config/cache.js` với Redis client và helper methods

---

## 9. OpenAPI Specification

### 9.1 Hiện trạng
**Vấn đề:**
- ❌ **Chưa có file OpenAPI** - cần tạo mới
- Cần tạo `docs/openapi.yaml` với đầy đủ schemas và paths

### 9.2 Cần có
- Schemas: Route, Stop, RouteStop, RouteDetail, CreateRoutePayload, UpdateRoutePayload, CreateStopPayload, UpdateStopPayload, ReorderStopsPayload, DirectionsRequest, DirectionsResponse, DistanceMatrixRequest, DistanceMatrixResponse, GeocodeRequest, GeocodeResponse, RoadsSnapRequest, RoadsSnapResponse
- Paths: `/routes`, `/routes/:id`, `/routes/:id/stops`, `/routes/:id/stops/reorder`, `/routes/:id/rebuild-polyline`, `/stops`, `/maps/directions`, `/maps/distance-matrix`, `/maps/geocode`, `/maps/roads/snap`

---

## 10. Testing hiện trạng

### 10.1 Unit tests
- ✅ Có một số tests trong `tests/controllers/`
- ⚠️ Cần thêm tests cho models và services mới

### 10.2 Integration tests
- ⚠️ Cần test các endpoints mới
- ⚠️ Cần test Maps API integration
- ⚠️ Cần test Redis caching

### 10.3 Postman collection
- ✅ Có `postman/SSB_API_Collection.postman_collection.json`
- ⚠️ Cần cập nhật với endpoints mới
- ⚠️ Cần export từ OpenAPI

---

## 11. Tóm tắt vấn đề

### 11.1 Vấn đề nghiêm trọng (CRITICAL)
1. ❌ **TuyenDuongModel.getById()** query DiemDung với `maTuyen` (cột không tồn tại)
2. ❌ **DiemDungModel** có `maTuyen`, `thuTu` (cột không tồn tại)
3. ❌ **RouteController** dùng logic cũ (tạo stop với maTuyen, update thuTu trong DiemDung)
4. ❌ **RouteService** dùng logic cũ
5. ❌ **Chưa có RouteStopModel** - cần tạo mới

### 11.2 Vấn đề quan trọng (HIGH)
1. ❌ **Chưa có StopController** - cần tạo mới
2. ❌ **Chưa có MapsController** - cần tạo mới
3. ❌ **Chưa có MapsService** - cần tạo mới
4. ❌ **Chưa có Redis cache** - cần setup
5. ❌ **Chưa có OpenAPI spec** - cần tạo mới
6. ❌ **Chưa có rate limiting** cho Maps API

### 11.3 Vấn đề cần cải thiện (MEDIUM)
1. ⚠️ Cần cập nhật ValidationMiddleware
2. ⚠️ Cần chuẩn hóa error format
3. ⚠️ Cần cập nhật .env.example
4. ⚠️ Cần script rebuild-polyline
5. ⚠️ Cần cập nhật README

---

## 12. Kế hoạch refactor

### 12.1 Phase 1: Models & DAO (Ưu tiên cao)
1. ✅ Tạo `RouteStopModel` mới
2. ✅ Refactor `TuyenDuongModel` (bỏ query DiemDung với maTuyen, thêm origin/dest/polyline)
3. ✅ Refactor `DiemDungModel` (bỏ maTuyen, thuTu, thêm address, scheduled_time)
4. ✅ Tạo DAO layer: `routesDao`, `stopsDao`, `routeStopsDao`

### 12.2 Phase 2: Services (Ưu tiên cao)
1. ✅ Refactor `RouteService` (dùng route_stops)
2. ✅ Tạo `StopService` mới
3. ✅ Tạo `MapsService` mới (với Redis cache)
4. ✅ Setup Redis client và cache helpers

### 12.3 Phase 3: Controllers & Routes (Ưu tiên cao)
1. ✅ Refactor `RouteController` (dùng route_stops)
2. ✅ Tạo `StopController` mới
3. ✅ Tạo `MapsController` mới
4. ✅ Cập nhật routes: `/routes`, `/stops`, `/maps/*`
5. ✅ Thêm endpoints: `PATCH /routes/:id/stops/reorder`, `POST /routes/:id/rebuild-polyline`

### 12.4 Phase 4: Middleware & Config (Ưu tiên trung bình)
1. ✅ Tạo `RateLimitMiddleware` cho Maps API
2. ✅ Cập nhật `ValidationMiddleware`
3. ✅ Chuẩn hóa error format
4. ✅ Cập nhật `.env.example`

### 12.5 Phase 5: Documentation & Testing (Ưu tiên trung bình)
1. ✅ Tạo OpenAPI spec v1.1
2. ✅ Export Postman collection từ OpenAPI
3. ✅ Cập nhật README
4. ✅ Tạo script rebuild-polyline
5. ✅ Test toàn bộ endpoints

---

## 13. Rủi ro và giải pháp

### 13.1 Rủi ro
1. **Breaking changes:** API cũ có thể bị phá vỡ
   - **Giải pháp:** Giữ backward compatibility nếu có thể, version API nếu cần

2. **Performance:** Query route_stops có thể chậm
   - **Giải pháp:** Index đúng, cache nếu cần

3. **Redis dependency:** Cần Redis để cache Maps API
   - **Giải pháp:** Fallback to in-memory cache nếu Redis không available

4. **Maps API cost:** Google Maps API có phí
   - **Giải pháp:** Cache tốt, rate limiting, monitor usage

### 13.2 Testing strategy
1. **Unit tests:** Test models và services
2. **Integration tests:** Test endpoints với test database
3. **Manual testing:** Test với Postman collection
4. **Performance tests:** Test với large dataset

---

## 14. Kết luận

Backend hiện tại **không tương thích** với schema DB mới (ver2). Cần refactor toàn bộ phần liên quan đến routes và stops để sử dụng bảng `route_stops` thay vì cột `maTuyen`, `thuTu` trong `DiemDung`.

**Ưu tiên refactor:**
1. Models & DAO (Phase 1) - **CRITICAL**
2. Services (Phase 2) - **CRITICAL**
3. Controllers & Routes (Phase 3) - **CRITICAL**
4. Middleware & Config (Phase 4) - **HIGH**
5. Documentation & Testing (Phase 5) - **MEDIUM**

**Thời gian ước tính:** 2-3 ngày làm việc

---

## 15. Còn lại sau PR v1.1

### 15.1 Đã hoàn thành
- ✅ Models refactored (TuyenDuongModel, DiemDungModel, RouteStopModel)
- ✅ Services created (RouteService, StopService, MapsService)
- ✅ Controllers created (RouteController, StopController, MapsController)
- ✅ Routes updated (routes, stops, maps)
- ✅ Cache provider (Redis + Memory fallback)
- ✅ Rate limiting middleware
- ✅ OpenAPI specification
- ✅ Postman collection export
- ✅ Integration tests
- ✅ CI/CD workflow
- ✅ Docker Compose setup

### 15.2 Cần cải thiện
- ⚠️ **Authentication**: Cần test auth middleware với các endpoints mới
- ⚠️ **Error handling**: Cần chuẩn hóa error format hơn nữa
- ⚠️ **Logging**: Cần thêm structured logging (pino/winston)
- ⚠️ **Validation**: Cần thêm request validation cho tất cả endpoints
- ⚠️ **Testing**: Cần thêm unit tests cho services và models
- ⚠️ **Documentation**: Cần thêm API examples và troubleshooting guide

### 15.3 Known Issues
1. **TypeScript/JavaScript mix**: Một số file dùng .ts, một số dùng .js (cần thống nhất)
2. **Cache initialization**: Cache provider được init trong MapsService, có thể cần init sớm hơn
3. **Rate limiting**: Rate limiter key generation có thể cần tối ưu
4. **Tests**: Tests cần mock database và auth để chạy độc lập

---

**Tài liệu tham khảo:**
- Database schema: `database/01_init_db_ver2.sql`
- Sample data: `database/02_sample_data.sql`
- API Design: `ssb-backend/API_Design.md`
- OpenAPI Spec: `docs/openapi.yaml`
- Refactor Summary: `docs/REFACTOR_V1_1_SUMMARY.md`

