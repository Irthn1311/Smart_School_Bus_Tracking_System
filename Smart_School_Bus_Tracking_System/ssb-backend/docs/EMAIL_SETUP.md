# 📧 Hướng dẫn cấu hình Email Service

Email Service được sử dụng để gửi thông tin tài khoản phụ huynh khi tạo học sinh mới.

## ⚙️ Cấu hình trong file .env

Thêm các biến sau vào file `.env` trong thư mục `ssb-backend`:

```env
# =============================================================================
# Email Configuration (SMTP)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📮 Cấu hình Gmail (Khuyến nghị)

### Bước 1: Bật xác thực 2 bước
1. Truy cập [Google Account Security](https://myaccount.google.com/security)
2. Bật **2-Step Verification** (Xác thực 2 bước)

### Bước 2: Tạo App Password
1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
2. Chọn **Mail** và **Other (Custom name)**
3. Nhập tên: "Smart School Bus"
4. Google sẽ tạo một mật khẩu 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)
5. **Lưu ý**: Sử dụng mật khẩu này (bỏ khoảng trắng) trong `SMTP_PASS`

### Bước 3: Cấu hình trong .env
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop  # App Password (16 ký tự, không có khoảng trắng)
```

## 📧 Cấu hình các Email Provider khác

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### SendGrid (Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailtrap (Testing/Development)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

## 🔍 Kiểm tra cấu hình

Sau khi cấu hình, khởi động lại backend server. Khi tạo học sinh mới với email phụ huynh:

- **Nếu đã cấu hình đúng**: Email sẽ được gửi tự động đến phụ huynh
- **Nếu chưa cấu hình**: Thông tin đăng nhập sẽ được in ra console/log để bạn có thể gửi thủ công

## ⚠️ Lưu ý bảo mật

1. **KHÔNG commit file `.env`** vào Git
2. Sử dụng **App Password** thay vì mật khẩu chính của Gmail
3. Trong production, nên sử dụng dịch vụ email chuyên nghiệp như SendGrid, AWS SES, hoặc Mailgun

## 🧪 Test Email Service

Để test email service, bạn có thể:
1. Tạo một học sinh mới với email phụ huynh
2. Kiểm tra inbox của email phụ huynh
3. Nếu không nhận được email, kiểm tra:
   - Console log để xem có lỗi không
   - Spam folder
   - Cấu hình SMTP có đúng không

## 📝 Template Email

Email sẽ được gửi với nội dung HTML đẹp mắt bao gồm:
- Thông tin đăng nhập (Email và mật khẩu)
- Hướng dẫn đăng nhập
- Lưu ý bảo mật
- Link đăng nhập

