"use client"

import React from "react"

interface PinModalProps {
  showPinModal: boolean
  pinInput: string
  pinError: string
  onHandlePinChange: (value: string) => void
  onHandlePinSubmit: () => void
  onSetShowPinModal: (show: boolean) => void
  onHandleKeyPress: (event: React.KeyboardEvent) => void
}

export default function PinModal({
  showPinModal,
  pinInput,
  pinError,
  onHandlePinChange,
  onHandlePinSubmit,
  onSetShowPinModal,
  onHandleKeyPress
}: PinModalProps) {
  if (!showPinModal) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onKeyDown={onHandleKeyPress}
      tabIndex={-1}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 max-w-3xl w-full mx-4 border border-white/20 shadow-2xl h-[450px]">
        {/* Account ID Display and Number Pad */}
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Left Column - PIN Display and Action Buttons */}
          <div className="flex flex-col justify-center items-center space-y-4">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-2xl px-4 py-8 shadow-2xl">
              <div className="text-center">
                <div className="text-white text-3xl font-mono mb-4">MEGG-</div>
                <div className="flex justify-center space-x-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div
                      key={index}
                      className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-mono font-bold transition-all duration-300 ${
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
            <div className="flex gap-3">
              <button
                onClick={() => onSetShowPinModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
              <button
                onClick={onHandlePinSubmit}
                disabled={pinInput.length !== 6}
                className={`px-6 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
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
                    onClick={() => onHandlePinChange(pinInput + num.toString())}
                    disabled={pinInput.length >= 6}
                    className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onHandlePinChange(pinInput + '0')}
                  disabled={pinInput.length >= 6}
                  className="w-30 h-20 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  0
                </button>
                <button
                  onClick={() => onHandlePinChange(pinInput.slice(0, -1))}
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
  )
}
