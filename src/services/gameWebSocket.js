// src/services/gameWebSocket.js
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { getSessionToken } from '../auth/sessionManager'

// For production: use relative URLs (empty string) or set VITE_API_BASE_URL env var
// For development: defaults to localhost:8080
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:8080")

class GameWebSocketService {
  constructor() {
    this.client = null
    this.connected = false
    this.subscriptions = new Map()
    this.currentRoomNumber = null // Track current room to properly unsubscribe when switching
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.reconnecting = false // Flag to prevent multiple simultaneous reconnection attempts
    this.listeners = new Map()
    this.connectionStateCallback = null
  }

  /**
   * Connects to WebSocket server with Bearer token authentication.
   */
  connect(roomNumber, onStateUpdate, onError, onConnectionStateChange, onBalanceUpdate) {
    // Store connection state callback and error handler
    this.connectionStateCallback = onConnectionStateChange
    this.onErrorCallback = onError
    this.onBalanceUpdateCallback = onBalanceUpdate
    
    // Disconnect existing connection if any
    if (this.client) {
      this.disconnect()
    }

    const token = getSessionToken()
    if (!token) {
      this.updateConnectionState(false)
      onError?.('Authentication required')
      return
    }
    this.updateConnectionState(false) // Set to connecting state

    // Create SockJS connection
    const socket = new SockJS(`${API_BASE_URL}/ws`)
    
    // Handle SockJS connection events
    socket.onopen = () => {
      // Connection opened
    }
    
    socket.onclose = (event) => {
      this.connected = false
      this.updateConnectionState(false)
      // Only reconnect if it wasn't a clean close and we're not already reconnecting
      if (!event.wasClean && !this.reconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnect(roomNumber, onStateUpdate, onError)
      }
    }
    
    socket.onerror = (error) => {
      this.connected = false
      this.updateConnectionState(false)
      onError?.('WebSocket connection failed. Please check your connection.')
    }
    
    // Create STOMP client
    this.client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        this.connected = true
        this.reconnectAttempts = 0 // Reset reconnection attempts on successful connection
        this.reconnecting = false // Reset reconnecting flag on successful connection
        this.updateConnectionState(true)
        
        // Subscribe to room updates and error queue
        this.subscribeToRoom(roomNumber, onStateUpdate, onError)
      },
      onStompError: (frame) => {
        this.connected = false
        this.updateConnectionState(false)
        const errorMsg = frame.headers?.['message'] || frame.body || 'WebSocket connection error'
        onError?.(errorMsg)
      },
      onWebSocketClose: (event) => {
        this.connected = false
        this.updateConnectionState(false)
        // Only reconnect if it wasn't a clean close and we're not already reconnecting
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect(roomNumber, onStateUpdate, onError)
        }
      },
      onDisconnect: () => {
        this.connected = false
        this.updateConnectionState(false)
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      }
    })

    // Start connection
    try {
      this.client.activate()
    } catch (error) {
      this.connected = false
      this.updateConnectionState(false)
      onError?.('Failed to start WebSocket connection')
    }
  }

  /**
   * Updates connection state and notifies callback.
   */
  updateConnectionState(connected) {
    this.connected = connected
    if (this.connectionStateCallback) {
      this.connectionStateCallback(connected)
    }
  }

  /**
   * Subscribes to room state updates.
   */
  subscribeToRoom(roomNumber, onStateUpdate, onError) {
    if (!this.client || !this.connected) {
      return
    }

    // Unsubscribe from previous room if switching rooms
    if (this.currentRoomNumber !== null && this.currentRoomNumber !== roomNumber) {
      const previousSub = this.subscriptions.get(`room-${this.currentRoomNumber}`)
      if (previousSub) {
        previousSub.unsubscribe()
        this.subscriptions.delete(`room-${this.currentRoomNumber}`)
      }
    }

    // Subscribe to room topic
    const subscription = this.client.subscribe(
      `/topic/room/${roomNumber}`,
      (message) => {
        try {
          const state = JSON.parse(message.body)
          onStateUpdate?.(state)
        } catch (e) {
          // Ignore parsing errors
        }
      }
    )

    this.subscriptions.set(`room-${roomNumber}`, subscription)
    this.currentRoomNumber = roomNumber // Track current room

    // Also subscribe to error queue (user-specific)
    const errorSub = this.client.subscribe(
      `/user/queue/errors`,
      (message) => {
        try {
          const error = JSON.parse(message.body)
          // Extract user-friendly error message
          const errorMsg = error.error || error.message || 'An error occurred. Please try again.'
          // Call error handler - this should reset joining state
          onError?.(errorMsg)
        } catch (e) {
          onError?.('An error occurred. Please try again.')
        }
      }
    )
    this.subscriptions.set('errors', errorSub)
    
    // Subscribe to balance updates (user-specific)
    const balanceSub = this.client.subscribe(
      `/user/queue/balance`,
      (message) => {
        try {
          const balanceUpdate = JSON.parse(message.body)
          // Notify callback if provided
          if (this.onBalanceUpdateCallback) {
            this.onBalanceUpdateCallback(balanceUpdate.balanceA)
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    )
    this.subscriptions.set('balance', balanceSub)
    
    // Store error callback for later use
    this.onErrorCallback = onError
  }

  /**
   * Joins a game round.
   */
  joinRound(roomNumber, betAmount) {
    if (!this.client || !this.connected) {
      throw new Error('WebSocket not connected')
    }

    this.client.publish({
      destination: `/app/game/join`,
      body: JSON.stringify({
        roomNumber,
        betAmount
      })
    })
  }

  /**
   * Handles reconnection logic.
   */
  handleReconnect(roomNumber, onStateUpdate, onError) {
    // Prevent multiple simultaneous reconnection attempts
    if (this.reconnecting) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.reconnecting = false
      this.updateConnectionState(false)
      onError?.('Failed to reconnect. Please refresh the page.')
      return
    }

    this.reconnecting = true
    this.reconnectAttempts++
    // Update connection state to show we're trying to reconnect
    this.updateConnectionState(false)

    setTimeout(() => {
      // Pass all callbacks including balance update callback to reconnect
      // Use stored onBalanceUpdateCallback to preserve it across reconnects
      this.connect(roomNumber, onStateUpdate, onError, this.connectionStateCallback, this.onBalanceUpdateCallback)
      // Reset reconnecting flag after connection attempt starts
      // (will be reset to false on successful connect or after max attempts)
    }, this.reconnectDelay)
  }

  /**
   * Disconnects from WebSocket.
   */
  disconnect() {
    if (this.client) {
      // Stop reconnection attempts
      this.reconnectAttempts = this.maxReconnectAttempts
      this.reconnecting = false
      
      // Unsubscribe from all topics
      this.subscriptions.forEach((sub) => sub.unsubscribe())
      this.subscriptions.clear()
      this.currentRoomNumber = null // Reset current room

      // Deactivate client
      try {
        this.client.deactivate()
      } catch (e) {
        // Ignore deactivate errors
      }
      this.client = null
      this.connected = false
      this.updateConnectionState(false)
    }
  }

  /**
   * Checks if connected.
   */
  isConnected() {
    return this.connected && (this.client?.active === true)
  }
}

// Export singleton instance
export const gameWebSocket = new GameWebSocketService()

