/**
 * Socket.IO Client for SSB Frontend
 * Handles real-time communication with automatic reconnection
 */

import { io, Socket } from 'socket.io-client'

interface SocketEvents {
  // Bus tracking events
  bus_position_update: (data: {
    busId: string
    lat: number
    lng: number
    speed: number
    timestamp: number
  }) => void
  
  // Trip events
  trip_started: (data: {
    tripId: string
    busId: string
    driverId: string
    timestamp: number
  }) => void
  
  trip_completed: (data: {
    tripId: string
    busId: string
    driverId: string
    timestamp: number
  }) => void
  
  // Alert events
  delay_alert: (data: {
    busId: string
    tripId: string
    delayMinutes: number
    message: string
    timestamp: number
  }) => void
  
  approach_stop: (data: {
    busId: string
    stopId: string
    stopName: string
    etaMinutes: number
    timestamp: number
  }) => void
  
  // System events
  connect: () => void
  disconnect: (reason: string) => void
  reconnect: (attemptNumber: number) => void
  reconnect_error: (error: Error) => void
}

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private eventListeners = new Map<string, Function[]>()

  constructor() {
    // Auto-connect on initialization
    this.connect()
  }

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return
    }

    this.isConnecting = true
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_token') : null

    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    this.setupEventListeners()
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.reconnectAttempts = 0
      this.isConnecting = false
      this.emit('connect')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      this.isConnecting = false
      this.emit('disconnect', reason)
      
      // Auto-reconnect if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      this.isConnecting = false
      this.emit('reconnect_error', error)
      this.handleReconnect()
    })

    // Bus tracking events
    this.socket.on('bus_position_update', (data) => {
      this.emit('bus_position_update', data)
    })

    this.socket.on('trip_started', (data) => {
      this.emit('trip_started', data)
    })

    this.socket.on('trip_completed', (data) => {
      this.emit('trip_completed', data)
    })

    this.socket.on('delay_alert', (data) => {
      this.emit('delay_alert', data)
    })

    this.socket.on('approach_stop', (data) => {
      this.emit('approach_stop', data)
    })
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.emit('reconnect', this.reconnectAttempts)
      this.connect()
    }, delay)
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  /**
   * Check if socket is connected
   */
  get connected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Get connection status
   */
  get status(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting'
    if (this.connected) return 'connected'
    return 'disconnected'
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data)
    }
  }

  /**
   * Add event listener
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Update authentication token
   */
  updateAuth(token: string | null): void {
    if (this.socket) {
      this.socket.auth = { token }
      if (token) {
        this.socket.connect()
      } else {
        this.socket.disconnect()
      }
    }
  }
}

// Create singleton instance
export const socketManager = new SocketManager()

// Export types
export type { SocketEvents }
