/**
 * API Client for SSB Frontend
 * Handles all REST API calls with interceptors, error handling, and authentication
 */

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private isRefreshing = false
  private refreshPromise: Promise<string | null> | null = null

  constructor() {
    // Use API v1 by default to match backend routes
    // Default to port 4000 if backend env sets PORT=4000 during dev
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

    // 🔍 DEBUG: Log API URL để kiểm tra .env.local
    if (typeof window !== "undefined") {
      console.log("🌐 API_BASE_URL (root/lib/api.ts):", this.baseURL);
    }

    // Get token from localStorage on initialization
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("ssb_token");
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("ssb_token", token);
      } else {
        localStorage.removeItem('ssb_token')
        localStorage.removeItem('ssb_refresh_token')
      }
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || "Server error",
        status: error.response.status,
        code: error.response.data?.code,
      };
    } else if (error.request) {
      // Network error
      return {
        message: "Network error - please check your connection",
        status: 0,
        code: "NETWORK_ERROR",
      };
    } else {
      // Other error
      return {
        message: error.message || "Unknown error occurred",
        status: 0,
        code: "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    const doFetch = async () => {
      const response = await fetch(url, config)
      const json = await response.json().catch(() => ({}))
      return { response, json }
    }

    try {
      let { response, json } = await doFetch()

      // Attempt refresh on 401 once
      if (!response.ok && response.status === 401 && typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('ssb_refresh_token')
        if (refreshToken) {
          if (!this.isRefreshing) {
            this.isRefreshing = true
            this.refreshPromise = fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${refreshToken}` },
            })
              .then(async (r) => {
                const body = await r.json().catch(() => ({}))
                if (!r.ok) return null
                const newToken = body?.data?.token || body?.token
                if (newToken) this.setToken(newToken)
                return newToken || null
              })
              .finally(() => {
                this.isRefreshing = false
              })
          }
          const newToken = await (this.refreshPromise as Promise<string | null>)
          this.refreshPromise = null
          if (newToken) {
            config.headers = { ...(config.headers as any), Authorization: `Bearer ${newToken}` }
            const retried = await doFetch()
            response = retried.response
            json = retried.json
          }
        }
      }

      if (!response.ok) {
        const error: ApiError = {
          message: json?.message || 'API request failed',
          status: response.status,
          code: json?.code,
        }
        throw error
      }

      return json
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
        throw error as ApiError
      }
      const apiError = this.handleError(error)
      throw apiError
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
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
    if (params?.limit) queryParams.append("limit", params.limit.toString());
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

  // Stats endpoints
  async getBusStats() {
    return this.request('/buses/stats')
  }

  async getTripStats(params: { from: string; to: string }) {
    const q = new URLSearchParams({ from: params.from, to: params.to }).toString()
    return this.request(`/trips/stats?${q}`)
  }

  // Trip endpoints
  async getTrips(params?: {
    page?: number;
    limit?: number;
    pageSize?: number;
    ngayChay?: string;
    trangThai?: string;
    maTuyen?: number;
    maXe?: number;
    maTaiXe?: number;
    q?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());
    if (params?.ngayChay) queryParams.append("ngayChay", params.ngayChay);
    if (params?.trangThai) queryParams.append("trangThai", params.trangThai);
    if (params?.maTuyen) queryParams.append("maTuyen", params.maTuyen.toString());
    if (params?.maXe) queryParams.append("maXe", params.maXe.toString());
    if (params?.maTaiXe) queryParams.append("maTaiXe", params.maTaiXe.toString());
    if (params?.q) queryParams.append("q", params.q);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const query = queryParams.toString();
    return this.request(`/trips${query ? `?${query}` : ""}`);
  }

  async getTripById(id: string | number) {
    return this.request(`/trips/${id}`);
  }

  // Route endpoints
  async getRouteById(id: string | number, signal?: AbortSignal) {
    return this.request(`/routes/${id}`, { signal });
  }

  // Reports endpoints (real data)
  async getReportsOverview(params: { from: string; to: string; routeId?: number; driverId?: number; busId?: number }) {
    const q = new URLSearchParams()
    q.append('from', params.from)
    q.append('to', params.to)
    if (params.routeId) q.append('routeId', String(params.routeId))
    if (params.driverId) q.append('driverId', String(params.driverId))
    if (params.busId) q.append('busId', String(params.busId))
    return this.request(`/reports/overview?${q.toString()}`)
  }

  async getReportView(params: { type: 'trips'|'buses'|'drivers'|'students'|'incidents'; from: string; to: string }) {
    const q = new URLSearchParams({ type: params.type, from: params.from, to: params.to }).toString()
    return this.request(`/reports/view?${q}`)
  }

  async exportReport(params: { format: 'pdf'|'xlsx'; type: string; from: string; to: string }) {
    const q = new URLSearchParams({ format: params.format, type: params.type, from: params.from, to: params.to }).toString()
    const url = `${this.baseURL}/reports/export?${q}`
    const response = await fetch(url, { headers: this.getAuthHeaders() })
    if (!response.ok) {
      const msg = await response.text().catch(() => '')
      throw { message: msg || 'Export failed', status: response.status }
    }
    const blob = await response.blob()
    // Return in ApiResponse-like shape for compatibility or raw blob?
    // Frontend expects Blob directly, so return blob.
    return blob as any
  }
}

// Create singleton instance
export const api = new ApiClient();
export const apiClient = api; // Alias for compatibility

// Export types
export type { ApiResponse, ApiError };
