// Socket.IO realtime constants

// Event names
export const EVT_TRIP_STARTED = "trip_started" as const;
export const EVT_TRIP_COMPLETED = "trip_completed" as const;
export const EVT_BUS_POS_UPDATE = "bus_position_update" as const;
export const EVT_APPROACH_STOP = "approach_stop" as const;
export const EVT_DELAY_ALERT = "delay_alert" as const;

// Room builders
export const roomBus = (busId: string | number) => `bus-${busId}`;
export const roomTrip = (tripId: string | number) => `trip-${tripId}`;
export const roomUser = (userId: string | number) => `user-${userId}`;

// Additional Socket.IO room names
export const SOCKET_ROOMS = {
  BUS: (busId: string | number) => `bus-${busId}`,
  TRIP: (tripId: string | number) => `trip-${tripId}`,
  USER: (userId: string | number) => `user-${userId}`,
  DRIVER: (driverId: string | number) => `driver-${driverId}`,
  PARENT: (parentId: string | number) => `parent-${parentId}`,
  ADMIN: 'admin',
  NOTIFICATIONS: (userId: string | number) => `notifications-${userId}`,
} as const;

// Socket.IO event names
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  
  // Room events
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  JOINED_ROOM: 'joined-room',
  LEFT_ROOM: 'left-room',
  
  // Bus events
  BUS_POSITION_UPDATE: 'bus_position_update',
  BUS_STATUS_CHANGE: 'bus_status_change',
  BUS_ASSIGNED: 'bus_assigned',
  BUS_UNASSIGNED: 'bus_unassigned',
  
  // Trip events
  TRIP_STARTED: 'trip_started',
  TRIP_COMPLETED: 'trip_completed',
  TRIP_CANCELLED: 'trip_cancelled',
  TRIP_DELAYED: 'trip_delayed',
  TRIP_STATUS_CHANGE: 'trip_status_change',
  
  // Student events
  STUDENT_PICKED_UP: 'student_picked_up',
  STUDENT_DROPPED_OFF: 'student_dropped_off',
  STUDENT_ABSENT: 'student_absent',
  STUDENT_STATUS_CHANGE: 'student_status_change',
  
  // Stop events
  APPROACHING_STOP: 'approaching_stop',
  ARRIVED_AT_STOP: 'arrived_at_stop',
  LEFT_STOP: 'left_stop',
  
  // Alert events
  DELAY_ALERT: 'delay_alert',
  EMERGENCY_ALERT: 'emergency_alert',
  MAINTENANCE_ALERT: 'maintenance_alert',
  WEATHER_ALERT: 'weather_alert',
  
  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATION_DELETED: 'notification_deleted',
  
  // System events
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  SYSTEM_ERROR: 'system_error',
} as const;
