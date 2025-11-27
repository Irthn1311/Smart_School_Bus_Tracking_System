/**
 * ===========================================================================
 * File: TripStopStatusModel.js
 * Purpose: Model for trip_stop_status table
 * Description: Quản lý trạng thái thời gian đến/rời từng điểm dừng trong chuyến đi
 * Author: Smart School Bus System
 * Date: 2025-11-13
 * ===========================================================================
 */

import pool from "../config/db.js";

const TripStopStatusModel = {
  /**
   * Tạo hoặc cập nhật thời gian đến điểm dừng
   * @param {number} maChuyen - Trip ID
   * @param {number} thuTuDiem - Stop sequence number
   * @param {Date} thoiGianDen - Arrival time
   * @returns {Promise<Object>} Created/updated record
   */
  async upsertArrival(maChuyen, thuTuDiem, thoiGianDen = new Date()) {
    const sql = `
      INSERT INTO trip_stop_status (maChuyen, thuTuDiem, thoiGianDen)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        thoiGianDen = VALUES(thoiGianDen),
        ngayCapNhat = CURRENT_TIMESTAMP
    `;

    const [result] = await pool.query(sql, [maChuyen, thuTuDiem, thoiGianDen]);
    return result;
  },

  /**
   * Cập nhật thời gian rời điểm dừng
   * @param {number} maChuyen - Trip ID
   * @param {number} thuTuDiem - Stop sequence number
   * @param {Date} thoiGianRoi - Departure time
   * @returns {Promise<Object>} Updated record
   */
  async updateDeparture(maChuyen, thuTuDiem, thoiGianRoi = new Date()) {
    const sql = `
      UPDATE trip_stop_status
      SET thoiGianRoi = ?,
          ngayCapNhat = CURRENT_TIMESTAMP
      WHERE maChuyen = ? AND thuTuDiem = ?
    `;

    const [result] = await pool.query(sql, [thoiGianRoi, maChuyen, thuTuDiem]);
    return result;
  },

  /**
   * Lấy tất cả trạng thái điểm dừng của một chuyến đi
   * @param {number} maChuyen - Trip ID
   * @returns {Promise<Array>} List of stop statuses
   */
  async getByTripId(maChuyen) {
    const sql = `
      SELECT 
        id,
        maChuyen,
        thuTuDiem,
        thoiGianDen,
        thoiGianRoi,
        ngayTao,
        ngayCapNhat
      FROM trip_stop_status
      WHERE maChuyen = ?
      ORDER BY thuTuDiem ASC
    `;

    const [rows] = await pool.query(sql, [maChuyen]);
    return rows;
  },

  /**
   * Lấy trạng thái của một điểm dừng cụ thể
   * @param {number} maChuyen - Trip ID
   * @param {number} thuTuDiem - Stop sequence number
   * @returns {Promise<Object|null>} Stop status or null
   */
  async getByTripAndStop(maChuyen, thuTuDiem) {
    const sql = `
      SELECT 
        id,
        maChuyen,
        thuTuDiem,
        thoiGianDen,
        thoiGianRoi,
        ngayTao,
        ngayCapNhat
      FROM trip_stop_status
      WHERE maChuyen = ? AND thuTuDiem = ?
    `;

    const [rows] = await pool.query(sql, [maChuyen, thuTuDiem]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Xóa tất cả trạng thái của một chuyến đi (dùng khi reset)
   * @param {number} maChuyen - Trip ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByTripId(maChuyen) {
    const sql = `DELETE FROM trip_stop_status WHERE maChuyen = ?`;
    const [result] = await pool.query(sql, [maChuyen]);
    return result;
  },

  /**
   * Kiểm tra xem điểm dừng đã được arrive chưa
   * @param {number} maChuyen - Trip ID
   * @param {number} thuTuDiem - Stop sequence number
   * @returns {Promise<boolean>} True if arrived
   */
  async hasArrived(maChuyen, thuTuDiem) {
    const status = await this.getByTripAndStop(maChuyen, thuTuDiem);
    return status && status.thoiGianDen != null;
  },

  /**
   * Kiểm tra xem điểm dừng đã được leave chưa
   * @param {number} maChuyen - Trip ID
   * @param {number} thuTuDiem - Stop sequence number
   * @returns {Promise<boolean>} True if left
   */
  async hasLeft(maChuyen, thuTuDiem) {
    const status = await this.getByTripAndStop(maChuyen, thuTuDiem);
    return status && status.thoiGianRoi != null;
  },
};

export default TripStopStatusModel;
