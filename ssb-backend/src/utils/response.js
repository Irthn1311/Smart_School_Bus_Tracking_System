/**
 * Response Envelope Helper
 * 
 * Chuẩn hóa format response cho tất cả API endpoints
 * Đảm bảo consistency: { success, data?, meta?, message?, code?, errors? }
 */

/**
 * Success response (200 OK)
 * @param {Response} res - Express response object
 * @param {any} data - Response data
 * @param {object} meta - Optional metadata (pagination, etc.)
 * @returns {Response}
 */
export function ok(res, data = null, meta = null) {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(200).json(response);
}

/**
 * Generic success response (alias for ok, supports message)
 * @param {Response} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 * @returns {Response}
 */
export function success(res, data = null, message = null) {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message !== null) {
    response.message = message;
  }

  return res.status(200).json(response);
}

/**
 * Created response (201 Created)
 * @param {Response} res - Express response object
 * @param {any} data - Created resource data
 * @returns {Response}
 */
export function created(res, data = null) {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(201).json(response);
}

/**
 * Error response
 * @param {Response} res - Express response object
 * @param {string} code - Error code (e.g., "AUTH_INVALID_CREDENTIALS")
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} details - Optional error details (validation errors, etc.)
 * @returns {Response}
 */
export function error(res, code, message, statusCode = 400, details = null) {
  const response = {
    success: false,
    code,
    message,
  };

  if (details !== null) {
    if (Array.isArray(details)) {
      response.errors = details;
    } else if (typeof details === 'object') {
      response.details = details;
    } else {
      response.details = details;
    }
  }

  return res.status(statusCode).json(response);
}

/**
 * Not Found response (404)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @returns {Response}
 */
export function notFound(res, message = 'Resource not found') {
  return error(res, 'NOT_FOUND', message, 404);
}

/**
 * Unauthorized response (401)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @returns {Response}
 */
export function unauthorized(res, message = 'Unauthorized') {
  return error(res, 'UNAUTHORIZED', message, 401);
}

/**
 * Forbidden response (403)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @returns {Response}
 */
export function forbidden(res, message = 'Forbidden') {
  return error(res, 'FORBIDDEN', message, 403);
}

/**
 * Validation Error response (422)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Array} errors - Validation errors array
 * @returns {Response}
 */
export function validationError(res, message = 'Validation error', errors = []) {
  return error(res, 'VALIDATION_ERROR', message, 422, errors);
}

/**
 * Rate Limit Error response (429)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} retryAfter - Seconds to wait before retry
 * @returns {Response}
 */
export function rateLimitError(res, message = 'Too many requests', retryAfter = null) {
  const response = {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message,
  };

  if (retryAfter !== null) {
    response.retryAfter = retryAfter;
  }

  return res.status(429).json(response);
}

/**
 * Internal Server Error response (500)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Error} err - Optional error object (for logging)
 * @returns {Response}
 */
export function serverError(res, message = 'Internal server error', err = null) {
  if (err && process.env.NODE_ENV === 'development') {
    console.error('Server Error:', err);
  }

  return error(res, 'INTERNAL_ERROR', message, 500);
}

