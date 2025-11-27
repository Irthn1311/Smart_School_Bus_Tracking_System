import pool from "../config/db.js";

const XeBuytModel = {
  // Lấy tất cả xe buýt
  async getAll() {
    const [rows] = await pool.query("SELECT * FROM XeBuyt");
    return rows;
  },

  // Lấy xe buýt theo mã
  async getById(id) {
    const [rows] = await pool.query("SELECT * FROM XeBuyt WHERE maXe = ?", [
      id,
    ]);
    return rows[0];
  },

  async getStats() {
    // Lấy thông tin cơ bản về số lượng xe theo trạng thái
    const [busCounts] = await pool.query(
      `SELECT trangThai, COUNT(*) as count 
       FROM XeBuyt 
       GROUP BY trangThai`
    );

    // Lấy tổng số xe
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM XeBuyt`
    );
    const totalBuses = totalResult[0].total || 0;

    // Trả về dữ liệu thô để Controller xử lý
    return {
      busCounts: busCounts || [], // Mảng [{ trangThai: 'hoat_dong', count: 5 }, ...]
      totalBuses: totalBuses,
    };
  },

  // Thêm xe buýt mới
  async create(data) {
    const { bienSoXe, dongXe, sucChua, trangThai } = data;
    const [result] = await pool.query(
      `INSERT INTO XeBuyt (bienSoXe, dongXe, sucChua, trangThai)
       VALUES (?, ?, ?, ?)`,
      [bienSoXe, dongXe, sucChua, trangThai || "hoat_dong"]
    );
    return result.insertId;
  },

  // Cập nhật thông tin xe buýt (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.bienSoXe !== undefined) {
      fields.push("bienSoXe = ?");
      values.push(data.bienSoXe);
    }
    if (data.dongXe !== undefined) {
      fields.push("dongXe = ?");
      values.push(data.dongXe);
    }
    if (data.sucChua !== undefined) {
      fields.push("sucChua = ?");
      values.push(data.sucChua);
    }
    if (data.trangThai !== undefined) {
      fields.push("trangThai = ?");
      values.push(data.trangThai);
    }

    if (fields.length === 0) {
      return false; // No fields to update
    }

    values.push(id);
    const query = `UPDATE XeBuyt SET ${fields.join(", ")} WHERE maXe = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa xe buýt
  async delete(id) {
    const [result] = await pool.query("DELETE FROM XeBuyt WHERE maXe = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // Lọc xe buýt theo trạng thái (tuỳ chọn)
  async getByStatus(status) {
    const [rows] = await pool.query(
      "SELECT * FROM XeBuyt WHERE trangThai = ?",
      [status]
    );
    return rows;
  },
  // THÊM method này:
  async getByPlate(plate) {
    const [rows] = await pool.query("SELECT * FROM XeBuyt WHERE bienSoXe = ?", [
      plate,
    ]);
    return rows.length > 0 ? rows[0] : null;
  },

  // Note: XeBuyt table không có các cột GPS
  // Cần tạo bảng riêng hoặc thêm cột vào bảng XeBuyt để lưu vị trí
  async updateLocation(id, locationData) {
    // TODO: Implement khi có bảng lưu vị trí hoặc thêm cột vào XeBuyt
    console.warn(
      "updateLocation not implemented - XeBuyt table does not have GPS columns"
    );
    return false;
  },
};

export default XeBuytModel;
