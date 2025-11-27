import pool from "../config/db.js";

/**
 * StudentStopSuggestionModel - Model cho bảng student_stop_suggestions
 * Lưu mapping gợi ý học sinh - điểm dừng cho route
 */
const StudentStopSuggestionModel = {
  /**
   * Lấy tất cả suggestions của một route
   * @param {number} maTuyen - Mã tuyến đường
   * @returns {Promise<Array>} Danh sách suggestions với thông tin học sinh và điểm dừng
   */
  async getByRouteId(maTuyen) {
    const [rows] = await pool.query(
      `SELECT 
        sss.id,
        sss.maTuyen,
        sss.maDiemDung,
        sss.maHocSinh,
        sss.ngayTao,
        sss.ngayCapNhat,
        h.hoTen as tenHocSinh,
        h.lop,
        h.viDo as studentLat,
        h.kinhDo as studentLng,
        d.tenDiem,
        d.viDo as stopLat,
        d.kinhDo as stopLng,
        d.address as stopAddress
      FROM student_stop_suggestions sss
      JOIN HocSinh h ON sss.maHocSinh = h.maHocSinh
      JOIN DiemDung d ON sss.maDiemDung = d.maDiem
      WHERE sss.maTuyen = ?
      ORDER BY sss.maDiemDung, h.hoTen`,
      [maTuyen]
    );
    return rows;
  },

  /**
   * Lấy suggestions theo route và stop
   * @param {number} maTuyen - Mã tuyến đường
   * @param {number} maDiemDung - Mã điểm dừng
   * @returns {Promise<Array>} Danh sách học sinh được gợi ý cho stop này
   */
  async getByRouteAndStop(maTuyen, maDiemDung) {
    const [rows] = await pool.query(
      `SELECT 
        sss.id,
        sss.maHocSinh,
        h.hoTen,
        h.lop,
        h.viDo,
        h.kinhDo,
        h.anhDaiDien
      FROM student_stop_suggestions sss
      JOIN HocSinh h ON sss.maHocSinh = h.maHocSinh
      WHERE sss.maTuyen = ? AND sss.maDiemDung = ?
      ORDER BY h.hoTen`,
      [maTuyen, maDiemDung]
    );
    return rows;
  },

  /**
   * Bulk insert suggestions
   * @param {Array<{maTuyen: number, maDiemDung: number, maHocSinh: number}>} suggestions
   * @returns {Promise<number>} Số dòng đã insert
   */
  async bulkCreate(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      return 0;
    }

    const values = suggestions.map(
      (s) => `(${s.maTuyen}, ${s.maDiemDung}, ${s.maHocSinh})`
    );

    const query = `
      INSERT INTO student_stop_suggestions (maTuyen, maDiemDung, maHocSinh)
      VALUES ${values.join(", ")}
      ON DUPLICATE KEY UPDATE ngayCapNhat = CURRENT_TIMESTAMP
    `;

    const [result] = await pool.query(query);
    return result.affectedRows;
  },

  /**
   * Xóa tất cả suggestions của một route
   * @param {number} maTuyen - Mã tuyến đường
   * @returns {Promise<number>} Số dòng đã xóa
   */
  async deleteByRouteId(maTuyen) {
    const [result] = await pool.query(
      `DELETE FROM student_stop_suggestions WHERE maTuyen = ?`,
      [maTuyen]
    );
    return result.affectedRows;
  },

  /**
   * Xóa suggestions của một học sinh trong route
   * @param {number} maTuyen - Mã tuyến đường
   * @param {number} maHocSinh - Mã học sinh
   * @returns {Promise<number>} Số dòng đã xóa
   */
  async deleteByRouteAndStudent(maTuyen, maHocSinh) {
    const [result] = await pool.query(
      `DELETE FROM student_stop_suggestions WHERE maTuyen = ? AND maHocSinh = ?`,
      [maTuyen, maHocSinh]
    );
    return result.affectedRows;
  },
};

export default StudentStopSuggestionModel;

