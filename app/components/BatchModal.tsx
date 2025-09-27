"use client"

import React from "react"
import { Package, AlertCircle, Loader2 } from "lucide-react"

interface BatchModalProps {
  showCreateBatchModal: boolean
  batchIdInput: string
  batchIdError: string
  currentAccountId: string | null
  isCheckingBatch: boolean
  existingBatch: any
  onHandleBatchIdChange: (value: string) => void
  onProceedWithBatch: () => void
  onSetShowCreateBatchModal: (show: boolean) => void
  onHandleKeyPress: (event: React.KeyboardEvent) => void
}

export default function BatchModal({
  showCreateBatchModal,
  batchIdInput,
  batchIdError,
  currentAccountId,
  isCheckingBatch,
  existingBatch,
  onHandleBatchIdChange,
  onProceedWithBatch,
  onSetShowCreateBatchModal,
  onHandleKeyPress
}: BatchModalProps) {
  if (!showCreateBatchModal) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onKeyDown={onHandleKeyPress}
      tabIndex={-1}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 max-w-5xl w-full mx-4 border border-white/20 shadow-2xl h-[450px]">
        {/* Batch ID Display and Number Pad */}
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Left Column - Batch ID Display and Action Buttons */}
          <div className="flex flex-col justify-center items-center space-y-6">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-2xl px-8 py-12 shadow-2xl">
              <div className="text-center">
                <div className="text-white text-2xl font-mono mb-2">
                  B-{currentAccountId ? currentAccountId.replace('MEGG-', '') : 'XXXXXX'}-
                </div>
                <div className="flex justify-center space-x-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all duration-300 ${
                        index < batchIdInput.length
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                          : 'bg-slate-700/50 border-slate-500/50 text-slate-400'
                      }`}
                    >
                      {index < batchIdInput.length ? batchIdInput[index] : '●'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Batch Status Notification */}
            {batchIdInput.length === 4 && (
              <div className="w-full">
                {isCheckingBatch ? (
                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-blue-200 text-sm">Checking batch...</span>
                    </div>
                  </div>
                ) : existingBatch ? (
                  <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-200 text-sm font-medium">Existing Batch Found</span>
                    </div>
                    <p className="text-yellow-300 text-xs">
                      You are about to continue with an existing batch. Data will be added to this batch.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-green-400" />
                      <span className="text-green-200 text-sm font-medium">New Batch</span>
                    </div>
                    <p className="text-green-300 text-xs">
                      This will create a new batch for processing eggs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-6">
              <button
                onClick={() => onSetShowCreateBatchModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-xl text-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
              <button
                onClick={onProceedWithBatch}
                disabled={batchIdInput.length !== 4 || isCheckingBatch}
                className={`px-10 py-5 rounded-xl text-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                  batchIdInput.length === 4 && !isCheckingBatch
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-500 cursor-not-allowed text-gray-300'
                }`}
              >
                {isCheckingBatch ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  '✓ Enter'
                )}
              </button>
            </div>
            
            {batchIdError && (
              <p className="text-red-400 text-sm text-center">{batchIdError}</p>
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
                    onClick={() => onHandleBatchIdChange(batchIdInput + num.toString())}
                    disabled={batchIdInput.length >= 4}
                    className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onHandleBatchIdChange(batchIdInput + '0')}
                  disabled={batchIdInput.length >= 4}
                  className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  0
                </button>
                <button
                  onClick={() => onHandleBatchIdChange(batchIdInput.slice(0, -1))}
                  disabled={batchIdInput.length === 0}
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
  )
}
