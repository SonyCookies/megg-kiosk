// services/accountService.ts - Clean Account ID Management Service

import { useState, useEffect, useCallback } from 'react'
import userService from './userService'
import calibrationService from './calibrationService'
import kioskSessionService from './kioskSessionService'

export interface AccountState {
  accountId: string | null
  userData: any | null
  isLoading: boolean
  error: string | null
}

class AccountService {
  private listeners: Set<(state: AccountState) => void> = new Set()
  private state: AccountState = {
    accountId: null,
    userData: null,
    isLoading: false,
    error: null
  }
  private heartbeatInterval: number | null = null

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeAccount()
      this.setupBeforeUnloadListener()
      this.setupNetworkRecoveryListener()
    }
  }
  
  // Setup beforeunload event listener
  private setupBeforeUnloadListener() {
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }
  
  // Handle browser close/refresh (arrow function to bind 'this' correctly)
  private handleBeforeUnload = () => {
    // Stop heartbeat immediately
    this.stopHeartbeat()
    
    // End session in Firebase
    if (this.state.accountId) {
      // Note: async operations may not complete during beforeunload
      // but we attempt it anyway for best effort
      kioskSessionService.endSession(this.state.accountId)
    }
  }

  // Setup network recovery listener
  private setupNetworkRecoveryListener() {
    // Listen for online event to resume heartbeat when network recovers
    window.addEventListener('online', this.handleNetworkRecovery)
    
    // Listen for offline event to stop heartbeat when network is lost
    window.addEventListener('offline', this.handleNetworkLoss)
  }

  // Handle network recovery (arrow function to bind 'this' correctly)
  private handleNetworkRecovery = async () => {
    console.log('🌐 Network connection restored')
    
    // If user is logged in, resume heartbeat and update session
    if (this.state.accountId) {
      console.log('💓 Resuming heartbeat after network recovery')
      
      // Restart heartbeat interval
      this.startHeartbeat(this.state.accountId)
      
      // Immediately send a heartbeat to update the session
      try {
        await kioskSessionService.updateHeartbeat(this.state.accountId)
        console.log('✅ Session reactivated after network recovery')
      } catch (error) {
        console.error('❌ Failed to reactivate session after network recovery:', error)
      }
    }
  }

  // Handle network loss (arrow function to bind 'this' correctly)
  private handleNetworkLoss = () => {
    console.log('🌐 Network connection lost')
    
    // Stop heartbeat to avoid failed requests
    if (this.state.accountId) {
      console.log('💓 Pausing heartbeat due to network loss')
      this.stopHeartbeat()
    }
  }

  // Subscribe to account state changes
  subscribe(listener: (state: AccountState) => void) {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.state)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // Update state and notify listeners
  private setState(newState: Partial<AccountState>) {
    this.state = { ...this.state, ...newState }
    this.notifyListeners()
  }

  // Initialize account from localStorage
  private async initializeAccount() {
    try {
      this.setState({ isLoading: true, error: null })
      
      // Only access localStorage in browser environment
      if (typeof window !== 'undefined') {
        const savedAccountId = localStorage.getItem('megg-account-id')
        if (savedAccountId) {
          await this.loadAccount(savedAccountId)
        } else {
          this.setState({ 
            accountId: null, 
            userData: null, 
            isLoading: false 
          })
        }
      } else {
        this.setState({ 
          accountId: null, 
          userData: null, 
          isLoading: false 
        })
      }
    } catch (error) {
      console.error('Error initializing account:', error)
      this.setState({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  }

  // Load account data
  async loadAccount(accountId: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null })
      
      // Fetch user data
      const userData = await userService.getUserByAccountId(accountId)
      
      if (userData) {
        // Set account ID and user data
        this.setState({
          accountId,
          userData,
          isLoading: false,
          error: null
        })
        
        // Save to localStorage
        localStorage.setItem('megg-account-id', accountId)
        
        // Create kiosk session in Firebase
        await kioskSessionService.createSession(accountId, userData)
        
        // Start heartbeat interval (update every 60 seconds)
        this.startHeartbeat(accountId)
        
        return true
      } else {
        // Invalid account ID
        this.clearAccount()
        this.setState({ 
          error: 'Account not found',
          isLoading: false 
        })
        return false
      }
    } catch (error) {
      console.error('Error loading account:', error)
      this.setState({ 
        error: error instanceof Error ? error.message : 'Failed to load account',
        isLoading: false 
      })
      return false
    }
  }

  // Start heartbeat interval
  private startHeartbeat(accountId: string) {
    // Clear any existing interval
    this.stopHeartbeat()
    
    // Update heartbeat every 60 seconds (use window.setInterval for browser)
    this.heartbeatInterval = window.setInterval(async () => {
      await kioskSessionService.updateHeartbeat(accountId)
    }, 60000) // 60 seconds
    
    console.log('💓 Heartbeat started for:', accountId)
  }
  
  // Stop heartbeat interval
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('💓 Heartbeat stopped')
    }
  }

  // Clear account data
  async clearAccount() {
    // End kiosk session in Firebase before clearing
    if (this.state.accountId) {
      await kioskSessionService.endSession(this.state.accountId)
    }
    
    // Stop heartbeat interval
    this.stopHeartbeat()
    
    this.setState({
      accountId: null,
      userData: null,
      isLoading: false,
      error: null
    })
    localStorage.removeItem('megg-account-id')
  }

  // Get current account state
  getState(): AccountState {
    return { ...this.state }
  }

  // Check if account is loaded
  isLoaded(): boolean {
    return !this.state.isLoading && !!this.state.accountId
  }

  // Get account ID (with fallback to localStorage)
  getAccountId(): string | null {
    if (typeof window !== 'undefined') {
      return this.state.accountId || localStorage.getItem('megg-account-id')
    }
    return this.state.accountId
  }

  // Get user data
  getUserData(): any | null {
    return this.state.userData
  }

  // Check if account has UID
  hasUID(): boolean {
    return !!(this.state.userData?.uid)
  }

  // Ensure account has UID
  async ensureUID(): Promise<boolean> {
    if (!this.state.accountId) return false
    
    try {
      return await calibrationService.ensureUserHasUID(this.state.accountId)
    } catch (error) {
      console.error('Error ensuring UID:', error)
      return false
    }
  }
}

// Create singleton instance
const accountService = new AccountService()

// React hook for using account service
export function useAccount() {
  const [state, setState] = useState<AccountState>(accountService.getState())

  useEffect(() => {
    const unsubscribe = accountService.subscribe(setState)
    return unsubscribe
  }, [])

  const loadAccount = useCallback((accountId: string) => {
    return accountService.loadAccount(accountId)
  }, [])

  const clearAccount = useCallback(() => {
    return accountService.clearAccount()
  }, [])

  const ensureUID = useCallback(() => {
    return accountService.ensureUID()
  }, [])

  return {
    ...state,
    loadAccount,
    clearAccount,
    ensureUID,
    // Derived from local state for reactivity
    isLoaded: !state.isLoading && !!state.accountId,
    hasUID: !!(state.userData?.uid),
    // Call service methods directly
    getAccountId: accountService.getAccountId,
    getUserData: accountService.getUserData
  }
}

export default accountService
