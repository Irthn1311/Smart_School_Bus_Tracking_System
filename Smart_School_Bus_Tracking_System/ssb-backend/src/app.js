import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import routes
import authRoutes from "./routes/api/auth.js";
import busRoutes from "./routes/api/bus.js";
import driverRoutes from "./routes/api/driver.js";
import studentRoutes from "./routes/api/student.js";
import routeRoutes from "./routes/api/route.js";
import stopRoutes from "./routes/api/stop.js"; // NEW: Stops routes
import mapsRoutes from "./routes/api/maps.js"; // NEW: Maps API proxy routes
import scheduleRoutes from "./routes/api/schedule.js";
import authRouters from "./routes/api/auth.route.js";
import reportsRoutes from "./routes/api/reports.js"; // Reports routes
import notificationsRoutes from "./routes/api/notifications.js"; // Notifications routes
// Use the comprehensive trip router that includes list/detail/start/end
import tripRoutes from "./routes/api/trip.js"; // dòng này dùng để mount trip routes
import telemetryRoutes from "./routes/api/telemetry.route.js"; // GPS & Telemetry routes

// Import middlewares

const app = express();

app.use("/api/v1/reports/buses", busRoutes); // <-- Sửa prefix và giữ busRoutes
app.use("/api/v1/reports/trips", tripRoutes); // <-- Sửa prefix và giữ tripRoutes
// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouters);
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/trips", tripRoutes); // dòng này dùng để mount trip routes
app.use("/api", telemetryRoutes); // Telemetry: POST /api/trips/:id/telemetry
// Error handling middleware
// app.use(errorHandler);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Smart School Bus Tracking System API is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/buses", busRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/stops", stopRoutes); // NEW: Stops routes
app.use("/api/v1/maps", mapsRoutes); // NEW: Maps API proxy routes
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
