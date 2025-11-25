# Survey: Fix Polyline, Stops Persistence, Route→Schedule→Trip Flow

**Date:** 2025-11-11  
**Scope:** Polyline rendering, Stops CRUD, Route→Schedule→Trip wizard

## 📋 Hiện Trạng

### Backend - Stops Persistence
- ✅ **RouteStopModel**: Đã có đầy đủ methods (`addStop`, `removeStop`, `updateStop`, `reorderStops`)
- ✅ **Endpoints**: GET, POST, DELETE `/routes/:id/stops`, PATCH `/routes/:id/stops/reorder`
- ❌ **THIẾU**: PUT `/routes/:id/stops/:stopId` để update stop (sequence, dwell_seconds, hoặc stop info)
- ✅ **DB Schema**: `route_stops` có `route_id`, `stop_id`, `sequence`, `dwell_seconds`
- ⚠️ **Cần kiểm tra**: UNIQUE constraint cho `(route_id, sequence)` trong DB
- ✅ **Transaction**: `reorderStops` đã dùng transaction, nhưng cần kiểm tra `updateStop`

### Backend - Schedule Conflict
- ✅ **ScheduleService.create()**: Đã có conflict check với `LichTrinhModel.checkConflict()`
- ✅ **Response**: Trả 409 với `error.conflicts` array
- ⚠️ **Cần cải thiện**: Response format chuẩn hóa theo envelope, chi tiết conflict rõ ràng hơn

### Frontend - Polyline
- ✅ **SSBMap**: Nhận `polyline` prop (encoded string) và decode bằng `google.maps.geometry.encoding.decodePath()`
- ⚠️ **Vấn đề tiềm ẩn**: 
  - Frontend có thể không sort stops theo `sequence` trước khi vẽ polyline
  - Có thể nhầm `lat/lng` vs `viDo/kinhDo` (viDo = lat, kinhDo = lng)
  - Polyline có thể không render nếu stops rỗng hoặc map chưa ready
- ✅ **route-builder.tsx**: Có logic vẽ polyline từ route segments, nhưng cần kiểm tra sort

### Frontend - Stops UI
- ⚠️ **THIẾU**: UI để CRUD stops trong route (thêm/sửa/xóa/reorder)
- ⚠️ **THIẾU**: Drag-and-drop hoặc nút ↑/↓ để reorder stops
- ⚠️ **THIẾU**: Form để thêm stop mới (lat, lng, name, order)

### Frontend - Route→Schedule→Trip Flow
- ❌ **THIẾU**: Wizard 3 bước `/admin/route-assignment`
- ✅ **Schedule Form**: Đã có `schedule-form.tsx` với conflict error banner
- ✅ **Trip Create**: Đã có API call trong `api.ts`
- ⚠️ **Cần**: Tích hợp wizard flow từ route → schedule → trip

## 📁 Files Sẽ Tạo/Sửa

### Backend
- `ssb-backend/src/controllers/RouteController.js` - Thêm `updateStopInRoute()` method
- `ssb-backend/src/routes/api/route.js` - Thêm PUT `/routes/:id/stops/:stopId` route
- `ssb-backend/src/services/RouteService.js` - Cải thiện `updateStopInRoute()` với validation
- `database/06_add_route_stops_unique.sql` - **MỚI**: Migration script cho UNIQUE(route_id, sequence) nếu chưa có
- `ssb-backend/src/controllers/ScheduleController.js` - Cải thiện conflict response format

### Frontend
- `ssb-frontend/app/admin/route-assignment/page.tsx` - **MỚI**: Wizard 3 bước
- `ssb-frontend/components/admin/route-stops-manager.tsx` - **MỚI**: UI quản lý stops (CRUD + reorder)
- `ssb-frontend/components/map/SSBMap.tsx` - Sửa: Đảm bảo polyline render từ stops đã sort
- `ssb-frontend/lib/api.ts` - Thêm `updateRouteStop()` method
- `ssb-frontend/lib/services/trip.service.ts` - Cải thiện error handling cho conflict

### Documentation
- `docs/openapi.yaml` - Thêm PUT `/routes/{id}/stops/{stopId}` schema
- `docs/SSB_Postman_Collection.json` - Thêm requests cho stops CRUD + wizard flow
- `ssb-backend/scripts/test_stops_crud_reorder.js` - **MỚI**: E2E test
- `ssb-backend/scripts/test_route_schedule_flow.js` - **MỚI**: E2E test

## 🎯 Kế Hoạch Thực Thi

1. **Backend Stops CRUD**: Thêm PUT endpoint, chuẩn hóa validation, kiểm tra DB constraints
2. **Backend Schedule Conflict**: Cải thiện 409 response format
3. **Frontend Polyline Fix**: Đảm bảo stops sort theo sequence, lat/lng đúng, map ready check
4. **Frontend Stops UI**: Tạo component quản lý stops với CRUD + reorder
5. **Frontend Wizard**: Tạo wizard 3 bước Route→Schedule→Trip với conflict modal
6. **OpenAPI & Postman**: Cập nhật documentation
7. **Tests**: Tạo E2E test scripts
8. **README**: Hướng dẫn wizard + troubleshooting polyline

## 🔍 Cần Kiểm Tra

- [ ] DB có UNIQUE(route_id, sequence) constraint chưa?
- [ ] Frontend có sort stops theo sequence trước khi vẽ polyline?
- [ ] Frontend có nhầm lat/lng vs viDo/kinhDo?
- [ ] Schedule conflict response có đủ chi tiết không?

