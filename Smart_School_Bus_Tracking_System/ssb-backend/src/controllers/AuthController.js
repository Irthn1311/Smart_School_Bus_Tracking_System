// AuthController - Controller chuyên nghiệp cho xác thực và phân quyền
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import NguoiDungModel from "../models/NguoiDungModel.js";
import TaiXeModel from "../models/TaiXeModel.js";
import * as response from "../utils/response.js";
import config from "../config/env.js";

class AuthController {
  // Đăng ký tài khoản mới
  static async register(req, res) {
    try {
      const {
        hoTen,
        email,
        soDienThoai,
        matKhau,
        vaiTro,
        anhDaiDien,
        // Thông tin bổ sung cho tài xế
        soBangLai,
        ngayHetHanBangLai,
        soNamKinhNghiem,
      } = req.body;

      // Validation dữ liệu bắt buộc
      if (!hoTen || !email || !matKhau || !vaiTro) {
        return res.status(400).json({
          success: false,
          message: "Họ tên, email, mật khẩu và vai trò là bắt buộc",
        });
      }

      // Validation vai trò
      const validRoles = ["quan_tri", "tai_xe", "phu_huynh"];
      if (!validRoles.includes(vaiTro)) {
        return res.status(400).json({
          success: false,
          message: "Vai trò không hợp lệ",
          validRoles,
        });
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Email không hợp lệ",
        });
      }

      // Validation mật khẩu
      if (matKhau.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      // Validation số điện thoại nếu có
      if (soDienThoai) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(soDienThoai)) {
          return res.status(400).json({
            success: false,
            message: "Số điện thoại phải có 10-11 chữ số",
          });
        }
      }

      // Kiểm tra email đã tồn tại chưa
      const existingEmail = await NguoiDungModel.getByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email đã tồn tại trong hệ thống",
        });
      }

      // Kiểm tra số điện thoại đã tồn tại chưa (nếu có)
      if (soDienThoai) {
        const existingPhone = await NguoiDungModel.getByPhone(soDienThoai);
        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: "Số điện thoại đã tồn tại trong hệ thống",
          });
        }
      }

      // Validation thông tin tài xế
      if (vaiTro === "tai_xe") {
        if (!soBangLai || !ngayHetHanBangLai) {
          return res.status(400).json({
            success: false,
            message: "Số bằng lái và ngày hết hạn là bắt buộc cho tài xế",
          });
        }

        // Kiểm tra số bằng lái đã tồn tại chưa
        const existingLicense = await TaiXeModel.getByLicense(soBangLai);
        if (existingLicense) {
          return res.status(409).json({
            success: false,
            message: "Số bằng lái đã tồn tại trong hệ thống",
          });
        }

        // Validation ngày hết hạn bằng lái
        const expiryDate = new Date(ngayHetHanBangLai);
        const today = new Date();
        if (expiryDate <= today) {
          return res.status(400).json({
            success: false,
            message: "Bằng lái đã hết hạn",
          });
        }
      }

      // Mã hóa mật khẩu
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(matKhau, saltRounds);

      // Tạo người dùng
      const userData = {
        hoTen,
        email,
        matKhau: hashedPassword,
        soDienThoai: soDienThoai || null,
        anhDaiDien: anhDaiDien || null,
        vaiTro,
        trangThai: true,
      };

      const userId = await NguoiDungModel.create(userData);

      // Tạo thông tin tài xế nếu vai trò là tài xế
      if (vaiTro === "tai_xe") {
        const driverData = {
          maTaiXe: userId,
          soBangLai,
          ngayHetHanBangLai,
          soNamKinhNghiem: soNamKinhNghiem || 0,
          trangThai: "hoat_dong",
        };

        await TaiXeModel.create(driverData);
      }

      // Tạo JWT token
      const token = jwt.sign(
        {
          userId,
          email,
          vaiTro,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Lấy thông tin người dùng vừa tạo
      const newUser = await NguoiDungModel.getById(userId);

      // Lấy thông tin tài xế nếu có
      let driverInfo = null;
      if (vaiTro === "tai_xe") {
        driverInfo = await TaiXeModel.getById(userId);
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            ...newUser,
            matKhau: undefined, // Không trả về mật khẩu
          },
          driverInfo,
          token,
        },
        message: "Đăng ký tài khoản thành công",
      });
    } catch (error) {
      console.error("Error in AuthController.register:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi đăng ký tài khoản",
        error: error.message,
      });
    }
  }

  // Đăng nhập
  static async login(req, res) {
    try {
      const { email, matKhau, password } = req.body;

      // Support both 'password' and 'matKhau' for API compatibility
      const pass = matKhau || password;

      // Validation dữ liệu bắt buộc
      if (!email || !pass) {
        return response.validationError(res, "Email và mật khẩu là bắt buộc", [
          { field: email ? "password" : "email", message: "Trường này là bắt buộc" }
        ]);
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return response.validationError(res, "Email không hợp lệ", [
          { field: "email", message: "Email không đúng định dạng" }
        ]);
      }

      // Tìm người dùng theo email
      const user = await NguoiDungModel.getByEmail(email);
      if (!user) {
        return response.unauthorized(res, "Email hoặc mật khẩu không đúng");
      }

      // Kiểm tra trạng thái tài khoản
      if (!user.trangThai) {
        return response.forbidden(res, "Tài khoản đã bị khóa");
      }

      // Kiểm tra mật khẩu
      const isPasswordValid = await bcrypt.compare(pass, user.matKhau);
      if (!isPasswordValid) {
        return response.error(res, "AUTH_INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", 401);
      }

      // (1) Tạo Access Token (Ngắn hạn)
      const accessToken = jwt.sign(
        {
          userId: user.maNguoiDung,
          email: user.email,
          vaiTro: user.vaiTro,
        },
        process.env.JWT_SECRET,
        { expiresIn: config.jwt.expiresIn || "15m" }
      );

      // (2) Tạo Refresh Token (Dài hạn)
      const refreshToken = jwt.sign(
        {
          userId: user.maNguoiDung,
          email: user.email,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      // Lấy thông tin tài xế nếu có
      let driverInfo = null;
      if (user.vaiTro === "tai_xe") {
        driverInfo = await TaiXeModel.getById(user.maNguoiDung);
      }

      return response.ok(res, {
        token: accessToken,
        refreshToken,
        user: {
          maNguoiDung: user.maNguoiDung,
          hoTen: user.hoTen,
          email: user.email,
          soDienThoai: user.soDienThoai,
          anhDaiDien: user.anhDaiDien,
          vaiTro: user.vaiTro,
          trangThai: user.trangThai,
          ngayTao: user.ngayTao,
          ngayCapNhat: user.ngayCapNhat,
        },
        driverInfo,
      }, null);
    } catch (error) {
      console.error("Error in AuthController.login:", error);
      return response.serverError(res, "Lỗi server khi đăng nhập", error);
    }
  }

  // Đăng xuất
  static async logout(req, res) {
    try {
      // Với JWT, logout thường được xử lý ở phía client
      // Server có thể blacklist token nếu cần
      res.status(200).json({
        success: true,
        message: "Đăng xuất thành công",
      });
    } catch (error) {
      console.error("Error in AuthController.logout:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi đăng xuất",
        error: error.message,
      });
    }
  }

  // Lấy thông tin profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const user = await NguoiDungModel.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Lấy thông tin tài xế nếu có
      let driverInfo = null;
      if (user.vaiTro === "tai_xe") {
        driverInfo = await TaiXeModel.getById(userId);
      }

      return response.ok(res, {
        user: {
          ...user,
          matKhau: undefined, // Không trả về mật khẩu
        },
        driverInfo,
      });
    } catch (error) {
      console.error("Error in AuthController.getProfile:", error);
      return response.serverError(res, "Lỗi server khi lấy thông tin profile", error);
    }
  }

  // Cập nhật profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const {
        hoTen,
        soDienThoai,
        anhDaiDien,
        // Thông tin tài xế
        soNamKinhNghiem,
      } = req.body;

      // Kiểm tra người dùng có tồn tại không
      const existingUser = await NguoiDungModel.getById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Validation số điện thoại nếu có thay đổi
      if (soDienThoai) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(soDienThoai)) {
          return res.status(400).json({
            success: false,
            message: "Số điện thoại phải có 10-11 chữ số",
          });
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        const existingPhone = await NguoiDungModel.getByPhone(soDienThoai);
        if (existingPhone && existingPhone.maNguoiDung !== userId) {
          return res.status(409).json({
            success: false,
            message: "Số điện thoại đã tồn tại trong hệ thống",
          });
        }
      }

      // Cập nhật thông tin người dùng
      const updateData = {};
      if (hoTen !== undefined) updateData.hoTen = hoTen;
      if (soDienThoai !== undefined) updateData.soDienThoai = soDienThoai;
      if (anhDaiDien !== undefined) updateData.anhDaiDien = anhDaiDien;

      if (Object.keys(updateData).length > 0) {
        await NguoiDungModel.update(userId, updateData);
      }

      // Cập nhật thông tin tài xế nếu có
      if (existingUser.vaiTro === "tai_xe" && soNamKinhNghiem !== undefined) {
        await TaiXeModel.update(userId, { soNamKinhNghiem });
      }

      // Lấy thông tin người dùng sau khi cập nhật
      const updatedUser = await NguoiDungModel.getById(userId);

      // Lấy thông tin tài xế nếu có
      let driverInfo = null;
      if (updatedUser.vaiTro === "tai_xe") {
        driverInfo = await TaiXeModel.getById(userId);
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...updatedUser,
            matKhau: undefined, // Không trả về mật khẩu
          },
          driverInfo,
        },
        message: "Cập nhật profile thành công",
      });
    } catch (error) {
      console.error("Error in AuthController.updateProfile:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật profile",
        error: error.message,
      });
    }
  }

  // Đổi mật khẩu
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { matKhauCu, matKhauMoi, xacNhanMatKhauMoi } = req.body;

      // Validation dữ liệu bắt buộc
      if (!matKhauCu || !matKhauMoi || !xacNhanMatKhauMoi) {
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu mới là bắt buộc",
        });
      }

      // Validation mật khẩu mới
      if (matKhauMoi.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        });
      }

      if (matKhauMoi !== xacNhanMatKhauMoi) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
        });
      }

      // Lấy thông tin người dùng
      const user = await NguoiDungModel.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Kiểm tra mật khẩu cũ
      const isOldPasswordValid = await bcrypt.compare(matKhauCu, user.matKhau);
      if (!isOldPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu cũ không đúng",
        });
      }

      // Mã hóa mật khẩu mới
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(matKhauMoi, saltRounds);

      // Cập nhật mật khẩu
      await NguoiDungModel.update(userId, { matKhau: hashedNewPassword });

      res.status(200).json({
        success: true,
        message: "Đổi mật khẩu thành công",
      });
    } catch (error) {
      console.error("Error in AuthController.changePassword:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi đổi mật khẩu",
        error: error.message,
      });
    }
  }

  // Quên mật khẩu
  static async forgotPassword(req, res) {
    try {
      const { email, soDienThoai } = req.body;
      const identifier = email || soDienThoai;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: "Email hoặc số điện thoại là bắt buộc",
        });
      }

      // Tìm user theo email hoặc số điện thoại
      let user = null;
      if (email) {
        // Validation email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Email không hợp lệ",
          });
        }
        user = await NguoiDungModel.getByEmail(email);
      } else if (soDienThoai) {
        // Validation số điện thoại (chỉ số, 10-15 ký tự)
        const phoneRegex = /^[0-9]{10,15}$/;
        const cleanPhone = soDienThoai.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: "Số điện thoại không hợp lệ",
          });
        }
        user = await NguoiDungModel.getByPhone(cleanPhone);
      }

      if (!user) {
        // Không tiết lộ thông tin tài khoản có tồn tại hay không (bảo mật)
        return res.status(200).json({
          success: true,
          message: "Nếu email/số điện thoại tồn tại trong hệ thống, mật khẩu mới đã được gửi đến email của bạn",
        });
      }

      // Kiểm tra user có email không (cần email để gửi mật khẩu mới)
      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản này chưa có email. Vui lòng liên hệ quản trị viên",
        });
      }

      // Tạo mật khẩu mới ngẫu nhiên (8 ký tự: chữ hoa, chữ thường, số)
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const newPassword = generatePassword();
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Cập nhật mật khẩu mới vào database
      await NguoiDungModel.update(user.maNguoiDung, { matKhau: hashedPassword });

      // Gửi email mật khẩu mới
      const EmailService = (await import("../services/EmailService.js")).default;
      await EmailService.sendPasswordReset(user.email, user.hoTen, newPassword);

      res.status(200).json({
        success: true,
        message: "Mật khẩu mới đã được gửi đến email của bạn",
      });
    } catch (error) {
      console.error("Error in AuthController.forgotPassword:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xử lý quên mật khẩu",
        error: error.message,
      });
    }
  }

  // Reset mật khẩu
  static async resetPassword(req, res) {
    try {
      const { token, matKhauMoi, xacNhanMatKhauMoi } = req.body;

      // Validation dữ liệu bắt buộc
      if (!token || !matKhauMoi || !xacNhanMatKhauMoi) {
        return res.status(400).json({
          success: false,
          message: "Token, mật khẩu mới và xác nhận mật khẩu là bắt buộc",
        });
      }

      // Validation mật khẩu mới
      if (matKhauMoi.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        });
      }

      if (matKhauMoi !== xacNhanMatKhauMoi) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
        });
      }

      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Kiểm tra người dùng có tồn tại không
      const user = await NguoiDungModel.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Người dùng không tồn tại",
        });
      }

      // Mã hóa mật khẩu mới
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(matKhauMoi, saltRounds);

      // Cập nhật mật khẩu
      await NguoiDungModel.update(userId, { matKhau: hashedNewPassword });

      res.status(200).json({
        success: true,
        message: "Reset mật khẩu thành công",
      });
    } catch (error) {
      console.error("Error in AuthController.resetPassword:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(400).json({
          success: false,
          message: "Token không hợp lệ",
        });
      }

      if (error.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "Token đã hết hạn",
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi server khi reset mật khẩu",
        error: error.message,
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      // 1. Lấy Refresh Token từ header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.unauthorized(res, "Refresh token không được cung cấp");
      }

      const refreshToken = authHeader.substring(7);

      // 2. Xác thực Refresh Token bằng REFRESH_SECRET
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (error) {
        return response.unauthorized(res, "Refresh token không hợp lệ hoặc đã hết hạn");
      }

      const userId = decoded.userId;
      const user = await NguoiDungModel.getById(userId);
      if (!user || !user.trangThai) {
        return response.unauthorized(res, "Người dùng không tồn tại hoặc tài khoản bị khóa");
      }

      const newAccessToken = jwt.sign(
        {
          userId: user.maNguoiDung,
          email: user.email,
          vaiTro: user.vaiTro,
        },
        process.env.JWT_SECRET,
        { expiresIn: config.jwt.expiresIn || "15m" }
      );

      return response.ok(res, {
        token: newAccessToken,
      });
    } catch (error) {
      console.error("Error in AuthController.refreshToken:", error);
      return response.serverError(res, "Lỗi server khi làm mới token", error);
    }
  }
}

export default AuthController;
