import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    user: string;
    password: string;
    name: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  frontend: {
    origin: string | string[];
  };
  socket: {
    corsOrigin: string;
  };
  websocket: {
    enabled: boolean;
  };
  api: {
    prefix: string;
  };
  logging: {
    level: string;
    file: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  upload: {
    maxFileSize: number;
    path: string;
  };
  email?: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  monitoring?: {
    sentryDsn?: string;
  };
}

const requiredEnvVars = [
  "PORT",
  "DB_HOST",
  "DB_USER",
  // 'DB_PASS', // Optional - can be empty for local dev
  "DB_NAME",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "FE_ORIGIN",
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const config: Config = {
  port: parseInt(process.env["PORT"] || "4000", 10),
  nodeEnv: process.env["NODE_ENV"] || "development",
  database: {
    host: process.env["DB_HOST"]!,
    user: process.env["DB_USER"]!,
    password: process.env["DB_PASS"] || "",
    name: process.env["DB_NAME"]!,
  },
  jwt: {
    secret: process.env["JWT_SECRET"]!,
    refreshSecret: process.env["JWT_REFRESH_SECRET"]!,
    expiresIn: process.env["JWT_EXPIRES_IN"] || "15m",
    refreshExpiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] || "7d",
  },
  websocket: {
    enabled: process.env["WS_ENABLED"] !== "false", // Default true
  },
  frontend: {
    origin: process.env["FE_ORIGIN"]!.split(",").map((o) => o.trim()), // Hỗ trợ nhiều origins
  },
  socket: {
    corsOrigin: process.env["SOCKET_CORS_ORIGIN"] || process.env["FE_ORIGIN"]!,
  },
  api: {
    prefix: process.env["API_PREFIX"] || "/api/v1",
  },
  logging: {
    level: process.env["LOG_LEVEL"] || "info",
    file: process.env["LOG_FILE"] || "logs/app.log",
  },
  rateLimit: {
    windowMs: parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "900000", 10),
    maxRequests: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100", 10),
  },
  upload: {
    maxFileSize: parseInt(process.env["MAX_FILE_SIZE"] || "5242880", 10),
    path: process.env["UPLOAD_PATH"] || "uploads/",
  },
};

// Optional configurations
if (process.env["SMTP_HOST"]) {
  config.email = {
    host: process.env["SMTP_HOST"],
    port: parseInt(process.env["SMTP_PORT"] || "587", 10),
    user: process.env["SMTP_USER"]!,
    password: process.env["SMTP_PASS"]!,
  };
}

if (process.env["REDIS_HOST"]) {
  config.redis = {
    host: process.env["REDIS_HOST"],
    port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
    ...(process.env["REDIS_PASSWORD"] && {
      password: process.env["REDIS_PASSWORD"],
    }),
  };
}

if (process.env["SENTRY_DSN"]) {
  config.monitoring = {
    sentryDsn: process.env["SENTRY_DSN"],
  };
}

export default config;
