"use client"

import React, { useState, useEffect } from "react"
import { Play, Square, RotateCcw, Settings, Zap, AlertCircle } from "lucide-react"

interface MotorStatus {
  isActive: boolean
  conveyorMoving: boolean
  currentPosition: number
  currentWeight: number
  mg996rPosition: number
  sg90Position: number
}

interface MotorControlProps {
  onMotorStart: () => void
  onMotorStop: () => void
  onMotorMove: () => void
  onMotorSort: (position: number) => void
  onMotorCalibrate: () => void
  onMotorHome: () => void
}

export default function MotorControl({
  onMotorStart,
  onMotorStop,
  onMotorMove,
  onMotorSort,
  onMotorCalibrate,
  onMotorHome
}: MotorControlProps) {
  const [motorStatus, setMotorStatus] = useState<MotorStatus>({
    isActive: false,
    conveyorMoving: false,
    currentPosition: 0,
    currentWeight: 0.0,
    mg996rPosition: 0,
    sg90Position: 0
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simulate motor status updates (replace with real WebSocket/API calls)
  useEffect(() => {
    const interval = setInterval(() => {
      // This would be replaced with real status updates from Arduino
      setMotorStatus(prev => ({
        ...prev,
        currentWeight: Math.random() * 100 // Simulated weight
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onMotorStart()
      setMotorStatus(prev => ({ ...prev, isActive: true }))
    } catch (err) {
      setError("Failed to start motor system")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onMotorStop()
      setMotorStatus(prev => ({ ...prev, isActive: false, conveyorMoving: false }))
    } catch (err) {
      setError("Failed to stop motor system")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMove = async () => {
    if (!motorStatus.isActive) return
    
    setIsLoading(true)
    setError(null)
    try {
      await onMotorMove()
      setMotorStatus(prev => ({ ...prev, conveyorMoving: true }))
    } catch (err) {
      setError("Failed to move conveyor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = async (position: number) => {
    if (!motorStatus.isActive) return
    
    setIsLoading(true)
    setError(null)
    try {
      await onMotorSort(position)
      setMotorStatus(prev => ({ ...prev, mg996rPosition: position }))
    } catch (err) {
      setError("Failed to sort egg")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalibrate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onMotorCalibrate()
    } catch (err) {
      setError("Failed to calibrate load cell")
    } finally {
      setIsLoading(false)
    }
  }

  const handleHome = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onMotorHome()
      setMotorStatus(prev => ({ 
        ...prev, 
        currentPosition: 0,
        mg996rPosition: 0,
        sg90Position: 0
      }))
    } catch (err) {
      setError("Failed to home motors")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-400" />
          Motor Control System
        </h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          motorStatus.isActive 
            ? "bg-green-500/20 text-green-300" 
            : "bg-gray-500/20 text-gray-300"
        }`}>
          {motorStatus.isActive ? "ACTIVE" : "INACTIVE"}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}

      {/* Main Control Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleStart}
          disabled={motorStatus.isActive || isLoading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            motorStatus.isActive || isLoading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
          }`}
        >
          <Play className="h-5 w-5" />
          {isLoading ? "Starting..." : "Start System"}
        </button>

        <button
          onClick={handleStop}
          disabled={!motorStatus.isActive || isLoading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            !motorStatus.isActive || isLoading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg"
          }`}
        >
          <Square className="h-5 w-5" />
          {isLoading ? "Stopping..." : "Stop System"}
        </button>
      </div>

      {/* Motor Controls */}
      {motorStatus.isActive && (
        <div className="space-y-4">
          {/* Conveyor Control */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="font-semibold text-white mb-3">Conveyor Control</h3>
            <div className="flex gap-2">
              <button
                onClick={handleMove}
                disabled={motorStatus.conveyorMoving || isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                {motorStatus.conveyorMoving ? "Moving..." : "Move Conveyor"}
              </button>
              <button
                onClick={handleHome}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sorting Control */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="font-semibold text-white mb-3">Egg Sorting</h3>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((position) => (
                <button
                  key={position}
                  onClick={() => handleSort(position)}
                  disabled={isLoading}
                  className={`px-3 py-2 rounded-lg font-medium transition-all ${
                    motorStatus.mg996rPosition === position
                      ? "bg-blue-600 text-white"
                      : "bg-white hover:bg-blue-50 text-gray-700 border border-gray-300"
                  }`}
                >
                  Pos {position}
                </button>
              ))}
            </div>
          </div>

          {/* Calibration */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="font-semibold text-white mb-3">Calibration</h3>
            <button
              onClick={handleCalibrate}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Calibrate Load Cell
            </button>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="mt-6 bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="font-semibold text-white mb-3">System Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/70">Current Position:</span>
            <span className="ml-2 font-medium text-white">{motorStatus.currentPosition}</span>
          </div>
          <div>
            <span className="text-white/70">Current Weight:</span>
            <span className="ml-2 font-medium text-white">{motorStatus.currentWeight.toFixed(1)}g</span>
          </div>
          <div>
            <span className="text-white/70">MG996R Position:</span>
            <span className="ml-2 font-medium text-white">{motorStatus.mg996rPosition}°</span>
          </div>
          <div>
            <span className="text-white/70">SG90 Position:</span>
            <span className="ml-2 font-medium text-white">{motorStatus.sg90Position}°</span>
          </div>
        </div>
      </div>
    </div>
  )
}
