import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any[];
}

interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  errors?: any[];
  timestamp: string;
  path: string;
}

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public errors?: any[];

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors || [];
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_401: 'AUTH_401',
  AUTH_403: 'AUTH_403',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  
  // Validation errors
  VALIDATION_422: 'VALIDATION_422',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Not found errors
  NOT_FOUND_404: 'NOT_FOUND_404',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Conflict errors
  CONFLICT_409: 'CONFLICT_409',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Server errors
  INTERNAL_500: 'INTERNAL_500',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Business logic errors
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
} as const;

// Error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let code = error.code || ERROR_CODES.INTERNAL_500;
  let message = error.message || 'Internal Server Error';
  let errors: any[] | undefined;

  // Handle Joi validation errors
  if (error instanceof Joi.ValidationError) {
    statusCode = 422;
    code = ERROR_CODES.VALIDATION_422;
    message = 'Validation Error';
    errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ERROR_CODES.AUTH_TOKEN_INVALID;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CODES.AUTH_TOKEN_EXPIRED;
    message = 'Token expired';
  }

  // Handle database errors
  if (error.name === 'SequelizeValidationError') {
    statusCode = 422;
    code = ERROR_CODES.VALIDATION_422;
    message = 'Database validation error';
    errors = error.errors?.map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = ERROR_CODES.DUPLICATE_RESOURCE;
    message = 'Resource already exists';
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    errors = error.errors;
  }

  // Log error in development
  if (process.env['NODE_ENV'] === 'development') {
    console.error('Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode,
      code,
    });
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    code,
    message,
    errors: errors || [],
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    code: ERROR_CODES.NOT_FOUND_404,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  res.status(404).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Success response helper
export const successResponse = (res: Response, data: any, meta?: any, statusCode: number = 200) => {
  const response: any = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

// Error response helper
export const errorResponse = (res: Response, message: string, code: string, statusCode: number = 400, errors?: any[]) => {
  const response: ErrorResponse = {
    success: false,
    code,
    message,
    errors: errors || [],
    timestamp: new Date().toISOString(),
    path: res.req.originalUrl,
  };

  return res.status(statusCode).json(response);
};
