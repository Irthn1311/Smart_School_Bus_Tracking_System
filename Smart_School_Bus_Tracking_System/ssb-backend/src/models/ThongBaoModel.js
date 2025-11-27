import pool from "../config/db.js";

class ThongBaoModel {
  // Tạo thông báo mới
  async create(data) {
    const { maNguoiNhan, tieuDe, noiDung, loaiThongBao } = data;

    const [result] = await pool.query(
      `INSERT INTO ThongBao (maNguoiNhan, tieuDe, noiDung, loaiThongBao, thoiGianGui, daDoc)
       VALUES (?, ?, ?, ?, NOW(), FALSE)`,
      [maNguoiNhan, tieuDe, noiDung, loaiThongBao]
    );

    return {
      maThongBao: result.insertId,
      maNguoiNhan,
      tieuDe,
      noiDung,
      loaiThongBao,
      thoiGianGui: new Date(),
      daDoc: false,
    };
  }

  // Tạo thông báo cho nhiều người nhận
  async createMultiple(data) {
    const { danhSachNguoiNhan, tieuDe, noiDung, loaiThongBao } = data;

    const values = danhSachNguoiNhan.map((maNguoiNhan) => [
      maNguoiNhan,
      tieuDe,
      noiDung,
      loaiThongBao,
      new Date(), // thoiGianGui
      false, // daDoc
    ]);

    const [result] = await pool.query(
      `INSERT INTO ThongBao (maNguoiNhan, tieuDe, noiDung, loaiThongBao, thoiGianGui, daDoc)
       VALUES ?`,
      [values]
    );

    return {
      success: true,
      soLuongThongBao: result.affectedRows,
    };
  }

  // Lấy tất cả thông báo của một người dùng
  async getByUserId(maNguoiDung, filters = {}) {
    const { loaiThongBao, daDoc, limit = 50, offset = 0 } = filters;

    let query = `SELECT * FROM ThongBao WHERE maNguoiNhan = ?`;
    const params = [maNguoiDung];

    if (loaiThongBao) {
      query += ` AND loaiThongBao = ?`;
      params.push(loaiThongBao);
    }

    if (daDoc !== undefined) {
      query += ` AND daDoc = ?`;
      params.push(daDoc);
    }

    query += ` ORDER BY thoiGianGui DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Lấy thông báo theo ID
  async getById(maThongBao) {
    const [rows] = await pool.query(
      `SELECT * FROM ThongBao WHERE maThongBao = ?`,
      [maThongBao]
    );
    return rows[0];
  }

  // Đánh dấu thông báo đã đọc
  async markAsRead(maThongBao, maNguoiDung) {
    const [result] = await pool.query(
      `UPDATE ThongBao 
       SET daDoc = TRUE 
       WHERE maThongBao = ? AND maNguoiNhan = ?`,
      [maThongBao, maNguoiDung]
    );

    return result.affectedRows > 0;
  }

  // Đánh dấu tất cả thông báo đã đọc
  async markAllAsRead(maNguoiDung) {
    const [result] = await pool.query(
      `UPDATE ThongBao 
       SET daDoc = TRUE 
       WHERE maNguoiNhan = ? AND daDoc = FALSE`,
      [maNguoiDung]
    );

    return result.affectedRows;
  }

  // Đếm số thông báo chưa đọc
  async countUnread(maNguoiDung) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as soLuongChuaDoc 
       FROM ThongBao 
       WHERE maNguoiNhan = ? AND daDoc = FALSE`,
      [maNguoiDung]
    );

    return rows[0].soLuongChuaDoc;
  }

  // Xóa thông báo
  async delete(maThongBao, maNguoiDung) {
    const [result] = await pool.query(
      `DELETE FROM ThongBao 
       WHERE maThongBao = ? AND maNguoiNhan = ?`,
      [maThongBao, maNguoiDung]
    );

    return result.affectedRows > 0;
  }

  // Xóa tất cả thông báo đã đọc
  async deleteAllRead(maNguoiDung) {
    const [result] = await pool.query(
      `DELETE FROM ThongBao 
       WHERE maNguoiNhan = ? AND daDoc = TRUE`,
      [maNguoiDung]
    );

    return result.affectedRows;
  }

  // Xóa thông báo cũ (quá 30 ngày)
  async deleteOldNotifications(days = 30) {
    const [result] = await pool.query(
      `DELETE FROM ThongBao 
       WHERE thoiGianGui < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );

    return result.affectedRows;
  }

  // Lấy thống kê thông báo
  async getStatistics(maNguoiDung) {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as tongSo,
        SUM(CASE WHEN daDoc = FALSE THEN 1 ELSE 0 END) as chuaDoc,
        SUM(CASE WHEN daDoc = TRUE THEN 1 ELSE 0 END) as daDoc,
        SUM(CASE WHEN loaiThongBao = 'he_thong' THEN 1 ELSE 0 END) as heThong,
        SUM(CASE WHEN loaiThongBao = 'chuyen_di' THEN 1 ELSE 0 END) as chuyenDi,
        SUM(CASE WHEN loaiThongBao = 'su_co' THEN 1 ELSE 0 END) as suCo
       FROM ThongBao 
       WHERE maNguoiNhan = ?`,
      [maNguoiDung]
    );

    return rows[0];
  }
}

const instance = new ThongBaoModel();
export default instance;
