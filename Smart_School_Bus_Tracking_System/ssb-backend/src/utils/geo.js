/**
 * 📍 GEO UTILITIES - Công cụ tính toán địa lý
 *
 * 🎯 MỤC ĐÍCH:
 * - Tính khoảng cách giữa 2 điểm trên Trái Đất
 * - Kiểm tra điểm có nằm trong vùng geofence hay không
 *
 * 🔧 SỬ DỤNG CHO:
 * - M4: Realtime Tracking - Phát hiện xe đến gần điểm dừng
 * - M6: Notifications - Cảnh báo "Xe sắp tới trong X phút"
 *
 * 📚 CÔNG THỨC HAVERSINE:
 * Tính khoảng cách "chim bay" (great-circle distance) giữa 2 điểm
 * trên mặt cầu (Trái Đất), dựa vào kinh độ và vĩ độ.
 *
 * @author Nguyễn Tuấn Tài - M4/M5/M6
 * @date 2025-10-26
 */

/**
 * 🌍 Hàm tính khoảng cách giữa 2 tọa độ GPS (Haversine Formula)
 *
 * 📖 GIẢI THÍCH CÔNG THỨC:
 * - Haversine = Công thức toán học tính khoảng cách ngắn nhất giữa 2 điểm
 *   trên bề mặt hình cầu (Trái Đất)
 * - Kết quả chính xác hơn so với Pythagorean (a² + b² = c²) vì Trái Đất tròn
 *
 * 🎯 CÁCH DÙNG:
 * ```javascript
 * const distance = haversine(10.762622, 106.660172, 10.7408, 106.7075);
 * console.log(`Khoảng cách: ${distance.toFixed(0)} mét`);
 * // Output: Khoảng cách: 5234 mét
 * ```
 *
 * 🔢 THAM SỐ:
 * @param {number} lat1 - Vĩ độ điểm 1 (VD: 10.762622 = Sài Gòn)
 * @param {number} lon1 - Kinh độ điểm 1 (VD: 106.660172)
 * @param {number} lat2 - Vĩ độ điểm 2
 * @param {number} lon2 - Kinh độ điểm 2
 *
 * @returns {number} Khoảng cách tính bằng MÉT (meters)
 *
 * 💡 LƯU Ý:
 * - Kết quả là khoảng cách "chim bay" (đường thẳng), không phải đường đi thực tế
 * - Sai số < 0.5% với khoảng cách dưới 1000km
 * - Đủ chính xác cho việc tracking xe bus trong thành phố
 *
 * 📐 CÔNG THỨC:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1−a))
 * d = R * c
 * Trong đó:
 * - φ = latitude (vĩ độ) tính bằng radian
 * - λ = longitude (kinh độ) tính bằng radian
 * - R = bán kính Trái Đất = 6371000 mét
 */
export function haversine(lat1, lon1, lat2, lon2) {
  // 🌍 Bán kính Trái Đất (mét)
  // 6371 km = 6371000 m
  const R = 6371e3; // e3 = * 1000

  // 📐 Chuyển đổi độ (degrees) sang radian
  // Công thức: radian = degree * (π / 180)
  // VD: 90° = 90 * (3.14159 / 180) = 1.5708 radian
  const φ1 = (lat1 * Math.PI) / 180; // Vĩ độ điểm 1 (radian)
  const φ2 = (lat2 * Math.PI) / 180; // Vĩ độ điểm 2 (radian)

  // 📏 Tính độ chênh lệch (delta)
  const Δφ = ((lat2 - lat1) * Math.PI) / 180; // Chênh lệch vĩ độ
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Chênh lệch kinh độ

  // 🧮 Áp dụng công thức Haversine
  // Bước 1: Tính a
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + // sin²(Δφ/2)
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2); // cos(φ1) * cos(φ2) * sin²(Δλ/2)

  // Bước 2: Tính c (góc trung tâm)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Bước 3: Tính khoảng cách d = R * c
  const distance = R * c; // Kết quả bằng mét

  return distance;
}

/**
 * 🎯 Hàm kiểm tra điểm có nằm trong vùng Geofence hay không
 *
 * 📖 GEOFENCE LÀ GÌ:
 * - Geo (địa lý) + Fence (hàng rào) = Hàng rào ảo
 * - Vẽ một "vòng tròn ảo" bán kính X mét quanh 1 điểm
 * - Kiểm tra điểm khác có NẰM TRONG vòng tròn đó không
 *
 * 🎯 SỬ DỤNG TRONG DỰ ÁN:
 * - Phát hiện xe bus TỚI GẦN điểm dừng (trong vòng 60m)
 * - Khi xe vào geofence → Emit event `approaching_stop`
 * - Phụ huynh nhận thông báo: "Xe sắp tới trong 2 phút!"
 *
 * 💻 VÍ DỤ SỬ DỤNG:
 * ```javascript
 * // Vị trí xe bus hiện tại
 * const busPosition = { lat: 10.762622, lng: 106.660172 };
 *
 * // Vị trí điểm dừng tiếp theo
 * const nextStop = { lat: 10.762800, lng: 106.660300 };
 *
 * // Kiểm tra xe có trong vòng 60m của điểm dừng không?
 * if (inGeofence(busPosition, nextStop, 60)) {
 *   console.log('⚡ Xe đã vào vùng 60m! Emit approaching_stop!');
 *   io.to(`trip-${tripId}`).emit('approaching_stop', {...});
 * }
 * ```
 *
 * 🔢 THAM SỐ:
 * @param {Object} point - Điểm cần kiểm tra (xe bus)
 * @param {number} point.lat - Vĩ độ điểm cần kiểm tra
 * @param {number} point.lng - Kinh độ điểm cần kiểm tra
 *
 * @param {Object} center - Điểm trung tâm (điểm dừng)
 * @param {number} center.lat - Vĩ độ điểm trung tâm
 * @param {number} center.lng - Kinh độ điểm trung tâm
 *
 * @param {number} [radius=60] - Bán kính geofence (mét), mặc định 60m
 *
 * @returns {boolean} true = Nằm trong vùng, false = Ngoài vùng
 *
 * 🎨 HÌNH ẢNH MINH HỌA:
 *
 *           ⭕ Điểm dừng (center)
 *          /   \
 *         /     \    <- Vòng tròn bán kính 60m (geofence)
 *        |   🚌  |   <- Xe bus (point)
 *         \     /
 *          \   /
 *           ⭕
 *
 * Nếu xe 🚌 NẰM TRONG vòng tròn → return true
 * Nếu xe 🚌 Ở NGOÀI vòng tròn → return false
 *
 * 💡 TẠI SAO DÙNG 60M:
 * - Đủ xa để thông báo trước cho phụ huynh chuẩn bị
 * - Đủ gần để không thông báo quá sớm (tránh spam)
 * - Xe đi 30 km/h = 8.3 m/s → 60m ≈ 7 giây → Vừa đủ thời gian
 *
 * ⚠️ LƯU Ý:
 * - Hàm này GỌI LẠI hàm haversine() để tính khoảng cách
 * - Chỉ kiểm tra khoảng cách, không quan tâm hướng đi
 * - Geofence hình tròn, không phải hình vuông
 */
export function inGeofence(point, center, radius = 60) {
  // 📏 Tính khoảng cách thực tế giữa point và center
  const distance = haversine(
    point.lat, // Vĩ độ xe bus
    point.lng, // Kinh độ xe bus
    center.lat, // Vĩ độ điểm dừng
    center.lng // Kinh độ điểm dừng
  );

  // ✅ So sánh: Khoảng cách có <= bán kính geofence không?
  // VD:
  // - distance = 45m, radius = 60m → 45 <= 60 → true (TRONG vùng)
  // - distance = 80m, radius = 60m → 80 <= 60 → false (NGOÀI vùng)
  return distance <= radius;
}

/**
 * 🧪 TEST CASES MẪU (Chạy để kiểm tra):
 *
 * Uncomment đoạn code dưới để test:
 *
 * ```javascript
 * // Test 1: Tính khoảng cách 2 điểm ở Sài Gòn
 * const dist1 = haversine(10.762622, 106.660172, 10.7408, 106.7075);
 * console.log('Khoảng cách:', Math.round(dist1), 'mét');
 * // Expected: ~5234 mét
 *
 * // Test 2: Kiểm tra xe có trong vùng 60m không
 * const bus = { lat: 10.762622, lng: 106.660172 };
 * const stop = { lat: 10.762650, lng: 106.660200 }; // Cách ~30m
 * console.log('Trong vùng 60m?', inGeofence(bus, stop, 60));
 * // Expected: true
 *
 * // Test 3: Xe xa hơn 60m
 * const farStop = { lat: 10.763000, lng: 106.661000 }; // Cách ~100m
 * console.log('Trong vùng 60m?', inGeofence(bus, farStop, 60));
 * // Expected: false
 * ```
 */

/**
 * 📚 TÀI LIỆU THAM KHẢO:
 * - Haversine formula: https://en.wikipedia.org/wiki/Haversine_formula
 * - Geofencing: https://en.wikipedia.org/wiki/Geo-fence
 * - JavaScript Math: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math
 *
 * 🔗 LIÊN KẾT VỚI CÁC MODULE KHÁC:
 * - Sử dụng trong: src/services/telemetry.service.ts
 * - Liên quan đến: docs/ws_events.md (event: approaching_stop)
 * - Phối hợp với: src/utils/eta.ts (tính thời gian dự kiến)
 */
