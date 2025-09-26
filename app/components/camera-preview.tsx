"use client"

import React, { useState, useRef, useEffect } from "react"
import { Camera, Play, Square, RotateCcw, AlertCircle } from "lucide-react"

interface CameraPreviewProps {
  onCapture?: (imageData: string) => void
}

export default function CameraPreview({ onCapture }: CameraPreviewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [isMirrorMode, setIsMirrorMode] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera if available
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.")
      console.error("Camera error:", err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setLastCapture(imageData)
        onCapture?.(imageData)
      }
    }
  }

  const resetCamera = () => {
    stopCamera()
    setLastCapture(null)
    setError(null)
  }


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera Preview
        </h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isStreaming 
            ? "bg-green-500/20 text-green-300" 
            : "bg-gray-500/20 text-gray-300"
        }`}>
          {isStreaming ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: isMirrorMode ? "scaleX(-1)" : "none" }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Camera className="h-12 w-12 text-white/50 mx-auto mb-2" />
              <p className="text-white/70 text-sm">Camera Offline</p>
            </div>
          </div>
        )}
        
        {/* Capture Overlay */}
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/70 rounded-tl"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/70 rounded-tr"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/70 rounded-bl"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/70 rounded-br"></div>
            </div>
          </div>
        )}
      </div>

      {/* Last Capture Preview */}
      {lastCapture && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-white/70 mb-2">Last Capture:</h4>
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <img
              src={lastCapture}
              alt="Last capture"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Camera Controls */}
      <div className="flex gap-2">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={captureImage}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Capture
            </button>
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Square className="h-4 w-4" />
            </button>
          </>
        )}
        
        <button
          onClick={resetCamera}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
