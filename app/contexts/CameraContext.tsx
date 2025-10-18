"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

interface CameraContextValue {
  registerVideo: (video: HTMLVideoElement | null) => void
  captureFrame: () => string | null
  isReady: boolean
}

const CameraContext = createContext<CameraContextValue | undefined>(undefined)

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const registerVideo = useCallback((video: HTMLVideoElement | null) => {
    // Cleanup previous listeners
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    videoRef.current = video
    setIsReady(false)

    if (video) {
      const updateReady = () => {
        const ready = video.videoWidth > 0 && video.videoHeight > 0 && !video.paused
        setIsReady(ready)
      }
      const updateReadyHandler: EventListener = (_e) => updateReady()
      const endedHandler: EventListener = (_e) => setIsReady(false)

      const handlers: Array<[keyof HTMLVideoElementEventMap, EventListener]> = [
        ['loadedmetadata', updateReadyHandler],
        ['canplay', updateReadyHandler],
        ['play', updateReadyHandler],
        ['pause', updateReadyHandler],
        ['resize', updateReadyHandler],
        ['ended', endedHandler],
      ]
      handlers.forEach(([evt, fn]) => video.addEventListener(evt, fn))
      // Initial check shortly after register
      setTimeout(updateReady, 100)
      cleanupRef.current = () => handlers.forEach(([evt, fn]) => video.removeEventListener(evt, fn))
    }
  }, [])

  const captureFrame = useCallback((): string | null => {
    const v = videoRef.current
    if (!v || v.videoWidth === 0 || v.videoHeight === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    try {
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch {
      return null
    }
  }, [])

  const value = useMemo<CameraContextValue>(() => ({
    registerVideo,
    captureFrame,
    isReady,
  }), [registerVideo, captureFrame, isReady])

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  )
}

export function useCamera(): CameraContextValue {
  const ctx = useContext(CameraContext)
  if (!ctx) throw new Error("useCamera must be used within a CameraProvider")
  return ctx
}
