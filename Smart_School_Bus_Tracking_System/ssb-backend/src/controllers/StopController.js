// StopController - Controller cho quản lý stops (điểm dừng) độc lập
import StopService from "../services/StopService.js";
import * as response from "../utils/response.js";

class StopController {
  // Lấy danh sách stops
  static async getAllStops(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        q, // search query
        minLat,
        maxLat,
        minLng,
        maxLng,
        sortBy = "maDiem",
        sortOrder = "desc",
      } = req.query;

      // Normalize query params
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(pageSize) || 10));
      const search = q || req.query.search;
      const sortDir = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

      const options = {
        page: pageNum,
        limit,
        search,
        sortBy,
        sortDir,
      };

      // Bounding box filter
      if (minLat && maxLat && minLng && maxLng) {
        options.bbox = {
          minLat: parseFloat(minLat),
          maxLat: parseFloat(maxLat),
          minLng: parseFloat(minLng),
          maxLng: parseFloat(maxLng),
        };
      }

      const result = await StopService.list(options);

      return response.ok(res, result.data, {
        page: pageNum,
        pageSize: limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        q: search || null,
      });
    } catch (error) {
      console.error("Error in StopController.getAllStops:", error);
      return response.serverError(res, "Lỗi server khi lấy danh sách điểm dừng", error);
    }
  }

  // Lấy thông tin chi tiết một stop
  static async getStopById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Mã điểm dừng là bắt buộc", [
          { field: "id", message: "Mã điểm dừng không được để trống" }
        ]);
      }

      const stop = await StopService.getById(id);

      if (!stop) {
        return response.notFound(res, "Không tìm thấy điểm dừng");
      }

      return response.ok(res, stop);
    } catch (error) {
      if (error.message === "STOP_NOT_FOUND") {
        return response.notFound(res, "Không tìm thấy điểm dừng");
      }

      console.error("Error in StopController.getStopById:", error);
      return response.serverError(res, "Lỗi server khi lấy thông tin điểm dừng", error);
    }
  }

  // Tạo stop mới
  static async createStop(req, res) {
    try {
      const { tenDiem, viDo, kinhDo, address, scheduled_time } = req.body;

      // Validation
      if (!tenDiem || viDo === undefined || kinhDo === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Tên điểm, vĩ độ và kinh độ là bắt buộc",
          },
        });
      }

      // Validation tọa độ
      if (viDo < -90 || viDo > 90) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LATITUDE",
            message: "Vĩ độ phải từ -90 đến 90",
          },
        });
      }

      if (kinhDo < -180 || kinhDo > 180) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LONGITUDE",
            message: "Kinh độ phải từ -180 đến 180",
          },
        });
      }

      const stopData = {
        tenDiem,
        viDo: parseFloat(viDo),
        kinhDo: parseFloat(kinhDo),
        address,
        scheduled_time,
      };

      const newStop = await StopService.create(stopData);

      res.status(201).json({
        success: true,
        data: newStop,
        message: "Tạo điểm dừng mới thành công",
      });
    } catch (error) {
      if (error.message === "INVALID_LATITUDE" || error.message === "INVALID_LONGITUDE") {
        return res.status(400).json({
          success: false,
          error: {
            code: error.message,
            message: "Tọa độ không hợp lệ",
          },
        });
      }

      console.error("Error in StopController.createStop:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi tạo điểm dừng mới",
        },
      });
    }
  }

  // Cập nhật stop
  static async updateStop(req, res) {
    try {
      const { id } = req.params;
      const { tenDiem, viDo, kinhDo, address, scheduled_time } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã điểm dừng là bắt buộc",
          },
        });
      }

      // Validation tọa độ nếu có
      if (viDo !== undefined && (viDo < -90 || viDo > 90)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LATITUDE",
            message: "Vĩ độ phải từ -90 đến 90",
          },
        });
      }

      if (kinhDo !== undefined && (kinhDo < -180 || kinhDo > 180)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LONGITUDE",
            message: "Kinh độ phải từ -180 đến 180",
          },
        });
      }

      const updateData = {};
      if (tenDiem !== undefined) updateData.tenDiem = tenDiem;
      if (viDo !== undefined) updateData.viDo = parseFloat(viDo);
      if (kinhDo !== undefined) updateData.kinhDo = parseFloat(kinhDo);
      if (address !== undefined) updateData.address = address;
      if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;

      const updatedStop = await StopService.update(id, updateData);

      res.status(200).json({
        success: true,
        data: updatedStop,
        message: "Cập nhật điểm dừng thành công",
      });
    } catch (error) {
      if (error.message === "STOP_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "STOP_NOT_FOUND",
            message: "Không tìm thấy điểm dừng",
          },
        });
      }

      if (error.message === "INVALID_LATITUDE" || error.message === "INVALID_LONGITUDE") {
        return res.status(400).json({
          success: false,
          error: {
            code: error.message,
            message: "Tọa độ không hợp lệ",
          },
        });
      }

      console.error("Error in StopController.updateStop:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi cập nhật điểm dừng",
        },
      });
    }
  }

  // Xóa stop
  static async deleteStop(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Mã điểm dừng là bắt buộc",
          },
        });
      }

      await StopService.delete(id);

      res.status(200).json({
        success: true,
        message: "Xóa điểm dừng thành công",
      });
    } catch (error) {
      if (error.message === "STOP_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "STOP_NOT_FOUND",
            message: "Không tìm thấy điểm dừng",
          },
        });
      }

      if (error.message === "STOP_IN_USE") {
        return res.status(409).json({
          success: false,
          error: {
            code: "STOP_IN_USE",
            message: "Không thể xóa điểm dừng đang được sử dụng trong tuyến đường",
          },
        });
      }

      console.error("Error in StopController.deleteStop:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi server khi xóa điểm dừng",
        },
      });
    }
  }
}

export default StopController;

