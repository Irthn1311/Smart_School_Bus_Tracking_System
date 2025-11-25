# Summary Hiện Trạng Codebase - Auto Route Stop Suggestion

**Ngày:** 2025-11-20  
**Mục tiêu:** Triển khai hệ thống tự động gợi ý điểm dừng và học sinh khi tạo tuyến đường

---

## 📊 Hiện Trạng

### 1. Database Schema
- ✅ `TuyenDuong` - có field `polyline` (MEDIUMTEXT)
- ✅ `DiemDung` - có `viDo`, `kinhDo`, `address`
- ✅ `route_stops` - mapping route → stops với `sequence`
- ✅ `HocSinh` - có `viDo`, `kinhDo` (cần verify có field này)
- ✅ `schedule_student_stops` - mapping schedule → student → stop
- ✅ `TrangThaiHocSinh` - trạng thái học sinh trong trip
- ❌ **THIẾU:** `student_stop_suggestions` - bảng lưu gợi ý học sinh theo điểm dừng của route

### 2. Backend Services Hiện Có

#### RouteService
- `create()` - Tạo route thủ công với stops
- `createRoutesBatch()` - Tạo nhiều routes từ suggestion
- `getStops(maTuyen)` - Lấy stops của route
- **THIẾU:** API auto-create route từ start → end với auto suggestion

#### RouteSuggestionService
- `suggestRoutes()` - Đề xuất routes từ học sinh theo khu vực
- Logic clustering đã có nhưng chưa tích hợp vào flow tạo route từ start → end

#### StopSuggestionService
- `clusterStudents()` - Clustering học sinh thành cụm
- `calculateDistance()` - Haversine distance
- **THIẾU:** Logic quét học sinh trong hành lang tuyến (corridor)

#### MapsService
- `getDirections()` - Lấy polyline từ start → end ✅
- `geocode()` / `reverseGeocode()` - Geocoding ✅
- `snapToRoads()` - Snap điểm vào đường ✅

### 3. Frontend Components

#### route-builder.tsx
- UI tạo route với map
- Chưa tích hợp auto suggestion từ start → end

#### schedule-form.tsx
- UI tạo schedule từ route
- Có logic "Tự động gán" học sinh
- **THIẾU:** Hiển thị gợi ý học sinh từ route suggestions

### 4. Flow Hiện Tại

```
1. Admin tạo Route (thủ công)
   → TuyenDuong + route_stops
   → KHÔNG có thông tin học sinh

2. Admin tạo Schedule từ Route
   → LichTrinh
   → Auto-assign học sinh (nếu không có students từ FE)
   → schedule_student_stops

3. Trip được tạo từ Schedule
   → ChuyenDi
   → Copy từ schedule_student_stops → TrangThaiHocSinh

4. Driver xem Trip
   → TripController.getById()
   → Match students với stops theo thuTuDiemDon === sequence
```

**VẤN ĐỀ:**
- Route không lưu gợi ý học sinh → Mất thông tin khi tạo schedule
- Không có API tạo route auto từ start → end với suggestion

---

## 🎯 Cần Triển Khai

### Cụm A: Auto gợi ý điểm dừng khi tạo tuyến
1. ✅ Tạo bảng `student_stop_suggestions`
2. ✅ Tạo helper `GeoUtils` (distance, point-to-polyline)
3. ✅ Tạo API `POST /api/v1/routes/auto-create`
4. ✅ Logic quét học sinh trong hành lang tuyến
5. ✅ Clustering → tạo stops → lưu suggestions

### Cụm B: Tích hợp vào Schedule
1. ✅ API `GET /api/v1/routes/:maTuyen/stop-suggestions`
2. ✅ UI schedule-form hiển thị gợi ý
3. ✅ Lưu vào schedule_student_stops khi chốt

### Cụm C: Verify Driver
1. ✅ Verify TripController.getById trả đúng format

---

## 📝 Files Cần Tạo/Sửa

### Backend
- `database/05_create_student_stop_suggestions.sql` (NEW)
- `ssb-backend/src/utils/GeoUtils.js` (NEW)
- `ssb-backend/src/services/RouteAutoCreateService.js` (NEW)
- `ssb-backend/src/controllers/RouteController.js` (UPDATE - thêm auto-create)
- `ssb-backend/src/routes/api/route.js` (UPDATE - thêm route)
- `ssb-backend/src/models/StudentStopSuggestionModel.js` (NEW)

### Frontend
- `ssb-frontend/components/admin/schedule-form.tsx` (UPDATE - hiển thị suggestions)
- `ssb-frontend/lib/api.ts` (UPDATE - thêm API calls)

