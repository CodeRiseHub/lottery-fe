// src/services/gameWebSocket.js
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { getSessionToken } from '../auth/sessionManager'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

class GameWebSocketService {
  constructor() {
    this.client = null
    this.connected = false
    this.subscriptions = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.listeners = new Map()
    this.connectionStateCallback = null
  }

  /**
   * Connects to WebSocket server with Bearer token authentication.
   */
  connect(roomNumber, onStateUpdate, onError, onConnectionStateChange) {
    // Store connection state callback and error handler
    this.connectionStateCallback = onConnectionStateChange
    this.onErrorCallback = onError
    
    // Disconnect existing connection if any
    if (this.client) {
      this.disconnect()
    }

    const token = getSessionToken()
    if (!token) {
      console.error('[WebSocket] No session token available')
      this.updateConnectionState(false)
      onError?.('Authentication required')
      return
    }

    console.log('[WebSocket] Connecting to room', roomNumber)
    this.updateConnectionState(false) // Set to connecting state

    // Create SockJS connection
    const socket = new SockJS(`${API_BASE_URL}/ws`)
    
    // Handle SockJS connection events
    socket.onopen = () => {
      console.log('[WebSocket] SockJS connection opened')
    }
    
    socket.onclose = (event) => {
      console.log('[WebSocket] SockJS connection closed', event)
      this.connected = false
      this.updateConnectionState(false)
      if (!event.wasClean) {
        this.handleReconnect(roomNumber, onStateUpdate, onError)
      }
    }
    
    socket.onerror = (error) => {
      console.error('[WebSocket] SockJS connection error:', error)
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
        console.log('[WebSocket] STOMP connected', frame)
        this.connected = true
        this.reconnectAttempts = 0
        this.updateConnectionState(true)
        
        // Subscribe to room updates and error queue
        this.subscribeToRoom(roomNumber, onStateUpdate, onError)
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame)
        this.connected = false
        this.updateConnectionState(false)
        const errorMsg = frame.headers?.['message'] || frame.body || 'WebSocket connection error'
        onError?.(errorMsg)
      },
      onWebSocketClose: (event) => {
        console.log('[WebSocket] WebSocket closed', event)
        this.connected = false
        this.updateConnectionState(false)
        if (!event.wasClean) {
          this.handleReconnect(roomNumber, onStateUpdate, onError)
        }
      },
      onDisconnect: () => {
        console.log('[WebSocket] Disconnected')
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
      console.error('[WebSocket] Failed to activate client:', error)
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
      console.warn('[WebSocket] Cannot subscribe: not connected')
      return
    }

    // Unsubscribe from previous room if exists
    const existingSub = this.subscriptions.get(`room-${roomNumber}`)
    if (existingSub) {
      existingSub.unsubscribe()
    }

    // Subscribe to room topic
    const subscription = this.client.subscribe(
      `/topic/room/${roomNumber}`,
      (message) => {
        try {
          const state = JSON.parse(message.body)
          console.debug('[WebSocket] Room state update:', state)
          onStateUpdate?.(state)
        } catch (e) {
          console.error('[WebSocket] Error parsing message:', e)
        }
      }
    )

    this.subscriptions.set(`room-${roomNumber}`, subscription)
    console.log(`[WebSocket] Subscribed to room ${roomNumber}`)

    // Also subscribe to error queue (user-specific)
    const errorSub = this.client.subscribe(
      `/user/queue/errors`,
      (message) => {
        try {
          const error = JSON.parse(message.body)
          console.error('[WebSocket] Error from server:', error)
          const errorMsg = error.error || error.message || 'An error occurred'
          onError?.(errorMsg)
        } catch (e) {
          console.error('[WebSocket] Error parsing error message:', e)
          onError?.('An error occurred')
        }
      }
    )
    this.subscriptions.set('errors', errorSub)
  }

  /**
   * Joins a game round.
   */
  joinRound(roomNumber, betAmount) {
    if (!this.client || !this.connected) {
      throw new Error('WebSocket not connected')
    }

    console.log(`[WebSocket] Joining round: room=${roomNumber}, bet=${betAmount}`)

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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached')
      onError?.('Failed to reconnect. Please refresh the page.')
      return
    }

    this.reconnectAttempts++
    console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect(roomNumber, onStateUpdate, onError)
    }, this.reconnectDelay)
  }

  /**
   * Disconnects from WebSocket.
   */
  disconnect() {
    if (this.client) {
      // Unsubscribe from all topics
      this.subscriptions.forEach((sub) => sub.unsubscribe())
      this.subscriptions.clear()

      // Deactivate client
      this.client.deactivate()
      this.client = null
      this.connected = false
      console.log('[WebSocket] Disconnected')
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

