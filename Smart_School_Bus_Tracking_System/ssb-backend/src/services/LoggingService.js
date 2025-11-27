import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LoggingService {
  constructor() {
    this.logDir = path.join(__dirname, "..", "..", "logs");
    if (!fs.existsSync(this.logDir))
      fs.mkdirSync(this.logDir, { recursive: true });
  }

  format(level, message, meta = {}) {
    const ts = new Date().toISOString();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${ts}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
  }

  write(type, level, message, meta = {}) {
    const file = path.join(
      this.logDir,
      `${type}-${new Date().toISOString().slice(0, 10)}.log`
    );
    fs.appendFileSync(file, this.format(level, message, meta));
    if (process.env.NODE_ENV !== "production")
      console.log(this.format(level, message, meta).trim());
  }

  info(msg, meta = {}) {
    this.write("app", "info", msg, meta);
  }
  warn(msg, meta = {}) {
    this.write("app", "warn", msg, meta);
  }
  error(msg, meta = {}) {
    this.write("app", "error", msg, meta);
  }

  // helpers
  apiRequest(req, res, timeMs = null) {
    this.info("API Request", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      timeMs,
    });
  }
  apiError(err, req) {
    this.error(err.message, {
      stack: err.stack,
      method: req?.method,
      url: req?.originalUrl,
    });
  }
}

const loggingService = new LoggingService();
export default loggingService;
export { LoggingService };
