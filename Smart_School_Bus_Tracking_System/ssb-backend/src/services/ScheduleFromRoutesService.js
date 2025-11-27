/**
 * Service để tự động tạo lịch trình từ tuyến đường đã tạo
 * 
 * Flow:
 * 1. Lấy danh sách tuyến đường đi (routeType = 'di')
 * 2. Với mỗi tuyến đường:
 *    - Tự động gán xe buýt và tài xế khả dụng
 *    - Tạo lịch trình đi (don_sang) và về (tra_chieu)
 *    - Đặt giờ khởi hành mặc định
 */

import LichTrinhModel from "../models/LichTrinhModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import pool from "../config/db.js";

class ScheduleFromRoutesService {
  /**
   * Tự động tạo lịch trình từ tuyến đường
   * @param {Object} options - {
   *   routeIds: Array<number> (optional, nếu không có sẽ lấy tất cả tuyến đi),
   *   defaultDepartureTime: String (default: "06:00:00"),
   *   autoAssignBus: Boolean (default: true),
   *   autoAssignDriver: Boolean (default: true),
   *   ngayChay: String (optional, format: "YYYY-MM-DD")
   * }
   * @returns {Promise<Object>} {schedules, stats}
   */
  static async createSchedulesFromRoutes(options = {}) {
    const {
      routeIds = null,
      defaultDepartureTime = "06:00:00",
      autoAssignBus = true,
      autoAssignDriver = true,
      ngayChay = null,
    } = options;

    console.log(`[ScheduleFromRoutes] Starting schedule creation from routes`);

    // Lấy danh sách tuyến đường đi
    let routes = [];
    if (routeIds && routeIds.length > 0) {
      // Lấy tuyến theo IDs
      for (const routeId of routeIds) {
        const route = await TuyenDuongModel.getById(routeId);
        if (route && route.routeType === "di") {
          routes.push(route);
        }
      }
    } else {
      // Lấy tất cả tuyến đi
      const allRoutes = await TuyenDuongModel.getAll({ routeType: "di", trangThai: true });
      routes = allRoutes;
    }

    if (routes.length === 0) {
      console.warn(`[ScheduleFromRoutes] ⚠️ No routes found`);
      return {
        schedules: [],
        stats: {
          totalSchedules: 0,
          totalRoutes: 0,
        },
      };
    }

    console.log(`[ScheduleFromRoutes] Found ${routes.length} routes to create schedules`);

    // Lấy danh sách xe buýt và tài xế khả dụng
    let availableBuses = [];
    let availableDrivers = [];

    if (autoAssignBus) {
      const buses = await XeBuytModel.getByStatus("hoat_dong");
      availableBuses = buses;
      console.log(`[ScheduleFromRoutes] Found ${availableBuses.length} available buses`);
    }

    if (autoAssignDriver) {
      const drivers = await TaiXeModel.getByStatus("hoat_dong");
      availableDrivers = drivers;
      console.log(`[ScheduleFromRoutes] Found ${availableDrivers.length} available drivers`);
    }

    const createdSchedules = [];
    const errors = [];

    // Tạo lịch trình cho từng tuyến
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      try {
        console.log(`[ScheduleFromRoutes] Creating schedule for route ${i + 1}/${routes.length}: ${route.tenTuyen}`);

        // Tự động gán xe và tài xế
        let busId = null;
        let driverId = null;

        if (autoAssignBus && availableBuses.length > 0) {
          // Gán xe theo round-robin
          busId = availableBuses[i % availableBuses.length].maXe;
        }

        if (autoAssignDriver && availableDrivers.length > 0) {
          // Gán tài xế theo round-robin
          driverId = availableDrivers[i % availableDrivers.length].maTaiXe;
        }

        if (!busId || !driverId) {
          console.warn(`[ScheduleFromRoutes] ⚠️ Cannot assign bus/driver for route ${route.maTuyen}`);
          errors.push({
            routeId: route.maTuyen,
            routeName: route.tenTuyen,
            error: "Không có xe buýt hoặc tài xế khả dụng",
          });
          continue;
        }

        // Tạo lịch trình đi (don_sang)
        const scheduleId = await LichTrinhModel.create({
          maTuyen: route.maTuyen,
          maXe: busId,
          maTaiXe: driverId,
          loaiChuyen: "don_sang",
          gioKhoiHanh: defaultDepartureTime,
          ngayChay: ngayChay || new Date().toISOString().split("T")[0],
        });

        console.log(`[ScheduleFromRoutes] ✅ Created schedule ${scheduleId} for route ${route.maTuyen} (don_sang)`);

        createdSchedules.push({
          maLichTrinh: scheduleId,
          maTuyen: route.maTuyen,
          tenTuyen: route.tenTuyen,
          loaiChuyen: "don_sang",
          maXe: busId,
          maTaiXe: driverId,
          gioKhoiHanh: defaultDepartureTime,
        });

        // Tạo lịch trình về (tra_chieu) nếu có tuyến về tương ứng
        const returnRoute = await this.findReturnRoute(route.maTuyen);
        if (returnRoute) {
          // Tính giờ khởi hành về (mặc định + 8 giờ)
          const [hours, minutes] = defaultDepartureTime.split(":").map(Number);
          const returnHours = (hours + 8) % 24;
          const returnTime = `${returnHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

          const returnScheduleId = await LichTrinhModel.create({
            maTuyen: returnRoute.maTuyen,
            maXe: busId, // Cùng xe
            maTaiXe: driverId, // Cùng tài xế
            loaiChuyen: "tra_chieu",
            gioKhoiHanh: returnTime,
            ngayChay: ngayChay || new Date().toISOString().split("T")[0],
          });

          console.log(`[ScheduleFromRoutes] ✅ Created schedule ${returnScheduleId} for route ${returnRoute.maTuyen} (tra_chieu)`);

          createdSchedules.push({
            maLichTrinh: returnScheduleId,
            maTuyen: returnRoute.maTuyen,
            tenTuyen: returnRoute.tenTuyen,
            loaiChuyen: "tra_chieu",
            maXe: busId,
            maTaiXe: driverId,
            gioKhoiHanh: returnTime,
          });
        }
      } catch (error) {
        console.error(`[ScheduleFromRoutes] Error creating schedule for route ${route.maTuyen}:`, error);
        errors.push({
          routeId: route.maTuyen,
          routeName: route.tenTuyen,
          error: error.message,
        });
      }
    }

    const stats = {
      totalSchedules: createdSchedules.length,
      totalRoutes: routes.length,
      errors: errors.length,
    };

    console.log(`[ScheduleFromRoutes] ✅ Created ${createdSchedules.length} schedules`);
    console.log(`[ScheduleFromRoutes] Stats:`, stats);

    return {
      schedules: createdSchedules,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tìm tuyến về tương ứng với tuyến đi
   */
  static async findReturnRoute(routeId) {
    const [rows] = await pool.query(
      `SELECT * FROM TuyenDuong 
       WHERE pairedRouteId = ? AND routeType = 've' AND trangThai = TRUE
       LIMIT 1`,
      [routeId]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}

export default ScheduleFromRoutesService;

