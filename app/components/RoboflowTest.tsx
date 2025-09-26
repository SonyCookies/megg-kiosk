"use client"

import React, { useState, useRef, useEffect } from 'react'
import { roboflowService } from '../services/roboflowService'
import { isConfigComplete } from '../config/roboflow'
import { captureImageFromVideo } from '../detection/image-capture'

interface RoboflowTestProps {
  videoRef?: React.RefObject<HTMLVideoElement>
}

export function RoboflowTest(props: RoboflowTestProps = {}) {
  const { videoRef: externalVideoRef } = props
  const [isTesting, setIsTesting] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [configStatus, setConfigStatus] = useState(isConfigComplete())
  const [captureResult, setCaptureResult] = useState<{ prediction: string; confidence: number } | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isMirrorMode, setIsMirrorMode] = useState(true)
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  
  // Use external video ref if provided, otherwise use internal one
  const videoRef = externalVideoRef || internalVideoRef


  const testConnection = async () => {
    setIsTesting(true)
    try {
      const connected = await roboflowService.testConnection()
      setConnectionStatus(connected ? 'connected' : 'failed')
      
      // Auto-start camera if connection is successful and not using external video
      if (connected && !externalVideoRef && !isCameraReady) {
        console.log('🎥 Auto-starting test camera after successful connection')
        setTimeout(() => startTestCamera(), 500)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('failed')
    } finally {
      setIsTesting(false)
    }
  }

  const startTestCamera = async () => {
    if (!internalVideoRef.current) return
    
    try {
      console.log('🎥 Starting test camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
        audio: false
      })
      
      internalVideoRef.current.srcObject = stream
      internalVideoRef.current.onloadedmetadata = () => {
        internalVideoRef.current?.play()
        setIsCameraReady(true)
        console.log('✅ Test camera ready')
      }
    } catch (error) {
      console.error('❌ Failed to start test camera:', error)
      setCaptureError('Failed to start camera for testing')
    }
  }

  const testCapture = async () => {
    if (!videoRef.current) {
      setCaptureError('No video element found. Please start the camera first.')
      return
    }

    if (videoRef.current.readyState < 2) {
      setCaptureError('Video not ready. Please wait for camera to load.')
      return
    }

    setIsCapturing(true)
    setCaptureError(null)
    setCaptureResult(null)

    try {
      console.log('📸 Capturing image from video for Roboflow test...')
      
      // Capture image from video
      const imageData = await captureImageFromVideo(videoRef.current)
      console.log('📸 Image captured, sending to Roboflow...')
      
      // Send to Roboflow
      const result = await roboflowService.predictDefect(imageData)
      
      if (result) {
        setCaptureResult(result)
        console.log('✅ Roboflow test successful:', result)
      } else {
        setCaptureError('No prediction returned from Roboflow')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setCaptureError(`Capture failed: ${errorMessage}`)
      console.error('❌ Roboflow test failed:', error)
    } finally {
      setIsCapturing(false)
    }
  }

  const config = roboflowService.getConfig()

  // Auto-start test camera when component mounts (if not using external video)
  useEffect(() => {
    if (!externalVideoRef && configStatus && connectionStatus === 'connected') {
      console.log('🎥 Auto-starting test camera for RoboflowTest component')
      startTestCamera()
    }
  }, [configStatus, connectionStatus, externalVideoRef])

  return (
    <div className="p-4 border rounded-lg bg-white/90 backdrop-blur-sm shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Roboflow Integration Test</h3>
      
      <div className="space-y-3">
        <div>
          <strong>Configuration Status:</strong>
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            configStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {configStatus ? 'Complete' : 'Incomplete'}
          </span>
        </div>

        {!configStatus && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 text-sm">
              <strong>Setup Required:</strong> Please update your API key and workflow ID in{' '}
              <code className="bg-yellow-100 px-1 rounded">app/config/roboflow.ts</code>
            </p>
          </div>
        )}

        <div>
          <strong>Workspace:</strong> {config.WORKSPACE_NAME}
        </div>
        
        <div>
          <strong>Workflow ID:</strong> {config.WORKFLOW_ID}
        </div>

        <div>
          <strong>Connection Status:</strong>
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'failed' ? 'Failed' : 'Not Tested'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={isTesting || !configStatus}
              className={`px-4 py-2 rounded text-white text-sm ${
                isTesting ? 'bg-gray-400 cursor-not-allowed' :
                configStatus ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {!externalVideoRef && (
              <button
                onClick={startTestCamera}
                disabled={isCameraReady}
                className={`px-4 py-2 rounded text-white text-sm ${
                  isCameraReady ? 'bg-gray-400 cursor-not-allowed' :
                  'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isCameraReady ? 'Camera Ready' : 'Start Camera'}
              </button>
            )}
          </div>

          <button
            onClick={testCapture}
            disabled={isCapturing || !configStatus || connectionStatus !== 'connected' || (!externalVideoRef && !isCameraReady)}
            className={`w-full px-4 py-2 rounded text-white text-sm ${
              isCapturing ? 'bg-gray-400 cursor-not-allowed' :
              configStatus && connectionStatus === 'connected' && (externalVideoRef || isCameraReady) ? 'bg-green-600 hover:bg-green-700' :
              'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isCapturing ? 'Capturing...' : 'Test Capture'}
          </button>

        </div>

        {/* Hidden video element for capture - only show if using internal ref */}
        {!externalVideoRef && (
          <video
            ref={internalVideoRef}
            className="hidden"
            autoPlay
            muted
            playsInline
            style={{ transform: isMirrorMode ? "scaleX(-1)" : "none" }}
          />
        )}

        {/* Capture Results */}
        {captureResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-sm font-semibold mb-2">
              ✅ <strong>Capture Test Successful!</strong>
            </p>
            <div className="text-sm">
              <div><strong>Prediction:</strong> {captureResult.prediction}</div>
              <div><strong>Confidence:</strong> {(captureResult.confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        {captureError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">
              ❌ <strong>Capture Test Failed:</strong> {captureError}
            </p>
          </div>
        )}

        {connectionStatus === 'connected' && !captureResult && !captureError && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm">
              ✅ <strong>Connection Ready!</strong> {!externalVideoRef && !isCameraReady ? 'Click "Start Camera" then "Test Capture" to test.' : 'Click "Test Capture" to test with live camera feed.'}
            </p>
          </div>
        )}

        {connectionStatus === 'failed' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">
              ❌ <strong>Connection Failed.</strong> Please check your API key and workflow ID.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

