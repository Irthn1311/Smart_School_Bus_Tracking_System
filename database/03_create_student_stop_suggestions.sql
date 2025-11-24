-- Migration: Create student_stop_suggestions table
-- Bảng lưu mapping gợi ý học sinh - điểm dừng cho route
-- Được tạo tự động khi admin tạo route từ start → end

USE school_bus_system;

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS student_stop_suggestions;

-- Drop foreign key constraints if they exist (to avoid errno 121)
-- This is needed when re-running the migration
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS student_stop_suggestions;
SET FOREIGN_KEY_CHECKS = 1;

-- Create student_stop_suggestions table
CREATE TABLE student_stop_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maDiemDung INT NOT NULL,
    maHocSinh INT NOT NULL,
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_student_stop_sug_route
        FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) 
        ON DELETE CASCADE,
    CONSTRAINT fk_student_stop_sug_stop
        FOREIGN KEY (maDiemDung) REFERENCES DiemDung(maDiem) 
        ON DELETE CASCADE,
    CONSTRAINT fk_student_stop_sug_student
        FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) 
        ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_route (maTuyen),
    INDEX idx_stop (maDiemDung),
    INDEX idx_student (maHocSinh),
    INDEX idx_route_stop (maTuyen, maDiemDung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mỗi học sinh chỉ được gợi ý 1 lần cho mỗi route (có thể ở nhiều stop khác nhau trong các route khác)
-- Nhưng trong 1 route, 1 học sinh có thể được gợi ý ở nhiều stop (để admin chọn)
-- Vì vậy không có UNIQUE constraint ở đây
-- Admin sẽ chọn stop cuối cùng khi tạo schedule

-- Add comment
ALTER TABLE student_stop_suggestions COMMENT = 'Lưu mapping gợi ý học sinh - điểm dừng cho route (tự động tạo khi tạo route auto)';

SELECT 'Table student_stop_suggestions created successfully!' as message;

