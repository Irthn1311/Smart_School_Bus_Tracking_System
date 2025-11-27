/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔄 FIREBASE SYNC SERVICE - Day 5
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Sync bus positions to Firebase Realtime Database
 * - Provides fallback when WebSocket connection is lost
 * - Allows FE to read realtime data even without active Socket.IO connection
 * - Acts as cache layer for GPS data
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-30 (Day 5)
 */

import { firebaseDB } from "../config/firebase.js";

// ═══════════════════════════════════════════════════════════════════════════
// 📍 SYNC BUS LOCATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sync bus position to Firebase Realtime Database
 * @param {number} busId - ID of the bus
 * @param {Object} data - Position data
 * @param {number} data.tripId - Current trip ID
 * @param {number} data.lat - Latitude
 * @param {number} data.lng - Longitude
 * @param {number} [data.speed] - Speed in km/h
 * @param {number} [data.heading] - Heading in degrees
 * @param {string} [data.timestamp] - ISO timestamp
 * @returns {Promise<boolean>} - Success status
 */
export async function syncBusLocation(busId, data) {
  try {
    const ref = firebaseDB.ref(`bus_positions/${busId}`);

    const payload = {
      tripId: data.tripId,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed || 0,
      heading: data.heading || 0,
      timestamp: data.timestamp || new Date().toISOString(),
      updatedAt: Date.now(), // Server timestamp for ordering
    };

    await ref.set(payload);

    console.log(`🔄 [Firebase Sync] Bus ${busId} → (${data.lat}, ${data.lng})`);
    return true;
  } catch (error) {
    console.error(`❌ [Firebase Sync] Error for bus ${busId}:`, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ SYNC TRIP STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sync trip status to Firebase
 * @param {number} tripId - Trip ID
 * @param {Object} data - Trip status data
 * @returns {Promise<boolean>}
 */
export async function syncTripStatus(tripId, data) {
  try {
    const ref = firebaseDB.ref(`trip_status/${tripId}`);

    const payload = {
      ...data,
      updatedAt: Date.now(),
    };

    await ref.set(payload);

    console.log(`🔄 [Firebase Sync] Trip ${tripId} status: ${data.status}`);
    return true;
  } catch (error) {
    console.error(
      `❌ [Firebase Sync] Error for trip ${tripId}:`,
      error.message
    );
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 SYNC TRIP HISTORY (OPTIONAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save GPS history point for trip
 * @param {number} tripId - Trip ID
 * @param {Object} data - GPS data
 * @returns {Promise<boolean>}
 */
export async function saveTripHistory(tripId, data) {
  try {
    const ref = firebaseDB.ref(`trip_history/${tripId}`);
    const newPointRef = ref.push(); // Auto-generate unique key

    await newPointRef.set({
      lat: data.lat,
      lng: data.lng,
      speed: data.speed || 0,
      heading: data.heading || 0,
      timestamp: Date.now(),
    });

    console.log(`📊 [Firebase History] Trip ${tripId} point saved`);
    return true;
  } catch (error) {
    console.error(`❌ [Firebase History] Error:`, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clear bus position when trip ends
 * @param {number} busId - Bus ID
 * @returns {Promise<boolean>}
 */
export async function clearBusPosition(busId) {
  try {
    const ref = firebaseDB.ref(`bus_positions/${busId}`);
    await ref.remove();

    console.log(`🧹 [Firebase Cleanup] Bus ${busId} position cleared`);
    return true;
  } catch (error) {
    console.error(`❌ [Firebase Cleanup] Error:`, error.message);
    return false;
  }
}

/**
 * Clear trip status when completed
 * @param {number} tripId - Trip ID
 * @returns {Promise<boolean>}
 */
export async function clearTripStatus(tripId) {
  try {
    const ref = firebaseDB.ref(`trip_status/${tripId}`);
    await ref.remove();

    console.log(`🧹 [Firebase Cleanup] Trip ${tripId} status cleared`);
    return true;
  } catch (error) {
    console.error(`❌ [Firebase Cleanup] Error:`, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📖 EXPORT ALL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  syncBusLocation,
  syncTripStatus,
  saveTripHistory,
  clearBusPosition,
  clearTripStatus,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * // 1. Sync bus location after receiving GPS:
 * import { syncBusLocation } from './firebaseSync.service.js';
 *
 * await syncBusLocation(busId, {
 *   tripId: 2,
 *   lat: 21.0285,
 *   lng: 105.8542,
 *   speed: 35,
 *   heading: 90,
 * });
 *
 * // 2. Update trip status:
 * await syncTripStatus(tripId, {
 *   status: 'dang_chay',
 *   busId: 1,
 *   currentStopIndex: 2,
 * });
 *
 * // 3. Save history point (for replay):
 * await saveTripHistory(tripId, { lat, lng, speed, heading });
 *
 * // 4. Cleanup on trip end:
 * await clearBusPosition(busId);
 * await clearTripStatus(tripId);
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🔍 FIREBASE STRUCTURE:
 *
 * /bus_positions
 *   /1
 *     tripId: 2
 *     lat: 21.0285
 *     lng: 105.8542
 *     speed: 35
 *     heading: 90
 *     timestamp: "2025-10-30T10:30:00Z"
 *     updatedAt: 1698662400000
 *
 * /trip_status
 *   /2
 *     status: "dang_chay"
 *     busId: 1
 *     currentStopIndex: 2
 *     updatedAt: 1698662400000
 *
 * /trip_history
 *   /2
 *     /-abc123
 *       lat: 21.0285
 *       lng: 105.8542
 *       speed: 35
 *       timestamp: 1698662400000
 *     /-def456
 *       ...
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
