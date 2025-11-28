// Trip service: start and end trip actions
// Uses backend REST if NEXT_PUBLIC_API_URL is set; otherwise falls back to socket event

export type TripStatus = "started" | "completed";

// Default to backend dev URL if env not provided (align with api client)
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function postJSON(url: string, body: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ssb_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}

  // Debug log to verify which endpoint FE is calling
  try {
    console.log("[trip.service] POST", url, body);
  } catch {}

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  // Debug log status
  try {
    console.log("[trip.service] Response status:", res.status, res.statusText);
  } catch {}

  if (!res.ok) {
    // Try to get error details from response - improved error extraction
    let errorMessage = `Request failed ${res.status}`;
    let errorData: any = {};
    let errorCode: string | undefined;
    let rawText: string = "";

    try {
      // 🔥 Đọc response text trước (có thể chỉ đọc 1 lần)
      rawText = await res.text();
      console.log("[trip.service] Raw response text:", {
        length: rawText.length,
        isEmpty: !rawText || rawText.trim().length === 0,
        preview: rawText.substring(0, 200), // First 200 chars
        isJSON: (() => {
          try {
            JSON.parse(rawText);
            return true;
          } catch {
            return false;
          }
        })(),
      });

      if (rawText && rawText.trim().length > 0) {
        try {
          errorData = JSON.parse(rawText);
          console.log("[trip.service] Parsed error data:", {
            keys: Object.keys(errorData),
            hasMessage: !!errorData.message,
            hasError: !!errorData.error,
            hasErrorCode: !!errorData.errorCode,
            fullData: errorData,
          });

          // 🔥 Extract error message từ nhiều nguồn khác nhau
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error) {
            errorMessage =
              typeof errorData.error === "string"
                ? errorData.error
                : JSON.stringify(errorData.error);
          } else if (errorData.errorCode) {
            errorMessage = `Error code: ${errorData.errorCode}`;
          } else if (errorData.code) {
            errorMessage = `Error code: ${errorData.code}`;
          } else if (Object.keys(errorData).length > 0) {
            // Nếu có data nhưng không có message, stringify toàn bộ
            errorMessage = JSON.stringify(errorData);
          }

          errorCode = errorData.errorCode || errorData.code;
        } catch (parseErr: any) {
          // Not JSON, use text as message
          console.warn("[trip.service] Failed to parse as JSON:", parseErr);
          errorMessage = rawText || res.statusText || errorMessage;
        }
      } else {
        // Response body rỗng
        console.warn("[trip.service] Response body is empty");
        errorMessage =
          res.statusText ||
          `HTTP ${res.status}: ${res.statusText || "Request failed"}`;
      }

      // 🔥 Đảm bảo luôn có error message, ngay cả khi response body rỗng
      if (!errorMessage || errorMessage === `Request failed ${res.status}`) {
        // Nếu không có message từ response, tạo message từ status code
        const statusMessages: Record<number, string> = {
          400: "Yêu cầu không hợp lệ",
          401: "Không có quyền truy cập",
          403: "Bị từ chối truy cập",
          404: "Không tìm thấy chuyến đi",
          409: "Xung đột dữ liệu",
          422: "Dữ liệu không hợp lệ",
          429: "Quá nhiều yêu cầu, vui lòng thử lại sau",
          500: "Lỗi server, vui lòng thử lại sau",
          502: "Lỗi gateway",
          503: "Service không khả dụng",
        };
        errorMessage =
          statusMessages[res.status] ||
          `HTTP ${res.status}: ${res.statusText || "Request failed"}`;
      }

      // 🔥 Log chi tiết hơn để debug - chỉ log khi có thông tin hữu ích
      if (errorMessage && errorMessage !== `Request failed ${res.status}`) {
        console.error("[trip.service] Error details:", {
          status: res.status,
          statusText: res.statusText,
          errorCode,
          message: errorMessage,
          url,
          ...(Object.keys(errorData).length > 0 ? { data: errorData } : {}),
          ...(rawText && rawText.length > 0
            ? { rawTextPreview: rawText.substring(0, 200) }
            : {}),
        });
      } else {
        // Chỉ log minimal info khi không có error message chi tiết
        console.warn(
          `[trip.service] Request failed: ${res.status} ${res.statusText}`,
          url
        );
      }
    } catch (parseError: any) {
      console.error("[trip.service] Failed to parse error response:", {
        parseError: parseError?.message || parseError,
        parseErrorStack: parseError?.stack,
        status: res.status,
        statusText: res.statusText,
        url,
        rawText: rawText.substring(0, 200),
      });
      errorMessage = res.statusText || `HTTP ${res.status}: Request failed`;
    }

    // 🔥 Đảm bảo error message không rỗng
    const finalErrorMessage =
      errorMessage || `HTTP ${res.status}: Request failed`;

    const error = new Error(finalErrorMessage);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).errorCode = errorCode;
    (error as any).errorData = errorData;
    (error as any).rawText = rawText;
    (error as any).url = url;
    // Không attach response object vì đã được consume
    throw error;
  }

  // Parse successful response
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function startTrip(tripId: number | string) {
  if (API_BASE) {
    try {
      // Try trip start first (most common)
      return await postJSON(`${API_BASE}/trips/${tripId}/start`, {});
    } catch (err: any) {
      try {
        // Fallback: if a schedule endpoint exists and the id is schedule id
        return await postJSON(`${API_BASE}/schedules/${tripId}/status`, {
          trangThai: "dang_chay",
        });
      } catch (err2) {
        throw err;
      }
    }
  }
  // Fallback: fire a DOM event so UI can react; in real app, socketService.updateTripStatus
  try {
    window.dispatchEvent(
      new CustomEvent("tripStarted", { detail: { tripId } })
    );
  } catch {}
  return { ok: true };
}

// Strict version: always call trips endpoint directly (no schedule fallback)
export async function startTripStrict(tripId: number | string) {
  if (API_BASE) {
    return await postJSON(`${API_BASE}/trips/${tripId}/start`, {});
  }
  try {
    window.dispatchEvent(
      new CustomEvent("tripStarted", { detail: { tripId } })
    );
  } catch {}
  return { ok: true };
}

export async function endTrip(tripId: number | string) {
  if (API_BASE) {
    try {
      return await postJSON(`${API_BASE}/trips/${tripId}/end`, {});
    } catch (err: any) {
      // Fallback to schedules status endpoint (if BE supports it)
      try {
        return await postJSON(`${API_BASE}/schedules/${tripId}/status`, {
          trangThai: "hoan_thanh",
        });
      } catch (err2) {
        throw err;
      }
    }
  }
  try {
    window.dispatchEvent(
      new CustomEvent("tripCompleted", { detail: { tripId } })
    );
  } catch {}
  return { ok: true };
}

export async function cancelTrip(tripId: number | string, lyDoHuy?: string) {
  if (API_BASE) {
    try {
      return await postJSON(`${API_BASE}/trips/${tripId}/cancel`, { lyDoHuy });
    } catch (err: any) {
      throw err;
    }
  }
  try {
    window.dispatchEvent(
      new CustomEvent("tripCancelled", { detail: { tripId, lyDoHuy } })
    );
  } catch {}
  return { ok: true };
}

// Check if driver has active trips
export async function getActiveTrips(driverId?: number) {
  if (API_BASE) {
    try {
      const url = driverId
        ? `${API_BASE}/trips?maTaiXe=${driverId}&trangThai=dang_chay`
        : `${API_BASE}/trips?trangThai=dang_chay`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("ssb_token")
            ? { Authorization: `Bearer ${localStorage.getItem("ssb_token")}` }
            : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return data.data || data || [];
    } catch (err: any) {
      console.error("[trip.service] Failed to get active trips:", err);
      return [];
    }
  }
  return [];
}
