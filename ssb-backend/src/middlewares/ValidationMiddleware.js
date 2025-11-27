import Joi from "joi";

class ValidationMiddleware {
  // Validate bus data
  static validateBus(req, res, next) {
    const schema = Joi.object({
      bienSoXe: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/)
        .required()
        .messages({
          "string.pattern.base": "Biển số xe không hợp lệ (VD: 29A-12345)",
          "any.required": "Biển số xe là bắt buộc",
        }),
      dongXe: Joi.string().max(50).optional(),
      sucChua: Joi.number().integer().min(8).max(100).required().messages({
        "number.min": "Sức chứa phải từ 8 đến 100 người",
        "number.max": "Sức chứa phải từ 8 đến 100 người",
        "any.required": "Sức chứa là bắt buộc",
      }),
      trangThai: Joi.string()
        .valid("hoat_dong", "bao_tri", "ngung_hoat_dong")
        .optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate driver data
  static validateDriver(req, res, next) {
    const schema = Joi.object({
      maTaiXe: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
      hoTen: Joi.string().min(2).max(100).required().messages({
        "string.min": "Họ tên phải có ít nhất 2 ký tự",
        "string.max": "Họ tên không được quá 100 ký tự",
        "any.required": "Họ tên là bắt buộc",
      }),
      email: Joi.string().email().required().messages({
        "string.email": "Email không hợp lệ",
        "any.required": "Email là bắt buộc",
      }),
      soDienThoai: Joi.string()
        .pattern(/^[0-9]{10,11}$/)
        .optional()
        .messages({
          "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
        }),
      matKhau: Joi.string().min(6).optional().messages({
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      }),
      vaiTro: Joi.string().valid("quan_tri", "tai_xe", "phu_huynh").optional().default("tai_xe"),
      soBangLai: Joi.string().required().messages({
        "any.required": "Số bằng lái là bắt buộc",
      }),
      ngayHetHanBangLai: Joi.date().min("now").optional(),
      soNamKinhNghiem: Joi.number().integer().min(0).optional(),
      trangThai: Joi.string().valid("hoat_dong", "tam_nghi", "nghi_huu").optional(),
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Auto-set vaiTro to "tai_xe" for driver creation
    req.body.vaiTro = value.vaiTro || "tai_xe";

    // Auto-generate default password if not provided
    if (!value.matKhau) {
      // Generate a default password: email prefix + 123456
      const emailPrefix = value.email.split("@")[0];
      req.body.matKhau = `${emailPrefix}123456`;
    }

    // Set default license expiry date if not provided (2 years from now)
    if (!value.ngayHetHanBangLai) {
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 2);
      req.body.ngayHetHanBangLai = defaultExpiry.toISOString().split("T")[0];
    }

    next();
  }

  // Validate student data
  static validateStudent(req, res, next) {
    const schema = Joi.object({
      hoTen: Joi.string().min(2).max(100).required().messages({
        "string.min": "Họ tên phải có ít nhất 2 ký tự",
        "string.max": "Họ tên không được quá 100 ký tự",
        "any.required": "Họ tên là bắt buộc",
      }),
      ngaySinh: Joi.date().max("now").required().messages({
        "any.required": "Ngày sinh là bắt buộc",
        "date.base": "Ngày sinh phải là ngày hợp lệ",
        "date.max": "Ngày sinh không được là ngày trong tương lai",
      }),
      lop: Joi.string().max(50).required().messages({
        "any.required": "Lớp là bắt buộc",
        "string.max": "Lớp không được quá 50 ký tự",
      }),
      maPhuHuynh: Joi.number().integer().positive().optional(),
      diaChi: Joi.string().max(500).optional().allow("").messages({
        "string.max": "Địa chỉ không được quá 500 ký tự",
      }),
      anhDaiDien: Joi.string().uri().optional().allow(""),
      // Parent creation fields (optional, used when creating new parent)
      sdtPhuHuynh: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15).optional().allow("").messages({
        "string.pattern.base": "Số điện thoại không hợp lệ",
        "string.min": "Số điện thoại phải có ít nhất 10 ký tự",
        "string.max": "Số điện thoại không được quá 15 ký tự",
      }),
      tenPhuHuynh: Joi.string().min(2).max(100).optional().allow("").messages({
        "string.min": "Tên phụ huynh phải có ít nhất 2 ký tự",
        "string.max": "Tên phụ huynh không được quá 100 ký tự",
      }),
      emailPhuHuynh: Joi.string().email().optional().allow("").messages({
        "string.email": "Email phụ huynh không hợp lệ",
      }),
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate route data
  static validateRoute(req, res, next) {
    const schema = Joi.object({
      tenTuyen: Joi.string().min(2).max(255).required().messages({
        "string.min": "Tên tuyến phải có ít nhất 2 ký tự",
        "string.max": "Tên tuyến không được quá 255 ký tự",
        "any.required": "Tên tuyến là bắt buộc",
      }),
      diemBatDau: Joi.string().max(255).optional().allow(null, ""),
      diemKetThuc: Joi.string().max(255).optional().allow(null, ""),
      thoiGianUocTinh: Joi.number().integer().min(1).optional().allow(null),
      origin_lat: Joi.number().min(-90).max(90).optional().allow(null),
      origin_lng: Joi.number().min(-180).max(180).optional().allow(null),
      dest_lat: Joi.number().min(-90).max(90).optional().allow(null),
      dest_lng: Joi.number().min(-180).max(180).optional().allow(null),
      polyline: Joi.string().optional().allow(null, ""),
      // trangThai: boolean (true = hoạt động, false = tạm ngừng)
      // Chấp nhận boolean hoặc string "true"/"false", mặc định là true nếu không có
      trangThai: Joi.alternatives().try(
        Joi.boolean(),
        Joi.string().valid("true", "false", "1", "0"),
        Joi.number().valid(1, 0)
      ).optional(),
      routeType: Joi.string().valid('di', 've').optional(),
      createReturnRoute: Joi.boolean().optional(),
      stops: Joi.array().items(
        Joi.object({
          stop_id: Joi.number().integer().positive().allow(null).optional(),
          tenDiem: Joi.string().min(2).max(255).optional(),
          address: Joi.string().max(255).optional().allow(null, ""),
          viDo: Joi.number().min(-90).max(90).optional(),
          kinhDo: Joi.number().min(-180).max(180).optional(),
          sequence: Joi.number().integer().min(1).optional(),
        })
      ).optional(),
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    
    // Normalize trangThai: convert string/number to boolean
    if (value.trangThai !== undefined) {
      if (typeof value.trangThai === 'string') {
        value.trangThai = value.trangThai === 'true' || value.trangThai === '1';
      } else if (typeof value.trangThai === 'number') {
        value.trangThai = value.trangThai === 1;
      }
      req.body.trangThai = value.trangThai;
    }
    
    next();
  }

  // Validate schedule data
  static validateSchedule(req, res, next) {
    const schema = Joi.object({
      maTuyen: Joi.number().integer().positive().required().messages({
        "any.required": "Mã tuyến là bắt buộc",
      }),
      maXe: Joi.number().integer().positive().required().messages({
        "any.required": "Mã xe là bắt buộc",
      }),
      maTaiXe: Joi.number().integer().positive().required().messages({
        "any.required": "Mã tài xế là bắt buộc",
      }),
      loaiChuyen: Joi.string()
        .valid("don_sang", "tra_chieu")
        .required()
        .messages({
          "any.only": 'Loại chuyến phải là "don_sang" hoặc "tra_chieu"',
          "any.required": "Loại chuyến là bắt buộc",
        }),
      gioKhoiHanh: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
          "string.pattern.base": "Giờ khởi hành không hợp lệ (VD: 06:30)",
          "any.required": "Giờ khởi hành là bắt buộc",
        }),
      ngayChay: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
          "string.pattern.base": "Ngày chạy không hợp lệ (VD: 2025-10-31)",
          "any.required": "Ngày chạy là bắt buộc",
        }),
      dangApDung: Joi.boolean().optional(),
      students: Joi.array().items(
        Joi.object({
          maHocSinh: Joi.number().integer().positive().required(),
          thuTuDiem: Joi.number().integer().min(1).required(),
          maDiem: Joi.number().integer().positive().required(),
        })
      ).optional(),
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate trip data
  static validateTrip(req, res, next) {
    const schema = Joi.object({
      maLichTrinh: Joi.number().integer().positive().required().messages({
        "any.required": "Mã lịch trình là bắt buộc",
      }),
      ngayChay: Joi.date().min("now").required().messages({
        "date.min": "Ngày chạy phải từ hôm nay trở đi",
        "any.required": "Ngày chạy là bắt buộc",
      }),
      trangThai: Joi.string()
        .valid("chua_khoi_hanh", "dang_chay", "hoan_thanh", "huy")
        .optional(),
      gioBatDauThucTe: Joi.date().optional(),
      gioKetThucThucTe: Joi.date().optional(),
      ghiChu: Joi.string().max(500).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate ID parameter
  static validateId(req, res, next) {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ",
        errorCode: "INVALID_ID",
        receivedId: id,
      });
    }
    req.params.id = parseInt(id);
    next();
  }

  // Validate assign driver data
  static validateAssignDriver(req, res, next) {
    const schema = Joi.object({
      driverId: Joi.number().integer().positive().required().messages({
        "number.base": "ID tài xế phải là số",
        "number.positive": "ID tài xế phải là số dương",
        "any.required": "ID tài xế là bắt buộc",
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate position data
  static validatePosition(req, res, next) {
    const schema = Joi.object({
      lat: Joi.number().min(-90).max(90).required().messages({
        "number.min": "Vĩ độ phải từ -90 đến 90",
        "number.max": "Vĩ độ phải từ -90 đến 90",
        "any.required": "Vĩ độ là bắt buộc",
      }),
      lng: Joi.number().min(-180).max(180).required().messages({
        "number.min": "Kinh độ phải từ -180 đến 180",
        "number.max": "Kinh độ phải từ -180 đến 180",
        "any.required": "Kinh độ là bắt buộc",
      }),
      speed: Joi.number().min(0).optional(),
      heading: Joi.number().min(0).max(360).optional(),
      timestamp: Joi.date().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate stop data (DiemDung - độc lập, không có thuTu/sequence)
  static validateStop(req, res, next) {
    const schema = Joi.object({
      tenDiem: Joi.string().min(2).max(255).required().messages({
        "string.min": "Tên điểm dừng phải có ít nhất 2 ký tự",
        "string.max": "Tên điểm dừng không được quá 255 ký tự",
        "any.required": "Tên điểm dừng là bắt buộc",
      }),
      address: Joi.string().max(255).optional(),
      viDo: Joi.number().min(-90).max(90).required().messages({
        "number.min": "Vĩ độ phải từ -90 đến 90",
        "number.max": "Vĩ độ phải từ -90 đến 90",
        "any.required": "Vĩ độ là bắt buộc",
      }),
      kinhDo: Joi.number().min(-180).max(180).required().messages({
        "number.min": "Kinh độ phải từ -180 đến 180",
        "number.max": "Kinh độ phải từ -180 đến 180",
        "any.required": "Kinh độ là bắt buộc",
      }),
      scheduled_time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
          "string.pattern.base": "Giờ dự kiến không hợp lệ (VD: 06:30)",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }
    next();
  }

  // Validate route stop data (thêm stop vào route - route_stops)
  // Schema: { stop_id?, sequence?, dwell_seconds?, tenDiem?, viDo?, kinhDo?, address?, scheduled_time? }
  static validateRouteStop(req, res, next) {
    const schema = Joi.object({
      // Nếu có stop_id, dùng stop hiện có; nếu không, tạo stop mới (cần tenDiem, viDo, kinhDo)
      stop_id: Joi.number().integer().positive().optional().messages({
        "number.positive": "Mã điểm dừng phải là số nguyên dương",
      }),
      // Sequence trong route_stops (optional, auto-increment nếu không có)
      sequence: Joi.number().integer().min(1).optional().messages({
        "number.min": "Thứ tự phải là số nguyên dương",
      }),
      // Thời gian dừng tại stop (optional, default 30s)
      dwell_seconds: Joi.number().integer().min(0).optional().messages({
        "number.min": "Thời gian dừng phải >= 0",
      }),
      // Các field để tạo stop mới (nếu không có stop_id)
      tenDiem: Joi.string().min(2).max(255).optional().messages({
        "string.min": "Tên điểm dừng phải có ít nhất 2 ký tự",
        "string.max": "Tên điểm dừng không được quá 255 ký tự",
      }),
      viDo: Joi.number().min(-90).max(90).optional().messages({
        "number.min": "Vĩ độ phải từ -90 đến 90",
        "number.max": "Vĩ độ phải từ -90 đến 90",
      }),
      kinhDo: Joi.number().min(-180).max(180).optional().messages({
        "number.min": "Kinh độ phải từ -180 đến 180",
        "number.max": "Kinh độ phải từ -180 đến 180",
      }),
      address: Joi.string().max(255).optional(),
      scheduled_time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
          "string.pattern.base": "Giờ dự kiến không hợp lệ (VD: 06:30)",
        }),
    }).or("stop_id", "tenDiem").messages({
      "object.missing": "stop_id hoặc (tenDiem, viDo, kinhDo) là bắt buộc",
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Custom validation: Nếu không có stop_id, phải có tenDiem, viDo, kinhDo
    if (!req.body.stop_id) {
      if (!req.body.tenDiem || req.body.viDo === undefined || req.body.kinhDo === undefined) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: ["stop_id hoặc (tenDiem, viDo, kinhDo) là bắt buộc"],
        });
      }
    }

    next();
  }

  // Validate pagination parameters
  static validatePagination(req, res, next) {
    const { page, limit } = req.query;

    if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Số trang phải là số nguyên dương",
      });
    }

    if (
      limit &&
      (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Số lượng bản ghi phải từ 1 đến 100",
      });
    }

    next();
  }
}

export default ValidationMiddleware;
