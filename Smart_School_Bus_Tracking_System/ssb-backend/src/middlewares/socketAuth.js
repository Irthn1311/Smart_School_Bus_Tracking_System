import jwt from "jsonwebtoken";
import NguoiDungModel from "../models/NguoiDungModel.js";

export const verifyWsJWT = async (socket, next) => {
  try {
    // Lấy token từ handshake 
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra user (tương tự AuthMiddleware)
    const user = await NguoiDungModel.getById(decoded.userId);
    if (!user || !user.trangThai) {
      return next(new Error("Authentication error: Invalid user"));
    }

    // Gắn thông tin user vào socket để dùng sau này [cite: 78]
    socket.data.user = {
      id: user.maNguoiDung,
      role: user.vaiTro,
    };
    
    next(); // Cho phép kết nối
  } catch (error) {
    // Từ chối kết nối
    return next(new Error("Authentication error: Invalid token"));
  }
};