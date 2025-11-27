// AuthMiddleware - Middleware xác thực và phân quyền
import jwt from "jsonwebtoken";
import NguoiDungModel from "../models/NguoiDungModel.js";
import * as response from "../utils/response.js";

class AuthMiddleware {
  // Middleware xác thực JWT token (alias: verifyToken)
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.unauthorized(res, "Token xác thực không được cung cấp");
      }

      const token = authHeader.substring(7); // Bỏ "Bearer " prefix

      if (!token) {
        return response.unauthorized(res, "Token xác thực không hợp lệ");
      }

      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Kiểm tra người dùng có tồn tại và đang hoạt động không
      const user = await NguoiDungModel.getById(decoded.userId);
      
      if (!user) {
        return response.unauthorized(res, "Người dùng không tồn tại");
      }

      if (!user.trangThai) {
        return response.forbidden(res, "Tài khoản đã bị khóa hoặc ngừng hoạt động");
      }

      // Gắn thông tin người dùng vào request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        vaiTro: decoded.vaiTro,
        userInfo: user,
      };

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.authenticate:", error);

      if (error.name === "JsonWebTokenError") {
        return response.unauthorized(res, "Token xác thực không hợp lệ");
      }

      if (error.name === "TokenExpiredError") {
        return response.unauthorized(res, "Token xác thực đã hết hạn");
      }

      return response.serverError(res, "Lỗi server khi xác thực", error);
    }
  }

  // Alias for authenticate (for consistency with other middleware naming)
  static verifyToken = AuthMiddleware.authenticate;

  // Middleware kiểm tra quyền truy cập theo vai trò
  static authorize(...allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return response.unauthorized(res, "Chưa xác thực");
        }

        const userRole = req.user.vaiTro;

        if (!allowedRoles.includes(userRole)) {
          return response.forbidden(res, `Không có quyền truy cập. Yêu cầu: ${allowedRoles.join(", ")}, Hiện tại: ${userRole}`);
        }

        next();
      } catch (error) {
        console.error("Error in AuthMiddleware.authorize:", error);
        return res.status(500).json({
          success: false,
          message: "Lỗi server khi kiểm tra quyền",
          error: error.message,
        });
      }
    };
  }

  // Middleware kiểm tra quyền quản trị
  static requireAdmin(req, res, next) {
    return AuthMiddleware.authorize("quan_tri")(req, res, next);
  }

  // Middleware kiểm tra quyền tài xế
  static requireDriver(req, res, next) {
    return AuthMiddleware.authorize("quan_tri", "tai_xe")(req, res, next);
  }

  // Middleware kiểm tra quyền phụ huynh
  static requireParent(req, res, next) {
    return AuthMiddleware.authorize("quan_tri", "phu_huynh")(req, res, next);
  }

  // Middleware kiểm tra quyền truy cập tài nguyên của chính mình
  static checkOwnership(resourceIdParam = "id") {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: "Chưa xác thực",
          });
        }

        const resourceId = req.params[resourceIdParam];
        const userId = req.user.userId;

        // Quản trị viên có thể truy cập mọi tài nguyên
        if (req.user.vaiTro === "quan_tri") {
          return next();
        }

        // Kiểm tra quyền sở hữu
        if (resourceId !== userId) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập tài nguyên này",
          });
        }

        next();
      } catch (error) {
        console.error("Error in AuthMiddleware.checkOwnership:", error);
        return res.status(500).json({
          success: false,
          message: "Lỗi server khi kiểm tra quyền sở hữu",
          error: error.message,
        });
      }
    };
  }

  // Middleware kiểm tra quyền truy cập học sinh của phụ huynh
  static async checkStudentAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Chưa xác thực",
        });
      }

      // Quản trị viên có thể truy cập mọi học sinh
      if (req.user.vaiTro === "quan_tri") {
        return next();
      }

      // Phụ huynh chỉ có thể truy cập học sinh của mình
      if (req.user.vaiTro === "phu_huynh") {
        const studentId = req.params.id || req.params.studentId;

        // Kiểm tra học sinh có thuộc về phụ huynh này không
        const HocSinhModel = (await import("../models/HocSinhModel.js"))
          .default;
        const student = await HocSinhModel.getById(studentId);

        if (!student || student.maPhuHuynh !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập thông tin học sinh này",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.checkStudentAccess:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi kiểm tra quyền truy cập học sinh",
        error: error.message,
      });
    }
  }

  // Middleware kiểm tra quyền truy cập chuyến đi
  static async checkTripAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Chưa xác thực",
        });
      }

      // Quản trị viên có thể truy cập mọi chuyến đi
      if (req.user.vaiTro === "quan_tri") {
        return next();
      }

      const tripId = req.params.id || req.params.tripId;

      // Tài xế chỉ có thể truy cập chuyến đi của mình
      if (req.user.vaiTro === "tai_xe") {
        const ChuyenDiModel = (await import("../models/ChuyenDiModel.js"))
          .default;
        const LichTrinhModel = (await import("../models/LichTrinhModel.js"))
          .default;

        console.log(`🔍 [checkTripAccess] Checking trip ${tripId} for driver userId: ${req.user.userId}`);
        
        const trip = await ChuyenDiModel.getById(tripId);
        if (!trip) {
          console.log(`❌ [checkTripAccess] Trip ${tripId} not found in database`);
          return res.status(404).json({
            success: false,
            message: "Không tìm thấy chuyến đi",
          });
        }

        console.log(`✅ [checkTripAccess] Trip ${tripId} found, schedule ID: ${trip.maLichTrinh}`);
        
        // Trip có thể không có schedule (nếu được tạo thủ công)
        if (!trip.maLichTrinh) {
          console.log(`❌ [checkTripAccess] Trip ${tripId} has no schedule (maLichTrinh is null)`);
          return res.status(400).json({
            success: false,
            message: "Chuyến đi không có lịch trình",
            errorCode: "TRIP_MISSING_SCHEDULE",
            tripId: tripId,
          });
        }
        
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        if (!schedule) {
          console.log(`❌ [checkTripAccess] Schedule ${trip.maLichTrinh} not found`);
          return res.status(400).json({
            success: false,
            message: "Không tìm thấy lịch trình",
            errorCode: "SCHEDULE_NOT_FOUND",
            scheduleId: trip.maLichTrinh,
            tripId: tripId,
          });
        }
        
        console.log(`🔍 [checkTripAccess] Schedule driver ID: ${schedule.maTaiXe}, Current user ID: ${req.user.userId}`);
        
        if (schedule.maTaiXe !== req.user.userId) {
          console.log(`❌ [checkTripAccess] Access denied: driver ID mismatch`);
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập chuyến đi này",
          });
        }
        
        console.log(`✅ [checkTripAccess] Access granted for trip ${tripId}`);
      }

      // Phụ huynh có thể truy cập chuyến đi có học sinh của họ
      if (req.user.vaiTro === "phu_huynh") {
        const TrangThaiHocSinhModel = (
          await import("../models/TrangThaiHocSinhModel.js")
        ).default;
        const HocSinhModel = (await import("../models/HocSinhModel.js"))
          .default;

        // Lấy danh sách học sinh của phụ huynh
        const allStudents = await HocSinhModel.getAll();
        const children = allStudents.filter(
          (student) => student.maPhuHuynh === req.user.userId
        );
        const studentIds = children.map((child) => child.maHocSinh);

        if (studentIds.length === 0) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập chuyến đi này",
          });
        }

        // Kiểm tra có học sinh nào trong chuyến đi không
        const hasAccess = await TrangThaiHocSinhModel.hasStudentInTrip(
          tripId,
          studentIds
        );
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập chuyến đi này",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.checkTripAccess:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi kiểm tra quyền truy cập chuyến đi",
        error: error.message,
      });
    }
  }

  // Middleware kiểm tra quyền truy cập tuyến đường
  static async checkRouteAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Chưa xác thực",
        });
      }

      // Quản trị viên và tài xế có thể truy cập mọi tuyến đường
      if (["quan_tri", "tai_xe"].includes(req.user.vaiTro)) {
        return next();
      }

      // Phụ huynh có thể truy cập tuyến đường nếu con của họ được phân công vào tuyến đó
      if (req.user.vaiTro === "phu_huynh") {
        const routeId = req.params.id;
        if (!routeId) {
          return next(); // Let validation handle this
        }

        const HocSinhModel = (await import("../models/HocSinhModel.js")).default;
        const LichTrinhModel = (await import("../models/LichTrinhModel.js")).default;

        // Lấy danh sách học sinh của phụ huynh
        const children = await HocSinhModel.getByParent(req.user.userId);
        if (children.length === 0) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập tuyến đường này",
          });
        }

        // Kiểm tra xem có học sinh nào được phân công vào tuyến này không
        // Thông qua schedule hoặc trip
        const studentIds = children.map((child) => child.maHocSinh);
        
        // Kiểm tra qua schedule (hôm nay hoặc gần đây)
        const schedules = await LichTrinhModel.getByRouteId(routeId);
        const today = new Date().toISOString().slice(0, 10);
        
        // Tìm schedule có học sinh được phân công
        let hasAccess = false;
        for (const schedule of schedules) {
          // Kiểm tra nếu schedule có students được phân công
          // Hoặc kiểm tra qua trip nếu có
          if (schedule.ngayChay >= today) {
            // Nếu có schedule cho route này và ngày chạy >= hôm nay, cho phép truy cập
            // (Vì phụ huynh cần xem route của con họ)
            hasAccess = true;
            break;
          }
        }

        // Nếu không tìm thấy qua schedule, kiểm tra qua trip
        if (!hasAccess) {
          const TrangThaiHocSinhModel = (
            await import("../models/TrangThaiHocSinhModel.js")
          ).default;
          const ChuyenDiModel = (await import("../models/ChuyenDiModel.js")).default;

          // Lấy các trip gần đây của route này
          const recentTrips = await ChuyenDiModel.getAll({
            limit: 10,
          });

          for (const trip of recentTrips) {
            const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
            if (schedule && schedule.maTuyen === parseInt(routeId)) {
              // Kiểm tra xem có học sinh nào trong trip này không
              const hasStudent = await TrangThaiHocSinhModel.hasStudentInTrip(
                trip.maChuyen,
                studentIds
              );
              if (hasStudent) {
                hasAccess = true;
                break;
              }
            }
          }
        }

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập tuyến đường này",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.checkRouteAccess:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi kiểm tra quyền truy cập tuyến đường",
        error: error.message,
      });
    }
  }

  // Middleware kiểm tra quyền truy cập xe buýt
  static async checkBusAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Chưa xác thực",
        });
      }

      // Quản trị viên có thể truy cập mọi xe buýt
      if (req.user.vaiTro === "quan_tri") {
        return next();
      }

      const busId = req.params.id || req.params.busId;

      // Tài xế chỉ có thể truy cập xe buýt được phân công
      if (req.user.vaiTro === "tai_xe") {
        const LichTrinhModel = (await import("../models/LichTrinhModel.js"))
          .default;

        const schedules = await LichTrinhModel.getByDriverId(req.user.userId);
        const hasAccess = schedules.some((schedule) => schedule.maXe === busId);

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Không có quyền truy cập xe buýt này",
          });
        }
      }

      // Các vai trò khác không có quyền truy cập trực tiếp
      if (!["quan_tri", "tai_xe"].includes(req.user.vaiTro)) {
        return res.status(403).json({
          success: false,
          message: "Không có quyền truy cập thông tin xe buýt",
        });
      }

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.checkBusAccess:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi kiểm tra quyền truy cập xe buýt",
        error: error.message,
      });
    }
  }

  // Middleware xác thực tùy chọn (không bắt buộc)
  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(); // Tiếp tục mà không xác thực
      }

      const token = authHeader.substring(7);

      if (!token) {
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await NguoiDungModel.getById(decoded.userId);

        if (user && user.trangThai) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            vaiTro: decoded.vaiTro,
            userInfo: user,
          };
        }
      } catch (error) {
        // Bỏ qua lỗi xác thực và tiếp tục
      }

      next();
    } catch (error) {
      console.error("Error in AuthMiddleware.optionalAuth:", error);
      next(); // Tiếp tục ngay cả khi có lỗi
    }
  }

  // Middleware kiểm tra rate limiting
  static rateLimit(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    const requests = new Map();

    return (req, res, next) => {
      const clientId = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Làm sạch các request cũ
      if (requests.has(clientId)) {
        const clientRequests = requests.get(clientId);
        const validRequests = clientRequests.filter(
          (time) => time > windowStart
        );
        requests.set(clientId, validRequests);
      }

      // Kiểm tra số lượng request
      const clientRequests = requests.get(clientId) || [];
      if (clientRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: "Quá nhiều request, vui lòng thử lại sau",
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Thêm request hiện tại
      clientRequests.push(now);
      requests.set(clientId, clientRequests);

      next();
    };
  }
}

export default AuthMiddleware;
