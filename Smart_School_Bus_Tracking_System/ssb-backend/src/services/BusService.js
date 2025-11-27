import XeBuytModel from "../models/XeBuytModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import socketService from "./SocketService.js";

const VALID_STATUS = ["hoat_dong", "bao_tri", "ngung_hoat_dong"];
const MIN_SEAT_COUNT = 8;

class BusService {
  /**
   * Lấy danh sách xe buýt có phân trang và tìm kiếm
   */
  static async list(options) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "maXe",
      sortDir = "DESC",
    } = options;

    let query = "SELECT * FROM XeBuyt WHERE 1=1";
    const params = [];

    // Tìm kiếm
    if (search) {
      query += " AND (bienSoXe LIKE ? OR dongXe LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Lọc theo trạng thái
    if (status) {
      query += " AND trangThai = ?";
      params.push(status);
    }

    // Sắp xếp
    const validSortDir = sortDir.toUpperCase() === "ASC" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortBy} ${validSortDir}`;

    // Phân trang
    const offset = (page - 1) * limit;
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Execute query
    const pool = (await import("../config/db.js")).default;
    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM XeBuyt WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (bienSoXe LIKE ? OR dongXe LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    if (status) {
      countQuery += " AND trangThai = ?";
      countParams.push(status);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy thông tin xe buýt theo ID
   */
  static async getById(id) {
    return await XeBuytModel.getById(id);
  }

  /**
   * Tạo xe buýt mới
   */
  static async create(data) {
    const { bienSoXe, dongXe, sucChua, trangThai } = data;

    // Validate seat count
    if (sucChua < MIN_SEAT_COUNT) {
      throw new Error(`SEAT_COUNT_MIN_${MIN_SEAT_COUNT}`);
    }

    // Validate status
    if (trangThai && !VALID_STATUS.includes(trangThai)) {
      throw new Error("INVALID_STATUS");
    }

    // Kiểm tra biển số xe đã tồn tại chưa
    const pool = (await import("../config/db.js")).default;
    const [existing] = await pool.query(
      "SELECT * FROM XeBuyt WHERE bienSoXe = ?",
      [bienSoXe]
    );

    if (existing.length > 0) {
      throw new Error("PLATE_EXISTS");
    }

    // Tạo xe mới
    const result = await XeBuytModel.create({
      bienSoXe: bienSoXe,
      dongXe: dongXe,
      sucChua: sucChua,
      trangThai: trangThai || "hoat_dong",
    });

    return await XeBuytModel.getById(result);
  }

  /**
   * Cập nhật xe buýt
   */
  static async update(id, data) {
    const { bienSoXe, dongXe, sucChua, trangThai } = data;

    // Kiểm tra xe có tồn tại không
    const existing = await XeBuytModel.getById(id);
    if (!existing) {
      return null;
    }

    // Kiểm tra biển số xe có bị trùng không (nếu có thay đổi)
    if (bienSoXe && bienSoXe !== existing.bienSoXe) {
      const pool = (await import("../config/db.js")).default;
      const [duplicate] = await pool.query(
        "SELECT * FROM XeBuyt WHERE bienSoXe = ? AND maXe != ?",
        [bienSoXe, id]
      );

      if (duplicate.length > 0) {
        throw new Error("PLATE_EXISTS");
      }
    }

    // Validate seat count nếu có
    if (sucChua && sucChua < MIN_SEAT_COUNT) {
      throw new Error(`SEAT_COUNT_MIN_${MIN_SEAT_COUNT}`);
    }

    // Validate status nếu có
    if (trangThai && !VALID_STATUS.includes(trangThai)) {
      throw new Error("INVALID_STATUS");
    }

    // Chuẩn bị dữ liệu update
    const updateData = {};
    if (bienSoXe) updateData.bienSoXe = bienSoXe;
    if (dongXe) updateData.dongXe = dongXe;
    if (sucChua) updateData.sucChua = sucChua;
    if (trangThai) updateData.trangThai = trangThai;

    // Cập nhật
    const success = await XeBuytModel.update(id, updateData);
    if (!success) {
      return null;
    }

    return await XeBuytModel.getById(id);
  }

  /**
   * Xóa xe buýt
   */
  static async remove(id) {
    // Kiểm tra xe có tồn tại không
    const existing = await XeBuytModel.getById(id);
    if (!existing) {
      return false;
    }

    // Xóa xe
    return await XeBuytModel.delete(id);
  }

  /**
   * Phân công tài xế cho xe buýt
   */
  static async assignDriver(busId, driverId) {
    // Kiểm tra xe buýt tồn tại
    const bus = await XeBuytModel.getById(busId);
    if (!bus) return null;

    // Kiểm tra tài xế tồn tại
    const driver = await TaiXeModel.getById(driverId);
    if (!driver) {
      throw new Error("DRIVER_NOT_FOUND");
    }

    // Kiểm tra tài xế có khả dụng không
    if (driver.trangThai !== "active") {
      throw new Error("DRIVER_NOT_AVAILABLE");
    }

    // Cập nhật xe buýt
    await XeBuytModel.update(busId, {
      maTaiXe: driverId,
    });

    // Lấy thông tin mới
    const updatedBus = await XeBuytModel.getById(busId);

    return {
      bus: updatedBus,
      driver: driver,
    };
  }

  /**
   * Cập nhật vị trí xe buýt (real-time tracking)
   */
  static async updatePosition(busId, positionData) {
    const { lat, lng, speed, heading, timestamp } = positionData;

    // Kiểm tra xe buýt tồn tại
    const bus = await XeBuytModel.getById(busId);
    if (!bus) return null;

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      viDo: lat,
      kinhDo: lng,
      tocDo: speed || 0,
      huongDi: heading || 0,
      thoiGianCapNhat: timestamp || new Date().toISOString(),
    };

    // Cập nhật vị trí vào database
    await XeBuytModel.updateLocation(busId, updateData);

    // Phát sự kiện real-time qua Socket.IO
    socketService.notifyBusLocationUpdate(busId, {
      busId,
      lat,
      lng,
      speed,
      heading,
      timestamp: updateData.thoiGianCapNhat,
    });

    return {
      busId,
      position: {
        lat,
        lng,
        speed,
        heading,
        timestamp: updateData.thoiGianCapNhat,
      },
    };
  }
}

export default BusService;
