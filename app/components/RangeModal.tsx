"use client"

import React from "react"
import { Activity, XCircle, Loader2 } from "lucide-react"

interface RangeModalProps {
  showRangeModal: boolean
  editingRange: 'small' | 'medium' | 'large' | null
  minInput: string
  maxInput: string
  rangeError: string
  currentInputField: 'min' | 'max'
  isSavingRange: boolean
  onHandleRangeSubmit: () => void
  onSetShowRangeModal: (show: boolean) => void
  onSetCurrentInputField: (field: 'min' | 'max') => void
  onHandleMinChange: (value: string) => void
  onHandleMaxChange: (value: string) => void
  onHandleKeyPress: (event: React.KeyboardEvent) => void
}

export default function RangeModal({
  showRangeModal,
  editingRange,
  minInput,
  maxInput,
  rangeError,
  currentInputField,
  isSavingRange,
  onHandleRangeSubmit,
  onSetShowRangeModal,
  onSetCurrentInputField,
  onHandleMinChange,
  onHandleMaxChange,
  onHandleKeyPress
}: RangeModalProps) {
  if (!showRangeModal || !editingRange) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onKeyDown={onHandleKeyPress}
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
                     onClick={() => onSetCurrentInputField('min')}
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
                     onClick={() => onSetCurrentInputField('max')}
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
                   onClick={() => onSetShowRangeModal(false)}
                   className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                 >
                   <XCircle className="h-5 w-5" />
                   Cancel
                 </button>
                 <button
                   onClick={onHandleRangeSubmit}
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
                         onHandleMinChange(minInput + num.toString())
                       } else {
                         onHandleMaxChange(maxInput + num.toString())
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
                      onHandleMinChange(minInput + '0')
                    } else {
                      onHandleMaxChange(maxInput + '0')
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
                      onHandleMinChange(minInput + '.')
                    } else {
                      onHandleMaxChange(maxInput + '.')
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
                      onHandleMinChange(minInput.slice(0, -1))
                    } else if (currentInputField === 'max' && maxInput.length > 0) {
                      onHandleMaxChange(maxInput.slice(0, -1))
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
  )
}
