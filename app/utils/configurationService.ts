import { db } from '../libs/firebaseConfig'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

export interface EggSizeRange {
  min: number
  max: number
  label?: string
}

export interface RangeValidation {
  hasGaps: boolean
  gaps: Array<{
    from: number
    to: number
    between: string
  }>
  overlaps: Array<{
    range1: string
    range2: string
    overlap: number
  }>
}

export interface EggSizeRanges {
  small: EggSizeRange
  medium: EggSizeRange
  large: EggSizeRange
}

export interface GlobalConfiguration {
  id: string
  type: string
  version: string
  configuration: EggSizeRanges
  metadata: {
    description: string
    createdAt: string
    lastModifiedAt: string
    isActive: boolean
  }
}

export interface UserConfiguration {
  accountId: string
  configurations: {
    eggSizeRanges: EggSizeRanges
  }
  metadata: {
    lastModifiedAt: string
    isCustomized: boolean
  }
}

// Default configuration
const DEFAULT_EGG_RANGES: EggSizeRanges = {
  small: { min: 35, max: 42, label: "Small" },
  medium: { min: 43, max: 50, label: "Medium" },
  large: { min: 51, max: 58, label: "Large" }
}

/**
 * Validate egg size ranges for gaps and overlaps
 */
export function validateRanges(ranges: EggSizeRanges): RangeValidation {
  const rangesArray = [
    { name: 'small', ...ranges.small },
    { name: 'medium', ...ranges.medium },
    { name: 'large', ...ranges.large }
  ].sort((a, b) => a.min - b.min)

  const gaps: Array<{ from: number; to: number; between: string }> = []
  const overlaps: Array<{ range1: string; range2: string; overlap: number }> = []

  // Check for gaps and overlaps
  for (let i = 0; i < rangesArray.length - 1; i++) {
    const current = rangesArray[i]
    const next = rangesArray[i + 1]
    
    // Check for gaps (current.max + 0.01 < next.min)
    if (current.max + 0.01 < next.min) {
      gaps.push({
        from: current.max,
        to: next.min,
        between: `${current.name} and ${next.name}`
      })
    }
    
    // Check for overlaps (current.max >= next.min)
    if (current.max >= next.min) {
      overlaps.push({
        range1: current.name,
        range2: next.name,
        overlap: current.max - next.min + 0.01
      })
    }
  }

  return {
    hasGaps: gaps.length > 0,
    gaps,
    overlaps
  }
}

/**
 * Get suggested next range based on current range
 */
export function getSuggestedNextRange(currentRange: EggSizeRange, nextRangeType: 'small' | 'medium' | 'large'): EggSizeRange {
  const suggestedMin = Math.round((currentRange.max + 0.01) * 100) / 100 // Round to 2 decimal places
  const suggestedMax = suggestedMin + 7 // Default 7g range
  
  return {
    min: suggestedMin,
    max: suggestedMax,
    label: nextRangeType.charAt(0).toUpperCase() + nextRangeType.slice(1)
  }
}

/**
 * Get the next range type in sequence
 */
export function getNextRangeType(currentType: 'small' | 'medium' | 'large'): 'small' | 'medium' | 'large' | null {
  const sequence = ['small', 'medium', 'large']
  const currentIndex = sequence.indexOf(currentType)
  return currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] as 'small' | 'medium' | 'large' : null
}

/**
 * Get global default configuration for egg size ranges
 */
export async function getGlobalDefaultRanges(): Promise<EggSizeRanges> {
  try {
    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as GlobalConfiguration
      return data.configuration
    } else {
      // If no global config exists, create it with defaults
      await createGlobalDefaultRanges()
      return DEFAULT_EGG_RANGES
    }
  } catch (error) {
    console.error('Error fetching global default ranges:', error)
    return DEFAULT_EGG_RANGES
  }
}

/**
 * Create global default configuration (admin function)
 */
export async function createGlobalDefaultRanges(): Promise<void> {
  try {
    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const globalConfig: GlobalConfiguration = {
      id: 'egg_size_ranges',
      type: 'egg_classification',
      version: '1.0',
      configuration: DEFAULT_EGG_RANGES,
      metadata: {
        description: 'Default egg size classification ranges',
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        isActive: true
      }
    }
    
    await setDoc(docRef, globalConfig)
    console.log('Global default ranges created successfully')
  } catch (error) {
    console.error('Error creating global default ranges:', error)
    throw error
  }
}

/**
 * Get user-specific configuration for egg size ranges
 */
export async function getUserConfiguration(accountId: string): Promise<EggSizeRanges | null> {
  try {
    const docRef = doc(db, 'user_configurations', accountId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserConfiguration
      return data.configurations.eggSizeRanges
    }
    
    return null // No user configuration found
  } catch (error) {
    console.error('Error fetching user configuration:', error)
    return null
  }
}

/**
 * Save user-specific configuration for egg size ranges
 */
export async function saveUserConfiguration(accountId: string, eggRanges: EggSizeRanges): Promise<void> {
  try {
    const docRef = doc(db, 'user_configurations', accountId)
    const userConfig: UserConfiguration = {
      accountId,
      configurations: {
        eggSizeRanges: eggRanges
      },
      metadata: {
        lastModifiedAt: new Date().toISOString(),
        isCustomized: true
      }
    }
    
    await setDoc(docRef, userConfig)
    console.log('User configuration saved successfully')
  } catch (error) {
    console.error('Error saving user configuration:', error)
    throw error
  }
}

/**
 * Delete user-specific configuration (reset to defaults)
 */
export async function deleteUserConfiguration(accountId: string): Promise<void> {
  try {
    const docRef = doc(db, 'user_configurations', accountId)
    await updateDoc(docRef, {
      'metadata.isCustomized': false,
      'metadata.lastModifiedAt': new Date().toISOString()
    })
    console.log('User configuration reset to defaults')
  } catch (error) {
    console.error('Error resetting user configuration:', error)
    throw error
  }
}

/**
 * Get configuration with priority: User Config → Global Default → localStorage fallback
 */
export async function getConfigurationWithFallback(accountId: string): Promise<{
  ranges: EggSizeRanges
  source: 'user' | 'global' | 'local'
  isCustomized: boolean
}> {
  try {
    // 1. Try to get user configuration
    const userConfig = await getUserConfiguration(accountId)
    if (userConfig) {
      return {
        ranges: userConfig,
        source: 'user',
        isCustomized: true
      }
    }

    // 2. Try to get global default
    const globalConfig = await getGlobalDefaultRanges()
    if (globalConfig) {
      return {
        ranges: globalConfig,
        source: 'global',
        isCustomized: false
      }
    }

    // 3. Fallback to localStorage
    const localRanges = localStorage.getItem('egg-ranges')
    if (localRanges) {
      try {
        const parsed = JSON.parse(localRanges)
        return {
          ranges: parsed,
          source: 'local',
          isCustomized: false
        }
      } catch (error) {
        console.error('Error parsing localStorage ranges:', error)
      }
    }

    // 4. Ultimate fallback to hardcoded defaults
    return {
      ranges: DEFAULT_EGG_RANGES,
      source: 'local',
      isCustomized: false
    }
  } catch (error) {
    console.error('Error getting configuration with fallback:', error)
    
    // Fallback to localStorage or defaults
    const localRanges = localStorage.getItem('egg-ranges')
    if (localRanges) {
      try {
        const parsed = JSON.parse(localRanges)
        return {
          ranges: parsed,
          source: 'local',
          isCustomized: false
        }
      } catch (error) {
        console.error('Error parsing localStorage ranges:', error)
      }
    }

    return {
      ranges: DEFAULT_EGG_RANGES,
      source: 'local',
      isCustomized: false
    }
  }
}

/**
 * Save configuration with automatic fallback to localStorage
 */
export async function saveConfigurationWithFallback(accountId: string, eggRanges: EggSizeRanges): Promise<void> {
  try {
    // Try to save to Firebase
    await saveUserConfiguration(accountId, eggRanges)
    
    // Also save to localStorage as backup
    localStorage.setItem('egg-ranges', JSON.stringify(eggRanges))
    
    console.log('Configuration saved to Firebase and localStorage')
  } catch (error) {
    console.error('Error saving to Firebase, saving to localStorage only:', error)
    
    // Fallback to localStorage only
    localStorage.setItem('egg-ranges', JSON.stringify(eggRanges))
    console.log('Configuration saved to localStorage only')
  }
}
