import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for persisting state to localStorage with debounced auto-save
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if nothing in storage
 * @param {number} debounceMs - milliseconds to debounce saves (default 500)
 */
export function useLocalStorage(key, initialValue, debounceMs = 500) {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Track save status
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSaved, setLastSaved] = useState(null)

  // Debounce timer ref
  const saveTimerRef = useRef(null)

  // Save to localStorage with debounce
  const saveToStorage = useCallback((value) => {
    if (typeof window === 'undefined') return

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    setSaveStatus('saving')

    // Debounced save
    saveTimerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
        setSaveStatus('saved')
        setLastSaved(new Date())

        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error)
        setSaveStatus('error')

        // Check if quota exceeded
        if (error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded. Consider clearing old data.')
        }
      }
    }, debounceMs)
  }, [key, debounceMs])

  // Wrapped setValue that triggers auto-save
  const setValue = useCallback((value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value
    setStoredValue(valueToStore)
    saveToStorage(valueToStore)
  }, [storedValue, saveToStorage])

  // Manual save (immediate, bypasses debounce)
  const saveNow = useCallback(() => {
    if (typeof window === 'undefined') return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (error) {
      console.error(`Error saving to localStorage:`, error)
      setSaveStatus('error')
    }
  }, [key, storedValue])

  // Clear stored value
  const clearStorage = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      setSaveStatus('idle')
      setLastSaved(null)
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return {
    value: storedValue,
    setValue,
    saveNow,
    clearStorage,
    saveStatus,
    lastSaved,
  }
}

/**
 * Hook specifically for floor plan persistence
 * Combines with Zustand store subscription
 */
export function useFloorPlanPersistence(store, key = 'hvac_floor_plan') {
  const { value, setValue, saveStatus, lastSaved, clearStorage } = useLocalStorage(key, null, 1000)

  // Load from storage on mount
  useEffect(() => {
    if (value && store) {
      store.getState().setFloorPlan(value)
    }
  }, []) // Only on mount

  // Subscribe to store changes and persist
  useEffect(() => {
    if (!store) return

    const unsubscribe = store.subscribe((state) => {
      setValue(state.floorPlan)
    })

    return unsubscribe
  }, [store, setValue])

  return { saveStatus, lastSaved, clearStorage }
}

export default useLocalStorage
