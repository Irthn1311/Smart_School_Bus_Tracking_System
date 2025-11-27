/**
 * StatsController - M7: Reporting & Analytics
 * 
 * Endpoints:
 * - GET /api/stats/overview
 * - GET /api/stats/trips-by-day
 * - GET /api/stats/driver-performance
 * - GET /api/stats/bus-utilization
 * - GET /api/stats/route-punctuality
 */

import ChuyenDiModel from "../models/ChuyenDiModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import TrangThaiHocSinhModel from "../models/TrangThaiHocSinhModel.js";
import * as response from "../utils/response.js";
import pool from "../config/db.js";

class StatsController {
  /**
   * GET /api/stats/overview
   * Returns overall statistics with filters
   */
  static async overview(req, res) {
    try {
      const { from, to, routeId, driverId, busId } = req.query;
      const user = req.user;

      // Default to last 7 days if not provided
      const dateTo = to || new Date().toISOString().split("T")[0];
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // RBAC: Driver can only see their own stats
      let effectiveDriverId = driverId;
      if (user.vaiTro === "tai_xe" && !driverId) {
        effectiveDriverId = user.userId;
      } else if (user.vaiTro === "tai_xe" && driverId && driverId !== user.userId) {
        return response.forbidden(res, "Bạn chỉ có thể xem thống kê của chính mình");
      }

      // Build filters
      const filters = { from: dateFrom, to: dateTo };
      if (routeId) filters.maTuyen = parseInt(routeId);
      if (effectiveDriverId) filters.maTaiXe = parseInt(effectiveDriverId);
      if (busId) filters.maXe = parseInt(busId);

      // Get trip stats
      const tripStats = await ChuyenDiModel.getStats(dateFrom, dateTo, filters);

      // Calculate delay percentiles (P50, P95)
      const delayStats = await this._calculateDelayPercentiles(dateFrom, dateTo, filters);

      // Count events (approach_stop, delay_alert) - from in-memory cache or DB if available
      // For now, we'll estimate from trip data
      const approachStopEvents = 0; // TODO: Count from TripEvents if table exists
      const delayAlerts = tripStats.delayedTrips || 0;

      // Count attendance
      const attendanceStats = await this._getAttendanceStats(dateFrom, dateTo, filters);

      // Count active drivers and buses
      const activeCounts = await this._getActiveCounts(filters);

      const data = {
        totalTrips: tripStats.totalTrips || 0,
        tripsCompleted: tripStats.completedTrips || 0,
        completionRate: tripStats.totalTrips > 0 
          ? ((tripStats.completedTrips || 0) / tripStats.totalTrips * 100).toFixed(2)
          : 0,
        avgDelayMinutes: {
          p50: delayStats.p50 || 0,
          p95: delayStats.p95 || 0,
        },
        maxDelayMinutes: delayStats.max || 0,
        approachStopEvents,
        delayAlerts,
        onboardCount: attendanceStats.onboard || 0,
        droppedCount: attendanceStats.dropped || 0,
        activeDrivers: activeCounts.drivers || 0,
        activeBuses: activeCounts.buses || 0,
      };

      return response.ok(res, data, {
        dateRange: { from: dateFrom, to: dateTo },
        filters: { routeId, driverId: effectiveDriverId, busId },
      });
    } catch (error) {
      console.error("Error in StatsController.overview:", error);
      return response.serverError(res, "Lỗi server khi lấy thống kê tổng quan", error);
    }
  }

  /**
   * GET /api/stats/trips-by-day
   * Returns daily trip statistics
   */
  static async tripsByDay(req, res) {
    try {
      const { from, to, routeId, driverId, busId } = req.query;
      const user = req.user;

      const dateTo = to || new Date().toISOString().split("T")[0];
      const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // RBAC check
      let effectiveDriverId = driverId;
      if (user.vaiTro === "tai_xe") {
        effectiveDriverId = user.userId;
      }

      const filters = {};
      if (routeId) filters.maTuyen = parseInt(routeId);
      if (effectiveDriverId) filters.maTaiXe = parseInt(effectiveDriverId);
      if (busId) filters.maXe = parseInt(busId);

      // Query trips grouped by day
      let query = `
        SELECT 
          DATE(cd.ngayChay) as date,
          COUNT(*) as planned,
          SUM(CASE WHEN cd.trangThai = 'hoan_thanh' THEN 1 ELSE 0 END) as completed,
          AVG(CASE 
            WHEN cd.gioBatDauThucTe IS NOT NULL AND lt.gioKhoiHanh IS NOT NULL THEN
              TIMESTAMPDIFF(MINUTE, 
                CONCAT(cd.ngayChay, ' ', lt.gioKhoiHanh),
                cd.gioBatDauThucTe
              )
            ELSE NULL
          END) as avgDelayMinutes
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
      `;
      const params = [dateFrom, dateTo];

      if (filters.maTuyen) {
        query += " AND lt.maTuyen = ?";
        params.push(filters.maTuyen);
      }
      if (filters.maTaiXe) {
        query += " AND lt.maTaiXe = ?";
        params.push(filters.maTaiXe);
      }
      if (filters.maXe) {
        query += " AND lt.maXe = ?";
        params.push(filters.maXe);
      }

      query += " GROUP BY DATE(cd.ngayChay) ORDER BY date ASC";

      const [rows] = await pool.query(query, params);
      const data = rows.map(row => ({
        date: row.date.toISOString().split("T")[0],
        planned: row.planned || 0,
        completed: row.completed || 0,
        avgDelayMinutes: parseFloat(row.avgDelayMinutes || 0).toFixed(2),
      }));

      return response.ok(res, data, {
        dateRange: { from: dateFrom, to: dateTo },
        filters,
      });
    } catch (error) {
      console.error("Error in StatsController.tripsByDay:", error);
      return response.serverError(res, "Lỗi server khi lấy thống kê theo ngày", error);
    }
  }

  /**
   * GET /api/stats/driver-performance
   * Returns driver performance statistics
   */
  static async driverPerformance(req, res) {
    try {
      const { from, to, routeId, busId } = req.query;
      const user = req.user;

      const dateTo = to || new Date().toISOString().split("T")[0];
      const dateFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // RBAC: Driver can only see their own stats
      let driverFilter = "";
      const params = [dateFrom, dateTo];
      if (user.vaiTro === "tai_xe") {
        driverFilter = " AND lt.maTaiXe = ?";
        params.push(user.userId);
      }

      if (routeId) {
        driverFilter += " AND lt.maTuyen = ?";
        params.push(parseInt(routeId));
      }
      if (busId) {
        driverFilter += " AND lt.maXe = ?";
        params.push(parseInt(busId));
      }

      const query = `
        SELECT 
          lt.maTaiXe as driverId,
          nd.hoTen as driverName,
          COUNT(DISTINCT cd.maChuyen) as trips,
          SUM(CASE WHEN cd.trangThai = 'hoan_thanh' THEN 1 ELSE 0 END) as completed,
          AVG(CASE 
            WHEN cd.gioBatDauThucTe IS NOT NULL AND lt.gioKhoiHanh IS NOT NULL THEN
              TIMESTAMPDIFF(MINUTE, 
                CONCAT(cd.ngayChay, ' ', lt.gioKhoiHanh),
                cd.gioBatDauThucTe
              )
            ELSE NULL
          END) as avgDelay
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        INNER JOIN NguoiDung nd ON lt.maTaiXe = nd.maNguoiDung
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
        ${driverFilter}
        GROUP BY lt.maTaiXe, nd.hoTen
        HAVING trips > 0
        ORDER BY trips DESC
      `;

      const [rows] = await pool.query(query, params);
      const data = rows.map(row => ({
        driverId: row.driverId,
        driverName: row.driverName,
        trips: row.trips || 0,
        completionRate: row.trips > 0 
          ? ((row.completed || 0) / row.trips * 100).toFixed(2)
          : 0,
        avgDelay: parseFloat(row.avgDelay || 0).toFixed(2),
        complaints: 0, // TODO: Count from SuCo if available
      }));

      return response.ok(res, data, {
        dateRange: { from: dateFrom, to: dateTo },
        filters: { routeId, busId },
      });
    } catch (error) {
      console.error("Error in StatsController.driverPerformance:", error);
      return response.serverError(res, "Lỗi server khi lấy thống kê tài xế", error);
    }
  }

  /**
   * GET /api/stats/bus-utilization
   * Returns bus utilization statistics
   */
  static async busUtilization(req, res) {
    try {
      const { from, to, routeId, driverId } = req.query;
      const user = req.user;

      const dateTo = to || new Date().toISOString().split("T")[0];
      const dateFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let filterClause = "";
      const params = [dateFrom, dateTo];
      if (routeId) {
        filterClause += " AND lt.maTuyen = ?";
        params.push(parseInt(routeId));
      }
      if (driverId) {
        filterClause += " AND lt.maTaiXe = ?";
        params.push(parseInt(driverId));
      }

      const query = `
        SELECT 
          lt.maXe as busId,
          xb.bienSoXe as plateNumber,
          COUNT(DISTINCT cd.maChuyen) as trips,
          NULL as kmTotal,
          NULL as avgSpeed
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        INNER JOIN XeBuyt xb ON lt.maXe = xb.maXe
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
        ${filterClause}
        GROUP BY lt.maXe, xb.bienSoXe
        HAVING trips > 0
        ORDER BY trips DESC
      `;

      const [rows] = await pool.query(query, params);
      const data = rows.map(row => ({
        busId: row.busId,
        plateNumber: row.plateNumber,
        trips: row.trips || 0,
        kmTotal: row.kmTotal || null,
        avgSpeed: row.avgSpeed || null,
      }));

      return response.ok(res, data, {
        dateRange: { from: dateFrom, to: dateTo },
        filters: { routeId, driverId },
      });
    } catch (error) {
      console.error("Error in StatsController.busUtilization:", error);
      return response.serverError(res, "Lỗi server khi lấy thống kê xe buýt", error);
    }
  }

  /**
   * GET /api/stats/route-punctuality
   * Returns route punctuality statistics
   */
  static async routePunctuality(req, res) {
    try {
      const { from, to, driverId, busId } = req.query;

      const dateTo = to || new Date().toISOString().split("T")[0];
      const dateFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let filterClause = "";
      const params = [dateFrom, dateTo];
      if (driverId) {
        filterClause += " AND lt.maTaiXe = ?";
        params.push(parseInt(driverId));
      }
      if (busId) {
        filterClause += " AND lt.maXe = ?";
        params.push(parseInt(busId));
      }

      const query = `
        SELECT 
          lt.maTuyen as routeId,
          td.tenTuyen as routeName,
          COUNT(DISTINCT cd.maChuyen) as totalTrips,
          SUM(CASE 
            WHEN cd.gioBatDauThucTe IS NOT NULL AND lt.gioKhoiHanh IS NOT NULL THEN
              CASE 
                WHEN TIMESTAMPDIFF(MINUTE, 
                  CONCAT(cd.ngayChay, ' ', lt.gioKhoiHanh),
                  cd.gioBatDauThucTe
                ) <= 5 THEN 1
                ELSE 0
              END
            ELSE 0
          END) as onTimeTrips,
          AVG(CASE 
            WHEN cd.gioBatDauThucTe IS NOT NULL AND lt.gioKhoiHanh IS NOT NULL THEN
              TIMESTAMPDIFF(MINUTE, 
                CONCAT(cd.ngayChay, ' ', lt.gioKhoiHanh),
                cd.gioBatDauThucTe
              )
            ELSE NULL
          END) as avgStopDelay
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        INNER JOIN TuyenDuong td ON lt.maTuyen = td.maTuyen
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
        ${filterClause}
        GROUP BY lt.maTuyen, td.tenTuyen
        HAVING totalTrips > 0
        ORDER BY onTimeTrips DESC
      `;

      const [rows] = await pool.query(query, params);
      const data = rows.map(row => ({
        routeId: row.routeId,
        routeName: row.routeName,
        onTimeRate: row.totalTrips > 0
          ? ((row.onTimeTrips || 0) / row.totalTrips * 100).toFixed(2)
          : 0,
        avgStopDelay: parseFloat(row.avgStopDelay || 0).toFixed(2),
      }));

      return response.ok(res, data, {
        dateRange: { from: dateFrom, to: dateTo },
        filters: { driverId, busId },
      });
    } catch (error) {
      console.error("Error in StatsController.routePunctuality:", error);
      return response.serverError(res, "Lỗi server khi lấy thống kê tuyến đường", error);
    }
  }

  // Helper methods
  static async _calculateDelayPercentiles(from, to, filters = {}) {
    try {
      let query = `
        SELECT 
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(cd.ngayChay, ' ', lt.gioKhoiHanh),
            cd.gioBatDauThucTe
          ) as delayMinutes
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
          AND cd.gioBatDauThucTe IS NOT NULL
          AND lt.gioKhoiHanh IS NOT NULL
      `;
      const params = [from, to];

      if (filters.maTuyen) {
        query += " AND lt.maTuyen = ?";
        params.push(filters.maTuyen);
      }
      if (filters.maTaiXe) {
        query += " AND lt.maTaiXe = ?";
        params.push(filters.maTaiXe);
      }
      if (filters.maXe) {
        query += " AND lt.maXe = ?";
        params.push(filters.maXe);
      }

      query += " ORDER BY delayMinutes";

      const [rows] = await pool.query(query, params);
      const delays = rows.map(r => r.delayMinutes || 0).filter(d => d > 0);

      if (delays.length === 0) {
        return { p50: 0, p95: 0, max: 0 };
      }

      delays.sort((a, b) => a - b);
      const p50Index = Math.floor(delays.length * 0.5);
      const p95Index = Math.floor(delays.length * 0.95);

      return {
        p50: delays[p50Index] || 0,
        p95: delays[p95Index] || delays[delays.length - 1] || 0,
        max: delays[delays.length - 1] || 0,
      };
    } catch (error) {
      console.error("Error calculating delay percentiles:", error);
      return { p50: 0, p95: 0, max: 0 };
    }
  }

  static async _getAttendanceStats(from, to, filters = {}) {
    try {
      let query = `
        SELECT 
          SUM(CASE WHEN ts.trangThai = 'da_don' THEN 1 ELSE 0 END) as onboard,
          SUM(CASE WHEN ts.trangThai = 'da_tra' THEN 1 ELSE 0 END) as dropped
        FROM TrangThaiHocSinh ts
        INNER JOIN ChuyenDi cd ON ts.maChuyen = cd.maChuyen
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        WHERE DATE(cd.ngayChay) BETWEEN ? AND ?
      `;
      const params = [from, to];

      if (filters.maTuyen) {
        query += " AND lt.maTuyen = ?";
        params.push(filters.maTuyen);
      }
      if (filters.maTaiXe) {
        query += " AND lt.maTaiXe = ?";
        params.push(filters.maTaiXe);
      }
      if (filters.maXe) {
        query += " AND lt.maXe = ?";
        params.push(filters.maXe);
      }

      const [rows] = await pool.query(query, params);
      return {
        onboard: rows[0]?.onboard || 0,
        dropped: rows[0]?.dropped || 0,
      };
    } catch (error) {
      console.error("Error getting attendance stats:", error);
      return { onboard: 0, dropped: 0 };
    }
  }

  static async _getActiveCounts(filters = {}) {
    try {
      // Count active drivers (have trips in date range)
      let driverQuery = `
        SELECT COUNT(DISTINCT lt.maTaiXe) as drivers
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        WHERE 1=1
      `;
      const driverParams = [];

      if (filters.maTuyen) {
        driverQuery += " AND lt.maTuyen = ?";
        driverParams.push(filters.maTuyen);
      }
      if (filters.maTaiXe) {
        driverQuery += " AND lt.maTaiXe = ?";
        driverParams.push(filters.maTaiXe);
      }
      if (filters.maXe) {
        driverQuery += " AND lt.maXe = ?";
        driverParams.push(filters.maXe);
      }

      // Count active buses
      let busQuery = `
        SELECT COUNT(DISTINCT lt.maXe) as buses
        FROM ChuyenDi cd
        INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
        WHERE 1=1
      `;
      const busParams = [];

      if (filters.maTuyen) {
        busQuery += " AND lt.maTuyen = ?";
        busParams.push(filters.maTuyen);
      }
      if (filters.maTaiXe) {
        busQuery += " AND lt.maTaiXe = ?";
        busParams.push(filters.maTaiXe);
      }
      if (filters.maXe) {
        busQuery += " AND lt.maXe = ?";
        busParams.push(filters.maXe);
      }

      const [driverRows] = await pool.query(driverQuery, driverParams);
      const [busRows] = await pool.query(busQuery, busParams);

      return {
        drivers: driverRows[0]?.drivers || 0,
        buses: busRows[0]?.buses || 0,
      };
    } catch (error) {
      console.error("Error getting active counts:", error);
      return { drivers: 0, buses: 0 };
    }
  }
}

export default StatsController;

