"use client"

import React, { useEffect, useState } from "react"
import { Scale, Loader2, AlertCircle } from "lucide-react"
import iotService from "../services/iotService"
import { createKioskNotification } from "../services/notificationService"

interface HX711CalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  onCalibrationComplete: (success: boolean, message: string) => void
  accountId?: string | null
}

export default function HX711CalibrationModal({
  isOpen,
  onClose,
  onCalibrationComplete,
  accountId
}: HX711CalibrationModalProps) {
  const [weightInput, setWeightInput] = useState("65") // default to common 65g test weight
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [isLoadingWeight, setIsLoadingWeight] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState<'input' | 'calibrating' | 'complete'>('input')
  const [calibrationMessage, setCalibrationMessage] = useState<string>("")
  // Track all progress messages for display in the modal
  const [progressLog, setProgressLog] = useState<Array<{ text: string; type?: 'info' | 'warning' | 'done' }>>([])
  const [lastProgressMsg, setLastProgressMsg] = useState<string>("")
  const [receivedDoneMsg, setReceivedDoneMsg] = useState<boolean>(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [verifiedWeight, setVerifiedWeight] = useState<number | null>(null)

  const pushLog = (text: string, type: 'info' | 'warning' | 'done' = 'info') => {
    setProgressLog(prev => [...prev, { text, type }].slice(-12))
  }

  // On open: reset state and prefill weight; no auto-polling
  useEffect(() => {
    if (!isOpen) {
      setCurrentWeight(null)
      setWeightError(null)
      setCalibrationStep('input')
      setCalibrationMessage("")
      setLastProgressMsg("")
      setReceivedDoneMsg(false)
      setProgressLog([])
      setShowLogModal(false)
      setVerifiedWeight(null)
      return
    }

    try {
      const saved = localStorage.getItem('hx711_last_weight')
      if (saved && !isNaN(parseFloat(saved))) {
        setWeightInput(saved)
      }
    } catch (_) {}
  }, [isOpen])

  const handleNumberClick = (num: string) => {
    if (weightInput.length >= 6) return
    
    // Handle decimal point
    if (num === "." && weightInput.includes(".")) return
    
    setWeightInput(weightInput + num)
  }

  const handleReadWeight = async () => {
    setIsLoadingWeight(true)
    setWeightError(null)
    try {
      const result = await iotService.getWeight()
      if (result.success && result.weight !== undefined) {
        setCurrentWeight(result.weight)
      } else {
        setWeightError(result.error || 'Failed to read weight')
      }
    } catch (_) {
      setWeightError('Connection error')
    } finally {
      setIsLoadingWeight(false)
    }
  }

  const handleBackspace = () => {
    setWeightInput(weightInput.slice(0, -1))
  }

  const handleClear = () => {
    setWeightInput("")
  }

  const handleProceed = async () => {
    const weight = parseFloat(weightInput)
    
    if (isNaN(weight) || weight <= 0) {
      setWeightError("Please enter a valid weight value")
      return
    }

    // Ensure WebSocket is connected before starting calibration
    if (!iotService.isConnected()) {
      try {
        await iotService.connect()
      } catch (err) {
        setWeightError("Unable to connect to IoT backend")
        onCalibrationComplete(false, "Communication error")
        return
      }
    }

    setIsCalibrating(true)
    setCalibrationStep('calibrating')
    setCalibrationMessage("Starting calibration...")
    setLastProgressMsg("")
    setReceivedDoneMsg(false)
    setProgressLog([])
    setShowLogModal(true)

    // Subscribe to live calibration progress
    const onProgress = (data: any) => {
      if (data?.component !== 'HX711' || typeof data.message !== 'string') return
      const line: string = data.message.trim()
      // Prefer JSON messages from Arduino and filter only step events
      if (line.startsWith('{')) {
        try {
          const obj = JSON.parse(line)
          const hxType = obj?.hx711
          const msg = String(obj.message || '')

          if (hxType === 'step1' || hxType === 'step2') {
            if (msg) {
              setCalibrationMessage(msg)
              setLastProgressMsg(msg)
              pushLog(msg, 'info')
            }
          } else if (hxType === 'warning') {
            const warn = msg || 'HX711 warning'
            setCalibrationMessage(warn)
            setLastProgressMsg(warn)
            pushLog(warn, 'warning')
          } else if (hxType === 'done') {
            const doneMsg = msg || 'Calibration complete'
            setCalibrationMessage(doneMsg)
            setLastProgressMsg(doneMsg)
            pushLog(doneMsg, 'done')
            setReceivedDoneMsg(true)

            // Store verified weight for SMS notification
            if (obj.verified_weight !== undefined) {
              setVerifiedWeight(obj.verified_weight)
            }

            // If detailed fields exist, append a summary line
            const offset = obj.offset !== undefined ? `offset=${obj.offset}` : null
            const scale = obj.scale !== undefined ? `scale=${obj.scale}` : null
            const verified = obj.verified_weight !== undefined ? `verified=${obj.verified_weight}g` : null
            const error = obj.error !== undefined ? `error=${obj.error}g` : null
            const summaryParts = [offset, scale, verified, error].filter(Boolean).join(' | ')
            if (summaryParts) {
              pushLog(summaryParts, 'done')
            }
          }
          return
        } catch (_) {
          // fall back to raw line below
        }
      }

      // Fallback: show only human step prompts if present
      if (line.includes('Step 1') || line.includes('Step 2')) {
        setCalibrationMessage(line)
        setLastProgressMsg(line)
        pushLog(line, 'info')
      } else if (line.toLowerCase().includes('warning')) {
        setCalibrationMessage(line)
        setLastProgressMsg(line)
        pushLog(line, 'warning')
      }
    }
    iotService.on('calibrationProgress', onProgress)

    try {
      // Send calibration command with custom weight
      const result = await iotService.calibrateHX711WithWeight(weight)
      
      if (result.success) {
        setCalibrationStep('complete')
        if (!receivedDoneMsg) {
          setCalibrationMessage(`Calibration completed successfully with ${weight}g`)
        }
        // Persist last calibrated weight
        try {
          localStorage.setItem('hx711_last_weight', String(weight))
        } catch (_) {}
        setTimeout(() => {
          if (accountId) {
            createKioskNotification(
              accountId,
              `HX711 calibrated with ${weight}g`,
              'settings_change'
            ).catch(() => {})
          }
          onCalibrationComplete(true, `HX711 calibrated with ${weight}g`)
          onClose()
          setShowLogModal(false)
        }, 2000)
      } else {
        setCalibrationStep('input')
        setCalibrationMessage("")
        setWeightError(result.error || "Calibration failed")
        if (accountId) {
          createKioskNotification(
            accountId,
            `HX711 calibration failed: ${result.error || "Unknown error"}`,
            'settings_change'
          ).catch(() => {})
        }
        onCalibrationComplete(false, result.error || "Calibration failed")
        setShowLogModal(false)
      }
    } catch (error) {
      setCalibrationStep('input')
      setCalibrationMessage("")
      setWeightError("Failed to communicate with IoT backend")
      if (accountId) {
        createKioskNotification(
          accountId,
          "HX711 calibration failed: Communication error",
          'settings_change'
        ).catch(() => {})
      }
      onCalibrationComplete(false, "Communication error")
      setShowLogModal(false)
    } finally {
      setIsCalibrating(false)
      // Unsubscribe from progress updates
      iotService.off('calibrationProgress', onProgress)
    }
  }

  const handleCancel = () => {
    if (!isCalibrating) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCalibrating) {
          onClose()
        }
      }}
    >
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl px-6 py-5 max-w-4xl w-full mx-4 border border-slate-600/50 shadow-2xl">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Weight Input and Live Display */}
          <div className="flex flex-col space-y-4">
            {/* Weight Input Display */}
            <div className="bg-slate-700/50 border-2 border-green-500/30 rounded-xl p-4 shadow-lg">
              <div className="text-center">
                <div className="text-slate-300 text-sm mb-2">Calibration Weight (grams)</div>
                <div className="bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-600/50">
                  <div className="text-3xl font-mono font-bold text-green-400">
                    {weightInput || "0"}<span className="text-slate-500 text-xl ml-1">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* On-Demand Weight Read */}
            <div className="bg-slate-700/50 border-2 border-blue-500/30 rounded-xl p-4 shadow-lg flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-300 text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-400" />
                  Current Weight (click Read)
                </div>
                <button
                  onClick={handleReadWeight}
                  disabled={isLoadingWeight}
                  className={`text-xs px-3 py-1 rounded font-semibold ${
                    isLoadingWeight
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoadingWeight ? 'Reading...' : 'Read weight'}
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-4 py-6 border border-slate-600/50 text-center">
                {currentWeight !== null ? (
                  <div className="text-4xl font-mono font-bold text-blue-400">
                    {currentWeight.toFixed(2)}<span className="text-slate-500 text-xl ml-1">g</span>
                  </div>
                ) : weightError ? (
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="text-red-400 text-sm">{weightError}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-2xl">--</span>
                )}
              </div>
            </div>

            {/* Calibration Status (current) */}
            {calibrationMessage && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-300 text-sm">
                  {isCalibrating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{calibrationMessage}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isCalibrating}
                className={`flex-1 px-4 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                  isCalibrating
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-xl'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                disabled={!weightInput || parseFloat(weightInput) <= 0 || isCalibrating}
                className={`flex-1 px-4 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                  !weightInput || parseFloat(weightInput) <= 0 || isCalibrating
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl'
                }`}
              >
                {isCalibrating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Calibrating...
                  </>
                ) : (
                  <>
                    ✓ Proceed
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Number Pad */}
          <div className="flex flex-col justify-center">
            <div className="space-y-3">
              {/* Number Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    disabled={isCalibrating}
                    className="h-16 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              {/* Bottom Row */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleNumberClick(".")}
                  disabled={isCalibrating || weightInput.includes(".")}
                  className="h-16 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  .
                </button>
                <button
                  onClick={() => handleNumberClick("0")}
                  disabled={isCalibrating}
                  className="h-16 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={isCalibrating || weightInput.length === 0}
                  className="h-16 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  ⌫
                </button>
              </div>

              {/* Clear Button */}
              <button
                onClick={handleClear}
                disabled={isCalibrating || weightInput.length === 0}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60">
          <div className="bg-slate-900/95 border border-slate-600/70 rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm">HX711 Calibration Progress</h3>
              <button
                onClick={() => { if (!isCalibrating) setShowLogModal(false) }}
                disabled={isCalibrating}
                className={`text-xs px-3 py-1 rounded ${
                  isCalibrating ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-700/70 text-white hover:bg-slate-600'
                }`}
              >
                Close
              </button>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 max-h-72 overflow-y-auto space-y-1">
              {progressLog.length === 0 && (
                <div className="text-xs text-slate-400">Waiting for calibration messages...</div>
              )}
              {progressLog.map((entry, idx) => (
                <div
                  key={idx}
                  className={`text-xs font-mono ${
                    entry.type === 'warning'
                      ? 'text-yellow-300'
                      : entry.type === 'done'
                      ? 'text-green-300'
                      : 'text-slate-200'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
