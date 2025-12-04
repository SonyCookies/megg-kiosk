# MEGG Kiosk Next.js Frontend - Source Code Documentation

This is a Next.js 15 application with React 19, designed as a kiosk interface for an egg sorting and quality detection system. The application integrates with IoT hardware via WebSocket, uses Firebase for data persistence, and Roboflow for AI-powered egg defect detection.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Services](#core-services)
4. [Context Providers](#context-providers)
5. [Main Application](#main-application)
6. [Components](#components)
7. [Configuration](#configuration)
8. [API Routes](#api-routes)
9. [Getting Started](#getting-started)

---

## Project Overview

The application is built for a 5" landscape display kiosk that manages:
- **Egg Sorting**: Real-time sorting of eggs by size (small, medium, large) and quality (good, dirty, cracked)
- **Batch Management**: Track and manage batches of processed eggs
- **Camera Integration**: Live camera feed with AI-powered defect detection using Roboflow
- **IoT Communication**: WebSocket-based communication with Arduino/ESP32 hardware
- **Calibration**: Hardware component calibration (UNO, HX711, NEMA23, SG90, MG996R)
- **Account Management**: Multi-account support with Firebase authentication

---

## Architecture

### Technology Stack

- **Framework**: Next.js 15.3.0 with App Router
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 3.4.0
- **Database**: Firebase Firestore with offline persistence
- **Real-time Communication**: WebSocket (custom IoT service)
- **AI/ML**: Roboflow API for defect detection
- **State Management**: React Context API + Custom hooks
- **Type Safety**: TypeScript 5.9.2

### Project Structure

```
kiosk-next-frontend/
├── app/
│   ├── api/                    # Next.js API routes
│   │   └── roboflow/          # Roboflow proxy endpoint
│   ├── components/             # React components
│   │   ├── MainTab.tsx        # Main sorting control interface
│   │   ├── CameraTab.tsx      # Camera feed and capture
│   │   ├── BatchTab.tsx       # Batch management
│   │   ├── ConfigurationTab.tsx # Egg size range configuration
│   │   ├── CalibrationTab.tsx # Hardware calibration
│   │   ├── AccountTab.tsx     # Account login/management
│   │   └── [modals]           # Modal components
│   ├── contexts/              # React Context providers
│   │   ├── CameraContext.tsx  # Camera state management
│   │   └── NetworkContext.tsx # Network status monitoring
│   ├── services/              # Business logic services
│   │   ├── iotService.ts      # WebSocket IoT communication
│   │   ├── roboflowService.ts # Roboflow API integration
│   │   ├── accountService.ts  # Account management
│   │   ├── batchService.ts    # Batch CRUD operations
│   │   ├── calibrationService.ts # Calibration data management
│   │   └── userService.ts     # User data operations
│   ├── libs/                   # Library configurations
│   │   └── firebaseConfig.ts  # Firebase initialization
│   ├── config/                 # Configuration files
│   │   └── roboflow.ts        # Roboflow API configuration
│   ├── utils/                  # Utility functions
│   │   └── configurationService.ts # Configuration management
│   ├── page.tsx               # Main application page
│   └── layout.tsx             # Root layout
├── public/                     # Static assets
└── package.json               # Dependencies
```

---

## Core Services

### IoT Service (`app/services/iotService.ts`)

**Purpose**: Manages WebSocket connection to IoT backend (Arduino/ESP32) for real-time hardware communication.

**Key Features**:
- WebSocket connection management with auto-reconnect
- Event-based message handling
- Sorting control (START, STOP, START_PLAIN)
- Component calibration requests
- Configuration synchronization
- Quality decision transmission

```typescript
// WebSocket-based IoT communication service
// Handles real-time communication with Arduino/ESP32 hardware backend
class IoTService {
  private websocket: WebSocket | null = null
  private wsUrl: string
  private messageHandlers: Map<string, Function[]> = new Map()
  
  // Connect to IoT backend WebSocket server
  async connect(): Promise<boolean>
  
  // Start egg sorting process (with quality detection)
  async startSorting(): Promise<{ success: boolean; message?: string; error?: string }>
  
  // Start plain sorting (without quality detection)
  async startPlainSorting(): Promise<{ success: boolean; message?: string; error?: string }>
  
  // Stop sorting process
  async stopSorting(): Promise<{ success: boolean; message?: string; error?: string }>
  
  // Send configuration to IoT backend
  async sendConfiguration(payload: {
    accountId: string
    configurations: any
    metadata?: any
    uid?: string
  }): Promise<{ success: boolean; accountId?: string; error?: string }>
  
  // Request hardware component calibration
  async calibrateComponent(component: string): Promise<CalibrationResponse>
  
  // Send quality decision (GOOD/BAD) to hardware
  async sendQuality(quality: 'GOOD' | 'BAD'): Promise<boolean>
  
  // Event system for message handling
  on(event: string, callback: Function)
  off(event: string, callback: Function)
}
```

**Message Types Handled**:
- `egg_processed`: Egg weight and size classification from hardware
- `sorting_progress`: Real-time sorting progress updates
- `sorting_result`: Sorting operation completion
- `calibration_result`: Hardware calibration results
- `system_status`: System and Arduino connection status

---

### Roboflow Service (`app/services/roboflowService.ts`)

**Purpose**: Integrates with Roboflow API for AI-powered egg defect detection (good, cracked, dirty).

**Key Features**:
- Image capture and base64 encoding
- Roboflow workflow API integration
- Server-side proxy for API key security
- Client-side direct calls (optional)
- Prediction result parsing

```typescript
// Roboflow API service for egg defect detection
// Uses Roboflow serverless workflow API to classify egg quality
export class RoboflowService {
  // Predict egg defect from image data
  // Input: Base64 encoded image (data URL format)
  // Output: Prediction result with class (good/cracked/dirty) and confidence
  async predictDefect(imageData: string): Promise<{ 
    prediction: string; 
    confidence: number 
  } | null>
  
  // Test connection to Roboflow API
  async testConnection(): Promise<boolean>
}
```

**Workflow**:
1. Capture frame from camera video element
2. Convert to base64 JPEG
3. Send to Roboflow API (via proxy or direct)
4. Parse prediction response
5. Return quality classification

---

### Account Service (`app/services/accountService.ts`)

**Purpose**: Manages user account state and authentication using Firebase.

**Key Features**:
- Account ID persistence (localStorage)
- User data fetching from Firestore
- React hook integration (`useAccount`)
- UID management for user tracking

```typescript
// Account management service with React hook integration
// Handles account loading, persistence, and state management
class AccountService {
  // Load account by account ID (format: MEGG-XXXXXX)
  async loadAccount(accountId: string): Promise<boolean>
  
  // Clear current account
  clearAccount()
  
  // Ensure account has UID for tracking
  async ensureUID(): Promise<boolean>
}

// React hook for account state
export function useAccount() {
  return {
    accountId: string | null
    userData: any | null
    isLoading: boolean
    error: string | null
    loadAccount: (accountId: string) => Promise<boolean>
    clearAccount: () => void
    ensureUID: () => Promise<boolean>
  }
}
```

---

### Batch Service (`app/services/batchService.ts`)

**Purpose**: Manages batch data in Firebase Firestore for tracking egg processing sessions.

**Key Features**:
- Batch creation with auto-generated IDs
- Atomic statistics increment (offline-friendly)
- Batch status management (idle, ready, processing, completed)
- Account-scoped batch queries

```typescript
// Firebase batch data management service
// Handles CRUD operations for egg processing batches
class BatchService {
  // Create new batch with stats tracking
  async createBatch(
    batchId: string,
    accountId: string,
    uid: string,
    name: string
  ): Promise<BatchData | null>
  
  // Get batch by ID
  async getBatch(batchId: string): Promise<BatchData | null>
  
  // Atomically increment batch statistics (thread-safe)
  async incrementBatchStats(
    batchId: string,
    deltas: Partial<BatchData['stats']>
  ): Promise<boolean>
  
  // Update batch status
  async updateBatchStatus(
    batchId: string,
    status: 'idle' | 'ready' | 'processing' | 'completed'
  ): Promise<boolean>
  
  // Get batches for account (with limit)
  async getBatchesForAccount(
    accountId: string,
    limitCount: number = 10
  ): Promise<BatchData[]>
}
```

**Batch Data Structure**:
```typescript
interface BatchData {
  id: string                    // Format: B-XXXXXX-YYYY
  accountId: string             // MEGG-XXXXXX
  uid: string                   // Firebase user UID
  name: string                  // Display name
  status: 'idle' | 'ready' | 'processing' | 'completed'
  stats: {
    totalEggs: number
    smallEggs: number
    mediumEggs: number
    largeEggs: number
    goodEggs: number
    dirtyEggs: number
    badEggs: number
  }
  createdAt: string
  updatedAt: string
}
```

---

### Configuration Service (`app/utils/configurationService.ts`)

**Purpose**: Manages egg size range configuration with multi-tier fallback (user → global → local).

**Key Features**:
- User-specific configuration storage
- Global default configuration
- LocalStorage fallback
- Range validation (gaps and overlaps)
- Automatic range suggestions

```typescript
// Configuration management with multi-tier fallback
// Priority: User Config → Global Default → localStorage → Hardcoded Defaults
export interface EggSizeRanges {
  small: { min: number; max: number }
  medium: { min: number; max: number }
  large: { min: number; max: number }
}

// Get configuration with automatic fallback
async function getConfigurationWithFallback(accountId: string): Promise<{
  ranges: EggSizeRanges
  source: 'user' | 'global' | 'local'
  isCustomized: boolean
}>

// Save user configuration (Firebase + localStorage backup)
async function saveConfigurationWithFallback(
  accountId: string, 
  eggRanges: EggSizeRanges
): Promise<void>

// Validate ranges for gaps and overlaps
function validateRanges(ranges: EggSizeRanges): RangeValidation
```

**Default Ranges**:
- Small: 35g - 42g
- Medium: 43g - 50g
- Large: 51g - 58g

---

## Context Providers

### Camera Context (`app/contexts/CameraContext.tsx`)

**Purpose**: Provides shared camera state and frame capture functionality across components.

```typescript
// Camera context for shared video element management
// Allows components to register video elements and capture frames
export function CameraProvider({ children }: { children: React.ReactNode })

export function useCamera(): {
  registerVideo: (video: HTMLVideoElement | null) => void
  captureFrame: () => string | null  // Returns base64 data URL
  isReady: boolean                    // Camera ready state
}
```

**Usage**:
- Components register video elements via `registerVideo()`
- Frame capture available via `captureFrame()` (returns base64 JPEG)
- Used by Roboflow service for defect detection

---

### Network Context (`app/contexts/NetworkContext.tsx`)

**Purpose**: Monitors internet and LAN connectivity status.

```typescript
// Network connectivity monitoring context
// Tracks internet and local network (LAN) connection status
export function NetworkProvider({ children }: NetworkProviderProps)

export function useInternetConnection(): {
  internet: boolean  // Internet connectivity
  lan: boolean      // Local network connectivity
}

export function useWebSocket(): {
  sendMessage: (message: Record<string, unknown>) => void
  lastMessage: Record<string, unknown> | null
  readyState: number  // WebSocket ready state
}
```

**Connectivity Checks**:
- Internet: Tests against Google (8.8.8.8) and Cloudflare (1.1.1.1)
- LAN: Tests against local backend health endpoint
- Auto-reconnection on connection loss

---

## Main Application

### Main Page (`app/page.tsx`)

**Purpose**: Root application component that orchestrates all features and manages global state.

**Key Responsibilities**:
- Tab navigation (Main, Camera, Batch, Configuration, Calibration, Account)
- IoT connection management
- Egg processing pipeline
- Batch and account state management
- Real-time sorting control

**State Management**:
```typescript
// Global application state
const [activeTab, setActiveTab] = useState<'main' | 'camera' | ...>()
const [isSorting, setIsSorting] = useState(false)
const [currentBatch, setCurrentBatch] = useState<any>(null)
const [eggRanges, setEggRanges] = useState<EggSizeRanges>({...})
const [recentEggs, setRecentEggs] = useState<[...]>([])
```

**Egg Processing Flow**:
1. Hardware sends weight measurement via `sorting_progress`
2. Hardware classifies size (small/medium/large/bad)
3. Hardware requests quality decision (`SORT_READY`)
4. Camera captures frame and sends to Roboflow
5. Frontend sends quality decision (`GOOD`/`BAD`)
6. Egg persisted to Firebase with full metadata
7. Batch statistics updated atomically

**Key Functions**:
```typescript
// Persist egg to Firebase and update UI
const persistEgg = async (
  weight: number | null, 
  classification: 'small'|'medium'|'large'|'bad',
  options?: { qualityLabel?: 'good'|'dirty'|'cracked' }
)

// Start sorting with quality detection
const handleStartSorting = async () => {
  // 1. Send configuration to IoT backend
  // 2. Start sorting process
  // 3. Listen for egg_processed events
}

// Start plain sorting (no quality detection)
const handleStartPlainSorting = async () => {
  // Similar to handleStartSorting but uses START_PLAIN command
}

// Send quality decision to hardware
const sendQualityDecision = async (quality: 'GOOD'|'BAD') => {
  // Sends QUALITY command and persists egg
}
```

---

## Components

### MainTab (`app/components/MainTab.tsx`)

**Purpose**: Primary control interface for starting/stopping sorting operations.

**Features**:
- Large touch-friendly buttons for START/STOP
- Batch status display
- Egg history modal
- Recent eggs display

```typescript
// Main sorting control interface
// Provides large buttons for START SORTING, START PLAIN SORTING, and STOP
export default function MainTab({
  iotConnected: boolean
  isSorting: boolean
  onStartSorting: () => void
  onStartPlainSorting?: () => void
  onStopSorting: () => void
  currentBatch: { id?: string; name?: string } | null
  recentEggs: Array<{...}>
  eggHistory: Array<{...}>
})
```

---

### CameraTab (`app/components/CameraTab.tsx`)

**Purpose**: Camera feed display with frame capture and Roboflow integration.

**Features**:
- Live camera feed with mirror mode
- Fullscreen support
- Manual capture button
- Real-time defect detection results
- Auto-capture for quality decisions

```typescript
// Camera feed component with Roboflow integration
// Displays live camera feed and handles frame capture for defect detection
export default function CameraTab({
  isOnline: boolean
  isFullscreen: boolean
  onToggleFullscreen: () => void
  isHidden?: boolean
})
```

**Camera Workflow**:
1. Request camera permission via `getUserMedia()`
2. Display feed in video element
3. Register video with CameraContext
4. Capture frames on demand or automatically
5. Send to Roboflow for prediction
6. Display results overlay

---

### BatchTab (`app/components/BatchTab.tsx`)

**Purpose**: Batch creation, selection, and statistics display.

**Features**:
- Batch ID input (4-digit PIN)
- Batch statistics (total, size breakdown, quality breakdown)
- Batch status management
- Recent batches list

**Batch ID Format**: `B-{accountDigits}-{batchDigits}`

---

### ConfigurationTab (`app/components/ConfigurationTab.tsx`)

**Purpose**: Egg size range configuration interface.

**Features**:
- Edit small/medium/large ranges
- Range validation warnings
- Reset to defaults
- Configuration source indicator (user/global/local)

---

### CalibrationTab (`app/components/CalibrationTab.tsx`)

**Purpose**: Hardware component calibration interface.

**Features**:
- Calibration buttons for each component (UNO, HX711, NEMA23, SG90, MG996R)
- Real-time calibration status display
- Calibration history from Firebase

---

### AccountTab (`app/components/AccountTab.tsx`)

**Purpose**: Account login and management.

**Features**:
- 6-digit PIN input (numeric keypad)
- Account ID display (format: MEGG-XXXXXX)
- Account logout
- User data display

---

## Configuration

### Firebase Configuration (`app/libs/firebaseConfig.ts`)

**Purpose**: Firebase initialization with offline persistence.

```typescript
// Firebase initialization with offline persistence
// Enables multi-tab IndexedDB persistence for offline support
import { initializeApp } from "firebase/app"
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore"

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Enable offline persistence (non-blocking)
enableMultiTabIndexedDbPersistence(db).catch(() => {
  enableIndexedDbPersistence(db).catch(() => {})
})
```

**Environment Variables**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

---

### Roboflow Configuration (`app/config/roboflow.ts`)

**Purpose**: Roboflow API configuration.

```typescript
// Roboflow API configuration
// Defines workspace, workflow, and API endpoint settings
export const ROBOFLOW_CONFIG = {
  API_KEY: process.env.ROBOFLOW_API_KEY || process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || ""
  WORKSPACE_NAME: process.env.NEXT_PUBLIC_ROBOFLOW_WORKSPACE || "meggtech"
  WORKFLOW_ID: process.env.NEXT_PUBLIC_ROBOFLOW_WORKFLOW_ID || "meggworkflow"
  API_URL: "https://serverless.roboflow.com"
  TIMEOUT: 30000  // 30 seconds
}
```

---

### Next.js Configuration (`next.config.js`)

**Purpose**: Next.js build and runtime configuration.

```javascript
// Next.js configuration for kiosk deployment
// Optimized for standalone output and Electron compatibility
const nextConfig = {
  images: {
    unoptimized: true  // Disable image optimization for kiosk
  },
  assetPrefix: '/',
  output: 'standalone',  // Standalone build for Docker
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false  // Disable Node.js fs module for browser
    }
    return config
  }
}
```

---

## API Routes

### Roboflow Proxy (`app/api/roboflow/route.ts`)

**Purpose**: Server-side proxy for Roboflow API to keep API key secure.

```typescript
// Roboflow API proxy endpoint
// Keeps API key server-side to prevent client exposure
export async function POST(request: Request) {
  // 1. Extract imageBase64 from request
  // 2. Call Roboflow workflow API with server-side API key
  // 3. Return prediction results
  // 4. Handle errors and timeouts
}
```

**Request Format**:
```json
{
  "imageBase64": "base64_encoded_image_string"
}
```

**Response Format**:
```json
{
  "outputs": [{
    "predictions": {
      "predictions": [{
        "class": "good" | "cracked" | "dirty",
        "confidence": 0.95
      }],
      "top": "good",
      "confidence": 0.95
    }
  }]
}
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase project with Firestore enabled
- Roboflow account and workflow
- IoT backend WebSocket server (Arduino/ESP32)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp env.template .env.local

# Configure environment variables
# - Firebase credentials
# - Roboflow API key
# - IoT backend WebSocket URL
```

### Environment Variables

Create `.env.local` with:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Roboflow
ROBOFLOW_API_KEY=your_roboflow_api_key
NEXT_PUBLIC_ROBOFLOW_WORKSPACE=your_workspace
NEXT_PUBLIC_ROBOFLOW_WORKFLOW_ID=your_workflow_id

# IoT Backend
NEXT_PUBLIC_IOT_BACKEND_HOST=localhost
NEXT_PUBLIC_IOT_BACKEND_PORT=8765
```

### Development

```bash
# Start development server
npm run dev

# Start with Electron
npm run start-electron
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:compose

# Run in detached mode
npm run docker:compose:detached
```

---

## Key Features Explained

### Egg Processing Pipeline

1. **Weight Measurement**: Hardware (HX711) measures egg weight
2. **Size Classification**: Hardware classifies based on configured ranges
3. **Quality Detection Request**: Hardware sends `SORT_READY` when quality check needed
4. **Camera Capture**: Frontend captures frame from camera feed
5. **AI Prediction**: Frame sent to Roboflow for defect detection
6. **Quality Decision**: Frontend sends `GOOD` or `BAD` to hardware
7. **Persistence**: Egg data saved to Firebase with full metadata
8. **Statistics Update**: Batch statistics updated atomically

### Offline Support

- Firebase Firestore offline persistence enabled
- LocalStorage fallback for configuration
- Queue-based batch statistics updates
- Graceful degradation when offline

### Real-time Updates

- WebSocket connection for hardware communication
- Real-time batch statistics
- Live camera feed
- Instant UI updates on egg processing

---

## Troubleshooting

### IoT Connection Issues

- Check WebSocket URL in environment variables
- Verify IoT backend is running
- Check network connectivity
- Review browser console for WebSocket errors

### Camera Issues

- Ensure camera permissions granted
- Check browser compatibility (Chrome/Edge recommended)
- Verify camera device availability
- Check for conflicting applications

### Firebase Issues

- Verify environment variables
- Check Firestore security rules
- Ensure offline persistence enabled
- Review network connectivity

### Roboflow Issues

- Verify API key configuration
- Check workflow ID and workspace name
- Ensure internet connectivity
- Review API rate limits

---

## Complete Source Code

This section contains the complete source code for all important files in the project.

### Main Application Page (`app/page.tsx`)

```typescript
// kiosk-next-frontend/app/page.tsx
"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { 
  Camera, 
  User,
  Package,
  Settings,
  Target,
  RefreshCw,
  Play
} from "lucide-react"

import { useInternetConnection, useWebSocket } from "./contexts/NetworkContext"
import { CameraProvider, useCamera } from "./contexts/CameraContext"
import { db } from './libs/firebaseConfig'
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore'
import iotService from './services/iotService'
import calibrationService from './services/calibrationService'
import { useAccount } from './services/accountService'
import { useCalibrationStatus } from './services/calibrationManager'
import batchService from './services/batchService'
import { roboflowService } from './services/roboflowService'
import { 
  getConfigurationWithFallback, 
  saveConfigurationWithFallback, 
  deleteUserConfiguration,
  EggSizeRanges,
  validateRanges,
  getNextRangeType,
  RangeValidation
} from './utils/configurationService'

// Import tab components
import CameraTab from "./components/CameraTab"
import BatchTab from "./components/BatchTab"
import ConfigurationTab from "./components/ConfigurationTab"
import CalibrationTab from "./components/CalibrationTab"
import AccountTab from "./components/AccountTab"
import MainTab from "./components/MainTab"

// Import modal components
import PinModal from "./components/PinModal"
import RangeModal from "./components/RangeModal"
import BatchModal from "./components/BatchModal"
import Toaster from "./components/Toaster"

function HomeInner() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'main' | 'camera' | 'configuration' | 'account' | 'batch' | 'calibration'>('camera')
  const [isProcessing, setIsProcessing] = useState(false)
  const [systemPhase, setSystemPhase] = useState<'idle' | 'getting_ready' | 'load_eggs' | 'ready_to_process' | 'processing'>('idle')
  const [isSorting, setIsSorting] = useState(false)
  const [isPlainSortingMode, setIsPlainSortingMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    goodEggs: 0,
    badEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0
  })
  const [recentEggs, setRecentEggs] = useState<{ eggId: string; weight: number | null; size: 'small'|'medium'|'large'|null; quality: 'good'|'dirty'|'cracked' }[]>([])
  const [eggHistory, setEggHistory] = useState<{ eggId: string; weight: number | null; size: 'small'|'medium'|'large'|null; quality: 'good'|'dirty'|'cracked'; createdAt: string }[]>([])
  const lastWeightRef = useRef<number | null>(null)
  const lastProcessedAtRef = useRef<number>(0)
  const lastProcessedWeightRef = useRef<number | null>(null)
  const [waitingForQuality, setWaitingForQuality] = useState(false)
  const pendingWeightRef = useRef<number | null>(null)
  const { captureFrame, isReady: isCameraReady } = useCamera()

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Account management using clean service
  const {
    accountId: currentAccountId,
    userData,
    isLoading: isLoadingUser,
    error: accountError,
    loadAccount,
    clearAccount,
    ensureUID
  } = useAccount()

  // Calibration status management using clean service
  const {
    status: calibrationStatus,
    updateStatus: updateCalibrationStatus,
    saveCalibrationResult: saveCalibrationToFirebase,
    loadFromFirebase: loadCalibrationFromFirebase
  } = useCalibrationStatus()

  // UI states
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  // Configuration states
  const [showRangeModal, setShowRangeModal] = useState(false)
  const [editingRange, setEditingRange] = useState<'small' | 'medium' | 'large' | null>(null)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [eggRanges, setEggRanges] = useState<EggSizeRanges>({
    small: { min: 35, max: 42 },
    medium: { min: 43, max: 50 },
    large: { min: 51, max: 58 }
  })
  const [configSource, setConfigSource] = useState<'user' | 'global' | 'local'>('local')
  const [isCustomized, setIsCustomized] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [rangeValidation, setRangeValidation] = useState<RangeValidation | null>(null)
  const [showGapWarning, setShowGapWarning] = useState(false)
  const [currentInputField, setCurrentInputField] = useState<'min' | 'max'>('min')
  const [isSavingRange, setIsSavingRange] = useState(false)

  // Batch states
  const [currentBatch, setCurrentBatch] = useState<any>(null)
  const [batchStatus, setBatchStatus] = useState<'idle' | 'ready' | 'processing' | 'completed'>('idle')
  const [batchStats, setBatchStats] = useState({
    totalEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0,
    goodEggs: 0,
    dirtyEggs: 0,
    badEggs: 0
  })
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false)
  const [batchIdInput, setBatchIdInput] = useState('')
  const [batchIdError, setBatchIdError] = useState('')
  const [existingBatch, setExistingBatch] = useState<any>(null)
  const [isCheckingBatch, setIsCheckingBatch] = useState(false)
  const [activeStatsView, setActiveStatsView] = useState<'overview' | 'size' | 'quality'>('overview')

  // Calibration states
  const [isCalibratingUno, setIsCalibratingUno] = useState(false)
  const [isCalibratingHX711, setIsCalibratingHX711] = useState(false)
  const [isCalibratingNema23, setIsCalibratingNema23] = useState(false)
  const [isCalibratingSG90, setIsCalibratingSG90] = useState(false)
  const [isCalibratingMG996R, setIsCalibratingMG996R] = useState(false)
  const [toaster, setToaster] = useState<{
    show: boolean
    type: 'success' | 'error' | 'info'
    message: string
  }>({ show: false, type: 'info', message: '' })

  // IoT connection state
  const [iotConnected, setIotConnected] = useState(false)

  // Load calibration data when account changes
  useEffect(() => {
    if (currentAccountId) {
      loadCalibrationFromFirebase(currentAccountId)
    }
  }, [currentAccountId, loadCalibrationFromFirebase])

  // Load batches when account ID changes
  const loadBatches = async (accountId: string) => {
    if (!accountId) return
    
    try {
      const batches = await batchService.getBatchesForAccount(accountId, 5)
      if (batches.length > 0) {
        // Optionally set the most recent batch as current
      }
    } catch (error) {
      console.error('Error loading batches:', error)
    }
  }

  useEffect(() => {
    if (currentAccountId) {
      loadBatches(currentAccountId)
    }
  }, [currentAccountId])

  // Set initial tab based on account status
  useEffect(() => {
    if (currentAccountId && userData) {
      setActiveTab('main')
    } else if (!isLoadingUser) {
      setActiveTab('account')
    }
  }, [currentAccountId, userData, isLoadingUser])

  // Network status
  const isOnline = useInternetConnection()
  const { readyState } = useWebSocket()
  const isWebSocketConnected = readyState === WebSocket.OPEN

  // Entrance fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // IoT connection management
  useEffect(() => {
    const connectIoT = async () => {
      try {
        await iotService.connect()
        setIotConnected(true)
        
        setTimeout(async () => {
          try {
            const status = await iotService.getSystemStatus()
          } catch (error) {
            console.error('Failed to get initial system status:', error)
          }
        }, 2000)
      } catch (error) {
        console.error('Failed to connect to IoT backend:', error)
        setIotConnected(false)
      }
    }

    const handleConnected = () => {
      setIotConnected(true)
    }

    const handleDisconnected = () => {
      setIotConnected(false)
    }

    const handleCalibrationResult = async (data: any) => {
      if (data.component && data.status) {
        const component = data.component.toUpperCase()
        
        let frontendStatus: 'unknown' | 'calibrated' | 'calibrating' | 'failed'
        
        if (data.status === 'completed') {
          frontendStatus = 'calibrated'
        } else if (data.status === 'started') {
          frontendStatus = 'calibrating'
        } else if (data.status === 'failed') {
          frontendStatus = 'failed'
        } else {
          frontendStatus = 'unknown'
        }
        
        const timestamp = (data.status === 'completed' || data.status === 'failed') ? 
                         new Date().toISOString() : undefined
        
        updateCalibrationStatus(component, frontendStatus, timestamp)
      }
      
      if (currentAccountId) {
        try {
          const component = data.component.toUpperCase()
          const status = data.status === 'completed' ? 'calibrated' : 
                        data.status === 'started' ? 'calibrating' : 
                        data.status === 'failed' ? 'failed' : 'unknown'
          
          await saveCalibrationToFirebase(
            component,
            status,
            data.success || false,
            data.message || `${component} calibration ${data.success ? 'completed' : 'failed'}`
          )
          
          await ensureUID()
          
        } catch (error) {
          console.error('Failed to save calibration result to Firebase:', error)
          showToaster('error', 'Failed to save calibration result to Firebase.')
        }
      } else {
        showToaster('info', 'Calibration completed! Enter your Account ID to save results to Firebase.')
      }
      
      if (data.status === 'completed') {
        if (data.success) {
          showToaster('success', data.message || `${data.component} calibration completed successfully`)
        } else {
          showToaster('error', data.message || `${data.component} calibration failed`)
        }
        resetCalibrationState(data.component)
      } else if (data.status === 'failed' || !data.success) {
        showToaster('error', data.message || `${data.component} calibration failed: ${data.error || 'Unknown error'}`)
        resetCalibrationState(data.component)
      }
    }

    connectIoT()

    iotService.on('connected', handleConnected)
    iotService.on('disconnected', handleDisconnected)
    iotService.on('calibrationResult', handleCalibrationResult)
    iotService.on('sorting_result', onSortingResult)
    iotService.on('plain_sorting_result', onSortingResult)
    iotService.on('sorting_progress', onSortingProgress)
    iotService.on('sorting_stop_result', onSortingStopResult)

    return () => {
      iotService.off('connected', handleConnected)
      iotService.off('disconnected', handleDisconnected)
      iotService.off('calibrationResult', handleCalibrationResult)
      iotService.off('sorting_result', onSortingResult)
      iotService.off('plain_sorting_result', onSortingResult)
      iotService.off('sorting_progress', onSortingProgress)
      iotService.off('sorting_stop_result', onSortingStopResult)
      iotService.disconnect()
    }
  }, [currentAccountId, updateCalibrationStatus, saveCalibrationToFirebase, ensureUID])

  const onSortingResult = useCallback((data: any) => {
    if (data?.error) {
      showToaster('error', data.error)
    } else if (data?.message) {
      showToaster('info', data.message)
    }
  }, [])

  const persistEgg = useCallback(async (weight: number | null, classification: 'small'|'medium'|'large'|'bad', options?: { bypassDedup?: boolean, qualityLabel?: 'good'|'dirty'|'cracked' }) => {
    const now = Date.now()
    if (!options?.bypassDedup && typeof weight === 'number' && lastProcessedWeightRef.current === weight && (now - lastProcessedAtRef.current) < 1500) {
      console.log('[UI] Skipping duplicate egg (same weight within 1.5s):', weight)
      return
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : new Uint8Array(8).map(() => Math.floor(Math.random()*256))
    const eggId = Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('')

    const qualityLabel: 'good'|'dirty'|'cracked' = options?.qualityLabel
      ? options.qualityLabel
      : (classification === 'bad' ? 'cracked' : 'good')
    let computedSize: 'small'|'medium'|'large'|null = null
    if (typeof weight === 'number') {
      const w = weight
      if (w < eggRanges.small.min) {
        computedSize = 'small'
      } else if (w > eggRanges.large.max) {
        computedSize = 'large'
      } else if (w >= eggRanges.small.min && w <= eggRanges.small.max) {
        computedSize = 'small'
      } else if (w >= eggRanges.medium.min && w <= eggRanges.medium.max) {
        computedSize = 'medium'
      } else if (w >= eggRanges.large.min && w <= eggRanges.large.max) {
        computedSize = 'large'
      } else {
        const distToSmall = Math.abs(w - eggRanges.small.max)
        const distToMedium = Math.abs(w - eggRanges.medium.max)
        const distToLarge = Math.abs(w - eggRanges.large.min)
        const minDist = Math.min(distToSmall, distToMedium, distToLarge)
        computedSize = minDist === distToSmall ? 'small' : (minDist === distToMedium ? 'medium' : 'large')
      }
    }

    const createdAt = new Date().toISOString()
    setRecentEggs(prev => {
      const next = [{ eggId, weight, size: computedSize, quality: qualityLabel }, ...prev].slice(0, 3)
      console.log('[UI] recentEggs updated:', next)
      return next
    })
    setEggHistory(prev => [{ eggId, weight, size: computedSize, quality: qualityLabel, createdAt }, ...prev])

    lastProcessedAtRef.current = now
    lastProcessedWeightRef.current = typeof weight === 'number' ? weight : null

    const hasBatch = !!currentBatch?.id
    const hasAccount = !!currentAccountId
    console.log('[IoT] persistEgg context', { hasBatch, batchId: currentBatch?.id, hasAccount, accountId: currentAccountId, weight, classification, computedSize, quality: qualityLabel })
    if (!hasBatch || !hasAccount) {
      console.warn('[IoT] Skipping persist (no batch/account). Showing in UI only.')
      return
    }

    console.log('[IoT] processing egg', { weight, size: computedSize, quality: qualityLabel, accountId: currentAccountId, batchId: currentBatch.id, eggId })

    let nextStats: typeof batchStats
    setBatchStats(prev => {
      nextStats = {
        ...prev,
        totalEggs: (prev.totalEggs || 0) + 1,
        smallEggs: prev.smallEggs + (computedSize === 'small' ? 1 : 0),
        mediumEggs: prev.mediumEggs + (computedSize === 'medium' ? 1 : 0),
        largeEggs: prev.largeEggs + (computedSize === 'large' ? 1 : 0),
        goodEggs: (prev.goodEggs || 0) + (qualityLabel === 'good' ? 1 : 0),
        dirtyEggs: (prev.dirtyEggs || 0) + (qualityLabel === 'dirty' ? 1 : 0),
        badEggs: (prev.badEggs || 0) + (qualityLabel === 'cracked' ? 1 : 0),
      }
      return nextStats
    })

    try {
      const eggDoc = {
        accountId: currentAccountId,
        batchId: currentBatch.id,
        eggId,
        weight,
        size: computedSize,
        quality: qualityLabel,
        createdAt: new Date().toISOString(),
      }
      console.log('[Firestore] Saving egg (idempotent)...', eggDoc)
      await setDoc(doc(db, 'eggs', eggId), eggDoc)
      console.log('[Firestore] Egg saved with fixed docId:', eggId)
    } catch (e) {
      console.error('[Firestore] Failed to save egg document', e)
    }

    try {
      const deltas = {
        totalEggs: 1,
        smallEggs: computedSize === 'small' ? 1 : 0,
        mediumEggs: computedSize === 'medium' ? 1 : 0,
        largeEggs: computedSize === 'large' ? 1 : 0,
        goodEggs: qualityLabel === 'good' ? 1 : 0,
        dirtyEggs: qualityLabel === 'dirty' ? 1 : 0,
        badEggs: qualityLabel === 'cracked' ? 1 : 0,
      }
      console.log('[Firestore] Incrementing batch stats for', currentBatch.id, deltas)
      await batchService.incrementBatchStats(currentBatch.id, deltas)
      console.log('[Firestore] Batch stats increment queued/applied for', currentBatch.id)
    } catch (e) {
      console.error('[Firestore] Failed to update batch stats', e)
    }
  }, [currentBatch, currentAccountId])

  const onEggProcessed = useCallback(async (data: any) => {
    try {
      if (!data || !currentBatch?.id || !currentAccountId) return
      const weight = typeof data.weight === 'number' ? data.weight : null
      const sizeRaw = (data.size || '').toString().toLowerCase()
      const size: 'small'|'medium'|'large'|'bad' =
        sizeRaw.includes('small') ? 'small' :
        sizeRaw.includes('medium') ? 'medium' :
        sizeRaw.includes('large') ? 'large' : 'bad'
      console.log('[IoT] egg_processed received', { weight, size })
      await persistEgg(weight, size)
    } catch (err) {
      console.error('Failed to handle egg_processed:', err)
    }
  }, [currentBatch, currentAccountId, persistEgg])

  useEffect(() => {
    iotService.on('egg_processed', onEggProcessed)
    return () => {
      iotService.off('egg_processed', onEggProcessed)
    }
  }, [onEggProcessed])

  const onSortingProgress = useCallback(async (data: any) => {
    if (!data?.message) return
    const line: string = data.message
    console.log('[IoT][progress]', line)
    if (line.startsWith('HX711: Weight measured:')) {
      const parts = line.split(':').pop()!.trim().split(' ')
      const w = parseFloat(parts[0])
      if (!isNaN(w)) {
        lastWeightRef.current = w
        console.log('[IoT] parsed weight from sorting_progress:', w)
        if (isPlainSortingMode) {
          try {
            console.log('[Plain] Persisting on HX711 weight event', { weight: w })
            await persistEgg(w, 'small')
          } catch (e) {
            console.error('[Plain] Persist on weight failed', e)
          }
        }
      }
    } else if (
      (line.startsWith('SORT: Egg (') && line.includes('classified as')) ||
      (line.startsWith('SORT:') && line.includes('=>'))
    ) {
      let sizeText = ''
      if (line.includes('classified as')) {
        sizeText = line.split('classified as').pop()!.trim().toLowerCase()
      } else if (line.includes('=>')) {
        sizeText = line.split('=>').pop()!.trim().toLowerCase()
      }
      const size: 'small'|'medium'|'large'|'bad' =
        sizeText.includes('small') ? 'small' :
        sizeText.includes('medium') ? 'medium' :
        sizeText.includes('large') ? 'large' : 'bad'
      const weight = lastWeightRef.current
      console.log('[IoT] classification detected from sorting_progress:', { weight, size, plain: isPlainSortingMode })
      if (isPlainSortingMode) {
        try {
          console.log('[Plain] Persisting egg immediately', { weight, size })
          await persistEgg(typeof weight === 'number' ? weight : null, size)
          console.log('[Plain] Persist queued: recentEggs/UI updated and Firebase setDoc/increment queued')
        } catch (e) {
          console.error('[UI] Failed to persist egg in plain mode', e)
        }
      }
    } else if (line.startsWith('SORT_READY')) {
      pendingWeightRef.current = lastWeightRef.current
      setWaitingForQuality(true)
      console.log('[IoT] SORT_READY received. Waiting for QUALITY decision. Pending weight:', pendingWeightRef.current)
    }
  }, [persistEgg, isPlainSortingMode])

  const sendQualityDecision = useCallback(async (quality: 'GOOD'|'BAD') => {
    try {
      if (!iotService.isConnected()) {
        showToaster('error', 'IoT Backend not connected. Cannot send QUALITY.')
        return
      }
      const ok = await iotService.sendQuality(quality)
      if (!ok) {
        showToaster('error', 'Failed to send QUALITY command.')
        return
      }
      const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
      const qualityLabel: 'good'|'dirty'|'cracked' = quality === 'BAD' ? 'cracked' : 'good'
      await persistEgg(weight, quality === 'BAD' ? 'bad' : 'small', { qualityLabel })
      setWaitingForQuality(false)
      pendingWeightRef.current = null
      showToaster('success', `QUALITY ${quality} sent`)
    } catch (err) {
      console.error('Failed to handle QUALITY decision:', err)
      showToaster('error', 'Failed to handle QUALITY decision')
    }
  }, [persistEgg, iotService])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!waitingForQuality) return
      if (!isCameraReady) {
        showToaster('error', 'Camera not ready for automatic quality check. Open Camera tab to enable.')
        return
      }
      try {
        const img = captureFrame()
        if (!img) return
        const result = await roboflowService.predictDefect(img)
        if (cancelled || !result) return
        const pred = (result.prediction || '').toLowerCase()
        if (pred === 'good') {
          await sendQualityDecision('GOOD')
        } else if (pred === 'cracked') {
          const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
          const ok = await iotService.sendQuality('BAD')
          if (ok) {
            await persistEgg(weight, 'bad', { qualityLabel: 'cracked' })
            setWaitingForQuality(false)
            pendingWeightRef.current = null
            showToaster('success', 'QUALITY BAD (CRACKED) sent')
          } else {
            showToaster('error', 'Failed to send QUALITY command.')
          }
        } else if (pred === 'dirty') {
          const weight = typeof pendingWeightRef.current === 'number' ? pendingWeightRef.current : null
          const ok = await iotService.sendQuality('BAD')
          if (ok) {
            await persistEgg(weight, 'bad', { qualityLabel: 'dirty' })
            setWaitingForQuality(false)
            pendingWeightRef.current = null
            showToaster('success', 'QUALITY BAD (DIRTY) sent')
          } else {
            showToaster('error', 'Failed to send QUALITY command.')
          }
        } else {
          console.warn('[Camera] Unknown prediction class:', pred)
        }
      } catch (e) {
        console.error('[Camera] Auto decision failed', e)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [waitingForQuality, isCameraReady, captureFrame, sendQualityDecision, persistEgg])

  const onSortingStopResult = useCallback((data: any) => {
    setIsSorting(false)
    if (data?.success) {
      showToaster('success', data.message || 'Sorting stopped')
    } else if (data?.error) {
      showToaster('error', data.error)
    }
  }, [])

  useEffect(() => {
    iotService.on('sorting_result', onSortingResult)
    iotService.on('plain_sorting_result', onSortingResult)
    iotService.on('sorting_stop_result', onSortingStopResult)
    return () => {
      iotService.off('sorting_result', onSortingResult)
      iotService.off('plain_sorting_result', onSortingResult)
      iotService.off('sorting_stop_result', onSortingStopResult)
    }
  }, [onSortingResult, onSortingStopResult])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleStartSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    try {
      if (!currentBatch || !currentBatch.id) {
        showToaster('error', 'No Batch selected. Please create or select a batch in the Batch tab.')
        setActiveTab('batch')
        return
      }
      if (!currentAccountId) {
        showToaster('error', 'No Account ID. Please log in first.')
        return
      }

      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      const payload = {
        accountId: currentAccountId,
        configurations: {
          eggSizeRanges: eggRanges
        },
        metadata: {
          isCustomized,
          lastModifiedAt: new Date().toISOString()
        },
        uid: uid || undefined,
        batchId: currentBatch.id,
        currentBatch: { id: currentBatch.id, name: currentBatch.name }
      }

      const cfgResult = await iotService.sendConfiguration(payload)
      if (!cfgResult.success) {
        showToaster('error', `Failed to send configuration${cfgResult.error ? `: ${cfgResult.error}` : ''}`)
        return
      }
      showToaster('success', 'Configuration sent to IoT backend.')

      const startRes = await iotService.startSorting()
      if (!startRes.success) {
        showToaster('error', startRes.error || 'Failed to start sorting')
        return
      }
      setIsSorting(true)
      setIsPlainSortingMode(false)
      showToaster('success', startRes.message || 'Sorting started.')
    } catch (error) {
      showToaster('error', 'Failed to send START command.')
    }
  }

  const handleStopSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected.')
      return
    }
    try {
      const stopRes = await iotService.stopSorting()
      if (!stopRes.success) {
        showToaster('error', stopRes.error || 'Failed to stop sorting')
        return
      }
      setIsSorting(false)
      setIsPlainSortingMode(false)
      showToaster('info', stopRes.message || 'Stop request sent.')
    } catch (e) {
      showToaster('error', 'Failed to send STOP command.')
    }
  }

  const handleStartPlainSorting = async () => {
    if (!iotConnected) {
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    try {
      if (!currentBatch || !currentBatch.id) {
        showToaster('error', 'No Batch selected. Please create or select a batch in the Batch tab.')
        setActiveTab('batch')
        return
      }
      if (!currentAccountId) {
        showToaster('error', 'No Account ID. Please log in first.')
        return
      }

      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      const payload = {
        accountId: currentAccountId,
        configurations: {
          eggSizeRanges: eggRanges
        },
        metadata: {
          isCustomized,
          lastModifiedAt: new Date().toISOString()
        },
        uid: uid || undefined,
        batchId: currentBatch.id,
        currentBatch: { id: currentBatch.id, name: currentBatch.name }
      }

      console.log('[Plain] Sending configuration before START_PLAIN', payload)
      const cfgResult = await iotService.sendConfiguration(payload)
      if (!cfgResult.success) {
        showToaster('error', `Failed to send configuration${cfgResult.error ? `: ${cfgResult.error}` : ''}`)
        return
      }
      showToaster('success', 'Configuration sent to IoT backend.')
      console.log('[Plain] Configuration ack:', cfgResult)

      console.log('[Plain] Triggering START_PLAIN via websocket')
      const startRes = await iotService.startPlainSorting()
      if (!startRes.success) {
        showToaster('error', startRes.error || 'Failed to start plain sorting')
        return
      }
      setIsSorting(true)
      setIsPlainSortingMode(true)
      showToaster('success', startRes.message || 'Plain sorting started.')
      console.log('[Plain] START_PLAIN ack:', startRes)
    } catch (error) {
      showToaster('error', 'Failed to send START_PLAIN command.')
      console.error('[Plain] START_PLAIN failed', error)
    }
  }

  // Account functions
  const handleInputId = () => {
    setShowPinModal(true)
    setPinInput('')
    setPinError('')
    
    setTimeout(() => {
      const firstButton = document.querySelector('[data-number="1"]') as HTMLButtonElement
      if (firstButton) {
        firstButton.focus()
      }
    }, 100)
  }

  const handlePinSubmit = async () => {
    if (pinInput.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }
    
    const accountId = `MEGG-${pinInput}`
    const success = await loadAccount(accountId)
    
    if (success) {
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Account ID not found. Please check your ID and try again.')
    }
  }

  const loadConfiguration = async (accountId: string) => {
    try {
      setIsLoadingConfig(true)
      const config = await getConfigurationWithFallback(accountId)
      setEggRanges(config.ranges)
      setConfigSource(config.source)
      setIsCustomized(config.isCustomized)
      
      const validation = validateRanges(config.ranges)
      setRangeValidation(validation)
      setShowGapWarning(validation.hasGaps)
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const handlePinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setPinInput(digitsOnly)
    setPinError('')
  }

  const clearAccountId = () => {
    clearAccount()
    setActiveTab('account')
  }

  // Configuration functions
  const handleRangeEdit = (rangeType: 'small' | 'medium' | 'large') => {
    setEditingRange(rangeType)
    setCurrentInputField('min')
    
    const currentRange = eggRanges[rangeType]
    const nextRangeType = getNextRangeType(rangeType)
    
    if (nextRangeType && rangeType !== 'small') {
      const previousRangeType = rangeType === 'medium' ? 'small' : 'medium'
      const previousRange = eggRanges[previousRangeType]
      const suggestedMin = Math.round((previousRange.max + 0.01) * 100) / 100
      
      setMinInput(suggestedMin.toString())
      setMaxInput(currentRange.max.toString())
    } else {
      setMinInput(currentRange.min.toString())
      setMaxInput(currentRange.max.toString())
    }
    
    setRangeError('')
    setShowRangeModal(true)
  }

  const handleRangeSubmit = async () => {
    if (minInput.length === 0 || maxInput.length === 0) {
      setRangeError('Please enter both minimum and maximum values')
      return
    }
    
    const min = parseFloat(minInput)
    const max = parseFloat(maxInput)

    if (isNaN(min) || isNaN(max)) {
      setRangeError('Please enter valid numbers')
      return
    }
    
    if (min >= max) {
      setRangeError('Minimum must be less than maximum')
      return
    }
    
    setIsSavingRange(true)
    setRangeError('')

    try {
      if (editingRange && currentAccountId) {
        const updatedRanges = {
          ...eggRanges,
          [editingRange]: { min, max }
        }
        
        const validation = validateRanges(updatedRanges)
        setRangeValidation(validation)
        
        setEggRanges(updatedRanges)
        setIsCustomized(true)
        setConfigSource('user')
        
        await saveConfigurationWithFallback(currentAccountId, updatedRanges)
        
        if (validation.hasGaps) {
          setShowGapWarning(true)
        }
      }

      setShowRangeModal(false)
      setEditingRange(null)
      setMinInput('')
      setMaxInput('')
    } catch (error) {
      console.error('Error saving range:', error)
      setRangeError('Failed to save configuration. Please try again.')
    } finally {
      setIsSavingRange(false)
    }
  }

  const handleMinChange = (value: string) => {
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMinInput(finalValue)
    setRangeError('')
    
    if (finalValue.includes('.') && finalValue.split('.')[1].length === 2 && currentInputField === 'min') {
      setCurrentInputField('max')
    }
  }

  const handleMaxChange = (value: string) => {
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMaxInput(finalValue)
    setRangeError('')
  }

  const resetToDefaults = async () => {
    if (currentAccountId) {
      try {
        setIsLoadingConfig(true)
        await deleteUserConfiguration(currentAccountId)
        await loadConfiguration(currentAccountId)
      } catch (error) {
        console.error('Error resetting to defaults:', error)
      } finally {
        setIsLoadingConfig(false)
      }
    }
  }

  // Batch functions
  const handleBatchIdChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
    setBatchIdInput(digitsOnly)
    setBatchIdError('')
    setExistingBatch(null)
    
    if (digitsOnly.length === 4 && currentAccountId) {
      const accountDigits = currentAccountId.replace('MEGG-', '')
      const batchId = `B-${accountDigits}-${digitsOnly}`
      checkBatchExists(batchId)
    } else if (digitsOnly.length === 4 && !currentAccountId) {
      setBatchIdError('Account ID required to check batch')
    }
  }

  const checkBatchExists = async (batchId: string) => {
    if (!currentAccountId) {
      setBatchIdError('Account ID required to check batch')
      return null
    }
    
    try {
      setIsCheckingBatch(true)
      const foundBatch = await batchService.getBatch(batchId)
      
      if (foundBatch) {
        setExistingBatch(foundBatch)
        return foundBatch
      } else {
        setExistingBatch(null)
        return null
      }
    } catch (error) {
      console.error('Error checking batch existence:', error)
      setExistingBatch(null)
      return null
    } finally {
      setIsCheckingBatch(false)
    }
  }

  const proceedWithBatch = async () => {
    if (!currentAccountId) {
      setBatchIdError('No account ID found. Please log in first.')
      setShowCreateBatchModal(false)
      setActiveTab('account')
      return
    }
    
    if (batchIdInput.length !== 4) {
      setBatchIdError('Batch ID must be 4 digits')
      return
    }
    
    const accountDigits = currentAccountId.replace('MEGG-', '')
    const batchId = `B-${accountDigits}-${batchIdInput}`
    
    const existingBatchData = await checkBatchExists(batchId)
    
    if (existingBatchData) {
      setCurrentBatch(existingBatchData)
      setBatchStatus(existingBatchData.status || 'ready')
      setBatchStats(existingBatchData.stats || {
        totalEggs: 0,
        smallEggs: 0,
        mediumEggs: 0,
        largeEggs: 0,
        goodEggs: 0,
        dirtyEggs: 0,
        badEggs: 0
      })
    } else {
      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      if (!uid) {
        setBatchIdError('Unable to get user UID. Please check account setup.')
        return
      }
      
      const newBatch = await batchService.createBatch(
        batchId,
        currentAccountId,
        uid,
        `Batch ${batchId}`
      )
      
      if (newBatch) {
        setCurrentBatch(newBatch)
        setBatchStatus('ready')
        setBatchStats(newBatch.stats)
      } else {
        setBatchIdError('Failed to create batch. Please try again.')
        return
      }
    }
    
    setShowCreateBatchModal(false)
    setBatchIdInput('')
    setBatchIdError('')
    setExistingBatch(null)
  }

  const startBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('processing')
      await batchService.updateBatchStatus(currentBatch.id, 'processing')
    }
  }

  const stopBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const completeBatch = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const resetBatch = () => {
    setCurrentBatch(null)
    setBatchStatus('idle')
    setBatchStats({
      totalEggs: 0,
      smallEggs: 0,
      mediumEggs: 0,
      largeEggs: 0,
      goodEggs: 0,
      dirtyEggs: 0,
      badEggs: 0
    })
    setActiveStatsView('overview')
  }

  const updateBatchStats = async (newStats: typeof batchStats) => {
    if (!currentBatch) return
    
    try {
      setBatchStats(newStats)
      await batchService.updateBatchStats(currentBatch.id, newStats)
    } catch (error) {
      console.error('❌ Error updating batch stats:', error)
    }
  }

  const addEggToBatch = async (eggData: {
    size: 'small' | 'medium' | 'large'
    quality: 'good' | 'dirty' | 'bad'
  }) => {
    if (!currentBatch) return
    
    const newStats = {
      ...batchStats,
      totalEggs: batchStats.totalEggs + 1,
      [`${eggData.size}Eggs`]: batchStats[`${eggData.size}Eggs`] + 1,
      [`${eggData.quality}Eggs`]: batchStats[`${eggData.quality}Eggs`] + 1
    }
    
    await updateBatchStats(newStats)
  }

  const toggleStatsView = (view: 'size' | 'quality') => {
    if (activeStatsView === view) {
      setActiveStatsView('overview')
    } else {
      setActiveStatsView(view)
    }
  }

  const showToaster = (type: 'success' | 'error' | 'info', message: string) => {
    setToaster({ show: true, type, message })
    setTimeout(() => {
      setToaster({ show: false, type: 'info', message: '' })
    }, 4000)
  }

  const handleRefresh = () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    showToaster('info', 'Refreshing...')
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 150)
  }

  const resetCalibrationState = (component: string) => {
    switch (component) {
      case 'UNO':
        setIsCalibratingUno(false)
        break
      case 'HX711':
        setIsCalibratingHX711(false)
        break
      case 'NEMA23':
        setIsCalibratingNema23(false)
        break
      case 'SG90':
        setIsCalibratingSG90(false)
        break
      case 'MG996R':
        setIsCalibratingMG996R(false)
        break
      default:
    }
  }

  const handleUnoCalibration = async () => {
    setIsCalibratingUno(true)
    
    if (!iotService.isConnected()) {
      setIsCalibratingUno(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    try {
      const result = await iotService.calibrateComponent('UNO')
      
      if (!result.success) {
        setIsCalibratingUno(false)
        showToaster('error', `UNO Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('UNO calibration error:', error)
      setIsCalibratingUno(false)
      showToaster('error', `UNO Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleHX711Calibration = async () => {
    setIsCalibratingHX711(true)
    
    if (!iotService.isConnected()) {
      setIsCalibratingHX711(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    try {
      const result = await iotService.calibrateComponent('HX711')
      
      if (!result.success) {
        setIsCalibratingHX711(false)
        showToaster('error', `HX711 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('HX711 calibration error:', error)
      setIsCalibratingHX711(false)
      showToaster('error', `HX711 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleNema23Calibration = async () => {
    setIsCalibratingNema23(true)
    
    if (!iotService.isConnected()) {
      setIsCalibratingNema23(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    try {
      const result = await iotService.calibrateComponent('NEMA23')
      
      if (!result.success) {
        setIsCalibratingNema23(false)
        showToaster('error', `NEMA23 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('NEMA23 calibration error:', error)
      setIsCalibratingNema23(false)
      showToaster('error', `NEMA23 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleSG90Calibration = async () => {
    setIsCalibratingSG90(true)
    
    if (!iotService.isConnected()) {
      setIsCalibratingSG90(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    try {
      const result = await iotService.calibrateComponent('SG90')
      
      if (!result.success) {
        setIsCalibratingSG90(false)
        showToaster('error', `SG90 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('SG90 calibration error:', error)
      setIsCalibratingSG90(false)
      showToaster('error', `SG90 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleMG996RCalibration = async () => {
    setIsCalibratingMG996R(true)
    
    if (!iotService.isConnected()) {
      setIsCalibratingMG996R(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    try {
      const result = await iotService.calibrateComponent('MG996R')
      
      if (!result.success) {
        setIsCalibratingMG996R(false)
        showToaster('error', `MG996R Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('MG996R calibration error:', error)
      setIsCalibratingMG996R(false)
      showToaster('error', `MG996R Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (showPinModal) {
      const key = event.key
      if (key >= '1' && key <= '9' && pinInput.length < 6) {
        handlePinChange(pinInput + key)
      } else if (key === 'Backspace' && pinInput.length > 0) {
        handlePinChange(pinInput.slice(0, -1))
      } else if (key === 'Enter' && pinInput.length === 6) {
        handlePinSubmit()
      } else if (key === 'Escape') {
        setShowPinModal(false)
      }
    } else if (showCreateBatchModal) {
      const key = event.key
      if (key >= '0' && key <= '9' && batchIdInput.length < 4) {
        handleBatchIdChange(batchIdInput + key)
      } else if (key === 'Backspace' && batchIdInput.length > 0) {
        handleBatchIdChange(batchIdInput.slice(0, -1))
      } else if (key === 'Enter' && batchIdInput.length === 4) {
        proceedWithBatch()
      } else if (key === 'Escape') {
        setShowCreateBatchModal(false)
      }
    }
  }

  useEffect(() => {
    if (currentAccountId) {
      loadConfiguration(currentAccountId)
    }
  }, [currentAccountId])

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
      <div className={`transition-all duration-1000 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${isFullscreen ? 'h-8' : 'h-12'}`}>
        <div className={`bg-slate-800/90 backdrop-blur-md border-b border-blue-500/30 px-3 ${isFullscreen ? 'py-1 h-8' : 'py-2 h-12'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/Logos/logowhite.png"
                alt="MEGG Logo"
                width={isFullscreen ? 20 : 32}
                height={isFullscreen ? 20 : 32}
                className="object-contain"
              />
              <div>
                <h1 className={`font-bold text-white tracking-wide ${isFullscreen ? 'text-sm' : 'text-lg'}`}>MEGG</h1>
              </div>
            </div>

            <div className={`flex items-center ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentAccountId ? "bg-blue-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>
                  {currentAccountId ? currentAccountId : "NO ACCOUNT"}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>NET</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${iotConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>IOT</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-slate-700/50 backdrop-blur-sm border-b border-slate-600/50 px-3 h-16 ${isFullscreen ? 'hidden' : ''}`}>
          <div className="flex space-x-1 h-full">
            {([
              { id: 'main' as const, label: 'Main', icon: Play },
              { id: 'camera' as const, label: 'Camera', icon: Camera },
              { id: 'batch' as const, label: 'Batch', icon: Package },
              { id: 'configuration' as const, label: 'Configuration', icon: Settings },
              { id: 'calibration' as const, label: 'Calibration', icon: Target },
              { id: 'account' as const, label: 'Account', icon: User }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'main' | 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg border-b-2 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`h-[calc(100vh-5.5rem)] overflow-hidden ${isFullscreen ? 'mt-0 h-[calc(100vh-2rem)]' : 'mt-16'}`}>
        {activeTab === 'main' && (
          <MainTab 
            iotConnected={iotConnected}
            isSorting={isSorting}
            onStartSorting={handleStartSorting}
            onStartPlainSorting={handleStartPlainSorting}
            onStopSorting={handleStopSorting}
            currentBatch={currentBatch}
            recentEggs={recentEggs}
            eggHistory={eggHistory}
          />
        )}

        <CameraTab 
          isOnline={isOnline}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isHidden={activeTab !== 'camera'}
        />

        {activeTab === 'batch' && (
          <BatchTab
            currentAccountId={currentAccountId}
            currentBatch={currentBatch}
            batchStatus={batchStatus}
            batchStats={batchStats}
            activeStatsView={activeStatsView}
            onSetActiveTab={(tab: string) => setActiveTab(tab as 'main' | 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
            onShowCreateBatchModal={() => setShowCreateBatchModal(true)}
            onResetBatch={resetBatch}
            onToggleStatsView={toggleStatsView}
          />
        )}

        {activeTab === 'configuration' && (
          <ConfigurationTab
            eggRanges={eggRanges}
            configSource={configSource}
            isLoadingConfig={isLoadingConfig}
            showGapWarning={showGapWarning}
            rangeValidation={rangeValidation}
            isCustomized={isCustomized}
            onHandleRangeEdit={handleRangeEdit}
            onResetToDefaults={resetToDefaults}
            onSetShowGapWarning={setShowGapWarning}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationTab
            isCalibratingUno={isCalibratingUno}
            isCalibratingHX711={isCalibratingHX711}
            isCalibratingNema23={isCalibratingNema23}
            isCalibratingSG90={isCalibratingSG90}
            isCalibratingMG996R={isCalibratingMG996R}
            onHandleUnoCalibration={handleUnoCalibration}
            onHandleHX711Calibration={handleHX711Calibration}
            onHandleNema23Calibration={handleNema23Calibration}
            onHandleSG90Calibration={handleSG90Calibration}
            onHandleMG996RCalibration={handleMG996RCalibration}
            showToaster={showToaster}
            onResetCalibrationState={resetCalibrationState}
            iotConnected={iotConnected}
            hasAccountId={!!(currentAccountId || userData?.accountId)}
            calibrationStatus={calibrationStatus}
          />
        )}

        {activeTab === 'account' && (
          <AccountTab
            currentAccountId={currentAccountId}
            userData={userData}
            isLoadingUser={isLoadingUser}
            onHandleInputId={handleInputId}
            onClearAccountId={clearAccountId}
          />
        )}
      </div>

      <PinModal
        showPinModal={showPinModal}
        pinInput={pinInput}
        pinError={pinError}
        onHandlePinChange={handlePinChange}
        onHandlePinSubmit={handlePinSubmit}
        onSetShowPinModal={setShowPinModal}
        onHandleKeyPress={handleKeyPress}
      />

      <RangeModal
        showRangeModal={showRangeModal}
        editingRange={editingRange}
        minInput={minInput}
        maxInput={maxInput}
        rangeError={rangeError}
        currentInputField={currentInputField}
        isSavingRange={isSavingRange}
        onHandleRangeSubmit={handleRangeSubmit}
        onSetShowRangeModal={setShowRangeModal}
        onSetCurrentInputField={setCurrentInputField}
        onHandleMinChange={handleMinChange}
        onHandleMaxChange={handleMaxChange}
        onHandleKeyPress={handleKeyPress}
      />

      <BatchModal
        showCreateBatchModal={showCreateBatchModal}
        batchIdInput={batchIdInput}
        batchIdError={batchIdError}
        currentAccountId={currentAccountId}
        isCheckingBatch={isCheckingBatch}
        existingBatch={existingBatch}
        onHandleBatchIdChange={handleBatchIdChange}
        onProceedWithBatch={proceedWithBatch}
        onSetShowCreateBatchModal={setShowCreateBatchModal}
        onHandleKeyPress={handleKeyPress}
      />

      <Toaster
        toaster={toaster}
        onSetToaster={setToaster}
      />

      <button
        onClick={handleRefresh}
        aria-label="Refresh"
        className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <CameraProvider>
      <HomeInner />
    </CameraProvider>
  )
}
```

### IoT Service (`app/services/iotService.ts`)

```typescript
// services/iotService.ts - Pure WebSocket IoT Service
export interface CalibrationRequest {
  component: 'UNO' | 'HX711' | 'NEMA23' | 'SG90' | 'LOADER' | 'MG996R'
}

export interface CalibrationResponse {
  success: boolean
  component: string
  message?: string
  error?: string
}

export interface ArduinoStatus {
  connected: boolean
  port: string
  baudrate: number
  running: boolean
  timestamp: string
}

export interface SystemStatus {
  arduino: ArduinoStatus
  server: {
    connected_clients: number
    running: boolean
    uptime?: string
  }
  timestamp: string
}

export interface WeightReading {
  success: boolean
  weight?: number
  unit?: string
  timestamp?: string
  error?: string
}

class IoTService {
  private websocket: WebSocket | null = null
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, Function[]> = new Map()
  private connectionStatus = false
  private arduinoStatus = false

  constructor() {
    const host = process.env.NEXT_PUBLIC_IOT_BACKEND_HOST || 'localhost'
    const port = process.env.NEXT_PUBLIC_IOT_BACKEND_PORT || '8765'
    const protocol = host === 'localhost' ? 'ws' : 'wss'
    const path = host === 'localhost' ? '' : '/ws'
    this.wsUrl = `${protocol}://${host}:${port}${path}`
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.wsUrl)

        this.websocket.onopen = () => {
          this.connectionStatus = true
          this.reconnectAttempts = 0
          this.emit('connected')
          setTimeout(() => {
            resolve(true)
          }, 500)
        }

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.websocket.onclose = (event) => {
          this.connectionStatus = false
          this.websocket = null
          this.emit('disconnected')
          if (event.code !== 1000) {
            this.attemptReconnect()
          }
        }

        this.websocket.onerror = (error) => {
          // Don't reject immediately - let onopen/onclose handle the actual connection state
        }

        setTimeout(() => {
          if (!this.connectionStatus) {
            reject(new Error('WebSocket connection timeout'))
          }
        }, 5000)

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        reject(error)
      }
    })
  }

  private handleMessage(data: any) {
    if (data && (data.type === 'egg_processed' || data.type === 'sorting_progress')) {
      console.log('[WS]', data.type, data)
    }

    if (data.type === 'system_status' && data.arduino) {
      this.arduinoStatus = data.arduino.connected
    }

    this.emit(data.type, data)

    switch (data.type) {
      case 'calibration_response':
        this.emit('calibrationResponse', data)
        break
      case 'calibration_result':
        this.emit('calibrationResult', data)
        break
      case 'calibration_progress':
        this.emit('calibrationProgress', data)
        break
      case 'arduino_data':
        this.emit('arduinoData', data)
        break
      case 'system_status':
        this.emit('systemStatus', data)
        break
      case 'weightReading':
      case 'weight_reading':
        this.emit('weightReading', data)
        break
      default:
        break
    }
  }

  async startSorting(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected to IoT backend')
      }

      await this.sendMessage('client_command', { command: 'start_sorting' })

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('sorting_result', handler)
          reject(new Error('Start sorting request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'sorting_result') {
            clearTimeout(timeout)
            this.off('sorting_result', handler)
            resolve({ success: !!data.success, message: data.message, error: data.error })
          }
        }

        this.on('sorting_result', handler)
      })
    } catch (error) {
      console.error('Failed to start sorting:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async startPlainSorting(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected to IoT backend')
      }

      await this.sendMessage('client_command', { command: 'start_plain_sorting' })

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('plain_sorting_result', handler)
          reject(new Error('Start plain sorting request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'plain_sorting_result') {
            clearTimeout(timeout)
            this.off('plain_sorting_result', handler)
            resolve({ success: !!data.success, message: data.message, error: data.error })
          }
        }

        this.on('plain_sorting_result', handler)
      })
    } catch (error) {
      console.error('Failed to start plain sorting:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async stopSorting(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected to IoT backend')
      }

      await this.sendMessage('client_command', { command: 'stop_sorting' })

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('sorting_stop_result', handler)
          reject(new Error('Stop sorting request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'sorting_stop_result') {
            clearTimeout(timeout)
            this.off('sorting_stop_result', handler)
            resolve({ success: !!data.success, message: data.message, error: data.error })
          }
        }

        this.on('sorting_stop_result', handler)
      })
    } catch (error) {
      console.error('Failed to stop sorting:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  on(event: string, callback: Function) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in event handler:', error)
        }
      })
    }
  }

  async sendMessage(type: string, data: any = {}) {
    let attempts = 0
    const maxAttempts = 10
    const waitTime = 100

    while (!this.isConnected() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
      attempts++
    }

    if (!this.isConnected()) {
      throw new Error('WebSocket not connected after waiting')
    }

    const message = {
      type,
      ...data,
      timestamp: new Date().toISOString()
    }

    this.websocket!.send(JSON.stringify(message))
  }

  async sendConfiguration(payload: {
    accountId: string
    configurations: any
    metadata?: any
    uid?: string
  }): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected to IoT backend')
      }

      await this.sendMessage('set_configuration', payload)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('configuration_result', handler)
          reject(new Error('Configuration request timeout'))
        }, 5000)

        const handler = (data: any) => {
          if (data.type === 'configuration_result') {
            clearTimeout(timeout)
            this.off('configuration_result', handler)
            resolve({ success: !!data.success, accountId: data.accountId, error: data.error })
          }
        }

        this.on('configuration_result', handler)
      })
    } catch (error) {
      console.error('Failed to send configuration:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async calibrateComponent(component: string): Promise<CalibrationResponse> {
    try {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected to IoT backend')
      }

      await this.sendMessage('calibration_request', { component })
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('calibrationResult', handler)
          reject(new Error(`Calibration request timeout for ${component} - no response from IoT backend`))
        }, 30000)

        const handler = (data: any) => {
          if (data.component === component) {
            clearTimeout(timeout)
            this.off('calibrationResult', handler)
            resolve(data)
          }
        }

        this.on('calibrationResult', handler)
      })
    } catch (error) {
      console.error('Calibration request failed:', error)
      return {
        success: false,
        component,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      await this.sendMessage('get_status')
      
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          this.off('systemStatus', handler)
          this.off('system_status', handler)
        }

        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('Status request timeout'))
        }, 8000)

        const handler = (data: any) => {
          if (data && data.type === 'system_status') {
            clearTimeout(timeout)
            cleanup()
            resolve(data)
          }
        }

        this.on('systemStatus', handler)
        this.on('system_status', handler)
      })
    } catch (error) {
      console.error('Failed to get system status:', error)
      return null
    }
  }

  async sendQuality(quality: 'GOOD' | 'BAD'): Promise<boolean> {
    try {
      return await this.sendCommand(`QUALITY ${quality}`)
    } catch (error) {
      console.error('Failed to send QUALITY command:', error)
      return false
    }
  }

  async sendCommand(command: string): Promise<boolean> {
    try {
      await this.sendMessage('send_command', { command })
      return true
    } catch (error) {
      console.error('Failed to send command:', error)
      return false
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      this.emit('reconnectFailed')
    }
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
      this.connectionStatus = false
    }
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN
  }

  isArduinoConnected(): boolean {
    return this.arduinoStatus
  }
}

export const iotService = new IoTService()
export default iotService
```

### Roboflow Service (`app/services/roboflowService.ts`)

```typescript
/**
 * Direct Roboflow API Service
 * Handles egg defect detection using Roboflow's serverless API
 */

import { ROBOFLOW_CONFIG, getRoboflowEndpoint, isConfigComplete } from "../config/roboflow"

export interface RoboflowPrediction {
  class: string
  confidence: number
}

export interface RoboflowResponse {
  outputs?: Array<{
    predictions: {
      predictions: RoboflowPrediction[]
      top: string
      confidence: number
    }
  }>
  predictions?: RoboflowPrediction[]
}

export class RoboflowService {
  constructor() {
    if (!isConfigComplete()) {
      console.warn("⚠️ Roboflow configuration is incomplete. Please update your API key and workflow ID in app/config/roboflow.ts")
    }
  }

  async predictDefect(imageData: string): Promise<{ prediction: string; confidence: number } | null> {
    try {
      let base64Data = imageData
      if (imageData.startsWith('data:image')) {
        const [header, data] = imageData.split(',', 2)
        base64Data = data
      }

      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })

      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      
      const useClientDirect = typeof window !== 'undefined' 
        && (process.env.NEXT_PUBLIC_ROBOFLOW_CLIENT_DIRECT === '1') 
        && !!ROBOFLOW_CONFIG.API_KEY
      let response: Response
      
      if (useClientDirect) {
        const endpoint = `https://serverless.roboflow.com/${ROBOFLOW_CONFIG.WORKSPACE_NAME}/workflows/${ROBOFLOW_CONFIG.WORKFLOW_ID}`
        const body = {
          api_key: ROBOFLOW_CONFIG.API_KEY,
          inputs: { image: { type: 'base64', value: base64Image } }
        }
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
        })
      } else {
        response = await fetch('/api/roboflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Image }),
          signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Roboflow API error response:", errorText)
        throw new Error(`Roboflow API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: RoboflowResponse = await response.json()

      let predictions = null
      
      if (result.outputs && result.outputs.length > 0 && result.outputs[0].predictions) {
        predictions = result.outputs[0].predictions.predictions
      }
      else if (result.predictions && result.predictions.length > 0) {
        predictions = result.predictions
      }
      
      if (predictions && predictions.length > 0) {
        const prediction = predictions[0]
        return {
          prediction: prediction.class,
          confidence: prediction.confidence
        }
      } else {
        return null
      }

    } catch (error) {
      console.error("Roboflow API error occurred:", error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!isConfigComplete()) {
        return false
      }

      const url = getRoboflowEndpoint()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ROBOFLOW_CONFIG.API_KEY}`
        },
        signal: AbortSignal.timeout(10000)
      })

      return response.status === 200 || response.status === 404 || response.status === 405
    } catch (error) {
      console.error("Roboflow API connection test failed:", error)
      return false
    }
  }

  getConfig() {
    return {
      ...ROBOFLOW_CONFIG,
      isComplete: isConfigComplete(),
      endpoint: getRoboflowEndpoint()
    }
  }
}

export const roboflowService = new RoboflowService()
```

### Account Service (`app/services/accountService.ts`)

```typescript
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
    if (typeof window !== 'undefined') {
      this.initializeAccount()
    }
  }

  subscribe(listener: (state: AccountState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  private setState(newState: Partial<AccountState>) {
    this.state = { ...this.state, ...newState }
    this.notifyListeners()
  }

  private async initializeAccount() {
    try {
      this.setState({ isLoading: true, error: null })
      
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

  async loadAccount(accountId: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null })
      
      const userData = await userService.getUserByAccountId(accountId)
      
      if (userData) {
        this.setState({
          accountId,
          userData,
          isLoading: false,
          error: null
        })
        
        localStorage.setItem('megg-account-id', accountId)
        
        return true
      } else {
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

  clearAccount() {
    this.setState({
      accountId: null,
      userData: null,
      isLoading: false,
      error: null
    })
    localStorage.removeItem('megg-account-id')
  }

  getState(): AccountState {
    return { ...this.state }
  }

  isLoaded(): boolean {
    return !this.state.isLoading && !!this.state.accountId
  }

  getAccountId(): string | null {
    if (typeof window !== 'undefined') {
      return this.state.accountId || localStorage.getItem('megg-account-id')
    }
    return this.state.accountId
  }

  getUserData(): any | null {
    return this.state.userData
  }

  hasUID(): boolean {
    return !!(this.state.userData?.uid)
  }

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

const accountService = new AccountService()

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
```

### Batch Service (`app/services/batchService.ts`)

```typescript
// services/batchService.ts - Firebase batch data management

import { db } from '../libs/firebaseConfig'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment 
} from 'firebase/firestore'

export interface BatchData {
  id: string
  accountId: string
  uid: string
  name: string
  status: 'idle' | 'ready' | 'processing' | 'completed'
  stats: {
    totalEggs: number
    smallEggs: number
    mediumEggs: number
    largeEggs: number
    goodEggs: number
    dirtyEggs: number
    badEggs: number
  }
  createdAt: string
  updatedAt: string
}

class BatchService {
  private collectionName = 'batches'

  async createBatch(
    batchId: string,
    accountId: string,
    uid: string,
    name: string
  ): Promise<BatchData | null> {
    try {
      const batchData: BatchData = {
        id: batchId,
        accountId,
        uid,
        name,
        status: 'ready',
        stats: {
          totalEggs: 0,
          smallEggs: 0,
          mediumEggs: 0,
          largeEggs: 0,
          goodEggs: 0,
          dirtyEggs: 0,
          badEggs: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const batchDocRef = doc(db, this.collectionName, batchId)
      await setDoc(batchDocRef, batchData)

      return batchData
    } catch (error) {
      console.error('❌ Error creating batch:', error)
      return null
    }
  }

  async getBatch(batchId: string): Promise<BatchData | null> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      const batchDoc = await getDoc(batchDocRef)
      
      if (batchDoc.exists()) {
        return batchDoc.data() as BatchData
      }
      
      return null
    } catch (error) {
      console.error('❌ Error fetching batch:', error)
      return null
    }
  }

  async updateBatch(
    batchId: string,
    updates: Partial<BatchData>
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
      await updateDoc(batchDocRef, updateData)
      return true
    } catch (error) {
      console.error('❌ Error updating batch:', error)
      return false
    }
  }

  async incrementBatchStats(
    batchId: string,
    deltas: Partial<BatchData['stats']>
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      const updatePayload: Record<string, any> = {
        updatedAt: new Date().toISOString()
      }

      const map: Array<keyof BatchData['stats']> = [
        'totalEggs','smallEggs','mediumEggs','largeEggs','goodEggs','dirtyEggs','badEggs'
      ]

      for (const key of map) {
        const delta = (deltas as any)[key]
        if (typeof delta === 'number' && delta !== 0) {
          updatePayload[`stats.${key}`] = increment(delta)
        }
      }

      if (Object.keys(updatePayload).length > 1) {
        await updateDoc(batchDocRef, updatePayload)
      }
      return true
    } catch (error) {
      console.error('❌ Error incrementing batch stats:', error)
      return false
    }
  }

  async updateBatchStats(
    batchId: string,
    stats: BatchData['stats']
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      await updateDoc(batchDocRef, {
        stats,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('❌ Error updating batch stats:', error)
      return false
    }
  }

  async updateBatchStatus(
    batchId: string,
    status: BatchData['status']
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      await updateDoc(batchDocRef, {
        status,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('❌ Error updating batch status:', error)
      return false
    }
  }

  async getBatchesForAccount(
    accountId: string,
    limitCount: number = 10
  ): Promise<BatchData[]> {
    try {
      const batchesRef = collection(db, this.collectionName)
      const q = query(
        batchesRef,
        where('accountId', '==', accountId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const batches: BatchData[] = []
      
      querySnapshot.forEach((doc) => {
        batches.push(doc.data() as BatchData)
      })
      
      return batches
    } catch (error) {
      console.error('❌ Error fetching batches for account:', error)
      return []
    }
  }

  async batchExists(batchId: string): Promise<boolean> {
    try {
      const batch = await this.getBatch(batchId)
      return batch !== null
    } catch (error) {
      console.error('❌ Error checking batch existence:', error)
      return false
    }
  }
}

export default new BatchService()
```

### Camera Context (`app/contexts/CameraContext.tsx`)

```typescript
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
```

### Firebase Configuration (`app/libs/firebaseConfig.ts`)

```typescript
import { initializeApp } from "firebase/app"
import { getFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)

// Enable offline persistence (non-blocking). Multi-tab first, fallback to single-tab.
enableMultiTabIndexedDbPersistence(db).catch(() => {
  enableIndexedDbPersistence(db).catch(() => {})
})

export { db, storage }
```

### Roboflow Configuration (`app/config/roboflow.ts`)

```typescript
/**
 * Roboflow Configuration
 * Update these values with your actual Roboflow credentials
 */

export const ROBOFLOW_CONFIG = {
  API_KEY: process.env.ROBOFLOW_API_KEY || process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || "",
  WORKSPACE_NAME: process.env.NEXT_PUBLIC_ROBOFLOW_WORKSPACE || "meggtech",
  WORKFLOW_ID: process.env.NEXT_PUBLIC_ROBOFLOW_WORKFLOW_ID || "meggworkflow",
  API_URL: "https://serverless.roboflow.com",
  TIMEOUT: 30000,
}

export function getRoboflowEndpoint(): string {
  return `${ROBOFLOW_CONFIG.API_URL}/${ROBOFLOW_CONFIG.WORKSPACE_NAME}/workflows/${ROBOFLOW_CONFIG.WORKFLOW_ID}`
}

export function isConfigComplete(): boolean {
  return (
    ROBOFLOW_CONFIG.API_KEY.length > 0 &&
    ROBOFLOW_CONFIG.WORKFLOW_ID.length > 0 &&
    ROBOFLOW_CONFIG.WORKSPACE_NAME.length > 0
  )
}
```

### Roboflow API Route (`app/api/roboflow/route.ts`)

```typescript
// app/api/roboflow/route.ts
import { NextResponse } from 'next/server'
import { ROBOFLOW_CONFIG } from '../../config/roboflow'

export async function POST(request: Request) {
  try {
    const { imageBase64, imageUrl } = await request.json()

    if (!process.env.ROBOFLOW_API_KEY) {
      return NextResponse.json({ error: 'ROBOFLOW_API_KEY is not set on the server' }, { status: 500 })
    }

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: 'Missing image payload: provide imageBase64 or imageUrl' }, { status: 400 })
    }

    const endpoint = `${ROBOFLOW_CONFIG.API_URL}/${ROBOFLOW_CONFIG.WORKSPACE_NAME}/workflows/${ROBOFLOW_CONFIG.WORKFLOW_ID}`

    const payload: any = {
      api_key: process.env.ROBOFLOW_API_KEY,
      inputs: {
        image: imageBase64
          ? { type: 'base64', value: imageBase64 }
          : { type: 'url', value: imageUrl }
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: 'Roboflow API error', status: response.status, details: text }, { status: 502 })
    }

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from Roboflow', raw: text }, { status: 502 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
```

---

## License

This project is proprietary software for MEGG Technology.

---

## Support

For issues and questions, contact the development team.
