import ThongBaoModel from "../models/ThongBaoModel.js";

class NotificationController {
  // GET /api/v1/notifications
  static async list(req, res) {
    try {
      const userId = req.user?.userId;
      const { loaiThongBao, daDoc, limit = 50, offset = 0 } = req.query;

      const data = await ThongBaoModel.getByUserId(userId, {
        loaiThongBao,
        daDoc: daDoc !== undefined ? daDoc === "true" || daDoc === true : undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("NotificationController.list error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // GET /api/v1/notifications/unread-count
  static async unreadCount(req, res) {
    try {
      const userId = req.user?.userId;
      const count = await ThongBaoModel.countUnread(userId);
      return res.status(200).json({ success: true, data: { unread: count } });
    } catch (error) {
      console.error("NotificationController.unreadCount error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // POST /api/v1/notifications
  static async create(req, res) {
    try {
      const { maNguoiNhan, tieuDe, noiDung, loaiThongBao = "thong_bao" } = req.body;
      if (!maNguoiNhan || !noiDung) {
        return res.status(400).json({ success: false, message: "Thiếu maNguoiNhan hoặc noiDung" });
      }
      const created = await ThongBaoModel.create({ maNguoiNhan, tieuDe, noiDung, loaiThongBao });

      // Emit socket event to user room if socket available
      const io = req.app.get("io");
      if (io) {
        io.to(`user-${maNguoiNhan}`).emit("notification:new", created);
      }

      return res.status(201).json({ success: true, data: created, message: "Tạo thông báo thành công" });
    } catch (error) {
      console.error("NotificationController.create error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // POST /api/v1/notifications/bulk
  static async createBulk(req, res) {
    try {
      const { danhSachNguoiNhan, tieuDe, noiDung, loaiThongBao = "thong_bao" } = req.body;
      if (!Array.isArray(danhSachNguoiNhan) || danhSachNguoiNhan.length === 0 || !noiDung) {
        return res.status(400).json({ success: false, message: "Thiếu danhSachNguoiNhan hoặc noiDung" });
      }
      const result = await ThongBaoModel.createMultiple({ danhSachNguoiNhan, tieuDe, noiDung, loaiThongBao });

      const io = req.app.get("io");
      if (io) {
        danhSachNguoiNhan.forEach(id => {
          io.to(`user-${id}`).emit("notification:new", {
            maNguoiNhan: id,
            tieuDe,
            noiDung,
            loaiThongBao,
            thoiGianGui: new Date(),
            daDoc: false,
          });
        });
      }

      return res.status(201).json({ success: true, data: result, message: "Gửi thông báo hàng loạt thành công" });
    } catch (error) {
      console.error("NotificationController.createBulk error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // PATCH /api/v1/notifications/:id/read
  static async markRead(req, res) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      const ok = await ThongBaoModel.markAsRead(id, userId);
      if (!ok) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
      }
      return res.status(200).json({ success: true, message: "Đã đánh dấu đã đọc" });
    } catch (error) {
      console.error("NotificationController.markRead error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // PATCH /api/v1/notifications/read-all
  static async markAllRead(req, res) {
    try {
      const userId = req.user?.userId;
      const count = await ThongBaoModel.markAllAsRead(userId);
      return res.status(200).json({ success: true, data: { updated: count }, message: "Đã đánh dấu tất cả đã đọc" });
    } catch (error) {
      console.error("NotificationController.markAllRead error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // DELETE /api/v1/notifications/:id
  static async remove(req, res) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      const ok = await ThongBaoModel.delete(id, userId);
      if (!ok) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
      }
      return res.status(200).json({ success: true, message: "Xóa thông báo thành công" });
    } catch (error) {
      console.error("NotificationController.remove error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // DELETE /api/v1/notifications/clean-read
  static async cleanRead(req, res) {
    try {
      const userId = req.user?.userId;
      const count = await ThongBaoModel.deleteAllRead(userId);
      return res.status(200).json({ success: true, data: { deleted: count }, message: "Đã xóa thông báo đã đọc" });
    } catch (error) {
      console.error("NotificationController.cleanRead error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }
}

export default NotificationController;
