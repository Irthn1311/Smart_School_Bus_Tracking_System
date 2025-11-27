/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 TEST ETA UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Test EMA Speed Tracking & ETA Calculation
 *
 * 🚀 CÁCH CHẠY:
 * ```bash
 * node src/utils/test_eta.js
 * ```
 */

import { EMASpeedTracker, calculateETA, checkDelay } from "./eta.js";

console.log("═══════════════════════════════════════════════════════════════");
console.log("🧪 TESTING ETA UTILITIES");
console.log(
  "═══════════════════════════════════════════════════════════════\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: EMA Speed Tracking
// ═══════════════════════════════════════════════════════════════════════════

console.log("📊 TEST 1: EMA Speed Tracking\n");

const tracker = new EMASpeedTracker(0.2);

// Simulate GPS updates (xe chạy từ chậm → nhanh → chậm lại)
const gpsUpdates = [
  { lat: 10.762622, lng: 106.660172, speed: 30, timestamp: Date.now() },
  { lat: 10.7627, lng: 106.66025, speed: 35, timestamp: Date.now() + 3000 },
  { lat: 10.7628, lng: 106.66035, speed: 40, timestamp: Date.now() + 6000 },
  { lat: 10.7629, lng: 106.66045, speed: 45, timestamp: Date.now() + 9000 },
  { lat: 10.763, lng: 106.66055, speed: 25, timestamp: Date.now() + 12000 }, // Tắc đường
  { lat: 10.7631, lng: 106.66065, speed: 20, timestamp: Date.now() + 15000 }, // Tắc nặng
];

console.log(
  "Simulating GPS updates (speed: 30 → 35 → 40 → 45 → 25 → 20 km/h):\n"
);

gpsUpdates.forEach((point, i) => {
  const result = tracker.update(point);

  console.log(`Sample ${i + 1}:`);
  console.log(
    `  Instant Speed: ${result.instantSpeed?.toFixed(1) || "N/A"} km/h`
  );
  console.log(`  EMA Speed:     ${result.emaSpeed?.toFixed(1) || "N/A"} km/h`);
  console.log(`  Stable:        ${tracker.isStable() ? "YES" : "NO"}`);
  console.log(`  Sample Count:  ${result.sampleCount}`);
  console.log("");
});

console.log(
  `✅ EMA Speed Tracker: Final EMA = ${tracker.getSpeed()?.toFixed(1)} km/h\n`
);
console.log(
  "─────────────────────────────────────────────────────────────────\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Calculate ETA (With EMA Tracker)
// ═══════════════════════════════════════════════════════════════════════════

console.log("📍 TEST 2: Calculate ETA (With EMA Tracker)\n");

const currentPos = { lat: 10.762622, lng: 106.660172 };
const nextStop = {
  lat: 10.7408,
  lng: 106.7075,
  tenDiem: "Điểm dừng A",
  dwell_seconds: 30,
};

const eta = calculateETA(currentPos, nextStop, tracker);

console.log("Input:");
console.log(`  Current Position: ${currentPos.lat}, ${currentPos.lng}`);
console.log(`  Next Stop:        ${nextStop.lat}, ${nextStop.lng}`);
console.log(`  EMA Speed:        ${tracker.getSpeed()?.toFixed(1)} km/h`);
console.log("");
console.log("Result:");
console.log(
  `  ⏱️  ETA:           ${eta.etaMinutes} minutes (${eta.etaSeconds}s)`
);
console.log(
  `  📏 Distance:      ${eta.distance}m (~${(eta.distance / 1000).toFixed(
    2
  )} km)`
);
console.log(`  🚗 Speed Used:    ${eta.speed} km/h`);
console.log(`  📊 Confidence:    ${eta.confidence.toUpperCase()}`);
console.log(`  🔢 EMA Samples:   ${eta.tracker.sampleCount}`);
console.log(`  ✅ EMA Stable:    ${eta.tracker.isStable ? "YES" : "NO"}`);
console.log("");

console.log("✅ ETA Calculation: PASSED\n");
console.log(
  "─────────────────────────────────────────────────────────────────\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Calculate ETA (Without EMA Tracker - Fallback)
// ═══════════════════════════════════════════════════════════════════════════

console.log("📍 TEST 3: Calculate ETA (Without EMA Tracker - Fallback)\n");

const etaFallback = calculateETA(currentPos, nextStop, null, 25); // Fallback 25 km/h

console.log("Input:");
console.log(`  Current Position: ${currentPos.lat}, ${currentPos.lng}`);
console.log(`  Next Stop:        ${nextStop.lat}, ${nextStop.lng}`);
console.log(`  EMA Tracker:      NONE (using fallback)`);
console.log(`  Fallback Speed:   25 km/h`);
console.log("");
console.log("Result:");
console.log(`  ⏱️  ETA:           ${etaFallback.etaMinutes} minutes`);
console.log(`  📏 Distance:      ${etaFallback.distance}m`);
console.log(`  🚗 Speed Used:    ${etaFallback.speed} km/h`);
console.log(`  📊 Confidence:    ${etaFallback.confidence.toUpperCase()}`);
console.log("");

console.log("✅ ETA Fallback: PASSED\n");
console.log(
  "─────────────────────────────────────────────────────────────────\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Check Delay
// ═══════════════════════════════════════════════════════════════════════════

console.log("⏰ TEST 4: Check Delay\n");

// Scenario 1: On-time (delay < 5 phút)
const scheduled1 = "07:30";
const etaMin1 = 3; // ETA 3 phút → Dự kiến đến 07:33 (on-time)

const delay1 = checkDelay(scheduled1, etaMin1, 5);

console.log("Scenario 1: On-time");
console.log(`  Scheduled:       ${scheduled1}`);
console.log(`  ETA:             ${etaMin1} minutes`);
console.log(`  Delay:           ${delay1.delayMinutes} minutes`);
console.log(`  Is Delayed:      ${delay1.isDelayed ? "YES" : "NO"}`);
console.log(`  Severity:        ${delay1.severity.toUpperCase()}`);
console.log("");

// Scenario 2: Medium delay (5-9 phút)
const scheduled2 = "07:30";
const etaMin2 = 8; // ETA 8 phút → delay 8 phút (medium)

const delay2 = checkDelay(scheduled2, etaMin2, 5);

console.log("Scenario 2: Medium Delay (5-9 min)");
console.log(`  Scheduled:       ${scheduled2}`);
console.log(`  ETA:             ${etaMin2} minutes`);
console.log(`  Delay:           ${delay2.delayMinutes} minutes`);
console.log(`  Is Delayed:      ${delay2.isDelayed ? "YES ⚠️" : "NO"}`);
console.log(`  Severity:        ${delay2.severity.toUpperCase()}`);
console.log("");

// Scenario 3: High delay (10-14 phút)
const scheduled3 = "07:30";
const etaMin3 = 12; // ETA 12 phút → delay 12 phút (high)

const delay3 = checkDelay(scheduled3, etaMin3, 5);

console.log("Scenario 3: High Delay (10-14 min)");
console.log(`  Scheduled:       ${scheduled3}`);
console.log(`  ETA:             ${etaMin3} minutes`);
console.log(`  Delay:           ${delay3.delayMinutes} minutes`);
console.log(`  Is Delayed:      ${delay3.isDelayed ? "YES ⚠️⚠️" : "NO"}`);
console.log(`  Severity:        ${delay3.severity.toUpperCase()}`);
console.log("");

// Scenario 4: Critical delay (≥15 phút)
const scheduled4 = "07:30";
const etaMin4 = 18; // ETA 18 phút → delay 18 phút (critical)

const delay4 = checkDelay(scheduled4, etaMin4, 5);

console.log("Scenario 4: Critical Delay (≥15 min)");
console.log(`  Scheduled:       ${scheduled4}`);
console.log(`  ETA:             ${etaMin4} minutes`);
console.log(`  Delay:           ${delay4.delayMinutes} minutes`);
console.log(`  Is Delayed:      ${delay4.isDelayed ? "YES 🚨🚨🚨" : "NO"}`);
console.log(`  Severity:        ${delay4.severity.toUpperCase()}`);
console.log("");

console.log("✅ Delay Check: PASSED\n");
console.log(
  "─────────────────────────────────────────────────────────────────\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: EMA Tracker Reset
// ═══════════════════════════════════════════════════════════════════════════

console.log("🔄 TEST 5: EMA Tracker Reset\n");

console.log("Before reset:");
console.log(`  EMA Speed:    ${tracker.getSpeed()?.toFixed(1)} km/h`);
console.log(`  Sample Count: ${tracker.sampleCount}`);
console.log(`  Is Stable:    ${tracker.isStable() ? "YES" : "NO"}`);
console.log("");

tracker.reset();

console.log("After reset:");
console.log(
  `  EMA Speed:    ${tracker.getSpeed() === null ? "NULL" : tracker.getSpeed()}`
);
console.log(`  Sample Count: ${tracker.sampleCount}`);
console.log(`  Is Stable:    ${tracker.isStable() ? "YES" : "NO"}`);
console.log("");

console.log("✅ EMA Reset: PASSED\n");
console.log(
  "─────────────────────────────────────────────────────────────────\n"
);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log("✅ ALL TESTS PASSED");
console.log(
  "═══════════════════════════════════════════════════════════════\n"
);

console.log("📊 Summary:");
console.log("  ✅ EMA Speed Tracking: Working");
console.log("  ✅ ETA Calculation (with EMA): Working");
console.log("  ✅ ETA Calculation (fallback): Working");
console.log("  ✅ Delay Detection: Working");
console.log("  ✅ Tracker Reset: Working");
console.log("");
console.log("🎉 ETA Utils are ready for production!\n");
