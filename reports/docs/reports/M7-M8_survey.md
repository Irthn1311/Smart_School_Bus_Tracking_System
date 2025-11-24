# M7-M8 Survey - Reporting & Admin Settings

**Date:** 2025-11-11  
**Scope:** M7 (Reporting), M8 (Admin Settings & Hardening)

## 📋 Hiện Trạng

### Backend - Reporting
- ✅ **ReportsController**: Đã có `overview()` và `export()`
- ✅ **TripController.getStats()**: Đã có stats với date range
- ✅ **BusController.getStats()**: Đã có bus stats
- ⚠️ **Thiếu**: `/api/stats/overview` (cần chuẩn hóa theo M7 spec)
- ⚠️ **Thiếu**: `/api/stats/trips-by-day`, `/api/stats/driver-performance`, `/api/stats/bus-utilization`, `/api/stats/route-punctuality`
- ⚠️ **Thiếu**: Filters (routeId, driverId, busId) cho stats endpoints

### Backend - Settings
- ✅ **Config**: Đã có `ssb-backend/src/config/env.ts` với env vars
- ❌ **Thiếu**: `/api/settings` GET/PUT endpoints
- ❌ **Thiếu**: Runtime config service (geofenceRadius, delayThreshold, throttleSeconds)
- ❌ **Thiếu**: Validation cho settings values

### Backend - Hardening
- ✅ **CORS**: Đã có trong `middlewares/cors.js`
- ✅ **Rate-limit**: Đã có cho `/auth/login`
- ✅ **Helmet**: Đã có trong `server.ts`
- ⚠️ **Thiếu**: Rate-limit cho `/trips` (burst protection)
- ⚠️ **Thiếu**: Structured logging với requestId
- ⚠️ **Thiếu**: Error handler chuẩn (ẩn stack ở production)

### Frontend - Dashboard
- ✅ **Admin Dashboard**: `/admin/page.tsx` đã có với KPIs và charts
- ✅ **Reports Page**: `/admin/reports/page.tsx` đã có với recharts
- ⚠️ **Thiếu**: Filters (from/to, route/driver/bus) cho dashboard
- ⚠️ **Thiếu**: KPI cards theo M7 spec (completion rate, avg delay P50/P95, etc.)

### Frontend - Settings
- ✅ **Settings Page**: `/admin/settings/page.tsx` đã có
- ⚠️ **Thiếu**: Form cập nhật geofenceRadius, delayThreshold, throttleSeconds, mapsProvider
- ⚠️ **Thiếu**: Validation UI trùng với BE

## 📁 Files Sẽ Tạo/Sửa

### Backend
- `ssb-backend/src/controllers/StatsController.js` - **MỚI**: Stats endpoints (overview, trips-by-day, driver, bus, route)
- `ssb-backend/src/controllers/SettingsController.js` - **MỚI**: Settings GET/PUT
- `ssb-backend/src/services/settingsService.js` - **MỚI**: Runtime config management
- `ssb-backend/src/routes/api/stats.route.js` - **MỚI**: Stats routes
- `ssb-backend/src/routes/api/settings.route.js` - **MỚI**: Settings routes
- `ssb-backend/src/middlewares/error.js` - Cải thiện: ẩn stack ở production
- `ssb-backend/src/middlewares/logger.js` - **MỚI**: Structured logging với requestId
- `ssb-backend/src/routes/api/trip.route.js` - Thêm rate-limit cho POST endpoints
- `ssb-backend/.env.example` - Thêm settings vars

### Frontend
- `ssb-frontend/app/admin/dashboard/page.tsx` - **MỚI**: Dashboard với KPIs + charts + filters
- `ssb-frontend/app/admin/settings/page.tsx` - Cải thiện: Form settings với validation
- `ssb-frontend/lib/services/stats.service.ts` - **MỚI**: Stats API client
- `ssb-frontend/lib/services/settings.service.ts` - **MỚI**: Settings API client
- `ssb-frontend/components/admin/stats-overview.tsx` - **MỚI**: KPI cards component
- `ssb-frontend/components/admin/stats-charts.tsx` - **MỚI**: Charts component với filters

### Documentation
- `docs/openapi.yaml` - Thêm Stats & Settings schemas + paths
- `docs/postman_collection.json` - Thêm M7-M8 requests
- `ssb-backend/scripts/test_stats_settings.js` - **MỚI**: E2E test script

## 🎯 Kế Hoạch Thực Thi

1. **Backend Stats**: Tạo StatsController với 5 endpoints (overview, trips-by-day, driver, bus, route) + filters
2. **Backend Settings**: Tạo SettingsController + settingsService với GET/PUT + validation
3. **Backend Hardening**: Cải thiện logging, error handler, rate-limit
4. **Frontend Dashboard**: Tạo dashboard page với KPIs + charts + filters
5. **Frontend Settings**: Cải thiện settings page với form + validation
6. **OpenAPI & Tests**: Documentation + E2E scripts
7. **README & Report**: Hướng dẫn demo + báo cáo

