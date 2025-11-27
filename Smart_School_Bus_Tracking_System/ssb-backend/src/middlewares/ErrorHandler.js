// ErrorHandler - Middleware xử lý lỗi toàn cục
class ErrorHandler {
  // Middleware xử lý lỗi chính
  static handle(err, req, res, next) {
    console.error("Error occurred:", err);

    // Lỗi validation
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: err.details || err.message,
      });
    }

    // Lỗi JWT
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token xác thực không hợp lệ",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token xác thực đã hết hạn",
      });
    }

    // Lỗi MySQL
    if (err.code) {
      switch (err.code) {
        case "ER_DUP_ENTRY":
          return res.status(409).json({
            success: false,
            message: "Dữ liệu đã tồn tại trong hệ thống",
            field: err.sqlMessage?.split("'")[1] || "unknown",
          });

        case "ER_NO_REFERENCED_ROW_2":
          return res.status(400).json({
            success: false,
            message: "Tham chiếu không tồn tại",
          });

        case "ER_ROW_IS_REFERENCED_2":
          return res.status(409).json({
            success: false,
            message: "Không thể xóa do có dữ liệu liên quan",
          });

        case "ER_BAD_FIELD_ERROR":
          return res.status(400).json({
            success: false,
            message: "Trường dữ liệu không hợp lệ",
          });

        case "ER_DATA_TOO_LONG":
          return res.status(400).json({
            success: false,
            message: "Dữ liệu quá dài",
          });

        case "ECONNREFUSED":
          return res.status(503).json({
            success: false,
            message: "Không thể kết nối đến database",
          });

        case "ER_ACCESS_DENIED_ERROR":
          return res.status(503).json({
            success: false,
            message: "Lỗi xác thực database",
          });

        default:
          console.error("Unhandled MySQL error:", err.code, err.message);
          break;
      }
    }

    // Lỗi Cast Error (MongoDB/ObjectId)
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
      });
    }

    // Lỗi Multer (file upload)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Số lượng file không đúng",
      });
    }

    // Lỗi rate limiting
    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        message: "Quá nhiều request, vui lòng thử lại sau",
        retryAfter: err.retryAfter,
      });
    }

    // Lỗi không tìm thấy route
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài nguyên",
      });
    }

    // Lỗi không có quyền truy cập
    if (err.status === 403) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    // Lỗi server nội bộ
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Lỗi server nội bộ";

    res.status(statusCode).json({
      success: false,
      message: process.env.NODE_ENV === "production" ? "Lỗi server" : message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        details: err,
      }),
    });
  }

  // Middleware xử lý route không tồn tại
  static notFound(req, res, next) {
    const error = new Error(`Không tìm thấy ${req.originalUrl}`);
    error.status = 404;
    next(error);
  }

  // Middleware xử lý lỗi async
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Middleware xử lý lỗi validation
  static validateRequest(schema, property = "body") {
    return (req, res, next) => {
      const { error } = schema.validate(req[property], { abortEarly: false });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors,
        });
      }

      next();
    };
  }

  // Middleware xử lý lỗi database connection
  static handleDatabaseError(err, req, res, next) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "Database không khả dụng",
      });
    }

    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      return res.status(503).json({
        success: false,
        message: "Lỗi xác thực database",
      });
    }

    next(err);
  }

  // Middleware xử lý lỗi timeout
  static handleTimeout(req, res, next) {
    req.setTimeout(30000, () => {
      const error = new Error("Request timeout");
      error.status = 408;
      next(error);
    });

    next();
  }

  // Middleware xử lý lỗi CORS
  static handleCorsError(err, req, res, next) {
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({
        success: false,
        message: "Không được phép truy cập từ domain này",
      });
    }

    next(err);
  }

  // Middleware xử lý lỗi Socket.IO
  static handleSocketError(socket, next) {
    socket.on("error", (err) => {
      console.error("Socket.IO error:", err);
      socket.emit("error", {
        message: "Lỗi kết nối Socket.IO",
        code: err.code || "UNKNOWN_ERROR",
      });
    });

    next();
  }

  // Utility function để tạo lỗi tùy chỉnh
  static createError(message, statusCode = 500, code = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.status = statusCode;
    if (code) error.code = code;
    return error;
  }

  // Utility function để tạo lỗi validation
  static createValidationError(message, field = null) {
    const error = new Error(message);
    error.name = "ValidationError";
    error.statusCode = 400;
    error.status = 400;
    if (field) error.field = field;
    return error;
  }

  // Utility function để tạo lỗi không tìm thấy
  static createNotFoundError(resource = "Tài nguyên") {
    const error = new Error(`${resource} không tồn tại`);
    error.statusCode = 404;
    error.status = 404;
    return error;
  }

  // Utility function để tạo lỗi không có quyền
  static createForbiddenError(message = "Không có quyền truy cập") {
    const error = new Error(message);
    error.statusCode = 403;
    error.status = 403;
    return error;
  }

  // Utility function để tạo lỗi xung đột
  static createConflictError(message = "Dữ liệu đã tồn tại") {
    const error = new Error(message);
    error.statusCode = 409;
    error.status = 409;
    return error;
  }
}

module.exports = ErrorHandler;
