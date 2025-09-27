"use client"

import React, { useState } from "react"
import { XCircle, Package } from "lucide-react"

interface BatchTabProps {
  currentAccountId: string | null
  currentBatch: any
  batchStatus: 'idle' | 'ready' | 'processing' | 'completed'
  batchStats: {
    totalEggs: number
    smallEggs: number
    mediumEggs: number
    largeEggs: number
    goodEggs: number
    dirtyEggs: number
    badEggs: number
  }
  activeStatsView: 'overview' | 'size' | 'quality'
  onSetActiveTab: (tab: string) => void
  onShowCreateBatchModal: () => void
  onResetBatch: () => void
  onToggleStatsView: (view: 'size' | 'quality') => void
}

export default function BatchTab({
  currentAccountId,
  currentBatch,
  batchStatus,
  batchStats,
  activeStatsView,
  onSetActiveTab,
  onShowCreateBatchModal,
  onResetBatch,
  onToggleStatsView
}: BatchTabProps) {
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
        <div className="space-y-6">
          {/* Batch Setup Section */}
          {!currentBatch && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  if (currentAccountId) {
                    onShowCreateBatchModal()
                  } else {
                    onSetActiveTab('account')
                  }
                }}
                className={`group w-full border rounded-lg p-4 transition-all duration-200 flex flex-col items-center justify-center text-center ${
                  currentAccountId 
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30' 
                    : 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30'
                }`}
              >
                <span className="text-slate-400 text-sm mb-1">
                  {currentAccountId ? 'Create New Batch' : 'Account Required'}
              </span>
                <p className="text-white font-mono font-bold text-xl">Enter Batch</p>
                <span className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  currentAccountId ? 'text-blue-300' : 'text-red-300'
                }`}>
                  {currentAccountId 
                    ? 'Click to create or enter existing batch' 
                    : 'Click to go to Account tab first'
                  }
              </span>
              </button>
            </div>
          )}

          {/* Current Batch Status */}
          {currentBatch && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Current Batch</h3>
              <div className="flex gap-3">
                <button
                  onClick={onShowCreateBatchModal}
                  className="group flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-4 transition-all duration-200 flex flex-col items-start justify-center text-left"
                >
                  <span className="text-slate-400 text-sm mb-1">Batch ID:</span>
                  <p className="text-white font-mono font-bold text-xl">{currentBatch.id}</p>
                  <span className="text-blue-300 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to change batch</span>
                </button>
                <button
                  onClick={onResetBatch}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <XCircle className="h-5 w-5" />
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Batch Statistics */}
          {currentBatch && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Batch Statistics</h3>
              
              {/* Overview View - Total + Buttons */}
              {activeStatsView === 'overview' && (
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Display */}
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{batchStats.totalEggs}</div>
                    <div className="text-slate-400 text-xs">Total</div>
                  </div>
            
                  {/* Size Button */}
                  <button
                    onClick={() => onToggleStatsView('size')}
                    className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-4 transition-all duration-200 flex flex-col items-center justify-center text-center"
                  >
                    <div className="text-lg font-bold text-blue-400 mb-1">Size</div>
                    <div className="text-xs text-slate-400">Small • Medium • Large</div>
                  </button>
                  
                  {/* Quality Button */}
                  <button
                    onClick={() => onToggleStatsView('quality')}
                    className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg p-4 transition-all duration-200 flex flex-col items-center justify-center text-center"
                  >
                    <div className="text-lg font-bold text-green-400 mb-1">Quality</div>
                    <div className="text-xs text-slate-400">Good • Dirty • Bad</div>
                  </button>
                </div>
              )}

              {/* Size View */}
              {activeStatsView === 'size' && (
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => onToggleStatsView('size')}
                    className="bg-slate-700/30 hover:bg-slate-600/30 border border-slate-600/30 rounded-lg p-4 text-center transition-all duration-200 flex flex-col items-center justify-center"
                  >
                    <div className="text-slate-400 text-sm">← Back</div>
                    <div className="text-xs text-slate-500">to Overview</div>
                  </button>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{batchStats.smallEggs}</div>
                    <div className="text-sm text-slate-400">Small</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">{batchStats.mediumEggs}</div>
                    <div className="text-sm text-slate-400">Medium</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400 mb-1">{batchStats.largeEggs}</div>
                    <div className="text-sm text-slate-400">Large</div>
                  </div>
                </div>
              )}

              {/* Quality View */}
              {activeStatsView === 'quality' && (
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => onToggleStatsView('quality')}
                    className="bg-slate-700/30 hover:bg-slate-600/30 border border-slate-600/30 rounded-lg p-4 text-center transition-all duration-200 flex flex-col items-center justify-center"
                  >
                    <div className="text-slate-400 text-sm">← Back</div>
                    <div className="text-xs text-slate-500">to Overview</div>
                  </button>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">{batchStats.goodEggs}</div>
                    <div className="text-sm text-slate-400">Good</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">{batchStats.dirtyEggs}</div>
                    <div className="text-sm text-slate-400">Dirty</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-4 text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">{batchStats.badEggs}</div>
                    <div className="text-sm text-slate-400">Bad</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
