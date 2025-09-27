"use client"

import React from "react"

interface ToasterProps {
  toaster: {
    show: boolean
    type: 'success' | 'error' | 'info'
    message: string
  }
  onSetToaster: (toaster: { show: boolean; type: 'success' | 'error' | 'info'; message: string }) => void
}

export default function Toaster({ toaster, onSetToaster }: ToasterProps) {
  if (!toaster.show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`px-6 py-4 rounded-lg shadow-lg border-l-4 flex items-center gap-3 min-w-[300px] ${
        toaster.type === 'success' 
          ? 'bg-green-500/20 text-green-300 border-green-500' 
          : toaster.type === 'error'
          ? 'bg-red-500/20 text-red-300 border-red-500'
          : 'bg-blue-500/20 text-blue-300 border-blue-500'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          toaster.type === 'success' 
            ? 'bg-green-400' 
            : toaster.type === 'error'
            ? 'bg-red-400'
            : 'bg-blue-400'
        }`}></div>
        <span className="font-medium">{toaster.message}</span>
        <button
          onClick={() => onSetToaster({ show: false, type: 'info', message: '' })}
          className="ml-auto text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
