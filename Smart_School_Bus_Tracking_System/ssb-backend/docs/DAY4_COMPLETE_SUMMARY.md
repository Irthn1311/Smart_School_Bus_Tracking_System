# ✅ Day 4 - Trip Lifecycle & GPS Telemetry - HOÀN THÀNH

> **Module**: M4 (GPS Tracking) + M5 (Geofence) + M6 (Delay Detection)  
> **Assignee**: Nguyễn Tuấn Tài  
> **Date**: 2025-10-29  
> **Status**: ✅ **COMPLETE**

---

## 📦 Deliverables

### 1. ✅ Core Services

- **`src/services/telemetryService.js`** (350+ lines)
  - GPS validation & rate limiting (2s minimum)
  - In-memory cache cho bus positions
  - Geofence detection (60m radius)
  - Delay detection (5 min threshold)
  - Auto-emit events: `approach_stop`, `delay_alert`

### 2. ✅ WebSocket Events

- **`src/ws/index.js`** (updated)
  - Added `driver_gps` event handler
  - Integrated with TelemetryService
  - Sends `gps_ack` response to driver
  - Broadcasts realtime updates to trip rooms

### 3. ✅ REST API

- **`src/controllers/TelemetryController.js`**

  - `POST /api/trips/:id/telemetry` - GPS update (HTTP fallback)
  - `GET /api/buses/:id/position` - Lấy vị trí hiện tại

- **`src/routes/api/telemetry.route.js`**
  - Route registration with authentication
  - Mounted in `app.js` at `/api`

### 4. ✅ Demo Tool

- **`src/scripts/ws-demo.js`** (300+ lines)
  - CLI tool: `npm run ws:demo`
  - Simulates driver + parent connections
  - Replays GPS polyline (21 points, 3s interval)
  - Tests geofence & delay detection
  - Complete trip lifecycle demo

### 5. ✅ Documentation

- **`docs/ws_events.md`** (500+ lines)
  - Complete WebSocket events reference
  - Payload schemas for all events
  - Client subscribe patterns
  - Testing examples
  - Security & performance notes

---

## 🎯 Features Implemented

### GPS Telemetry

- [x] Driver sends GPS via WebSocket (`driver_gps` event)
- [x] Server validates lat/lng (-90 to 90, -180 to 180)
- [x] Rate limiting: 1 update per 2 seconds
- [x] In-memory cache with timestamps
- [x] Broadcast `bus_position_update` to trip rooms

### Geofence Detection (M5)

- [x] Haversine distance calculation
- [x] 60m radius threshold
- [x] Auto-emit `approach_stop` when near
- [x] Include ETA, distance, affected students
- [x] Target parents of students at that stop

### Delay Detection (M6)

- [x] Compare actual time vs scheduled time
- [x] 5 minute threshold
- [x] Auto-emit `delay_alert` to admins
- [x] Include delay duration & stop details

### REST API Fallback

- [x] POST endpoint for GPS (if WebSocket dies)
- [x] GET endpoint for current position
- [x] JWT authentication required
- [x] Integrated with Socket.IO for realtime

---

## 📡 WebSocket Events Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Driver    │                  │   Server    │                  │   Parent    │
│     App     │                  │  (Socket)   │                  │     App     │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │ 1. driver_gps                  │                                │
       ├───────────────────────────────>│                                │
       │   {tripId, lat, lng, speed}    │                                │
       │                                │                                │
       │                                │ 2. Process GPS                 │
       │                                ├───────────────┐                │
       │                                │ - Validate    │                │
       │                                │ - Rate limit  │                │
       │                                │ - Cache       │                │
       │                                │ - Geofence?   │                │
       │                                │ - Delay?      │                │
       │                                │<──────────────┘                │
       │                                │                                │
       │ 3. gps_ack                     │ 4. bus_position_update         │
       │<───────────────────────────────┤───────────────────────────────>│
       │   {success, events}            │   {tripId, lat, lng, speed}    │
       │                                │                                │
       │                                │ 5. approach_stop (if < 60m)    │
       │                                ├───────────────────────────────>│
       │                                │   {stopName, distance, ETA}    │
       │                                │                                │
       │                                │ 6. delay_alert (if > 5 min)    │
       │                                ├───────────────────────────────>│
       │                                │   {delay_min, stopName}        │
       │                                │                                │
```

---

## 🧪 Testing

### 1. Start Server

```bash
cd ssb-backend
npm run dev
```

### 2. Run Demo Tool

```bash
# Terminal 2
npm run ws:demo
```

**Expected Output**:

```
═══════════════════════════════════════════════════════════════════════════
🎮 GPS DEMO TOOL - Mô phỏng xe bus chạy
═══════════════════════════════════════════════════════════════════════════

👨‍✈️ Đang kết nối tài xế...
✅ Tài xế đã kết nối (Socket ID: abc123)
✅ Tài xế nhận welcome: Welcome to SSB Realtime!

👨‍👩‍👧 Đang kết nối phụ huynh...
✅ Phụ huynh đã kết nối (Socket ID: def456)
✅ Phụ huynh nhận welcome: Welcome to SSB Realtime!

──────────────────────────────────────────────────────────────────────────
🚀 BẮT ĐẦU GỬI GPS (mỗi 3 giây)
──────────────────────────────────────────────────────────────────────────

📤 [Driver] Gửi GPS #1/21
   📍 Vị trí: (21.0285, 105.8542)
   🚗 Tốc độ: 0 km/h, Hướng: 90°
  ✅ GPS ACK: bus_position_update

📍 [Parent] Nhận vị trí: (21.0285, 105.8542) @ 0 km/h

📤 [Driver] Gửi GPS #7/21
   📍 Vị trí: (21.0315, 105.8572)
   🚗 Tốc độ: 25 km/h, Hướng: 90°
  ✅ GPS ACK: bus_position_update, approach_stop

🎯 [Parent] ⚡ XE GẦN ĐIỂM DỪNG "Trường THCS Kim Liên" (45m)

...

🏁 ĐÃ ĐẾN ĐIỂM CUỐI - Dừng demo
═══════════════════════════════════════════════════════════════════════════
```

### 3. Test REST API

```bash
# POST GPS update
curl -X POST http://localhost:4000/api/trips/42/telemetry \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 21.0285,
    "lng": 105.8542,
    "speed": 35,
    "heading": 90
  }'

# Response:
# {
#   "success": true,
#   "events": ["bus_position_update"]
# }

# GET current position
curl http://localhost:4000/api/buses/5/position \
  -H "Authorization: Bearer <token>"

# Response:
# {
#   "success": true,
#   "data": {
#     "busId": 5,
#     "tripId": 42,
#     "lat": 21.0285,
#     "lng": 105.8542,
#     "speed": 35,
#     "heading": 90,
#     "timestamp": "2025-10-29T10:30:45.123Z"
#   }
# }
```

---

## 📂 File Structure

```
ssb-backend/
├── src/
│   ├── services/
│   │   └── telemetryService.js         ✅ NEW - GPS processing logic
│   ├── controllers/
│   │   └── TelemetryController.js      ✅ NEW - REST endpoints
│   ├── routes/api/
│   │   └── telemetry.route.js          ✅ NEW - Route registration
│   ├── ws/
│   │   └── index.js                    ✅ UPDATED - Added driver_gps event
│   ├── scripts/
│   │   ├── ws-demo.js                  ✅ NEW - GPS simulation tool
│   │   └── test_websocket.js           (existing from Day 3)
│   └── app.js                          ✅ UPDATED - Mounted telemetry routes
├── docs/
│   └── ws_events.md                    ✅ NEW - Complete events documentation
└── package.json                        ✅ UPDATED - Added ws:demo script
```

---

## 🔗 Integration Points

### Database Models Used

- `ChuyenDi` (trips) - Get trip details, scheduled times
- `LichTrinh` (schedules) - Check scheduled vs actual time
- `TuyenDuong` (routes) - Get route polyline
- `DiemDung` (stops) - Get stop locations for geofence
- `HocSinh_DiemDung` (student-stop mapping) - Notify affected parents

### Socket.IO Rooms

- `trip-{tripId}` - All participants of the trip
- `bus-{busId}` - All tracking this specific bus
- Parents of students at approaching stop

### Events Emitted

1. `bus_position_update` → All trip participants
2. `approach_stop` → Parents of students at that stop
3. `delay_alert` → Admins + parents

---

## 🎓 Technical Highlights

### 1. Haversine Formula

```javascript
const R = 6371e3; // Earth radius in meters
const φ1 = (lat1 * Math.PI) / 180;
const φ2 = (lat2 * Math.PI) / 180;
const Δφ = ((lat2 - lat1) * Math.PI) / 180;
const Δλ = ((lng2 - lng1) * Math.PI) / 180;

const a =
  Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

return R * c; // Distance in meters
```

### 2. Rate Limiting Pattern

```javascript
const lastUpdate = lastUpdateTime.get(cacheKey);
const now = Date.now();

if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
  console.log(
    `⏱️  Rate limited: ${RATE_LIMIT_MS - (now - lastUpdate)}ms remaining`
  );
  return { success: false, error: "Rate limit" };
}

lastUpdateTime.set(cacheKey, now);
```

### 3. In-Memory Cache

```javascript
// Map structure
busPositions: Map < busId,
  {
    tripId,
    lat,
    lng,
    speed,
    heading,
    timestamp,
  } >
    // Auto-cleanup on trip end
    TelemetryService.clearPosition(busId);
```

---

## 🚀 Next Steps (Day 5 - Optional)

- [ ] Add Trip Status endpoint (`GET /api/trips/:id/status`)
- [ ] Implement `startTrip` and `endTrip` REST controllers
- [ ] Add validation: Driver can only send GPS for their assigned trip
- [ ] Redis cache for production (replace in-memory Map)
- [ ] Add geofence exit detection
- [ ] Implement path replay feature
- [ ] Add metrics: average speed, total distance

---

## 👥 Team Handoff

**Frontend Team (Q.Thắng, H.Tân)**:

- ✅ WebSocket events documented in `docs/ws_events.md`
- ✅ Demo tool ready: `npm run ws:demo`
- ✅ Test with mock JWT: `createMockToken(userId, role, email)`
- 📞 Contact: Nguyễn Tuấn Tài for integration support

**QA Team**:

- ✅ All features implemented and self-tested
- ✅ Demo tool passes end-to-end flow
- 📝 Test scenarios: Geofence at 60m, Delay at 5min
- 🔍 Edge cases handled: Invalid GPS, rate limit, unauthorized

---

## 🎉 Summary

**✅ Day 4 COMPLETE** - All planned features delivered:

1. ✅ GPS Telemetry Service with rate limiting
2. ✅ Geofence detection (60m radius)
3. ✅ Delay detection (5min threshold)
4. ✅ WebSocket `driver_gps` event handler
5. ✅ REST API fallback endpoints
6. ✅ GPS simulation demo tool
7. ✅ Complete WebSocket documentation
8. ✅ Integration with existing DB models
9. ✅ Room-based event targeting
10. ✅ Error handling & validation

**Total LOC**: ~1,500 lines  
**Files Created**: 5  
**Files Updated**: 2  
**Events Implemented**: 3 (driver_gps, approach_stop, delay_alert)  
**Test Coverage**: Demo tool + manual REST tests

---

**🎯 Ready for Day 5!**

> _"Code with ❤️ by Nguyễn Tuấn Tài - Backend Realtime Team"_
