/**
 * Logger Middleware - M8: Structured Logging with Request ID
 * 
 * Adds requestId to each request and logs in JSON format
 */

import config from "../config/env.js";

// Generate request ID (simple UUID v4-like)
function generateRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Structured logger
function log(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  if (config.nodeEnv === "development") {
    console.log(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Request ID middleware
export function requestIdMiddleware(req, res, next) {
  req.id = req.headers["x-request-id"] || generateRequestId();
  res.setHeader("X-Request-ID", req.id);
  next();
}

// Structured logging middleware
export function structuredLogger(req, res, next) {
  const startTime = Date.now();

  // Log request
  log("info", "Request received", {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? "error" : res.statusCode >= 300 ? "warn" : "info";

    log(level, "Request completed", {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalJson(data);
  };

  next();
}

// Event logger (for important events)
export function logEvent(eventType, payload = {}) {
  log("info", `Event: ${eventType}`, {
    eventType,
    ...payload,
  });
}

export default {
  requestIdMiddleware,
  structuredLogger,
  logEvent,
  log,
};

