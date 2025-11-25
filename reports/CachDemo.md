0. Concept chung: Một MVP – Hai “nguồn GPS”

MVP vẫn chỉ có 1 luồng nghiệp vụ:

Start Trip → Xe chạy realtime trên map → Đến gần điểm dừng (≈60m) → Trễ → End Trip.

Khác nhau duy nhất: tọa độ lấy từ đâu:

Chế độ 1 – Demo mô phỏng (DEMO MODE)

Tọa độ được gửi từ script backend (ws:demo).

Chế độ 2 – GPS thật từ điện thoại tài xế (REAL MODE)

Tọa độ lấy từ Geolocation API trên trình duyệt điện thoại của driver.

Mọi thứ khác (Trip, Alert, Socket, UI) tái sử dụng chung → đỡ code, demo rõ ràng.

1. Chế độ 1: DEMO – Script mô phỏng trên backend
1.1. Mục tiêu

Đảm bảo 100% control: không phụ thuộc wifi/4G, không phụ thuộc việc GPS thật có bị “dở chứng” không.

Dùng để demo luồng chuẩn, mượt, ít rủi ro toang.

1.2. Cách giảng viên thao tác / xem

Vai Admin:

Login admin@....

Mở trang:

Trang Lịch / Danh sách chuyến → thấy Trip sáng nay (chưa chạy).

Trang Tracking → map + tuyến + điểm dừng (marker).

Đợi driver Start Trip → thấy trạng thái chuyển Đang chạy, marker xe xuất hiện và di chuyển.

Vai Driver (trên laptop hoặc tab khác):

Login driver@....

Mở trang Chuyến hôm nay.

Nhấn Start Trip → Trip đổi trạng thái, socket bắn trip_started.

Vai Parent:

Login parent@....

Mở trang Theo dõi con → thấy cùng 1 xe đang di chuyển, giống Admin.

1.3. Bên trong hệ thống (kỹ thuật)

Nguồn GPS DEMO:

Ở backend có script, ví dụ:

npm run ws:demo


Script này:

Đọc sẵn danh sách tọa độ mô phỏng (polyline tuyến A).

Mỗi X giây gửi 1 điểm lat/lng lên:

Hoặc qua WebSocket tới server,

Hoặc server chạy script nội bộ và emit luôn bus_position_update.

Luồng xử lý:

Script gửi { tripId, busId, lat, lng, ts }.

Backend:

Validate.

Lưu/cập nhật vị trí hiện tại của bus/trip.

Tính:

Khoảng cách tới stop kế tiếp (Haversine) → nếu ≤ 60m → emit approach_stop.

Kiểm tra trễ so với thời gian dự kiến → nếu trễ → emit delay_alert.

Emit bus_position_update tới:

phòng trip-{tripId},

phòng admin,

phòng parent-{parentId}.

Frontend Admin / Parent:

Lắng nghe socket → update marker trên map + hiện toast/log.

1.4. Cách nói với giảng viên

“Chế độ đầu tiên là DEMO MODE – nguồn tọa độ được mô phỏng từ server.
Em dùng nó để đảm bảo demo luồng Start Trip → xe chạy → đến gần điểm dừng → trễ → End Trip thật mượt, không phụ thuộc 4G hay GPS thật.
Tất cả logic Trip, Alert, Geofence 60m, Realtime đều là logic thật của hệ thống, chỉ khác là nguồn data là ‘giả lập đường đi của xe buýt’.”

2. Chế độ 2: REAL – GPS thật từ điện thoại tài xế
2.1. Mục tiêu

Chứng minh:

“Ứng dụng này không chỉ demo; khi dùng trên điện thoại thật của tài xế, nó có thể gửi chính xác vị trí hiện tại lên server và hiển thị trên map cho Admin/Phụ huynh.”

Đây là điểm cộng lớn: giống Grab/Be mini.

2.2. Cách giảng viên thao tác / xem

Chuẩn bị:

Điện thoại có trình duyệt (Chrome, Safari…) + kết nối chung mạng (hoặc 4G/Hotspot).

Web app deploy trên Internet / ngrok / LAN có thể truy cập từ điện thoại.

Vai Driver (trên điện thoại):

Mở web app, login tài xế.

Vào màn Chuyến hôm nay.

Bật toggle: Nguồn vị trí = “Thiết bị (GPS thật)”.

Lần đầu trình duyệt hỏi “Allow location?” → chọn Allow.

Nhấn Start Trip.

Đi bộ vài bước ngay trong khuôn viên (hoặc chạy quanh lớp/hành lang).

Vai Admin & Parent (trên laptop):

Nhìn map:

Marker xe di chuyển theo vị trí thật của điện thoại.

Nếu đi gần 1 điểm dừng đã cấu hình → event đến gần điểm dừng xuất hiện.

Nếu bạn set giờ dự kiến đã qua → hệ thống báo trễ.

2.3. Bên trong hệ thống (kỹ thuật)

Trên FE driver (web mobile):

Dùng Geolocation API:

navigator.geolocation.getCurrentPosition hoặc watchPosition.

Mỗi X giây (2–5s):

Lấy {lat, lng} mới.

Gửi về backend:

qua WebSocket event: driver_location_update,

hoặc REST: POST /trips/:id/location.

Backend xử lý giống DEMO MODE:

Nhận { tripId, busId, driverId, lat, lng }.

Validate (đúng driver, đúng trip đang chạy).

Cập nhật vị trí.

Tính distance + trễ như DEMO MODE.

Emit bus_position_update, approach_stop, delay_alert y chang.

Tóm lại:
➡️ Chỉ khác “ông phát tọa độ”:

DEMO: script phát.

REAL: điện thoại phát.
Còn lại tất cả pipeline xử lý y hệt.

2.4. Cách nói với giảng viên

“Chế độ thứ hai là REAL MODE – em không dùng data mô phỏng nữa, mà lấy GPS thật từ điện thoại tài xế.
Trên giao diện tài xế, khi bật “Nguồn vị trí = Thiết bị”, trình duyệt sẽ xin quyền truy cập GPS, sau đó định kỳ gửi tọa độ thật về server.
Hệ thống vẫn dùng chung pipeline: tính khoảng cách đến điểm dừng (~60m), kiểm tra trễ, bắn event realtime cho Admin/Phụ huynh.
Như vậy đồ án có thể chuyển từ demo sang chạy thật ngoài thực tế mà không cần đổi kiến trúc.”

3. Gợi ý UI: Cho thầy thấy rõ “2 mode khác nhau nhưng chung nền”

Bạn có thể thêm 1 chỗ chọn rất rõ ràng ở màn Driver:

Nguồn vị trí (Location Source):

🔘 DEMO – Script mô phỏng (server)

🔘 REAL – GPS từ thiết bị

Hoặc dùng toggle:

[Demo Mode] ⬌ [Real GPS Mode]

Khi demo bạn nói:

Phần 1: Bật DEMO trước, cho xem luồng ổn định.

Phần 2: Bật REAL, cầm điện thoại đi vài bước, cho thầy thấy marker nhảy theo mình.