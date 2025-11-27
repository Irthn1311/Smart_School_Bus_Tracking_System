import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;

    // Always tear down existing socket before creating a new one (even if not connected)
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {}
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    this.setupEventListeners();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Không thể kết nối WebSocket đến ${SOCKET_URL}. Vui lòng kiểm tra server có đang chạy không.`
          )
        );
      }, 10000);

      this.socket!.on("connect", () => {
        console.log("Connected to Socket.IO server");
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        clearTimeout(timeout);
        // Don't reject immediately, let reconnection attempts happen
        // Only reject if it's a critical error
        if (
          error.message?.includes("authentication") ||
          error.message?.includes("unauthorized")
        ) {
          reject(new Error(`Lỗi xác thực WebSocket: ${error.message}`));
        }
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }

  // Convenience helpers for rooms and telemetry
  joinTrip(tripId: number | string) {
    this.socket?.emit("join_trip", tripId);
  }
  leaveTrip(tripId: number | string) {
    this.socket?.emit("leave_trip", tripId);
  }
  // P2 Fix: Join/Leave route room for route_updated events
  joinRoute(routeId: number | string) {
    this.socket?.emit("join_route", routeId);
  }
  leaveRoute(routeId: number | string) {
    this.socket?.emit("leave_route", routeId);
  }
  sendDriverGPS(data: {
    tripId: number | string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  }) {
    this.socket?.emit("driver_gps", data);
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("Socket.IO connected");
      try {
        window.dispatchEvent(new CustomEvent("socketConnected"));
      } catch {}
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
      try {
        window.dispatchEvent(
          new CustomEvent("socketDisconnected", { detail: reason })
        );
      } catch {}
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      // Don't crash the app, just log and notify
      try {
        window.dispatchEvent(
          new CustomEvent("socketConnectError", {
            detail: {
              error,
              message: `Lỗi kết nối WebSocket: ${
                error.message || "Không thể kết nối đến server"
              }`,
              url: SOCKET_URL,
            },
          })
        );
      } catch {}
    });

    // Handle WebSocket errors gracefully
    this.socket.on("error", (error) => {
      console.error("Socket.IO error:", error);
      try {
        window.dispatchEvent(
          new CustomEvent("socketError", {
            detail: {
              error,
              message: `Lỗi WebSocket: ${error.message || "Unknown error"}`,
            },
          })
        );
      } catch {}
    });

    // Bus tracking events
    this.socket.on("joined_bus_tracking", (data) => {
      console.log("Joined bus tracking:", data);
    });

    this.socket.on("left_bus_tracking", (data) => {
      console.log("Left bus tracking:", data);
    });

    this.socket.on("bus_location_update", (data) => {
      console.log("Bus location updated:", data);
      // Emit custom event for components to listen
      window.dispatchEvent(
        new CustomEvent("busLocationUpdate", { detail: data })
      );
    });

    // Alias: server may emit snake_case 'bus_position_update'
    this.socket.on("bus_position_update", (data) => {
      console.log("Bus position updated:", data);
      window.dispatchEvent(
        new CustomEvent("busPositionUpdate", { detail: data })
      );
    });

    this.socket.on("bus_location_response", (data) => {
      console.log("Bus location response:", data);
      window.dispatchEvent(
        new CustomEvent("busLocationResponse", { detail: data })
      );
    });

    // Trip events
    this.socket.on("trip_status_update", (data) => {
      console.log("Trip status updated:", data);
      window.dispatchEvent(
        new CustomEvent("tripStatusUpdate", { detail: data })
      );
    });

    // Explicit started/completed aliases (if server emits these)
    this.socket.on("trip_started", (data) => {
      console.log("Trip started:", data);
      window.dispatchEvent(new CustomEvent("tripStarted", { detail: data }));
    });

    this.socket.on("trip_completed", (data) => {
      console.log("Trip completed:", data);
      window.dispatchEvent(new CustomEvent("tripCompleted", { detail: data }));
    });

    this.socket.on("trip_update_success", (data) => {
      console.log("Trip update success:", data);
      window.dispatchEvent(
        new CustomEvent("tripUpdateSuccess", { detail: data })
      );
    });

    // Student events
    this.socket.on("student_status_update", (data) => {
      console.log("Student status updated:", data);
      window.dispatchEvent(
        new CustomEvent("studentStatusUpdate", { detail: data })
      );
    });

    this.socket.on("student_update_success", (data) => {
      console.log("Student update success:", data);
      window.dispatchEvent(
        new CustomEvent("studentUpdateSuccess", { detail: data })
      );
    });

    // Location update success
    this.socket.on("location_update_success", (data) => {
      console.log("Location update success:", data);
      window.dispatchEvent(
        new CustomEvent("locationUpdateSuccess", { detail: data })
      );
    });

    // Admin notifications
    this.socket.on("admin_notification", (data) => {
      console.log("Admin notification:", data);
      window.dispatchEvent(
        new CustomEvent("adminNotification", { detail: data })
      );
    });

    // Parent notifications
    this.socket.on("parent_notification", (data) => {
      console.log("Parent notification:", data);
      window.dispatchEvent(
        new CustomEvent("parentNotification", { detail: data })
      );
    });

    // Generic notification event
    this.socket.on("notification:new", (data) => {
      console.log("Notification new:", data);
      window.dispatchEvent(
        new CustomEvent("notificationNew", { detail: data })
      );
    });

    // Day 4: stop proximity and delay alerts
    this.socket.on("approach_stop", (data) => {
      console.log("Approach stop:", data);
      window.dispatchEvent(new CustomEvent("approachStop", { detail: data }));
    });

    this.socket.on("delay_alert", (data) => {
      console.log("Delay alert:", data);
      window.dispatchEvent(new CustomEvent("delayAlert", { detail: data }));
    });

    // M5: Student pickup status update (checkin/checkout)
    this.socket.on("pickup_status_update", (data) => {
      console.log("Pickup status update:", data);
      window.dispatchEvent(
        new CustomEvent("pickupStatusUpdate", { detail: data })
      );
    });

    // M5: Trip incident (emergency)
    this.socket.on("trip_incident", (data) => {
      console.log("Trip incident:", data);
      window.dispatchEvent(new CustomEvent("tripIncident", { detail: data }));
    });

    // P2 Fix: Route updated event (for rebuild polyline)
    this.socket.on("route_updated", (data) => {
      console.log("Route updated:", data);
      window.dispatchEvent(new CustomEvent("routeUpdated", { detail: data }));
    });
  }

  // Bus tracking methods
  joinBusTracking(busId: number) {
    if (this.socket?.connected) {
      this.socket.emit("join_bus_tracking", { busId });
    }
  }

  leaveBusTracking(busId: number) {
    if (this.socket?.connected) {
      this.socket.emit("leave_bus_tracking", { busId });
    }
  }

  getBusLocation(busId: number) {
    if (this.socket?.connected) {
      this.socket.emit("get_bus_location", { busId });
    }
  }

  updateBusLocation(data: {
    busId: number;
    latitude: number;
    longitude: number;
    speed?: number;
    direction?: number;
    timestamp?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("update_bus_location", data);
    }
  }

  // Trip management methods
  updateTripStatus(data: {
    tripId: number;
    status: string;
    note?: string;
    timestamp?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("update_trip_status", data);
    }
  }

  updateStudentStatus(data: {
    tripId: number;
    studentId: number;
    status: string;
    note?: string;
    timestamp?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit("update_student_status", data);
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  reconnect(newToken?: string) {
    const token = newToken || this.token;
    if (!token) {
      console.warn("Cannot reconnect: no token available");
      return Promise.resolve();
    }
    return this.connect(token);
  }
}

// Create singleton instance
export const socketService = new SocketService();
export default socketService;
