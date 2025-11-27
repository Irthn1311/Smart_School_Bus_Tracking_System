import ThongBaoModel from "../models/ThongBaoModel.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import HocSinhModel from "../models/HocSinhModel.js";

/**
 * 🚨 Delay Alert Service
 * Phát hiện xe chạy trễ và gửi thông báo cho Admin + Phụ huynh
 */

const DELAY_THRESHOLD_MINUTES = 5; // Ngưỡng cảnh báo: 5 phút
const DELAY_ALERT_INTERVAL_MS = 3 * 60 * 1000; // 3 phút - chỉ gửi 1 lần mỗi 3 phút

// Cache để tránh spam notifications
const lastAlertTime = new Map(); // tripId -> timestamp

class DelayAlertService {
  /**
   * Kiểm tra xem chuyến đi có bị trễ không
   * @param {number} tripId - ID chuyến đi
   * @returns {Promise<{isDelayed: boolean, delayMinutes: number, severity: string}>}
   */
  static async checkTripDelay(tripId) {
    try {
      // Lấy thông tin chuyến đi
      const trip = await ChuyenDiModel.getById(tripId);
      if (!trip || trip.trangThai === 'hoan_thanh' || trip.trangThai === 'huy') {
        return { isDelayed: false, delayMinutes: 0, severity: 'none' };
      }

      // Lấy thông tin lịch trình
      const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
      if (!schedule) {
        return { isDelayed: false, delayMinutes: 0, severity: 'none' };
      }

      // Tính toán delay
      const now = new Date();
      const scheduledDateTime = new Date(trip.ngayChay);
      
      // Combine ngayChay với gioKhoiHanh
      const [hours, minutes, seconds] = schedule.gioKhoiHanh.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0), 0);

      // Tính số phút chênh lệch
      const delayMs = now - scheduledDateTime;
      const delayMinutes = Math.floor(delayMs / 60000);

      // Xác định severity
      let severity = 'none';
      let isDelayed = false;

      if (delayMinutes >= DELAY_THRESHOLD_MINUTES) {
        isDelayed = true;
        if (delayMinutes >= 15) severity = 'critical';
        else if (delayMinutes >= 10) severity = 'high';
        else severity = 'medium';
      }

      return { isDelayed, delayMinutes, severity, trip, schedule };
    } catch (error) {
      console.error('[DelayAlertService] Error checking delay:', error);
      return { isDelayed: false, delayMinutes: 0, severity: 'none' };
    }
  }

  /**
   * Gửi thông báo delay cho Admin và Phụ huynh
   * @param {number} tripId - ID chuyến đi
   * @param {Object} io - Socket.IO instance
   */
  static async sendDelayAlert(tripId, io) {
    try {
      // Check rate limit (chỉ gửi 1 lần mỗi 3 phút)
      const lastAlert = lastAlertTime.get(tripId);
      const now = Date.now();
      if (lastAlert && (now - lastAlert) < DELAY_ALERT_INTERVAL_MS) {
        console.log(`⏱️ [DelayAlert] Skipping - Last alert was ${Math.floor((now - lastAlert) / 1000)}s ago`);
        return { sent: false, reason: 'rate_limited' };
      }

      // Check delay
      const { isDelayed, delayMinutes, severity, trip, schedule } = await this.checkTripDelay(tripId);

      if (!isDelayed) {
        return { sent: false, reason: 'not_delayed' };
      }

      console.log(`🚨 [DelayAlert] Trip ${tripId} delayed by ${delayMinutes} minutes (${severity})`);

      // Update last alert time
      lastAlertTime.set(tripId, now);

      const severityEmoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : '🟡';
      const severityText = severity === 'critical' ? 'RẤT TRỄ' : severity === 'high' ? 'TRỄ NHIỀU' : 'TRỄ';

      // 1. Gửi thông báo cho ADMIN
      const { default: pool } = await import("../config/db.js");
      const [admins] = await pool.query(
        `SELECT maNguoiDung FROM NguoiDung WHERE vaiTro = 'quan_tri'`
      );

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          maNguoiNhan: admin.maNguoiDung,
          tieuDe: `${severityEmoji} Xe chạy ${severityText}`,
          noiDung: `Chuyến #${tripId} (${schedule.tenTuyen || trip.tenTuyen}) đang chạy trễ ${delayMinutes} phút so với lịch trình (${schedule.gioKhoiHanh}).`,
          loaiThongBao: 'chuyen_di'
        }));

        // Lưu vào database
        await Promise.all(adminNotifications.map(notif => ThongBaoModel.create(notif)));
        console.log(`✅ [DelayAlert] Saved ${adminNotifications.length} admin notifications`);

        // Gửi realtime
        if (io) {
          admins.forEach(admin => {
            io.to(`user-${admin.maNguoiDung}`).emit('notification', {
              type: 'delay_alert',
              title: `${severityEmoji} Xe chạy ${severityText}`,
              message: `Chuyến #${tripId} trễ ${delayMinutes} phút`,
              severity: severity,
              delayMinutes: delayMinutes,
              maChuyen: tripId
            });
          });
          console.log(`🔔 [DelayAlert] Sent realtime to ${admins.length} admins`);
        }
      }

      // 2. Gửi thông báo cho PHỤ HUYNH
      const students = await HocSinhModel.getByTripId(tripId);
      const parentIds = [...new Set(students.map(s => s.maPhuHuynh).filter(Boolean))];

      if (parentIds.length > 0) {
        const parentNotifications = parentIds.map(maPhuHuynh => ({
          maNguoiNhan: maPhuHuynh,
          tieuDe: `${severityEmoji} Xe đang chạy trễ`,
          noiDung: `Xe buýt chuyến #${tripId} (${schedule.tenTuyen || trip.tenTuyen}) đang chạy trễ ${delayMinutes} phút. Chúng tôi sẽ thông báo khi xe đến điểm đón.`,
          loaiThongBao: 'chuyen_di'
        }));

        // Lưu vào database
        await Promise.all(parentNotifications.map(notif => ThongBaoModel.create(notif)));
        console.log(`✅ [DelayAlert] Saved ${parentNotifications.length} parent notifications`);

        // Gửi realtime
        if (io) {
          parentIds.forEach(parentId => {
            io.to(`user-${parentId}`).emit('notification', {
              type: 'delay_alert',
              title: `${severityEmoji} Xe đang chạy trễ`,
              message: `Chuyến #${tripId} trễ ${delayMinutes} phút`,
              severity: severity,
              delayMinutes: delayMinutes,
              maChuyen: tripId
            });
          });
          console.log(`🔔 [DelayAlert] Sent realtime to ${parentIds.length} parents`);
        }
      }

      return {
        sent: true,
        delayMinutes,
        severity,
        adminsNotified: admins?.length || 0,
        parentsNotified: parentIds.length
      };
    } catch (error) {
      console.error('[DelayAlertService] Error sending delay alert:', error);
      return { sent: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Clear cache khi chuyến đi kết thúc
   * @param {number} tripId 
   */
  static clearCache(tripId) {
    lastAlertTime.delete(tripId);
    console.log(`🧹 [DelayAlert] Cleared cache for trip ${tripId}`);
  }
}

export default DelayAlertService;
