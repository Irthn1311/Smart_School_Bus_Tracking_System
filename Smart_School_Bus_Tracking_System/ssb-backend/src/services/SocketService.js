import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import NguoiDungModel from "../models/NguoiDungModel.js";
import XeBuytModel from "../models/XeBuytModel.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.busLocations = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log("✅ Socket.IO service initialized");
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await NguoiDungModel.getById(decoded.userId);

        if (!user || !user.trangThai) {
          return next(new Error("Invalid or inactive user"));
        }

        socket.userId = user.maNguoiDung;
        socket.userRole = user.vaiTro;
        socket.userInfo = user;

        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(
        `🔌 User connected: ${socket.userInfo.hoTen} (${socket.userRole})`
      );

      // Store user connection
      this.connectedUsers.set(socket.userId, socket);

      // Join role-based rooms
      socket.join(`role_${socket.userRole}`);
      socket.join(`user_${socket.userId}`);

      // Handle bus location updates (for drivers)
      socket.on("update_bus_location", async (data) => {
        try {
          await this.handleBusLocationUpdate(socket, data);
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      // Handle trip status updates (for drivers)
      socket.on("update_trip_status", async (data) => {
        try {
          await this.handleTripStatusUpdate(socket, data);
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      // Handle student status updates (for drivers)
      socket.on("update_student_status", async (data) => {
        try {
          await this.handleStudentStatusUpdate(socket, data);
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      // Handle join bus tracking (for parents/admins)
      socket.on("join_bus_tracking", (data) => {
        this.handleJoinBusTracking(socket, data);
      });

      // Handle leave bus tracking
      socket.on("leave_bus_tracking", (data) => {
        this.handleLeaveBusTracking(socket, data);
      });

      // Handle get bus location (for parents/admins)
      socket.on("get_bus_location", async (data) => {
        try {
          await this.handleGetBusLocation(socket, data);
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`🔌 User disconnected: ${socket.userInfo.hoTen}`);
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  async handleBusLocationUpdate(socket, data) {
    const { busId, latitude, longitude, speed, direction, timestamp } = data;

    // Validate driver has access to this bus
    if (socket.userRole !== "tai_xe") {
      throw new Error("Only drivers can update bus location");
    }

    // Validate data
    if (!busId || !latitude || !longitude) {
      throw new Error("Bus ID, latitude, and longitude are required");
    }

    // Update bus location in database
    await XeBuytModel.updateLocation(busId, {
      viDo: latitude,
      kinhDo: longitude,
      tocDo: speed,
      huongDi: direction,
      thoiGianCapNhat: timestamp || new Date().toISOString(),
    });

    // Store location in memory for quick access
    this.busLocations.set(busId, {
      latitude,
      longitude,
      speed,
      direction,
      timestamp: timestamp || new Date().toISOString(),
      driverId: socket.userId,
    });

    // Broadcast to all users tracking this bus
    this.io.to(`bus_${busId}`).emit("bus_location_update", {
      busId,
      location: {
        latitude,
        longitude,
        speed,
        direction,
        timestamp: timestamp || new Date().toISOString(),
      },
    });

    // Notify admins
    this.io.to("role_quan_tri").emit("bus_location_update", {
      busId,
      location: {
        latitude,
        longitude,
        speed,
        direction,
        timestamp: timestamp || new Date().toISOString(),
      },
    });

    socket.emit("location_update_success", {
      message: "Location updated successfully",
    });
  }

  async handleTripStatusUpdate(socket, data) {
    const { tripId, status, note, timestamp } = data;

    // Validate driver has access to this trip
    if (socket.userRole !== "tai_xe") {
      throw new Error("Only drivers can update trip status");
    }

    // Update trip status in database
    const updateData = {
      trangThai: status,
      ghiChu: note,
    };

    if (status === "dang_chay" && !data.gioBatDauThucTe) {
      updateData.gioBatDauThucTe = timestamp || new Date().toISOString();
    } else if (status === "hoan_thanh" && !data.gioKetThucThucTe) {
      updateData.gioKetThucThucTe = timestamp || new Date().toISOString();
    }

    await ChuyenDiModel.update(tripId, updateData);

    // Get trip details for broadcasting
    const trip = await ChuyenDiModel.getById(tripId);
    if (trip) {
      // Broadcast to relevant users
      this.io.to(`trip_${tripId}`).emit("trip_status_update", {
        tripId,
        status,
        note,
        timestamp: timestamp || new Date().toISOString(),
        trip,
      });

      // Notify admins
      this.io.to("role_quan_tri").emit("trip_status_update", {
        tripId,
        status,
        note,
        timestamp: timestamp || new Date().toISOString(),
        trip,
      });
    }

    socket.emit("trip_update_success", {
      message: "Trip status updated successfully",
    });
  }

  async handleStudentStatusUpdate(socket, data) {
    const { tripId, studentId, status, note, timestamp } = data;

    // Validate driver has access to this trip
    if (socket.userRole !== "tai_xe") {
      throw new Error("Only drivers can update student status");
    }

    // Update student status in database
    const TrangThaiHocSinhModel = require("../models/TrangThaiHocSinhModel.js");
    await TrangThaiHocSinhModel.update(studentId, {
      trangThai: status,
      ghiChu: note,
      thoiGianThucTe: timestamp || new Date().toISOString(),
    });

    // Broadcast to relevant users
    this.io.to(`trip_${tripId}`).emit("student_status_update", {
      tripId,
      studentId,
      status,
      note,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Notify parents
    this.io.to(`user_${studentId}`).emit("student_status_update", {
      tripId,
      studentId,
      status,
      note,
      timestamp: timestamp || new Date().toISOString(),
    });

    socket.emit("student_update_success", {
      message: "Student status updated successfully",
    });
  }

  handleJoinBusTracking(socket, data) {
    const { busId } = data;

    if (!busId) {
      socket.emit("error", { message: "Bus ID is required" });
      return;
    }

    socket.join(`bus_${busId}`);
    socket.emit("joined_bus_tracking", { busId });

    // Send current location if available
    const currentLocation = this.busLocations.get(busId);
    if (currentLocation) {
      socket.emit("bus_location_update", {
        busId,
        location: currentLocation,
      });
    }
  }

  handleLeaveBusTracking(socket, data) {
    const { busId } = data;

    if (busId) {
      socket.leave(`bus_${busId}`);
      socket.emit("left_bus_tracking", { busId });
    }
  }

  async handleGetBusLocation(socket, data) {
    const { busId } = data;

    if (!busId) {
      socket.emit("error", { message: "Bus ID is required" });
      return;
    }

    // Get location from memory first
    let location = this.busLocations.get(busId);

    // If not in memory, get from database
    if (!location) {
      const bus = await XeBuytModel.getById(busId);
      if (bus && bus.kinhDo && bus.viDo) {
        location = {
          latitude: bus.viDo,
          longitude: bus.kinhDo,
          speed: bus.tocDo,
          direction: bus.huongDi,
          timestamp: bus.thoiGianCapNhat,
        };
      }
    }

    if (location) {
      socket.emit("bus_location_response", {
        busId,
        location,
      });
    } else {
      socket.emit("error", { message: "Bus location not found" });
    }
  }

  // Public methods for external use
  notifyBusLocationUpdate(busId, location) {
    this.io.to(`bus_${busId}`).emit("bus_location_update", {
      busId,
      location,
    });
  }

  notifyTripStatusUpdate(tripId, status, trip) {
    this.io.to(`trip_${tripId}`).emit("trip_status_update", {
      tripId,
      status,
      trip,
    });
  }

  notifyStudentStatusUpdate(tripId, studentId, status) {
    this.io.to(`trip_${tripId}`).emit("student_status_update", {
      tripId,
      studentId,
      status,
    });
  }

  notifyAdmin(notification) {
    this.io.to("role_quan_tri").emit("admin_notification", notification);
  }

  notifyParent(parentId, notification) {
    this.io.to(`user_${parentId}`).emit("parent_notification", notification);
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map((socket) => ({
      userId: socket.userId,
      userRole: socket.userRole,
      userInfo: socket.userInfo,
    }));
  }

  getBusLocations() {
    return Object.fromEntries(this.busLocations);
  }
  // THÊM method này:
  notifyBusLocationUpdate(busId, data) {
    if (!this.io) {
      console.warn("Socket.IO not initialized");
      return;
    }

    // Phát tới room của bus cụ thể
    this.io.to(`bus-${busId}`).emit("bus_location_update", data);

    // Phát tới tất cả admin
    this.io.to("admin").emit("bus_location_update", data);

    console.log(`📍 Bus ${busId} location updated:`, data);
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
