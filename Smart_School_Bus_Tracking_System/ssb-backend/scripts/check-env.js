#!/usr/bin/env node
/**
 * Script để kiểm tra environment variables, đặc biệt là MAPS_API_KEY
 * Chạy: node scripts/check-env.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=".repeat(60));
console.log("🔍 Kiểm tra Environment Variables");
console.log("=".repeat(60));

// Check possible .env locations
const possibleEnvPaths = [
  path.join(__dirname, "../.env"),           // ssb-backend/.env
  path.join(__dirname, "../../.env"),       // root/.env
  path.join(__dirname, "../.env.local"),    // ssb-backend/.env.local
  path.join(__dirname, "../../.env.local"),  // root/.env.local
];

console.log("\n📁 Kiểm tra các vị trí file .env:");
let foundEnvFile = null;
for (const envPath of possibleEnvPaths) {
  const exists = existsSync(envPath);
  const status = exists ? "✅ TỒN TẠI" : "❌ KHÔNG TỒN TẠI";
  console.log(`  ${status}: ${envPath}`);
  if (exists && !foundEnvFile) {
    foundEnvFile = envPath;
  }
}

// Try to load from found .env file
if (foundEnvFile) {
  console.log(`\n📂 Đang load từ: ${foundEnvFile}`);
  dotenv.config({ path: foundEnvFile });
} else {
  console.log("\n⚠️  Không tìm thấy file .env, thử load mặc định...");
  dotenv.config();
}

// Check critical environment variables
console.log("\n🔑 Kiểm tra các biến môi trường quan trọng:");
const criticalVars = {
  "MAPS_API_KEY": process.env.MAPS_API_KEY,
  "DB_HOST": process.env.DB_HOST,
  "DB_NAME": process.env.DB_NAME,
  "JWT_SECRET": process.env.JWT_SECRET,
  "PORT": process.env.PORT,
};

for (const [key, value] of Object.entries(criticalVars)) {
  if (value) {
    const masked = key.includes("SECRET") || key.includes("KEY") 
      ? (value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "***")
      : value;
    console.log(`  ✅ ${key}: ${masked}`);
  } else {
    console.log(`  ❌ ${key}: UNDEFINED`);
  }
}

// Check MAPS_API_KEY specifically
console.log("\n🗺️  Kiểm tra MAPS_API_KEY:");
if (process.env.MAPS_API_KEY) {
  const key = process.env.MAPS_API_KEY;
  console.log(`  ✅ MAPS_API_KEY đã được load`);
  console.log(`  📏 Độ dài: ${key.length} ký tự`);
  console.log(`  🔐 Masked: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`);
  
  // Check if it looks like a valid Google Maps API key
  if (key.startsWith("AIza")) {
    console.log(`  ✅ Format hợp lệ (bắt đầu với AIza)`);
  } else {
    console.log(`  ⚠️  Format không giống Google Maps API key (thường bắt đầu với AIza)`);
  }
} else {
  console.log(`  ❌ MAPS_API_KEY KHÔNG TỒN TẠI!`);
  console.log(`\n💡 Hướng dẫn sửa lỗi:`);
  console.log(`  1. Tạo file .env trong thư mục ssb-backend/ hoặc root/`);
  console.log(`  2. Thêm dòng: MAPS_API_KEY=your_api_key_here`);
  console.log(`  3. Restart server`);
}

// Show all MAPS-related env vars
const mapsVars = Object.keys(process.env).filter(k => k.includes("MAPS"));
if (mapsVars.length > 0) {
  console.log(`\n📋 Tất cả biến môi trường liên quan đến MAPS:`);
  mapsVars.forEach(key => {
    const value = process.env[key];
    const masked = value && value.length > 8 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : value || "undefined";
    console.log(`  - ${key}: ${masked}`);
  });
}

console.log("\n" + "=".repeat(60));
console.log("Current working directory:", process.cwd());
console.log("=".repeat(60));

