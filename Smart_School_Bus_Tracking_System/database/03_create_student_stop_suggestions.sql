-- Migration: Create student_stop_suggestions table
-- Bảng lưu mapping gợi ý học sinh - điểm dừng cho route
-- Được tạo tự động khi admin tạo route từ start → end

USE school_bus_system;

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS student_stop_suggestions;

CREATE TABLE student_stop_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maDiemDung INT NOT NULL,
    maHocSinh INT NOT NULL,
    
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_sss_route_sss
        FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) 
        ON DELETE CASCADE,
    CONSTRAINT fk_sss_stop_sss
        FOREIGN KEY (maDiemDung) REFERENCES DiemDung(maDiem) 
        ON DELETE CASCADE,
    CONSTRAINT fk_sss_student_sss
        FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) 
        ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_route (maTuyen),
    INDEX idx_stop (maDiemDung),
    INDEX idx_student (maHocSinh),
    INDEX idx_route_stop (maTuyen, maDiemDung)
    
    -- Mỗi học sinh chỉ được gợi ý 1 lần cho mỗi route (có thể ở nhiều stop khác nhau trong các route khác)
    -- Nhưng trong 1 route, 1 học sinh có thể được gợi ý ở nhiều stop (để admin chọn)
    -- Vì vậy không có UNIQUE constraint ở đây
    -- Admin sẽ chọn stop cuối cùng khi tạo schedule
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE student_stop_suggestions 
  COMMENT = 'Lưu mapping gợi ý học sinh - điểm dừng cho route (tự động tạo khi tạo route auto)';


SELECT 'Table student_stop_suggestions created successfully!' as message;

