// kiosk-next-frontend/app/page.tsx
"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { 
  Camera, 
  User,
  Package,
  Settings,
  Target,
  RefreshCw,
  Play
} from "lucide-react"

import { useInternetConnection, useWebSocket } from "./contexts/NetworkContext"
import { CameraProvider, useCamera } from "./contexts/CameraContext"
import { db } from './libs/firebaseConfig'
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore'
import iotService from './services/iotService'
import calibrationService from './services/calibrationService'
import { useAccount } from './services/accountService'
import { useCalibrationStatus } from './services/calibrationManager'
import batchService from './services/batchService'
import { roboflowService } from './services/roboflowService'
import { 
  getConfigurationWithFallback, 
  saveConfigurationWithFallback, 
  deleteUserConfiguration,
  EggSizeRanges,
  validateRanges,
  getNextRangeType,
  RangeValidation
} from './utils/configurationService'

// Import tab components
import CameraTab from "./components/CameraTab"
import BatchTab from "./components/BatchTab"
import ConfigurationTab from "./components/ConfigurationTab"
import CalibrationTab from "./components/CalibrationTab"
import AccountTab from "./components/AccountTab"
import MainTab from "./components/MainTab"

// Import modal components
import PinModal from "./components/PinModal"
import RangeModal from "./components/RangeModal"
import BatchModal from "./components/BatchModal"
import Toaster from "./components/Toaster"

function HomeInner() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'main' | 'camera' | 'configuration' | 'account' | 'batch' | 'calibration'>('camera')
  const [isProcessing, setIsProcessing] = useState(false)
  const [systemPhase, setSystemPhase] = useState<'idle' | 'getting_ready' | 'load_eggs' | 'ready_to_process' | 'processing'>('idle')
  const [isSorting, setIsSorting] = useState(false)
  const [isPlainSortingMode, setIsPlainSortingMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    goodEggs: 0,
    crackEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0
  })
  const [recentEggs, setRecentEggs] = useState<{ eggId: string; weight: number | null; size: 'small'|'medium'|'large'|null; quality: 'good'|'dirty'|'cracked' }[]>([])
  const [eggHistory, setEggHistory] = useState<{ eggId: string; weight: number | null; size: 'small'|'medium'|'large'|null; quality: 'good'|'dirty'|'cracked'; createdAt: string }[]>([])
  const lastWeightRef = useRef<number | null>(null)
  const lastProcessedAtRef = useRef<number>(0)
  const lastProcessedWeightRef = useRef<number | null>(null)
  const [waitingForQuality, setWaitingForQuality] = useState(false)
  const pendingWeightRef = useRef<number | null>(null)
  const { captureFrame, isReady: isCameraReady } = useCamera()

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Account management using clean service
  const {
    accountId: currentAccountId,
    userData,
    isLoading: isLoadingUser,
    error: accountError,
    loadAccount,
    clearAccount,
    ensureUID
  } = useAccount()

  // Calibration status management using clean service
  const {
    status: calibrationStatus,
    updateStatus: updateCalibrationStatus,
    saveCalibrationResult: saveCalibrationToFirebase,
    loadFromFirebase: loadCalibrationFromFirebase
  } = useCalibrationStatus()

  // UI states
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

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

  // Batch states
  const [currentBatch, setCurrentBatch] = useState<any>(null)
  const [batchStatus, setBatchStatus] = useState<'idle' | 'ready' | 'processing' | 'completed' | 'archived'>('idle')
  const [batchStats, setBatchStats] = useState({
    totalEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0,
    goodEggs: 0,
    dirtyEggs: 0,
    crackEggs: 0
  })
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false)
  const [batchIdInput, setBatchIdInput] = useState('')
  const [batchIdError, setBatchIdError] = useState('')
  const [existingBatch, setExistingBatch] = useState<any>(null)
  const [isCheckingBatch, setIsCheckingBatch] = useState(false)
  const [suggestedBatchNumber, setSuggestedBatchNumber] = useState<string | null>(null)
  const [isLoadingSuggestedBatch, setIsLoadingSuggestedBatch] = useState(false)
  const [activeStatsView, setActiveStatsView] = useState<'overview' | 'size' | 'quality'>('overview')

  // Calibration states
  const [isCalibratingUno, setIsCalibratingUno] = useState(false)
  const [isCalibratingHX711, setIsCalibratingHX711] = useState(false)
  const [isCalibratingNema23, setIsCalibratingNema23] = useState(false)
  const [isCalibratingSG90, setIsCalibratingSG90] = useState(false)
  const [isCalibratingMG996R, setIsCalibratingMG996R] = useState(false)
  const [toaster, setToaster] = useState<{
    show: boolean
    type: 'success' | 'error' | 'info'
    message: string
  }>({ show: false, type: 'info', message: '' })

  // IoT connection state
  const [iotConnected, setIotConnected] = useState(false)

  // Load calibration data when account changes
  useEffect(() => {
    if (currentAccountId) {
      loadCalibrationFromFirebase(currentAccountId)
    }
  }, [currentAccountId, loadCalibrationFromFirebase])


  // Load batches when account ID changes
  const loadBatches = async (accountId: string) => {
    if (!accountId) return
    
    try {
      const batches = await batchService.getBatchesForAccount(accountId, 5)
      // You can use this to show recent batches or set a default batch
      if (batches.length > 0) {
        // Optionally set the most recent batch as current
        // setCurrentBatch(batches[0])
      }
    } catch (error) {
      console.error('Error loading batches:', error)
    }
  }

  // Load batches when account ID changes
  useEffect(() => {
    if (currentAccountId) {
      loadBatches(currentAccountId)
    }
  }, [currentAccountId])

  // Load batch stats from database when currentBatch changes
  useEffect(() => {
    const loadBatchStats = async () => {
      if (currentBatch?.id) {
        try {
          const batchData = await batchService.getBatch(currentBatch.id)
          if (batchData && batchData.stats) {
            setBatchStats(batchData.stats)
            setBatchStatus(batchData.status || 'ready')
            // Update currentBatch with latest data
            setCurrentBatch(batchData)
          }
        } catch (error) {
          console.error('Error loading batch stats:', error)
        }
      }
    }
    
    loadBatchStats()
  }, [currentBatch?.id])

  // Load configuration when account ID changes (or when there's no account ID)
  // If no accountId, loads from global_configurations
  // If accountId exists, loads from user_configurations (with fallback to global)
  useEffect(() => {
    loadConfiguration(currentAccountId)
  }, [currentAccountId])

  // Set initial tab based on account status
  useEffect(() => {
    if (currentAccountId && userData) {
      setActiveTab('main')
    } else if (!isLoadingUser) {
      setActiveTab('account')
    }
  }, [currentAccountId, userData, isLoadingUser])

  // Network status
  const connectionStatus = useInternetConnection()
  const isOnline = connectionStatus.internet
  const { readyState } = useWebSocket()
  const isWebSocketConnected = readyState === WebSocket.OPEN

  // Entrance fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // This effect is handled by the more comprehensive loadAccountFromStorage effect above

  // IoT connection management
  useEffect(() => {
    const connectIoT = async () => {
      try {
        await iotService.connect()
        setIotConnected(true)
        
             // Get initial system status after a delay to ensure connection is stable
             setTimeout(async () => {
               try {
                 const status = await iotService.getSystemStatus()
                 
                 // DISABLED: IoT system status update overwrites Firebase data
                 // We get real calibration data from Firebase, not from IoT system status
                 // updateCalibrationStatus calls removed to prevent overwriting Firebase data
               } catch (error) {
                 console.error('Failed to get initial system status:', error)
               }
             }, 2000)
      } catch (error) {
        console.error('Failed to connect to IoT backend:', error)
        setIotConnected(false)
      }
    }

    // Event handlers
    const handleConnected = () => {
      setIotConnected(true)
    }

    const handleDisconnected = () => {
      setIotConnected(false)
    }

    const handleCalibrationResult = async (data: any) => {
      
      // Update calibration status in real-time
      if (data.component && data.status) {
        const component = data.component.toUpperCase()
        
        let frontendStatus: 'unknown' | 'calibrated' | 'calibrating' | 'failed'
        
        if (data.status === 'completed') {
          frontendStatus = 'calibrated'
        } else if (data.status === 'started') {
          frontendStatus = 'calibrating'
        } else if (data.status === 'failed') {
          frontendStatus = 'failed'
      } else {
          frontendStatus = 'unknown'
        }
        
        const timestamp = (data.status === 'completed' || data.status === 'failed') ? 
                         new Date().toISOString() : undefined
        
        updateCalibrationStatus(component, frontendStatus, timestamp)
      }
      
      // Save to Firebase if we have an account
      if (currentAccountId) {
        try {
          const component = data.component.toUpperCase()
          const status = data.status === 'completed' ? 'calibrated' : 
                        data.status === 'started' ? 'calibrating' : 
                        data.status === 'failed' ? 'failed' : 'unknown'
          
          await saveCalibrationToFirebase(
            component,
            status,
            data.success || false,
            data.message || `${component} calibration ${data.success ? 'completed' : 'failed'}`
          )
          
          // Ensure UID exists
          await ensureUID()
          
    } catch (error) {
          console.error('Failed to save calibration result to Firebase:', error)
          showToaster('error', 'Failed to save calibration result to Firebase.')
        }
      } else {
        showToaster('info', 'Calibration completed! Enter your Account ID to save results to Firebase.')
      }
      
      // Show user feedback
      if (data.status === 'completed') {
        if (data.success) {
          showToaster('success', data.message || `${data.component} calibration completed successfully`)
        } else {
          showToaster('error', data.message || `${data.component} calibration failed`)
        }
        resetCalibrationState(data.component)
      } else if (data.status === 'failed' || !data.success) {
        showToaster('error', data.message || `${data.component} calibration failed: ${data.error || 'Unknown error'}`)
        resetCalibrationState(data.component)
      } else if (data.status === 'started') {
      }
    }

    // Connect to IoT backend
    connectIoT()

    // Set up event listeners
    iotService.on('connected', handleConnected)
    iotService.on('disconnected', handleDisconnected)
    iotService.on('calibrationResult', handleCalibrationResult)
    iotService.on('sorting_result', onSortingResult)
    iotService.on('plain_sorting_result', onSortingResult)
    iotService.on('sorting_progress', onSortingProgress)
    iotService.on('sorting_stop_result', onSortingStopResult)

    return () => {
      // Cleanup event listeners
      iotService.off('connected', handleConnected)
      iotService.off('disconnected', handleDisconnected)
      iotService.off('calibrationResult', handleCalibrationResult)
      iotService.off('sorting_result', onSortingResult)
      iotService.off('plain_sorting_result', onSortingResult)
      iotService.off('sorting_progress', onSortingProgress)
      iotService.off('sorting_stop_result', onSortingStopResult)
      iotService.disconnect()
    }
  }, [currentAccountId, updateCalibrationStatus, saveCalibrationToFirebase, ensureUID])

  const onSortingResult = useCallback((data: any) => {
    // Treat as progress/ack; do not flip isSorting here for continuous operation
    if (data?.error) {
      showToaster('error', data.error)
    } else if (data?.message) {
      showToaster('info', data.message)
    }
  }, [])

  const persistEgg = useCallback(async (weight: number | null, classification: 'small'|'medium'|'large'|'bad', options?: { bypassDedup?: boolean, qualityLabel?: 'good'|'dirty'|'cracked' }) => {
    // Dedupe: if same weight processed within 1.5s, ignore
    const now = Date.now()
    if (!options?.bypassDedup && typeof weight === 'number' && lastProcessedWeightRef.current === weight && (now - lastProcessedAtRef.current) < 1500) {
      console.log('[UI] Skipping duplicate egg (same weight within 1.5s):', weight)
      return
    }

    // Generate egg ID: EGG-{batchIdWithoutBATCH}-{5randomchars}
    // Example: BATCH-679622-0001 -> EGG-6796220001-a3b5c
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(5)) : new Uint8Array(5).map(() => Math.floor(Math.random()*256))
    const randomSuffix = Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('')
    const batchIdWithoutPrefix = currentBatch?.id ? currentBatch.id.replace('BATCH-', '').replace(/-/g, '') : 'UNKNOWN'
    const eggId = `EGG-${batchIdWithoutPrefix}-${randomSuffix}`

    // Determine quality label and compute size from configured ranges
    // qualityLabel takes precedence and must be one of 'good'|'dirty'|'cracked'
    const qualityLabel: 'good'|'dirty'|'cracked' = options?.qualityLabel
      ? options.qualityLabel
      : (classification === 'bad' ? 'cracked' : 'good')
    let computedSize: 'small'|'medium'|'large'|null = null
    if (typeof weight === 'number') {
      const w = weight
      // Clamp logic: below small.min => small; above large.max => large
      if (w < eggRanges.small.min) {
        computedSize = 'small'
      } else if (w > eggRanges.large.max) {
        computedSize = 'large'
      } else if (w >= eggRanges.small.min && w <= eggRanges.small.max) {
        computedSize = 'small'
      } else if (w >= eggRanges.medium.min && w <= eggRanges.medium.max) {
        computedSize = 'medium'
      } else if (w >= eggRanges.large.min && w <= eggRanges.large.max) {
        computedSize = 'large'
      } else {
        // If gaps exist due to config, approximate to nearest boundary
        const distToSmall = Math.abs(w - eggRanges.small.max)
        const distToMedium = Math.abs(w - eggRanges.medium.max)
        const distToLarge = Math.abs(w - eggRanges.large.min)
        const minDist = Math.min(distToSmall, distToMedium, distToLarge)
        computedSize = minDist === distToSmall ? 'small' : (minDist === distToMedium ? 'medium' : 'large')
      }
    }

    // Always update the UI list first so MainTab shows the latest eggs
    const createdAt = new Date().toISOString()
    setRecentEggs(prev => {
      const next = [{ eggId, weight, size: computedSize, quality: qualityLabel }, ...prev].slice(0, 3)
      console.log('[UI] recentEggs updated:', next)
      return next
    })
    setEggHistory(prev => [{ eggId, weight, size: computedSize, quality: qualityLabel, createdAt }, ...prev])

    // Mark last processed
    lastProcessedAtRef.current = now
    lastProcessedWeightRef.current = typeof weight === 'number' ? weight : null

    // If batch/account context is missing, skip persistence and stats, but keep the UI
    const hasBatch = !!currentBatch?.id
    const hasAccount = !!currentAccountId
    console.log('[IoT] persistEgg context', { hasBatch, batchId: currentBatch?.id, hasAccount, accountId: currentAccountId, weight, classification, computedSize, quality: qualityLabel })
    if (!hasBatch || !hasAccount) {
      console.warn('[IoT] Skipping persist (no batch/account). Showing in UI only.')
      return
    }

    console.log('[IoT] processing egg', { weight, size: computedSize, quality: qualityLabel, accountId: currentAccountId, batchId: currentBatch.id, eggId })

    // Update stats in UI immediately using functional update
    let nextStats: typeof batchStats
    setBatchStats(prev => {
      nextStats = {
        ...prev,
        totalEggs: (prev.totalEggs || 0) + 1,
        smallEggs: prev.smallEggs + (computedSize === 'small' ? 1 : 0),
        mediumEggs: prev.mediumEggs + (computedSize === 'medium' ? 1 : 0),
        largeEggs: prev.largeEggs + (computedSize === 'large' ? 1 : 0),
        goodEggs: (prev.goodEggs || 0) + (qualityLabel === 'good' ? 1 : 0),
        dirtyEggs: (prev.dirtyEggs || 0) + (qualityLabel === 'dirty' ? 1 : 0),
        crackEggs: (prev.crackEggs || 0) + (qualityLabel === 'cracked' ? 1 : 0),
      }
      return nextStats
    })

    // Persist to Firestore (non-blocking UI)
    try {
      const eggDoc = {
        accountId: currentAccountId,
        batchId: currentBatch.id,
        eggId,
        weight,
        size: computedSize,
        quality: qualityLabel,
        createdAt: new Date().toISOString(),
      }
      console.log('[Firestore] Saving egg (idempotent)...', eggDoc)
      await setDoc(doc(db, 'eggs', eggId), eggDoc)
      console.log('[Firestore] Egg saved with fixed docId:', eggId)
    } catch (e) {
      console.error('[Firestore] Failed to save egg document', e)
    }

    try {
      const deltas = {
        totalEggs: 1,
        smallEggs: computedSize === 'small' ? 1 : 0,
        mediumEggs: computedSize === 'medium' ? 1 : 0,
        largeEggs: computedSize === 'large' ? 1 : 0,
        goodEggs: qualityLabel === 'good' ? 1 : 0,
        dirtyEggs: qualityLabel === 'dirty' ? 1 : 0,
        crackEggs: qualityLabel === 'cracked' ? 1 : 0,
      }
      console.log('[Firestore] Incrementing batch stats for', currentBatch.id, deltas)
      await batchService.incrementBatchStats(currentBatch.id, deltas)
      console.log('[Firestore] Batch stats increment queued/applied for', currentBatch.id)
    } catch (e) {
      console.error('[Firestore] Failed to update batch stats', e)
    }
  }, [currentBatch, currentAccountId])

  const onEggProcessed = useCallback(async (data: any) => {
    try {
      if (!data || !currentBatch?.id || !currentAccountId) return
      const weight = typeof data.weight === 'number' ? data.weight : null
      const sizeRaw = (data.size || '').toString().toLowerCase()
      const size: 'small'|'medium'|'large'|'bad' =
        sizeRaw.includes('small') ? 'small' :
        sizeRaw.includes('medium') ? 'medium' :
        sizeRaw.includes('large') ? 'large' : 'bad'
      console.log('[IoT] egg_processed received', { weight, size })
      await persistEgg(weight, size)
    } catch (err) {
      console.error('Failed to handle egg_processed:', err)
    }
  }, [currentBatch, currentAccountId, persistEgg])

  // Ensure we capture server-driven egg_processed events in both START and START_PLAIN flows
  useEffect(() => {
    iotService.on('egg_processed', onEggProcessed)
    return () => {
      iotService.off('egg_processed', onEggProcessed)
    }
  }, [onEggProcessed])

  const onSortingProgress = useCallback(async (data: any) => {
    if (!data?.message) return
    const line: string = data.message
    // Verbose log for troubleshooting plain mode visibility
    console.log('[IoT][progress]', line)
    if (line.startsWith('HX711: Weight measured:')) {
      // e.g., HX711: Weight measured: 221.45 g
      const parts = line.split(':').pop()!.trim().split(' ')
      const w = parseFloat(parts[0])
      if (!isNaN(w)) {
        lastWeightRef.current = w
        console.log('[IoT] parsed weight from sorting_progress:', w)
        // Plain mode fallback: persist on weight event
        if (isPlainSortingMode) {
          try {
            console.log('[Plain] Persisting on HX711 weight event', { weight: w })
            await persistEgg(w, 'small')
          } catch (e) {
            console.error('[Plain] Persist on weight failed', e)
          }
        }
      }
    } else if (
      (line.startsWith('SORT: Egg (') && line.includes('classified as')) ||
      (line.startsWith('SORT:') && line.includes('=>'))
    ) {
      // Examples:
      //  - SORT: Egg (221.45g) classified as BAD
      //  - SORT: 221.45g => SMALL
      let sizeText = ''
      if (line.includes('classified as')) {
        sizeText = line.split('classified as').pop()!.trim().toLowerCase()
      } else if (line.includes('=>')) {
        sizeText = line.split('=>').pop()!.trim().toLowerCase()
      }
      const size: 'small'|'medium'|'large'|'bad' =
        sizeText.includes('small') ? 'small' :
        sizeText.includes('medium') ? 'medium' :
        sizeText.includes('large') ? 'large' : 'bad'
      const weight = lastWeightRef.current
      console.log('[IoT] classification detected from sorting_progress:', { weight, size, plain: isPlainSortingMode })
      // Plain mode: persist immediately without waiting for QUALITY
      if (isPlainSortingMode) {
        try {
          console.log('[Plain] Persisting egg immediately', { weight, size })
          await persistEgg(typeof weight === 'number' ? weight : null, size)
          console.log('[Plain] Persist queued: recentEggs/UI updated and Firebase setDoc/increment queued')
        } catch (e) {
          console.error('[UI] Failed to persist egg in plain mode', e)
        }
      }
    } else if (line.startsWith('SORT_READY')) {
      // Arduino is waiting for QUALITY from frontend
      pendingWeightRef.current = lastWeightRef.current
      setWaitingForQuality(true)
      console.log('[IoT] SORT_READY received. Waiting for QUALITY decision. Pending weight:', pendingWeightRef.current)
    }
  }, [persistEgg, isPlainSortingMode])

  const sendQualityDecision = useCallback(async (quality: 'GOOD'|'BAD') => {
    try {
      if (!iotService.isConnected()) {
        showToaster('error', 'IoT Backend not connected. Cannot send QUALITY.')
        return
      }
      // Send QUALITY command to IoT backend (Arduino will continue flow)
      const ok = await iotService.sendQuality(quality)
      if (!ok) {
        showToaster('error', 'Failed to send QUALITY command.')
        return
      }
      const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
      // Persist after decision: provide explicit quality label mapping for DB
      // GOOD -> 'good'; BAD -> caller should pass 'dirty' or 'cracked' via an overload helper; default to 'cracked' when unspecified
      const qualityLabel: 'good'|'dirty'|'cracked' = quality === 'BAD' ? 'cracked' : 'good'
      await persistEgg(weight, quality === 'BAD' ? 'bad' : 'small', { qualityLabel })
      setWaitingForQuality(false)
      pendingWeightRef.current = null
      showToaster('success', `QUALITY ${quality} sent`)
    } catch (err) {
      console.error('Failed to handle QUALITY decision:', err)
      showToaster('error', 'Failed to handle QUALITY decision')
    }
  }, [persistEgg, iotService])
  // Auto quality decision flow when waitingForQuality using CameraTab feed
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!waitingForQuality) return
      if (!isCameraReady) {
        showToaster('error', 'Camera not ready for automatic quality check. Open Camera tab to enable.')
        return
      }
      try {
        const img = captureFrame()
        if (!img) return
        const result = await roboflowService.predictDefect(img)
        if (cancelled || !result) return
        const pred = (result.prediction || '').toLowerCase()
        if (pred === 'good') {
          await sendQualityDecision('GOOD')
        } else if (pred === 'cracked') {
          const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
          const ok = await iotService.sendQuality('BAD')
          if (ok) {
            await persistEgg(weight, 'bad', { qualityLabel: 'cracked' })
            setWaitingForQuality(false)
            pendingWeightRef.current = null
            showToaster('success', 'QUALITY BAD (CRACKED) sent')
          } else {
            showToaster('error', 'Failed to send QUALITY command.')
          }
        } else if (pred === 'dirty') {
          const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
          const ok = await iotService.sendQuality('BAD')
          if (ok) {
            await persistEgg(weight, 'bad', { qualityLabel: 'dirty' })
            setWaitingForQuality(false)
            pendingWeightRef.current = null
            showToaster('success', 'QUALITY BAD (DIRTY) sent')
          } else {
            showToaster('error', 'Failed to send QUALITY command.')
          }
        } else {
          console.warn('[Camera] Unknown prediction class:', pred)
        }
      } catch (e) {
        console.error('[Camera] Auto decision failed', e)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [waitingForQuality, isCameraReady, captureFrame, sendQualityDecision, persistEgg])

  const onSortingStopResult = useCallback((data: any) => {
    setIsSorting(false)
    if (data?.success) {
      showToaster('success', data.message || 'Sorting stopped')
    } else if (data?.error) {
      showToaster('error', data.error)
    }
  }, [])

  useEffect(() => {
    iotService.on('sorting_result', onSortingResult)
    iotService.on('plain_sorting_result', onSortingResult)
    iotService.on('sorting_stop_result', onSortingStopResult)
    return () => {
      iotService.off('sorting_result', onSortingResult)
      iotService.off('plain_sorting_result', onSortingResult)
      iotService.off('sorting_stop_result', onSortingStopResult)
    }
  }, [onSortingResult, onSortingStopResult])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleStartSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    try {
      // Require an active batch before starting
      if (!currentBatch || !currentBatch.id) {
        showToaster('error', 'No Batch selected. Please create or select a batch in the Batch tab.')
        setActiveTab('batch')
        return
      }
      // 1) Send configuration first
      if (!currentAccountId) {
        showToaster('error', 'No Account ID. Please log in first.')
        return
      }

      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      const payload = {
        accountId: currentAccountId,
        configurations: {
          eggSizeRanges: eggRanges
        },
        metadata: {
          isCustomized,
          lastModifiedAt: new Date().toISOString()
        },
        uid: uid || undefined,
        batchId: currentBatch.id,
        currentBatch: { id: currentBatch.id, name: currentBatch.name }
      }

      const cfgResult = await iotService.sendConfiguration(payload)
      if (!cfgResult.success) {
        showToaster('error', `Failed to send configuration${cfgResult.error ? `: ${cfgResult.error}` : ''}`)
        return
      }
      showToaster('success', 'Configuration sent to IoT backend.')

      // 2) Trigger sorting via backend (backend builds START with ranges if available)
      const startRes = await iotService.startSorting()
      if (!startRes.success) {
        showToaster('error', startRes.error || 'Failed to start sorting')
        return
      }
      setIsSorting(true)
      setIsPlainSortingMode(false)
      showToaster('success', startRes.message || 'Sorting started.')
    } catch (error) {
      showToaster('error', 'Failed to send START command.')
    }
  }

  const handleStopSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected.')
      return
    }
    try {
      const stopRes = await iotService.stopSorting()
      if (!stopRes.success) {
        showToaster('error', stopRes.error || 'Failed to stop sorting')
        return
      }
      // Immediate ack; final result will arrive via broadcast
      setIsSorting(false)
      setIsPlainSortingMode(false)
      showToaster('info', stopRes.message || 'Stop request sent.')
    } catch (e) {
      showToaster('error', 'Failed to send STOP command.')
    }
  }

  const handleStartPlainSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    try {
      if (!currentBatch || !currentBatch.id) {
        showToaster('error', 'No Batch selected. Please create or select a batch in the Batch tab.')
        setActiveTab('batch')
        return
      }
      if (!currentAccountId) {
        showToaster('error', 'No Account ID. Please log in first.')
        return
      }

      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      const payload = {
        accountId: currentAccountId,
        configurations: {
          eggSizeRanges: eggRanges
        },
        metadata: {
          isCustomized,
          lastModifiedAt: new Date().toISOString()
        },
        uid: uid || undefined,
        batchId: currentBatch.id,
        currentBatch: { id: currentBatch.id, name: currentBatch.name }
      }

      console.log('[Plain] Sending configuration before START_PLAIN', payload)
      const cfgResult = await iotService.sendConfiguration(payload)
      if (!cfgResult.success) {
        showToaster('error', `Failed to send configuration${cfgResult.error ? `: ${cfgResult.error}` : ''}`)
        return
      }
      showToaster('success', 'Configuration sent to IoT backend.')
      console.log('[Plain] Configuration ack:', cfgResult)

      console.log('[Plain] Triggering START_PLAIN via websocket')
      const startRes = await iotService.startPlainSorting()
      if (!startRes.success) {
        showToaster('error', startRes.error || 'Failed to start plain sorting')
        return
      }
      setIsSorting(true)
      setIsPlainSortingMode(true)
      showToaster('success', startRes.message || 'Plain sorting started.')
      console.log('[Plain] START_PLAIN ack:', startRes)
    } catch (error) {
      showToaster('error', 'Failed to send START_PLAIN command.')
      console.error('[Plain] START_PLAIN failed', error)
    }
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

  // Account functions using clean service
  const handlePinSubmit = async () => {
    if (pinInput.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }
    
    const accountId = `MEGG-${pinInput}`
    const success = await loadAccount(accountId)
    
    if (success) {
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Account ID not found. Please check your ID and try again.')
    }
  }

  const loadConfiguration = async (accountId: string | null) => {
    try {
      setIsLoadingConfig(true)
      // If no accountId, load from global_configurations
      // If accountId exists, try user_configurations first, then fallback to global
      const config = await getConfigurationWithFallback(accountId)
      setEggRanges(config.ranges)
      setConfigSource(config.source)
      setIsCustomized(config.isCustomized)
      
      // Validate ranges for gaps and overlaps
      const validation = validateRanges(config.ranges)
      setRangeValidation(validation)
      setShowGapWarning(validation.hasGaps)
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }


  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setPinInput(digitsOnly)
    setPinError('')
  }

  const clearAccountId = () => {
    clearAccount()
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
    try {
      setIsLoadingConfig(true)
      if (currentAccountId) {
        // Delete user configuration to reset to defaults
        await deleteUserConfiguration(currentAccountId)
      }
      // Reload configuration (will fetch global defaults)
      // If no accountId, this will load from global_configurations
      // If accountId exists, this will load global defaults after deleting user config
      await loadConfiguration(currentAccountId)
      
    } catch (error) {
      console.error('Error resetting to defaults:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Batch functions
  /**
   * Calculate the next suggested batch number based on existing batches
   * Fetches all batches for the account and finds the highest batch number
   * Returns the next number (incremented by 1, padded to 4 digits)
   */
  const calculateNextBatchNumber = async (accountId: string): Promise<string> => {
    try {
      setIsLoadingSuggestedBatch(true)
      
      // Fetch all batches for the account (use a high limit to get all)
      const batches = await batchService.getBatchesForAccount(accountId, 1000)
      
      if (batches.length === 0) {
        // No batches exist, start with 0001
        return '0001'
      }
      
      // Extract account digits
      const accountDigits = accountId.replace('MEGG-', '')
      const expectedPrefix = `BATCH-${accountDigits}-`
      
      // Parse batch IDs to extract batch numbers
      const batchNumbers: number[] = []
      batches.forEach(batch => {
        if (batch.id.startsWith(expectedPrefix)) {
          const batchNumberStr = batch.id.replace(expectedPrefix, '')
          const batchNumber = parseInt(batchNumberStr, 10)
          if (!isNaN(batchNumber)) {
            batchNumbers.push(batchNumber)
          }
        }
      })
      
      if (batchNumbers.length === 0) {
        // No valid batch numbers found, start with 0001
        return '0001'
      }
      
      // Find the highest batch number
      const highestBatchNumber = Math.max(...batchNumbers)
      
      // Increment and pad to 4 digits
      const nextBatchNumber = highestBatchNumber + 1
      return String(nextBatchNumber).padStart(4, '0')
      
    } catch (error) {
      console.error('Error calculating next batch number:', error)
      // On error, default to 0001
      return '0001'
    } finally {
      setIsLoadingSuggestedBatch(false)
    }
  }

  const handleBatchIdChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
    setBatchIdInput(digitsOnly)
    setBatchIdError('')
    setExistingBatch(null) // Reset existing batch when input changes
    
    // Auto-check when 4 digits are entered and account ID exists
    if (digitsOnly.length === 4 && currentAccountId) {
      const accountDigits = currentAccountId.replace('MEGG-', '')
      const batchId = `BATCH-${accountDigits}-${digitsOnly}`
      checkBatchExists(batchId)
    } else if (digitsOnly.length === 4 && !currentAccountId) {
      setBatchIdError('Account ID required to check batch')
    }
  }

  const checkBatchExists = async (batchId: string) => {
    if (!currentAccountId) {
      setBatchIdError('Account ID required to check batch')
      return null
    }
    
    try {
      setIsCheckingBatch(true)
      const foundBatch = await batchService.getBatch(batchId)
      
      if (foundBatch) {
        setExistingBatch(foundBatch)
        return foundBatch
      } else {
        setExistingBatch(null)
        return null
      }
    } catch (error) {
      console.error('Error checking batch existence:', error)
      setExistingBatch(null)
      return null
    } finally {
      setIsCheckingBatch(false)
    }
  }

  const proceedWithBatch = async () => {
    if (!currentAccountId) {
      setBatchIdError('No account ID found. Please log in first.')
      setShowCreateBatchModal(false)
      setActiveTab('account')
      return
    }
    
    if (batchIdInput.length !== 4) {
      setBatchIdError('Batch ID must be 4 digits')
      return
    }
    
    // Extract account ID digits (remove MEGG- prefix)
    const accountDigits = currentAccountId.replace('MEGG-', '')
    const batchId = `BATCH-${accountDigits}-${batchIdInput}`
    
    // Check if batch exists - fetch fresh data from database
    const existingBatchData = await batchService.getBatch(batchId)
    
    if (existingBatchData) {
      // Load existing batch with fresh stats from database
      setCurrentBatch(existingBatchData)
      setBatchStatus(existingBatchData.status || 'ready')
      // Ensure stats are properly loaded from database
      if (existingBatchData.stats) {
        setBatchStats(existingBatchData.stats)
      } else {
        // If stats don't exist, initialize with zeros
        setBatchStats({
          totalEggs: 0,
          smallEggs: 0,
          mediumEggs: 0,
          largeEggs: 0,
          goodEggs: 0,
          dirtyEggs: 0,
          crackEggs: 0
        })
      }
    } else {
      // Create new batch in Firebase
      const newBatch = await batchService.createBatch(
        batchId,
        currentAccountId,
        batchId
      )
      
      if (newBatch) {
        setCurrentBatch(newBatch)
        setBatchStatus('ready')
        setBatchStats(newBatch.stats || {
          totalEggs: 0,
          smallEggs: 0,
          mediumEggs: 0,
          largeEggs: 0,
          goodEggs: 0,
          dirtyEggs: 0,
          crackEggs: 0
        })
    } else {
        setBatchIdError('Failed to create batch. Please try again.')
        return
      }
    }
    
    setShowCreateBatchModal(false)
    setBatchIdInput('')
    setBatchIdError('')
    setExistingBatch(null)
    setSuggestedBatchNumber(null)
  }

  const startBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('processing')
      await batchService.updateBatchStatus(currentBatch.id, 'processing')
    }
  }

  const stopBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const completeBatch = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const resetBatch = () => {
    setCurrentBatch(null)
    setBatchStatus('idle')
    setBatchStats({
      totalEggs: 0,
      smallEggs: 0,
      mediumEggs: 0,
      largeEggs: 0,
      goodEggs: 0,
      dirtyEggs: 0,
      crackEggs: 0
    })
    setActiveStatsView('overview')
  }

  // Update batch stats when eggs are processed
  const updateBatchStats = async (newStats: typeof batchStats) => {
    if (!currentBatch) return
    
    try {
      // Update local state
      setBatchStats(newStats)
      
      // Update Firebase
      await batchService.updateBatchStats(currentBatch.id, newStats)
    } catch (error) {
      console.error('❌ Error updating batch stats:', error)
    }
  }

  // Add egg to batch (call this when an egg is processed)
  const addEggToBatch = async (eggData: {
    size: 'small' | 'medium' | 'large'
    quality: 'good' | 'dirty' | 'bad'
  }) => {
    if (!currentBatch) return
    
    const newStats = {
      ...batchStats,
      totalEggs: batchStats.totalEggs + 1,
      [`${eggData.size}Eggs`]: batchStats[`${eggData.size}Eggs`] + 1,
      [`${eggData.quality}Eggs`]: batchStats[`${eggData.quality}Eggs`] + 1
    }
    
    await updateBatchStats(newStats)
  }

  const toggleStatsView = (view: 'size' | 'quality') => {
    if (activeStatsView === view) {
      setActiveStatsView('overview')
    } else {
      setActiveStatsView(view)
    }
  }

  const showToaster = (type: 'success' | 'error' | 'info', message: string) => {
    setToaster({ show: true, type, message })
    setTimeout(() => {
      setToaster({ show: false, type: 'info', message: '' })
    }, 4000)
  }

  const handleRefresh = () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    showToaster('info', 'Refreshing...')
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 150)
  }

  const resetCalibrationState = (component: string) => {
    switch (component) {
      case 'UNO':
        setIsCalibratingUno(false)
        break
      case 'HX711':
        setIsCalibratingHX711(false)
        break
      case 'NEMA23':
        setIsCalibratingNema23(false)
        break
      case 'SG90':
        setIsCalibratingSG90(false)
        break
      case 'MG996R':
        setIsCalibratingMG996R(false)
        break
      default:
    }
  }

  // Calibration functions - Real hardware calibration
  const handleUnoCalibration = async () => {
    setIsCalibratingUno(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingUno(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('UNO')
      
      if (!result.success) {
        setIsCalibratingUno(false)
        showToaster('error', `UNO Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('UNO calibration error:', error)
      setIsCalibratingUno(false)
      showToaster('error', `UNO Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleHX711Calibration = async () => {
    setIsCalibratingHX711(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingHX711(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('HX711')
      
      if (!result.success) {
        setIsCalibratingHX711(false)
        showToaster('error', `HX711 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('HX711 calibration error:', error)
      setIsCalibratingHX711(false)
      showToaster('error', `HX711 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleNema23Calibration = async () => {
    setIsCalibratingNema23(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingNema23(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('NEMA23')
      
      if (!result.success) {
        setIsCalibratingNema23(false)
        showToaster('error', `NEMA23 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('NEMA23 calibration error:', error)
      setIsCalibratingNema23(false)
      showToaster('error', `NEMA23 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleSG90Calibration = async () => {
    setIsCalibratingSG90(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingSG90(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('SG90')
      
      if (!result.success) {
        setIsCalibratingSG90(false)
        showToaster('error', `SG90 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('SG90 calibration error:', error)
      setIsCalibratingSG90(false)
      showToaster('error', `SG90 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleMG996RCalibration = async () => {
    setIsCalibratingMG996R(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingMG996R(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('MG996R')
      
      if (!result.success) {
        setIsCalibratingMG996R(false)
        showToaster('error', `MG996R Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('MG996R calibration error:', error)
      setIsCalibratingMG996R(false)
      showToaster('error', `MG996R Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
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
    } else if (showCreateBatchModal) {
      const key = event.key
      if (key >= '0' && key <= '9' && batchIdInput.length < 4) {
        handleBatchIdChange(batchIdInput + key)
      } else if (key === 'Backspace' && batchIdInput.length > 0) {
        handleBatchIdChange(batchIdInput.slice(0, -1))
      } else if (key === 'Enter' && batchIdInput.length === 4) {
        proceedWithBatch()
      } else if (key === 'Escape') {
        setShowCreateBatchModal(false)
      }
    }
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
      {/* Header - Fixed height for 5" landscape display */}
      <div className={`transition-all duration-1000 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${isFullscreen ? 'h-8' : 'h-12'}`}>
        {/* Top Navigation Bar - Professional design */}
        <div className={`bg-slate-800/90 backdrop-blur-md border-b border-blue-500/30 px-3 ${isFullscreen ? 'py-1 h-8' : 'py-2 h-12'}`}>
          <div className="flex items-center justify-between">
            {/* Logo and Title - Professional */}
            <div className="flex items-center gap-3">
                      <Image
                src="/Logos/logowhite.png"
                        alt="MEGG Logo"
                width={isFullscreen ? 20 : 32}
                height={isFullscreen ? 20 : 32}
                  className="object-contain"
          />
              <div>
                <h1 className={`font-bold text-white tracking-wide ${isFullscreen ? 'text-sm' : 'text-lg'}`}>MEGG</h1>
                  </div>

      {/* Floating Stop button removed per request */}
                </div>

            {/* Minimal Status Indicators */}
            <div className={`flex items-center ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              {/* Account ID Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentAccountId ? "bg-blue-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>
                  {currentAccountId ? currentAccountId : "NO ACCOUNT"}
                </span>
              </div>
              
              {/* Network Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>NET</span>
              </div>

              {/* IoT Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${iotConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>IOT</span>
              </div>
            </div>
              </div>
            </div>

        {/* Tab Navigation - Professional design */}
        <div className={`bg-slate-700/50 backdrop-blur-sm border-b border-slate-600/50 px-3 h-16 ${isFullscreen ? 'hidden' : ''}`}>
          <div className="flex space-x-1 h-full">
            {([
              { id: 'main' as const, label: 'Main', icon: Play },
              { id: 'camera' as const, label: 'Camera', icon: Camera },
              { id: 'batch' as const, label: 'Batch', icon: Package },
              { id: 'configuration' as const, label: 'Configuration', icon: Settings },
              { id: 'calibration' as const, label: 'Calibration', icon: Target },
              { id: 'account' as const, label: 'Account', icon: User }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'main' | 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
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
      <div className={`h-[calc(100vh-5.5rem)] overflow-hidden ${isFullscreen ? 'mt-0 h-[calc(100vh-2rem)]' : 'mt-16'}`}>
        {activeTab === 'main' && (
          <MainTab 
            iotConnected={iotConnected}
            isSorting={isSorting}
            onStartSorting={handleStartSorting}
            onStartPlainSorting={handleStartPlainSorting}
            onStopSorting={handleStopSorting}
            currentBatch={currentBatch}
            recentEggs={recentEggs}
            eggHistory={eggHistory}
          />
        )}

        <CameraTab 
          isOnline={isOnline}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isHidden={activeTab !== 'camera'}
        />

        {activeTab === 'batch' && (
          <BatchTab
            currentAccountId={currentAccountId}
            currentBatch={currentBatch}
            batchStatus={batchStatus}
            batchStats={batchStats}
            activeStatsView={activeStatsView}
            onSetActiveTab={(tab: string) => setActiveTab(tab as 'main' | 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
            onShowCreateBatchModal={async () => {
              if (currentAccountId) {
                // Calculate and set suggested batch number
                const suggested = await calculateNextBatchNumber(currentAccountId)
                setSuggestedBatchNumber(suggested)
                setBatchIdInput(suggested) // Auto-fill the suggested number
              }
              setShowCreateBatchModal(true)
            }}
            onResetBatch={resetBatch}
            onToggleStatsView={toggleStatsView}
          />
        )}

        {activeTab === 'configuration' && (
          <ConfigurationTab
            eggRanges={eggRanges}
            configSource={configSource}
            isLoadingConfig={isLoadingConfig}
            showGapWarning={showGapWarning}
            rangeValidation={rangeValidation}
            isCustomized={isCustomized}
            onHandleRangeEdit={handleRangeEdit}
            onSetShowGapWarning={setShowGapWarning}
          />
        )}

               {activeTab === 'calibration' && (
        <CalibrationTab
          isCalibratingUno={isCalibratingUno}
          isCalibratingHX711={isCalibratingHX711}
          isCalibratingNema23={isCalibratingNema23}
          isCalibratingSG90={isCalibratingSG90}
          isCalibratingMG996R={isCalibratingMG996R}
          onHandleUnoCalibration={handleUnoCalibration}
          onHandleHX711Calibration={handleHX711Calibration}
          onHandleNema23Calibration={handleNema23Calibration}
          onHandleSG90Calibration={handleSG90Calibration}
          onHandleMG996RCalibration={handleMG996RCalibration}
          showToaster={showToaster}
          onResetCalibrationState={resetCalibrationState}
          iotConnected={iotConnected}
          hasAccountId={!!(currentAccountId || userData?.accountId)}
          calibrationStatus={calibrationStatus}
        />
               )}

        {activeTab === 'account' && (
          <AccountTab
            currentAccountId={currentAccountId}
            userData={userData}
            isLoadingUser={isLoadingUser}
            onHandleInputId={handleInputId}
            onClearAccountId={clearAccountId}
          />
        )}
          </div>

      {/* Modals */}
      <PinModal
        showPinModal={showPinModal}
        pinInput={pinInput}
        pinError={pinError}
        onHandlePinChange={handlePinChange}
        onHandlePinSubmit={handlePinSubmit}
        onSetShowPinModal={setShowPinModal}
        onHandleKeyPress={handleKeyPress}
      />

      <RangeModal
        showRangeModal={showRangeModal}
        editingRange={editingRange}
        minInput={minInput}
        maxInput={maxInput}
        rangeError={rangeError}
        currentInputField={currentInputField}
        isSavingRange={isSavingRange}
        onHandleRangeSubmit={handleRangeSubmit}
        onSetShowRangeModal={setShowRangeModal}
        onSetCurrentInputField={setCurrentInputField}
        onHandleMinChange={handleMinChange}
        onHandleMaxChange={handleMaxChange}
        onHandleKeyPress={handleKeyPress}
      />

      <BatchModal
        showCreateBatchModal={showCreateBatchModal}
        batchIdInput={batchIdInput}
        batchIdError={batchIdError}
        currentAccountId={currentAccountId}
        isCheckingBatch={isCheckingBatch}
        existingBatch={existingBatch}
        suggestedBatchNumber={suggestedBatchNumber}
        isLoadingSuggestedBatch={isLoadingSuggestedBatch}
        onHandleBatchIdChange={handleBatchIdChange}
        onProceedWithBatch={proceedWithBatch}
        onSetShowCreateBatchModal={setShowCreateBatchModal}
        onHandleKeyPress={handleKeyPress}
      />


      <Toaster
        toaster={toaster}
        onSetToaster={setToaster}
      />

      {/* Floating Refresh Button (FAB) */}
      <button
        onClick={handleRefresh}
        aria-label="Refresh"
        className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
      </div>
    )
  }

export default function Home() {
  return (
    <CameraProvider>
      <HomeInner />
    </CameraProvider>
  )
}
