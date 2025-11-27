/**
 * 🔐 DEMO: SO SÁNH SECRET KEY TRONG JWT
 *
 * 🎯 MỤC ĐÍCH:
 * - Minh họa cách JWT verify so sánh secret key
 * - Giải thích tại sao secret khác → chữ ký khác → verify fail
 * - Giúp hiểu rõ cơ chế bảo mật của JWT
 *
 * 🚀 CÁCH CHẠY:
 * ```bash
 * node src/utils/test_secret_comparison.js
 * ```
 *
 * 📚 HỌC GÌ TỪ FILE NÀY?
 * - Cách token được tạo từ payload + secret
 * - Tại sao verify bằng secret ĐÚNG thì pass
 * - Tại sao verify bằng secret SAI thì fail
 * - Chữ ký (signature) thay đổi khi secret thay đổi
 *
 * @author Nguyễn Tuấn Tài - M4/M5/M6
 * @date 2025-10-27 (Educational demo)
 */

import jwt from "jsonwebtoken";

console.log("🔐 DEMO: SO SÁNH SECRET KEY TRONG JWT AUTHENTICATION");
console.log("=".repeat(70));
console.log();

// ==========================================
// BƯỚC 1: TẠO TOKEN BẰNG SECRET_A
// ==========================================
console.log("📝 BƯỚC 1: TẠO TOKEN");
console.log("-".repeat(70));

const payload = { maNguoiDung: 123, email: "test@ssb.vn" };
console.log("Payload (dữ liệu user):", JSON.stringify(payload));
console.log();

const SECRET_A = "test_secret_key_for_development_only";
console.log(`Secret Key A: "${SECRET_A}"`);
console.log();

const tokenA = jwt.sign(payload, SECRET_A);
console.log("✅ Token được tạo:");
console.log(tokenA);
console.log();

// Tách token để show 3 phần
const parts = tokenA.split(".");
console.log("📊 Token gồm 3 phần (ngăn bởi dấu '.'):");
console.log(`   1. Header:    ${parts[0]}`);
console.log(`   2. Payload:   ${parts[1]}`);
console.log(`   3. Signature: ${parts[2]} ← Chữ ký tạo từ SECRET_A`);
console.log();
console.log("💡 Signature = HMAC-SHA256(header + payload, SECRET_A)");
console.log();

// ==========================================
// BƯỚC 2: VERIFY BẰNG ĐÚNG SECRET_A
// ==========================================
console.log("\n" + "=".repeat(70));
console.log("✅ BƯỚC 2: VERIFY TOKEN BẰNG ĐÚNG SECRET_A");
console.log("-".repeat(70));

try {
  const decoded = jwt.verify(tokenA, SECRET_A);
  console.log("✅ VERIFY THÀNH CÔNG!");
  console.log();
  console.log("📋 Quá trình verify:");
  console.log("   1. Tách token thành 3 phần: header, payload, signature_cũ");
  console.log(
    `   2. Tính lại chữ ký: HMAC-SHA256(header + payload, "${SECRET_A}")`
  );
  console.log("   3. So sánh: signature_mới === signature_cũ");
  console.log("   4. Kết quả: ✅ KHỚP! (Cùng secret → Cùng chữ ký)");
  console.log();
  console.log("📊 Dữ liệu được giải mã:");
  console.log("   -", JSON.stringify(decoded, null, 2).replace(/\n/g, "\n   "));
} catch (error) {
  console.log("❌ Error:", error.message);
}

// ==========================================
// BƯỚC 3: VERIFY BẰNG SAI SECRET_B
// ==========================================
console.log("\n" + "=".repeat(70));
console.log("❌ BƯỚC 3: VERIFY TOKEN BẰNG SAI SECRET_B");
console.log("-".repeat(70));

const SECRET_B = "WRONG_SECRET_KEY";
console.log(`Secret Key B (khác): "${SECRET_B}"`);
console.log();

try {
  const decoded = jwt.verify(tokenA, SECRET_B);
  console.log("✅ Verify với SECRET_B:", decoded);
  console.log("⚠️ KHÔNG BAO GIỜ XẢY RA TRƯỜNG HỢP NÀY!");
} catch (error) {
  console.log("❌ VERIFY THẤT BẠI!");
  console.log(`   Error: ${error.message}`);
  console.log();
  console.log("📋 Quá trình verify:");
  console.log("   1. Tách token thành 3 phần: header, payload, signature_cũ");
  console.log(`      signature_cũ = "${parts[2].substring(0, 20)}..."`);
  console.log();
  console.log(
    `   2. Tính lại chữ ký: HMAC-SHA256(header + payload, "${SECRET_B}")`
  );
  console.log(
    "      signature_mới = một giá trị HOÀN TOÀN KHÁC (vì secret khác!)"
  );
  console.log();
  console.log("   3. So sánh: signature_mới === signature_cũ");
  console.log("      Kết quả: ❌ KHÔNG KHỚP! (Secret khác → Chữ ký khác)");
  console.log();
  console.log("   4. Throw error: JsonWebTokenError - invalid signature");
}

// ==========================================
// BƯỚC 4: DEMO TẠO 2 TOKEN BẰNG 2 SECRET KHÁC NHAU
// ==========================================
console.log("\n\n" + "=".repeat(70));
console.log("🔬 BƯỚC 4: SO SÁNH CHỮ KÝ VỚI 2 SECRET KHÁC NHAU");
console.log("-".repeat(70));

const tokenWithSecretA = jwt.sign(payload, SECRET_A);
const tokenWithSecretB = jwt.sign(payload, SECRET_B);

console.log("📝 Cùng payload:", JSON.stringify(payload));
console.log();

console.log("Token tạo bằng SECRET_A:");
console.log(tokenWithSecretA);
console.log(`└─ Signature: ${tokenWithSecretA.split(".")[2]}`);
console.log();

console.log("Token tạo bằng SECRET_B:");
console.log(tokenWithSecretB);
console.log(`└─ Signature: ${tokenWithSecretB.split(".")[2]}`);
console.log();

const sigA = tokenWithSecretA.split(".")[2];
const sigB = tokenWithSecretB.split(".")[2];

console.log("🔍 SO SÁNH CHỮ KÝ:");
console.log(`   Signature A: ${sigA}`);
console.log(`   Signature B: ${sigB}`);
console.log(
  `   Giống nhau?  ${sigA === sigB ? "✅ Có" : "❌ KHÔNG - Hoàn toàn khác!"}`
);
console.log();
console.log(
  "💡 KẾT LUẬN: Cùng payload nhưng secret khác → chữ ký hoàn toàn khác!"
);

// ==========================================
// KẾT QUẢ TỔNG HỢP
// ==========================================
console.log("\n\n" + "=".repeat(70));
console.log("📚 KẾT LUẬN - TẦM QUAN TRỌNG CỦA SECRET KEY");
console.log("=".repeat(70));

console.log("\n✅ CÁC ĐIỂM QUAN TRỌNG:");
console.log();
console.log("1️⃣ Secret Key là chìa khóa bí mật:");
console.log("   - CHỈ server biết secret key");
console.log("   - Client KHÔNG BAO GIỜ biết secret");
console.log("   - Lưu trong file .env, KHÔNG commit lên GitHub");
console.log();

console.log("2️⃣ Chữ ký (signature) phụ thuộc hoàn toàn vào secret:");
console.log("   - Cùng payload + cùng secret → Cùng chữ ký");
console.log("   - Cùng payload + khác secret → Khác chữ ký HOÀN TOÀN");
console.log();

console.log("3️⃣ Verify token = So sánh chữ ký:");
console.log("   - Server tính lại chữ ký bằng secret của mình");
console.log("   - Nếu khớp → Token hợp lệ ✅");
console.log("   - Nếu không khớp → Token giả mạo ❌");
console.log();

console.log("4️⃣ Bảo mật:");
console.log("   - Không ai có thể tạo token giả nếu không biết secret");
console.log("   - Hacker lấy được token cũng không sửa được (chữ ký sẽ sai)");
console.log("   - Nếu secret bị lộ → Phải đổi ngay và tạo lại tất cả token");
console.log();

console.log("🎯 ỨNG DỤNG TRONG PROJECT:");
console.log("   - File .env: JWT_SECRET=test_secret_key_for_development_only");
console.log("   - wsAuth.js: jwt.verify(token, process.env.JWT_SECRET)");
console.log("   - Production: Dùng secret dài và phức tạp hơn nhiều!");
console.log();

console.log("=".repeat(70));
console.log("✅ HOÀN THÀNH DEMO!");
console.log("=".repeat(70));
console.log();
