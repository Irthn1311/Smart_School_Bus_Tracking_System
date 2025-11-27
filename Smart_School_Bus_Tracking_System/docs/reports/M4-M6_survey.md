# M4-M6 Survey - Trip Lifecycle & Realtime Tracking

**Date:** 2025-11-11  
**Scope:** M4 (Trip Lifecycle), M5 (Realtime GPS & Geofence), M6 (Tracking UI)

## 📋 Hiện Trạng

### Backend - Trip
- ✅ **ChuyenDiModel**: Đã có `getAll()`, `getById()`, `start()`, `complete()`, `cancel()`
- ✅ **TripController**: Đã có `getAll()`, `getById()`, `startTrip()`, `getHistory()`
- ✅ **tripService**: Đã có `startTrip()` với validation
- ⚠️ **Thiếu**: `create()` từ schedule, `end()`, `cancel()` đầy đủ, stats calculation
- ⚠️ **Thiếu**: Trip status enum cần chuẩn hóa: `planned|started|enroute|completed|canceled`

### Backend - WebSocket
- ✅ **Socket.IO**: Đã setup với JWT auth, rooms (user-{id}, role-{role}, trip-{id})
- ✅ **Events**: `ping/pong`, `join_trip/leave_trip`, `auth/hello`
- ⚠️ **Thiếu**: `gps:update` handler, `bus_position_update` broadcast
- ⚠️ **Thiếu**: Throttling GPS (≥2s), last position storage

### Backend - Geofence & Delay
- ❌ **Chưa có**: Geofence logic (approach_stop ≤60m)
- ❌ **Chưa có**: Delay alert (≥5 phút)
- ❌ **Chưa có**: ETA calculation với EMA speed
- ❌ **Chưa có**: TripEvents table/logging

### Backend - Attendance
- ✅ **TrangThaiHocSinhModel**: Đã có model
- ⚠️ **Thiếu**: API `checkin/checkout`, `pickup_status_update` WS event

### Frontend
- ✅ **SocketService**: Đã có connect, joinTrip, sendDriverGPS
- ⚠️ **Thiếu**: `/admin/tracking` page với map + trip list
- ⚠️ **Thiếu**: `/driver` console với start/end + attendance
- ⚠️ **Thiếu**: `/parent` view với ETA & alerts

### Database
- ✅ **ChuyenDi**: Đã có bảng với `trangThai`, `gioBatDauThucTe`, `gioKetThucThucTe`
- ⚠️ **Thiếu**: `TripPositions` table (optional, có thể dùng in-memory)
- ⚠️ **Thiếu**: `TripEvents` table cho logging

## 📁 Files Sẽ Tạo/Sửa

### Backend
- `src/models/ChuyenDiModel.js` - Thêm `create()`, cải thiện `end()`, `cancel()`
- `src/controllers/TripController.js` - Thêm `create()`, `end()`, `cancel()`, cải thiện `getAll()` với pagination
- `src/services/tripService.js` - Thêm `create()`, `end()`, `cancel()`, stats calculation
- `src/services/geofenceService.js` - **MỚI**: Geofence logic, ETA với EMA
- `src/services/delayAlertService.js` - **MỚI**: Delay detection & alert
- `src/ws/index.js` - Thêm `gps:update` handler, `bus_position_update` broadcast, throttling
- `src/routes/api/trip.route.js` - Thêm routes: POST `/`, POST `/:id/end`, POST `/:id/cancel`, POST `/:id/students/:studentId/checkin|checkout`
- `database/05_add_m4m6_tables.sql` - **MỚI**: TripPositions, TripEvents (optional)

### Frontend
- `app/admin/tracking/page.tsx` - **MỚI**: Admin tracking dashboard
- `app/driver/trip/[id]/page.tsx` - Cải thiện: thêm attendance UI
- `app/parent/tracking/page.tsx` - **MỚI**: Parent view với ETA & alerts
- `lib/services/trip.service.ts` - **MỚI**: Trip API service
- `lib/hooks/useTripTracking.ts` - **MỚI**: Hook cho realtime tracking
- `components/tracking/TripMap.tsx` - **MỚI**: Map component với polyline, markers, badges

### Documentation
- `docs/openapi.yaml` - Thêm Trip schemas, paths, WS events
- `docs/postman_collection.json` - Thêm M4-M6 requests
- `ssb-backend/scripts/ws_gps_simulator.js` - **MỚI**: GPS simulator
- `ssb-backend/scripts/test_realtime_trip.js` - **MỚI**: E2E test script

## 🎯 Kế Hoạch Thực Thi

1. **Backend Trip Lifecycle**: Create/Start/End/Cancel với status management
2. **WS GPS Ingest**: Handler `gps:update` với throttle, broadcast `bus_position_update`
3. **Geofence Service**: Approach stop detection (≤60m), debounce
4. **Delay Alert**: Start delay & stop delay detection (≥5'), EMA ETA
5. **Attendance**: Checkin/checkout API + `pickup_status_update` event
6. **Frontend Admin**: Tracking dashboard với map + trip list
7. **Frontend Driver**: Console với start/end + attendance
8. **Frontend Parent**: View với ETA & alerts
9. **OpenAPI & Tests**: Documentation + E2E scripts

## ⚠️ Lưu Ý

- Re-use: Tận dụng ChuyenDiModel, Socket.IO setup hiện có
- Không phá vỡ: M0/M1-M3 endpoints vẫn hoạt động
- Performance: Throttling GPS, in-memory position cache
- Security: Verify driver owns trip trước khi nhận GPS

