import DiemDungModel from "../models/DiemDungModel.js";
import RouteStopModel from "../models/RouteStopModel.js";

/**
 * StopService - Business logic cho quản lý stops (điểm dừng)
 */
class StopService {
  /**
   * Lấy danh sách stops (có filter)
   */
  static async list(options = {}) {
    const { page = 1, limit = 10, search, bbox } = options;

    let stops;
    if (bbox) {
      // Filter theo bounding box
      const { minLat, maxLat, minLng, maxLng } = bbox;
      stops = await DiemDungModel.getByBoundingBox(minLat, maxLat, minLng, maxLng);
    } else {
      stops = await DiemDungModel.getAll();
    }

    // Filter theo tên nếu có
    if (search) {
      stops = stops.filter((stop) =>
        stop.tenDiem.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Phân trang
    const total = stops.length;
    const offset = (page - 1) * limit;
    const paginatedStops = stops.slice(offset, offset + parseInt(limit));

    return {
      data: paginatedStops,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy stop theo ID
   */
  static async getById(id) {
    const stop = await DiemDungModel.getById(id);
    if (!stop) throw new Error("STOP_NOT_FOUND");

    // Lấy danh sách routes chứa stop này
    const routes = await RouteStopModel.getRoutesByStopId(id);
    stop.routes = routes;

    return stop;
  }

  /**
   * Tạo stop mới
   */
  static async create(payload) {
    if (!payload.tenDiem || payload.viDo === undefined || payload.kinhDo === undefined) {
      throw new Error("MISSING_REQUIRED_FIELDS");
    }

    // Kiểm tra trùng tọa độ (tùy chọn)
    const existing = await DiemDungModel.getByCoordinates(
      payload.viDo,
      payload.kinhDo
    );
    if (existing.length > 0) {
      // Có thể cảnh báo nhưng vẫn cho phép tạo
    }

    const stopId = await DiemDungModel.create(payload);
    return await DiemDungModel.getById(stopId);
  }

  /**
   * Cập nhật stop
   */
  static async update(id, data) {
    const stop = await DiemDungModel.getById(id);
    if (!stop) throw new Error("STOP_NOT_FOUND");

    await DiemDungModel.update(id, data);
    return await DiemDungModel.getById(id);
  }

  /**
   * Xóa stop (kiểm tra xem có đang được sử dụng không)
   */
  static async delete(id) {
    const stop = await DiemDungModel.getById(id);
    if (!stop) throw new Error("STOP_NOT_FOUND");

    // Kiểm tra xem stop có đang được sử dụng trong route_stops không
    const inUse = await RouteStopModel.isStopInUse(id);
    if (inUse) {
      throw new Error("STOP_IN_USE");
    }

    await DiemDungModel.delete(id);
    return true;
  }
}

export default StopService;

