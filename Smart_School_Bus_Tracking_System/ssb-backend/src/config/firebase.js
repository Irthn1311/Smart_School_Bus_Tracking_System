/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔥 FIREBASE CONFIGURATION - Day 5
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Initialize Firebase Admin SDK for:
 * - Realtime Database (bus position sync)
 * - Cloud Messaging (push notifications)
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-30 (Day 5)
 */

import admin from "firebase-admin";
import { createRequire } from "node:module";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import dotenv from "dotenv";

// Load environment variables (ensure .env is loaded before reading serviceAccountKey)
dotenv.config({ path: path.join(dirname(fileURLToPath(import.meta.url)), "../../.env") });

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// 1️⃣ LOAD SERVICE ACCOUNT KEY
// ═══════════════════════════════════════════════════════════════════════════
let serviceAccount;
try {
  serviceAccount = require("./serviceAccountKey.json");
  
  // Replace ${FIREBASE_PRIVATE_KEY} placeholder with actual value from .env
  if (serviceAccount.private_key === "${FIREBASE_PRIVATE_KEY}") {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error(
        "FIREBASE_PRIVATE_KEY is not set in .env file. Please add FIREBASE_PRIVATE_KEY to your .env file."
      );
    }
    
    // Replace \n with actual newlines (private keys in .env often use \n as string)
    serviceAccount.private_key = privateKey.replace(/\\n/g, "\n");
    console.log("✅ [Firebase] Service account loaded with private key from .env");
  } else {
    console.log("✅ [Firebase] Service account loaded");
  }
} catch (error) {
  console.error(
    "❌ [Firebase] Cannot load serviceAccountKey.json:",
    error.message
  );
  throw new Error(
    "Firebase service account key not found. Please add serviceAccountKey.json to src/config/"
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2️⃣ INITIALIZE FIREBASE ADMIN
// ═══════════════════════════════════════════════════════════════════════════
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DB_URL ||
      "https://ssb-tracking-system-default-rtdb.asia-southeast1.firebasedatabase.app/",
  });
  console.log("✅ [Firebase] Admin SDK initialized");
} else {
  console.log("ℹ️  [Firebase] Already initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3️⃣ EXPORT FIREBASE SERVICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Firebase Realtime Database instance
 * Used for: Bus position sync, trip status, live data
 * @type {admin.database.Database}
 */
export const firebaseDB = admin.database();

/**
 * Firebase Cloud Messaging instance
 * Used for: Push notifications to parents/drivers
 * @type {admin.messaging.Messaging}
 */
export const firebaseMessaging = admin.messaging();

/**
 * Firebase Admin instance
 * Used for: Advanced operations
 * @type {typeof admin}
 */
export const firebaseAdmin = admin;

// ═══════════════════════════════════════════════════════════════════════════
// 4️⃣ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test Firebase connection
 * @returns {Promise<boolean>}
 */
export async function testFirebaseConnection() {
  try {
    const testRef = firebaseDB.ref("_health_check");
    await testRef.set({
      status: "ok",
      timestamp: Date.now(),
      server: "ssb-backend",
    });
    console.log("✅ [Firebase] Connection test: SUCCESS");

    // Cleanup test data
    await testRef.remove();
    return true;
  } catch (error) {
    console.error("❌ [Firebase] Connection test: FAILED", error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5️⃣ EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════
export default {
  db: firebaseDB,
  messaging: firebaseMessaging,
  admin: firebaseAdmin,
  testConnection: testFirebaseConnection,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * // Import trong service:
 * import { firebaseDB, firebaseMessaging } from '../config/firebase.js';
 *
 * // Realtime Database:
 * const ref = firebaseDB.ref('bus_positions/1');
 * await ref.set({ lat: 21.0285, lng: 105.8542 });
 *
 * // Cloud Messaging:
 * await firebaseMessaging.send({
 *   token: 'device-token',
 *   notification: { title: 'Xe sắp đến!', body: 'Chuẩn bị đón con nhé!' }
 * });
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
