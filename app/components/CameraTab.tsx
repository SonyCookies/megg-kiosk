"use client"

import React, { useRef, useCallback, useEffect, useState } from "react"
import { Camera, CameraIcon, Loader2, XCircle } from "lucide-react"
import { roboflowService } from "../services/roboflowService"

interface CameraTabProps {
  isOnline: boolean
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export default function CameraTab({ isOnline, isFullscreen, onToggleFullscreen }: CameraTabProps) {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isMirrorMode, setIsMirrorMode] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<any>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      setIsCameraLoading(true)
      setCameraError("")
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraOn(true)
            setIsCameraLoading(false)
          }).catch((playError) => {
            setCameraError(`Error playing video: ${playError.message}`)
            setIsCameraLoading(false)
          })
        }
        
        videoRef.current.onerror = () => {
          setCameraError("Video element error occurred")
          setIsCameraLoading(false)
        }
      }
    } catch (error) {
      setCameraError(`Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsCameraLoading(false)
    }
  }, [])

  // Capture image from video and send to Roboflow
  const captureImage = async () => {
    if (!isOnline) {
      setCaptureError('No internet connection. Roboflow detection requires internet access.')
      return
    }
    
    if (!videoRef.current || !isCameraOn) {
      setCaptureError('Camera not ready. Please start the camera first.')
      return
    }
    
    setIsCapturing(true)
    setCaptureError(null)
    setCaptureResult(null)
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        
        const result = await roboflowService.predictDefect(imageData)
        
        if (result) {
          setCaptureResult(result)
        } else {
          setCaptureError('No prediction returned from Roboflow')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setCaptureError(`Capture failed: ${errorMessage}`)
    } finally {
      setIsCapturing(false)
    }
  }

  // Auto-start camera when component mounts
  useEffect(() => {
    setShowPreview(true)
    
    setTimeout(() => {
      if (!isCameraOn && videoRef.current) {
        startCamera()
      }
    }, 100)
  }, [isCameraOn, startCamera])

  // Ensure video plays when entering fullscreen
  useEffect(() => {
    if (isFullscreen && videoRef.current && isCameraOn) {
      videoRef.current.play().catch(console.error)
    }
  }, [isFullscreen, isCameraOn])

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'p-1' : 'p-3'}`}>
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/30 shadow-lg flex-1 w-full ${isFullscreen ? 'p-0 rounded-none border-0' : 'p-4'}`}>
        <div className={`bg-slate-900 rounded-lg border border-slate-700/50 relative overflow-hidden w-full ${isFullscreen ? 'h-full rounded-none border-0' : 'aspect-video h-64 sm:h-80 lg:h-96 mb-4'}`}>
          {/* Video */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
            autoPlay
            muted
            playsInline
            style={{ 
              transform: isMirrorMode ? "scaleX(-1)" : "none"
            }}
          />
          
          {/* Placeholder when camera is off */}
          {!isCameraOn && !isCameraLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Camera Feed</p>
                <p className="text-slate-500 text-sm mt-2">Camera not started</p>
                {cameraError && <p className="text-red-400 text-sm mt-2">Error: {cameraError}</p>}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isCameraLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 text-lg">Camera Feed</p>
                <p className="text-slate-500 text-sm mt-2">Starting camera...</p>
              </div>
            </div>
          )}
          
          {/* Control buttons */}
          <div className="absolute top-4 right-4 z-10 flex gap-3">
            {/* Fullscreen/Exit Button */}
            <button
              onClick={onToggleFullscreen}
              className={`px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                isFullscreen 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isFullscreen ? (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Fullscreen
                </>
              )}
            </button>
            
            {/* Capture Button */}
            <button
              onClick={captureImage}
              disabled={isCameraLoading || isCapturing || !isCameraOn}
              className={`px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                isCapturing || !isCameraOn
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            >
              {isCapturing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CameraIcon className="w-6 h-6" />
              )}
              Capture
            </button>
          </div>

          {/* Result container */}
          {(captureResult || captureError) && (
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/10 shadow-lg max-w-xs">
                {captureResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium text-sm">Detection</h3>
                      <button
                        onClick={() => setCaptureResult(null)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">Result:</span>
                      <span className={`font-medium text-sm ${
                        captureResult.prediction === 'good' ? 'text-green-400' : 
                        captureResult.prediction === 'cracked' ? 'text-red-400' : 
                        'text-yellow-400'
                      }`}>
                        {captureResult.prediction?.toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">Confidence:</span>
                      <span className="text-white font-mono text-sm">
                        {captureResult.confidence ? (captureResult.confidence * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                ) : captureError ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-red-400 font-medium text-sm">Error</h3>
                      <button
                        onClick={() => setCaptureError(null)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white/80 text-xs">{captureError}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}