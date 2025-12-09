"use client"

import React from "react"
import { User, AlertCircle, Loader2, XCircle } from "lucide-react"

interface AccountTabProps {
  currentAccountId: string | null
  userData: any
  isLoadingUser: boolean
  onHandleInputId: () => void
  onClearAccountId: () => void
}

export default function AccountTab({
  currentAccountId,
  userData,
  isLoadingUser,
  onHandleInputId,
  onClearAccountId
}: AccountTabProps) {

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 shadow-lg">
        <div className="space-y-6">
          {/* Account Info Display - Only show when logged in */}
          {currentAccountId && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30 shadow-lg">
                {isLoadingUser ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                    <span className="text-white">Loading user data...</span>
                  </div>
                ) : userData ? (
                  <div className="flex items-center justify-between">
                    {/* Left side - User Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-lg">
                          {userData.fullname || userData.username || 'User'}
                        </h4>
                        <p className="text-slate-400 text-sm">
                          {userData.email || 'No email'}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {userData.phone || 'No phone number'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {userData.provider === 'google' ? 'Google Account' : 'Email Account'}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Account ID */}
                    <div className="text-right">
                      <div className="text-slate-400 text-sm mb-2">Account ID</div>
                      <div className="text-2xl font-mono font-bold text-blue-400">{currentAccountId}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        {userData.verified ? '✓ Verified' : '⚠ Unverified'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                    <p>User data not found</p>
                    <p className="text-sm">Account ID exists but user data is missing</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input ID Section */}
          <div className="space-y-3">
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex gap-3">
                  <button
                    onClick={onHandleInputId}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <User className="h-5 w-5" />
                    {currentAccountId ? 'Change Account ID' : 'Enter Account ID'}
                  </button>
                  {currentAccountId && (
                    <button
                      onClick={onClearAccountId}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <XCircle className="h-5 w-5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}
