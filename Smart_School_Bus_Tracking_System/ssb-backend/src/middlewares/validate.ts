import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { errorResponse, ERROR_CODES } from './error.js';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type,
      }));

      errorResponse(
        res,
        'Validation Error',
        ERROR_CODES.VALIDATION_422,
        422,
        errors
      );
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type,
      }));

      errorResponse(
        res,
        'Query Validation Error',
        ERROR_CODES.VALIDATION_422,
        422,
        errors
      );
      return;
    }

    req.query = value;
    next();
  };
};

// Params validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type,
      }));

      errorResponse(
        res,
        'Params Validation Error',
        ERROR_CODES.VALIDATION_422,
        422,
        errors
      );
      return;
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('asc'),
    sortBy: Joi.string().default('id'),
  }),

  // ID parameter
  idParam: Joi.object({
    id: Joi.string().pattern(/^\d+$/).required(),
  }),

  // Email
  email: Joi.string().email().required(),

  // Password
  password: Joi.string().min(6).max(128).required(),

  // Phone number
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15),

  // Date
  date: Joi.date().iso(),

  // Time
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),

  // Coordinates
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }),

  // File upload
  fileUpload: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().max(5 * 1024 * 1024), // 5MB max
  }),
};

// Specific validation schemas
export const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),

  register: Joi.object({
    hoTen: Joi.string().min(2).max(100).required(),
    email: commonSchemas.email,
    password: commonSchemas.password,
    soDienThoai: commonSchemas.phone,
    vaiTro: Joi.string().valid('quan_tri', 'tai_xe', 'phu_huynh').required(),
  }),

  changePassword: Joi.object({
    currentPassword: commonSchemas.password,
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),
};

export const busSchemas = {
  create: Joi.object({
    bienSoXe: Joi.string().min(5).max(15).required(),
    dongXe: Joi.string().min(2).max(50).required(),
    sucChua: Joi.number().integer().min(1).max(100).required(),
    trangThai: Joi.string().valid('hoat_dong', 'bao_tri', 'ngung_hoat_dong').default('hoat_dong'),
  }),

  update: Joi.object({
    bienSoXe: Joi.string().min(5).max(15),
    dongXe: Joi.string().min(2).max(50),
    sucChua: Joi.number().integer().min(1).max(100),
    trangThai: Joi.string().valid('hoat_dong', 'bao_tri', 'ngung_hoat_dong'),
  }),

  position: Joi.object({
    lat: commonSchemas.coordinates.extract('lat'),
    lng: commonSchemas.coordinates.extract('lng'),
    speed: Joi.number().min(0).max(200),
    heading: Joi.number().min(0).max(360),
  }),
};

export const driverSchemas = {
  create: Joi.object({
    hoTen: Joi.string().min(2).max(100).required(),
    email: commonSchemas.email,
    soDienThoai: commonSchemas.phone,
    soBangLai: Joi.string().min(5).max(20).required(),
    ngayHetHanBangLai: commonSchemas.date,
    soNamKinhNghiem: Joi.number().integer().min(0).max(50),
    trangThai: Joi.string().valid('hoat_dong', 'tam_nghi', 'nghi_huu').default('hoat_dong'),
  }),
};

export const routeSchemas = {
  create: Joi.object({
    tenTuyen: Joi.string().min(2).max(255).required(),
    diemBatDau: Joi.string().min(2).max(255).required(),
    diemKetThuc: Joi.string().min(2).max(255).required(),
    thoiGianUocTinh: Joi.number().integer().min(1).max(480), // 8 hours max
  }),

  stop: Joi.object({
    tenDiem: Joi.string().min(2).max(255).required(),
    kinhDo: commonSchemas.coordinates.extract('lat'),
    viDo: commonSchemas.coordinates.extract('lng'),
    address: Joi.string().max(255).optional(),
    scheduled_time: commonSchemas.time.optional(),
    // thuTu removed - không còn trong DiemDung (schema ver2)
  }),
  
  // Schema cho thêm stop vào route (route_stops)
  routeStop: Joi.object({
    stop_id: Joi.number().integer().positive().optional(),
    sequence: Joi.number().integer().min(1).optional(),
    dwell_seconds: Joi.number().integer().min(0).optional(),
    // Các field để tạo stop mới (nếu không có stop_id)
    tenDiem: Joi.string().min(2).max(255).optional(),
    kinhDo: commonSchemas.coordinates.extract('lat').optional(),
    viDo: commonSchemas.coordinates.extract('lng').optional(),
    address: Joi.string().max(255).optional(),
    scheduled_time: commonSchemas.time.optional(),
  }).or('stop_id', 'tenDiem'),
};

export const scheduleSchemas = {
  create: Joi.object({
    maTuyen: Joi.number().integer().min(1).required(),
    maXe: Joi.number().integer().min(1).required(),
    maTaiXe: Joi.number().integer().min(1).required(),
    loaiChuyen: Joi.string().valid('don_sang', 'tra_chieu').required(),
    gioKhoiHanh: commonSchemas.time.required(),
    dangApDung: Joi.boolean().default(true),
  }),
};

export const tripSchemas = {
  start: Joi.object({
    gioBatDauThucTe: commonSchemas.date,
    ghiChu: Joi.string().max(500),
  }),

  end: Joi.object({
    gioKetThucThucTe: commonSchemas.date,
    ghiChu: Joi.string().max(500),
  }),

  studentStatus: Joi.object({
    trangThai: Joi.string().valid('cho_don', 'da_don', 'da_tra', 'vang').required(),
    thoiGianThucTe: commonSchemas.date,
    ghiChu: Joi.string().max(255),
  }),
};
