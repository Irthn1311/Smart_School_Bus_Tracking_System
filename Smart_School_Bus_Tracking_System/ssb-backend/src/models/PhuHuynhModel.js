import pool from "../config/db.js";

const PhuHuynhModel = {
  async getAll() {
    const [rows] = await pool.query("SELECT * FROM phuhuynh");
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM phuhuynh WHERE maPhuHuynh = ?",
      [id]
    );
    return rows[0];
  },

  async create(data) {
    const { hoTen, sdt, email, diaChi } = data;
    const [result] = await pool.query(
      `INSERT INTO phuhuynh (hoTen, sdt, email, diaChi)
       VALUES (?, ?, ?, ?)`,
      [hoTen, sdt, email, diaChi]
    );
    return result.insertId;
  },

  async update(id, data) {
    const { hoTen, sdt, email, diaChi } = data;
    const [result] = await pool.query(
      `UPDATE phuhuynh
       SET hoTen = ?, sdt = ?, email = ?, diaChi = ?
       WHERE maPhuHuynh = ?`,
      [hoTen, sdt, email, diaChi, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query(
      "DELETE FROM phuhuynh WHERE maPhuHuynh = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

export default PhuHuynhModel;
