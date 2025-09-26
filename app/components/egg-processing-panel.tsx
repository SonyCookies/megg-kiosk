"use client"

import React, { useState } from "react"
import { 
  Play, 
  Square, 
  Pause, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  BarChart3
} from "lucide-react"

interface ProcessingStats {
  totalProcessed: number
  goodEggs: number
  badEggs: number
  smallEggs: number
  mediumEggs: number
  largeEggs: number
}

interface EggProcessingPanelProps {
  isProcessing: boolean
  onProcessEgg: () => void
  stats: ProcessingStats
}

export default function EggProcessingPanel({ 
  isProcessing, 
  onProcessEgg, 
  stats 
}: EggProcessingPanelProps) {
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("Ready")

  const handleProcessEgg = () => {
    if (isProcessing) return
    
    setCurrentStep("Processing...")
    onProcessEgg()
  }

  const toggleAutoMode = () => {
    setIsAutoMode(!isAutoMode)
  }

  const resetStats = () => {
    // This would typically reset stats in parent component
    console.log("Reset stats")
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Target className="h-5 w-5" />
          Egg Processing
        </h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isAutoMode 
            ? "bg-green-500/20 text-green-300" 
            : "bg-gray-500/20 text-gray-300"
        }`}>
          {isAutoMode ? "AUTO" : "MANUAL"}
        </div>
      </div>

      {/* Processing Status */}
      <div className="mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Current Status:</span>
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              <span className="text-white font-medium">{currentStep}</span>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isProcessing ? "bg-blue-500" : "bg-green-500"
              }`}
              style={{ width: isProcessing ? "60%" : "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Processing Controls */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleProcessEgg}
          disabled={isProcessing}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isProcessing
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Process Egg
            </>
          )}
        </button>

        <button
          onClick={toggleAutoMode}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isAutoMode
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-600 hover:bg-gray-700 text-white"
          }`}
        >
          {isAutoMode ? (
            <>
              <Pause className="h-4 w-4" />
              Stop Auto Mode
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Auto Mode
            </>
          )}
        </button>
      </div>

      {/* Processing Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </h4>
          <button
            onClick={resetStats}
            className="text-white/70 hover:text-white text-sm"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="text-white/70 text-sm">Total Processed</div>
            <div className="text-2xl font-bold text-white">{stats.totalProcessed}</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="text-white/70 text-sm">Good Eggs</div>
            <div className="text-2xl font-bold text-green-400">{stats.goodEggs}</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="text-white/70 text-sm">Bad Eggs</div>
            <div className="text-2xl font-bold text-red-400">{stats.badEggs}</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="text-white/70 text-sm">Success Rate</div>
            <div className="text-2xl font-bold text-blue-400">
              {stats.totalProcessed > 0 
                ? Math.round((stats.goodEggs / stats.totalProcessed) * 100)
                : 0}%
            </div>
          </div>
        </div>

        {/* Size Distribution */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-white/70 text-sm mb-2">Size Distribution</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Small:</span>
              <span className="text-yellow-400 font-medium">{stats.smallEggs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Medium:</span>
              <span className="text-green-400 font-medium">{stats.mediumEggs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Large:</span>
              <span className="text-blue-400 font-medium">{stats.largeEggs}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
