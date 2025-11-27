/**
 * SettingsService - M8: Runtime Configuration Management
 * 
 * Manages system settings that can be changed at runtime:
 * - geofenceRadiusMeters
 * - delayThresholdMinutes
 * - realtimeThrottleSeconds
 * - mapsProvider
 */

// In-memory settings cache (can be persisted to DB later)
let settingsCache = {
  geofenceRadiusMeters: 60,
  delayThresholdMinutes: 5,
  realtimeThrottleSeconds: 2,
  mapsProvider: "google",
  mapsApiKey: null, // Not exposed to API, only for internal use
};

class SettingsService {
  /**
   * Get all settings
   */
  static getSettings() {
    return {
      ...settingsCache,
      // Don't expose sensitive keys
      mapsApiKey: undefined,
    };
  }

  /**
   * Update settings with validation
   */
  static updateSettings(updates) {
    const errors = [];

    // Validate geofenceRadiusMeters
    if (updates.geofenceRadiusMeters !== undefined) {
      const radius = parseInt(updates.geofenceRadiusMeters);
      if (isNaN(radius) || radius < 20 || radius > 200) {
        errors.push({
          field: "geofenceRadiusMeters",
          message: "Bán kính geofence phải từ 20 đến 200 mét",
        });
      } else {
        settingsCache.geofenceRadiusMeters = radius;
      }
    }

    // Validate delayThresholdMinutes
    if (updates.delayThresholdMinutes !== undefined) {
      const delay = parseInt(updates.delayThresholdMinutes);
      if (isNaN(delay) || delay < 1 || delay > 30) {
        errors.push({
          field: "delayThresholdMinutes",
          message: "Ngưỡng trễ phải từ 1 đến 30 phút",
        });
      } else {
        settingsCache.delayThresholdMinutes = delay;
      }
    }

    // Validate realtimeThrottleSeconds
    if (updates.realtimeThrottleSeconds !== undefined) {
      const throttle = parseInt(updates.realtimeThrottleSeconds);
      if (isNaN(throttle) || throttle < 1) {
        errors.push({
          field: "realtimeThrottleSeconds",
          message: "Throttle phải >= 1 giây",
        });
      } else {
        settingsCache.realtimeThrottleSeconds = throttle;
      }
    }

    // Validate mapsProvider
    if (updates.mapsProvider !== undefined) {
      if (!["google", "osm"].includes(updates.mapsProvider)) {
        errors.push({
          field: "mapsProvider",
          message: "Maps provider phải là 'google' hoặc 'osm'",
        });
      } else {
        settingsCache.mapsProvider = updates.mapsProvider;
      }
    }

    if (errors.length > 0) {
      const error = new Error("VALIDATION_ERROR");
      error.errors = errors;
      throw error;
    }

    return this.getSettings();
  }

  /**
   * Get geofence radius (for telemetryService)
   */
  static getGeofenceRadius() {
    return settingsCache.geofenceRadiusMeters;
  }

  /**
   * Get delay threshold (for telemetryService)
   */
  static getDelayThreshold() {
    return settingsCache.delayThresholdMinutes;
  }

  /**
   * Get throttle seconds (for telemetryService)
   */
  static getThrottleSeconds() {
    return settingsCache.realtimeThrottleSeconds;
  }

  /**
   * Initialize settings from environment variables
   */
  static initialize() {
    if (process.env.GEOFENCE_RADIUS_METERS) {
      settingsCache.geofenceRadiusMeters = parseInt(process.env.GEOFENCE_RADIUS_METERS) || 60;
    }
    if (process.env.DELAY_THRESHOLD_MINUTES) {
      settingsCache.delayThresholdMinutes = parseInt(process.env.DELAY_THRESHOLD_MINUTES) || 5;
    }
    if (process.env.REALTIME_THROTTLE_SECONDS) {
      settingsCache.realtimeThrottleSeconds = parseInt(process.env.REALTIME_THROTTLE_SECONDS) || 2;
    }
    if (process.env.MAPS_PROVIDER) {
      settingsCache.mapsProvider = process.env.MAPS_PROVIDER;
    }
    if (process.env.MAPS_API_KEY) {
      settingsCache.mapsApiKey = process.env.MAPS_API_KEY;
    }
  }
}

// Initialize on module load
SettingsService.initialize();

export default SettingsService;

