import pool from "../config/db.js";

class ReportTemplateModel {
  // Create a new report template
  async create(data) {
    const { user_id, name, report_type, filters_json, date_range, custom_from, custom_to } = data;

    const [result] = await pool.query(
      `INSERT INTO report_templates 
       (user_id, name, report_type, filters_json, date_range, custom_from, custom_to) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        name,
        report_type,
        filters_json ? JSON.stringify(filters_json) : null,
        date_range,
        custom_from,
        custom_to,
      ]
    );

    return this.getById(result.insertId);
  }

  // Get template by ID
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM report_templates WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Get all templates for a user
  async getByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM report_templates 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((row) => ({
      ...row,
      filters_json: row.filters_json ? JSON.parse(row.filters_json) : null,
    }));
  }

  // Update template
  async update(id, data) {
    const { name, report_type, filters_json, date_range, custom_from, custom_to } = data;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (report_type !== undefined) {
      updates.push("report_type = ?");
      values.push(report_type);
    }
    if (filters_json !== undefined) {
      updates.push("filters_json = ?");
      values.push(filters_json ? JSON.stringify(filters_json) : null);
    }
    if (date_range !== undefined) {
      updates.push("date_range = ?");
      values.push(date_range);
    }
    if (custom_from !== undefined) {
      updates.push("custom_from = ?");
      values.push(custom_from);
    }
    if (custom_to !== undefined) {
      updates.push("custom_to = ?");
      values.push(custom_to);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE report_templates SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  // Delete template
  async delete(id) {
    const [result] = await pool.query(
      `DELETE FROM report_templates WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

export default new ReportTemplateModel();

