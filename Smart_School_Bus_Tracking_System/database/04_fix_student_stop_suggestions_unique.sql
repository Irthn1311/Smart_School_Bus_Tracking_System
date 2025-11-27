-- Migration: Fix UNIQUE constraint in student_stop_suggestions
-- Date: 2025-01-XX
-- Purpose: Remove UNIQUE constraint (maTuyen, maHocSinh) to allow one student 
--          to have multiple stop suggestions in the same route
--          This aligns with the design where a student can be suggested at 2-3 stops
--          and admin can choose the best one

USE school_bus_system;

-- Drop the existing UNIQUE constraint
ALTER TABLE student_stop_suggestions 
DROP INDEX uniq_route_student;

-- Optional: Add UNIQUE constraint on (maTuyen, maHocSinh, maDiemDung) to prevent exact duplicates
-- This prevents inserting the same student-stop combination twice
ALTER TABLE student_stop_suggestions 
ADD UNIQUE KEY uniq_route_student_stop (maTuyen, maHocSinh, maDiemDung);

-- Verify the change
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'school_bus_system'
  AND TABLE_NAME = 'student_stop_suggestions'
ORDER BY CONSTRAINT_NAME;

SELECT 'Migration completed: Removed UNIQUE (maTuyen, maHocSinh), added UNIQUE (maTuyen, maHocSinh, maDiemDung)' as message;

