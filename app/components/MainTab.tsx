"use client"

import React from "react"

type Props = {
  iotConnected: boolean
  isSorting: boolean
  onStartSorting: () => void
  onStopSorting: () => void
  currentBatch: { id?: string; name?: string } | null
}

export default function MainTab({ iotConnected, isSorting, onStartSorting, onStopSorting, currentBatch }: Props) {
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
        <div className="flex flex-col items-center gap-1">
          <div className="text-slate-300 text-sm">
            {iotConnected ? 'IoT backend connected' : 'IoT backend not connected'}
          </div>
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
      </div>
    </div>
  )
}
