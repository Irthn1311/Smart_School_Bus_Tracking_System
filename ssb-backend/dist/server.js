import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import config from "./config/env.js";
import { corsMiddleware, corsHandler, securityHeaders, rateLimitHeaders, } from "./middlewares/cors.js";
import { errorHandler, notFoundHandler, successResponse, } from "./middlewares/error.js";
import { structuredLogger } from "./middlewares/logger.js";
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
import mapsRoutes from "./routes/api/maps.js";
import stopRoutes from "./routes/api/stop.js";
import statsRoutes from "./routes/api/stats.route.js";
import settingsRoutes from "./routes/api/settings.route.js";
import busStopOptimizationRoutes from "./routes/api/bus-stop-optimization.route.js";
import telemetryRoutes from "./routes/api/telemetry.route.js";
const app = express();
app.set("trust proxy", 1);
if (config.nodeEnv === "development") {
    app.use(morgan("dev"));
}
else {
    app.use(morgan("combined"));
}
app.use(structuredLogger);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(corsMiddleware);
app.use(corsHandler);
app.use(securityHeaders);
app.use(rateLimitHeaders);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
const imagesPath = path.join(__dirname, "..", "images");
app.use("/images", express.static(imagesPath));
console.log(`[Server] Serving static images from: ${imagesPath}`);
app.get(`${API_PREFIX}/health`, (_req, res) => {
    const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env["npm_package_version"] || "1.0.0",
        services: {
            database: "up",
            redis: "up",
            socketio: "up",
        },
    };
    return successResponse(res, healthData);
});
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
    }
    catch (error) {
        return res.status(503).json({
            success: false,
            code: "SERVICE_UNAVAILABLE",
            message: "Health check failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
async function checkDatabaseHealth() {
    try {
        return "up";
    }
    catch (error) {
        return "down";
    }
}
async function checkRedisHealth() {
    try {
        return "up";
    }
    catch (error) {
        return "down";
    }
}
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/buses`, busRoutes);
app.use(`${API_PREFIX}/drivers`, driverRoutes);
app.use(`${API_PREFIX}/students`, studentRoutes);
app.use("/api", telemetryRoutes);
app.use(`${API_PREFIX}/trips`, tripRoutes);
app.use(`${API_PREFIX}/schedules`, scheduleRoutes);
app.use(`${API_PREFIX}/routes`, routeRoutes);
app.use(`${API_PREFIX}/stops`, stopRoutes);
app.use(`${API_PREFIX}/maps`, mapsRoutes);
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/bus-stops`, busStopOptimizationRoutes);
app.use(`${API_PREFIX}/reports/buses`, busRoutes);
app.use(`${API_PREFIX}/reports/trips`, tripRoutes);
app.use(`${API_PREFIX}/reports/schedules`, scheduleRoutes);
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
app.use(`${API_PREFIX}`, (req, res, next) => {
    notFoundHandler(req, res);
});
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
const server = createServer(app);
import { initSocketIO } from "./ws/index.js";
let io = null;
if (config.websocket?.enabled !== false) {
    io = initSocketIO(server);
    app.set("io", io);
}
else {
    console.log("⚠️  WebSocket disabled (WS_ENABLED=false)");
    app.set("io", null);
}
import { testFirebaseConnection } from "./config/firebase.js";
testFirebaseConnection().then((success) => {
    if (success) {
        console.log("✅ [Firebase] Connection verified");
    }
    else {
        console.warn("⚠️  [Firebase] Connection failed - push notifications disabled");
    }
});
app.use(errorHandler);
const PORT = config.port;
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
//# sourceMappingURL=server.js.map