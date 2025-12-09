"use client"

import React, { useMemo } from "react"
import { Activity, XCircle, Loader2, AlertCircle, CheckCircle, Sparkles } from "lucide-react"
import { EggSizeRanges, validateRanges } from "../utils/configurationService"

export type SmartAdjustment = {
  targetRange: 'small' | 'medium' | 'large'
  targetRangeLabel?: string
  adjustment: {
    min: number
    max: number
  }
  issue?: {
    type: 'gap' | 'overlap'
    between: string
    from: number
    to: number
  }
  cascadingAdjustments?: Array<{
    targetRange: 'small' | 'medium' | 'large'
    targetRangeLabel?: string
    adjustment: {
      min: number
      max: number
    }
  }>
}

interface RangeModalProps {
  showRangeModal: boolean
  editingRange: 'small' | 'medium' | 'large' | null
  minInput: string
  maxInput: string
  rangeError: string
  currentInputField: 'min' | 'max'
  isSavingRange: boolean
  eggRanges: EggSizeRanges
  onHandleRangeSubmit: (smartAdjustment?: SmartAdjustment | null) => void
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
  eggRanges,
  onHandleRangeSubmit,
  onSetShowRangeModal,
  onSetCurrentInputField,
  onHandleMinChange,
  onHandleMaxChange,
  onHandleKeyPress
}: RangeModalProps) {
  if (!showRangeModal || !editingRange) return null

  const { validation, smartAdjustment } = useMemo(() => {
    if (!editingRange) {
      return {
        validation: {
          isValid: false,
          errors: ['No range selected'],
          warnings: [] as string[],
          hasGaps: false,
          hasOverlaps: false
        },
        smartAdjustment: null as SmartAdjustment | null
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    const min = parseFloat(minInput)
    const max = parseFloat(maxInput)

    if (!minInput || !maxInput) {
      errors.push('Please enter both minimum and maximum values')
    }

    if (Number.isNaN(min) || Number.isNaN(max)) {
      errors.push('Please enter valid numbers')
    }

    if (min < 0 || max < 0) {
      errors.push('Values must be positive')
    }

    if (!Number.isNaN(min) && !Number.isNaN(max) && min >= max) {
      errors.push('Minimum must be less than maximum')
    }

    let smartAdjust: SmartAdjustment | null = null
    let hasGaps = false
    let hasOverlaps = false

    if (errors.length === 0) {
      const tempRanges: EggSizeRanges = {
        ...eggRanges,
        [editingRange]: {
          ...eggRanges[editingRange],
          min,
          max
        }
      }

      const result = validateRanges(tempRanges)
      hasGaps = result.hasGaps
      hasOverlaps = result.overlaps.length > 0

      result.gaps.forEach((gap) => {
        if (gap.between.includes(editingRange)) {
          warnings.push(`Gap between ${gap.between}: ${gap.from.toFixed(2)}g to ${gap.to.toFixed(2)}g`)
        }
      })

      result.overlaps.forEach((overlap) => {
        if (overlap.range1 === editingRange || overlap.range2 === editingRange) {
          warnings.push(`Overlap between ${overlap.range1} and ${overlap.range2}`)
        }
      })

      const rangesArray = [
        { name: 'small', ...tempRanges.small },
        { name: 'medium', ...tempRanges.medium },
        { name: 'large', ...tempRanges.large }
      ].sort((a, b) => a.min - b.min)

      const currentIndex = rangesArray.findIndex((r) => r.name === editingRange)
      const currentRangeData = rangesArray[currentIndex]

      if (currentIndex >= 0) {
        if (currentIndex < rangesArray.length - 1) {
          const nextRange = rangesArray[currentIndex + 1]

          if (currentRangeData.max >= nextRange.min) {
            const suggestedMin = parseFloat((currentRangeData.max + 0.01).toFixed(2))
            let suggestedMax = parseFloat(nextRange.max.toFixed(2))
            const originalRangeSize = nextRange.max - nextRange.min

            if (suggestedMin >= suggestedMax) {
              const preferredMax = parseFloat((suggestedMin + Math.max(originalRangeSize, 1.0)).toFixed(2))

              if (currentIndex + 1 < rangesArray.length - 1) {
                const rangeAfterNext = rangesArray[currentIndex + 2]
                if (preferredMax >= rangeAfterNext.min) {
                  const maxBeforeNext = parseFloat((rangeAfterNext.min - 0.01).toFixed(2))
                  suggestedMax = maxBeforeNext > suggestedMin ? maxBeforeNext : parseFloat((suggestedMin + 1.0).toFixed(2))
                } else {
                  suggestedMax = preferredMax
                }
              } else {
                suggestedMax = preferredMax
              }
            }

            smartAdjust = {
              targetRange: nextRange.name as SmartAdjustment['targetRange'],
              targetRangeLabel: nextRange.label || nextRange.name.charAt(0).toUpperCase() + nextRange.name.slice(1),
              adjustment: { min: suggestedMin, max: suggestedMax },
              issue: {
                type: 'overlap',
                from: currentRangeData.max,
                to: nextRange.min,
                between: `${editingRange} and ${nextRange.name}`
              },
              cascadingAdjustments: []
            }

            if (currentIndex + 1 < rangesArray.length - 1) {
              const rangeAfterNext = rangesArray[currentIndex + 2]
              if (suggestedMax >= rangeAfterNext.min) {
                const nextSuggestedMin = parseFloat((suggestedMax + 0.01).toFixed(2))
                const nextOriginalRangeSize = rangeAfterNext.max - rangeAfterNext.min
                let nextSuggestedMax = parseFloat(rangeAfterNext.max.toFixed(2))

                if (nextSuggestedMin >= nextSuggestedMax) {
                  nextSuggestedMax = parseFloat((nextSuggestedMin + Math.max(nextOriginalRangeSize, 1.0)).toFixed(2))
                }

                smartAdjust.cascadingAdjustments?.push({
                  targetRange: rangeAfterNext.name as SmartAdjustment['targetRange'],
                  targetRangeLabel: rangeAfterNext.label || rangeAfterNext.name.charAt(0).toUpperCase() + rangeAfterNext.name.slice(1),
                  adjustment: {
                    min: nextSuggestedMin,
                    max: nextSuggestedMax
                  }
                })
              }
            }
          } else if (currentRangeData.max + 0.01 < nextRange.min && !smartAdjust) {
            const suggestedMin = parseFloat((currentRangeData.max + 0.01).toFixed(2))
            smartAdjust = {
              targetRange: nextRange.name as SmartAdjustment['targetRange'],
              targetRangeLabel: nextRange.label || nextRange.name.charAt(0).toUpperCase() + nextRange.name.slice(1),
              adjustment: {
                min: suggestedMin,
                max: parseFloat(nextRange.max.toFixed(2))
              },
              issue: {
                type: 'gap',
                from: currentRangeData.max,
                to: nextRange.min,
                between: `${editingRange} and ${nextRange.name}`
              }
            }
          }
        }

        if (currentIndex > 0 && !smartAdjust) {
          const prevRange = rangesArray[currentIndex - 1]

          if (prevRange.max >= currentRangeData.min) {
            const suggestedMax = parseFloat((currentRangeData.min - 0.01).toFixed(2))
            let finalMax = suggestedMax

            if (suggestedMax <= prevRange.min) {
              finalMax = parseFloat(prevRange.max.toFixed(2))
              smartAdjust = {
                targetRange: prevRange.name as SmartAdjustment['targetRange'],
                targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
                adjustment: {
                  min: parseFloat((suggestedMax - 1.0).toFixed(2)),
                  max: finalMax
                },
                issue: {
                  type: 'overlap',
                  from: prevRange.max,
                  to: currentRangeData.min,
                  between: `${prevRange.name} and ${editingRange}`
                }
              }
            } else {
              smartAdjust = {
                targetRange: prevRange.name as SmartAdjustment['targetRange'],
                targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
                adjustment: {
                  min: parseFloat(prevRange.min.toFixed(2)),
                  max: finalMax
                },
                issue: {
                  type: 'overlap',
                  from: prevRange.max,
                  to: currentRangeData.min,
                  between: `${prevRange.name} and ${editingRange}`
                }
              }
            }
          } else if (prevRange.max + 0.01 < currentRangeData.min && !smartAdjust) {
            const suggestedMax = parseFloat((currentRangeData.min - 0.01).toFixed(2))
            smartAdjust = {
              targetRange: prevRange.name as SmartAdjustment['targetRange'],
              targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
              adjustment: {
                min: parseFloat(prevRange.min.toFixed(2)),
                max: suggestedMax
              },
              issue: {
                type: 'gap',
                from: prevRange.max,
                to: currentRangeData.min,
                between: `${prevRange.name} and ${editingRange}`
              }
            }
          }
        }
      }
    }

    return {
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
        hasGaps,
        hasOverlaps
      },
      smartAdjustment: smartAdjust
    }
  }, [minInput, maxInput, editingRange, eggRanges])

  const showValidation = validation.errors.length > 0 || validation.warnings.length > 0 || smartAdjustment

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onKeyDown={onHandleKeyPress}
      tabIndex={-1}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 max-w-5xl w-full mx-4 border border-white/20 shadow-2xl h-[500px]">
        <div className="grid grid-cols-2 gap-8 h-full">
          <div className="flex flex-col justify-center items-center">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/30 rounded-2xl px-8 py-12 shadow-2xl w-full">
              <div className="text-center">
                <div className="text-white text-2xl font-semibold mb-4 capitalize">
                  {editingRange} Eggs
                </div>
                <div className="flex justify-center items-center space-x-8">
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

                  <div className="text-white text-3xl font-bold">-</div>

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

                {showValidation && (
                  <div className="mt-6 space-y-3">
                    {validation.errors.length > 0 && (
                      <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-red-800">Please fix these issues</p>
                            <ul className="text-xs text-red-700 space-y-1">
                              {validation.errors.map((err, idx) => (
                                <li key={idx}>• {err}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {smartAdjustment && validation.errors.length === 0 && (
                      <div className="p-3 bg-blue-50/80 border border-blue-200/60 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-left text-xs text-blue-800 space-y-1">
                            <p className="text-sm font-semibold text-blue-900">Smart adjustment ready</p>
                            <p>
                              {smartAdjustment.issue?.type === 'overlap'
                                ? `Fix overlap by adjusting ${smartAdjustment.targetRangeLabel || smartAdjustment.targetRange} to ${smartAdjustment.adjustment.min.toFixed(2)}g - ${smartAdjustment.adjustment.max.toFixed(2)}g`
                                : `Close gap by adjusting ${smartAdjustment.targetRangeLabel || smartAdjustment.targetRange} to ${smartAdjustment.adjustment.min.toFixed(2)}g - ${smartAdjustment.adjustment.max.toFixed(2)}g`}
                              {smartAdjustment.cascadingAdjustments?.length ? (
                                <>
                                  {smartAdjustment.cascadingAdjustments.map((cascade, idx) => (
                                    <span key={idx}>
                                      {idx === 0 ? ', ' : ', '}
                                      {cascade.targetRangeLabel || cascade.targetRange}: {cascade.adjustment.min.toFixed(2)}g - {cascade.adjustment.max.toFixed(2)}g
                                    </span>
                                  ))}
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!smartAdjustment && validation.warnings.length > 0 && validation.errors.length === 0 && (
                      <div className="p-3 bg-yellow-50/80 border border-yellow-200/60 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-yellow-800">
                              {validation.hasOverlaps ? 'Overlap detected' : 'Gap detected'}
                            </p>
                            <p className="text-xs text-yellow-700">{validation.warnings[0]}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {validation.errors.length === 0 && validation.warnings.length === 0 && !smartAdjustment && (
                      <div className="p-3 bg-green-50/80 border border-green-200/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-800">Range looks good</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => onSetShowRangeModal(false)}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                  >
                    <XCircle className="h-5 w-5" />
                    Cancel
                  </button>
                  {smartAdjustment && validation.isValid ? (
                    <button
                      onClick={() => onHandleRangeSubmit(smartAdjustment)}
                      disabled={isSavingRange}
                      className="px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                      {isSavingRange ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Smart Save
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => onHandleRangeSubmit()}
                      disabled={!validation.isValid || isSavingRange}
                      className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                        validation.isValid && !isSavingRange
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
                  )}
                </div>
              </div>
            </div>

            {rangeError && (
              <p className="text-red-400 text-sm text-center mt-4">{rangeError}</p>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    data-number={num}
                    onClick={() => {
                      if (currentInputField === 'min') {
                        onHandleMinChange(minInput + num.toString())
                      } else {
                        onHandleMaxChange(maxInput + num.toString())
                      }
                    }}
                    className="w-30 h-20 bg-slate-700 hover:bg-slate-600 text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    if (currentInputField === 'min') {
                      onHandleMinChange(minInput + '0')
                    } else {
                      onHandleMaxChange(maxInput + '0')
                    }
                  }}
                  className="w-30 h-20 bg-slate-700 hover:bg-slate-600 text-white text-2xl font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  0
                </button>
                <button
                  onClick={() => {
                    if (currentInputField === 'min') {
                      onHandleMinChange(minInput + '.')
                    } else {
                      onHandleMaxChange(maxInput + '.')
                    }
                  }}
                  disabled={
                    (currentInputField === 'min' && minInput.includes('.')) ||
                    (currentInputField === 'max' && maxInput.includes('.')) ||
                    (currentInputField === 'min' && minInput.length === 0) ||
                    (currentInputField === 'max' && maxInput.length === 0)
                  }
                  className="w-30 h-20 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  .
                </button>
                <button
                  onClick={() => {
                    if (currentInputField === 'min' && minInput.length > 0) {
                      onHandleMinChange(minInput.slice(0, -1))
                    } else if (currentInputField === 'max' && maxInput.length > 0) {
                      onHandleMaxChange(maxInput.slice(0, -1))
                    }
                  }}
                  disabled={
                    (currentInputField === 'min' && minInput.length === 0) ||
                    (currentInputField === 'max' && maxInput.length === 0)
                  }
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
