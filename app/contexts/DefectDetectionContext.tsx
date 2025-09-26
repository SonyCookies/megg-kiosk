"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { roboflowService } from "../services/roboflowService"

interface DetectionResult {
  prediction: string | null
  confidence: number | null
}

interface DefectDetectionContextType {
  isConnected: boolean
  isProcessing: boolean
  lastResult: DetectionResult | null
  detectDefect: (imageData: string) => Promise<DetectionResult | null>
  testConnection: () => Promise<boolean>
}

const DefectDetectionContext = createContext<DefectDetectionContextType | undefined>(undefined)

export function DefectDetectionProvider({ children }: { children: React.ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Test connection to Roboflow API
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await roboflowService.testConnection()
      setIsConnected(connected)
      return connected
    } catch (error) {
      console.error("❌ Connection test failed:", error)
      setIsConnected(false)
      return false
    }
  }, [])

  // Initialize connection status on mount
  React.useEffect(() => {
    testConnection()
  }, [testConnection])

  // Send an image for defect detection using direct Roboflow API
  const detectDefect = useCallback(
    async (imageData: string): Promise<DetectionResult | null> => {
      if (isProcessing) {
        console.warn("⚠️ Detection already in progress, ignoring request")
        return null
      }

      // Validate image data
      if (!imageData || imageData.trim() === "") {
        console.error("❌ No image data provided")
        throw new Error("No image data provided")
      }

      console.log("📸 Image data length:", imageData.length)
      console.log("📸 Image data preview:", imageData.substring(0, 50) + "...")

      setIsProcessing(true)

      try {
        // Call Roboflow API directly
        const result = await roboflowService.predictDefect(imageData)
        
        if (result) {
          const detectionResult: DetectionResult = {
            prediction: result.prediction,
            confidence: result.confidence
          }
          
          setLastResult(detectionResult)
          console.log("✅ Detection completed:", detectionResult)
          return detectionResult
        } else {
          console.warn("⚠️ No prediction result received")
          return null
        }
      } catch (error) {
        console.error("❌ Error during defect detection:", error)
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [isProcessing],
  )

  const value = {
    isConnected,
    isProcessing,
    lastResult,
    detectDefect,
    testConnection,
  }

  return <DefectDetectionContext.Provider value={value}>{children}</DefectDetectionContext.Provider>
}

export function useDefectDetection() {
  const context = useContext(DefectDetectionContext)
  if (context === undefined) {
    throw new Error("useDefectDetection must be used within a DefectDetectionProvider")
  }
  return context
}
