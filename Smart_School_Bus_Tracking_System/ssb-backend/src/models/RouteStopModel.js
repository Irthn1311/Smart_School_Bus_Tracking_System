import pool from "../config/db.js";

/**
 * RouteStopModel - Model cho bảng route_stops
 * Quan hệ nhiều-nhiều giữa TuyenDuong và DiemDung
 */
const RouteStopModel = {
  /**
   * Lấy tất cả stops của một route, sắp xếp theo sequence
   * @param {number} routeId - Mã tuyến đường
   * @returns {Promise<Array>} Danh sách stops với sequence và dwell_seconds
   */
  async getByRouteId(routeId) {
    const [rows] = await pool.query(
      `SELECT 
        d.maDiem,
        d.tenDiem,
        d.viDo,
        d.kinhDo,
        d.address,
        d.scheduled_time,
        d.ngayTao,
        d.ngayCapNhat,
        rs.sequence,
        rs.dwell_seconds
      FROM route_stops rs
      JOIN DiemDung d ON d.maDiem = rs.stop_id
      WHERE rs.route_id = ?
      ORDER BY rs.sequence ASC`,
      [routeId]
    );
    return rows;
  },

  /**
   * Lấy thông tin route_stop cụ thể
   * @param {number} routeId - Mã tuyến đường
   * @param {number} stopId - Mã điểm dừng
   * @returns {Promise<Object|null>} Thông tin route_stop hoặc null
   */
  async getByRouteAndStop(routeId, stopId) {
    const [rows] = await pool.query(
      `SELECT * FROM route_stops 
       WHERE route_id = ? AND stop_id = ?`,
      [routeId, stopId]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Lấy sequence lớn nhất của một route (để thêm stop mới ở cuối)
   * @param {number} routeId - Mã tuyến đường
   * @returns {Promise<number>} Sequence lớn nhất (0 nếu chưa có stop)
   */
  async getMaxSequence(routeId) {
    const [rows] = await pool.query(
      `SELECT MAX(sequence) as maxSeq FROM route_stops WHERE route_id = ?`,
      [routeId]
    );
    return rows[0]?.maxSeq || 0;
  },

  /**
   * Thêm stop vào route
   * @param {number} routeId - Mã tuyến đường
   * @param {number} stopId - Mã điểm dừng
   * @param {number} sequence - Thứ tự (nếu không có sẽ tự động +1 từ max)
   * @param {number} dwellSeconds - Thời gian dừng (mặc định 30s)
   * @returns {Promise<boolean>} Thành công hay không
   */
  async addStop(routeId, stopId, sequence = null, dwellSeconds = 30) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Nếu không có sequence, lấy max + 1
      if (sequence === null) {
        const maxSeq = await this.getMaxSequence(routeId);
        sequence = maxSeq + 1;
      }

      // Kiểm tra đã tồn tại chưa
      const existing = await this.getByRouteAndStop(routeId, stopId);
      if (existing) {
        await connection.rollback();
        throw new Error("STOP_ALREADY_IN_ROUTE");
      }

      // Kiểm tra sequence trùng
      const [seqCheck] = await connection.query(
        `SELECT * FROM route_stops WHERE route_id = ? AND sequence = ?`,
        [routeId, sequence]
      );
      if (seqCheck.length > 0) {
        await connection.rollback();
        throw new Error("SEQUENCE_ALREADY_EXISTS");
      }

      // Thêm vào route_stops
      await connection.query(
        `INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
         VALUES (?, ?, ?, ?)`,
        [routeId, stopId, sequence, dwellSeconds]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa stop khỏi route
   * @param {number} routeId - Mã tuyến đường
   * @param {number} stopId - Mã điểm dừng
   * @returns {Promise<boolean>} Thành công hay không
   */
  async removeStop(routeId, stopId) {
    const [result] = await pool.query(
      `DELETE FROM route_stops WHERE route_id = ? AND stop_id = ?`,
      [routeId, stopId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Cập nhật sequence và dwell_seconds của stop trong route
   * @param {number} routeId - Mã tuyến đường
   * @param {number} stopId - Mã điểm dừng
   * @param {number} sequence - Thứ tự mới
   * @param {number} dwellSeconds - Thời gian dừng mới
   * @returns {Promise<boolean>} Thành công hay không
   */
  async updateStop(routeId, stopId, sequence = null, dwellSeconds = null) {
    const fields = [];
    const values = [];

    if (sequence !== null) {
      fields.push("sequence = ?");
      values.push(sequence);
    }
    if (dwellSeconds !== null) {
      fields.push("dwell_seconds = ?");
      values.push(dwellSeconds);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(routeId, stopId);
    const query = `UPDATE route_stops SET ${fields.join(", ")} 
                   WHERE route_id = ? AND stop_id = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  /**
   * Sắp xếp lại thứ tự stops trong route
   * @param {number} routeId - Mã tuyến đường
   * @param {Array<{stopId: number, sequence: number}>} items - Danh sách stopId và sequence mới
   * @returns {Promise<boolean>} Thành công hay không
   */
  async reorderStops(routeId, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validate: không trùng sequence
      const sequences = items.map((item) => item.sequence);
      if (new Set(sequences).size !== sequences.length) {
        await connection.rollback();
        throw new Error("DUPLICATE_SEQUENCE");
      }

      // Validate: tất cả stopId phải thuộc route này
      const stopIds = items.map((item) => item.stopId);
      const [existing] = await connection.query(
        `SELECT stop_id FROM route_stops WHERE route_id = ? AND stop_id IN (?)`,
        [routeId, stopIds]
      );
      if (existing.length !== stopIds.length) {
        await connection.rollback();
        throw new Error("INVALID_STOP_ID");
      }

      // Update từng stop
      for (const item of items) {
        await connection.query(
          `UPDATE route_stops SET sequence = ? 
           WHERE route_id = ? AND stop_id = ?`,
          [item.sequence, routeId, item.stopId]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa tất cả stops của một route
   * @param {number} routeId - Mã tuyến đường
   * @returns {Promise<number>} Số lượng stops đã xóa
   */
  async deleteByRouteId(routeId) {
    const [result] = await pool.query(
      `DELETE FROM route_stops WHERE route_id = ?`,
      [routeId]
    );
    return result.affectedRows;
  },

  /**
   * Kiểm tra stop có đang được sử dụng trong route nào không
   * @param {number} stopId - Mã điểm dừng
   * @returns {Promise<boolean>} True nếu đang được sử dụng
   */
  async isStopInUse(stopId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM route_stops WHERE stop_id = ?`,
      [stopId]
    );
    return rows[0].count > 0;
  },

  /**
   * Lấy tất cả routes chứa stop này
   * @param {number} stopId - Mã điểm dừng
   * @returns {Promise<Array>} Danh sách routes
   */
  async getRoutesByStopId(stopId) {
    const [rows] = await pool.query(
      `SELECT 
        t.maTuyen,
        t.tenTuyen,
        rs.sequence,
        rs.dwell_seconds
      FROM route_stops rs
      JOIN TuyenDuong t ON t.maTuyen = rs.route_id
      WHERE rs.stop_id = ?
      ORDER BY t.tenTuyen, rs.sequence`,
      [stopId]
    );
    return rows;
  },
};

export default RouteStopModel;

