/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📨 FIREBASE PUSH NOTIFICATION SERVICE - Day 5
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Send push notifications to mobile devices via Firebase Cloud Messaging
 * - Notify parents when bus approaches their stop
 * - Alert when trip is delayed
 * - Send trip status updates
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-30 (Day 5)
 */

import { firebaseMessaging } from "../config/firebase.js";

// ═══════════════════════════════════════════════════════════════════════════
// 📤 SEND PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Additional data payload
 * @returns {Promise<Object>} - Result with success/failure counts
 */
export async function sendPushNotification(tokens, title, body, data = {}) {
  // Validate inputs
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    console.warn("⚠️  [Push] No tokens provided, skipping notification");
    return { successCount: 0, failureCount: 0 };
  }

  if (!title || !body) {
    console.error("❌ [Push] Title and body are required");
    throw new Error("Title and body are required for push notifications");
  }

  try {
    // Convert all data values to strings (FCM requirement)
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }

    // Prepare message
    const message = {
      notification: {
        title,
        body,
      },
      data: stringData,
      tokens, // Send to multiple devices
    };

    // Send multicast message
    const response = await firebaseMessaging.sendEachForMulticast(message);

    console.log(`📨 [Push] Sent to ${tokens.length} devices:`);
    console.log(`   ✅ Success: ${response.successCount}`);
    console.log(`   ❌ Failed: ${response.failureCount}`);

    // Log individual failures for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`   ❌ Token ${idx}: ${resp.error?.message}`);
        }
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error("❌ [Push] Error sending notification:", error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SPECIALIZED NOTIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send "bus approaching stop" notification
 * @param {string[]} parentTokens - Parent device tokens
 * @param {Object} data - Stop data
 * @returns {Promise<Object>}
 */
export async function notifyApproachStop(parentTokens, data) {
  const { stopName, distance_m, eta_seconds, tripId, stopId } = data;

  const title = "🚌 Xe sắp đến!";
  const body = `Xe gần điểm dừng "${stopName}" (${distance_m}m, ~${Math.round(
    eta_seconds / 60
  )} phút)`;

  const payload = {
    type: "approach_stop",
    tripId: String(tripId),
    stopId: String(stopId),
    stopName,
    distance: String(distance_m),
    eta: String(eta_seconds),
  };

  return await sendPushNotification(parentTokens, title, body, payload);
}

/**
 * Send "trip delayed" notification
 * @param {string[]} tokens - Device tokens (parents + admins)
 * @param {Object} data - Delay data
 * @returns {Promise<Object>}
 */
export async function notifyDelay(tokens, data) {
  const { delay_min, stopName, tripId } = data;

  const title = "⏰ Xe bị trễ";
  const body = `Chuyến đi bị trễ ${delay_min} phút tại "${stopName}"`;

  const payload = {
    type: "delay_alert",
    tripId: String(tripId),
    delayMinutes: String(delay_min),
    stopName,
  };

  return await sendPushNotification(tokens, title, body, payload);
}

/**
 * Send "trip started" notification
 * @param {string[]} tokens - Parent device tokens
 * @param {Object} data - Trip data
 * @returns {Promise<Object>}
 */
export async function notifyTripStarted(tokens, data) {
  const { tripId, routeName } = data;

  const title = "🚀 Chuyến đi bắt đầu";
  const body = `Xe đã khởi hành trên tuyến "${routeName}"`;

  const payload = {
    type: "trip_started",
    tripId: String(tripId),
    routeName,
  };

  return await sendPushNotification(tokens, title, body, payload);
}

/**
 * Send "trip completed" notification
 * @param {string[]} tokens - Parent device tokens
 * @param {Object} data - Trip data
 * @returns {Promise<Object>}
 */
export async function notifyTripCompleted(tokens, data) {
  const { tripId, routeName } = data;

  const title = "🏁 Chuyến đi hoàn thành";
  const body = `Xe đã hoàn thành tuyến "${routeName}"`;

  const payload = {
    type: "trip_completed",
    tripId: String(tripId),
    routeName,
  };

  return await sendPushNotification(tokens, title, body, payload);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate FCM token format
 * @param {string} token - FCM token
 * @returns {boolean}
 */
export function isValidFCMToken(token) {
  // FCM tokens are typically 140-200 characters
  return typeof token === "string" && token.length > 100;
}

/**
 * Filter out invalid tokens
 * @param {string[]} tokens - Array of tokens
 * @returns {string[]} - Valid tokens only
 */
export function filterValidTokens(tokens) {
  if (!Array.isArray(tokens)) return [];
  return tokens.filter(isValidFCMToken);
}

// ═══════════════════════════════════════════════════════════════════════════
// 📖 EXPORT ALL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  sendPushNotification,
  notifyApproachStop,
  notifyDelay,
  notifyTripStarted,
  notifyTripCompleted,
  isValidFCMToken,
  filterValidTokens,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * // 1. Import in telemetryService.js:
 * import { notifyApproachStop, notifyDelay } from './firebaseNotify.service.js';
 *
 * // 2. When bus approaches stop:
 * const parentTokens = await getParentTokensForStop(stopId);
 * await notifyApproachStop(parentTokens, {
 *   stopName: "Trường THCS Kim Liên",
 *   distance_m: 45,
 *   eta_seconds: 120,
 *   tripId: 2,
 *   stopId: 8
 * });
 *
 * // 3. When trip is delayed:
 * const allTokens = [...parentTokens, ...adminTokens];
 * await notifyDelay(allTokens, {
 *   delay_min: 7,
 *   stopName: "Trường THCS Kim Liên",
 *   tripId: 2
 * });
 *
 * // 4. Custom notification:
 * await sendPushNotification(
 *   ["token1", "token2"],
 *   "Custom Title",
 *   "Custom body message",
 *   { key: "value" }
 * );
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 📱 FRONTEND SETUP (for reference):
 *
 * // In React Native / Flutter app:
 * import messaging from '@react-native-firebase/messaging';
 *
 * // Get FCM token:
 * const token = await messaging().getToken();
 *
 * // Save token to backend:
 * await api.post('/users/fcm-token', { token });
 *
 * // Listen for notifications:
 * messaging().onMessage(async remoteMessage => {
 *   console.log('Notification:', remoteMessage.notification);
 *   console.log('Data:', remoteMessage.data);
 * });
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
