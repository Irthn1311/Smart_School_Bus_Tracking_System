# M7-M8 Progress Report

**Date:** 2025-11-11  
**Status:** Completed

## ✅ Completed

### 1. Backend M7 - Stats Endpoints
- ✅ **StatsController**: 5 endpoints (overview, trips-by-day, driver-performance, bus-utilization, route-punctuality)
- ✅ **Filters**: `from`, `to`, `routeId`, `driverId`, `busId` với default 7 ngày gần nhất
- ✅ **RBAC**: Admin full access; Driver chỉ xem bản thân; Parent 403
- ✅ **Percentiles**: P50, P95 cho delay statistics
- ✅ **SQL Aggregation**: Tối ưu với filters, tránh N+1 queries

### 2. Backend M8 - Settings & Hardening
- ✅ **SettingsController**: GET/PUT với validation
- ✅ **SettingsService**: Runtime config management (in-memory cache)
- ✅ **Validation**: geofenceRadius (20-200m), delayThreshold (1-30min), throttle (≥1s), mapsProvider (google|osm)
- ✅ **Runtime Apply**: TelemetryService đọc từ SettingsService
- ✅ **Structured Logging**: Request ID middleware + JSON logs
- ✅ **Error Handler**: Ẩn stack ở production, hiện ở development
- ✅ **Rate-limit**: Trip creation (10 requests/minute)

### 3. Frontend M7 - Dashboard
- ✅ **Admin Dashboard**: `/admin/dashboard` với KPIs + charts + filters
- ✅ **KPIs**: Completion Rate, Avg Delay (P50/P95), Delay Alerts, Active Drivers/Buses
- ✅ **Charts**: Trips by Day (Line), Driver Performance (Bar), Bus Utilization (Bar), Route Punctuality (Bar)
- ✅ **Filters**: Date range, Route, Driver, Bus với real-time updates
- ✅ **API Client**: `getStatsOverview`, `getStatsTripsByDay`, `getStatsDriverPerformance`, `getStatsBusUtilization`, `getStatsRoutePunctuality`

### 4. Frontend M8 - Settings
- ✅ **Settings Page**: `/admin/settings` với form cập nhật
- ✅ **Validation UI**: Trùng với BE (min/max, enum)
- ✅ **Error Handling**: Hiển thị lỗi 422 rõ ràng
- ✅ **Toast Notifications**: "Saved, applied" sau khi cập nhật thành công
- ✅ **API Client**: `getSettings`, `updateSettings`

### 5. OpenAPI & Postman
- ✅ **OpenAPI**: Thêm Stats & Settings schemas + paths
- ✅ **Postman**: Folder "Stats (M7)" và "Settings (M8)" với example requests

### 6. Tests & Scripts
- ✅ **test_stats_settings.js**: E2E test script cho stats & settings
- ✅ **Test Coverage**: Overview, trips-by-day, driver-performance, bus-utilization, route-punctuality, settings GET/PUT, validation errors, RBAC

## 📝 Files Created/Modified

### Backend
- `ssb-backend/src/controllers/StatsController.js` - **MỚI**
- `ssb-backend/src/controllers/SettingsController.js` - **MỚI**
- `ssb-backend/src/services/settingsService.js` - **MỚI**
- `ssb-backend/src/routes/api/stats.route.js` - **MỚI**
- `ssb-backend/src/routes/api/settings.route.js` - **MỚI**
- `ssb-backend/src/middlewares/logger.js` - **MỚI**
- `ssb-backend/src/models/ChuyenDiModel.js` - Sửa: `getStats()` hỗ trợ filters
- `ssb-backend/src/services/telemetryService.js` - Sửa: Dùng SettingsService cho geofence/delay/throttle
- `ssb-backend/src/routes/api/trip.route.js` - Sửa: Thêm rate-limit cho POST `/`
- `ssb-backend/src/server.ts` - Sửa: Thêm logger middleware, stats/settings routes

### Frontend
- `ssb-frontend/app/admin/dashboard/page.tsx` - **MỚI**
- `ssb-frontend/app/admin/settings/page.tsx` - Sửa: Thêm form settings với validation
- `ssb-frontend/lib/api.ts` - Sửa: Thêm stats & settings API methods

### Documentation
- `docs/openapi.yaml` - Sửa: Thêm Stats & Settings schemas + paths
- `docs/SSB_Postman_Collection.json` - Sửa: Thêm M7-M8 requests
- `docs/reports/M7-M8_survey.md` - **MỚI**
- `docs/reports/M7-M8_done.md` - **MỚI** (file này)
- `ssb-backend/README.md` - Sửa: Thêm M7-M8 progress

### Tests
- `ssb-backend/scripts/test_stats_settings.js` - **MỚI**

## 🎯 Endpoints

### M7: Stats
- `GET /api/stats/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&routeId=&driverId=&busId=`
- `GET /api/stats/trips-by-day?from=&to=&routeId=&driverId=&busId=`
- `GET /api/stats/driver-performance?from=&to=&routeId=&busId=`
- `GET /api/stats/bus-utilization?from=&to=&routeId=&driverId=` (Admin only)
- `GET /api/stats/route-punctuality?from=&to=&driverId=&busId=` (Admin only)

### M8: Settings
- `GET /api/settings` (Admin only)
- `PUT /api/settings` (Admin only)

## 🧪 Quick Test

### 1. Test Stats Endpoints
```bash
# Authenticate as admin
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu.vn","password":"admin123"}'

# Get stats overview (last 7 days)
curl -X GET "http://localhost:4000/api/v1/stats/overview?from=2025-11-04&to=2025-11-11" \
  -H "Authorization: Bearer <token>"

# Get trips by day
curl -X GET "http://localhost:4000/api/v1/stats/trips-by-day?from=2025-11-04&to=2025-11-11" \
  -H "Authorization: Bearer <token>"
```

### 2. Test Settings Endpoints
```bash
# Get settings
curl -X GET http://localhost:4000/api/v1/settings \
  -H "Authorization: Bearer <token>"

# Update settings
curl -X PUT http://localhost:4000/api/v1/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"geofenceRadiusMeters":80,"delayThresholdMinutes":7,"realtimeThrottleSeconds":3}'
```

### 3. Run E2E Test Script
```bash
cd ssb-backend
node scripts/test_stats_settings.js
```

### 4. Frontend Demo
1. Login as admin: `http://localhost:3000/login`
2. Navigate to `/admin/dashboard` - Xem KPIs + charts với filters
3. Navigate to `/admin/settings` - Cập nhật settings, verify runtime apply

## 📊 Demo Scenario

### E2E Demo: Stats & Settings
1. **Admin tạo trip** → Chạy GPS simulator → Xem stats tăng
2. **Admin xem dashboard** → Filter theo route/driver/bus → Charts update
3. **Admin cập nhật settings** → Đổi geofenceRadius từ 60m → 80m
4. **Chạy GPS simulator** → Verify geofence bắn theo radius mới (80m)
5. **Admin xem driver performance** → Filter theo date range → Xem completion rate, avg delay

## ⚠️ Known Limits & P1 Enhancements

1. **EMA ETA**: Chưa implement EMA speed tracking để tính ETA đến stop tiếp theo (P1)
2. **TripEvents Table**: Chưa có bảng DB để log events (hiện dùng in-memory cache)
3. **Settings Persistence**: Settings hiện lưu in-memory, cần DB persistence (P1)
4. **Complaints Count**: Driver performance chưa có complaints count (placeholder 0)
5. **kmTotal/avgSpeed**: Bus utilization chưa có dữ liệu kmTotal/avgSpeed (cần log GPS history)

## 🔄 Next Steps (P1)

1. Implement EMA speed tracking cho ETA
2. Tạo TripEvents table để log events
3. Persist settings vào DB
4. Thêm complaints tracking
5. Log GPS history để tính kmTotal/avgSpeed

