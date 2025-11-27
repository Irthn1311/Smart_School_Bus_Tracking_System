import SuCoModel from "../models/SuCoModel.js";

class IncidentController {
  // GET /api/v1/incidents
  static async list(req, res) {
    try {
      const {
        mucDo,
        maChuyen,
        trangThai,
        tuNgay,
        denNgay,
        limit = 50,
        offset = 0,
      } = req.query;

      const data = await SuCoModel.getAll({
        mucDo,
        maChuyen,
        trangThai,
        tuNgay,
        denNgay,
        limit: Number(limit),
        offset: Number(offset),
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("IncidentController.list error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // GET /api/v1/incidents/recent
  static async recent(req, res) {
    try {
      const { limit = 10 } = req.query;
      const data = await SuCoModel.getRecent(Number(limit));
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("IncidentController.recent error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // GET /api/v1/incidents/:id
  static async get(req, res) {
    try {
      const { id } = req.params;
      const incident = await SuCoModel.getById(id);
      if (!incident) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy sự cố" });
      }
      return res.status(200).json({ success: true, data: incident });
    } catch (error) {
      console.error("IncidentController.get error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // POST /api/v1/incidents
  static async create(req, res) {
    try {
      const { maChuyen, moTa, mucDo = "nhe", trangThai = "moi" } = req.body;

      if (!maChuyen || !moTa) {
        return res.status(400).json({
          success: false,
          message: "Thiếu maChuyen hoặc moTa",
        });
      }

      const created = await SuCoModel.create({ maChuyen, moTa, mucDo, trangThai });
      return res.status(201).json({
        success: true,
        data: created,
        message: "Tạo sự cố thành công",
      });
    } catch (error) {
      console.error("IncidentController.create error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // PUT /api/v1/incidents/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { moTa, mucDo, trangThai } = req.body;

      const ok = await SuCoModel.update(id, { moTa, mucDo, trangThai });
      if (!ok) {
        return res.status(404).json({ success: false, message: "Không tìm thấy hoặc không có thay đổi" });
      }
      const refreshed = await SuCoModel.getById(id);
      return res.status(200).json({ success: true, data: refreshed, message: "Cập nhật sự cố thành công" });
    } catch (error) {
      console.error("IncidentController.update error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // PATCH /api/v1/incidents/:id/level
  static async updateLevel(req, res) {
    try {
      const { id } = req.params;
      const { mucDo } = req.body;
      if (!mucDo) {
        return res.status(400).json({ success: false, message: "Thiếu mucDo" });
      }
      const ok = await SuCoModel.updateLevel(id, mucDo);
      if (!ok) {
        return res.status(404).json({ success: false, message: "Không tìm thấy sự cố" });
      }
      const refreshed = await SuCoModel.getById(id);
      return res.status(200).json({ success: true, data: refreshed, message: "Cập nhật mức độ thành công" });
    } catch (error) {
      console.error("IncidentController.updateLevel error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  // DELETE /api/v1/incidents/:id
  static async remove(req, res) {
    try {
      const { id } = req.params;
      const ok = await SuCoModel.delete(id);
      if (!ok) {
        return res.status(404).json({ success: false, message: "Không tìm thấy sự cố" });
      }
      return res.status(200).json({ success: true, message: "Xóa sự cố thành công" });
    } catch (error) {
      console.error("IncidentController.remove error:", error);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }
}

export default IncidentController;
