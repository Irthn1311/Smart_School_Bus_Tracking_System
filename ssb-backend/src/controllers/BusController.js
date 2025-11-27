import BusService from "../services/BusService.js";
import * as response from "../utils/response.js";

class BusController {
  // GET /api/v1/buses
  static async list(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        q, // search query
        status,
        sortBy = "maXe",
        sortOrder = "desc", // asc | desc
      } = req.query;

      // Normalize query params
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(pageSize) || 10));
      const search = q || req.query.search; // Support both 'q' and 'search'
      const sortDir = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

      const result = await BusService.list({
        page: pageNum,
        limit,
        search,
        status,
        sortBy,
        sortDir,
      });

      return response.ok(res, result.data, {
        page: pageNum,
        pageSize: limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        q: search || null,
      });
    } catch (err) {
      console.error("Error in BusController.list:", err);
      return response.serverError(res, "Lỗi server khi lấy danh sách xe buýt", err);
    }
  }

  // GET /api/v1/buses/:id
  static async get(req, res) {
    try {
      const { id } = req.params;
      const bus = await BusService.getById(id);

      if (!bus) {
        return response.notFound(res, "Không tìm thấy xe buýt");
      }

      return response.ok(res, bus);
    } catch (err) {
      console.error("Error in BusController.get:", err);
      return response.serverError(res, "Lỗi server khi lấy thông tin xe buýt", err);
    }
  }


  static async getStats(req, res) {
    try {
      // 1. Lấy thông tin cơ bản về xe từ Model
      // Lưu ý: Đảm bảo XeBuytModel đã được import và có hàm getStats đúng
      const XeBuytModel = (await import("../models/XeBuytModel.js")).default; 
      const busData = await XeBuytModel.getStats();

      // 2. Tính "Xe hoạt động" theo chuyến chạy trong ngày hôm nay
      // Định nghĩa: các xe có chuyến đang chạy hôm nay (chưa hoàn thành)
      // Trạng thái chuyến ví dụ: 'dang_chay','dang_don','dang_tra' (tùy hệ thống)
      const { pool } = await import("../db/pool.js");
      const [activeBusRows] = await pool.query(
        `SELECT COUNT(DISTINCT lt.maXe) AS active
         FROM ChuyenDi cd
         INNER JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
         WHERE DATE(cd.ngayChay) = CURDATE()
           AND cd.trangThai IN ('dang_chay','dang_don','dang_tra')`
      );
      const activeBuses = (activeBusRows?.[0]?.active) ?? 0;

      // Vẫn giữ thống kê bảo trì từ bảng XeBuyt để hiển thị phụ
      let maintenanceBuses = 0;
      (busData.busCounts || []).forEach(row => {
        if (row.trangThai === 'bao_tri') {
          maintenanceBuses = row.count;
        }
      });

      // 3. Lấy thông tin thống kê chuyến đi TỔNG (tạm thời)
      // Lưu ý: Đảm bảo ChuyenDiModel đã được import và có hàm getStats đúng
      const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;
      const today = new Date().toISOString().split('T')[0]; 
      const tripStatsOverall = await ChuyenDiModel.getStats(today, today); 

      // 4. Tạo response data khớp với openapi.yaml
      const responseData = {
        totalBuses: busData.totalBuses || 0, // Tổng số xe hệ thống
        activeBuses: activeBuses, // Xe đang chạy hôm nay
        maintenanceBuses: maintenanceBuses, // Xe bảo trì
        averageUtilization: 0, // Tạm thời
        totalTrips: tripStatsOverall.totalTrips || 0, 
        completedTrips: tripStatsOverall.completedTrips || 0, 
        delayedTrips: tripStatsOverall.delayedTrips || 0, 
      };
      
      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("Error in BusController.getStats:", error);
      // Sử dụng cấu trúc lỗi nhất quán (nếu có)
      res.status(500).json({
        success: false,
        // code: "INTERNAL_500", // Thêm mã lỗi nếu có
        message: "Lỗi server khi lấy thống kê xe buýt",
        error: error.message, // Chỉ trả về error.message ở môi trường dev
      });
    }
  }


    

  // POST /api/v1/buses
  static async create(req, res) {
    try {
      const { bienSoXe, dongXe, sucChua, trangThai } = req.body;

      const newBus = await BusService.create({
        bienSoXe,
        dongXe,
        sucChua,
        trangThai,
      });

      return response.created(res, newBus);
    } catch (err) {
      console.error("Error in BusController.create:", err);

      if (err.message === "PLATE_EXISTS") {
        return response.error(res, "PLATE_EXISTS", "Biển số xe đã tồn tại", 409);
      }

      if (err.message.startsWith("SEAT_COUNT_MIN_")) {
        const minSeats = err.message.split("_").pop();
        return response.validationError(res, `Số ghế phải >= ${minSeats}`, [
          { field: "sucChua", message: `Số ghế tối thiểu là ${minSeats}` }
        ]);
      }

      if (err.message === "INVALID_STATUS") {
        return response.validationError(res, "Trạng thái không hợp lệ", [
          { field: "trangThai", message: "Trạng thái phải là: hoat_dong, bao_tri, hoặc ngung_hoat_dong" }
        ]);
      }

      return response.serverError(res, "Lỗi server khi tạo xe buýt", err);
    }
  }

  // PUT /api/v1/buses/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body;

      const updatedBus = await BusService.update(id, payload);

      if (!updatedBus) {
        return response.notFound(res, "Không tìm thấy xe buýt");
      }

      return response.ok(res, updatedBus);
    } catch (err) {
      console.error("Error in BusController.update:", err);

      if (err.message === "PLATE_EXISTS") {
        return response.error(res, "PLATE_EXISTS", "Biển số xe đã tồn tại", 409);
      }

      if (err.message.startsWith("SEAT_COUNT_MIN_")) {
        const minSeats = err.message.split("_").pop();
        return response.validationError(res, `Số ghế phải >= ${minSeats}`, [
          { field: "sucChua", message: `Số ghế tối thiểu là ${minSeats}` }
        ]);
      }

      if (err.message === "INVALID_STATUS") {
        return response.validationError(res, "Trạng thái không hợp lệ", [
          { field: "trangThai", message: "Trạng thái phải là: hoat_dong, bao_tri, hoặc ngung_hoat_dong" }
        ]);
      }

      return response.serverError(res, "Lỗi server khi cập nhật xe buýt", err);
    }
  }

  // DELETE /api/v1/buses/:id
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const success = await BusService.remove(id);

      if (!success) {
        return response.notFound(res, "Không tìm thấy xe buýt");
      }

      return response.ok(res, { id: parseInt(id), deleted: true });
    } catch (err) {
      console.error("Error in BusController.delete:", err);
      return response.serverError(res, "Lỗi server khi xóa xe buýt", err);
    }
  }

  // POST /api/v1/buses/:id/assign-driver
  static async assignDriver(req, res) {
    try {
      const { id } = req.params;
      const { driverId } = req.body;

      const result = await BusService.assignDriver(id, driverId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy xe buýt hoặc tài xế",
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
        message: "Phân công tài xế thành công",
      });
    } catch (err) {
      console.error(err);

      if (err.message === "DRIVER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài xế",
        });
      }

      if (err.message === "DRIVER_NOT_AVAILABLE") {
        return res.status(400).json({
          success: false,
          message: "Tài xế không khả dụng",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  // POST /api/v1/buses/:id/position
  static async updatePosition(req, res) {
    try {
      const { id } = req.params;
      const { lat, lng, speed, heading, timestamp } = req.body;

      const result = await BusService.updatePosition(id, {
        lat,
        lng,
        speed,
        heading,
        timestamp,
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy xe buýt",
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
        message: "Cập nhật vị trí thành công",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }
}

export default BusController;
