/**
 * M0: WebSocket Auth Demo Script
 * 
 * Tests:
 * 1. Connect Socket.IO với access token
 * 2. Nhận auth/hello event trong user-{userId} room
 * 3. PASS nếu nhận được event
 */

import { io } from "socket.io-client";

const WS_URL = process.env.WS_URL || "http://localhost:4000";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("❌ ACCESS_TOKEN environment variable is required");
  console.log("Usage: ACCESS_TOKEN=<token> node scripts/ws_auth_demo.js");
  process.exit(1);
}

console.log("🧪 M0 WebSocket Auth Demo\n");
console.log(`WS URL: ${WS_URL}`);
console.log(`Token: ${ACCESS_TOKEN.substring(0, 20)}...\n`);

const socket = io(WS_URL, {
  auth: {
    token: ACCESS_TOKEN,
  },
  transports: ["websocket"],
});

let receivedHello = false;
let timeoutId = null;

socket.on("connect", () => {
  console.log("✅ Socket.IO connected");
  console.log("   Socket ID:", socket.id);

  // Emit auth/hello after connection
  setTimeout(() => {
    console.log("\n📤 Emitting auth/hello...");
    socket.emit("auth/hello");
  }, 1000);

  // Set timeout
  timeoutId = setTimeout(() => {
    if (!receivedHello) {
      console.log("\n❌ Timeout: Did not receive auth/hello event within 5 seconds");
      socket.disconnect();
      process.exit(1);
    }
  }, 5000);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
  process.exit(1);
});

socket.on("auth/hello", (data) => {
  receivedHello = true;
  if (timeoutId) clearTimeout(timeoutId);

  console.log("\n✅ Received auth/hello event!");
  console.log("   Data:", JSON.stringify(data, null, 2));

  if (data.userId && data.email && data.role) {
    console.log("\n✅ PASS: auth/hello event received with correct data");
    socket.disconnect();
    process.exit(0);
  } else {
    console.log("\n❌ FAIL: auth/hello data missing required fields");
    socket.disconnect();
    process.exit(1);
  }
});

socket.on("welcome", (data) => {
  console.log("📨 Welcome message:", data.message);
});

socket.on("disconnect", (reason) => {
  console.log("\n🔌 Disconnected:", reason);
});

// Handle errors
socket.on("error", (error) => {
  console.error("❌ Socket error:", error);
  process.exit(1);
});

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Interrupted. Disconnecting...");
  socket.disconnect();
  process.exit(0);
});

