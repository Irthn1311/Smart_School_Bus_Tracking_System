// RouteController - Controller refactored for v1.1 (normalized stops + route_stops)
import RouteService from "../services/RouteService.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import MapsService from "../services/MapsService.js";

class RouteController {
  // Lấy danh sách tất cả tuyến đường
  static async getAllRoutes(req, res) {
    try {
      const { page = 1, limit = 10, search, trangThai } = req.query;

      const result = await RouteService.list({ page, limit, search, trangThai });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: "Lấy danh sách tuyến đường thành công",
      });
    } catch (error) {
      console.error("Error in RouteController.getAllRoutes:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi lấy danh sách tuyến đường",
        },
      });
    }
  }

  // Lấy thông tin chi tiết một tuyến đường
  static async getRouteById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      const route = await RouteService.getById(id);

      // Lấy lịch trình của tuyến đường (nếu cần)
      let schedules = [];
      try {
        schedules = await LichTrinhModel.getByRouteId(id);
      } catch (scheduleError) {
        console.error("Error fetching schedules:", scheduleError);
      }

      res.status(200).json({
        success: true,
        data: {
          ...route,
          schedules: schedules || [],
        },
        message: "Lấy thông tin tuyến đường thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      console.error("Error in RouteController.getRouteById:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi lấy thông tin tuyến đường",
        },
      });
    }
  }

  // Tạo tuyến đường mới
  static async createRoute(req, res) {
    try {
      const {
        tenTuyen,
        diemBatDau,
        diemKetThuc,
        thoiGianUocTinh,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        polyline,
        trangThai,
      } = req.body;

      // Validation
      if (!tenTuyen || !diemBatDau || !diemKetThuc) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Tên tuyến, điểm bắt đầu và điểm kết thúc là bắt buộc",
          },
        });
      }

      // Kiểm tra tên tuyến đã tồn tại chưa
      const existingRoute = await TuyenDuongModel.getByName(tenTuyen);
      if (existingRoute) {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_ROUTE_NAME",
            message: "Tên tuyến đường đã tồn tại trong hệ thống",
          },
        });
      }

      const routeData = {
        tenTuyen,
        diemBatDau,
        diemKetThuc,
        thoiGianUocTinh,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        polyline,
        trangThai: trangThai !== undefined ? trangThai : true,
      };

      const newRoute = await RouteService.create(routeData);

      res.status(201).json({
        success: true,
        data: newRoute,
        message: "Tạo tuyến đường mới thành công",
      });
    } catch (error) {
      console.error("Error in RouteController.createRoute:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi tạo tuyến đường mới",
        },
      });
    }
  }

  // Cập nhật tuyến đường
  static async updateRoute(req, res) {
    try {
      const { id } = req.params;
      const {
        tenTuyen,
        diemBatDau,
        diemKetThuc,
        thoiGianUocTinh,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        polyline,
        trangThai,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      // Kiểm tra tên tuyến trùng lặp (nếu có thay đổi)
      if (tenTuyen) {
        const existingRoute = await TuyenDuongModel.getById(id);
        if (existingRoute && existingRoute.tenTuyen !== tenTuyen) {
          const duplicateRoute = await TuyenDuongModel.getByName(tenTuyen);
          if (duplicateRoute) {
            return res.status(409).json({
              success: false,
              error: {
                code: "DUPLICATE_ROUTE_NAME",
                message: "Tên tuyến đường đã tồn tại trong hệ thống",
              },
            });
          }
        }
      }

      const updateData = {};
      if (tenTuyen !== undefined) updateData.tenTuyen = tenTuyen;
      if (diemBatDau !== undefined) updateData.diemBatDau = diemBatDau;
      if (diemKetThuc !== undefined) updateData.diemKetThuc = diemKetThuc;
      if (thoiGianUocTinh !== undefined) updateData.thoiGianUocTinh = thoiGianUocTinh;
      if (origin_lat !== undefined) updateData.origin_lat = origin_lat;
      if (origin_lng !== undefined) updateData.origin_lng = origin_lng;
      if (dest_lat !== undefined) updateData.dest_lat = dest_lat;
      if (dest_lng !== undefined) updateData.dest_lng = dest_lng;
      if (polyline !== undefined) updateData.polyline = polyline;
      if (trangThai !== undefined) updateData.trangThai = trangThai;

      const updatedRoute = await RouteService.update(id, updateData);

      res.status(200).json({
        success: true,
        data: updatedRoute,
        message: "Cập nhật tuyến đường thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      console.error("Error in RouteController.updateRoute:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi cập nhật tuyến đường",
        },
      });
    }
  }

  // Xóa tuyến đường
  static async deleteRoute(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      // Kiểm tra tuyến đường có đang được sử dụng trong lịch trình không
      const schedules = await LichTrinhModel.getByRouteId(id);
      if (schedules.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: "ROUTE_IN_USE",
            message: "Không thể xóa tuyến đường đang được sử dụng trong lịch trình",
          },
          data: { schedulesCount: schedules.length },
        });
      }

      await RouteService.delete(id);

      res.status(200).json({
        success: true,
        message: "Xóa tuyến đường thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      console.error("Error in RouteController.deleteRoute:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi xóa tuyến đường",
        },
      });
    }
  }

  // Lấy danh sách điểm dừng của tuyến đường
  static async getRouteStops(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      const stops = await RouteService.getStops(id);

      res.status(200).json({
        success: true,
        data: stops,
        message: "Lấy danh sách điểm dừng thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      console.error("Error in RouteController.getRouteStops:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi lấy danh sách điểm dừng",
        },
      });
    }
  }

  // Thêm điểm dừng vào tuyến đường
  static async addStopToRoute(req, res) {
    try {
      const { id } = req.params;
      const { stop_id, sequence, dwell_seconds, tenDiem, viDo, kinhDo, address, scheduled_time } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      // Nếu không có stop_id, cần tạo stop mới (cần tenDiem, viDo, kinhDo)
      if (!stop_id) {
        if (!tenDiem || viDo === undefined || kinhDo === undefined) {
          return res.status(400).json({
            success: false,
            error: {
              code: "MISSING_REQUIRED_FIELDS",
              message: "stop_id hoặc (tenDiem, viDo, kinhDo) là bắt buộc",
            },
          });
        }
      }

      const stopData = {
        stop_id,
        sequence,
        dwell_seconds,
        tenDiem,
        viDo,
        kinhDo,
        address,
        scheduled_time,
      };

      const stops = await RouteService.addStopToRoute(id, stopData);

      res.status(201).json({
        success: true,
        data: stops,
        message: "Thêm điểm dừng vào tuyến đường thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      if (error.message === "STOP_ALREADY_IN_ROUTE") {
        return res.status(409).json({
          success: false,
          error: {
            code: "STOP_ALREADY_IN_ROUTE",
            message: "Điểm dừng đã tồn tại trong tuyến đường",
          },
        });
      }

      if (error.message === "SEQUENCE_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          error: {
            code: "SEQUENCE_ALREADY_EXISTS",
            message: "Thứ tự này đã tồn tại trong tuyến đường",
          },
        });
      }

      console.error("Error in RouteController.addStopToRoute:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi thêm điểm dừng vào tuyến đường",
        },
      });
    }
  }

  // Xóa điểm dừng khỏi tuyến đường
  static async removeStopFromRoute(req, res) {
    try {
      const { id, stopId } = req.params;

      if (!id || !stopId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường và mã điểm dừng là bắt buộc",
          },
        });
      }

      await RouteService.removeStopFromRoute(id, stopId);

      res.status(200).json({
        success: true,
        message: "Xóa điểm dừng khỏi tuyến đường thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      if (error.message === "STOP_NOT_IN_ROUTE") {
        return res.status(404).json({
          success: false,
          error: {
            code: "STOP_NOT_IN_ROUTE",
            message: "Điểm dừng không thuộc tuyến đường này",
          },
        });
      }

      console.error("Error in RouteController.removeStopFromRoute:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi xóa điểm dừng khỏi tuyến đường",
        },
      });
    }
  }

  // Sắp xếp lại thứ tự stops trong route
  static async reorderStops(req, res) {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "items (mảng {stopId, sequence}) là bắt buộc",
          },
        });
      }

      const stops = await RouteService.reorderStops(id, items);

      res.status(200).json({
        success: true,
        data: stops,
        message: "Sắp xếp lại thứ tự stops thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      if (error.message === "DUPLICATE_SEQUENCE" || error.message === "INVALID_STOP_ID") {
        return res.status(400).json({
          success: false,
          error: {
            code: error.message,
            message: "Dữ liệu không hợp lệ",
          },
        });
      }

      console.error("Error in RouteController.reorderStops:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi sắp xếp lại thứ tự stops",
        },
      });
    }
  }

  // Rebuild polyline cho route
  static async rebuildPolyline(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã tuyến đường là bắt buộc",
          },
        });
      }

      const result = await RouteService.rebuildPolyline(id, MapsService);

      res.status(200).json({
        success: true,
        data: result,
        message: "Rebuild polyline thành công",
      });
    } catch (error) {
      if (error.message === "ROUTE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Không tìm thấy tuyến đường",
          },
        });
      }

      if (error.message === "INSUFFICIENT_STOPS") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INSUFFICIENT_STOPS",
            message: "Tuyến đường cần ít nhất 2 điểm dừng để rebuild polyline",
          },
        });
      }

      if (error.message === "MAPS_API_KEY not configured" || error.message.includes("Maps API")) {
        return res.status(503).json({
          success: false,
          error: {
            code: "MAPS_API_ERROR",
            message: "Lỗi khi gọi Maps API",
          },
        });
      }

      console.error("Error in RouteController.rebuildPolyline:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi rebuild polyline",
        },
      });
    }
  }

  // Lấy thống kê tuyến đường
  static async getRouteStats(req, res) {
    try {
      const stats = await TuyenDuongModel.getStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: "Lấy thống kê tuyến đường thành công",
      });
    } catch (error) {
      console.error("Error in RouteController.getRouteStats:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi lấy thống kê tuyến đường",
        },
      });
    }
  }
}

export default RouteController;

