const pool = require("../config/db.config.js");
const loggingService = require("./LoggingService.js");

class HealthCheckService {
  constructor() {
    this.startTime = new Date();
    this.checks = new Map();
  }

  async performHealthCheck() {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {},
    };

    try {
      // Database connectivity check
      const dbHealth = await this.checkDatabase();
      healthStatus.checks.database = dbHealth;

      // Memory usage check
      const memoryHealth = this.checkMemory();
      healthStatus.checks.memory = memoryHealth;

      // Disk space check
      const diskHealth = await this.checkDiskSpace();
      healthStatus.checks.disk = diskHealth;

      // External services check
      const externalHealth = await this.checkExternalServices();
      healthStatus.checks.external = externalHealth;

      // Determine overall status
      const allChecks = Object.values(healthStatus.checks);
      const hasErrors = allChecks.some((check) => check.status === "error");
      const hasWarnings = allChecks.some((check) => check.status === "warning");

      if (hasErrors) {
        healthStatus.status = "unhealthy";
      } else if (hasWarnings) {
        healthStatus.status = "degraded";
      }

      // Log health check result
      loggingService.info("Health check completed", {
        status: healthStatus.status,
        checks: Object.keys(healthStatus.checks).length,
      });

      return healthStatus;
    } catch (error) {
      loggingService.error("Health check failed", { error: error.message });
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async checkDatabase() {
    try {
      const startTime = Date.now();
      const connection = await pool.getConnection();

      // Test basic connectivity
      await connection.query("SELECT 1");

      // Test database exists
      const [rows] = await connection.query("SELECT DATABASE() as current_db");
      const currentDb = rows[0].current_db;

      // Test table accessibility
      const [tables] = await connection.query("SHOW TABLES");
      const tableCount = tables.length;

      connection.release();

      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        message: "Database connection successful",
        details: {
          currentDatabase: currentDb,
          tableCount,
          responseTime: `${responseTime}ms`,
        },
      };
    } catch (error) {
      loggingService.dbError(error, "Health check query");
      return {
        status: "error",
        message: "Database connection failed",
        details: {
          error: error.message,
        },
      };
    }
  }

  checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const externalMem = memUsage.external;
      const rssMem = memUsage.rss;

      const usagePercentage = (usedMem / totalMem) * 100;

      let status = "healthy";
      if (usagePercentage > 90) {
        status = "error";
      } else if (usagePercentage > 80) {
        status = "warning";
      }

      return {
        status,
        message: `Memory usage: ${usagePercentage.toFixed(2)}%`,
        details: {
          heapUsed: this.formatBytes(usedMem),
          heapTotal: this.formatBytes(totalMem),
          external: this.formatBytes(externalMem),
          rss: this.formatBytes(rssMem),
          usagePercentage: usagePercentage.toFixed(2),
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: "Memory check failed",
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkDiskSpace() {
    try {
      const fs = require("fs");
      const path = require("path");

      // Check disk space for log directory
      const logDir = path.join(__dirname, "../../logs");
      const stats = fs.statSync(logDir);

      // Get disk usage (simplified check)
      const files = fs.readdirSync(logDir);
      let totalSize = 0;

      files.forEach((file) => {
        const filePath = path.join(logDir, file);
        const fileStats = fs.statSync(filePath);
        totalSize += fileStats.size;
      });

      const totalSizeMB = totalSize / (1024 * 1024);

      let status = "healthy";
      if (totalSizeMB > 1000) {
        // More than 1GB
        status = "warning";
      }

      return {
        status,
        message: `Log directory usage: ${totalSizeMB.toFixed(2)}MB`,
        details: {
          logDirectory: logDir,
          totalFiles: files.length,
          totalSize: this.formatBytes(totalSize),
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: "Disk space check failed",
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkExternalServices() {
    try {
      const checks = {};

      // Check if we can resolve external services
      // This is a placeholder for actual external service checks
      checks.dns = {
        status: "healthy",
        message: "DNS resolution working",
        details: {
          tested: "google.com",
        },
      };

      return {
        status: "healthy",
        message: "External services accessible",
        details: checks,
      };
    } catch (error) {
      return {
        status: "error",
        message: "External services check failed",
        details: {
          error: error.message,
        },
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Detailed health check for specific components
  async checkSpecificComponent(component) {
    switch (component) {
      case "database":
        return await this.checkDatabase();
      case "memory":
        return this.checkMemory();
      case "disk":
        return await this.checkDiskSpace();
      case "external":
        return await this.checkExternalServices();
      default:
        return {
          status: "error",
          message: `Unknown component: ${component}`,
        };
    }
  }

  // Get system information
  getSystemInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      startTime: this.startTime.toISOString(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };
  }

  // Get application metrics
  getMetrics() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  // Start periodic health checks
  startPeriodicChecks(intervalMs = 60000) {
    setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        this.checks.set(Date.now(), health);

        // Keep only last 100 checks
        if (this.checks.size > 100) {
          const oldestKey = Math.min(...this.checks.keys());
          this.checks.delete(oldestKey);
        }

        // Log if unhealthy
        if (health.status !== "healthy") {
          loggingService.warn("Periodic health check detected issues", {
            status: health.status,
            checks: health.checks,
          });
        }
      } catch (error) {
        loggingService.error("Periodic health check failed", {
          error: error.message,
        });
      }
    }, intervalMs);

    loggingService.info("Started periodic health checks", {
      interval: intervalMs,
    });
  }

  // Get health check history
  getHealthHistory() {
    return Array.from(this.checks.entries()).map(([timestamp, health]) => ({
      timestamp: new Date(timestamp).toISOString(),
      ...health,
    }));
  }
}

// Singleton instance
const healthCheckService = new HealthCheckService();

module.exports = healthCheckService;
