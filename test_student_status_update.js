// Test script to update student status and trigger notification
// Run: node test_student_status_update.js

const API_URL = "http://localhost:4000/api/v1";

// Lấy token từ login
async function getToken() {
  // Try different accounts - adjust based on your database
  const accounts = [
    { email: "admin@schoolbus.vn", matKhau: "password" },
    { email: "taixe1@schoolbus.vn", matKhau: "password" },
    { email: "admin@ssb.vn", matKhau: "password" },
  ];

  let loginData = null;

  for (const account of accounts) {
    console.log(`Trying to login with: ${account.email}`);
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(account),
    });

    loginData = await response.json();
    if (loginData.success) {
      console.log(`✅ Login successful with: ${account.email}\n`);
      return loginData.data.token;
    } else {
      console.log(`❌ Failed with ${account.email}: ${loginData.message}`);
    }
  }

  throw new Error(
    "Login failed with all accounts. Please check database or credentials."
  );
}

// Update student status
async function updateStudentStatus(token, tripId, studentId, status) {
  console.log(
    `\n🔔 Updating student ${studentId} in trip ${tripId} to "${status}"...`
  );

  const response = await fetch(
    `${API_URL}/trips/${tripId}/students/${studentId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trangThai: status,
        ghiChu: `Test update via script at ${new Date().toISOString()}`,
      }),
    }
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Failed to update: ${data.message}`);
  }

  console.log("✅ Student status updated successfully");
  return data;
}

// Main
async function main() {
  try {
    console.log("🚀 Starting test...\n");

    // Login
    const token = await getToken();

    // Test scenarios
    const tripId = 1;
    const studentId = 1; // Nguyễn Gia Bảo

    console.log("📝 Test 1: Reset student to 'cho_don' first...");
    await updateStudentStatus(token, tripId, studentId, "cho_don");

    console.log("\n⏳ Wait 2 seconds...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(
      "📝 Test 2: Update to 'da_don' (should trigger notification)..."
    );
    await updateStudentStatus(token, tripId, studentId, "da_don");

    console.log("\n⏳ Wait 2 seconds...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("📝 Test 3: Reset to 'cho_don' again...");
    await updateStudentStatus(token, tripId, studentId, "cho_don");

    console.log("\n⏳ Wait 2 seconds...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("📝 Test 4: Update to 'vang' (should trigger notification)...");
    await updateStudentStatus(token, tripId, studentId, "vang");

    console.log("\n✅ All tests completed!");
    console.log("📋 Summary:");
    console.log("   - Reset to cho_don: ✅");
    console.log("   - Update to da_don: ✅ (should see notification)");
    console.log("   - Reset to cho_don: ✅");
    console.log("   - Update to vang: ✅ (should see notification)");
    console.log("\n🔍 Check backend terminal for notification logs:");
    console.log("   - Look for [Student Pickup] logs");
    console.log("   - Look for [Student Absent] logs");
    console.log("\n👀 Check parent frontend for notifications");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
  }
}

main();
