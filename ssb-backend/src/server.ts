import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { createServer } from "http";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { verifyWsJWT } from "./middlewares/socketAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import config from "./config/env.js";
import {
  corsMiddleware,
  corsHandler,
  securityHeaders,
  rateLimitHeaders,
} from "./middlewares/cors.js";
import {
  errorHandler,
  notFoundHandler,
  successResponse,
} from "./middlewares/error.js";
import { requestIdMiddleware, structuredLogger } from "./middlewares/logger.js";
import { API_PREFIX } from "./constants/http.js";
import authRoutes from "./routes/api/auth.js";
import busRoutes from "./routes/api/bus.js";
import tripRoutes from "./routes/api/trip.route.js";
import scheduleRoutes from "./routes/api/schedule.js";
import routeRoutes from "./routes/api/route.js";
import studentRoutes from "./routes/api/student.js";
import driverRoutes from "./routes/api/driver.js";
import incidentRoutes from "./routes/api/incidents.js";
import notificationRoutes from "./routes/api/notifications.js";
import reportsRoutes from "./routes/api/reports.js";
import mapsRoutes from "./routes/api/maps.js"; // Maps API proxy routes
import stopRoutes from "./routes/api/stop.js"; // Stops routes
import statsRoutes from "./routes/api/stats.route.js"; // M7: Stats routes
import settingsRoutes from "./routes/api/settings.route.js"; // M8: Settings routes
import busStopOptimizationRoutes from "./routes/api/bus-stop-optimization.route.js"; // Bus Stop Optimization routes
import telemetryRoutes from "./routes/api/telemetry.route.js"; // GPS & Telemetry routes

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Logging middleware (morgan) - should be first
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// M8: Structured logging
app.use(structuredLogger);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS middleware
app.use(corsMiddleware);
app.use(corsHandler);

// Security headers
app.use(securityHeaders);

// Rate limiting - DISABLED FOR DEVELOPMENT
// 🔥 Tắt rate limiting để phục vụ phát triển đồ án
// const limiter = rateLimit({
//   windowMs: config.rateLimit.windowMs,
//   max: config.rateLimit.maxRequests,
//   handler: (_req, res) => {
//     res.status(429).json({
//       success: false,
//       code: "RATE_LIMIT_EXCEEDED",
//       message: "Too many requests from this IP, please try again later.",
//     });
//   },
// });

// app.use(limiter);
app.use(rateLimitHeaders);

// Compression middleware
app.use(compression());

// Body parsing middleware (express.json) - should be before routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for images
const imagesPath = path.join(__dirname, "..", "images");
app.use("/images", express.static(imagesPath));
console.log(`[Server] Serving static images from: ${imagesPath}`);

// Health check endpoint
app.get(`${API_PREFIX}/health`, (_req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env["npm_package_version"] || "1.0.0",
    services: {
      database: "up", // TODO: Add actual database health check
      redis: "up", // TODO: Add actual Redis health check
      socketio: "up",
    },
  };

  return successResponse(res, healthData);
});

// Detailed health check endpoint
app.get(`${API_PREFIX}/health/detailed`, async (_req, res) => {
  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env["npm_package_version"] || "1.0.0",
      memory: {
        used: process.memoryUsage(),
        free: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
      services: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        socketio: "up",
      },
    };

    return successResponse(res, healthData);
  } catch (error) {
    return res.status(503).json({
      success: false,
      code: "SERVICE_UNAVAILABLE",
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Database health check
async function checkDatabaseHealth(): Promise<string> {
  try {
    // TODO: Implement actual database health check
    // const connection = await pool.getConnection();
    // await connection.ping();
    // connection.release();
    return "up";
  } catch (error) {
    return "down";
  }
}

// Redis health check
async function checkRedisHealth(): Promise<string> {
  try {
    // TODO: Implement actual Redis health check
    // await redisClient.ping();
    return "up";
  } catch (error) {
    return "down";
  }
}

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// Bus routes - CRUD operations
app.use(`${API_PREFIX}/buses`, busRoutes);

// Driver routes
app.use(`${API_PREFIX}/drivers`, driverRoutes);

// Student routes
app.use(`${API_PREFIX}/students`, studentRoutes);
app.use("/api", telemetryRoutes); // Telemetry: POST /api/trips/:id/telemetry
app.use(`${API_PREFIX}/trips`, tripRoutes);
app.use(`${API_PREFIX}/schedules`, scheduleRoutes);
app.use(`${API_PREFIX}/routes`, routeRoutes);
app.use(`${API_PREFIX}/stops`, stopRoutes); // Stops routes
app.use(`${API_PREFIX}/maps`, mapsRoutes); // Maps API proxy routes
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes); // M7: Stats routes
app.use(`${API_PREFIX}/settings`, settingsRoutes); // M8: Settings routes
app.use(`${API_PREFIX}/bus-stops`, busStopOptimizationRoutes); // Bus Stop Optimization routes

// app.use(`${API_PREFIX}/reports`, (_req, res) => {
//   res.json({
//     success: true,
//     message: 'Report routes will be implemented in Day 2',
//     data: {
//       availableEndpoints: [
//         'GET /reports/buses/stats',
//         'GET /reports/trips/stats',
//         'GET /reports/students/stats',
//       ],
//     },
//   });
// });

app.use(`${API_PREFIX}/reports/buses`, busRoutes);
app.use(`${API_PREFIX}/reports/trips`, tripRoutes);
app.use(`${API_PREFIX}/reports/schedules`, scheduleRoutes);

// API root endpoint - returns available endpoints
app.get(`${API_PREFIX}`, (_req, res) => {
  res.json({
    success: true,
    message: "SSB Backend API v1.0",
    data: {
      version: "1.0.0",
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        buses: `${API_PREFIX}/buses`,
        drivers: `${API_PREFIX}/drivers`,
        students: `${API_PREFIX}/students`,
        trips: `${API_PREFIX}/trips`,
        routes: `${API_PREFIX}/routes`,
        stops: `${API_PREFIX}/stops`,
        maps: `${API_PREFIX}/maps`,
        schedules: `${API_PREFIX}/schedules`,
        reports: `${API_PREFIX}/reports`,
        health: `${API_PREFIX}/health`,
      },
      documentation: "See docs/openapi.yaml for full API documentation",
    },
  });
});

// 404 handler for API routes - this will catch any unmatched /api/v1/* routes
// Note: Express automatically handles 404s, but this provides consistent error format
app.use(`${API_PREFIX}`, (req, res, next) => {
  // Only handle if no route was matched (this middleware runs after all route handlers)
  // Note: In Express, if a route handler calls res.send() or res.json(), this won't be reached
  // This is only reached if no route handler matched the request
  notFoundHandler(req, res);
});

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "SSB 1.0 Backend API",
    data: {
      version: "1.0.0",
      environment: config.nodeEnv,
      apiPrefix: API_PREFIX,
      healthCheck: `${API_PREFIX}/health`,
      documentation: "docs/openapi.yaml",
    },
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with new implementation (Day 3)
import { initSocketIO } from "./ws/index.js";
let io = null;
if (config.websocket?.enabled !== false) {
  io = initSocketIO(server);
  // Store Socket.IO instance in app for use in routes
  app.set("io", io);
} else {
  console.log("⚠️  WebSocket disabled (WS_ENABLED=false)");
  app.set("io", null);
}

// 🔥 Day 5: Test Firebase connection
import { testFirebaseConnection } from "./config/firebase.js";
testFirebaseConnection().then((success) => {
  if (success) {
    console.log("✅ [Firebase] Connection verified");
  } else {
    console.warn(
      "⚠️  [Firebase] Connection failed - push notifications disabled"
    );
  }
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
// Listen on 0.0.0.0 to allow access from LAN
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const networkUrl = `http://${HOST === "0.0.0.0" ? getLocalIP() : HOST}:${PORT}`;
  
  console.log(`🚀 SSB Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API Base URL (Local): ${localUrl}${API_PREFIX}`);
  console.log(`🔗 API Base URL (Network): ${networkUrl}${API_PREFIX}`);
  console.log(`❤️  Health Check (Local): ${localUrl}${API_PREFIX}/health`);
  console.log(`❤️  Health Check (Network): ${networkUrl}${API_PREFIX}/health`);
  console.log(`📡 Socket.IO (Local): ${localUrl}`);
  console.log(`📡 Socket.IO (Network): ${networkUrl}`);
  console.log(`📚 Documentation: docs/openapi.yaml`);
});

// Helper function to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (ifaces) {
      for (const iface of ifaces) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return "localhost";
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});
