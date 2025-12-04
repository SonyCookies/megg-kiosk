# Kiosk Session System - Edge Cases & Implementation

This document explains how the kiosk session system handles various edge cases and failure scenarios.

## Overview

The kiosk session system creates a real-time connection between kiosks and the web dashboard, allowing users to monitor which kiosks are currently logged in with their account.

---

## Edge Case 1: Multiple Kiosk Logins

### Scenario
User logs into a kiosk while already logged in on another kiosk.

### Expected Behavior
The latest login should overwrite the previous session.

### Implementation
**Status: ✅ Automatically Handled**

- **Document ID Structure:** `kioskSessions/KIOSK-{userId}`
  - Example: `KIOSK-MEGG-679622`
- **Firestore Behavior:** Document IDs are unique, so a new login automatically overwrites the old session.
- **Result:** Only one active session per user at any time.

**Code Location:** `kiosk-next-frontend/app/services/kioskSessionService.ts`
```typescript
async createSession(userId: string, userData: UserData): Promise<boolean> {
  const kioskId = this.getKioskDocId(userId) // Returns "KIOSK-{userId}"
  const sessionDocRef = doc(db, this.sessionsCollection, kioskId)
  
  const sessionData: KioskSessionData = {
    kioskId,
    userId,
    userName: userData.fullname || userData.username || 'Unknown User',
    userEmail: userData.email || 'No email',
    startTime: serverTimestamp(),
    lastHeartbeat: serverTimestamp(),
    status: 'active'
  }

  await setDoc(sessionDocRef, sessionData) // Overwrites if exists
}
```

### Testing
1. Log into Kiosk A with account `MEGG-679622`
2. Log into Kiosk B with the same account
3. Dashboard should show only Kiosk B's session
4. Kiosk A's session is automatically replaced

---

## Edge Case 2: Stale Sessions

### Scenario
Kiosk loses connection or crashes without properly ending the session.

### Expected Behavior
Dashboard should warn users about sessions that haven't sent a heartbeat in over 5 minutes.

### Implementation
**Status: ✅ Fully Implemented**

#### Detection Logic
**Code Location:** `megg-web-tech/app/lib/kiosks/kioskSessions.js`
```javascript
export function isHeartbeatStale(lastHeartbeat) {
  if (!lastHeartbeat) return true;
  
  const lastHeartbeatMs = lastHeartbeat.toMillis ? 
    lastHeartbeat.toMillis() : lastHeartbeat.seconds * 1000;
  const now = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes
  
  return (now - lastHeartbeatMs) > fiveMinutesInMs;
}
```

#### Dashboard UI
**Code Location:** `megg-web-tech/app/dashboard/kiosks/page.jsx`

1. **Visual Indicator:** Yellow "Stale" badge instead of green "Active"
2. **Warning Banner:** Displays count of stale sessions at the top
3. **Highlighted Rows:** Stale sessions have warning colors

```jsx
{/* Stale Sessions Warning Banner */}
{!loading && staleSessionCount > 0 && (
  <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-300 p-4">
    <AlertCircle className="w-6 h-6 text-yellow-600" />
    <h3>⚠️ Stale Sessions Detected</h3>
    <p>
      {staleSessionCount} sessions have not sent a heartbeat in over 5 minutes.
    </p>
  </div>
)}
```

### Testing
1. Log into a kiosk
2. Disconnect the internet or close browser forcefully
3. Wait 5+ minutes
4. Dashboard should show yellow "Stale" badge
5. Warning banner should appear

---

## Edge Case 3: Network Recovery

### Scenario
Kiosk loses internet connection temporarily and then reconnects.

### Expected Behavior
Heartbeat should automatically resume when connection is restored.

### Implementation
**Status: ✅ Fully Implemented**

**Code Location:** `kiosk-next-frontend/app/services/accountService.ts`

#### Network Event Listeners
```typescript
private setupNetworkRecoveryListener() {
  // Listen for online event to resume heartbeat
  window.addEventListener('online', this.handleNetworkRecovery)
  
  // Listen for offline event to stop heartbeat
  window.addEventListener('offline', this.handleNetworkLoss)
}

private handleNetworkRecovery = async () => {
  console.log('🌐 Network connection restored')
  
  if (this.state.accountId) {
    console.log('💓 Resuming heartbeat after network recovery')
    
    // Restart heartbeat interval
    this.startHeartbeat(this.state.accountId)
    
    // Immediately send a heartbeat to update the session
    try {
      await kioskSessionService.updateHeartbeat(this.state.accountId)
      console.log('✅ Session reactivated after network recovery')
    } catch (error) {
      console.error('❌ Failed to reactivate session:', error)
    }
  }
}

private handleNetworkLoss = () => {
  console.log('🌐 Network connection lost')
  
  if (this.state.accountId) {
    console.log('💓 Pausing heartbeat due to network loss')
    this.stopHeartbeat()
  }
}
```

#### Flow
1. **Network Lost:**
   - Heartbeat interval stops to prevent failed requests
   - Last successful heartbeat timestamp preserved in Firebase

2. **Network Restored:**
   - Network recovery detected via `online` event
   - Heartbeat interval restarted
   - Immediate heartbeat sent to Firebase
   - Session status updated to "active"

### Testing
1. Log into a kiosk
2. Disconnect internet (airplane mode or unplug cable)
3. Wait 1-2 minutes (heartbeat stops internally)
4. Reconnect internet
5. Heartbeat should resume automatically
6. Dashboard shows session as active again

---

## Edge Case 4: localStorage Persistence

### Scenario
User closes and reopens the kiosk browser or refreshes the page.

### Expected Behavior
Session should be automatically recreated using persisted account ID.

### Implementation
**Status: ✅ Fully Implemented**

**Code Location:** `kiosk-next-frontend/app/services/accountService.ts`

#### Initialization Logic
```typescript
constructor() {
  if (typeof window !== 'undefined') {
    this.initializeAccount() // Called on app startup
    this.setupBeforeUnloadListener()
    this.setupNetworkRecoveryListener()
  }
}

private async initializeAccount() {
  try {
    this.setState({ isLoading: true, error: null })
    
    if (typeof window !== 'undefined') {
      const savedAccountId = localStorage.getItem('megg-account-id')
      
      if (savedAccountId) {
        // Reload account from localStorage
        await this.loadAccount(savedAccountId)
      } else {
        this.setState({ 
          accountId: null, 
          userData: null, 
          isLoading: false 
        })
      }
    }
  } catch (error) {
    console.error('Error initializing account:', error)
  }
}
```

#### What Gets Persisted
```typescript
async loadAccount(accountId: string): Promise<boolean> {
  const userData = await userService.getUserByAccountId(accountId)
  
  if (userData) {
    // Save to localStorage
    localStorage.setItem('megg-account-id', accountId)
    
    // Create kiosk session in Firebase
    await kioskSessionService.createSession(accountId, userData)
    
    // Start heartbeat interval
    this.startHeartbeat(accountId)
    
    return true
  }
}
```

#### Flow
1. **On Login:**
   - Account ID saved to `localStorage` with key `megg-account-id`
   - Session created in Firebase
   - Heartbeat started

2. **On Page Reload:**
   - `initializeAccount()` runs automatically
   - Reads `megg-account-id` from localStorage
   - Calls `loadAccount()` with saved ID
   - Recreates session in Firebase
   - Restarts heartbeat

3. **On Logout:**
   - Account ID removed from localStorage
   - Session ended in Firebase
   - Heartbeat stopped

### Testing
1. Log into a kiosk with account `MEGG-679622`
2. Verify session appears on dashboard
3. Refresh the browser page (F5)
4. Session should persist (no re-login required)
5. Dashboard should continue showing the session
6. Heartbeat should continue updating

---

## Additional Edge Cases

### Browser Close (beforeunload)
**Status: ✅ Implemented**

```typescript
private handleBeforeUnload = () => {
  this.stopHeartbeat()
  
  if (this.state.accountId) {
    kioskSessionService.endSession(this.state.accountId)
  }
}
```

**Note:** `beforeunload` has limitations. Async operations may not complete before page closes. Dashboard's stale session detection serves as a backup.

### Manual Logout (Clear Button)
**Status: ✅ Implemented**

```typescript
async clearAccount() {
  // End kiosk session in Firebase before clearing
  if (this.state.accountId) {
    await kioskSessionService.endSession(this.state.accountId)
  }
  
  // Stop heartbeat interval
  this.stopHeartbeat()
  
  // Clear state and localStorage
  this.setState({
    accountId: null,
    userData: null,
    isLoading: false,
    error: null
  })
  localStorage.removeItem('megg-account-id')
}
```

### Heartbeat Frequency
- **Interval:** 60 seconds
- **Why:** Balance between real-time updates and Firebase read costs
- **Stale Threshold:** 5 minutes (5x the heartbeat interval)

---

## System Architecture

```
┌─────────────────┐
│  Kiosk Browser  │
└────────┬────────┘
         │
         ├─ localStorage
         │  └─ 'megg-account-id': "MEGG-679622"
         │
         ├─ accountService
         │  ├─ loadAccount()
         │  ├─ clearAccount()
         │  ├─ startHeartbeat() (every 60s)
         │  ├─ handleNetworkRecovery()
         │  └─ handleBeforeUnload()
         │
         ├─ kioskSessionService
         │  ├─ createSession()
         │  ├─ updateHeartbeat()
         │  └─ endSession()
         │
         ▼
┌─────────────────────┐
│  Firebase Firestore │
│  kioskSessions/     │
│    KIOSK-MEGG-679622│
│      - status       │
│      - lastHeartbeat│
│      - startTime    │
└────────┬────────────┘
         │
         │ Real-time listener
         ▼
┌─────────────────────┐
│  Web Dashboard      │
│  - Shows active     │
│  - Detects stale    │
│  - Filters sessions │
└─────────────────────┘
```

---

## Troubleshooting

### Session Not Appearing on Dashboard
1. Check if account ID is correctly formatted (`MEGG-XXXXXX`)
2. Verify Firebase connection
3. Check browser console for errors
4. Ensure heartbeat interval is running (check console logs)

### Session Stuck as Stale
1. Check if heartbeat interval is running
2. Verify network connection
3. Check Firebase rules allow writes to `kioskSessions`
4. Try logging out and back in

### Session Not Persisting After Reload
1. Check if localStorage is enabled
2. Verify `megg-account-id` exists in localStorage
3. Check `initializeAccount()` is called on startup
4. Look for errors in browser console

---

## Automated Cleanup (Cloud Functions)

### ✅ Implemented!

Four Cloud Functions have been created for automated maintenance:

#### 1. Auto-Disconnect Stale Sessions
- **Runs:** Every 5 minutes
- **Purpose:** Marks sessions as "disconnected" if `lastHeartbeat` > 10 minutes
- **Location:** `megg-web-tech/functions/index.js`

#### 2. Clean Up Old Sessions
- **Runs:** Daily at 2:00 AM
- **Purpose:** Deletes disconnected sessions older than 30 days
- **Location:** `megg-web-tech/functions/index.js`

#### 3. Manual Cleanup Trigger (HTTP)
- **Trigger:** POST request
- **Purpose:** Manually trigger cleanup with custom thresholds
- **Endpoint:** `https://[region]-[project].cloudfunctions.net/manualCleanupSessions`

#### 4. Session Statistics (HTTP)
- **Trigger:** GET request
- **Purpose:** View current session statistics
- **Endpoint:** `https://[region]-[project].cloudfunctions.net/getSessionStats`

**See:** `megg-web-tech/CLOUD_FUNCTIONS_SETUP.md` for complete setup and deployment guide.

---

## Future Improvements

1. **Remote Disconnect** (Planned)
   - Add button on dashboard to remotely end a kiosk session
   - Useful if user forgets to log out

3. **Session History**
   - Store disconnected sessions for audit trail
   - Show connection duration statistics

4. **Multiple Kiosk Support**
   - If business needs allow multiple simultaneous sessions per user
   - Change document ID structure to `KIOSK-{userId}-{timestamp}`

---

## Summary

| Edge Case | Status | Implementation |
|-----------|--------|----------------|
| Multiple Kiosk Logins | ✅ Auto-handled | Document ID uniqueness |
| Stale Sessions | ✅ Implemented | 5-minute threshold + UI warnings |
| Network Recovery | ✅ Implemented | Event listeners + auto-resume |
| localStorage Persistence | ✅ Implemented | Auto-reload on startup |
| Browser Close | ✅ Best effort | beforeunload event |
| Manual Logout | ✅ Fully handled | Clear button → endSession |

All edge cases are properly handled! 🎉

