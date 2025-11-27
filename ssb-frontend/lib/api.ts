export * from "../../lib/api";
export { api } from "../../lib/api";
// API client for Smart School Bus Tracking System
// Default to backend dev URL if env not provided
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// 🔍 DEBUG: Log API URL để kiểm tra .env.local
if (typeof window !== "undefined") {
  console.log("🌐 API_BASE_URL:", API_BASE_URL);
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Get token from localStorage on initialization
    if (typeof window !== "undefined") {
      // Prefer 'ssb_token' but fall back to 'token' for compatibility
      this.token =
        localStorage.getItem("ssb_token") || localStorage.getItem("token");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      // Write to both keys to keep older code paths working
      localStorage.setItem("ssb_token", token);
      localStorage.setItem("token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("ssb_token");
      localStorage.removeItem("token");
      localStorage.removeItem("ssb_refresh_token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // Always read the latest token from localStorage at request time
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("token");
      if (stored && stored !== this.token) {
        this.token = stored;
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (
        headers as Record<string, string>
      ).Authorization = `Bearer ${this.token}`;
    }

    const doFetch = async (): Promise<{ ok: boolean; status: number; json: any }> => {
      try {
        const resp = await fetch(url, { ...options, headers });
        const json = await resp.json().catch(() => ({}));
        return { ok: resp.ok, status: resp.status, json };
      } catch (fetchError: any) {
        // Handle network errors (Failed to fetch, CORS, etc.)
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error(`Không thể kết nối đến server. Vui lòng kiểm tra:\n- Backend server có đang chạy không?\n- URL: ${url}\n- CORS settings`);
        }
        throw fetchError;
      }
    };

    try {
      let { ok, status, json } = await doFetch();

      // Auto refresh token on 401 once
      if (!ok && status === 401 && typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("ssb_refresh_token");
        if (refreshToken) {
          // prevent parallel refresh storms
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshPromise = fetch(`${this.baseURL}/auth/refresh`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${refreshToken}` },
            })
              .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) return null;
                const newToken = data?.data?.token || data?.token;
                if (newToken) this.setToken(newToken);
                return newToken || null;
              })
              .finally(() => {
                this.isRefreshing = false;
              });
          }
          const newToken = await (this.refreshPromise as Promise<string | null>);
          this.refreshPromise = null;

          if (newToken) {
            // retry original call with new token
            (headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            const retried = await doFetch();
            ok = retried.ok; status = retried.status; json = retried.json;
          }
        }
      }

      // Handle rate limit errors (429)
      if (status === 429) {
        const retryAfter = json?.retryAfter || 60; // Default 60 seconds
        const errorMessage = json?.message || "Too many requests from this IP, please try again later.";
        const error = new Error(errorMessage);
        (error as any).status = 429;
        (error as any).code = json?.code || 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter = retryAfter;
        (error as any).response = json;
        console.warn(`[API] Rate limit exceeded. Retry after ${retryAfter}s`);
        throw error;
      }

      // Check for error response (either HTTP error or success: false)
      if (!ok || json?.success === false) {
        const errorMessage = json?.message || json?.error || "API request failed";
        const error = new Error(errorMessage);
        // Attach additional error info for debugging
        (error as any).status = status;
        (error as any).code = json?.code;
        (error as any).response = json;
        throw error;
      }

      return json;
    } catch (error: any) {
      // Improve error messages for common issues
      if (error.message && error.message.includes('Không thể kết nối đến server')) {
        console.error("API connection error:", error);
        throw error;
      }
      
      // Handle network errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        const friendlyError = new Error(`Không thể kết nối đến server tại ${this.baseURL}. Vui lòng kiểm tra:\n- Backend server có đang chạy không?\n- Network connection\n- CORS settings`);
        (friendlyError as any).originalError = error;
        console.error("API network error:", error);
        throw friendlyError;
      }
      
      console.warn("API request warning:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    hoTen: string;
    email: string;
    matKhau: string;
    soDienThoai?: string;
    vaiTro: string;
    anhDaiDien?: string;
  }) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async forgotPassword(email?: string, soDienThoai?: string) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, soDienThoai }),
    });
  }

  // Bus endpoints
  async getBuses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    trangThai?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);

    const query = queryParams.toString();
    return this.request(`/buses${query ? `?${query}` : ""}`);
  }

  async getBusById(id: string | number) {
    return this.request(`/buses/${id}`);
  }

  async createBus(busData: {
    bienSoXe: string;
    dongXe?: string;
    sucChua: number;
    trangThai?: string;
  }) {
    return this.request("/buses", {
      method: "POST",
      body: JSON.stringify(busData),
    });
  }

  async updateBus(id: string | number, busData: any) {
    return this.request(`/buses/${id}`, {
      method: "PUT",
      body: JSON.stringify(busData),
    });
  }

  async deleteBus(id: string | number) {
    return this.request(`/buses/${id}`, {
      method: "DELETE",
    });
  }

  async updateBusLocation(
    id: string | number,
    locationData: {
      viDo: number;
      kinhDo: number;
      tocDo?: number;
      huongDi?: number;
      timestamp?: string;
    }
  ) {
    return this.request(`/buses/${id}/position`, {
      method: "POST",
      body: JSON.stringify(locationData),
    });
  }

  async updateBusStatus(
    id: string | number,
    statusData: {
      trangThai: string;
      lyDo?: string;
    }
  ) {
    return this.request(`/buses/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  }

  async getBusStats() {
    return this.request("/buses/stats");
  }

  async getTripStats(params?: { from: string; to: string }) {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    const query = queryParams.toString();
    return this.request(`/trips/stats${query ? `?${query}` : ""}`);
  }

  // Driver endpoints
  async getDrivers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    // Backend expects pageSize, but also accepts limit
    if (params?.limit) {
      queryParams.append("pageSize", params.limit.toString());
      queryParams.append("limit", params.limit.toString()); // Also send limit for compatibility
    }
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    return this.request(`/drivers${query ? `?${query}` : ""}`);
  }

  async getDriverById(id: string | number) {
    return this.request(`/drivers/${id}`);
  }

  async createDriver(driverData: any) {
    return this.request("/drivers", {
      method: "POST",
      body: JSON.stringify(driverData),
    });
  }

  async updateDriver(id: string | number, driverData: any) {
    return this.request(`/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(driverData),
    });
  }

  async deleteDriver(id: string | number) {
    return this.request(`/drivers/${id}`, {
      method: "DELETE",
    });
  }

  // Student endpoints
  async getStudents(params?: {
    page?: number;
    limit?: number;
    lop?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    // Backend expects pageSize, but also accepts limit
    if (params?.limit) {
      queryParams.append("pageSize", params.limit.toString());
      queryParams.append("limit", params.limit.toString()); // Also send limit for compatibility
    }
    if (params?.lop) queryParams.append("lop", params.lop);
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    return this.request(`/students${query ? `?${query}` : ""}`);
  }

  async getStudentById(id: string | number) {
    return this.request(`/students/${id}`);
  }

  async createStudent(studentData: any) {
    return this.request("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id: string | number, studentData: any) {
    return this.request(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id: string | number) {
    return this.request(`/students/${id}`, {
      method: "DELETE",
    });
  }

  async getStudentStats() {
    return this.request("/students/stats");
  }

  async findParentByPhone(phone: string) {
    return this.request(`/students/parent/by-phone/${phone}`);
  }

  // Route endpoints
  async getRoutes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    trangThai?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);

    const query = queryParams.toString();
    return this.request(`/routes${query ? `?${query}` : ""}`);
  }

  async getRouteById(id: string | number) {
    return this.request(`/routes/${id}`);
  }

  async createRoute(routeData: any) {
    return this.request("/routes", {
      method: "POST",
      body: JSON.stringify(routeData),
    });
  }

  async updateRoute(id: string | number, routeData: any) {
    return this.request(`/routes/${id}`, {
      method: "PUT",
      body: JSON.stringify(routeData),
    });
  }

  async deleteRoute(id: string | number) {
    return this.request(`/routes/${id}`, {
      method: "DELETE",
    });
  }

  async getRouteStopSuggestions(routeId: string | number) {
    return this.request(`/routes/${routeId}/stop-suggestions`);
  }

  async getRouteStops(routeId: string | number) {
    return this.request(`/routes/${routeId}/stops`);
  }

  async suggestStops(params?: {
    area?: string;
    maxDistanceKm?: number;
    minStudentsPerStop?: number;
    maxStops?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.area) queryParams.append("area", params.area);
    if (params?.maxDistanceKm) queryParams.append("maxDistanceKm", params.maxDistanceKm.toString());
    if (params?.minStudentsPerStop) queryParams.append("minStudentsPerStop", params.minStudentsPerStop.toString());
    if (params?.maxStops) queryParams.append("maxStops", params.maxStops.toString());

    const query = queryParams.toString();
    return this.request(`/routes/suggestions/stops${query ? `?${query}` : ""}`);
  }

  async addRouteStop(routeId: string | number, stopData: any) {
    return this.request(`/routes/${routeId}/stops`, {
      method: "POST",
      body: JSON.stringify(stopData),
    });
  }

  async updateRouteStop(routeId: string | number, stopId: string | number, updateData: {
    sequence?: number;
    dwell_seconds?: number;
    tenDiem?: string;
    viDo?: number;
    kinhDo?: number;
    address?: string;
    scheduled_time?: string;
  }) {
    return this.request(`/routes/${routeId}/stops/${stopId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  // Schedule endpoints
  async getSchedules(params?: {
    maTuyen?: number;
    maXe?: number;
    maTaiXe?: number;
    loaiChuyen?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.maTuyen)
      queryParams.append("maTuyen", params.maTuyen.toString());
    if (params?.maXe) queryParams.append("maXe", params.maXe.toString());
    if (params?.maTaiXe)
      queryParams.append("maTaiXe", params.maTaiXe.toString());
    if (params?.loaiChuyen) queryParams.append("loaiChuyen", params.loaiChuyen);

    const query = queryParams.toString();
    return this.request(`/schedules${query ? `?${query}` : ""}`);
  }

  async getScheduleById(id: string | number) {
    return this.request(`/schedules/${id}`);
  }

  async getScheduleStudents(id: string | number) {
    return this.request(`/schedules/${id}/students`);
  }

  async createSchedule(scheduleData: any) {
    try {
      return await this.request("/schedules", {
        method: "POST",
        body: JSON.stringify(scheduleData),
      });
    } catch (error: any) {
      // M1-M3: Re-throw with conflict details for 409
      if (error?.status === 409 || error?.response?.status === 409) {
        const conflictData = error?.response?.data || error?.data || {};
        throw {
          ...error,
          conflict: conflictData.details?.conflicts || conflictData.conflicts || [],
          message: conflictData.message || "Xung đột lịch trình",
        };
      }
      throw error;
    }
  }

  async updateSchedule(id: string | number, scheduleData: any) {
    try {
      return await this.request(`/schedules/${id}`, {
        method: "PUT",
        body: JSON.stringify(scheduleData),
      });
    } catch (error: any) {
      // M1-M3: Re-throw with conflict details for 409
      if (error?.status === 409 || error?.response?.status === 409) {
        const conflictData = error?.response?.data || error?.data || {};
        throw {
          ...error,
          conflict: conflictData.details?.conflicts || conflictData.conflicts || [],
          message: conflictData.message || "Xung đột lịch trình",
        };
      }
      throw error;
    }
  }

  async deleteSchedule(id: string | number) {
    return this.request(`/schedules/${id}`, {
      method: "DELETE",
    });
  }

  // Trip endpoints
  async getTrips(params?: {
    page?: number;
    limit?: number;
    ngayChay?: string;
    trangThai?: string;
    maXe?: number;
    maTaiXe?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.ngayChay) queryParams.append("ngayChay", params.ngayChay);
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);
    if (params?.maXe) queryParams.append("maXe", params.maXe.toString());
    if (params?.maTaiXe)
      queryParams.append("maTaiXe", params.maTaiXe.toString());

    const query = queryParams.toString();
    return this.request(`/trips${query ? `?${query}` : ""}`);
  }

  async getTripById(id: string | number) {
    return this.request(`/trips/${id}`);
  }

  async createTrip(tripData: any) {
    return this.request("/trips", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
  }

  async updateTripStatus(
    id: string | number,
    statusData: {
      trangThai: string;
      ghiChu?: string;
    }
  ) {
    return this.request(`/trips/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  }

  async getTripStudents(tripId: string | number) {
    return this.request(`/trips/${tripId}/students`);
  }

  async updateStudentStatus(
    tripId: string | number,
    studentId: string | number,
    statusData: {
      trangThai: string;
      ghiChu?: string;
    }
  ) {
    return this.request(`/trips/${tripId}/students/${studentId}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  }

  // Health check
  async getHealth() {
    return this.request("/health");
  }

  async getDetailedHealth() {
    return this.request("/health/detailed");
  }

  async getHealthHistory() {
    return this.request("/health/history");
  }

  // Incident endpoints
  async getIncidents(params?: {
    mucDo?: string;
    maChuyen?: number;
    trangThai?: string;
    tuNgay?: string;
    denNgay?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.mucDo) queryParams.append("mucDo", params.mucDo);
    if (params?.maChuyen) queryParams.append("maChuyen", String(params.maChuyen));
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);
    if (params?.tuNgay) queryParams.append("tuNgay", params.tuNgay);
    if (params?.denNgay) queryParams.append("denNgay", params.denNgay);
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.offset) queryParams.append("offset", String(params.offset));
    const q = queryParams.toString();
    return this.request(`/incidents${q ? `?${q}` : ""}`);
  }

  async createIncident(payload: {
    maChuyen?: number;
    loaiSuCo?: string;
    moTa: string;
    mucDo?: string;
    viTri?: string;
    trangThai?: string;
    hocSinhLienQuan?: number[];
    affectedStudents?: number[];
  }) {
    // 🔥 FIX: Gửi đến endpoint /trips/:id/incident thay vì /incidents nếu có maChuyen
    if (payload.maChuyen) {
      return this.request(`/trips/${payload.maChuyen}/incident`, { 
        method: "POST", 
        body: JSON.stringify({
          loaiSuCo: payload.loaiSuCo || "other",
          moTa: payload.moTa,
          mucDo: payload.mucDo,
          viTri: payload.viTri,
          hocSinhLienQuan: payload.hocSinhLienQuan || payload.affectedStudents,
        })
      });
    }
    // Fallback: Gửi đến /incidents nếu không có maChuyen
    return this.request("/incidents", { method: "POST", body: JSON.stringify(payload) });
  }

  async updateIncident(id: number, payload: { moTa?: string; mucDo?: string; trangThai?: string }) {
    return this.request(`/incidents/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async deleteIncident(id: number) {
    return this.request(`/incidents/${id}`, { method: "DELETE" });
  }

  // Notifications endpoints
  async getNotifications(params?: { loaiThongBao?: string; daDoc?: boolean; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.loaiThongBao) queryParams.append("loaiThongBao", params.loaiThongBao);
    if (params?.daDoc !== undefined) queryParams.append("daDoc", String(params.daDoc));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.offset) queryParams.append("offset", String(params.offset));
    const q = queryParams.toString();
    return this.request(`/notifications${q ? `?${q}` : ""}`);
  }

  async getUnreadCount() {
    return this.request("/notifications/unread-count");
  }

  async markNotificationRead(id: number) {
    return this.request(`/notifications/${id}/read`, { method: "PATCH" });
  }

  async markAllNotificationsRead() {
    return this.request(`/notifications/read-all`, { method: "PATCH" });
  }

  async deleteNotification(id: number) {
    return this.request(`/notifications/${id}`, { method: "DELETE" });
  }

  async deleteAllReadNotifications() {
    return this.request(`/notifications/clean-read`, { method: "DELETE" });
  }

  // Reports endpoints
  async getReportsOverview(params?: { from?: string; to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    const q = queryParams.toString();
    return this.request(`/reports/overview${q ? `?${q}` : ""}`);
  }

  async getReportView(params?: { type?: string; from?: string; to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    const q = queryParams.toString();
    return this.request(`/reports/view${q ? `?${q}` : ""}`);
  }

  // Trip history for parent
  async getTripHistory(params?: { from?: string; to?: string; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    const q = queryParams.toString();
    return this.request(`/trips/history${q ? `?${q}` : ""}`);
  }

  // Driver history
  async getDriverHistory(driverId: string | number, params?: { from?: string; to?: string; trangThai?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.offset) queryParams.append("offset", String(params.offset));
    const q = queryParams.toString();
    return this.request(`/drivers/${driverId}/history${q ? `?${q}` : ""}`);
  }

  // Export reports
  async exportReport(params?: { format?: string; type?: string; from?: string; to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.format) queryParams.append("format", params.format);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    const q = queryParams.toString();
    // Return blob for file download
    const url = `${this.baseURL}/reports/export${q ? `?${q}` : ""}`;
    const headers: HeadersInit = { "Content-Type": "application/json", "Accept": "application/octet-stream" };
    if (this.token) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Export failed");
    const blob = await response.blob();
    return blob;
  }

  // Get students by parent
  async getStudentsByParent() {
    return this.request("/students/by-parent");
  }

  // Profile endpoints
  async getProfile() {
    return this.request("/auth/profile");
  }

  async updateProfile(profileData: {
    hoTen?: string;
    soDienThoai?: string;
    diaChi?: string;
    anhDaiDien?: string;
  }) {
    return this.request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData: {
    matKhauCu: string;
    matKhauMoi: string;
    xacNhanMatKhauMoi: string;
  }) {
    return this.request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(passwordData),
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
