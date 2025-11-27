import nodemailer from "nodemailer";
import config from "../config/env.js";
const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

class EmailService {
  static transporter = null;

  static getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Chỉ tạo transporter nếu có cấu hình email
    if (!user || !pass) {
      console.warn("Email disabled: SMTP_USER/SMTP_PASS missing");
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    return this.transporter;
  }

  /**
   * Gửi email thông tin tài khoản phụ huynh mới
   * @param {string} toEmail - Email người nhận
   * @param {string} parentName - Tên phụ huynh
   * @param {string} email - Email đăng nhập
   * @param {string} password - Mật khẩu
   * @param {string} phone - Số điện thoại
   */
  static async sendParentAccountInfo(toEmail, parentName, email, password, phone) {
    try {
      const transporter = this.getTransporter();

      if (!transporter) {
        // Nếu không có cấu hình email, chỉ log thông tin
        console.log("=".repeat(60));
        console.log("📧 EMAIL THÔNG TIN TÀI KHOẢN PHỤ HUYNH");
        console.log("=".repeat(60));
        console.log(`Gửi đến: ${toEmail}`);
        console.log(`Tên phụ huynh: ${parentName}`);
        console.log(`Email đăng nhập: ${email}`);
        console.log(`Mật khẩu: ${password}`);
        console.log(`SĐT: ${phone}`);
        console.log("=".repeat(60));
        console.log("\n⚠️  Lưu ý: Email service chưa được cấu hình.");
        console.log("   Vui lòng cấu hình SMTP trong .env để gửi email tự động.\n");
        return { success: true, sent: false, message: "Email service not configured" };
      }

      const mailOptions = {
        from: `"Smart School Bus" <${config.email.user}>`,
        to: toEmail,
        subject: "Thông tin tài khoản phụ huynh - Smart School Bus",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }
              .info-row { margin: 10px 0; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #111827; margin-left: 10px; }
              .warning { background: #fef3c7; border-left-color: #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Smart School Bus</h1>
                <p>Thông tin tài khoản phụ huynh</p>
              </div>
              <div class="content">
                <p>Xin chào <strong>${parentName}</strong>,</p>
                <p>Tài khoản phụ huynh của bạn đã được tạo thành công trong hệ thống Smart School Bus.</p>
                
                <div class="info-box">
                  <h3 style="margin-top: 0;">Thông tin đăng nhập:</h3>
                  <div class="info-row">
                    <span class="label">Email:</span>
                    <span class="value">${email}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Mật khẩu:</span>
                    <span class="value"><strong>${password}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Số điện thoại:</span>
                    <span class="value">${phone || "—"}</span>
                  </div>
                </div>

                <div class="warning">
                  <strong>⚠️ Lưu ý bảo mật:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên</li>
                    <li>Không chia sẻ thông tin đăng nhập với người khác</li>
                    <li>Bảo mật thông tin tài khoản của bạn</li>
                  </ul>
                </div>

                <p>Bạn có thể đăng nhập tại: <a href="${config.frontend.origin}/login">${config.frontend.origin}/login</a></p>
                
                <div class="footer">
                  <p>Trân trọng,<br>Đội ngũ Smart School Bus</p>
                  <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                    Email này được gửi tự động, vui lòng không trả lời.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", info.messageId);
      return { success: true, sent: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending email:", error);
      // Không throw error để không làm gián đoạn quá trình tạo học sinh
      return { success: false, sent: false, error: error.message };
    }
  }

  /**
   * Gửi email mật khẩu mới sau khi reset
   * @param {string} toEmail - Email người nhận
   * @param {string} userName - Tên người dùng
   * @param {string} newPassword - Mật khẩu mới
   */
  static async sendPasswordReset(toEmail, userName, newPassword) {
    try {
      const transporter = this.getTransporter();

      if (!transporter) {
        // Nếu không có cấu hình email, chỉ log thông tin
        console.log("=".repeat(60));
        console.log("📧 EMAIL RESET MẬT KHẨU");
        console.log("=".repeat(60));
        console.log(`Gửi đến: ${toEmail}`);
        console.log(`Tên người dùng: ${userName}`);
        console.log(`Mật khẩu mới: ${newPassword}`);
        console.log("=".repeat(60));
        console.log("\n⚠️  Lưu ý: Email service chưa được cấu hình.");
        console.log("   Vui lòng cấu hình SMTP trong .env để gửi email tự động.\n");
        return { success: true, sent: false, message: "Email service not configured" };
      }

      const mailOptions = {
        from: `"Smart School Bus" <${config.email.user}>`,
        to: toEmail,
        subject: "Mật khẩu mới - Smart School Bus",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }
              .password-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center; }
              .password { font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px; }
              .warning { background: #fee2e2; border-left-color: #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Smart School Bus</h1>
                <p>Yêu cầu đặt lại mật khẩu</p>
              </div>
              <div class="content">
                <p>Xin chào <strong>${userName}</strong>,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                
                <div class="info-box">
                  <h3 style="margin-top: 0;">Mật khẩu mới của bạn:</h3>
                  <div class="password-box">
                    <div class="password">${newPassword}</div>
                  </div>
                </div>

                <div class="warning">
                  <strong>⚠️ Lưu ý bảo mật:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này</li>
                    <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                    <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ quản trị viên ngay lập tức</li>
                  </ul>
                </div>

                <p>Bạn có thể đăng nhập tại: <a href="${config.frontend.origin}/login">${config.frontend.origin}/login</a></p>
                
                <div class="footer">
                  <p>Trân trọng,<br>Đội ngũ Smart School Bus</p>
                  <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                    Email này được gửi tự động, vui lòng không trả lời.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent successfully:", info.messageId);
      return { success: true, sent: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);
      return { success: false, sent: false, error: error.message };
    }
  }
}

export default EmailService;

