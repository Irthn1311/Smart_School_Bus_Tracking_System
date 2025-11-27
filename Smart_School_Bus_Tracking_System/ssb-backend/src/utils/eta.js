/**
 * 📊 ETA UTILITIES - Exponential Moving Average (EMA) Speed Tracking & ETA Calculation
 *
 * 🎯 MỤC ĐÍCH:
 * - Tính tốc độ trung bình của xe bus bằng EMA (mượt hơn average đơn giản)
 * - Dự đoán thời gian đến điểm dừng tiếp theo (ETA - Estimated Time of Arrival)
 * - Phát hiện chậm trễ so với lịch trình
 *
 * 🔧 SỬ DỤNG CHO:
 * - M6: Notifications - "Xe sẽ đến trong X phút"
 * - M7: Reports - Phân tích hiệu suất tài xế
 * - M5: Realtime Tracking - Hiển thị ETA động
 *
 * 📚 CÔNG THỨC EMA:
 * EMA = (Current Value × α) + (Previous EMA × (1 - α))
 * Trong đó: α = smoothing factor (0.2 cho speed tracking)
 *
 * @author Nguyễn Tuấn Tài - M4/M5/M6
 * @date 2025-11-13
 */

import { haversine } from "./geo.js";

/**
 * 📈 Class quản lý EMA Speed Tracking cho từng trip
 *
 * 💡 TẠI SAO DÙNG EMA:
 * - Average đơn giản: (v1 + v2 + v3) / 3 → Bị ảnh hưởng nhiều bởi giá trị cũ
 * - EMA: Ưu tiên giá trị mới hơn → Phản ứng nhanh với thay đổi tốc độ
 *
 * 🎯 VÍ DỤ:
 * Xe chạy: 30 km/h → 40 km/h → 20 km/h (tắc đường)
 * - Average: (30+40+20)/3 = 30 km/h (không phản ánh hiện tại)
 * - EMA: ~25 km/h (phản ánh tốc độ thấp gần đây)
 */
class EMASpeedTracker {
  constructor(alpha = 0.2) {
    /**
     * @property {number} alpha - Smoothing factor (0-1)
     * - 0.1 = Mượt, ít phản ứng với thay đổi đột ngột
     * - 0.2 = Cân bằng (RECOMMENDED)
     * - 0.5 = Phản ứng nhanh với thay đổi
     */
    this.alpha = alpha;

    /**
     * @property {number} emaSpeed - Tốc độ EMA hiện tại (km/h)
     * - null = Chưa có dữ liệu
     * - Được cập nhật mỗi lần nhận GPS
     */
    this.emaSpeed = null;

    /**
     * @property {number} sampleCount - Số mẫu GPS đã nhận
     * - Dùng để warm-up: Cần ít nhất 3 samples để EMA ổn định
     */
    this.sampleCount = 0;

    /**
     * @property {Object} lastPosition - Vị trí GPS cuối cùng
     * - Dùng để tính khoảng cách di chuyển
     */
    this.lastPosition = null;

    /**
     * @property {number} lastTimestamp - Timestamp GPS cuối (ms)
     * - Dùng để tính time delta
     */
    this.lastTimestamp = null;
  }

  /**
   * 🔄 Cập nhật EMA speed với GPS point mới
   *
   * @param {Object} gpsPoint - GPS data
   * @param {number} gpsPoint.lat - Latitude
   * @param {number} gpsPoint.lng - Longitude
   * @param {number} [gpsPoint.speed] - Speed từ GPS (km/h, optional)
   * @param {number} [gpsPoint.timestamp] - Timestamp (ms, optional)
   *
   * @returns {Object} { emaSpeed, instantSpeed, sampleCount }
   */
  update(gpsPoint) {
    const now = gpsPoint.timestamp || Date.now();

    // 🚀 CASE 1: First sample - Khởi tạo
    if (!this.lastPosition) {
      this.lastPosition = { lat: gpsPoint.lat, lng: gpsPoint.lng };
      this.lastTimestamp = now;

      // Nếu có speed từ GPS sensor, dùng luôn
      if (typeof gpsPoint.speed === "number" && gpsPoint.speed >= 0) {
        this.emaSpeed = gpsPoint.speed;
        this.sampleCount = 1;
      }

      return {
        emaSpeed: this.emaSpeed,
        instantSpeed: gpsPoint.speed || 0,
        sampleCount: this.sampleCount,
      };
    }

    // ⏱️ Tính time delta (giây)
    const timeDelta = (now - this.lastTimestamp) / 1000; // ms → seconds

    // ⚠️ Bỏ qua nếu time delta quá nhỏ (< 1s) hoặc quá lớn (> 60s)
    if (timeDelta < 1 || timeDelta > 60) {
      console.warn(`[ETA] Invalid time delta: ${timeDelta}s, skipping update`);
      return {
        emaSpeed: this.emaSpeed,
        instantSpeed: null,
        sampleCount: this.sampleCount,
      };
    }

    // 📏 Tính khoảng cách di chuyển (mét)
    const distance = haversine(
      this.lastPosition.lat,
      this.lastPosition.lng,
      gpsPoint.lat,
      gpsPoint.lng
    );

    // 🚗 Tính instant speed (km/h)
    // distance (m) / time (s) × 3.6 = km/h
    const instantSpeed = (distance / timeDelta) * 3.6;

    // ⚠️ Sanity check: Bỏ qua nếu speed không hợp lệ
    // - < 0: GPS error
    // - > 150: Không thể (xe bus max ~80 km/h)
    if (instantSpeed < 0 || instantSpeed > 150) {
      console.warn(
        `[ETA] Invalid speed: ${instantSpeed.toFixed(1)} km/h, skipping`
      );
      return {
        emaSpeed: this.emaSpeed,
        instantSpeed: null,
        sampleCount: this.sampleCount,
      };
    }

    // 📊 Cập nhật EMA
    if (this.emaSpeed === null) {
      // First valid speed → Khởi tạo EMA
      this.emaSpeed = instantSpeed;
    } else {
      // EMA formula: new_ema = (value × α) + (old_ema × (1 - α))
      this.emaSpeed =
        instantSpeed * this.alpha + this.emaSpeed * (1 - this.alpha);
    }

    // 💾 Lưu state
    this.lastPosition = { lat: gpsPoint.lat, lng: gpsPoint.lng };
    this.lastTimestamp = now;
    this.sampleCount++;

    return {
      emaSpeed: this.emaSpeed,
      instantSpeed,
      sampleCount: this.sampleCount,
    };
  }

  /**
   * 📌 Get current EMA speed
   * @returns {number|null} EMA speed (km/h) hoặc null nếu chưa có data
   */
  getSpeed() {
    return this.emaSpeed;
  }

  /**
   * ✅ Check xem EMA đã ổn định chưa
   * @returns {boolean} true nếu đã có >= 3 samples
   */
  isStable() {
    return this.sampleCount >= 3;
  }

  /**
   * 🔄 Reset tracker (khi trip kết thúc hoặc restart)
   */
  reset() {
    this.emaSpeed = null;
    this.sampleCount = 0;
    this.lastPosition = null;
    this.lastTimestamp = null;
  }
}

/**
 * 🎯 Tính ETA đến điểm dừng tiếp theo
 *
 * 📖 LOGIC:
 * 1. Lấy EMA speed (nếu có) hoặc fallback sang avgSpeed
 * 2. Tính khoảng cách đến stop (haversine)
 * 3. ETA (phút) = distance (km) / speed (km/h) × 60
 * 4. Thêm buffer time (dừng xe, lên xuống học sinh)
 *
 * @param {Object} currentPosition - Vị trí xe hiện tại
 * @param {number} currentPosition.lat
 * @param {number} currentPosition.lng
 *
 * @param {Object} nextStop - Điểm dừng tiếp theo
 * @param {number} nextStop.lat
 * @param {number} nextStop.lng
 * @param {number} [nextStop.dwell_seconds=30] - Thời gian dừng (giây)
 *
 * @param {EMASpeedTracker|null} [tracker] - EMA tracker (optional)
 * @param {number} [fallbackSpeed=25] - Speed mặc định nếu không có EMA (km/h)
 *
 * @returns {Object} { etaMinutes, etaSeconds, distance, speed, confidence }
 */
export function calculateETA(
  currentPosition,
  nextStop,
  tracker = null,
  fallbackSpeed = 25
) {
  // 📏 Tính khoảng cách (mét)
  const distance = haversine(
    currentPosition.lat,
    currentPosition.lng,
    nextStop.lat || nextStop.viDo,
    nextStop.lng || nextStop.kinhDo
  );

  // 🚗 Xác định speed để tính ETA
  let speed = fallbackSpeed; // Default: 25 km/h (tốc độ trung bình trong thành phố)
  let confidence = "low"; // low | medium | high

  if (tracker) {
    const emaSpeed = tracker.getSpeed();
    if (emaSpeed !== null && emaSpeed > 0) {
      speed = emaSpeed;
      confidence = tracker.isStable() ? "high" : "medium";
    }
  }

  // ⏱️ Tính travel time (giây)
  // distance (m) / 1000 = km
  // km / (speed km/h) = hours
  // hours × 3600 = seconds
  const travelTimeSeconds = (distance / 1000 / speed) * 3600;

  // 🛑 Thêm dwell time (thời gian dừng xe)
  const dwellSeconds = nextStop.dwell_seconds || 30; // Default 30s
  const totalSeconds = travelTimeSeconds + dwellSeconds;

  // 📊 Kết quả
  return {
    etaMinutes: Math.ceil(totalSeconds / 60), // Làm tròn lên
    etaSeconds: Math.ceil(totalSeconds),
    distance: Math.round(distance), // Làm tròn mét
    speed: Math.round(speed * 10) / 10, // 1 chữ số thập phân
    confidence, // low | medium | high
    tracker: tracker
      ? {
          emaSpeed: tracker.emaSpeed,
          sampleCount: tracker.sampleCount,
          isStable: tracker.isStable(),
        }
      : null,
  };
}

/**
 * 🚨 Phát hiện delay so với scheduled time
 *
 * @param {string} scheduledTime - Giờ dự kiến (format: "HH:MM" hoặc ISO string)
 * @param {number} etaMinutes - ETA tính được (phút)
 * @param {number} [threshold=5] - Ngưỡng cảnh báo (phút)
 *
 * @returns {Object} { isDelayed, delayMinutes, severity }
 */
export function checkDelay(scheduledTime, etaMinutes, threshold = 5) {
  // Parse scheduled time
  let scheduledDate;
  if (scheduledTime.includes(":") && scheduledTime.length === 5) {
    // Format: "HH:MM"
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
  } else {
    // ISO string
    scheduledDate = new Date(scheduledTime);
  }

  // Tính expected arrival time
  const now = new Date();
  const expectedArrival = new Date(now.getTime() + etaMinutes * 60 * 1000);

  // Tính delay (phút)
  const delayMs = expectedArrival - scheduledDate;
  const delayMinutes = Math.round(delayMs / 60 / 1000);

  // Xác định severity
  let severity = "none";
  if (delayMinutes >= threshold) {
    if (delayMinutes >= 15) severity = "critical"; // >= 15 phút
    else if (delayMinutes >= 10) severity = "high"; // 10-14 phút
    else severity = "medium"; // 5-9 phút
  } else if (delayMinutes >= 0) {
    severity = "low"; // < 5 phút
  } else {
    severity = "early"; // Đến sớm hơn dự kiến
  }

  return {
    isDelayed: delayMinutes >= threshold,
    delayMinutes,
    severity,
    expectedArrival: expectedArrival.toISOString(),
    scheduledArrival: scheduledDate.toISOString(),
  };
}

/**
 * 🧪 TEST CASES MẪU
 *
 * Uncomment để test:
 *
 * ```javascript
 * // Test 1: EMA Speed Tracking
 * const tracker = new EMASpeedTracker(0.2);
 *
 * // Simulate GPS updates
 * const points = [
 *   { lat: 10.762622, lng: 106.660172, speed: 30, timestamp: Date.now() },
 *   { lat: 10.762700, lng: 106.660250, speed: 35, timestamp: Date.now() + 3000 },
 *   { lat: 10.762800, lng: 106.660350, speed: 40, timestamp: Date.now() + 6000 },
 *   { lat: 10.762850, lng: 106.660400, speed: 25, timestamp: Date.now() + 9000 }, // Slow down
 * ];
 *
 * points.forEach((point, i) => {
 *   const result = tracker.update(point);
 *   console.log(`Sample ${i+1}:`, {
 *     instant: result.instantSpeed?.toFixed(1),
 *     ema: result.emaSpeed?.toFixed(1),
 *     stable: tracker.isStable(),
 *   });
 * });
 *
 * // Test 2: Calculate ETA
 * const currentPos = { lat: 10.762622, lng: 106.660172 };
 * const nextStop = { lat: 10.7408, lng: 106.7075, dwell_seconds: 30 };
 *
 * const eta = calculateETA(currentPos, nextStop, tracker);
 * console.log('ETA:', {
 *   minutes: eta.etaMinutes,
 *   distance: eta.distance + 'm',
 *   speed: eta.speed + ' km/h',
 *   confidence: eta.confidence,
 * });
 * // Expected: ~12-15 minutes (distance ~5km, speed ~25 km/h)
 *
 * // Test 3: Check Delay
 * const scheduled = '07:30'; // 7:30 AM
 * const delay = checkDelay(scheduled, 10, 5); // ETA 10 phút, threshold 5 phút
 * console.log('Delay:', delay);
 * ```
 */

export { EMASpeedTracker };
