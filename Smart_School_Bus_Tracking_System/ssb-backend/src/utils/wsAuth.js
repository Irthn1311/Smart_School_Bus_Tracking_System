import jwt from "jsonwebtoken";
import NguoiDungModel from "../models/NguoiDungModel.js";

export async function verifyWsJWT(token) {
  if (!token) {
    throw new Error("Missing token");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await NguoiDungModel.getById(decoded.userId);

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    if (!user.trangThai) {
      throw new Error("Tài khoản đã bị khóa hoặc ngừng hoạt động");
    }

    const userPayload = {
      userId: decoded.userId,
      email: decoded.email,
      vaiTro: decoded.vaiTro,
      userInfo: user,
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        "✅ WS Auth: User verified -",
        userPayload.email,
        `(${userPayload.vaiTro})`,
        `- Account active: ${user.trangThai}`
      );
    }

    return userPayload;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token xác thực đã hết hạn");
    }

    if (error.name === "JsonWebTokenError") {
      throw new Error("Token xác thực không hợp lệ");
    }

    throw error;
  }
}

export function createMockToken(
  userId = 1,
  role = "tai_xe",
  email = "test@ssb.vn"
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock tokens are not allowed in production!");
  }

  const payload = {
    userId: userId,
    email: email,
    vaiTro: role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📚 HƯỚNG DẪN SỬ DỤNG FILE NÀY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * File này kiểm tra token khi user kết nối Socket.IO (chat/realtime).
 * Giống như bảo vệ kiểm tra thẻ trước khi vào cửa.
 * Nếu token hợp lệ → cho vào, nếu không → từ chối.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔧 CÁC HÀM CHÍNH
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1️⃣ verifyWsJWT(token)
 *    └─ Hàm kiểm tra token có hợp lệ không
 *    └─ Nhận vào: Token từ client
 *    └─ Trả về: Thông tin user (userId, email, vaiTro, userInfo)
 *    └─ Throw lỗi nếu: Token sai, hết hạn, user không tồn tại, account bị khóa
 *
 * 2️⃣ createMockToken(userId, role, email)
 *    └─ Tạo token giả để test (CHỈ dùng development)
 *    └─ Nhận vào: userId, role, email
 *    └─ Trả về: Token giả để test Socket.IO
 *    └─ ⚠️ Production sẽ báo lỗi nếu dùng hàm này
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔐 FLOW XÁC THỰC (verifyWsJWT)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Bước 1: Kiểm tra token có tồn tại không
 * ├─ Có token → Sang bước 2
 * └─ Không có → Throw lỗi "Missing token"
 *
 * Bước 2: Verify chữ ký token (jwt.verify)
 * ├─ Chữ ký đúng → Sang bước 3
 * ├─ Chữ ký sai → Throw lỗi "Token xác thực không hợp lệ"
 * └─ Token hết hạn → Throw lỗi "Token xác thực đã hết hạn"
 *
 * Bước 3: Kiểm tra user trong database
 * ├─ User tồn tại → Sang bước 4
 * └─ User không tồn tại → Throw lỗi "Người dùng không tồn tại"
 *
 * Bước 4: Kiểm tra account có active không
 * ├─ trangThai = true → Trả về user info
 * └─ trangThai = false → Throw lỗi "Tài khoản đã bị khóa..."
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 💻 CODE MẪU - SỬ DỤNG TRONG SOCKET.IO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * // src/ws/index.js
 * import { verifyWsJWT } from '../utils/wsAuth.js';
 *
 * io.use(async (socket, next) => {
 *   try {
 *     // Lấy token từ client
 *     const token = socket.handshake.auth.token;
 *
 *     // Kiểm tra token
 *     const user = await verifyWsJWT(token);
 *
 *     // Lưu thông tin user vào socket
 *     socket.data.user = user;
 *
 *     // Cho phép kết nối
 *     next();
 *   } catch (error) {
 *     // Từ chối kết nối
 *     next(new Error(error.message));
 *   }
 * });
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 📊 DỮ LIỆU TRẢ VỀ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Khi token hợp lệ, hàm trả về object:
 *
 * {
 *   userId: 123,                    // ID của user
 *   email: "driver01@ssb.vn",       // Email
 *   vaiTro: "tai_xe",               // Vai trò: quan_tri / tai_xe / phu_huynh
 *   userInfo: {                     // Thông tin đầy đủ từ database
 *     maNguoiDung: 123,
 *     hoTen: "Nguyễn Văn A",
 *     soDienThoai: "0901234567",
 *     trangThai: true,
 *     ...
 *   }
 * }
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ❌ CÁC LỖI CÓ THỂ GẶP
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ┌──────────────────────────────────┬─────────────────────────────────────┐
 * │ Lỗi                              │ Nguyên nhân                         │
 * ├──────────────────────────────────┼─────────────────────────────────────┤
 * │ Missing token                    │ Client không gửi token              │
 * │ Token xác thực không hợp lệ      │ Token sai format hoặc sai chữ ký    │
 * │ Token xác thực đã hết hạn        │ Token quá 24 giờ (hoặc thời gian    │
 * │                                  │ được set)                           │
 * │ Người dùng không tồn tại         │ User đã bị xóa khỏi database        │
 * │ Tài khoản đã bị khóa hoặc        │ Admin đã khóa account (trangThai =  │
 * │ ngừng hoạt động                  │ false)                              │
 * └──────────────────────────────────┴─────────────────────────────────────┘
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🧪 TEST VỚI TOKEN GIẢ (createMockToken)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Chỉ dùng trong development để test!
 *
 * import { createMockToken } from './wsAuth.js';
 *
 * // Tạo token giả cho user ID 1, vai trò tài xế
 * const fakeToken = createMockToken(1, "tai_xe", "driver01@ssb.vn");
 *
 * console.log("Token giả:", fakeToken);
 * // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * // Dùng token này để test Socket.IO
 * const socket = io("http://localhost:4000", {
 *   auth: { token: fakeToken }
 * });
 *
 * ⚠️ LƯU Ý:
 * - Database PHẢI có user với ID tương ứng (VD: user ID = 1)
 * - User phải có trangThai = true (active)
 * - Chỉ dùng trong development, production sẽ báo lỗi!
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔄 SO SÁNH VỚI AuthMiddleware.js
 * ───────────────────────────────────────────────────────────────────────────
 *
 * File này DÙNG CÙNG LOGIC với AuthMiddleware.js (do Q.Thắng viết).
 *
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Điểm giống          │ Chi tiết                                         │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ Verify JWT          │ Dùng jwt.verify(token, JWT_SECRET)              │
 * │ Check user exists   │ Dùng NguoiDungModel.getById()                   │
 * │ Check account active│ Kiểm tra user.trangThai                         │
 * │ Error handling      │ TokenExpiredError, JsonWebTokenError            │
 * │ Return format       │ { userId, email, vaiTro, userInfo }             │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * Khác biệt:
 * - AuthMiddleware: Dùng cho REST API (HTTP requests)
 * - wsAuth: Dùng cho Socket.IO (WebSocket connections)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔐 BẢO MẬT
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. JWT_SECRET phải lưu trong file .env
 *    └─ KHÔNG được commit .env lên GitHub
 *    └─ Mỗi môi trường (dev/production) dùng secret khác nhau
 *
 * 2. Token có thời hạn (24 giờ)
 *    └─ Hết hạn phải đăng nhập lại
 *    └─ Tránh token bị đánh cắp dùng mãi mãi
 *
 * 3. Kiểm tra account status mỗi lần verify
 *    └─ Phát hiện account bị khóa ngay lập tức
 *    └─ Admin khóa user → User không kết nối được nữa
 *
 * 4. KHÔNG bao giờ log token ra console
 *    └─ Token là thông tin nhạy cảm
 *    └─ Log token = cho hacker thông tin để hack
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 📖 VÍ DỤ SỬ DỤNG THỰC TẾ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * CASE 1: User đăng nhập thành công
 * ─────────────────────────────────────
 * 1. User login → Nhận token từ API
 * 2. Frontend lưu token vào localStorage
 * 3. Khi connect Socket.IO → Gửi token
 * 4. wsAuth.verifyWsJWT(token) → ✅ Pass
 * 5. User được kết nối Socket.IO
 *
 * CASE 2: Token hết hạn
 * ─────────────────────────────────────
 * 1. User login 25 giờ trước
 * 2. Token hết hạn (24h)
 * 3. Connect Socket.IO với token cũ
 * 4. wsAuth.verifyWsJWT(token) → ❌ Lỗi "Token đã hết hạn"
 * 5. Client nhận connect_error
 * 6. Frontend redirect về trang login
 *
 * CASE 3: Account bị khóa
 * ─────────────────────────────────────
 * 1. User login và có token hợp lệ
 * 2. Admin khóa account (trangThai = false)
 * 3. User cố connect Socket.IO
 * 4. Token vẫn hợp lệ nhưng user.trangThai = false
 * 5. wsAuth.verifyWsJWT(token) → ❌ Lỗi "Tài khoản đã bị khóa"
 * 6. User bị từ chối kết nối
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 📝 LỊCH SỬ PHÁT TRIỂN
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Ngày 1 (26/10/2025) - Mock version:
 * - Chỉ verify JWT cơ bản
 * - Không check user trong database
 * - Không check account status
 * - Return decoded payload trực tiếp
 *
 * Ngày 3 (28/10/2025) - Production version:
 * - Verify JWT + check user exists + check account active
 * - Dùng cùng logic với AuthMiddleware.js (Q.Thắng)
 * - Return format chuẩn: { userId, email, vaiTro, userInfo }
 * - Error handling đầy đủ
 * - Test thành công với Socket.IO server
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔗 FILE LIÊN QUAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 * src/middlewares/AuthMiddleware.js
 * └─ REST API authentication (HTTP)
 * └─ Dùng chung logic với file này
 *
 * src/ws/index.js
 * └─ Socket.IO server
 * └─ Gọi verifyWsJWT() trong io.use()
 *
 * src/models/NguoiDungModel.js
 * └─ Model để lấy user từ database
 * └─ Hàm getById(userId)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔜 NÂNG CẤP TƯƠNG LAI (NẾU CẦN)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. Blacklist token
 *    └─ Khi user logout → Đưa token vào blacklist
 *    └─ Token trong blacklist không dùng được nữa
 *
 * 2. Refresh token cho WebSocket
 *    └─ Token hết hạn → Tự động renew không cần login lại
 *
 * 3. Rate limiting
 *    └─ Giới hạn số lần verify token mỗi phút
 *    └─ Tránh tấn công brute force
 *
 * 4. Logging chi tiết
 *    └─ Log thời gian verify
 *    └─ Log thất bại để phát hiện tấn công
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
