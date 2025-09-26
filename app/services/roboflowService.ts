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
    console.log("🏗️ Initializing RoboflowService...")
    console.log("🔧 Configuration validation:", {
      isComplete: isConfigComplete(),
      apiKey: ROBOFLOW_CONFIG.API_KEY ? `${ROBOFLOW_CONFIG.API_KEY.substring(0, 8)}...` : 'MISSING',
      workspace: ROBOFLOW_CONFIG.WORKSPACE_NAME,
      workflowId: ROBOFLOW_CONFIG.WORKFLOW_ID,
      apiUrl: ROBOFLOW_CONFIG.API_URL
    })
    
    if (!isConfigComplete()) {
      console.warn("⚠️ Roboflow configuration is incomplete. Please update your API key and workflow ID in app/config/roboflow.ts")
      console.warn("📋 Current config values:", ROBOFLOW_CONFIG)
    } else {
    }
  }

  /**
   * Predict egg defect using Roboflow API
   * @param imageData - Base64 encoded image data (data URL format)
   * @returns Promise with prediction result
   */
  async predictDefect(imageData: string): Promise<{ prediction: string; confidence: number } | null> {
    try {
      console.log("🔍 Starting Roboflow prediction process...")
      console.log("📊 Configuration check:", {
        apiKey: ROBOFLOW_CONFIG.API_KEY ? `${ROBOFLOW_CONFIG.API_KEY.substring(0, 8)}...` : 'MISSING',
        fullApiKey: ROBOFLOW_CONFIG.API_KEY, // Show full key for debugging
        workspace: ROBOFLOW_CONFIG.WORKSPACE_NAME,
        workflowId: ROBOFLOW_CONFIG.WORKFLOW_ID,
        apiUrl: ROBOFLOW_CONFIG.API_URL,
        timeout: ROBOFLOW_CONFIG.TIMEOUT,
        isUsingEnvVar: !!process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY
      })

      // Extract base64 data from data URL if needed
      console.log("🔄 Processing image data...")
      console.log("📏 Original image data length:", imageData.length)
      console.log("📏 Image data starts with:", imageData.substring(0, 50))
      
      let base64Data = imageData
      if (imageData.startsWith('data:image')) {
        console.log("✂️ Extracting base64 from data URL...")
        const [header, data] = imageData.split(',', 2)
        console.log("📋 Data URL header:", header)
        base64Data = data
        console.log("📏 Extracted base64 length:", base64Data.length)
      }

      // Convert base64 to blob for upload
      console.log("🔄 Converting base64 to binary blob...")
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      console.log("📦 Blob created:", { size: blob.size, type: blob.type })

      // Prepare the request
      const url = getRoboflowEndpoint()
      console.log("🌐 Roboflow endpoint URL:", url)
      
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
      
      console.log("📋 JSON payload prepared with base64 image")
      console.log("📏 Base64 image length:", base64Image.length)

      console.log("🚀 Sending request to Roboflow API...")
      console.log("🔑 Using API key:", ROBOFLOW_CONFIG.API_KEY)
      const requestStartTime = Date.now()
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
      })

      const requestDuration = Date.now() - requestStartTime
      console.log("⏱️ Request completed in:", requestDuration, "ms")
      console.log("📊 Response status:", response.status, response.statusText)
      console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Roboflow API error response:", errorText)
        throw new Error(`Roboflow API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      console.log("📥 Parsing response JSON...")
      const result: RoboflowResponse = await response.json()
      console.log("✅ Roboflow API response received successfully!")
      console.log("📊 Full response:", JSON.stringify(result, null, 2))

      // Extract prediction from result - handle nested structure
      let predictions = null
      
      // Check for nested structure (outputs[0].predictions.predictions)
      if (result.outputs && result.outputs.length > 0 && result.outputs[0].predictions) {
        console.log("🔍 Found nested predictions structure")
        predictions = result.outputs[0].predictions.predictions
        console.log("📊 Nested predictions:", predictions)
      }
      // Check for direct structure (result.predictions)
      else if (result.predictions && result.predictions.length > 0) {
        console.log("🔍 Found direct predictions structure")
        predictions = result.predictions
        console.log("📊 Direct predictions:", predictions)
      }
      
      if (predictions && predictions.length > 0) {
        console.log("🎯 Found predictions:", predictions.length)
        const prediction = predictions[0]
        console.log("🏆 Top prediction:", prediction)
        console.log(`🎯 Prediction: ${prediction.class} (confidence: ${prediction.confidence.toFixed(2)})`)
        
        const predictionResult = {
          prediction: prediction.class,
          confidence: prediction.confidence
        }
        console.log("✅ Returning prediction result:", predictionResult)
        return predictionResult
      } else {
        console.warn("⚠️ No predictions found in Roboflow response")
        console.warn("🔍 Response structure:", Object.keys(result))
        return null
      }

    } catch (error) {
      console.error("❌ Roboflow API error occurred:")
      console.error("❌ Error type:", error instanceof Error ? error.constructor.name : typeof error)
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error))
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
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
        console.warn("⚠️ Cannot test connection: configuration incomplete")
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
      console.error("❌ Roboflow API connection test failed:", error)
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
