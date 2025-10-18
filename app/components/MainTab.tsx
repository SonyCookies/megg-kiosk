"use client"

import React, { useState } from "react"

type Props = {
  iotConnected: boolean
  isSorting: boolean
  onStartSorting: () => void
  onStopSorting: () => void
  currentBatch: { id?: string; name?: string } | null
  recentEggs?: { eggId: string; weight: number | null; size?: 'small' | 'medium' | 'large' | null; quality?: 'good' | 'dirty' | 'cracked' }[]
  eggHistory?: { eggId: string; weight: number | null; size: 'small' | 'medium' | 'large' | null; quality: 'good' | 'dirty' | 'cracked'; createdAt: string }[]
}

export default function MainTab({ iotConnected, isSorting, onStartSorting, onStopSorting, currentBatch, recentEggs = [], eggHistory = [] }: Props) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full h-full flex flex-col items-center justify-center gap-6">
        {isSorting ? (
          <button
            onClick={onStopSorting}
            disabled={!iotConnected}
            className={`
              select-none
              rounded-2xl
              px-8
              py-10
              text-white
              font-bold
              shadow-2xl
              transition-all
              duration-200
              focus:outline-none
              focus:ring-4
              ${iotConnected ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-slate-500 cursor-not-allowed'}
              text-3xl
              md:text-4xl
              w-[90%]
              max-w-xl
            `}
          >
            STOP SORTING
          </button>
        ) : (
          <button
            onClick={onStartSorting}
            disabled={!iotConnected}
            className={`
              select-none
              rounded-2xl
              px-8
              py-10
              text-white
              font-bold
              shadow-2xl
              transition-all
              duration-200
              focus:outline-none
              focus:ring-4
              ${iotConnected ? 'bg-green-600 hover:bg-green-700 focus:ring-green-400' : 'bg-slate-500 cursor-not-allowed'}
              text-3xl
              md:text-4xl
              w-[90%]
              max-w-xl
            `}
          >
            START SORTING
          </button>
        )}

        {/* Logs / History button */}
        <button
          onClick={() => setShowHistory(true)}
          className="rounded-xl px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 active:scale-[0.99] transition disabled:opacity-50"
          disabled={!iotConnected}
        >
          Logs / History
        </button>
        <div className="flex flex-col items-center gap-1">
          {currentBatch && currentBatch.id ? (
            <div className="text-slate-200 text-sm">
              Batch: <span className="font-semibold">{currentBatch.id}</span>
              {currentBatch.name && currentBatch.name !== currentBatch.id && currentBatch.name !== `Batch ${currentBatch.id}` ? ` — ${currentBatch.name}` : ''}
            </div>
          ) : (
            <div className="text-amber-300 text-xs">
              No batch selected. Go to Batch tab to create/select a batch.
            </div>
          )}
        </div>

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowHistory(false)} />
            <div className="relative z-10 w-[90vw] max-w-xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
                <div className="text-white font-semibold">Egg Logs / History</div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-base font-bold"
                >
                  CLOSE
                </button>
              </div>
              <div className="p-4">
                {eggHistory.length === 0 ? (
                  <div className="text-slate-300 text-sm text-center py-6">No entries yet.</div>
                ) : (
                  <div className="flex flex-col gap-2 touch-scroll h-48 overflow-auto pr-1">
                    {eggHistory.map((e) => (
                      <div key={e.eggId + e.createdAt} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-slate-100 h-12">
                        <div className="font-medium">{(e.quality || 'good').toUpperCase()} - {typeof e.weight === 'number' ? `${e.weight.toFixed(2)} g` : '—'}</div>
                        <div className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-700 bg-slate-800">
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full text-center text-white bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl text-lg font-bold"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Custom large scrollbar for touch devices */}
      <style jsx>{`
        .touch-scroll {
          scrollbar-width: thick; /* Firefox */
          scrollbar-color: #94a3b8 transparent; /* thumb track */
        }
        .touch-scroll::-webkit-scrollbar {
          width: 24px;
        }
        .touch-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .touch-scroll::-webkit-scrollbar-thumb {
          background-color: #64748b; /* slate-500 */
          border-radius: 16px;
          border: 6px solid rgba(0,0,0,0); /* padding around thumb for easier grab */
          background-clip: padding-box;
        }
        .touch-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #475569; /* slate-600 */
        }
        .touch-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
