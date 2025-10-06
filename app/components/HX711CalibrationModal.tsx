"use client"

import React, { useEffect, useState } from "react"
import { Scale, Loader2, AlertCircle } from "lucide-react"
import iotService from "../services/iotService"

interface HX711CalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  onCalibrationComplete: (success: boolean, message: string) => void
}

export default function HX711CalibrationModal({
  isOpen,
  onClose,
  onCalibrationComplete
}: HX711CalibrationModalProps) {
  const [weightInput, setWeightInput] = useState("23")
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [isLoadingWeight, setIsLoadingWeight] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState<'input' | 'calibrating' | 'complete'>('input')
  const [calibrationMessage, setCalibrationMessage] = useState<string>("")
  // We keep last step only; no terminal-like list
  const [lastProgressMsg, setLastProgressMsg] = useState<string>("")
  const [receivedDoneMsg, setReceivedDoneMsg] = useState<boolean>(false)

  // Poll weight continuously while modal is open
  useEffect(() => {
    if (!isOpen) {
      setCurrentWeight(null)
      setWeightError(null)
      setWeightInput("23")
      setCalibrationStep('input')
      setCalibrationMessage("")
      setIsInitialLoad(true)
      setLastProgressMsg("")
      setReceivedDoneMsg(false)
      return
    }

    const pollWeight = async () => {
      try {
        // Only show loading on initial load
        if (isInitialLoad) {
          setIsLoadingWeight(true)
        }
        
        const result = await iotService.getWeight()
        
        if (result.success && result.weight !== undefined) {
          setCurrentWeight(result.weight)
          setWeightError(null)
          setIsInitialLoad(false)
        } else {
          // Only set error if we don't have a previous weight
          if (currentWeight === null) {
            setWeightError(result.error || 'Failed to read weight')
          }
        }
      } catch (error) {
        // Only set error if we don't have a previous weight
        if (currentWeight === null) {
          setWeightError('Connection error')
        }
      } finally {
        setIsLoadingWeight(false)
      }
    }

    // Initial poll
    pollWeight()

    // Set up interval for continuous polling (every 1 second for calibration)
    const interval = setInterval(pollWeight, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  const handleNumberClick = (num: string) => {
    if (weightInput.length >= 6) return
    
    // Handle decimal point
    if (num === "." && weightInput.includes(".")) return
    
    setWeightInput(weightInput + num)
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

    setIsCalibrating(true)
    setCalibrationStep('calibrating')
    setCalibrationMessage("Starting calibration...")
    setLastProgressMsg("")
    setReceivedDoneMsg(false)

    // Subscribe to live calibration progress
    const onProgress = (data: any) => {
      if (data?.component !== 'HX711' || typeof data.message !== 'string') return
      const line: string = data.message.trim()

      // Prefer JSON messages from Arduino and filter only step events
      if (line.startsWith('{')) {
        try {
          const obj = JSON.parse(line)
          if (obj?.hx711 === 'step1' || obj?.hx711 === 'step2' || obj?.hx711 === 'done') {
            const msg = String(obj.message || '')
            // Update the main status text (replaces the loading text)
            if (msg && msg !== lastProgressMsg) {
              setCalibrationMessage(msg)
              setLastProgressMsg(msg)
            }
            if (obj?.hx711 === 'done') {
              setReceivedDoneMsg(true)
            }
          }
          return
        } catch (_) {
          // fall back to raw line below
        }
      }

      // Fallback: show only human step prompts if present
      if (line.includes('Step 1') || line.includes('Step 2')) {
        if (line !== lastProgressMsg) {
          setCalibrationMessage(line)
          setLastProgressMsg(line)
        }
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
        setTimeout(() => {
          onCalibrationComplete(true, `HX711 calibrated with ${weight}g`)
          onClose()
        }, 2000)
      } else {
        setCalibrationStep('input')
        setCalibrationMessage("")
        setWeightError(result.error || "Calibration failed")
        onCalibrationComplete(false, result.error || "Calibration failed")
      }
    } catch (error) {
      setCalibrationStep('input')
      setCalibrationMessage("")
      setWeightError("Failed to communicate with IoT backend")
      onCalibrationComplete(false, "Communication error")
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

            {/* Live Weight Display */}
            <div className="bg-slate-700/50 border-2 border-blue-500/30 rounded-xl p-4 shadow-lg flex-1">
              <div className="text-center">
                <div className="text-slate-300 text-sm mb-2 flex items-center justify-center gap-2">
                  <Scale className="h-4 w-4 text-blue-400" />
                  Live Weight Reading
                </div>
                <div className="bg-slate-900/50 rounded-lg px-4 py-6 border border-slate-600/50">
                  {currentWeight !== null ? (
                    <div className="text-4xl font-mono font-bold text-blue-400">
                      {currentWeight.toFixed(2)}<span className="text-slate-500 text-xl ml-1">g</span>
                    </div>
                  ) : isLoadingWeight ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <span className="text-slate-400 text-lg">Reading...</span>
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
            </div>

            {/* Calibration Status */}
            {calibrationMessage && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-300 text-sm">
                  {isCalibrating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{calibrationMessage}</span>
                </div>
              </div>
            )}

            {/* Suppress terminal-like list; only show single status above */}

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
    </div>
  )
}
