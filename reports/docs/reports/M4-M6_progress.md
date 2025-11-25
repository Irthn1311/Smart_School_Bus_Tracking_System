# M4-M6 Progress Report

**Date:** 2025-11-11  
**Status:** In Progress (Backend Trip Lifecycle + WS GPS completed)

## ✅ Completed

### 1. Backend Trip Lifecycle
- ✅ **TripController**: Chuẩn hóa response envelope, thêm create/cancel, cải thiện pagination
- ✅ **Routes**: Thêm POST `/` (create), POST `/:id/cancel`
- ✅ **WS Events**: Emit `trip_created`, `trip_started`, `trip_completed`, `trip_cancelled` to multiple rooms
- ✅ **Status Management**: Support planned/started/enroute/completed/canceled (map từ DB status)

### 2. WS GPS Ingest & Broadcast
- ✅ **Handler**: Thêm `gps:update` (alias cho `driver_gps`)
- ✅ **Validation**: Verify driver owns trip trước khi nhận GPS
- ✅ **Throttling**: Rate limit ≥2s per driver (đã có trong TelemetryService)
- ✅ **Broadcast**: `bus_position_update` đến `trip-{tripId}`, `bus-{busId}`, `role-quan_tri`

### 3. Geofence & Delay
- ✅ **Geofence**: Approach stop detection ≤60m với anti-spam (emittedStops Map)
- ✅ **Delay Alert**: Start delay ≥5 phút với debounce (3 phút interval)
- ⚠️ **ETA với EMA**: Chưa implement (cần thêm EMA speed tracking)

## ✅ Completed (Updated)

### 4. Attendance (Checkin/Checkout) ✅
- ✅ **API**: POST `/trips/:id/students/:studentId/checkin|checkout`
- ✅ **WS Event**: `pickup_status_update` với status `onboard|dropped`
- ✅ **Model**: Sử dụng TrangThaiHocSinhModel với status mapping

### 5. Frontend UI ✅
- ✅ **Admin Tracking**: `/admin/tracking` với map + trip list (đã có, cần cải thiện thêm)
- ✅ **Driver Console**: `/driver/trip/[id]` với start/end + attendance (đã có)
- ✅ **Parent View**: `/parent` với ETA + alerts + map (đã có)

## 🚧 Pending (P1)

### 6. OpenAPI & Postman
- ⏳ **Schemas**: Trip, TripPosition, TripEvent, StudentTripStatus
- ⏳ **Paths**: Trip CRUD + lifecycle + attendance
- ⏳ **WS Events**: Document trong openapi.yaml

### 7. Tests & Scripts
- ⏳ **ws_gps_simulator.js**: GPS simulator với interpolation
- ⏳ **test_realtime_trip.js**: E2E test script

## 📝 Notes

- **Status Mapping**: DB dùng `chua_khoi_hanh|dang_chay|hoan_thanh|huy`, API/WS dùng `planned|started|enroute|completed|canceled`
- **EMA ETA**: Cần implement EMA speed tracking để tính ETA đến stop tiếp theo (P1 enhancement)
- **Frontend UI**: Các pages đã có sẵn, cần tích hợp thêm realtime events và cải thiện UX

## 🔄 Next Steps (P1)

1. Update OpenAPI + Postman
2. Create GPS simulator script
3. Create E2E test script
4. Final README updates

