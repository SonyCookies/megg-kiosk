/**
 * Direct Roboflow API Service
 * Handles egg defect detection using Roboflow's serverless API
 */

import { ROBOFLOW_CONFIG, getRoboflowEndpoint, isConfigComplete } from "../config/roboflow"

export interface RoboflowPrediction {
  class: string
  confidence: number
}

export interface RoboflowResponse {
  outputs?: Array<{
    predictions: {
      predictions: RoboflowPrediction[]
      top: string
      confidence: number
    }
  }>
  predictions?: RoboflowPrediction[]
}

export class RoboflowService {
  constructor() {
    if (!isConfigComplete()) {
      console.warn("⚠️ Roboflow configuration is incomplete. Please update your API key and workflow ID in app/config/roboflow.ts")
    }
  }

  /**
   * Predict egg defect using Roboflow API
   * @param imageData - Base64 encoded image data (data URL format)
   * @returns Promise with prediction result
   */
  async predictDefect(imageData: string): Promise<{ prediction: string; confidence: number } | null> {
    try {

      // Extract base64 data from data URL if needed
      
      let base64Data = imageData
      if (imageData.startsWith('data:image')) {
        const [header, data] = imageData.split(',', 2)
        base64Data = data
      }

      // Convert base64 to blob for upload
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })

      // Prepare the request
      const url = getRoboflowEndpoint()
      
      // Convert blob to base64 for JSON payload
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data:image/jpeg;base64, prefix
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      
      const requestPayload = {
        api_key: ROBOFLOW_CONFIG.API_KEY,
        inputs: {
          image: {
            type: "base64",
            value: base64Image
          }
        }
      }
      

      const requestStartTime = Date.now()
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
      })


      if (!response.ok) {
        const errorText = await response.text()
        console.error("Roboflow API error response:", errorText)
        throw new Error(`Roboflow API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: RoboflowResponse = await response.json()

      // Extract prediction from result - handle nested structure
      let predictions = null
      
      // Check for nested structure (outputs[0].predictions.predictions)
      if (result.outputs && result.outputs.length > 0 && result.outputs[0].predictions) {
        predictions = result.outputs[0].predictions.predictions
      }
      // Check for direct structure (result.predictions)
      else if (result.predictions && result.predictions.length > 0) {
        predictions = result.predictions
      }
      
      if (predictions && predictions.length > 0) {
        const prediction = predictions[0]
        
        const predictionResult = {
          prediction: prediction.class,
          confidence: prediction.confidence
        }
        return predictionResult
      } else {
        return null
      }

    } catch (error) {
      console.error("Roboflow API error occurred:", error)
      throw error
    }
  }

  /**
   * Test the connection to Roboflow API
   * @returns Promise with connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!isConfigComplete()) {
        return false
      }

      const url = getRoboflowEndpoint()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ROBOFLOW_CONFIG.API_KEY}`
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout for connection test
      })

      // Even if we get a 404 or 405, it means the service is reachable
      return response.status === 200 || response.status === 404 || response.status === 405
    } catch (error) {
      console.error("Roboflow API connection test failed:", error)
      return false
    }
  }

  /**
   * Get service configuration
   */
  getConfig() {
    return {
      ...ROBOFLOW_CONFIG,
      isComplete: isConfigComplete(),
      endpoint: getRoboflowEndpoint()
    }
  }
}

// Export a singleton instance
export const roboflowService = new RoboflowService()
