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
  iotConnected
}: CalibrationTabProps) {


  const handleCalibration = async (component: string, callback: () => void) => {
    // Call the original callback (for UI state management)
    callback()
    
    // Send calibration request to IoT backend
    try {
      console.log(`🔧 Sending calibration request for ${component}...`)
      const result = await iotService.calibrateComponent(component)
      console.log(`✅ Calibration request for ${component} sent successfully:`, result)
    } catch (error) {
      console.error(`❌ Failed to send calibration request for ${component}:`, error)
      // Reset the calibration state on error
      onResetCalibrationState(component)
      // Show error toaster
      showToaster('error', `Failed to send calibration request for ${component}. Please check IoT backend connection.`)
    }
  }
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Hardware Calibration</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* UNO Button */}
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

          {/* HX711 Button */}
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

          {/* NEMA 23 Button */}
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

          {/* SG90 Button */}
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

          {/* MG996R Button */}
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
        </div>
      </div>
    </div>
  )
}
