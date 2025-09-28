// services/iotService.ts - Pure WebSocket IoT Service

export interface CalibrationRequest {
  component: 'UNO' | 'HX711' | 'NEMA23' | 'SG90' | 'MG996R'
}

export interface CalibrationResponse {
  success: boolean
  component: string
  message?: string
  error?: string
}

export interface ArduinoStatus {
  connected: boolean
  port: string
  baudrate: number
  running: boolean
  timestamp: string
}

export interface SystemStatus {
  arduino: ArduinoStatus
  server: {
    connected_clients: number
    running: boolean
    uptime?: string
  }
  timestamp: string
}

class IoTService {
  private websocket: WebSocket | null = null
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, Function[]> = new Map()
  private connectionStatus = false
  private arduinoStatus = false

  constructor() {
    // Use environment variables or default to localhost
    const host = process.env.NEXT_PUBLIC_IOT_BACKEND_HOST || 'localhost'
    const port = process.env.NEXT_PUBLIC_IOT_BACKEND_PORT || '8765'
    this.wsUrl = `ws://${host}:${port}`
  }

  // Connection Management
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.wsUrl)

        this.websocket.onopen = () => {
          this.connectionStatus = true
          this.reconnectAttempts = 0
          this.emit('connected')
          
          // Wait a bit more to ensure the connection is fully established
          setTimeout(() => {
            resolve(true)
          }, 500)
        }

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.websocket.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason)
          this.connectionStatus = false
          this.websocket = null
          this.emit('disconnected')
          if (event.code !== 1000) { // Only reconnect if not a normal closure
            this.attemptReconnect()
          }
        }

        this.websocket.onerror = (error) => {
          console.log('⚠️ WebSocket error (this is normal during connection):', error)
          // Don't reject immediately - let onopen/onclose handle the actual connection state
        }

        // Set a timeout to reject if connection doesn't establish
        setTimeout(() => {
          if (!this.connectionStatus) {
            reject(new Error('WebSocket connection timeout'))
          }
        }, 5000)

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        reject(error)
      }
    })
  }

  private handleMessage(data: any) {

    // Update Arduino status
    if (data.type === 'system_status' && data.arduino) {
      this.arduinoStatus = data.arduino.connected
    }

    // Emit specific message types
    this.emit(data.type, data)

    // Handle specific message types
    switch (data.type) {
      case 'calibration_response':
        this.emit('calibrationResponse', data)
        break
      case 'calibration_result':
        this.emit('calibrationResult', data)
        break
      case 'arduino_data':
        this.emit('arduinoData', data)
        break
      case 'system_status':
        this.emit('systemStatus', data)
        break
      case 'connection':
        break
      default:
        break
    }
  }

  // Event System
  on(event: string, callback: Function) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in event handler:', error)
        }
      })
    }
  }

  // API Methods
  async sendMessage(type: string, data: any = {}) {
    // Wait for connection to be established if not ready
    let attempts = 0
    const maxAttempts = 10
    const waitTime = 100

    while (!this.isConnected() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
      attempts++
    }

    if (!this.isConnected()) {
      throw new Error('WebSocket not connected after waiting')
    }

    const message = {
      type,
      ...data,
      timestamp: new Date().toISOString()
    }

    this.websocket!.send(JSON.stringify(message))
  }

  async calibrateComponent(component: string): Promise<CalibrationResponse> {
    try {
      await this.sendMessage('calibration_request', { component })
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Calibration request timeout'))
        }, 30000) // 30 second timeout

        const handler = (data: any) => {
          if (data.component === component) {
            clearTimeout(timeout)
            this.off('calibrationResult', handler)
            resolve(data)
          }
        }

        this.on('calibrationResult', handler)
      })
    } catch (error) {
      console.error('Calibration request failed:', error)
      return {
        success: false,
        component,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      await this.sendMessage('get_status')
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Status request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'system_status') {
            clearTimeout(timeout)
            this.off('systemStatus', handler)
            resolve(data)
          }
        }

        this.on('systemStatus', handler)
      })
    } catch (error) {
      console.error('Failed to get system status:', error)
      return null
    }
  }

  async getComponents(): Promise<any> {
    try {
      await this.sendMessage('get_components')
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Components request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'components_info') {
            clearTimeout(timeout)
            this.off('components_info', handler)
            resolve(data)
          }
        }

        this.on('components_info', handler)
      })
    } catch (error) {
      console.error('Failed to get components:', error)
      return null
    }
  }

  async connectArduino(): Promise<boolean> {
    try {
      await this.sendMessage('connect_arduino')
      return true
    } catch (error) {
      console.error('Failed to connect Arduino:', error)
      return false
    }
  }

  async disconnectArduino(): Promise<boolean> {
    try {
      await this.sendMessage('disconnect_arduino')
      return true
    } catch (error) {
      console.error('Failed to disconnect Arduino:', error)
      return false
    }
  }

  async sendCommand(command: string): Promise<boolean> {
    try {
      await this.sendMessage('send_command', { command })
      return true
    } catch (error) {
      console.error('Failed to send command:', error)
      return false
    }
  }

  // Utility Methods
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      
      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.log('❌ Max reconnection attempts reached')
      this.emit('reconnectFailed')
    }
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
      this.connectionStatus = false
    }
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN
  }

  isArduinoConnected(): boolean {
    return this.arduinoStatus
  }

  // Ping/Pong for connection health
  async ping() {
    try {
      await this.sendMessage('ping')
    } catch (error) {
      console.error('Failed to ping server:', error)
    }
  }
}

// Export singleton instance
export const iotService = new IoTService()
export default iotService