"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import iotService from "../services/iotService"

interface CalibrationTabProps {
  isCalibratingUno: boolean
  isCalibratingHX711: boolean
  isCalibratingNema23: boolean
  isCalibratingSG90: boolean
  isCalibratingMG996R: boolean
  onHandleUnoCalibration: () => void
  onHandleHX711Calibration: () => void
  onHandleNema23Calibration: () => void
  onHandleSG90Calibration: () => void
  onHandleMG996RCalibration: () => void
  showToaster: (type: 'success' | 'error' | 'info', message: string) => void
  onResetCalibrationState: (component: string) => void
  iotConnected: boolean
  hasAccountId: boolean
  calibrationStatus: {
    UNO: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
    HX711: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
    NEMA23: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
    SG90: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
    MG996R: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
  }
}

export default function CalibrationTab({
  isCalibratingUno,
  isCalibratingHX711,
  isCalibratingNema23,
  isCalibratingSG90,
  isCalibratingMG996R,
  onHandleUnoCalibration,
  onHandleHX711Calibration,
  onHandleNema23Calibration,
  onHandleSG90Calibration,
  onHandleMG996RCalibration,
  showToaster,
  onResetCalibrationState,
  iotConnected,
  hasAccountId,
  calibrationStatus
}: CalibrationTabProps) {


  if (!iotConnected) {
    return (
      <div className="h-full overflow-y-auto p-3">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white">Hardware Calibration</h3>
          </div>
          <div className="py-12 text-center text-slate-300">
            <div className="text-xl font-semibold mb-2">IoT backend is offline</div>
            <div className="text-sm">Connect to IoT to access Hardware Calibration.</div>
          </div>
        </div>
      </div>
    )
  }

  const formatLastCalibration = (timestamp: string | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const getLatestCalibrationTime = () => {
    const times = Object.values(calibrationStatus)
      .map(status => status.lastCalibration)
      .filter(Boolean)
      .map(time => new Date(time).getTime())
    
    if (times.length === 0) return null
    
    const latestTime = Math.max(...times)
    return new Date(latestTime).toISOString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calibrated': return 'text-green-400'
      case 'calibrating': return 'text-yellow-400'
      case 'failed': return 'text-red-400'
      case 'unknown': return 'text-gray-400' // Show not calibrated in gray
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'calibrated': return '✅'
      case 'calibrating': return '🔄'
      case 'failed': return '❌'
      case 'unknown': return '⏳' // Show not calibrated with hourglass
      default: return '❓'
    }
  }

  const handleCalibration = (component: string, calibrationFunction: () => void) => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected. Please check connection.')
      return
    }
    // Start calibration immediately - account ID check will happen when saving result
    calibrationFunction()
  }
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Hardware Calibration</h3>
          {getLatestCalibrationTime() && (
            <div className="mt-2 text-sm text-slate-300">
              <span className="text-slate-400">Last updated:</span> {formatLastCalibration(getLatestCalibrationTime())}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* UNO Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCalibration('UNO', onHandleUnoCalibration)}
              disabled={isCalibratingUno || !iotConnected}
              className={`px-4 py-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 ${
                isCalibratingUno
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-slate-700/50 hover:bg-blue-600/20 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isCalibratingUno ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>UNO</span>
                </>
              ) : (
                <span>UNO</span>
              )}
            </button>
            <div className="text-center">
              <div className={`text-xs flex items-center justify-center gap-1 ${getStatusColor(calibrationStatus.UNO.status)}`}>
                <span>{getStatusIcon(calibrationStatus.UNO.status)}</span>
                <span className="capitalize">
                  {calibrationStatus.UNO.status === 'unknown' ? 'Not calibrated yet' : calibrationStatus.UNO.status}
                </span>
              </div>
              {calibrationStatus.UNO.lastCalibration && (
                <div className="text-xs text-slate-400 mt-1">
                  {formatLastCalibration(calibrationStatus.UNO.lastCalibration)}
                </div>
              )}
            </div>
          </div>

          {/* HX711 Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCalibration('HX711', onHandleHX711Calibration)}
              disabled={isCalibratingHX711 || !iotConnected}
              className={`px-4 py-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 ${
                isCalibratingHX711
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-slate-700/50 hover:bg-green-600/20 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isCalibratingHX711 ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>HX711</span>
                </>
              ) : (
                <span>HX711</span>
              )}
            </button>
            <div className="text-center">
              <div className={`text-xs flex items-center justify-center gap-1 ${getStatusColor(calibrationStatus.HX711.status)}`}>
                <span>{getStatusIcon(calibrationStatus.HX711.status)}</span>
                <span className="capitalize">
                  {calibrationStatus.HX711.status === 'unknown' ? 'Not calibrated yet' : calibrationStatus.HX711.status}
                </span>
              </div>
              {calibrationStatus.HX711.lastCalibration && (
                <div className="text-xs text-slate-400 mt-1">
                  {formatLastCalibration(calibrationStatus.HX711.lastCalibration)}
                </div>
              )}
            </div>
          </div>

          {/* NEMA 23 Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCalibration('NEMA23', onHandleNema23Calibration)}
              disabled={isCalibratingNema23 || !iotConnected}
              className={`px-4 py-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 ${
                isCalibratingNema23
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-slate-700/50 hover:bg-purple-600/20 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isCalibratingNema23 ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>NEMA 23</span>
                </>
              ) : (
                <span>NEMA 23</span>
              )}
            </button>
            <div className="text-center">
              <div className={`text-xs flex items-center justify-center gap-1 ${getStatusColor(calibrationStatus.NEMA23.status)}`}>
                <span>{getStatusIcon(calibrationStatus.NEMA23.status)}</span>
                <span className="capitalize">
                  {calibrationStatus.NEMA23.status === 'unknown' ? 'Not calibrated yet' : calibrationStatus.NEMA23.status}
                </span>
              </div>
              {calibrationStatus.NEMA23.lastCalibration && (
                <div className="text-xs text-slate-400 mt-1">
                  {formatLastCalibration(calibrationStatus.NEMA23.lastCalibration)}
                </div>
              )}
            </div>
          </div>

          {/* SG90 Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCalibration('SG90', onHandleSG90Calibration)}
              disabled={isCalibratingSG90 || !iotConnected}
              className={`px-4 py-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 ${
                isCalibratingSG90
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-slate-700/50 hover:bg-orange-600/20 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isCalibratingSG90 ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>SG90</span>
                </>
              ) : (
                <span>SG90</span>
              )}
            </button>
            <div className="text-center">
              <div className={`text-xs flex items-center justify-center gap-1 ${getStatusColor(calibrationStatus.SG90.status)}`}>
                <span>{getStatusIcon(calibrationStatus.SG90.status)}</span>
                <span className="capitalize">
                  {calibrationStatus.SG90.status === 'unknown' ? 'Not calibrated yet' : calibrationStatus.SG90.status}
                </span>
              </div>
              {calibrationStatus.SG90.lastCalibration && (
                <div className="text-xs text-slate-400 mt-1">
                  {formatLastCalibration(calibrationStatus.SG90.lastCalibration)}
                </div>
              )}
            </div>
          </div>

          {/* MG996R Button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCalibration('MG996R', onHandleMG996RCalibration)}
              disabled={isCalibratingMG996R || !iotConnected}
              className={`px-4 py-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 ${
                isCalibratingMG996R
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-slate-700/50 hover:bg-red-600/20 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isCalibratingMG996R ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>MG996R</span>
                </>
              ) : (
                <span>MG996R</span>
              )}
            </button>
            <div className="text-center">
              <div className={`text-xs flex items-center justify-center gap-1 ${getStatusColor(calibrationStatus.MG996R.status)}`}>
                <span>{getStatusIcon(calibrationStatus.MG996R.status)}</span>
                <span className="capitalize">
                  {calibrationStatus.MG996R.status === 'unknown' ? 'Not calibrated yet' : calibrationStatus.MG996R.status}
                </span>
              </div>
              {calibrationStatus.MG996R.lastCalibration && (
                <div className="text-xs text-slate-400 mt-1">
                  {formatLastCalibration(calibrationStatus.MG996R.lastCalibration)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
