import express from "express";
import rateLimit from "express-rate-limit";
import AuthController from "../../controllers/AuthController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = express.Router();

// Rate limit cho login endpoint (chống brute force) - DISABLED FOR DEVELOPMENT
// 🔥 Tắt rate limiting để phục vụ phát triển đồ án
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 phút
//   max: 5, // Tối đa 5 lần thử trong 15 phút
//   message: {
//     success: false,
//     code: "RATE_LIMIT_EXCEEDED",
//     message: "Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút",
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// POST /api/auth/register - Đăng ký tài khoản mới
router.post("/register", AuthController.register);

// POST /api/auth/login - Đăng nhập (rate limit đã tắt cho development)
router.post("/login", AuthController.login);

// POST /api/auth/logout - Đăng xuất
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

// GET /api/auth/profile - Lấy thông tin profile
router.get("/profile", AuthMiddleware.authenticate, AuthController.getProfile);

// PUT /api/auth/profile - Cập nhật profile
router.put(
  "/profile",
  AuthMiddleware.authenticate,
  AuthController.updateProfile
);

// PUT /api/auth/change-password - Đổi mật khẩu
router.put(
  "/change-password",
  AuthMiddleware.authenticate,
  AuthController.changePassword
);

// POST /api/auth/forgot-password - Quên mật khẩu
router.post("/forgot-password", AuthController.forgotPassword);

// POST /api/auth/reset-password - Reset mật khẩu
router.post("/reset-password", AuthController.resetPassword);

// POST /api/auth/refresh-token - Refresh token
// router.post(
//   "/refresh-token",
//   AuthMiddleware.authenticate,
//   AuthController.refreshToken
// );

router.post(
  "/refresh", 
  // KHÔNG có AuthMiddleware.authenticate ở đây
  AuthController.refreshToken 
);

export default router;
