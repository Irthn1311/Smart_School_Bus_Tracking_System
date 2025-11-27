import pool from "../config/db.js";

const DiemDungModel = {
  // Lấy tất cả điểm dừng (không filter theo route - route được quản lý qua route_stops)
  async getAll() {
    const [rows] = await pool.query(
      `SELECT * FROM DiemDung ORDER BY tenDiem`
    );
    return rows;
  },

  // Lấy điểm dừng theo ID
  async getById(id) {
    const [rows] = await pool.query(`SELECT * FROM DiemDung WHERE maDiem = ?`, [
      id,
    ]);
    return rows[0];
  },

  // Lấy điểm dừng theo tọa độ (để tránh trùng)
  async getByCoordinates(viDo, kinhDo, tolerance = 0.0001) {
    const [rows] = await pool.query(
      `SELECT * FROM DiemDung 
       WHERE ABS(viDo - ?) < ? AND ABS(kinhDo - ?) < ?`,
      [viDo, tolerance, kinhDo, tolerance]
    );
    return rows;
  },

  // Lấy điểm dừng theo tên
  async getByName(tenDiem) {
    const [rows] = await pool.query(
      `SELECT * FROM DiemDung WHERE tenDiem = ?`,
      [tenDiem]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  // Tạo điểm dừng mới (không có maTuyen, thuTu)
  async create(data) {
    const { tenDiem, viDo, kinhDo, address, scheduled_time } = data;

    // Validate tọa độ
    if (viDo < -90 || viDo > 90) {
      throw new Error("INVALID_LATITUDE");
    }
    if (kinhDo < -180 || kinhDo > 180) {
      throw new Error("INVALID_LONGITUDE");
    }

    const [result] = await pool.query(
      `INSERT INTO DiemDung (tenDiem, viDo, kinhDo, address, scheduled_time)
       VALUES (?, ?, ?, ?, ?)`,
      [tenDiem, viDo, kinhDo, address || null, scheduled_time || null]
    );
    return result.insertId;
  },

  // Cập nhật điểm dừng (partial update)
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.tenDiem !== undefined) {
      fields.push("tenDiem = ?");
      values.push(data.tenDiem);
    }
    if (data.viDo !== undefined) {
      if (data.viDo < -90 || data.viDo > 90) {
        throw new Error("INVALID_LATITUDE");
      }
      fields.push("viDo = ?");
      values.push(data.viDo);
    }
    if (data.kinhDo !== undefined) {
      if (data.kinhDo < -180 || data.kinhDo > 180) {
        throw new Error("INVALID_LONGITUDE");
      }
      fields.push("kinhDo = ?");
      values.push(data.kinhDo);
    }
    if (data.address !== undefined) {
      fields.push("address = ?");
      values.push(data.address);
    }
    if (data.scheduled_time !== undefined) {
      fields.push("scheduled_time = ?");
      values.push(data.scheduled_time);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE DiemDung SET ${fields.join(", ")} WHERE maDiem = ?`;

    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  },

  // Xóa điểm dừng (kiểm tra xem có đang được sử dụng trong route_stops không)
  async delete(id) {
    // Kiểm tra xem stop có đang được sử dụng không
    const [inUse] = await pool.query(
      `SELECT COUNT(*) as count FROM route_stops WHERE stop_id = ?`,
      [id]
    );

    if (inUse[0].count > 0) {
      throw new Error("STOP_IN_USE");
    }

    const [result] = await pool.query("DELETE FROM DiemDung WHERE maDiem = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // Lấy điểm dừng trong bounding box (để tìm kiếm theo khu vực)
  async getByBoundingBox(minLat, maxLat, minLng, maxLng) {
    const [rows] = await pool.query(
      `SELECT * FROM DiemDung 
       WHERE viDo BETWEEN ? AND ? AND kinhDo BETWEEN ? AND ?
       ORDER BY tenDiem`,
      [minLat, maxLat, minLng, maxLng]
    );
    return rows;
  },

  async findByNameAndCoords(tenDiem, viDo, kinhDo) {
    const [rows] = await pool.query(
      `
        SELECT *
        FROM DiemDung
        WHERE tenDiem = ?
          AND viDo = ?
          AND kinhDo = ?
        LIMIT 1
      `,
      [tenDiem, viDo, kinhDo]
    );
    return rows[0] || null;
  }

};

export default DiemDungModel;
