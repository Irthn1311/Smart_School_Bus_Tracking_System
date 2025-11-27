/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 TELEMETRY SERVICE - Xử lý dữ liệu GPS từ xe bus
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * - Nhận vị trí GPS từ tài xế (qua REST hoặc WebSocket)
 * - Validate dữ liệu GPS (lat/lng hợp lệ)
 * - Lưu vị trí vào cache (in-memory hoặc Redis)
 * - Tính toán geofence (xe gần điểm dừng?)
 * - Phát hiện delay (xe bị trễ?)
 * - Emit events realtime (approach_stop, delay_alert)
 *
 * 🔧 SỬ DỤNG CHO:
 * - M5: Trip Lifecycle - Tracking vị trí xe
 * - M6: Notifications - Cảnh báo cho phụ huynh
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-29
 */

import { haversine, inGeofence } from "../utils/geo.js";
import { EMASpeedTracker, calculateETA, checkDelay } from "../utils/eta.js"; // 🎯 P1: EMA ETA
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import RouteStopModel from "../models/RouteStopModel.js"; // Updated: Use RouteStopModel instead of DiemDungModel
import HocSinhModel from "../models/HocSinhModel.js";
import NguoiDungModel from "../models/NguoiDungModel.js";
import { syncBusLocation } from "./firebaseSync.service.js"; // 🔥 Day 5: Firebase sync
import { notifyApproachStop, notifyDelay } from "./firebaseNotify.service.js"; // 🔥 Day 5: Push Notifications
import SettingsService from "./settingsService.js"; // M8: Runtime settings

/**
 * 🗺️ IN-MEMORY CACHE - Lưu vị trí xe bus
 *
 * Structure:
 * {
 *   "bus-5": {
 *     lat: 21.0285,
 *     lng: 105.8542,
 *     speed: 30,
 *     heading: 90,
 *     timestamp: "2025-10-29T12:30:00Z",
 *     tripId: 42
 *   }
 * }
 *
 * Tại sao dùng Map?
 * - Nhanh hơn Object: O(1) lookup
 * - Hỗ trợ key bất kỳ (không chỉ string)
 * - Có size property
 * - Có iterator
 */
const busPositions = new Map();

/**
 * 🗺️ CACHE LAST UPDATE TIME - Tránh spam
 *
 * Structure:
 * {
 *   "bus-5": 1730198765432  // Timestamp (ms)
 * }
 *
 * Dùng để:
 * - Rate limit: Chỉ cho cập nhật mỗi 2s
 * - Tránh driver spam GPS
 */
const lastUpdateTime = new Map();

/**
 * 🚏 EMITTED STOPS CACHE - Anti-spam cho approach_stop events
 *
 * Structure: Map<tripId, Set<stopId>>
 * Ví dụ: Map { 16 => Set(3, 7, 12), 22 => Set(5) }
 *
 * Dùng để:
 * - Chỉ emit approach_stop một lần cho mỗi stop trong mỗi trip
 * - Tránh spam khi bus dừng tại stop (có thể ở trong geofence 30s+)
 * - Clear khi trip hoàn thành hoặc hủy
 */
const emittedStops = new Map();

/**
 * 📊 EMA SPEED TRACKERS - Theo dõi tốc độ EMA cho từng trip
 *
 * Structure: Map<tripId, EMASpeedTracker>
 * Ví dụ: Map { 16 => EMASpeedTracker { emaSpeed: 28.5, sampleCount: 12 }, ... }
 *
 * Dùng để:
 * - Track tốc độ trung bình của xe (EMA)
 * - Tính ETA đến điểm dừng tiếp theo
 * - Phát hiện delay chính xác hơn
 * - Clear khi trip hoàn thành hoặc hủy
 *
 * @since P1 Enhancement - 2025-11-13
 */
const emaTrackers = new Map();

/**
 * ⏱️ RATE LIMIT - Thời gian tối thiểu giữa 2 lần cập nhật
 * 2000ms = 2 giây
 */
const RATE_LIMIT_MS = 2000;

/**
 * Lấy rate limit (ms) cho GPS updates
 * Có thể lấy từ SettingsService hoặc dùng giá trị mặc định
 * @returns {number} Rate limit in milliseconds
 */
function getRateLimitMs() {
  try {
    // Có thể lấy từ SettingsService nếu có
    const settings = SettingsService.getSettings();
    if (settings.realtimeThrottleSeconds) {
      return settings.realtimeThrottleSeconds * 1000; // Convert to ms
    }
  } catch (error) {
    // Nếu có lỗi, dùng giá trị mặc định
    console.warn(
      "⚠️ Could not get rate limit from SettingsService, using default:",
      error.message
    );
  }
  return RATE_LIMIT_MS;
}

/**
 * Lấy geofence radius (meters)
 * Có thể lấy từ SettingsService hoặc dùng giá trị mặc định
 * @returns {number} Geofence radius in meters
 */
function getGeofenceRadius() {
  try {
    const settings = SettingsService.getSettings();
    if (settings.geofenceRadiusMeters) {
      return settings.geofenceRadiusMeters;
    }
  } catch (error) {
    console.warn(
      "⚠️ Could not get geofence radius from SettingsService, using default:",
      error.message
    );
  }
  return GEOFENCE_RADIUS;
}

/**
 * Lấy delay threshold (minutes)
 * Có thể lấy từ SettingsService hoặc dùng giá trị mặc định
 * @returns {number} Delay threshold in minutes
 */
function getDelayThresholdMin() {
  try {
    const settings = SettingsService.getSettings();
    if (settings.delayAlertThresholdMin) {
      return settings.delayAlertThresholdMin;
    }
  } catch (error) {
    console.warn(
      "⚠️ Could not get delay threshold from SettingsService, using default:",
      error.message
    );
  }
  return DELAY_THRESHOLD_MIN;
}

/**
 * 📍 GEOFENCE RADIUS - Bán kính phát hiện "gần điểm dừng"
 * 60 mét = Khoảng 7 giây với tốc độ 30km/h
 */
const GEOFENCE_RADIUS = 60; // meters

/**
 * 🚨 DELAY ALERT CACHE - Lưu lần gửi cuối cùng cho mỗi trip
 *
 * Structure: Map<tripId, timestamp>
 * Ví dụ: Map { 22 => 1730198765432, 45 => 1730199123456 }
 *
 * Gửi lại sau mỗi 3 phút để nhắc nhở phụ huynh
 */
const delayAlertLastSent = new Map();

/**
 * ⏰ DELAY THRESHOLD - Ngưỡng coi là "trễ"
 * 5 phút = Cảnh báo nếu xe trễ hơn 5 phút so với ETA
 */
const DELAY_THRESHOLD_MIN = 5;

/**
 * 🔄 DELAY ALERT INTERVAL - Gửi lại delay alert sau mỗi X phút
 * 3 phút = 180,000 ms
 */
const DELAY_ALERT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * 🔔 Lấy FCM tokens của phụ huynh trong chuyến đi
 * @param {number} tripId - ID chuyến đi
 * @param {number[]} [specificParentIds] - Optional: Chỉ lấy tokens của các parents này
 * @returns {Promise<string[]>} Danh sách FCM tokens
 */
async function getParentTokensForTrip(tripId, specificParentIds = null) {
  try {
    let parentIds = specificParentIds;

    // Nếu không có specificParentIds, lấy tất cả parents trong trip
    if (!parentIds || parentIds.length === 0) {
      // 1. Lấy danh sách học sinh trên chuyến đi
      const students = await HocSinhModel.getByTripId(tripId);
      if (!students || students.length === 0) {
        return [];
      }

      // 2. Lấy danh sách mã phụ huynh
      parentIds = students.map((s) => s.maPhuHuynh).filter((id) => id); // Loại bỏ null/undefined
    }

    if (parentIds.length === 0) {
      return [];
    }

    // 3. Lấy FCM tokens của phụ huynh
    const tokens = [];
    for (const parentId of parentIds) {
      const parent = await NguoiDungModel.getById(parentId);
      if (parent && parent.fcmToken) {
        tokens.push(parent.fcmToken);
      }
    }

    return tokens;
  } catch (error) {
    console.error("❌ getParentTokensForTrip error:", error);
    return [];
  }
}

class TelemetryService {
  /**
   * 🧹 CLEAR TRIP DATA - Xóa cache khi trip kết thúc
   *
   * @param {number} tripId - ID chuyến đi
   * @param {number} busId - ID xe bus
   *
   * Gọi hàm này khi:
   * - Trip completed (trangThai = 'hoan_thanh')
   * - Trip cancelled (trangThai = 'huy')
   */
  static clearTripData(tripId, busId) {
    // Clear bus position
    if (busId) {
      busPositions.delete(`bus-${busId}`);
      lastUpdateTime.delete(`bus-${busId}`);
      console.log(`🧹 Cleared position cache for bus-${busId}`);
    }

    // Clear emitted stops for this trip
    if (emittedStops.has(tripId)) {
      emittedStops.delete(tripId);
      console.log(`🧹 Cleared emitted stops cache for trip-${tripId}`);
    }

    // Clear delay alert cache
    if (delayAlertLastSent.has(tripId)) {
      delayAlertLastSent.delete(tripId);
      console.log(`🧹 Cleared delay alert cache for trip-${tripId}`);
    }
  }

  /**
   * 📥 CẬP NHẬT VỊ TRÍ XE BUS
   *
   * @param {number} tripId - ID chuyến đi
   * @param {Object} positionData - Dữ liệu GPS
   * @param {number} positionData.lat - Vĩ độ
   * @param {number} positionData.lng - Kinh độ
   * @param {number} [positionData.speed] - Tốc độ (km/h)
   * @param {number} [positionData.heading] - Hướng đi (0-360°)
   * @param {Object} io - Socket.IO instance
   *
   * @returns {Object} Result với vị trí đã lưu + events đã emit
   */
  static async updatePosition(tripId, positionData, io) {
    try {
      // ✅ Validate dữ liệu GPS
      const { lat, lng, speed, heading } = positionData;

      if (!lat || !lng) {
        throw new Error("Latitude và Longitude là bắt buộc");
      }

      // Validate lat/lng range
      if (lat < -90 || lat > 90) {
        throw new Error("Latitude phải nằm trong khoảng -90 đến 90");
      }

      if (lng < -180 || lng > 180) {
        throw new Error("Longitude phải nằm trong khoảng -180 đến 180");
      }

      // 🚌 Lấy thông tin chuyến đi và xe
      const trip = await ChuyenDiModel.getById(tripId);
      if (!trip) {
        throw new Error("Không tìm thấy chuyến đi");
      }

      if (trip.trangThai !== "dang_chay") {
        throw new Error("Chuyến đi không đang chạy");
      }

      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        throw new Error("Không tìm thấy lịch trình");
      }

      const busId = schedule.maXe;

      // ⏱️ CHECK RATE LIMIT
      const now = Date.now();
      const lastUpdate = lastUpdateTime.get(`bus-${busId}`);

      const rateLimitMs = getRateLimitMs();
      if (lastUpdate && now - lastUpdate < rateLimitMs) {
        const waitTime = Math.ceil((rateLimitMs - (now - lastUpdate)) / 1000);
        throw new Error(
          `Vui lòng đợi ${waitTime}s trước khi gửi vị trí tiếp theo`
        );
      }

      // 💾 Lưu vị trí vào cache
      const position = {
        lat,
        lng,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date().toISOString(),
        tripId,
        busId,
      };

      busPositions.set(`bus-${busId}`, position);
      lastUpdateTime.set(`bus-${busId}`, now);

      // 📊 P1: Update EMA Speed Tracker
      let emaData = null;
      try {
        // Get or create EMA tracker for this trip
        if (!emaTrackers.has(tripId)) {
          emaTrackers.set(tripId, new EMASpeedTracker(0.2)); // α = 0.2 (balanced)
          console.log(`[EMA] Created tracker for trip ${tripId}`);
        }

        const tracker = emaTrackers.get(tripId);
        const emaResult = tracker.update({
          lat,
          lng,
          speed: speed || 0,
          timestamp: now,
        });

        emaData = {
          emaSpeed: emaResult.emaSpeed?.toFixed(1),
          instantSpeed: emaResult.instantSpeed?.toFixed(1),
          sampleCount: emaResult.sampleCount,
          isStable: tracker.isStable(),
        };

        console.log(`[EMA] Trip ${tripId}:`, emaData);
      } catch (emaError) {
        console.warn("[EMA] Update failed (non-fatal):", emaError.message);
      }

      // M4-M6: Broadcast bus_position_update to multiple rooms
      const positionUpdate = {
        busId,
        tripId,
        lat,
        lng,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: position.timestamp,
        emaSpeed: emaData?.emaSpeed, // 📊 P1: Include EMA speed
      };

      // Emit to trip room (parents + admin subscribed)
      io.to(`trip-${tripId}`).emit("bus_position_update", positionUpdate);

      // M4-M6: Also emit to bus room
      io.to(`bus-${busId}`).emit("bus_position_update", positionUpdate);

      // M4-M6: Emit to role-admin for monitoring
      io.to("role-quan_tri").emit("bus_position_update", positionUpdate);

      const events = ["bus_position_update"];

      // 🔥 DAY 5: Sync to Firebase Realtime Database
      // This allows FE to read position even when WebSocket is disconnected
      try {
        await syncBusLocation(busId, {
          tripId,
          lat,
          lng,
          speed: speed || 0,
          heading: heading || 0,
          timestamp: position.timestamp,
        });
      } catch (firebaseError) {
        // Don't fail the entire request if Firebase sync fails
        console.error(
          "⚠️  Firebase sync failed (non-fatal):",
          firebaseError.message
        );
      }

      // 🎯 CHECK GEOFENCE (Xe gần điểm dừng?)
      const approachEvent = await this.checkGeofence(
        tripId,
        { lat, lng },
        io,
        schedule
      );
      if (approachEvent) {
        events.push("approach_stop");
      }

      // ⏰ CHECK DELAY (Xe bị trễ?)
      const delayEvent = await this.checkDelay(
        tripId,
        { lat, lng },
        io,
        schedule,
        trip
      );
      if (delayEvent) {
        events.push("delay_alert");
      }

      return {
        success: true,
        position,
        events,
      };
    } catch (error) {
      console.error("❌ TelemetryService.updatePosition error:", error);
      throw error;
    }
  }

  /**
   * 🎯 KIỂM TRA GEOFENCE - Xe có gần điểm dừng không?
   *
   * @param {number} tripId - ID chuyến đi
   * @param {Object} currentPos - Vị trí hiện tại {lat, lng}
   * @param {Object} io - Socket.IO instance
   * @param {Object} schedule - Thông tin lịch trình
   *
   * @returns {boolean} true nếu đã emit event
   */
  static async checkGeofence(tripId, currentPos, io, schedule) {
    try {
      // Lấy danh sách điểm dừng của tuyến
      const route = await TuyenDuongModel.getById(schedule.maTuyen);
      if (!route) return false;

      // Get stops for route using RouteStopModel
      const stops = await RouteStopModel.getByRouteId(schedule.maTuyen);
      if (!stops || stops.length === 0) return false;

      // Tìm điểm dừng tiếp theo (điểm gần nhất chưa qua)
      for (const stop of stops) {
        if (!stop.viDo || !stop.kinhDo) continue;

        const distance = haversine(
          currentPos.lat,
          currentPos.lng,
          parseFloat(stop.viDo),
          parseFloat(stop.kinhDo)
        );

        // Nếu trong vòng 60m → Emit event
        const geofenceRadius = getGeofenceRadius();
        if (distance <= geofenceRadius) {
          // 🚏 Anti-spam: Check if this stop has already been emitted for this trip
          const tripEmittedStops = emittedStops.get(tripId) || new Set();

          if (tripEmittedStops.has(stop.maDiem)) {
            // Already emitted for this stop, skip
            console.log(
              `⏭️  Skipping approach_stop for ${stop.tenDiem} (already emitted for trip ${tripId})`
            );
            continue; // Check next stop
          }

          console.log(
            `📍 Xe gần điểm dừng ${stop.tenDiem} (${Math.round(distance)}m)`
          );

          // 📊 P1: Calculate ETA to this stop
          let etaData = null;
          try {
            const tracker = emaTrackers.get(tripId);
            const eta = calculateETA(currentPos, stop, tracker, 25); // fallback 25 km/h
            etaData = {
              etaMinutes: eta.etaMinutes,
              etaSeconds: eta.etaSeconds,
              distance: eta.distance,
              speed: eta.speed,
              confidence: eta.confidence,
            };
            console.log(`[ETA] Stop ${stop.tenDiem}:`, etaData);
          } catch (etaError) {
            console.warn(
              "[ETA] Calculation failed (non-fatal):",
              etaError.message
            );
          }

          const eventData = {
            tripId,
            trip_id: tripId, // Alias for FE compatibility
            stopId: stop.maDiem,
            stop_id: stop.maDiem, // Alias for FE compatibility
            stopSequence: stop.sequence,
            sequence: stop.sequence, // Alias for FE compatibility
            stopName: stop.tenDiem,
            stop_name: stop.tenDiem, // Alias for FE compatibility
            distance_m: Math.round(distance),
            distance: Math.round(distance), // Alias for FE compatibility
            timestamp: new Date().toISOString(),
            eta: etaData, // 📊 P1: Include ETA data
          };

          // Emit WebSocket event
          console.log(`📡 emit: approach_stop to trip-${tripId}`, eventData);
          io.to(`trip-${tripId}`).emit("approach_stop", eventData);

          // 🚏 Mark this stop as emitted for this trip
          tripEmittedStops.add(stop.maDiem);
          emittedStops.set(tripId, tripEmittedStops);

          // 📬 M5: Create notification in database for parents
          // 🔥 FIX: Chỉ gửi notification cho parents có con ở điểm dừng này
          try {
            const TrangThaiHocSinhModel = (await import("../models/TrangThaiHocSinhModel.js")).default;
            const ThongBaoModel = (await import("../models/ThongBaoModel.js")).default;
            
            // Lấy tất cả students trong trip
            const allStudents = await TrangThaiHocSinhModel.getByTripId(tripId);
            
            // Filter students có thuTuDiemDon = stop.sequence (chỉ students ở điểm dừng này)
            const studentsAtThisStop = allStudents.filter(
              (s) => s.thuTuDiemDon && parseInt(s.thuTuDiemDon) === parseInt(stop.sequence)
            );

            if (studentsAtThisStop.length === 0) {
              console.log(
                `[M5] No students at stop ${stop.tenDiem} (sequence ${stop.sequence}), skipping notification`
              );
            } else {
              // Lấy parent IDs từ students ở điểm dừng này
              const studentIds = studentsAtThisStop.map((s) => s.maHocSinh);
              const pool = (await import("../config/db.js")).default;
              const [parents] = await pool.query(
                `SELECT DISTINCT h.maPhuHuynh, h.hoTen as tenHocSinh, n.hoTen as tenPhuHuynh
                 FROM HocSinh h
                 JOIN NguoiDung n ON h.maPhuHuynh = n.maNguoiDung
                 WHERE h.maHocSinh IN (?) AND h.maPhuHuynh IS NOT NULL`,
                [studentIds]
              );

              const parentIds = parents.map((p) => p.maPhuHuynh);

              if (parentIds.length > 0) {
                const route = await TuyenDuongModel.getById(schedule.maTuyen);

                await ThongBaoModel.createMultiple({
                  danhSachNguoiNhan: parentIds,
                  tieuDe: "🚏 Xe đến gần điểm dừng",
                  noiDung: `Xe buýt tuyến ${route?.tenTuyen || "N/A"} đang đến gần ${
                    stop.tenDiem
                  } (cách ${Math.round(distance)}m). Con bạn sẽ được đón trong giây lát.`,
                  loaiThongBao: "approach_stop",
                });

                // Emit notification:new event to each parent
                for (const parentId of parentIds) {
                  io.to(`user-${parentId}`).emit("notification:new", {
                    maNguoiNhan: parentId,
                    tieuDe: "🚏 Xe đến gần điểm dừng",
                    noiDung: `Xe buýt tuyến ${
                      route?.tenTuyen || "N/A"
                    } đang đến gần ${stop.tenDiem} (cách ${Math.round(
                      distance
                    )}m). Con bạn sẽ được đón trong giây lát.`,
                    loaiThongBao: "approach_stop",
                    tripId: tripId,
                    stopId: stop.maDiem,
                    stopSequence: stop.sequence,
                    thoiGianGui: new Date().toISOString(),
                    daDoc: false,
                  });
                }

                console.log(
                  `📬 Sent approach_stop notifications to ${parentIds.length} parents for stop ${stop.tenDiem} (${studentsAtThisStop.length} students)`
                );

                // 🔥 Day 5: Send Push Notification to parents (only those with students at this stop)
                try {
                  const parentTokens = await getParentTokensForTrip(tripId, parentIds);
                  if (parentTokens.length > 0) {
                    await notifyApproachStop(parentTokens, {
                      ...eventData,
                      stopSequence: stop.sequence,
                    });
                    console.log(
                      `📲 Sent push notification to ${parentTokens.length} parent(s) for approach_stop at ${stop.tenDiem}`
                    );
                  } else {
                    console.log(`📲 No parent FCM tokens found for stop ${stop.tenDiem}`);
                  }
                } catch (notifyError) {
                  console.warn(
                    "⚠️  Failed to send push notification:",
                    notifyError.message
                  );
                  // Don't fail the entire geofence check if push notification fails
                }
              } else {
                console.log(
                  `[M5] No parents found for students at stop ${stop.tenDiem}, skipping notification`
                );
              }
            }
          } catch (notifError) {
            console.warn(
              "⚠️  Failed to create approach_stop notification:",
              notifError.message
            );
            // Don't fail the entire geofence check if notification fails
          }

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("❌ checkGeofence error:", error);
      return false;
    }
  }

  /**
   * ⏰ KIỂM TRA DELAY - Xe có bị trễ không?
   *
   * Logic đơn giản:
   * - So sánh giờ hiện tại với giờ dự kiến kết thúc
   * - Nếu quá 5 phút → Emit delay_alert
   *
   * @param {number} tripId - ID chuyến đi
   * @param {Object} currentPos - Vị trí hiện tại
   * @param {Object} io - Socket.IO instance
   * @param {Object} schedule - Lịch trình
   * @param {Object} trip - Chuyến đi
   *
   * @returns {boolean} true nếu đã emit event
   */
  static async checkDelay(tripId, currentPos, io, schedule, trip) {
    try {
      // Nếu chưa bắt đầu chuyến đi → không check delay
      if (!trip.gioBatDauThucTe) {
        console.log(`⏰ [DELAY CHECK] Trip ${tripId} - Chưa bắt đầu, skip`);
        return false;
      }

      const now = new Date();

      // Format ngày chạy về YYYY-MM-DD
      const tripDate = new Date(trip.ngayChay);
      const dateStr = tripDate.toISOString().split("T")[0]; // '2025-10-31'

      // Giờ dự kiến khởi hành (từ lịch trình)
      const plannedStartTime = new Date(`${dateStr}T${schedule.gioKhoiHanh}`);

      // Tính số phút trễ so với giờ dự kiến
      const delayMin = (now - plannedStartTime) / 1000 / 60;

      // 🔍 DEBUG LOG
      console.log(`⏰ [DELAY CHECK] Trip ${tripId}:`);
      console.log(`   - Ngày chạy (raw): ${trip.ngayChay}`);
      console.log(`   - Ngày chạy (formatted): ${dateStr}`);
      console.log(`   - Giờ khởi hành (lịch): ${schedule.gioKhoiHanh}`);
      console.log(`   - Giờ hiện tại: ${now.toISOString()}`);
      console.log(`   - Giờ dự kiến: ${plannedStartTime.toISOString()}`);
      console.log(`   - Delay: ${Math.round(delayMin)} phút`);

      // Nếu trễ > 5 phút → Emit event (gửi lại sau mỗi 3 phút)
      const delayThreshold = getDelayThresholdMin();
      if (delayMin > delayThreshold) {
        // 🚨 Kiểm tra lần gửi cuối cùng
        const lastSent = delayAlertLastSent.get(tripId);
        const now = Date.now();

        // Nếu đã gửi trong vòng 3 phút → Skip
        if (lastSent && now - lastSent < DELAY_ALERT_INTERVAL_MS) {
          const waitTime = Math.ceil(
            (DELAY_ALERT_INTERVAL_MS - (now - lastSent)) / 1000 / 60
          );
          console.log(
            `⏰ [DELAY] Skip - Đã gửi rồi, gửi lại sau ${waitTime} phút`
          );
          return false;
        }

        console.log(`⏰ Xe trễ ${Math.round(delayMin)} phút`);

        const eventData = {
          tripId,
          trip_id: tripId, // Alias for FE compatibility
          delay_min: Math.round(delayMin),
          delay_minutes: Math.round(delayMin), // Alias for FE compatibility
          delayMinutes: Math.round(delayMin), // Alias for FE compatibility (camelCase)
          stopName: schedule?.tenTuyenDuong || "tuyến hiện tại",
          timestamp: new Date().toISOString(),
        };

        // Emit WebSocket event
        io.to(`trip-${tripId}`).emit("delay_alert", eventData);

        // 🔥 Cập nhật thời gian gửi cuối
        delayAlertLastSent.set(tripId, now);
        console.log(
          `🚨 Delay alert sent for trip ${tripId} (will send again after 3 minutes)`
        );

        // 📬 M5: NO LONGER CREATE NOTIFICATION - Parents see banner via WebSocket
        // Frontend will display persistent banner that updates delay_minutes in real-time
        // Only driver receives notification every 3 minutes via WebSocket "delay_alert" event

        // 🔥 Day 5: Send Push Notification to parents
        try {
          const parentTokens = await getParentTokensForTrip(tripId);
          if (parentTokens.length > 0) {
            await notifyDelay(parentTokens, eventData);
            console.log(
              `📲 Sent push notification to ${parentTokens.length} parent(s) for delay_alert`
            );
          } else {
            console.log("📲 No parent FCM tokens found for this trip");
          }
        } catch (notifyError) {
          console.warn(
            "⚠️  Failed to send push notification:",
            notifyError.message
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ checkDelay error:", error);
      return false;
    }
  }

  /**
   * 📍 LẤY VỊ TRÍ HIỆN TẠI CỦA XE
   *
   * @param {number} busId - ID xe bus
   * @returns {Object|null} Vị trí hoặc null
   */
  static getPosition(busId) {
    return busPositions.get(`bus-${busId}`) || null;
  }

  /**
   * 🗑️ XÓA VỊ TRÍ XE (khi chuyến đi kết thúc)
   *
   * @param {number} busId - ID xe bus
   * @param {number} tripId - ID chuyến đi
   */
  static clearPosition(busId, tripId = null) {
    busPositions.delete(`bus-${busId}`);
    lastUpdateTime.delete(`bus-${busId}`);

    // Xóa delay alert cache khi trip kết thúc
    if (tripId) {
      delayAlertLastSent.delete(tripId);
      console.log(`🗑️ Cleared delay alert cache for trip ${tripId}`);

      // 📊 P1: Clear EMA tracker
      if (emaTrackers.has(tripId)) {
        emaTrackers.delete(tripId);
        console.log(`🗑️ Cleared EMA tracker for trip ${tripId}`);
      }

      // 🚏 Clear emitted stops
      if (emittedStops.has(tripId)) {
        emittedStops.delete(tripId);
        console.log(`🗑️ Cleared emitted stops for trip ${tripId}`);
      }
    }
  }

  /**
   * 📊 THỐNG KÊ CACHE
   *
   * @returns {Object} Thống kê
   */
  static getStats() {
    return {
      totalBuses: busPositions.size,
      buses: Array.from(busPositions.keys()),
    };
  }
}

export default TelemetryService;
