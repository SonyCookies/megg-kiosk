"use client"

import React from "react"
import { 
  Activity, 
  Gauge, 
  Clock, 
  Target, 
  BarChart3, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface MotorStatus {
  status: string
  current_position: number
  current_weight: number
  mg996r_position: number
  sg90_position: number
  connected: boolean
}

interface ProcessingStats {
  totalProcessed: number
  goodEggs: number
  badEggs: number
  smallEggs: number
  mediumEggs: number
  largeEggs: number
}

interface SystemMonitoringProps {
  motorStatus: MotorStatus | null
  processingStats: ProcessingStats
}

export default function SystemMonitoring({ 
  motorStatus, 
  processingStats 
}: SystemMonitoringProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'idle': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'idle': return <Clock className="h-4 w-4 text-yellow-400" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-400" />
      default: return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Motor Status:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(motorStatus?.status || 'unknown')}
                <span className={`font-medium ${getStatusColor(motorStatus?.status || 'unknown')}`}>
                  {motorStatus?.status || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Connection:</span>
              <div className="flex items-center gap-2">
                {motorStatus?.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className={`font-medium ${
                  motorStatus?.connected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {motorStatus?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Current Position:</span>
              <span className="text-white font-medium">{motorStatus?.current_position || 0}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Current Weight:</span>
              <span className="text-white font-medium">{motorStatus?.current_weight?.toFixed(1) || '0.0'}g</span>
            </div>
          </div>
        </div>

        {/* Motor Positions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Motor Positions
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Sorting Servo:</span>
              <span className="text-white font-medium">{motorStatus?.mg996r_position || 0}°</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Loading Servo:</span>
              <span className="text-white font-medium">{motorStatus?.sg90_position || 0}°</span>
            </div>
            
            <div className="mt-4">
              <div className="text-white/70 text-sm mb-2">Position Guide:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">0° - Home</span>
                  <span className="text-white/60">90° - Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">30° - Small</span>
                  <span className="text-white/60">60° - Medium</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">120° - Large</span>
                  <span className="text-white/60">0° - Bad</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Performance
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total Processed:</span>
              <span className="text-white font-medium text-lg">{processingStats.totalProcessed}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Success Rate:</span>
              <span className="text-green-400 font-medium text-lg">
                {processingStats.totalProcessed > 0 
                  ? Math.round((processingStats.goodEggs / processingStats.totalProcessed) * 100)
                  : 0}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Good Eggs:</span>
              <span className="text-green-400 font-medium">{processingStats.goodEggs}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Bad Eggs:</span>
              <span className="text-red-400 font-medium">{processingStats.badEggs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Statistics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Processing Statistics
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-white/70 text-sm">Small Eggs</div>
                <div className="text-2xl font-bold text-yellow-400">{processingStats.smallEggs}</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-white/70 text-sm">Medium Eggs</div>
                <div className="text-2xl font-bold text-green-400">{processingStats.mediumEggs}</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-white/70 text-sm">Large Eggs</div>
                <div className="text-2xl font-bold text-blue-400">{processingStats.largeEggs}</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-white/70 text-sm">Bad Eggs</div>
                <div className="text-2xl font-bold text-red-400">{processingStats.badEggs}</div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Health
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Motor System</span>
                <div className="flex items-center gap-2">
                  {motorStatus?.isOffline ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  ) : motorStatus?.connected ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm ${
                    motorStatus?.isOffline 
                      ? 'text-yellow-400' 
                      : motorStatus?.connected 
                        ? 'text-green-400' 
                        : 'text-red-400'
                  }`}>
                    {motorStatus?.isOffline 
                      ? 'Offline' 
                      : motorStatus?.connected 
                        ? 'Healthy' 
                        : 'Error'}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    motorStatus?.isOffline
                      ? 'bg-yellow-500'
                      : motorStatus?.connected 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ 
                    width: motorStatus?.isOffline 
                      ? '50%' 
                      : motorStatus?.connected 
                        ? '100%' 
                        : '0%' 
                  }}
                />
              </div>
              
              {/* Additional status info */}
              {motorStatus?.consecutiveFailures && motorStatus.consecutiveFailures > 0 && (
                <div className="text-xs text-yellow-400">
                  Failures: {motorStatus.consecutiveFailures}
                </div>
              )}
              {motorStatus?.lastCheck && (
                <div className="text-xs text-white/50">
                  Last check: {new Date(motorStatus.lastCheck).toLocaleTimeString()}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Processing Rate</span>
                <span className="text-white font-medium">
                  {processingStats.totalProcessed > 0 ? 'Active' : 'Idle'}
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{ 
                    width: processingStats.totalProcessed > 0 ? '75%' : '25%' 
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Quality Score</span>
                <span className="text-white font-medium">
                  {processingStats.totalProcessed > 0 
                    ? Math.round((processingStats.goodEggs / processingStats.totalProcessed) * 100)
                    : 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-green-500"
                  style={{ 
                    width: processingStats.totalProcessed > 0 
                      ? `${Math.round((processingStats.goodEggs / processingStats.totalProcessed) * 100)}%`
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
