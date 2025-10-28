
//contexts/NetworkContext.tsx

"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
// import { syncData } from "../libs/sync" // Removed during cleanup

// ==========================================
// Types
// ==========================================
interface WebSocketContextType {
  sendMessage: (message: Record<string, unknown>) => void
  lastMessage: Record<string, unknown> | null
  readyState: number
}

interface NetworkProviderProps {
  children: ReactNode
  lanCheckEndpoint?: string
}

// ==========================================
// Constants
// ==========================================
const WS_URL = "ws://localhost:8000/ws"
const PING_INTERVAL = 60000
const PING_TIMEOUT = 5000

// ==========================================
// Context Creation
// ==========================================
interface ConnectionStatus {
  internet: boolean
  lan: boolean
}

const defaultConnectionStatus: ConnectionStatus = {
  internet: true,
  lan: true
}

const InternetConnectionContext = createContext<ConnectionStatus>(defaultConnectionStatus)
const WebSocketContext = createContext<WebSocketContextType | null>(null)

// ==========================================
// Logger Setup
// ==========================================
const createLogger = (context: string) => ({
  log: (message: string) => {},
  warn: (message: string) => console.warn(`[${context}] ${new Date().toISOString()}: ${message}`),
  error: (message: string) => console.error(`[${context}] ${new Date().toISOString()}: ${message}`),
})

const internetLogger = createLogger("InternetConnectionContext")
const wsLogger = createLogger("WebSocketContext")

// ==========================================
// Custom Hooks
// ==========================================
export const useInternetConnection = (): ConnectionStatus => {
  const context = useContext(InternetConnectionContext)
  if (context === undefined) {
    throw new Error("useInternetConnection must be used within a NetworkProvider")
  }
  return context
}

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within a NetworkProvider")
  }
  return context
}

// ==========================================
// Network Provider Component
// ==========================================
export const NetworkProvider = ({ 
  children, 
  lanCheckEndpoint = 'http://localhost:8000/health' // Default LAN check endpoint
}: NetworkProviderProps): React.ReactElement => {
  // ==========================================
  // Connection State
  // ==========================================
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    internet: true,
    lan: true
  })
  const isCheckingRef = useRef<boolean>(false)
  const lastStatusRef = useRef<ConnectionStatus>({ internet: true, lan: true })

  // ==========================================
  // WebSocket State
  // ==========================================
  const [lastMessage, setLastMessage] = useState<Record<string, unknown> | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED)
  const ws = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageIdCounter = useRef<number>(0)

  // ==========================================
  // Connection Check Methods
  // ==========================================
  const checkInternetConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT)

      const endpoints = [
        "https://8.8.8.8/generate_204", // Google
        "https://1.1.1.1/cdn-cgi/trace", // Cloudflare
      ]

      let isConnected = false
      for (const endpoint of endpoints) {
        try {
          const response = await Promise.race([
            fetch(endpoint, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), PING_TIMEOUT))
          ]) as Response

          if (response.ok || response.status === 0) {
            isConnected = true
            break
          }
        } catch (error) {
          internetLogger.warn(`Failed to reach ${endpoint}: ${error instanceof Error ? error.message : String(error)}`)
          continue
        }
      }

      clearTimeout(timeoutId)
      return isConnected
    } catch (error) {
      internetLogger.warn(`Connectivity check failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    } finally {
      isCheckingRef.current = false
    }
  }, [PING_TIMEOUT])

  const checkLanConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT)

      const response = await fetch(lanCheckEndpoint, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }, [lanCheckEndpoint, PING_TIMEOUT])

  const checkConnectivity = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    try {
      const [internetStatus, lanStatus] = await Promise.all([
        checkInternetConnectivity(),
        checkLanConnectivity()
      ])

      const newStatus = {
        internet: internetStatus,
        lan: lanStatus
      }

      if (JSON.stringify(lastStatusRef.current) !== JSON.stringify(newStatus)) {
        setConnectionStatus(newStatus)
        lastStatusRef.current = newStatus
      }
    } catch (error) {
      const newStatus = { internet: false, lan: false }
      if (JSON.stringify(lastStatusRef.current) !== JSON.stringify(newStatus)) {
        setConnectionStatus(newStatus)
        lastStatusRef.current = newStatus
      }
    } finally {
      isCheckingRef.current = false
    }
  }, [checkInternetConnectivity, checkLanConnectivity])

  // ==========================================
  // WebSocket Methods
  // ==========================================
  const startPing = useCallback((): void => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    pingIntervalRef.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: "ping" }))
      }
    }, PING_INTERVAL)
  }, [])

  const stopPing = useCallback((): void => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const connectWebSocket = useCallback((): void => {
    // WebSocket disabled - using direct Roboflow API calls instead
    setReadyState(WebSocket.CLOSED)
    return

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return
    }

    ws.current = new WebSocket(WS_URL)

    ws.current.onerror = (error: Event): void => {
      wsLogger.error(`WebSocket error: ${error instanceof ErrorEvent ? error.message : "Unknown error"}`)
      setReadyState(WebSocket.CLOSED)
    }

    ws.current.onopen = (): void => {
      setReadyState(WebSocket.OPEN)
      startPing()
    }

    ws.current.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data)
        if (data.action === "pong") {
          return
        }
        data.id = `msg_${messageIdCounter.current++}`
        setLastMessage(data)
      } catch (error) {
        wsLogger.error(`Error processing WebSocket message: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    ws.current.onclose = (event: CloseEvent): void => {
      wsLogger.warn(`WebSocket disconnected: ${event.reason}`)
      setReadyState(WebSocket.CLOSED)
      stopPing()
      setTimeout(connectWebSocket, 5000)
    }
  }, [startPing, stopPing])

  const sendMessage = useCallback((message: Record<string, unknown>): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      wsLogger.error("WebSocket is not connected. Message not sent.")
    }
  }, [])

  // ==========================================
  // Effects
  // ==========================================

  // Internet Connection Effect
  useEffect(() => {
    checkConnectivity()

    const interval = setInterval(checkConnectivity, PING_INTERVAL)

    const handleOnline = () => checkConnectivity()
    const handleOffline = () => setConnectionStatus({ internet: false, lan: false })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkConnectivity])

  // WebSocket Effect
  useEffect(() => {
    connectWebSocket()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
      stopPing()
    }
  }, [connectWebSocket, stopPing])

  // ==========================================
  // Render
  // ==========================================
  return (
    <InternetConnectionContext.Provider value={connectionStatus}>
      <WebSocketContext.Provider value={{ sendMessage, lastMessage, readyState }}>
        {children}
      </WebSocketContext.Provider>
    </InternetConnectionContext.Provider>
  )
}
