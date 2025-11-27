import rateLimit from "express-rate-limit";
import crypto from "crypto";

/**
 * Generate rate limit key based on IP and request body
 */
function generateKey(req) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const bodyHash = crypto
    .createHash("md5")
    .update(JSON.stringify(req.body || {}))
    .digest("hex")
    .substring(0, 8);
  return `maps:${ip}:${bodyHash}`;
}

/**
 * Rate limiter for Distance Matrix API
 * 60 requests per minute per IP+params
 */
export const distanceMatrixLimiter = rateLimit({
  windowMs: parseInt(process.env.RL_WINDOW || "60") * 1000, // 60 seconds
  max: parseInt(process.env.RL_MAX_MATRIX || "60"), // 60 requests
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many distance matrix requests, please try again later",
    },
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many distance matrix requests, please try again later",
      },
    });
  },
});

/**
 * Rate limiter for Directions API
 * 30 requests per minute per IP+params
 */
export const directionsLimiter = rateLimit({
  windowMs: parseInt(process.env.RL_WINDOW || "60") * 1000, // 60 seconds
  max: parseInt(process.env.RL_MAX_DIRECTIONS || "30"), // 30 requests
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many directions requests, please try again later",
    },
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many directions requests, please try again later",
      },
    });
  },
});

/**
 * Rate limiter for Geocode API
 * 60 requests per minute per IP+params
 */
export const geocodeLimiter = rateLimit({
  windowMs: parseInt(process.env.RL_WINDOW || "60") * 1000, // 60 seconds
  max: parseInt(process.env.RL_MAX_MATRIX || "60"), // 60 requests
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many geocode requests, please try again later",
    },
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many geocode requests, please try again later",
      },
    });
  },
});

/**
 * Rate limiter for Roads API
 * 30 requests per minute per IP+params
 */
export const roadsLimiter = rateLimit({
  windowMs: parseInt(process.env.RL_WINDOW || "60") * 1000, // 60 seconds
  max: parseInt(process.env.RL_MAX_DIRECTIONS || "30"), // 30 requests
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many roads API requests, please try again later",
    },
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many roads API requests, please try again later",
      },
    });
  },
});

