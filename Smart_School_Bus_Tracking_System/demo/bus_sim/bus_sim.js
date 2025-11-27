// File: demo/bus-sim/bus_sim.js [cite: 68]
// Script mô phỏng xe buýt chạy và gửi tọa độ qua Socket.IO

// Import thư viện Socket.IO client và file config
const { io } = require("socket.io-client");
const fs = require('fs');
const path = require('path');

// --- CẤU HÌNH ---
const configPath = path.join(__dirname, 'bus_sim.config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Lấy tham số từ dòng lệnh (ví dụ: node bus_sim.js --routeId=QA-ROUTE-1 --mode=delay)
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace('--', '')] = value;
    return acc;
}, {});

const ROUTE_ID = args.routeId || 'QA-ROUTE-1';
const MODE = args.mode || 'normal'; // 'normal', 'delay', 'breakdown', 'skip_stop'
const SPEED_KMH = parseFloat(args.speed) || 25; // Tốc độ mô phỏng 25 km/h 
const EMIT_INTERVAL_MS = 3000; // Emit mỗi 3 giây 

// URL máy chủ Socket.IO (lấy từ file .env, ví dụ http://localhost:4000)
const WS_URL = "http://localhost:4000"; 
// --- KẾT THÚC CẤU HÌNH ---


// Lấy dữ liệu tuyến đường từ config
const route = CONFIG.routes[ROUTE_ID];
if (!route) {
    console.error(`Lỗi: Không tìm thấy tuyến đường với ID: ${ROUTE_ID}`);
    process.exit(1);
}

const { tripId, busId, stops } = route;
const scenario = CONFIG.scenarios[MODE];

console.log(`🚌 Bắt đầu mô phỏng tuyến: ${route.name} (Chuyến: ${tripId}, Xe: ${busId})`);
console.log(`📡 Kết nối tới máy chủ: ${WS_URL}`);
console.log(`⚙️ Chế độ: ${MODE}, Tốc độ: ${SPEED_KMH} km/h`);

// Kết nối tới máy chủ Socket.IO
// Giả định server cần token của tài xế để xác thực
const socket = io(WS_URL, {
    auth: {
        // LƯU Ý: Đây là token của Tài xế (@qa_driver_1)
        // Bạn PHẢI dán token của tài xế vào đây
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidGFpeGUxQHNjaG9vbGJ1cy52biIsInZhaVRybyI6InRhaV94ZSIsImlhdCI6MTc2MzEzMDUwNywiZXhwIjoxNzYzMTMyMzA3fQ.QJ5y2CTH5KPQ5R9Hj_c_ipdpaNWQ4IJ4PwlAOEmWYHY"
    }
});

socket.on("connect", () => {
    console.log(`✅ Đã kết nối tới server (Socket ID: ${socket.id})`);
    
    // Tham gia "room" của chuyến đi để server biết xe này đang chạy
    const roomName = `trip-${tripId}`;
    socket.emit("join_room", roomName); 
    console.log(`🚪 Đã tham gia room: ${roomName}`);

    // Bắt đầu mô phỏng
    simulateTrip();
});

socket.on("connect_error", (err) => {
    console.error(`❌ Lỗi kết nối Socket: ${err.message}`);
});

socket.on("disconnect", (reason) => {
    console.warn(`🔌 Đã ngắt kết nối: ${reason}`);
});


/**
 * Hàm mô phỏng toàn bộ chuyến đi
 */
async function simulateTrip() {
    console.log(`🚀 Chuyến đi bắt đầu! Tổng cộng ${stops.length} điểm dừng.`);

    for (let i = 0; i < stops.length; i++) {
        const startStop = (i === 0) ? stops[i] : stops[i-1];
        const endStop = stops[i];
        
        let startLat = startStop.lat;
        let startLng = startStop.lng;
        // Điểm đầu tiên không có điểm bắt đầu trước đó, nên tọa độ bắt đầu = tọa độ dừng
        if (i === 0) {
            startLat = stops[i].lat - 0.001; // Giả lập điểm bắt đầu
            startLng = stops[i].lng - 0.001; 
        }

        console.log(`\n🚦 Đang di chuyển từ "${startStop.name}" đến "${endStop.name}"`);

        // --- XỬ LÝ KỊCH BẢN DEMO --- 
        if (scenario && scenario.stopIndex === i) {
            switch (MODE) {
                case 'delay': // 
                    const delayMs = scenario.delayMinutes * 60 * 1000;
                    console.warn(`⚠️ KỊCH BẢN: Trễ ${scenario.delayMinutes} phút tại trạm này...`);
                    // Gửi sự kiện trễ
                    socket.emit("delay_alert", {
                        tripId: tripId,
                        delaySec: scenario.delayMinutes * 60,
                        nextStopId: endStop.name // Giả định stopId là tên
                    });
                    await sleep(delayMs);
                    break;
                case 'breakdown': // 
                    const durationMs = scenario.durationMinutes * 60 * 1000;
                    console.error(`🔥 KỊCH BẢN: Hư xe! Dừng ${scenario.durationMinutes} phút...`);
                    // Gửi sự kiện hư xe
                    socket.emit("vehicle_issue", { tripId: tripId, status: "breakdown" });
                    await sleep(durationMs);
                    console.log("🔧 Xe đã được sửa. Tiếp tục hành trình.");
                    socket.emit("vehicle_issue", { tripId: tripId, status: "resolved" });
                    break;
                case 'skip_stop': // 
                    console.log(`🏃 KỊCH BẢN: Bỏ lỡ điểm dừng "${endStop.name}"!`);
                    continue; // Bỏ qua vòng lặp này và đi đến điểm dừng tiếp theo
            }
        }
        
        // Mô phỏng di chuyển giữa 2 điểm
        await moveBetweenPoints(startLat, startLng, endStop.lat, endStop.lng);

        console.log(`🛑 Đã đến trạm: "${endStop.name}"`);
        // Gửi sự kiện đã đến trạm (để Tuấn Tài/Phụ huynh test)
        socket.emit("approach_stop", { 
            tripId: tripId, 
            stopId: endStop.name, 
            distM: 10 // Đã đến (cách 10m)
        });

        // Dừng 30s tại trạm
        await sleep(30 * 1000); 
    }

    console.log("\n✅ Đã hoàn thành chuyến đi!");
    socket.disconnect();
}

/**
 * Mô phỏng di chuyển giữa 2 tọa độ và emit vị trí
 */
async function moveBetweenPoints(lat1, lng1, lat2, lng2) {
    const distanceKm = haversine(lat1, lng1, lat2, lng2);
    const durationMs = (distanceKm / SPEED_KMH) * 3600 * 1000;
    const numSteps = Math.floor(durationMs / EMIT_INTERVAL_MS);

    console.log(`   -> Khoảng cách: ${distanceKm.toFixed(2)} km. Dự kiến: ${(durationMs / 1000 / 60).toFixed(1)} phút. Số lần emit: ${numSteps}`);

    for (let i = 0; i < numSteps; i++) {
        const fraction = (i + 1) / numSteps;
        const currentLat = lat1 + (lat2 - lat1) * fraction;
        const currentLng = lng1 + (lng2 - lng1) * fraction;

        const payload = {
            tripId: tripId,
            busId: busId,
            lat: parseFloat(currentLat.toFixed(6)),
            lng: parseFloat(currentLng.toFixed(6)),
            speed: SPEED_KMH + (Math.random() - 0.5) * 5, // Thêm jitter 
            heading: calculateHeading(lat1, lng1, lat2, lng2),
            ts: Date.now()
        };

        // Gửi sự kiện bus_position_update 
        socket.emit("bus_position_update", payload);
        // console.log(`   ... emitting (${payload.lat}, ${payload.lng})`);
        
        await sleep(EMIT_INTERVAL_MS);
    }
}


// --- CÁC HÀM TIỆN ÍCH ---

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tính khoảng cách Haversine (km)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Hàm tính góc (heading)
function calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    lon1 = lon1 * Math.PI / 180;
    lon2 = lon2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    brng = (brng + 360) % 360;
    return brng;
}