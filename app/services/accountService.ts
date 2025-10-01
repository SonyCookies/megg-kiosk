// services/accountService.ts - Clean Account ID Management Service

import { useState, useEffect, useCallback } from 'react'
import userService from './userService'
import calibrationService from './calibrationService'

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

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeAccount()
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

  // Clear account data
  clearAccount() {
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
    accountService.clearAccount()
  }, [])

  const ensureUID = useCallback(() => {
    return accountService.ensureUID()
  }, [])

  return {
    ...state,
    loadAccount,
    clearAccount,
    ensureUID,
    isLoaded: accountService.isLoaded(),
    getAccountId: accountService.getAccountId,
    getUserData: accountService.getUserData,
    hasUID: accountService.hasUID()
  }
}

export default accountService
