import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1";

if (!process.env.NEXT_PUBLIC_API_BASE && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("⚠️ NEXT_PUBLIC_API_BASE not set, using default:", API_BASE);
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Request interceptor: add token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          // Luôn lấy token mới nhất từ localStorage trong mỗi request
          const storedToken =
            localStorage.getItem("ssb_token") || localStorage.getItem("token");
          if (storedToken) {
            this.token = storedToken;
            config.headers.Authorization = `Bearer ${storedToken}`;
          } else if (this.token) {
            // Nếu không có trong localStorage nhưng có trong memory, vẫn dùng
            config.headers.Authorization = `Bearer ${this.token}`;
          }
        } else if (this.token) {
          // Server-side: dùng token trong memory
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Only handle 401 errors for token refresh
        if (error.response?.status === 401 && typeof window !== "undefined") {
          // Kiểm tra lại token trước khi refresh
          const currentToken =
            localStorage.getItem("ssb_token") || localStorage.getItem("token");
          if (!currentToken && this.token) {
            // Token có trong memory nhưng không có trong localStorage, thử lại với token trong memory
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${this.token}`;
              try {
                return await this.client.request(error.config);
              } catch (retryError) {
                // Nếu vẫn lỗi, tiếp tục refresh
              }
            }
          }

          const refreshToken = localStorage.getItem("ssb_refresh_token");
          if (refreshToken && !this.isRefreshing) {
            try {
              this.isRefreshing = true;
              const refreshResponse = await axios.post(
                `${baseURL}/auth/refresh`,
                {},
                {
                  headers: { Authorization: `Bearer ${refreshToken}` },
                }
              );
              const newToken =
                refreshResponse.data?.data?.token ||
                refreshResponse.data?.token;
              if (newToken) {
                this.setToken(newToken);
                // Retry original request
                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${newToken}`;
                  return this.client.request(error.config);
                }
              }
            } catch (refreshError) {
              // Safely log refresh error
              try {
                const refreshErrMsg =
                  refreshError instanceof Error
                    ? refreshError.message
                    : String(refreshError);
                console.error("Token refresh failed:", refreshErrMsg);
              } catch {
                console.error("Token refresh failed");
              }
              this.clearToken();
              // Chỉ redirect nếu không phải đang ở trang login
              if (
                typeof window !== "undefined" &&
                !window.location.pathname.includes("/login")
              ) {
                window.location.href = "/login";
              }
            } finally {
              this.isRefreshing = false;
            }
          } else if (!refreshToken) {
            // Không có refresh token, redirect về login
            console.warn("No refresh token available, redirecting to login");
            this.clearToken();
            if (
              typeof window !== "undefined" &&
              !window.location.pathname.includes("/login")
            ) {
              window.location.href = "/login";
            }
          }
        }
        // Reject the error so it can be handled in the request method
        return Promise.reject(error);
      }
    );
  }

  private isRefreshing = false;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
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

  // Generic request method
  async request<T>(config: {
    method: "get" | "post" | "put" | "patch" | "delete";
    url: string;
    data?: any;
    params?: any;
    signal?: AbortSignal;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
        signal: config.signal,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;

        // Log detailed error information for debugging
        // Use console.warn and log properties individually to avoid Next.js error interception
        if (axiosError.response) {
          // Request got a response (but status code indicates error)
          // This is an API error response, not a network error
          // Use console.warn to avoid Next.js error handler interception
          if (process.env.NODE_ENV === "development") {
            try {
              const responseData = axiosError.response.data;

              // Log error info property by property to avoid serialization issues
              console.warn("[api-client] API error response:");
              console.warn("  URL:", config.url || "unknown");
              console.warn("  Method:", config.method || "unknown");
              console.warn("  Status:", axiosError.response.status);
              console.warn(
                "  StatusText:",
                axiosError.response.statusText || "unknown"
              );

              // Safely extract error details
              if (responseData) {
                if (responseData.error) {
                  console.warn(
                    "  Error Code:",
                    responseData.error.code || "unknown"
                  );
                  console.warn(
                    "  Error Message:",
                    responseData.error.message || "unknown"
                  );
                } else if (responseData.message) {
                  console.warn("  Message:", responseData.message);
                }
              }

              // Log request payload if available (for debugging)
              if (config.data) {
                try {
                  const requestDataStr =
                    typeof config.data === "string"
                      ? config.data.substring(0, 200)
                      : JSON.stringify(config.data, null, 2).substring(0, 500);
                  console.log("[api-client] Request payload:", requestDataStr);
                } catch {
                  // Ignore serialization errors
                }
              }
            } catch (logError) {
              // If logging fails, just log basic info without object
              console.warn("[api-client] API error (unable to log details)");
              console.warn("  URL:", config.url || "unknown");
              console.warn(
                "  Status:",
                axiosError.response?.status || "unknown"
              );
            }
          }
        } else {
          // Request failed without response (network error, CORS, timeout, etc.)
          // Use console.warn for network errors to avoid Next.js error interception
          // These are expected errors when backend is not running
          const errorDetails = {
            url: config.url || "unknown",
            method: config.method || "unknown",
            message: axiosError.message || "Unknown error",
            code: axiosError.code || "unknown",
          };

          // Log as warning (not error) to avoid Next.js error handler
          console.warn(
            "[api-client] Network error (backend may be offline):",
            errorDetails
          );

          // Check for common issues and log as warnings
          if (axiosError.code === "ECONNREFUSED") {
            console.warn(
              "  ⚠️  Connection refused - Backend server may not be running"
            );
          } else if (axiosError.code === "ERR_NETWORK") {
            console.warn(
              "  ⚠️  Network error - Check if backend server is running"
            );
          } else if (
            axiosError.code === "ETIMEDOUT" ||
            axiosError.code === "ECONNABORTED"
          ) {
            console.warn(
              "  ⚠️  Request timeout - Server may be slow or unresponsive"
            );
          } else if (axiosError.message?.includes("CORS")) {
            console.warn("  ⚠️  CORS error - Check backend CORS configuration");
          }
        }

        // If we have a response, return it (even if it's an error response)
        if (axiosError.response?.data) {
          return axiosError.response.data;
        }

        // For network errors (no response), return a structured error response
        // instead of throwing, so React Query can handle it properly
        const errorMessage = axiosError.message || "API request failed";
        const errorCode = axiosError.code || "UNKNOWN_ERROR";

        // Return error response structure instead of throwing
        return {
          success: false,
          error: {
            code:
              errorCode === "ERR_NETWORK"
                ? "NETWORK_ERROR"
                : errorCode === "ECONNREFUSED"
                ? "CONNECTION_REFUSED"
                : errorCode === "ETIMEDOUT"
                ? "TIMEOUT"
                : "UNKNOWN_ERROR",
            message:
              errorCode === "ERR_NETWORK" || errorCode === "ECONNREFUSED"
                ? "Không thể kết nối đến server. Vui lòng kiểm tra backend server có đang chạy không (cd ssb-backend && npm run dev)"
                : errorMessage,
          },
        } as ApiResponse<T>;
      }

      // For non-axios errors, return error response structure
      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      } as ApiResponse<T>;
    }
  }

  // Routes
  async getRoutes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    trangThai?: boolean;
    routeType?: string;
  }) {
    return this.request({ method: "get", url: "/routes", params });
  }

  async getRouteById(id: string | number, signal?: AbortSignal) {
    return this.request({ method: "get", url: `/routes/${id}`, signal });
  }

  async createRoute(data: any) {
    return this.request({ method: "post", url: "/routes", data });
  }

  async createRoutesBatch(routes: Array<any>) {
    return this.request({
      method: "post",
      url: "/routes/batch",
      data: { routes },
    });
  }

  async updateRoute(id: string | number, data: any) {
    return this.request({ method: "put", url: `/routes/${id}`, data });
  }

  async deleteRoute(id: string | number) {
    return this.request({ method: "delete", url: `/routes/${id}` });
  }

  async getRouteStops(routeId: string | number, signal?: AbortSignal) {
    return this.request({
      method: "get",
      url: `/routes/${routeId}/stops`,
      signal,
    });
  }

  async addStopToRoute(
    routeId: string | number,
    data: {
      stop_id?: number;
      sequence?: number;
      dwell_seconds?: number;
      tenDiem?: string;
      viDo?: number;
      kinhDo?: number;
      address?: string;
      scheduled_time?: string;
    }
  ) {
    return this.request({
      method: "post",
      url: `/routes/${routeId}/stops`,
      data,
    });
  }

  async reorderStops(
    routeId: string | number,
    items: Array<{ stop_id: number; sequence: number }>
  ) {
    return this.request({
      method: "patch",
      url: `/routes/${routeId}/stops/reorder`,
      data: { items },
    });
  }

  async removeStopFromRoute(routeId: string | number, stopId: number) {
    return this.request({
      method: "delete",
      url: `/routes/${routeId}/stops/${stopId}`,
    });
  }

  async suggestStops(params?: {
    area?: string;
    maxDistanceKm?: number;
    minStudentsPerStop?: number;
    maxStops?: number;
    origin?: string; // lat,lng format
    destination?: string; // lat,lng format
    optimizeRoute?: boolean;
  }) {
    return this.request({
      method: "get",
      url: "/routes/suggestions/stops",
      params: {
        ...(params?.area && { area: params.area }),
        ...(params?.maxDistanceKm && { maxDistanceKm: params.maxDistanceKm }),
        ...(params?.minStudentsPerStop && {
          minStudentsPerStop: params.minStudentsPerStop,
        }),
        ...(params?.maxStops && { maxStops: params.maxStops }),
        ...(params?.origin && { origin: params.origin }),
        ...(params?.destination && { destination: params.destination }),
        ...(params?.optimizeRoute !== undefined && {
          optimizeRoute: params.optimizeRoute,
        }),
      },
    });
  }

  async findStudentsNearby(params: {
    lat: number;
    lng: number;
    radiusMeters?: number; // Default 500m
  }) {
    return this.request({
      method: "get",
      url: "/routes/students/nearby",
      params: {
        lat: params.lat,
        lng: params.lng,
        ...(params.radiusMeters && { radiusMeters: params.radiusMeters }),
      },
    });
  }

  async addStudentToStop(
    routeId: string | number,
    stopId: string | number,
    studentId: number
  ) {
    return this.request({
      method: "post",
      url: `/routes/${routeId}/stops/${stopId}/students`,
      data: { student_id: studentId },
    });
  }

  async removeStudentFromStop(
    routeId: string | number,
    stopId: string | number,
    studentId: number
  ) {
    return this.request({
      method: "delete",
      url: `/routes/${routeId}/stops/${stopId}/students/${studentId}`,
    });
  }

  async bulkAddStudentsToStop(
    routeId: string | number,
    stopId: string | number,
    studentIds: number[]
  ) {
    return this.request({
      method: "post",
      url: `/routes/${routeId}/stops/students/bulk`,
      data: {
        stop_id: stopId,
        student_ids: studentIds,
      },
    });
  }

  async suggestRoutes(params?: {
    area?: string;
    maxStudentsPerRoute?: number;
    minStudentsPerRoute?: number;
    maxStopsPerRoute?: number;
    maxDistanceKm?: number;
    minStudentsPerStop?: number;
    schoolLat?: number;
    schoolLng?: number;
    createReturnRoutes?: boolean;
  }) {
    return this.request({
      method: "get",
      url: "/routes/suggestions/routes",
      params: {
        ...(params?.area && { area: params.area }),
        ...(params?.maxStudentsPerRoute && {
          maxStudentsPerRoute: params.maxStudentsPerRoute,
        }),
        ...(params?.minStudentsPerRoute && {
          minStudentsPerRoute: params.minStudentsPerRoute,
        }),
        ...(params?.maxStopsPerRoute && {
          maxStopsPerRoute: params.maxStopsPerRoute,
        }),
        ...(params?.maxDistanceKm && { maxDistanceKm: params.maxDistanceKm }),
        ...(params?.minStudentsPerStop && {
          minStudentsPerStop: params.minStudentsPerStop,
        }),
        ...(params?.schoolLat && { schoolLat: params.schoolLat }),
        ...(params?.schoolLng && { schoolLng: params.schoolLng }),
        ...(params?.createReturnRoutes !== undefined && {
          createReturnRoutes: params.createReturnRoutes,
        }),
      },
    });
  }

  // Stops
  async getStops(params?: { page?: number; limit?: number; search?: string }) {
    return this.request({ method: "get", url: "/stops", params });
  }

  async createStop(data: {
    tenDiem: string;
    viDo?: number;
    kinhDo?: number;
    address?: string;
    scheduled_time?: string;
  }) {
    return this.request({ method: "post", url: "/stops", data });
  }

  async updateStop(
    id: number,
    data: Partial<{
      tenDiem: string;
      viDo: number;
      kinhDo: number;
      address: string;
      scheduled_time: string;
    }>
  ) {
    return this.request({ method: "put", url: `/stops/${id}`, data });
  }

  async deleteStop(id: number) {
    return this.request({ method: "delete", url: `/stops/${id}` });
  }

  async addRouteStop(routeId: number | string, data: any) {
    return this.request({
      method: "post",
      url: `/routes/${routeId}/stops`,
      data,
    });
  }

  async rebuildPolyline(routeId: number | string) {
    return this.request({
      method: "post",
      url: `/routes/${routeId}/rebuild-polyline`,
    });
  }

  // Maps (via backend proxy)
  async getDirections(data: {
    origin: string;
    destination: string;
    waypoints?: Array<{ location: string }>;
    mode?: string;
    language?: string;
    units?: string;
    vehicleType?: string; // "bus", "car", "motorcycle" - để tối ưu routing cho xe buýt
    _t?: number; // Timestamp to bypass cache
    alternatives?: boolean; // Yêu cầu alternative routes từ Google Maps
  }) {
    // Log the request data for debugging
    console.log("[api-client] getDirections request data:");
    console.log("  Origin:", data.origin);
    console.log("  Destination:", data.destination);
    console.log("  Waypoints Count:", data.waypoints?.length || 0);
    if (data.waypoints && data.waypoints.length > 0) {
      console.log(
        "  Waypoints:",
        data.waypoints.map((wp) => wp.location || wp).join(", ")
      );
    }
    console.log("  Mode:", data.mode || "driving");

    // Validate before sending
    if (!data.origin || !data.destination) {
      console.error(
        "[api-client] getDirections: Missing origin or destination!"
      );
      throw new Error("Origin and destination are required");
    }

    return this.request({ method: "post", url: "/maps/directions", data });
  }

  async getDistanceMatrix(data: {
    origins: string[];
    destinations: string[];
    mode?: string;
    language?: string;
    units?: string;
  }) {
    return this.request({ method: "post", url: "/maps/distance-matrix", data });
  }

  async geocode(data: { address: string; language?: string }) {
    return this.request({ method: "post", url: "/maps/geocode", data });
  }

  async reverseGeocode(data: { latlng: string; language?: string }) {
    return this.request({ method: "post", url: "/maps/reverse-geocode", data });
  }

  async snapToRoads(data: {
    path: Array<{ lat: number; lng: number }>;
    interpolate?: boolean;
  }) {
    return this.request({ method: "post", url: "/maps/roads/snap", data });
  }

  // Bus Stop Optimization APIs
  async optimizeBusStops(data: {
    r_walk?: number;
    s_max?: number;
    max_stops?: number | null;
    use_roads_api?: boolean;
    use_places_api?: boolean;
    school_location?: { lat: number; lng: number };
    max_distance_from_school?: number;
  }) {
    return this.request({ method: "post", url: "/bus-stops/optimize", data });
  }

  async optimizeVRP(data: {
    depot?: { lat: number; lng: number };
    capacity?: number;
    split_virtual_nodes?: boolean;
  }) {
    return this.request({ method: "post", url: "/routes/optimize-vrp", data });
  }

  async optimizeFull(data: {
    school_location?: { lat: number; lng: number };
    r_walk?: number;
    s_max?: number;
    c_bus?: number;
    max_stops?: number | null;
    use_roads_api?: boolean;
    use_places_api?: boolean;
    split_virtual_nodes?: boolean;
    max_distance_from_school?: number;
  }) {
    return this.request({
      method: "post",
      url: "/bus-stops/optimize-full",
      data,
    });
  }

  async createRoutesFromOptimization(data: {
    depot?: { lat: number; lng: number; name?: string };
    capacity?: number;
    route_name_prefix?: string;
    create_return_routes?: boolean;
    vrp_result?: any;
  }) {
    return this.request({
      method: "post",
      url: "/bus-stops/create-routes",
      data,
    });
  }

  async createSchedulesFromRoutes(data: {
    route_ids?: number[];
    default_departure_time?: string;
    auto_assign_bus?: boolean;
    auto_assign_driver?: boolean;
    ngay_chay?: string;
  }) {
    return this.request({
      method: "post",
      url: "/bus-stops/create-schedules",
      data,
    });
  }

  async getBusStopAssignments() {
    return this.request({ method: "get", url: "/bus-stops/assignments" });
  }

  async getBusStopStats() {
    return this.request({ method: "get", url: "/bus-stops/stats" });
  }

  // Statistics APIs
  async getStatsOverview(params?: {
    from?: string;
    to?: string;
    routeId?: number;
    driverId?: number;
    busId?: number;
  }) {
    return this.request({ method: 'get', url: '/stats/overview', params });
  }

  async getStatsTripsByDay(params?: {
    from?: string;
    to?: string;
    routeId?: number;
    driverId?: number;
    busId?: number;
  }) {
    return this.request({ method: 'get', url: '/stats/trips-by-day', params });
  }

  async getStatsDriverPerformance(params?: {
    from?: string;
    to?: string;
    routeId?: number;
    driverId?: number;
    busId?: number;
  }) {
    return this.request({ method: 'get', url: '/stats/driver-performance', params });
  }

  async getStatsBusUtilization(params?: {
    from?: string;
    to?: string;
    routeId?: number;
    driverId?: number;
    busId?: number;
  }) {
    return this.request({ method: 'get', url: '/stats/bus-utilization', params });
  }

  async getStatsRoutePunctuality(params?: {
    from?: string;
    to?: string;
    routeId?: number;
    driverId?: number;
    busId?: number;
  }) {
    return this.request({ method: 'get', url: '/stats/route-punctuality', params });
  }
}

export const apiClient = new ApiClient(API_BASE);
export default apiClient;
