# Kiosk Notification Integration

This document explains how the kiosk integrates with the MEGG notification system.

---

## Overview

The kiosk automatically creates notifications in the main MEGG notification system when:
- ✅ User logs into a kiosk
- ✅ User logs out of a kiosk
- ✅ Network connection is recovered
- ✅ Session times out (via Cloud Functions)

These notifications appear in the web dashboard's notification center.

---

## Architecture

```
┌─────────────────┐
│  Kiosk Frontend │
│                 │
│  accountService │──┐
│  ↓              │  │
│  notificationService │
└────────┬────────┘  │
         │           │
         ▼           ▼
┌─────────────────────────────┐
│  Firestore                  │
│  notifications/             │
│    - accountId              │
│    - message                │
│    - type                   │
│    - icon                   │
│    - createdAt              │
│    - read                   │
│    - source: "kiosk"        │
└────────┬────────────────────┘
         │
         │ Real-time listener
         ▼
┌─────────────────────────────┐
│  Web Dashboard              │
│  - Header (notification bell)
│  - Notifications Page       │
└─────────────────────────────┘
```

---

## Notification Types

### 1. Kiosk Connected
**Type:** `kiosk_connected`  
**Icon:** `monitor` (blue)  
**Trigger:** When user successfully logs into kiosk

**Message Example:**
```
"Kiosk connected successfully. Welcome, John Doe!"
```

**When Created:**
```typescript
// In accountService.ts -> loadAccount()
await notifyKioskConnected(accountId, userName)
```

---

### 2. Kiosk Disconnected
**Type:** `kiosk_disconnected`  
**Icon:** `monitor` (gray)  
**Trigger:** When user logs out of kiosk

**Message Example:**
```
"Kiosk session ended for John Doe"
```

**When Created:**
```typescript
// In accountService.ts -> clearAccount()
await notifyKioskDisconnected(accountId, userName)
```

---

### 3. Network Recovered
**Type:** `kiosk_network_recovered`  
**Icon:** `wifi` (green)  
**Trigger:** When network connection is restored after loss

**Message Example:**
```
"Network connection restored - kiosk session reactivated"
```

**When Created:**
```typescript
// In accountService.ts -> handleNetworkRecovery()
await notifyNetworkRecovered(accountId)
```

---

### 4. Session Timeout
**Type:** `kiosk_session_timeout`  
**Icon:** `alert` (red/yellow)  
**Trigger:** Cloud Function auto-disconnects stale session

**Message Example:**
```
"Your kiosk session has timed out due to inactivity"
```

**When Created:**
```javascript
// In Cloud Function: autoDisconnectStaleSessions
// This would need to be implemented in the Cloud Function
```

---

## Implementation Details

### File: `notificationService.ts`

```typescript
/**
 * Create a notification in the Firestore notifications collection
 * Compatible with the main MEGG notification system
 */
export async function createKioskNotification(
  accountId: string,
  message: string,
  type: string,
  icon?: string
): Promise<boolean>
```

**Features:**
- ✅ Same Firestore structure as web dashboard
- ✅ Automatic icon mapping
- ✅ Non-blocking (won't stop kiosk operations if fails)
- ✅ Error handling with console logging
- ✅ Source field set to "kiosk" for tracking

**Fields Saved:**
```javascript
{
  accountId: "MEGG-679622",
  message: "Kiosk connected successfully. Welcome, John!",
  type: "kiosk_connected",
  icon: "monitor",
  createdAt: serverTimestamp(),
  read: false,
  source: "kiosk"
}
```

---

## Integration Points

### 1. Account Service Integration

**File:** `services/accountService.ts`

#### On Login (loadAccount):
```typescript
// Create kiosk session in Firebase
await kioskSessionService.createSession(accountId, userData)

// Start heartbeat
this.startHeartbeat(accountId)

// Create notification (non-blocking)
try {
  await notifyKioskConnected(accountId, userName)
} catch (error) {
  console.error('Failed to create connection notification:', error)
  // Don't block login if notification fails
}
```

#### On Logout (clearAccount):
```typescript
// End session
await kioskSessionService.endSession(this.state.accountId)

// Create notification (non-blocking)
try {
  await notifyKioskDisconnected(accountId, userName)
} catch (error) {
  console.error('Failed to create disconnection notification:', error)
  // Don't block logout if notification fails
}
```

#### On Network Recovery (handleNetworkRecovery):
```typescript
// Reactivate session
await kioskSessionService.updateHeartbeat(accountId)

// Create notification (non-blocking)
try {
  await notifyNetworkRecovered(accountId)
} catch (error) {
  console.error('Failed to create network recovery notification:', error)
}
```

---

## Web Dashboard Display

### Header Component
**File:** `app/dashboard/components/Header.js`

**Icon Rendering:**
```javascript
// Kiosk connected - Blue
{notif.icon === "monitor" && notif.type === "kiosk_connected" ? (
  <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-full">
    <MonitorDot className="w-5 h-5 text-white" strokeWidth={2.5} />
  </div>
)}

// Kiosk disconnected - Gray
{notif.icon === "monitor" && notif.type === "kiosk_disconnected" ? (
  <div className="w-12 h-12 bg-gray-600 flex items-center justify-center rounded-full">
    <MonitorDot className="w-5 h-5 text-white" strokeWidth={2.5} />
  </div>
)}

// Network recovered - Green
{notif.icon === "wifi" ? (
  <div className="w-12 h-12 bg-green-600 flex items-center justify-center rounded-full">
    <Wifi className="w-5 h-5 text-white" strokeWidth={2.5} />
  </div>
)}
```

### Notifications Page
**File:** `app/dashboard/notifications/page.jsx`

Same icon rendering as Header component.

---

## Testing

### Test Kiosk Connected Notification

1. Open kiosk frontend
2. Enter account ID (e.g., 679622)
3. Successfully log in
4. Open web dashboard
5. Click notification bell
6. Should see: "Kiosk connected successfully. Welcome, [Name]!"
7. Icon should be blue monitor

### Test Kiosk Disconnected Notification

1. From logged-in kiosk
2. Click "Clear" button
3. Open web dashboard notifications
4. Should see: "Kiosk session ended for [Name]"
5. Icon should be gray monitor

### Test Network Recovery Notification

1. Log into kiosk
2. Disconnect internet (airplane mode)
3. Wait 1-2 minutes
4. Reconnect internet
5. Open web dashboard notifications
6. Should see: "Network connection restored - kiosk session reactivated"
7. Icon should be green wifi

---

## Notification Settings

Kiosk notifications are **always enabled** and cannot be disabled by users.

This is enforced in `NotificationsService.js`:

```javascript
// Always allow kiosk notifications
if (type.includes("kiosk")) {
  return true
}
```

**Rationale:**
- Security-related notifications
- Important for monitoring kiosk activity
- Users should always be aware of kiosk connections

---

## Error Handling

All notification creation is **non-blocking**:

```typescript
try {
  await notifyKioskConnected(accountId, userName)
} catch (error) {
  console.error('Failed to create notification:', error)
  // Don't block login if notification fails
}
```

**Why?**
- Notifications should NEVER prevent kiosk operations
- Login/logout should work even if notification fails
- Graceful degradation for better UX

---

## Firestore Structure

### Collection: `notifications`

**Document Example:**
```javascript
{
  accountId: "MEGG-679622",
  message: "Kiosk connected successfully. Welcome, John Doe!",
  type: "kiosk_connected",
  icon: "monitor",
  createdAt: Timestamp(2024-01-15 10:30:00),
  read: false,
  source: "kiosk"  // Identifies this came from kiosk
}
```

**Fields:**
- `accountId` (string) - User's account ID
- `message` (string) - Notification message
- `type` (string) - Notification type
- `icon` (string) - Icon identifier
- `createdAt` (Timestamp) - Firebase server timestamp
- `read` (boolean) - Read status
- `source` (string) - Optional source identifier

---

## Best Practices

### ✅ DO

1. **Always wrap in try-catch**
   ```typescript
   try {
     await notifyKioskConnected(accountId, userName)
   } catch (error) {
     console.error('Failed:', error)
     // Continue with main operation
   }
   ```

2. **Use descriptive messages**
   - Include user name when relevant
   - Be specific about what happened
   - Keep it user-friendly

3. **Use appropriate notification types**
   - Don't create custom types
   - Use existing kiosk notification types

### ❌ DON'T

1. **Don't block operations**
   ```typescript
   // Bad
   const success = await notifyKioskConnected(...)
   if (!success) throw new Error("Notification failed")
   
   // Good
   notifyKioskConnected(...).catch(err => console.error(err))
   ```

2. **Don't create notifications for heartbeats**
   - Too many notifications
   - Heartbeats are background operations

3. **Don't throw errors**
   - Notification service catches and logs errors
   - Never propagate notification errors

---

## Monitoring

### Check Notifications in Firebase Console

1. Open Firebase Console
2. Navigate to Firestore Database
3. Open `notifications` collection
4. Filter by `source == "kiosk"`
5. Verify fields are correct

### Check Notifications in Web Dashboard

1. Log into web dashboard
2. Click bell icon in header
3. Look for kiosk notifications
4. Verify icons and messages display correctly

---

## Future Enhancements

### Possible Additional Notifications:

1. **Batch Started on Kiosk**
   ```typescript
   notifyBatchStarted(accountId, batchId)
   // "Batch B-679622-1234 started on kiosk"
   ```

2. **Calibration Completed on Kiosk**
   ```typescript
   notifyCalibrationComplete(accountId, component)
   // "HX711 calibration completed on kiosk"
   ```

3. **Error Occurred on Kiosk**
   ```typescript
   notifyKioskError(accountId, errorMessage)
   // "Kiosk encountered an error: [error message]"
   ```

---

## Summary

| Event | Notification Type | Icon | Color | When |
|-------|------------------|------|-------|------|
| User logs in | `kiosk_connected` | monitor | Blue | On login |
| User logs out | `kiosk_disconnected` | monitor | Gray | On logout |
| Network recovers | `kiosk_network_recovered` | wifi | Green | On reconnect |
| Session timeout | `kiosk_session_timeout` | alert | Red | Cloud Function |

**Key Points:**
- ✅ Uses same Firestore structure as web dashboard
- ✅ Non-blocking - never stops kiosk operations
- ✅ Always enabled - cannot be disabled by users
- ✅ Real-time - appears instantly on web dashboard
- ✅ Source-tracked - includes "kiosk" source field

---

**Last Updated:** December 2025  
**Version:** 1.0

