/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔥 FIREBASE READINESS CHECK - Day 5 Preparation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("\n" + "═".repeat(70));
console.log("🔥 FIREBASE SETUP VERIFICATION - Day 5 Preparation");
console.log("═".repeat(70) + "\n");

// ─────────────────────────────────────────────────────────────────────────
// 1️⃣ Kiểm tra serviceAccountKey.json
// ─────────────────────────────────────────────────────────────────────────
const serviceAccountPath = resolve(
  __dirname,
  "src/config/serviceAccountKey.json"
);
const hasServiceAccount = existsSync(serviceAccountPath);

if (hasServiceAccount) {
  console.log("✅ [1/4] serviceAccountKey.json: FOUND");
  try {
    const serviceAccount = await import("./src/config/serviceAccountKey.json", {
      assert: { type: "json" },
    });
    console.log(`   📦 Project ID: ${serviceAccount.default.project_id}`);
    console.log(`   📧 Client Email: ${serviceAccount.default.client_email}`);
  } catch (err) {
    console.log("   ⚠️  File exists but cannot read:", err.message);
  }
} else {
  console.log("❌ [1/4] serviceAccountKey.json: NOT FOUND");
  console.log("   📍 Expected location:", serviceAccountPath);
}

// ─────────────────────────────────────────────────────────────────────────
// 2️⃣ Kiểm tra .env có FIREBASE_DB_URL
// ─────────────────────────────────────────────────────────────────────────
const envPath = resolve(__dirname, ".env");
const hasEnv = existsSync(envPath);

if (hasEnv) {
  console.log("\n✅ [2/4] .env file: FOUND");
  try {
    const { readFileSync } = await import("fs");
    const envContent = readFileSync(envPath, "utf-8");

    if (envContent.includes("FIREBASE_DB_URL=https://ssb-tracking-system")) {
      console.log("   ✅ FIREBASE_DB_URL: CONFIGURED");
      const match = envContent.match(/FIREBASE_DB_URL=(.*)/);
      if (match) {
        console.log(`   🌐 URL: ${match[1]}`);
      }
    } else {
      console.log("   ⚠️  FIREBASE_DB_URL: NOT SET or using placeholder");
    }
  } catch (err) {
    console.log("   ⚠️  Cannot read .env:", err.message);
  }
} else {
  console.log("\n❌ [2/4] .env file: NOT FOUND");
}

// ─────────────────────────────────────────────────────────────────────────
// 3️⃣ Kiểm tra test_firebase.js
// ─────────────────────────────────────────────────────────────────────────
const testFirebasePath = resolve(__dirname, "src/test_firebase.js");
const hasTestFile = existsSync(testFirebasePath);

if (hasTestFile) {
  console.log("\n✅ [3/4] test_firebase.js: FOUND");
  console.log("   📝 Can run: node src/test_firebase.js");
} else {
  console.log("\n⚠️  [3/4] test_firebase.js: NOT FOUND (optional)");
}

// ─────────────────────────────────────────────────────────────────────────
// 4️⃣ Kiểm tra firebase-admin dependency
// ─────────────────────────────────────────────────────────────────────────
const packageJsonPath = resolve(__dirname, "package.json");
try {
  const packageJson = await import("./package.json", {
    assert: { type: "json" },
  });
  const hasFirebaseAdmin = packageJson.default.dependencies?.["firebase-admin"];

  if (hasFirebaseAdmin) {
    console.log("\n✅ [4/4] firebase-admin package: INSTALLED");
    console.log(`   📦 Version: ${hasFirebaseAdmin}`);
  } else {
    console.log("\n⚠️  [4/4] firebase-admin package: NOT IN package.json");
    console.log("   💡 Run: npm install firebase-admin");
  }
} catch (err) {
  console.log("\n⚠️  [4/4] Cannot read package.json:", err.message);
}

// ─────────────────────────────────────────────────────────────────────────
// 📊 SUMMARY
// ─────────────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(70));
console.log("📊 SUMMARY FOR DAY 5");
console.log("─".repeat(70));

const readyCount = [hasServiceAccount, hasEnv, hasTestFile].filter(
  Boolean
).length;

if (readyCount === 3) {
  console.log("\n🎉 FIREBASE SETUP: READY FOR DAY 5!");
  console.log("\n✅ Next steps:");
  console.log("   1. Wait for P.Thái to complete Day 4 (FE Maps setup)");
  console.log(
    "   2. Tomorrow (Day 5): Integrate Firebase sync in telemetryService.js"
  );
  console.log("   3. Add push notifications support");
} else {
  console.log("\n⚠️  FIREBASE SETUP: NEEDS ATTENTION");
  console.log(`   ${readyCount}/3 checks passed`);
  console.log("\n📝 Todo:");
  if (!hasServiceAccount)
    console.log("   - Add serviceAccountKey.json to src/config/");
  if (!hasEnv) console.log("   - Create .env file with FIREBASE_DB_URL");
}

console.log("\n" + "═".repeat(70) + "\n");
