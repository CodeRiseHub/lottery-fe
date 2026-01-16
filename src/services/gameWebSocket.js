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
  }

  /**
   * Connects to WebSocket server with Bearer token authentication.
   */
  connect(roomNumber, onStateUpdate, onError) {
    if (this.client && this.connected) {
      console.log('[WebSocket] Already connected')
      return
    }

    const token = getSessionToken()
    if (!token) {
      console.error('[WebSocket] No session token available')
      onError?.('Authentication required')
      return
    }

    console.log('[WebSocket] Connecting to room', roomNumber)

    // Create SockJS connection
    const socket = new SockJS(`${API_BASE_URL}/ws`)
    
    // Create STOMP client
    this.client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('[WebSocket] Connected')
        this.connected = true
        this.reconnectAttempts = 0
        
        // Subscribe to room updates
        this.subscribeToRoom(roomNumber, onStateUpdate)
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame)
        this.connected = false
        onError?.(frame.headers['message'] || 'WebSocket connection error')
      },
      onWebSocketClose: () => {
        console.log('[WebSocket] Connection closed')
        this.connected = false
        this.handleReconnect(roomNumber, onStateUpdate, onError)
      },
      onDisconnect: () => {
        console.log('[WebSocket] Disconnected')
        this.connected = false
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      }
    })

    // Start connection
    this.client.activate()
  }

  /**
   * Subscribes to room state updates.
   */
  subscribeToRoom(roomNumber, onStateUpdate) {
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

    // Also subscribe to error queue
    const errorSub = this.client.subscribe(
      `/user/queue/errors`,
      (message) => {
        try {
          const error = JSON.parse(message.body)
          console.error('[WebSocket] Error from server:', error)
        } catch (e) {
          console.error('[WebSocket] Error parsing error message:', e)
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
    return this.connected && this.client?.active
  }
}

// Export singleton instance
export const gameWebSocket = new GameWebSocketService()

