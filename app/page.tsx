// app/page.tsx
"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { 
  Activity,
  Settings, 
  Camera, 
  Clock,
  Play,
  Pause,
  CameraIcon,
  Loader2,
  XCircle,
  User,
  AlertCircle
} from "lucide-react"

import { useInternetConnection, useWebSocket } from "./contexts/NetworkContext"
import { db } from './libs/firebaseConfig'
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { 
  getConfigurationWithFallback, 
  saveConfigurationWithFallback, 
  deleteUserConfiguration,
  EggSizeRanges,
  validateRanges,
  getSuggestedNextRange,
  getNextRangeType,
  RangeValidation
} from './utils/configurationService'
import WiFiButton from "./components/wifi-button"
import { roboflowService } from "./services/roboflowService"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'camera' | 'configuration' | 'account'>('camera')
  const [isProcessing, setIsProcessing] = useState(false)
  const [systemPhase, setSystemPhase] = useState<'idle' | 'getting_ready' | 'load_eggs' | 'ready_to_process' | 'processing'>('idle')
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    goodEggs: 0,
    badEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0
  })

  // Camera state
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isMirrorMode, setIsMirrorMode] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Roboflow integration states
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<any>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)

  // Account states
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)

  // Configuration states
  const [showRangeModal, setShowRangeModal] = useState(false)
  const [editingRange, setEditingRange] = useState<'small' | 'medium' | 'large' | null>(null)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [eggRanges, setEggRanges] = useState<EggSizeRanges>({
    small: { min: 35, max: 42 },
    medium: { min: 43, max: 50 },
    large: { min: 51, max: 58 }
  })
  const [configSource, setConfigSource] = useState<'user' | 'global' | 'local'>('local')
  const [isCustomized, setIsCustomized] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [rangeValidation, setRangeValidation] = useState<RangeValidation | null>(null)
  const [showGapWarning, setShowGapWarning] = useState(false)
  const [currentInputField, setCurrentInputField] = useState<'min' | 'max'>('min')
  const [isSavingRange, setIsSavingRange] = useState(false)

  // Motor test progress modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState('')
  const [testStatus, setTestStatus] = useState('')

  // Network status
  const isOnline = useInternetConnection()
  const { readyState } = useWebSocket()
  const isWebSocketConnected = readyState === WebSocket.OPEN



  // Entrance fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Load account ID from localStorage on component mount and set initial tab
  useEffect(() => {
    const savedAccountId = localStorage.getItem('megg-account-id')
    if (savedAccountId) {
      setCurrentAccountId(savedAccountId)
      // Fetch user data for the saved account ID
      fetchUserData(savedAccountId)
      // Load configuration for the account
      loadConfiguration(savedAccountId)
      // If account ID exists, go to camera tab
      setActiveTab('camera')
    } else {
      // If no account ID, go to account tab
      setActiveTab('account')
    }
  }, [])

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
        
        videoRef.current.onerror = (error) => {
          setCameraError("Video element error occurred")
          setIsCameraLoading(false)
        }
      } else {
        setCameraError("Video element not available")
        setIsCameraLoading(false)
      }
    } catch (error) {
      setCameraError(`Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsCameraLoading(false)
    }
  }, [isCameraOn, isCameraLoading])

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setCameraError("")
  }

  const togglePreview = () => {
    setShowPreview(!showPreview)
  }

  // Account functions
  const handleInputId = () => {
    setShowPinModal(true)
    setPinInput('')
    setPinError('')
    
    // Auto-focus on the first number button after modal opens
    setTimeout(() => {
      const firstButton = document.querySelector('[data-number="1"]') as HTMLButtonElement
      if (firstButton) {
        firstButton.focus()
      }
    }, 100)
  }

  const fetchUserData = async (accountId: string) => {
    try {
      setIsLoadingUser(true)
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('accountId', '==', accountId))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data()
        setUserData(userData)
        console.log('User data fetched:', userData)
        return userData
      } else {
        console.log('No user found with account ID:', accountId)
        setUserData(null)
        return null
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setUserData(null)
      return null
    } finally {
      setIsLoadingUser(false)
    }
  }

  const loadConfiguration = async (accountId: string) => {
    try {
      setIsLoadingConfig(true)
      const config = await getConfigurationWithFallback(accountId)
      setEggRanges(config.ranges)
      setConfigSource(config.source)
      setIsCustomized(config.isCustomized)
      
      // Validate ranges for gaps and overlaps
      const validation = validateRanges(config.ranges)
      setRangeValidation(validation)
      setShowGapWarning(validation.hasGaps)
      
      console.log('Configuration loaded:', config)
      console.log('Range validation:', validation)
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const handlePinSubmit = async () => {
    if (pinInput.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }
    
    // Set the account ID and save to localStorage
    const accountId = `MEGG-${pinInput}`
    
    // Fetch user data from Firebase
    const userData = await fetchUserData(accountId)
    
    if (userData) {
      setCurrentAccountId(accountId)
      localStorage.setItem('megg-account-id', accountId)
      
      // Load configuration for the logged-in user
      await loadConfiguration(accountId)
      
      // Close the modal
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Account ID not found. Please check your ID and try again.')
    }
  }

  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setPinInput(digitsOnly)
    setPinError('')
  }

  const clearAccountId = () => {
    setCurrentAccountId(null)
    setUserData(null)
    localStorage.removeItem('megg-account-id')
    // Navigate to account tab when account is cleared
    setActiveTab('account')
  }

  // Configuration functions
  const handleRangeEdit = (rangeType: 'small' | 'medium' | 'large') => {
    setEditingRange(rangeType)
    setCurrentInputField('min') // Start with min input
    
    // Check if we should auto-fill based on previous range
    const currentRange = eggRanges[rangeType]
    const nextRangeType = getNextRangeType(rangeType)
    
    if (nextRangeType && rangeType !== 'small') {
      // Auto-fill min with max of previous range + 0.01
      const previousRangeType = rangeType === 'medium' ? 'small' : 'medium'
      const previousRange = eggRanges[previousRangeType]
      const suggestedMin = Math.round((previousRange.max + 0.01) * 100) / 100
      
      setMinInput(suggestedMin.toString())
      setMaxInput(currentRange.max.toString())
    } else {
      setMinInput(currentRange.min.toString())
      setMaxInput(currentRange.max.toString())
    }
    
    setRangeError('')
    setShowRangeModal(true)
  }

  const handleRangeSubmit = async () => {
    if (minInput.length === 0 || maxInput.length === 0) {
      setRangeError('Please enter both minimum and maximum values')
      return
    }

    const min = parseFloat(minInput)
    const max = parseFloat(maxInput)

    if (isNaN(min) || isNaN(max)) {
      setRangeError('Please enter valid numbers')
      return
    }

    if (min >= max) {
      setRangeError('Minimum must be less than maximum')
      return
    }

    setIsSavingRange(true)
    setRangeError('')

    try {
      if (editingRange && currentAccountId) {
        const updatedRanges = {
          ...eggRanges,
          [editingRange]: { min, max }
        }
        
        // Validate the updated ranges
        const validation = validateRanges(updatedRanges)
        setRangeValidation(validation)
        
        setEggRanges(updatedRanges)
        setIsCustomized(true)
        setConfigSource('user')
        
        // Save to Firebase with fallback to localStorage
        await saveConfigurationWithFallback(currentAccountId, updatedRanges)
        
        // Show gap warning if there are gaps
        if (validation.hasGaps) {
          setShowGapWarning(true)
        }
      }

      setShowRangeModal(false)
      setEditingRange(null)
      setMinInput('')
      setMaxInput('')
    } catch (error) {
      console.error('Error saving range:', error)
      setRangeError('Failed to save configuration. Please try again.')
    } finally {
      setIsSavingRange(false)
    }
  }

  const handleMinChange = (value: string) => {
    // Allow digits and one decimal point, limit to 5 characters (e.g., "99.99")
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      // Only allow one decimal point
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      // Limit decimal places to 2
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMinInput(finalValue)
    setRangeError('')
    
    // Auto-switch to max input if min is complete (has decimal and 2 decimal places)
    if (finalValue.includes('.') && finalValue.split('.')[1].length === 2 && currentInputField === 'min') {
      setCurrentInputField('max')
    }
  }

  const handleMaxChange = (value: string) => {
    // Allow digits and one decimal point, limit to 5 characters (e.g., "99.99")
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      // Only allow one decimal point
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      // Limit decimal places to 2
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMaxInput(finalValue)
    setRangeError('')
  }

  const resetToDefaults = async () => {
    if (currentAccountId) {
      try {
        setIsLoadingConfig(true)
        // Delete user configuration to reset to defaults
        await deleteUserConfiguration(currentAccountId)
        
        // Reload configuration (will fetch global defaults)
        await loadConfiguration(currentAccountId)
        
        console.log('Configuration reset to defaults')
      } catch (error) {
        console.error('Error resetting to defaults:', error)
      } finally {
        setIsLoadingConfig(false)
      }
    }
  }

  // Handle keyboard input for number pad
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (showPinModal) {
      const key = event.key
      if (key >= '1' && key <= '9' && pinInput.length < 6) {
        handlePinChange(pinInput + key)
      } else if (key === 'Backspace' && pinInput.length > 0) {
        handlePinChange(pinInput.slice(0, -1))
      } else if (key === 'Enter' && pinInput.length === 6) {
        handlePinSubmit()
      } else if (key === 'Escape') {
        setShowPinModal(false)
      }
    }
  }


  // Capture image from video and send to Roboflow
  const captureImage = async () => {
    if (!isOnline) {
      setCaptureError('No internet connection. Roboflow detection requires internet access.')
      return
    }
    
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
      // Create canvas to capture frame
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
      } else {
        setCaptureError('Failed to create canvas context')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setCaptureError(`Capture failed: ${errorMessage}`)
    } finally {
      setIsCapturing(false)
    }
  }

  // Auto-start camera and show preview when camera tab becomes active
  useEffect(() => {
    
    if (activeTab === 'camera') {
      setShowPreview(true)
      
      // Small delay to ensure video element is ready
      setTimeout(() => {
        if (!isCameraOn) {
          startCamera()
        }
      }, 100)
    } else {
      setShowPreview(false)
    }
  }, [activeTab, isCameraOn, startCamera])

  // Check video stream state when preview becomes visible
  useEffect(() => {
    if (showPreview && isCameraOn && videoRef.current) {
      const video = videoRef.current
      const stream = video.srcObject as MediaStream
      
      // If video has no stream or stream is inactive, restart camera
      if (!stream || !stream.active || stream.getVideoTracks().length === 0) {
        startCamera()
      } else if (video.paused) {
        video.play().catch(e => {})
      }
    }
  }, [showPreview, activeTab, isCameraOn, startCamera])

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
      {/* Header - Fixed height for 5" landscape display */}
      <div className={`h-12 transition-all duration-1000 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}>
        {/* Top Navigation Bar - Professional design */}
        <div className="bg-slate-800/90 backdrop-blur-md border-b border-blue-500/30 px-3 py-2 h-12">
          <div className="flex items-center justify-between">
            {/* Logo and Title - Professional */}
            <div className="flex items-center gap-3">
              <Image
                src="/Logos/logowhite.png"
                alt="MEGG Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">MEGG</h1>
              </div>
            </div>

            {/* Minimal Status Indicators */}
            <div className="flex items-center gap-3">
              {/* Account ID Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentAccountId ? "bg-blue-400" : "bg-red-400"}`} />
                <span className="text-xs font-medium text-slate-300">
                  {currentAccountId ? currentAccountId : "NO ACCOUNT"}
                </span>
              </div>
              
              {/* Network Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-xs font-medium text-slate-300">NET</span>
              </div>
            </div>
              </div>
            </div>

        {/* Tab Navigation - Professional design */}
        <div className="bg-slate-700/50 backdrop-blur-sm border-b border-slate-600/50 px-3 h-10">
          <div className="flex space-x-1 h-full">
            {([
              { id: 'camera' as const, label: 'Camera', icon: Camera },
              { id: 'configuration' as const, label: 'Configuration', icon: Settings },
              { id: 'account' as const, label: 'Account', icon: User }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'camera' | 'configuration' | 'account')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg border-b-2 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Fixed height for 5" landscape display */}
      <div className="h-[calc(100vh-5rem)] overflow-hidden mt-8">

        {activeTab === 'camera' && (
          <div className="h-full flex flex-col p-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg flex-1 w-full">
              <div className="bg-slate-900 rounded-lg aspect-video border border-slate-700/50 h-64 sm:h-80 lg:h-96 relative overflow-hidden mb-4 w-full">
                {/* Floating preview control button */}
                <button
                  onClick={captureImage}
                  disabled={isCameraLoading || isCapturing || !showPreview || !isCameraOn}
                  className={`absolute top-4 right-4 z-10 p-3 rounded-full shadow-lg transition-all duration-200 ${
                    isCapturing || !showPreview || !isCameraOn
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isCapturing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CameraIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Always render video element but hide it when preview is off */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${showPreview && isCameraOn ? 'block' : 'hidden'}`}
                  autoPlay
                  muted
                  playsInline
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    transform: isMirrorMode ? "scaleX(-1)" : "none"
                  }}
                />
                
                {/* Minimalist transparent floating result container */}
                {(captureResult || captureError) && (
                  <div className="absolute top-4 right-4 z-20 animate-in slide-in-from-right-2 duration-300">
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
                
                {/* Show placeholder when preview is off or camera is not ready */}
                {!showPreview && (
                  <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Camera Feed</p>
                      <p className="text-slate-500 text-sm mt-2">Preview Hidden</p>
                    </div>
                  </div>
                )}
                
                {/* Show loading when camera is starting */}
                {showPreview && !isCameraOn && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400 text-lg">Camera Feed</p>
                      <p className="text-slate-500 text-sm mt-2">
                        {cameraError || (isCameraLoading ? 'Starting camera...' : 'Camera starting...')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        )}


        {activeTab === 'configuration' && (
          <div className="h-full overflow-y-auto p-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">
                Configuration
              </h2>

              <div className="space-y-6">

                {/* Egg Size Range Configuration - Minimal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Egg Size Ranges (grams)</h3>
                    <div className="flex items-center gap-2">
                      {isLoadingConfig && (
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                      )}
                      <div className={`text-xs px-2 py-1 rounded ${
                        configSource === 'user' ? 'bg-green-600 text-white' :
                        configSource === 'global' ? 'bg-blue-600 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {configSource === 'user' ? 'Custom' : 
                         configSource === 'global' ? 'Default' : 'Local'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Small Eggs */}
                    <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">S</span>
                        </div>
                        <div>
                          <span className="text-slate-300 text-sm font-medium">Small</span>
                          <p className="text-slate-400 text-xs">{eggRanges.small.min.toFixed(2)}-{eggRanges.small.max.toFixed(2)}g</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRangeEdit('small')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Medium Eggs */}
                    <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">M</span>
                        </div>
                        <div>
                          <span className="text-slate-300 text-sm font-medium">Medium</span>
                          <p className="text-slate-400 text-xs">{eggRanges.medium.min.toFixed(2)}-{eggRanges.medium.max.toFixed(2)}g</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRangeEdit('medium')}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Large Eggs */}
                    <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">L</span>
                        </div>
                        <div>
                          <span className="text-slate-300 text-sm font-medium">Large</span>
                          <p className="text-slate-400 text-xs">{eggRanges.large.min.toFixed(2)}-{eggRanges.large.max.toFixed(2)}g</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRangeEdit('large')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  
                  {/* Gap Warning */}
                  {showGapWarning && rangeValidation && rangeValidation.hasGaps && (
                    <div className="mt-3 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium text-yellow-200 mb-1">Range Gaps Detected</div>
                          <div className="text-yellow-300 space-y-1">
                            {rangeValidation.gaps.map((gap, index) => (
                              <div key={index}>
                                Gap between {gap.between}: {gap.from.toFixed(2)}g to {gap.to.toFixed(2)}g
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-yellow-400 mt-2">
                            Consider adjusting ranges to eliminate gaps for complete coverage.
                          </div>
                        </div>
                        <button
                          onClick={() => setShowGapWarning(false)}
                          className="text-yellow-400 hover:text-yellow-300 ml-auto"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reset to Defaults Button */}
                  {isCustomized && (
                    <div className="flex justify-center mt-3">
                      <button
                        onClick={resetToDefaults}
                        disabled={isLoadingConfig}
                        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center gap-2"
                      >
                        {isLoadingConfig ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4" />
                        )}
                        Reset to Defaults
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="h-full overflow-y-auto p-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">

              <div className="space-y-6">
                {/* Account Info Display - Only show when logged in */}
                {currentAccountId && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Account Information</h3>
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30 shadow-lg">
                      {isLoadingUser ? (
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                          <span className="text-white">Loading user data...</span>
                        </div>
                      ) : userData ? (
                        <div className="flex items-center justify-between">
                          {/* Left side - User Name */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-white font-semibold text-lg">
                                {userData.fullname || userData.username || 'User'}
                              </h4>
                              <p className="text-slate-400 text-sm">
                                {userData.email || 'No email'}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {userData.provider === 'google' ? 'Google Account' : 'Email Account'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Right side - Account ID */}
                          <div className="text-right">
                            <div className="text-slate-400 text-sm mb-2">Account ID</div>
                            <div className="text-2xl font-mono font-bold text-blue-400">{currentAccountId}</div>
                            <div className="text-slate-500 text-xs mt-1">
                              {userData.verified ? '✓ Verified' : '⚠ Unverified'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                          <p>User data not found</p>
                          <p className="text-sm">Account ID exists but user data is missing</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Input ID Section */}
                <div className="space-y-3">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <p className="text-slate-300 mb-4">
                        {currentAccountId 
                          ? 'Enter a new 6-digit Account ID to change your current account.'
                          : 'Enter your 6-digit Account ID to access machine functionality. Your machine ID will be formatted as MEGG-XXXXXX.'
                        }
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleInputId}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <User className="h-5 w-5" />
                          {currentAccountId ? 'Change Account ID' : 'Enter Account ID'}
                        </button>
                        {currentAccountId && (
                          <button
                            onClick={clearAccountId}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <XCircle className="h-5 w-5" />
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Modern Initialization Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-lg w-full mx-4 border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-light text-white mb-2">Initializing</h3>
                <p className="text-white/70 text-sm">Setting up MEGG system components</p>
              </div>

              {/* Progress Circle */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - testProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Percentage in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-light text-white">{testProgress}%</span>
                </div>
              </div>

              {/* Current Status */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">{currentTest}</span>
                </div>
                <p className="text-white/60 text-sm">{testStatus}</p>
              </div>

              {/* Minimal Progress Dots */}
              <div className="flex justify-center gap-2 mt-8">
                {[0, 1, 2, 3, 4, 5, 6].map((dot) => (
                  <div
                    key={dot}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      (testProgress / 100) * 7 > dot
                        ? 'bg-white scale-110'
                        : 'bg-white/30'
                    }`}
                  />
                )                )}

                {/* Account Activity Section */}
                {currentAccountId && userData && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Account Activity</h3>
                    <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Created:</span>
                          <p className="text-white font-medium">
                            {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Last Login:</span>
                          <p className="text-white font-medium">
                            {userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Phone:</span>
                          <p className="text-white font-medium">
                            {userData.phone || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Status:</span>
                          <p className={`font-medium ${userData.verified ? 'text-green-400' : 'text-yellow-400'}`}>
                            {userData.verified ? 'Verified' : 'Pending Verification'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Actions */}
                {currentAccountId && userData && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Account Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          // Update last login time
                          if (userData.uid) {
                            updateDoc(doc(db, 'users', userData.uid), {
                              lastLogin: new Date().toISOString()
                            }).catch(console.error)
                          }
                          setActiveTab('camera')
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Camera className="h-5 w-5" />
                        Start Camera
                      </button>
                      <button
                        onClick={() => {
                          // Refresh user data
                          if (currentAccountId) {
                            fetchUserData(currentAccountId)
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                        disabled={isLoadingUser}
                      >
                        {isLoadingUser ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Activity className="h-5 w-5" />
                        )}
                        Refresh Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add keyframes for animations */}
        <style jsx global>{`
          @keyframes ping-slow {
            0% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.4;
            }
            100% {
              transform: scale(1);
              opacity: 0.8;
            }
          }
        `}</style>
        {/* Account ID Input Modal */}
        {showPinModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
            onKeyDown={handleKeyPress}
            tabIndex={-1}
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 max-w-5xl w-full mx-4 border border-white/20 shadow-2xl h-[450px]">

              {/* Account ID Display and Number Pad */}
              <div className="grid grid-cols-2 gap-8 h-full">
                {/* Left Column - PIN Display and Action Buttons */}
                <div className="flex flex-col justify-center items-center space-y-6">
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-2xl px-8 py-12 shadow-2xl">
                    <div className="text-center">
                      <div className="text-white text-3xl font-mono mb-4">MEGG-</div>
                      <div className="flex justify-center space-x-3">
                        {Array.from({ length: 6 }, (_, index) => (
                          <div
                            key={index}
                            className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all duration-300 ${
                              index < pinInput.length
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : 'bg-slate-700/50 border-slate-500/50 text-slate-400'
                            }`}
                          >
                            {index < pinInput.length ? pinInput[index] : '●'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-6">
                    <button
                      onClick={() => setShowPinModal(false)}
                      className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-xl text-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePinSubmit}
                      disabled={pinInput.length !== 6}
                      className={`px-10 py-5 rounded-xl text-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                        pinInput.length === 6
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-500 cursor-not-allowed text-gray-300'
                      }`}
                    >
                      ✓ Bind
                    </button>
                  </div>
                  
                  {pinError && (
                    <p className="text-red-400 text-sm text-center">{pinError}</p>
                  )}
                </div>

                {/* Right Column - Number Pad */}
                <div className="flex flex-col justify-center">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          data-number={num}
                          onClick={() => handlePinChange(pinInput + num.toString())}
                          disabled={pinInput.length >= 6}
                          className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handlePinChange(pinInput + '0')}
                        disabled={pinInput.length >= 6}
                        className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        0
                      </button>
                      <button
                        onClick={() => handlePinChange(pinInput.slice(0, -1))}
                        disabled={pinInput.length === 0}
                        className="w-30 h-20 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                      >
                        ⌫
                      </button>
                      <div className="w-30 h-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Range Editing Modal */}
        {showRangeModal && editingRange && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
            onKeyDown={handleKeyPress}
            tabIndex={-1}
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 max-w-5xl w-full mx-4 border border-white/20 shadow-2xl h-[450px]">

              {/* Range Display and Number Pad */}
              <div className="grid grid-cols-2 gap-8 h-full">
                {/* Left Column - Range Display */}
                <div className="flex flex-col justify-center items-center">
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-2xl px-8 py-12 shadow-2xl">
                    <div className="text-center">
                      <div className="text-white text-2xl font-semibold mb-4 capitalize">
                        {editingRange} Eggs
                      </div>
                       <div className="flex justify-center items-center space-x-8">
                         {/* Min Input */}
                         <div className="flex flex-col items-center space-y-3">
                           <div className={`text-sm font-medium ${currentInputField === 'min' ? 'text-blue-400' : 'text-slate-400'}`}>
                             Min {currentInputField === 'min' && '●'}
                           </div>
                           <div 
                             className={`w-24 h-20 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 ${
                               currentInputField === 'min' 
                                 ? 'bg-blue-600/20 border-2 border-blue-400 shadow-lg shadow-blue-400/20' 
                                 : 'bg-slate-700 border-2 border-slate-600 hover:border-slate-500'
                             }`}
                             onClick={() => setCurrentInputField('min')}
                           >
                             <span className="text-2xl font-bold text-white font-mono">
                               {minInput || '0.00'}
                             </span>
                           </div>
                         </div>
                         
                         {/* Dash Separator */}
                         <div className="text-white text-3xl font-bold">-</div>
                         
                         {/* Max Input */}
                         <div className="flex flex-col items-center space-y-3">
                           <div className={`text-sm font-medium ${currentInputField === 'max' ? 'text-green-400' : 'text-slate-400'}`}>
                             Max {currentInputField === 'max' && '●'}
                           </div>
                           <div 
                             className={`w-24 h-20 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 ${
                               currentInputField === 'max' 
                                 ? 'bg-green-600/20 border-2 border-green-400 shadow-lg shadow-green-400/20' 
                                 : 'bg-slate-700 border-2 border-slate-600 hover:border-slate-500'
                             }`}
                             onClick={() => setCurrentInputField('max')}
                           >
                             <span className="text-2xl font-bold text-white font-mono">
                               {maxInput || '0.00'}
                             </span>
                           </div>
                         </div>
                       </div>
                       
                       {/* Action Buttons */}
                       <div className="flex gap-4 mt-8">
                         <button
                           onClick={() => setShowRangeModal(false)}
                           className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                         >
                           <XCircle className="h-5 w-5" />
                           Cancel
                         </button>
                         <button
                           onClick={handleRangeSubmit}
                           disabled={minInput.length === 0 || maxInput.length === 0 || isSavingRange}
                           className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                             minInput.length > 0 && maxInput.length > 0 && !isSavingRange
                               ? 'bg-blue-600 hover:bg-blue-700 text-white'
                               : 'bg-gray-500 cursor-not-allowed text-gray-300'
                           }`}
                         >
                           {isSavingRange ? (
                             <>
                               <Loader2 className="h-5 w-5 animate-spin" />
                               Saving...
                             </>
                           ) : (
                             <>
                               <Activity className="h-5 w-5" />
                               Save Range
                             </>
                           )}
                         </button>
                       </div>
                    </div>
                  </div>
                  
                  {rangeError && (
                    <p className="text-red-400 text-sm text-center mt-4">{rangeError}</p>
                  )}
                </div>

                {/* Right Column - Number Pad */}
                <div className="flex flex-col justify-center">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                       {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                         <button
                           key={num}
                           data-number={num}
                           onClick={() => {
                             // Add to current input field
                             if (currentInputField === 'min') {
                               handleMinChange(minInput + num.toString())
                             } else {
                               handleMaxChange(maxInput + num.toString())
                             }
                           }}
                           disabled={(minInput.length >= 5 && maxInput.length >= 5)}
                           className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                         >
                           {num}
                         </button>
                       ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          // Add 0 to current input field
                          if (currentInputField === 'min') {
                            handleMinChange(minInput + '0')
                          } else {
                            handleMaxChange(maxInput + '0')
                          }
                        }}
                        disabled={(minInput.length >= 5 && maxInput.length >= 5)}
                        className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        0
                      </button>
                      <button
                        onClick={() => {
                          // Add decimal point to current input field
                          if (currentInputField === 'min') {
                            handleMinChange(minInput + '.')
                          } else {
                            handleMaxChange(maxInput + '.')
                          }
                        }}
                        disabled={(currentInputField === 'min' && minInput.includes('.')) || (currentInputField === 'max' && maxInput.includes('.')) || (currentInputField === 'min' && minInput.length === 0) || (currentInputField === 'max' && maxInput.length === 0)}
                        className="w-30 h-20 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                      >
                        .
                      </button>
                      <button
                        onClick={() => {
                          // Delete from current input field
                          if (currentInputField === 'min' && minInput.length > 0) {
                            handleMinChange(minInput.slice(0, -1))
                          } else if (currentInputField === 'max' && maxInput.length > 0) {
                            handleMaxChange(maxInput.slice(0, -1))
                          }
                        }}
                        disabled={(currentInputField === 'min' && minInput.length === 0) || (currentInputField === 'max' && maxInput.length === 0)}
                        className="w-30 h-20 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                      >
                        ⌫
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
