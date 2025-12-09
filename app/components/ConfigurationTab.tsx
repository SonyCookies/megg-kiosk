"use client"

import React from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { EggSizeRanges, RangeValidation } from "../utils/configurationService"

interface ConfigurationTabProps {
  eggRanges: EggSizeRanges
  configSource: 'user' | 'global' | 'local'
  isLoadingConfig: boolean
  showGapWarning: boolean
  rangeValidation: RangeValidation | null
  isCustomized: boolean
  onHandleRangeEdit: (rangeType: 'small' | 'medium' | 'large') => void
  onSetShowGapWarning: (show: boolean) => void
}

export default function ConfigurationTab({
  eggRanges,
  configSource,
  isLoadingConfig,
  showGapWarning,
  rangeValidation,
  isCustomized,
  onHandleRangeEdit,
  onSetShowGapWarning
}: ConfigurationTabProps) {
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
        <div className="space-y-6">
          {/* Egg Size Range Configuration - Minimal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Egg Size Ranges (grams)</h3>
              <div className="flex items-center gap-2">
                {isLoadingConfig && (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                )}
                <div className={`text-xs px-2 py-1 rounded ${
                  configSource === 'user' ? 'bg-green-600 text-white' :
                  configSource === 'global' ? 'bg-blue-600 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {configSource === 'user' ? 'Custom' : 
                   configSource === 'global' ? 'Default' : 'Local'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Small Eggs */}
              <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">S</span>
                  </div>
                  <div>
                    <span className="text-slate-300 text-sm font-medium">Small</span>
                    <p className="text-slate-400 text-xs">{eggRanges.small.min.toFixed(2)}-{eggRanges.small.max.toFixed(2)}g</p>
                  </div>
                </div>
                <button
                  onClick={() => onHandleRangeEdit('small')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                >
                  Edit
                </button>
              </div>

              {/* Medium Eggs */}
              <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">M</span>
                  </div>
                  <div>
                    <span className="text-slate-300 text-sm font-medium">Medium</span>
                    <p className="text-slate-400 text-xs">{eggRanges.medium.min.toFixed(2)}-{eggRanges.medium.max.toFixed(2)}g</p>
                  </div>
                </div>
                <button
                  onClick={() => onHandleRangeEdit('medium')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                >
                  Edit
                </button>
              </div>

              {/* Large Eggs */}
              <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">L</span>
                  </div>
                  <div>
                    <span className="text-slate-300 text-sm font-medium">Large</span>
                    <p className="text-slate-400 text-xs">{eggRanges.large.min.toFixed(2)}-{eggRanges.large.max.toFixed(2)}g</p>
                  </div>
                </div>
                <button
                  onClick={() => onHandleRangeEdit('large')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg text-lg font-medium transition-all duration-200"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Gap Warning */}
            {showGapWarning && rangeValidation && rangeValidation.hasGaps && (
              <div className="mt-3 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-200 mb-1">Range Gaps Detected</div>
                    <div className="text-yellow-300 space-y-1">
                      {rangeValidation.gaps.map((gap, index) => (
                        <div key={index}>
                          Gap between {gap.between}: {gap.from.toFixed(2)}g to {gap.to.toFixed(2)}g
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-yellow-400 mt-2">
                      Consider adjusting ranges to eliminate gaps for complete coverage.
                    </div>
                  </div>
                  <button
                    onClick={() => onSetShowGapWarning(false)}
                    className="text-yellow-400 hover:text-yellow-300 ml-auto"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
