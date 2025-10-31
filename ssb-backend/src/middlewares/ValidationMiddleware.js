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
      matKhau: Joi.string().min(6).required().messages({
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
        "any.required": "Mật khẩu là bắt buộc",
      }),
      vaiTro: Joi.string().valid("quan_tri", "tai_xe", "phu_huynh").required(),
      soBangLai: Joi.string().required().when("vaiTro", {
        is: "tai_xe",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      ngayHetHanBangLai: Joi.date().min("now").when("vaiTro", {
        is: "tai_xe",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      soNamKinhNghiem: Joi.number().integer().min(0).optional(),
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
      diaChi: Joi.string().max(255).optional(),
      anhDaiDien: Joi.string().uri().optional(),
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

  // Validate route data
  static validateRoute(req, res, next) {
    const schema = Joi.object({
      tenTuyen: Joi.string().min(2).max(255).required().messages({
        "string.min": "Tên tuyến phải có ít nhất 2 ký tự",
        "string.max": "Tên tuyến không được quá 255 ký tự",
        "any.required": "Tên tuyến là bắt buộc",
      }),
      diemBatDau: Joi.string().max(255).optional(),
      diemKetThuc: Joi.string().max(255).optional(),
      thoiGianUocTinh: Joi.number().integer().min(1).optional(),
      trangThai: Joi.string().valid("hoat_dong", "ngung_hoat_dong").optional(),
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
      dangApDung: Joi.boolean().optional(),
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

  // Validate stop data
  static validateStop(req, res, next) {
    const schema = Joi.object({
      tenDiem: Joi.string().min(2).max(255).required().messages({
        "string.min": "Tên điểm dừng phải có ít nhất 2 ký tự",
        "string.max": "Tên điểm dừng không được quá 255 ký tự",
        "any.required": "Tên điểm dừng là bắt buộc",
      }),
      diaChi: Joi.string().max(255).optional(),
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
      thuTu: Joi.number().integer().min(1).required().messages({
        "number.min": "Thứ tự phải là số nguyên dương",
        "any.required": "Thứ tự là bắt buộc",
      }),
      thoiGianDungChan: Joi.number().integer().min(0).optional().messages({
        "number.min": "Thời gian dừng chân phải >= 0",
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
