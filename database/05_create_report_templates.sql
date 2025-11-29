-- Create report_templates table for saving report configurations
-- This table stores user's saved report templates

CREATE TABLE IF NOT EXISTS report_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL COMMENT 'Loại báo cáo: trips, buses, drivers, students, incidents',
  filters_json JSON COMMENT 'Bộ lọc dữ liệu dạng JSON',
  date_range VARCHAR(50) COMMENT 'Khoảng thời gian: 7days, 30days, 90days, custom',
  custom_from DATE COMMENT 'Ngày bắt đầu (nếu date_range = custom)',
  custom_to DATE COMMENT 'Ngày kết thúc (nếu date_range = custom)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES NguoiDung(maNguoiDung) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_report_type (report_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng lưu mẫu báo cáo của người dùng';

