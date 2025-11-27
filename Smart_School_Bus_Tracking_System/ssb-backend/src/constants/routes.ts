// HTTP route constants
export const ROUTES = {
  // Authentication routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Bus management routes
  BUSES: {
    BASE: '/buses',
    BY_ID: '/buses/:id',
    ASSIGN_DRIVER: '/buses/:id/assign-driver',
    POSITION: '/buses/:id/position',
    STATUS: '/buses/:id/status',
    STATS: '/buses/stats',
  },
  
  // Driver management routes
  DRIVERS: {
    BASE: '/drivers',
    BY_ID: '/drivers/:id',
    ASSIGNMENTS: '/drivers/:id/assignments',
    SCHEDULES: '/drivers/:id/schedules',
    TRIPS: '/drivers/:id/trips',
    STATS: '/drivers/stats',
  },
  
  // Route management routes
  ROUTES: {
    BASE: '/routes',
    BY_ID: '/routes/:id',
    STOPS: '/routes/:id/stops',
    STOP_BY_ID: '/routes/:id/stops/:stopId',
    STATS: '/routes/stats',
  },
  
  // Schedule management routes
  SCHEDULES: {
    BASE: '/schedules',
    BY_ID: '/schedules/:id',
    ASSIGN: '/schedules/:id/assign',
    TRIP_STATUS: '/schedules/:id/trip-status',
    CONFLICTS: '/schedules/conflicts',
    STATS: '/schedules/stats',
  },
  
  // Trip management routes
  TRIPS: {
    BASE: '/trips',
    BY_ID: '/trips/:id',
    START: '/trips/:id/start',
    END: '/trips/:id/end',
    STUDENT_STATUS: '/trips/:id/students/:studentId/status',
    POSITION: '/trips/:id/position',
    STATS: '/trips/stats',
  },
  
  // Student management routes
  STUDENTS: {
    BASE: '/students',
    BY_ID: '/students/:id',
    PARENT: '/students/:id/parent',
    STATUS: '/students/:id/status',
    TRIPS: '/students/:id/trips',
    STATS: '/students/stats',
  },
  
  // Parent management routes
  PARENTS: {
    BASE: '/parents',
    BY_ID: '/parents/:id',
    CHILDREN: '/parents/:id/children',
    NOTIFICATIONS: '/parents/:id/notifications',
    STATS: '/parents/stats',
  },
  
  // Notification routes
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: '/notifications/:id',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    STATS: '/notifications/stats',
  },
  
  // Report routes
  REPORTS: {
    BASE: '/reports',
    BUSES: '/reports/buses',
    TRIPS: '/reports/trips',
    STUDENTS: '/reports/students',
    DRIVERS: '/reports/drivers',
    SCHEDULES: '/reports/schedules',
    EXPORT: '/reports/export',
  },
  
  // Admin routes
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
    SETTINGS: '/admin/settings',
    THRESHOLDS: '/admin/settings/thresholds',
    SYSTEM_HEALTH: '/admin/system/health',
    USERS: '/admin/users',
    BACKUP: '/admin/backup',
    LOGS: '/admin/logs',
  },
  
  // Health check routes
  HEALTH: {
    BASE: '/health',
    DETAILED: '/health/detailed',
    DATABASE: '/health/database',
    REDIS: '/health/redis',
    SOCKET: '/health/socket',
  },
} as const;
