// DriverController - Controller chuyên nghiệp cho quản lý tài xế
import DriverService from "../services/DriverService.js";
import TaiXeModel from "../models/TaiXeModel.js";
import NguoiDungModel from "../models/NguoiDungModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import * as response from "../utils/response.js";
import bcrypt from "bcryptjs";

class DriverController {
  // Lấy danh sách tất cả tài xế với thông tin người dùng
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        pageSize,
        limit,
        q, // search query
        status,
        sortBy = "maTaiXe",
        sortOrder = "desc",
      } = req.query;

      // Normalize query params - accept both pageSize and limit
      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageSizeValue = pageSize || limit || 10;
      const limitValue = Math.max(1, Math.min(200, parseInt(pageSizeValue) || 10));
      const search = q || req.query.search;
      const sortDir = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

      // Use service if available, otherwise fallback to model
      let result;
      if (DriverService && DriverService.list) {
        result = await DriverService.list({
          page: pageNum,
          limit: limitValue,
          search,
          status,
          sortBy,
          sortDir,
        });
      } else {
        // Fallback to direct model access
        let drivers = await TaiXeModel.getAll();
        let totalCount = drivers.length;

        if (status) {
          drivers = drivers.filter((d) => d.trangThai === status);
          totalCount = drivers.length;
        }

        if (search) {
          drivers = drivers.filter(
            (d) =>
              d.hoTen?.toLowerCase().includes(search.toLowerCase()) ||
              d.email?.toLowerCase().includes(search.toLowerCase()) ||
              d.soDienThoai?.includes(search)
          );
          totalCount = drivers.length;
        }

        const offset = (pageNum - 1) * limitValue;
        const paginatedDrivers = drivers.slice(offset, offset + limitValue);

        result = {
          data: paginatedDrivers,
          pagination: {
            page: pageNum,
            limit: limitValue,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitValue),
          },
        };
      }

      return response.ok(res, result.data, {
        page: pageNum,
        pageSize: limitValue,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        q: search || null,
      });
    } catch (error) {
      console.error("Error in DriverController.getAll:", error);
      return response.serverError(res, "Lỗi server khi lấy danh sách tài xế", error);
    }
  }

  // Lấy thông tin chi tiết một tài xế
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return response.validationError(res, "Mã tài xế là bắt buộc", [
          { field: "id", message: "Mã tài xế không được để trống" }
        ]);
      }

      const driver = await TaiXeModel.getById(id);

      if (!driver) {
        return response.notFound(res, "Không tìm thấy tài xế");
      }

      // Lấy thông tin người dùng
      const userInfo = await NguoiDungModel.getById(id);

      // Lấy lịch trình hiện tại của tài xế
      const currentSchedules = await LichTrinhModel.getByDriver(id);

      // Lấy lịch sử chuyến đi
      const tripHistory = await ChuyenDiModel.getByDriverId(id);

      return response.ok(res, {
        ...driver,
        userInfo,
        currentSchedules,
        tripHistory,
      });
    } catch (error) {
      console.error("Error in DriverController.getById:", error);
      return response.serverError(res, "Lỗi server khi lấy thông tin tài xế", error);
    }
  }

  // Tạo tài xế mới
  static async create(req, res) {
    try {
      const {
        hoTen,
        email,
        soDienThoai,
        soBangLai,
        ngayHetHanBangLai,
        soNamKinhNghiem,
        trangThai,
      } = req.body;

      // Validation dữ liệu bắt buộc
      if (!hoTen || !email || !soDienThoai || !soBangLai) {
        return res.status(400).json({
          success: false,
          message:
            "Họ tên, email, số điện thoại và số bằng lái là bắt buộc",
        });
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Email không hợp lệ",
        });
      }

      // Validation số điện thoại
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(soDienThoai)) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại phải có 10-11 chữ số",
        });
      }

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await NguoiDungModel.getByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email đã tồn tại trong hệ thống",
        });
      }

      // Kiểm tra số điện thoại đã tồn tại chưa (nếu có)
      if (soDienThoai) {
        const existingUserByPhone = await NguoiDungModel.getByPhone(soDienThoai);
        if (existingUserByPhone) {
          return res.status(409).json({
            success: false,
            message: "Số điện thoại đã tồn tại trong hệ thống",
          });
        }
      }

      // Kiểm tra số bằng lái đã tồn tại chưa
      const existingDriver = await TaiXeModel.getBySoBangLai(soBangLai);
      if (existingDriver) {
        return res.status(409).json({
          success: false,
          message: "Số bằng lái đã tồn tại trong hệ thống",
        });
      }

      // Validation ngày hết hạn bằng lái
      if (ngayHetHanBangLai) {
        const expiryDate = new Date(ngayHetHanBangLai);
        const today = new Date();
        if (expiryDate <= today) {
          return res.status(400).json({
            success: false,
            message: "Bằng lái đã hết hạn",
          });
        }
      }

      // Validation số năm kinh nghiệm
      if (soNamKinhNghiem && (soNamKinhNghiem < 0 || soNamKinhNghiem > 50)) {
        return res.status(400).json({
          success: false,
          message: "Số năm kinh nghiệm phải từ 0 đến 50 năm",
        });
      }

      // Validation ngày hết hạn bằng lái (lấy từ req.body sau khi middleware xử lý)
      const expiryDateValue = req.body.ngayHetHanBangLai || ngayHetHanBangLai || null;
      if (expiryDateValue) {
        try {
          const expiryDate = new Date(expiryDateValue);
          if (isNaN(expiryDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Ngày hết hạn bằng lái không hợp lệ",
            });
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to compare dates only
          expiryDate.setHours(0, 0, 0, 0);
          if (expiryDate <= today) {
            return res.status(400).json({
              success: false,
              message: "Bằng lái đã hết hạn hoặc không hợp lệ",
            });
          }
        } catch (dateError) {
          return res.status(400).json({
            success: false,
            message: "Ngày hết hạn bằng lái không hợp lệ",
          });
        }
      }

      // Hash password - bắt buộc khi tạo mới
      const matKhau = req.body.matKhau;
      if (!matKhau) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu là bắt buộc khi tạo tài xế mới",
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(matKhau, saltRounds);

      // Tạo người dùng trước (maNguoiDung sẽ được auto-generate)
      const userData = {
        hoTen,
        email,
        matKhau: hashedPassword,
        soDienThoai: soDienThoai || null,
        anhDaiDien: null,
        vaiTro: req.body.vaiTro || "tai_xe",
      };

      let userId;
      try {
        console.log("Creating user with data:", { ...userData, matKhau: "***" });
        userId = await NguoiDungModel.create(userData);
        console.log("User created with ID:", userId);
        if (!userId) {
          return res.status(500).json({
            success: false,
            message: "Không thể tạo tài khoản người dùng",
          });
        }
      } catch (userError) {
        console.error("Error creating user:", userError);
        console.error("User error details:", {
          message: userError.message,
          code: userError.code,
          sqlMessage: userError.sqlMessage,
          sqlState: userError.sqlState,
        });
        throw userError;
      }

      // Tạo tài xế (sử dụng userId làm maTaiXe)
      const driverData = {
        maTaiXe: userId,
        tenTaiXe: hoTen, // Trường bắt buộc trong database
        soBangLai,
        ngayHetHanBangLai: expiryDateValue || null,
        soNamKinhNghiem: soNamKinhNghiem || 0,
        trangThai: trangThai || "hoat_dong",
      };

      let driverCreated;
      try {
        console.log("Creating driver with data:", driverData);
        driverCreated = await TaiXeModel.create(driverData);
        console.log("Driver created:", driverCreated);
      } catch (driverError) {
        console.error("Error creating driver:", driverError);
        console.error("Driver error details:", {
          message: driverError.message,
          code: driverError.code,
          sqlMessage: driverError.sqlMessage,
          sqlState: driverError.sqlState,
        });
        // Rollback: xóa user đã tạo
        try {
          await NguoiDungModel.delete(userId);
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
        throw driverError;
      }

      if (!driverCreated) {
        // Nếu tạo tài xế thất bại, xóa người dùng đã tạo để rollback
        await NguoiDungModel.delete(userId);
        return res.status(500).json({
          success: false,
          message: "Không thể tạo thông tin tài xế",
        });
      }

      // Lấy thông tin tài xế vừa tạo (sử dụng userId vì maTaiXe = userId)
      const newDriver = await TaiXeModel.getById(userId);
      const userInfo = await NguoiDungModel.getById(userId);

      res.status(201).json({
        success: true,
        data: {
          ...newDriver,
          userInfo,
        },
        message: "Tạo tài xế mới thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.create:", error);
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
      
      // Nếu đã tạo user nhưng chưa tạo driver, rollback
      if (error.userId) {
        try {
          await NguoiDungModel.delete(error.userId);
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo tài xế mới",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Cập nhật thông tin tài xế
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        hoTen,
        email,
        soDienThoai,
        soBangLai,
        ngayHetHanBangLai,
        soNamKinhNghiem,
        trangThai,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã tài xế là bắt buộc",
        });
      }

      // Kiểm tra tài xế có tồn tại không
      const existingDriver = await TaiXeModel.getById(id);
      if (!existingDriver) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài xế",
        });
      }

      // Validation email nếu có thay đổi
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Email không hợp lệ",
          });
        }

        const existingUser = await NguoiDungModel.getByEmail(email);
        if (existingUser && existingUser.maNguoiDung !== id) {
          return res.status(409).json({
            success: false,
            message: "Email đã tồn tại trong hệ thống",
          });
        }
      }

      // Validation số điện thoại nếu có thay đổi
      if (soDienThoai) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(soDienThoai)) {
          return res.status(400).json({
            success: false,
            message: "Số điện thoại phải có 10-11 chữ số",
          });
        }
      }

      // Validation số bằng lái nếu có thay đổi
      if (soBangLai && soBangLai !== existingDriver.soBangLai) {
        const duplicateDriver = await TaiXeModel.getBySoBangLai(soBangLai);
        if (duplicateDriver) {
          return res.status(409).json({
            success: false,
            message: "Số bằng lái đã tồn tại trong hệ thống",
          });
        }
      }

      // Validation ngày hết hạn bằng lái
      if (ngayHetHanBangLai) {
        const expiryDate = new Date(ngayHetHanBangLai);
        const today = new Date();
        if (expiryDate <= today) {
          return res.status(400).json({
            success: false,
            message: "Bằng lái đã hết hạn",
          });
        }
      }

      // Validation số năm kinh nghiệm
      if (
        soNamKinhNghiem !== undefined &&
        (soNamKinhNghiem < 0 || soNamKinhNghiem > 50)
      ) {
        return res.status(400).json({
          success: false,
          message: "Số năm kinh nghiệm phải từ 0 đến 50 năm",
        });
      }

      // Cập nhật thông tin người dùng
      const userUpdateData = {};
      if (hoTen !== undefined) userUpdateData.hoTen = hoTen;
      if (email !== undefined) userUpdateData.email = email;
      if (soDienThoai !== undefined) userUpdateData.soDienThoai = soDienThoai;
      if (trangThai !== undefined) userUpdateData.trangThai = trangThai;

      if (Object.keys(userUpdateData).length > 0) {
        await NguoiDungModel.update(id, userUpdateData);
      }

      // Cập nhật thông tin tài xế
      const driverUpdateData = {};
      if (soBangLai !== undefined) driverUpdateData.soBangLai = soBangLai;
      if (ngayHetHanBangLai !== undefined)
        driverUpdateData.ngayHetHanBangLai = ngayHetHanBangLai;
      if (soNamKinhNghiem !== undefined)
        driverUpdateData.soNamKinhNghiem = soNamKinhNghiem;
      if (trangThai !== undefined) driverUpdateData.trangThai = trangThai;

      if (Object.keys(driverUpdateData).length > 0) {
        await TaiXeModel.update(id, driverUpdateData);
      }

      // Lấy thông tin tài xế sau khi cập nhật
      const updatedDriver = await TaiXeModel.getById(id);
      const userInfo = await NguoiDungModel.getById(id);

      res.status(200).json({
        success: true,
        data: {
          ...updatedDriver,
          userInfo,
        },
        message: "Cập nhật thông tin tài xế thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.update:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật tài xế",
        error: error.message,
      });
    }
  }

  // Xóa tài xế
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã tài xế là bắt buộc",
        });
      }

      // Kiểm tra tài xế có tồn tại không
      const existingDriver = await TaiXeModel.getById(id);
      if (!existingDriver) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài xế",
        });
      }

      // Kiểm tra tài xế có đang được sử dụng trong lịch trình không
      const schedules = await LichTrinhModel.getByDriver(id);
      if (schedules.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Không thể xóa tài xế đang được sử dụng trong lịch trình",
          data: { schedulesCount: schedules.length },
        });
      }

      // Xóa tài xế (sẽ tự động xóa người dùng do CASCADE)
      const isDeleted = await TaiXeModel.delete(id);

      if (!isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa tài xế",
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa tài xế thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa tài xế",
        error: error.message,
      });
    }
  }

  // Lấy lịch trình của tài xế
  static async getSchedules(req, res) {
    try {
      const { id } = req.params;
      const { date, status } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Mã tài xế là bắt buộc",
        });
      }

      // Kiểm tra tài xế có tồn tại không
      const driver = await TaiXeModel.getById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài xế",
        });
      }

      let schedules = await LichTrinhModel.getByDriver(id);

      // Lọc theo ngày
      if (date) {
        schedules = schedules.filter((schedule) => schedule.ngayChay === date);
      }

      // Lọc theo trạng thái
      if (status) {
        schedules = schedules.filter(
          (schedule) => schedule.trangThai === status
        );
      }

      res.status(200).json({
        success: true,
        data: schedules,
        message: "Lấy lịch trình tài xế thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.getSchedules:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy lịch trình tài xế",
        error: error.message,
      });
    }
  }

  // Lấy thống kê tài xế
  static async getStats(req, res) {
    try {
      const allDrivers = await TaiXeModel.getAll(); // getAll already joins with NguoiDung

      const stats = {
        total: allDrivers.length,
        active: allDrivers.filter((driver) => driver.trangThai === "hoat_dong")
          .length,
        inactive: allDrivers.filter(
          (driver) => driver.trangThai === "ngung_hoat_dong"
        ).length,
        averageExperience: Math.round(
          allDrivers.reduce(
            (sum, driver) => sum + (driver.soNamKinhNghiem || 0),
            0
          ) / allDrivers.length
        ),
        expiringLicenses: allDrivers.filter((driver) => {
          if (!driver.ngayHetHanBangLai) return false;
          const expiryDate = new Date(driver.ngayHetHanBangLai);
          const today = new Date();
          const daysUntilExpiry = Math.ceil(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length,
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: "Lấy thống kê tài xế thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thống kê tài xế",
        error: error.message,
      });
    }
  }

  // GET /api/v1/drivers/:id/history - Lịch sử chuyến đi
  static async getHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { from, to, trangThai, limit = 50, offset = 0 } = req.query;

      // Nếu là driver, chỉ được xem lịch sử của chính mình
      if (req.user?.role === "tai_xe" && Number(id) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xem lịch sử chuyến đi của chính mình",
        });
      }

      const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;
      const trips = await ChuyenDiModel.getByDriverId(id, {
        from,
        to,
        trangThai,
        limit: Number(limit),
        offset: Number(offset),
      });

      // Tính toán thống kê
      const totalTrips = trips.length;
      const completedTrips = trips.filter((t) => t.trangThai === "hoan_thanh").length;
      const onTimeTrips = trips.filter((t) => {
        if (t.trangThai !== "hoan_thanh" || !t.gioBatDauThucTe || !t.gioKhoiHanh) return false;
        // So sánh thời gian bắt đầu thực tế với kế hoạch
        const plannedTime = new Date(`${t.ngayChay} ${t.gioKhoiHanh}`);
        const actualTime = new Date(t.gioBatDauThucTe);
        return actualTime <= plannedTime; // Đúng giờ hoặc sớm hơn
      }).length;
      const delayedTrips = completedTrips - onTimeTrips;
      const incidents = trips.filter((t) => t.trangThai === "huy" || t.soVang > 0).length;

      res.status(200).json({
        success: true,
        data: trips,
        stats: {
          totalTrips,
          completedTrips,
          onTimeTrips,
          delayedTrips,
          incidents,
          onTimeRate: totalTrips > 0 ? Math.round((onTimeTrips / totalTrips) * 100) : 0,
        },
        pagination: {
          currentPage: Math.floor(Number(offset) / Number(limit)) + 1,
          totalPages: Math.ceil(totalTrips / Number(limit)),
          totalItems: totalTrips,
          itemsPerPage: Number(limit),
        },
        message: "Lấy lịch sử chuyến đi thành công",
      });
    } catch (error) {
      console.error("Error in DriverController.getHistory:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy lịch sử chuyến đi",
        error: error.message,
      });
    }
  }
}

export default DriverController;
