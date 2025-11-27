/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow cross-origin requests from network IP
  // Thêm IP của các máy client cần truy cập vào đây
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.31.181:3000", // IP máy server của bạn
    "http://10.110.249.34:3000", // IP máy client đang truy cập (từ lỗi)
    // Thêm các IP khác nếu cần:
    // "http://192.168.31.XXX:3000",
    // "http://10.110.249.XXX:3000",
  ],
};

export default nextConfig;
