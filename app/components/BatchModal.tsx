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
  suggestedBatchNumber: string | null
  isLoadingSuggestedBatch: boolean
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
  suggestedBatchNumber,
  isLoadingSuggestedBatch,
  onHandleBatchIdChange,
  onProceedWithBatch,
  onSetShowCreateBatchModal,
  onHandleKeyPress
}: BatchModalProps) {
  
  const [showManualEntry, setShowManualEntry] = React.useState(false)
  
  // Reset manual entry view when modal closes
  React.useEffect(() => {
    if (!showCreateBatchModal) {
      setShowManualEntry(false)
    }
  }, [showCreateBatchModal])
  
  if (!showCreateBatchModal) return null

  // Show manual entry view if user chose to enter manually
  if (showManualEntry) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
        onKeyDown={onHandleKeyPress}
        tabIndex={-1}
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 max-w-5xl w-full mx-4 border border-white/20 shadow-2xl">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Batch ID Display */}
            <div className="flex flex-col justify-center items-center space-y-4">
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-xl px-8 py-10 shadow-2xl w-full">
                <div className="text-center">
                  <div className="text-white text-lg font-mono mb-3">
                    BATCH-{currentAccountId ? currentAccountId.replace('MEGG-', '') : 'XXXXXX'}-
                  </div>
                  <div className="flex justify-center space-x-3">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        className={`w-14 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all duration-300 ${
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
              
              {/* Batch Status Notification - Minimal */}
              {batchIdInput.length === 4 && (
                <div className="w-full">
                  {isCheckingBatch ? (
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400 mx-auto" />
                    </div>
                  ) : existingBatch ? (
                    <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-200 font-medium text-sm">Existing Batch</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="h-4 w-4 text-green-400" />
                        <span className="text-green-200 font-medium text-sm">New Batch</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    onSetShowCreateBatchModal(false)
                    onHandleBatchIdChange('')
                    setShowManualEntry(false)
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-5 rounded-xl text-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={onProceedWithBatch}
                  disabled={batchIdInput.length !== 4 || isCheckingBatch}
                  className={`flex-1 px-6 py-5 rounded-xl text-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl ${
                    batchIdInput.length === 4 && !isCheckingBatch
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-500 cursor-not-allowed text-gray-300'
                  }`}
                >
                  {isCheckingBatch ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    '✓ Enter'
                  )}
                </button>
              </div>
              
              {batchIdError && (
                <p className="text-red-400 text-center font-medium text-sm">{batchIdError}</p>
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
                      className="w-full h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-3xl font-bold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onHandleBatchIdChange(batchIdInput + '0')}
                    disabled={batchIdInput.length >= 4}
                    className="w-full h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-3xl font-bold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    0
                  </button>
                  <button
                    onClick={() => onHandleBatchIdChange(batchIdInput.slice(0, -1))}
                    disabled={batchIdInput.length === 0}
                    className="w-full h-20 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                  >
                    ⌫
                  </button>
                  <div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show suggested batch view (first view)
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onKeyDown={onHandleKeyPress}
      tabIndex={-1}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-6 max-w-xl w-full mx-4 border border-white/20 shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-5">
          {/* Loading State */}
          {isLoadingSuggestedBatch && (
            <div className="w-full bg-blue-600/20 border border-blue-500/30 rounded-xl p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
            </div>
          )}

          {/* Suggested Batch Display */}
          {!isLoadingSuggestedBatch && suggestedBatchNumber && (
            <>
              <div className="w-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-500/50 rounded-xl p-6 text-center">
                <Package className="h-6 w-6 text-blue-300 mx-auto mb-3" />
                <p className="text-white text-2xl font-mono font-bold">
                  BATCH-{currentAccountId ? currentAccountId.replace('MEGG-', '') : 'XXXXXX'}-{suggestedBatchNumber}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-3">
                <button
                  onClick={() => {
                    onHandleBatchIdChange(suggestedBatchNumber)
                    setTimeout(() => {
                      onProceedWithBatch()
                    }, 150)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 rounded-xl text-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => {
                    setShowManualEntry(true)
                    onHandleBatchIdChange('')
                  }}
                  className="w-full bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200"
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => {
                    onSetShowCreateBatchModal(false)
                    onHandleBatchIdChange('')
                  }}
                  className="w-full bg-red-600/50 hover:bg-red-600/70 text-red-300 px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* No suggestion available (fallback) */}
          {!isLoadingSuggestedBatch && !suggestedBatchNumber && (
            <>
              <div className="w-full bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-5 text-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mx-auto" />
              </div>
              <button
                onClick={() => {
                  setShowManualEntry(true)
                  onHandleBatchIdChange('')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 rounded-xl text-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Manual Entry
              </button>
              <button
                onClick={() => {
                  onSetShowCreateBatchModal(false)
                  onHandleBatchIdChange('')
                }}
                className="w-full bg-red-600/50 hover:bg-red-600/70 text-red-300 px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </>
          )}
          
          {batchIdError && (
            <p className="text-red-400 text-center font-medium text-sm">{batchIdError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
