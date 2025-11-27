# Sửa Lỗi Các Service Tạo Route

## 📋 Tổng Quan

Đã sửa lại 3 service tạo route để đảm bảo thêm điểm dừng đúng cách, theo pattern từ `RouteFromOptimizationService` (service mới đã được làm đúng).

---

## 🔧 Các Thay Đổi

### 1. RouteAutoCreateService ✅

**Vấn đề:**
- ❌ Sử dụng raw SQL query để insert vào `route_stops`
- ❌ Không kiểm tra stop có tồn tại trước khi thêm
- ❌ Không thêm `endPoint` vào `route_stops` như điểm dừng cuối cùng

**Đã sửa:**
- ✅ Sử dụng `RouteStopModel.addStop()` thay vì raw SQL
- ✅ Kiểm tra stop có tồn tại bằng `DiemDungModel.getById()`
- ✅ Xử lý lỗi khi stop đã tồn tại (update sequence)
- ✅ Thêm `endPoint` như điểm dừng cuối cùng (nếu chưa có)
- ✅ Thêm helper method `findOrCreateStop()` để tìm hoặc tạo stop

**Code Changes:**
```javascript
// TRƯỚC: Raw SQL
await connection.query(
  `INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE sequence = VALUES(sequence)`,
  [routeId, stop.maDiem, sequence, 30]
);

// SAU: Sử dụng RouteStopModel
const existingStop = await DiemDungModel.getById(stop.maDiem);
if (!existingStop) {
  console.warn(`⚠️ Stop ${stop.maDiem} not found, skipping`);
  continue;
}

try {
  await RouteStopModel.addStop(routeId, stop.maDiem, sequence, 30);
} catch (stopError) {
  if (stopError.message === "STOP_ALREADY_IN_ROUTE" || stopError.message === "SEQUENCE_ALREADY_EXISTS") {
    await RouteStopModel.updateStop(routeId, stop.maDiem, sequence, 30);
  } else {
    console.warn(`Failed to add stop:`, stopError.message);
    continue;
  }
}
```

---

### 2. RouteSuggestionService ✅

**Vấn đề:**
- ❌ Chỉ trả về route objects (suggestions), KHÔNG tạo routes trong DB
- ❌ Không có logic để persist routes vào database
- ❌ Controller chỉ trả về suggestions, không tạo routes thực tế

**Đã sửa:**
- ✅ Thêm method `createRoutesFromSuggestions()` để tạo routes trong DB
- ✅ Tự động tìm hoặc tạo stops trong DB
- ✅ Sử dụng `RouteService.create()` để tạo routes
- ✅ Tự động rebuild polyline sau khi tạo
- ✅ Hỗ trợ tạo tuyến về (return routes) với `pairedRouteId`

**Code Changes:**
```javascript
// THÊM MỚI: Method để tạo routes từ suggestions
static async createRoutesFromSuggestions(suggestionResult, options = {}) {
  const { createReturnRoutes = true } = options;
  const createdRoutes = [];
  const createdReturnRoutes = [];
  const errors = [];

  // Tạo routes đi
  for (const route of suggestionResult.routes || []) {
    // Tạo hoặc tìm các stops trong DB
    const stopIds = [];
    for (const stop of route.stops || []) {
      const existingStops = await DiemDungModel.getByCoordinates(
        stop.lat, stop.lng, 0.0001
      );
      
      let stopId;
      if (existingStops.length > 0) {
        stopId = existingStops[0].maDiem;
      } else {
        stopId = await DiemDungModel.create({
          tenDiem: stop.tenDiem || stop.address || `Điểm dừng...`,
          viDo: stop.lat,
          kinhDo: stop.lng,
          address: stop.address || null,
        });
      }
      
      stopIds.push({ stop_id: stopId, sequence: stop.sequence });
    }

    // Tạo route với stops
    const routeData = {
      tenTuyen: route.name,
      // ... other fields
      stops: stopIds.map(s => ({
        stop_id: s.stop_id,
        sequence: s.sequence,
      })),
    };

    const createdRoute = await RouteService.create(routeData);
    
    // Rebuild polyline
    await RouteService.rebuildPolyline(createdRoute.maTuyen, MapsService);
    
    createdRoutes.push(createdRoute);
  }

  return { createdRoutes, createdReturnRoutes, errors };
}
```

**Cách sử dụng:**
```javascript
// 1. Lấy suggestions
const suggestions = await RouteSuggestionService.suggestRoutes({...});

// 2. Tạo routes từ suggestions
const result = await RouteSuggestionService.createRoutesFromSuggestions(suggestions, {
  createReturnRoutes: true
});
```

---

### 3. RouteService.create() ✅

**Đánh giá:**
- ✅ Đã sử dụng `addStopToRoute()` đúng cách
- ✅ Có logic kiểm tra và tạo stop nếu chưa có
- ✅ Có rebuild polyline sau khi thêm stops
- ✅ Có tạo tuyến về tự động

**Không cần sửa** - Service này đã đúng pattern.

---

## 📊 So Sánh Pattern

### RouteFromOptimizationService (CHUẨN - ĐÚNG)

```javascript
// 1. Kiểm tra stop có tồn tại
const stop = await DiemDungModel.getById(node.maDiem);
if (!stop) {
  console.warn(`⚠️ Stop ${node.maDiem} not found, skipping`);
  continue;
}

// 2. Sử dụng RouteStopModel.addStop()
await RouteStopModel.addStop(routeId, node.maDiem, i + 1, 30);

// 3. Thêm depot như điểm dừng cuối cùng
let depotStopId = await this.findOrCreateDepotStop(depot);
await RouteStopModel.addStop(routeId, depotStopId, nodes.length + 1, 0);
```

### RouteAutoCreateService (SAU KHI SỬA - ĐÚNG)

```javascript
// 1. Kiểm tra stop có tồn tại
const existingStop = await DiemDungModel.getById(stop.maDiem);
if (!existingStop) {
  console.warn(`⚠️ Stop ${stop.maDiem} not found, skipping`);
  continue;
}

// 2. Sử dụng RouteStopModel.addStop()
try {
  await RouteStopModel.addStop(routeId, stop.maDiem, sequence, 30);
} catch (stopError) {
  // Xử lý lỗi nếu đã tồn tại
  if (stopError.message === "STOP_ALREADY_IN_ROUTE") {
    await RouteStopModel.updateStop(routeId, stop.maDiem, sequence, 30);
  }
}

// 3. Thêm endPoint như điểm dừng cuối cùng
const endPointStopId = await this.findOrCreateStop(endPoint, connection);
await RouteStopModel.addStop(routeId, endPointStopId, sortedStops.length + 1, 0);
```

### RouteSuggestionService (SAU KHI SỬA - ĐÚNG)

```javascript
// 1. Tìm hoặc tạo stops
const existingStops = await DiemDungModel.getByCoordinates(
  stop.lat, stop.lng, 0.0001
);

let stopId;
if (existingStops.length > 0) {
  stopId = existingStops[0].maDiem;
} else {
  stopId = await DiemDungModel.create({...});
}

// 2. Sử dụng RouteService.create() (bên trong sẽ dùng RouteStopModel)
const createdRoute = await RouteService.create({
  ...routeData,
  stops: stopIds.map(s => ({
    stop_id: s.stop_id,
    sequence: s.sequence,
  })),
});

// 3. Rebuild polyline
await RouteService.rebuildPolyline(createdRoute.maTuyen, MapsService);
```

---

## ✅ Kết Quả

### Trước Khi Sửa:
- ❌ RouteAutoCreateService: Raw SQL, không kiểm tra stop, thiếu endPoint
- ❌ RouteSuggestionService: Chỉ suggestions, không tạo routes trong DB
- ✅ RouteService: Đã đúng pattern

### Sau Khi Sửa:
- ✅ RouteAutoCreateService: Dùng RouteStopModel, kiểm tra stop, có endPoint
- ✅ RouteSuggestionService: Có method tạo routes trong DB
- ✅ RouteService: Giữ nguyên (đã đúng)

---

## 🎯 Best Practices

1. **Luôn kiểm tra stop có tồn tại** trước khi thêm vào route
2. **Sử dụng RouteStopModel.addStop()** thay vì raw SQL
3. **Xử lý lỗi** khi stop đã tồn tại (update thay vì skip)
4. **Thêm origin/destination** như điểm dừng cuối cùng
5. **Rebuild polyline** sau khi tạo route
6. **Sử dụng transaction** khi tạo nhiều routes cùng lúc

---

**Last Updated:** 2025-01-XX

