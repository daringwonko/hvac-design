import { useEffect, useCallback, useRef } from 'react'

/**
 * Check if event target is an input element
 */
const isInputElement = (element) => {
  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable
}

/**
 * Parse a shortcut string into its components
 * e.g., "Ctrl+Z" -> { ctrl: true, key: 'z' }
 */
const parseShortcut = (shortcut) => {
  const parts = shortcut.toLowerCase().split('+')
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts[parts.length - 1]
  }
}

/**
 * Check if a keyboard event matches a shortcut
 */
const matchesShortcut = (event, shortcut) => {
  const parsed = parseShortcut(shortcut)
  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta &&
    event.key.toLowerCase() === parsed.key
  )
}

/**
 * Hook for registering keyboard shortcuts
 * @param {Object} shortcuts - Map of shortcut strings to callbacks
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether shortcuts are active (default: true)
 * @param {boolean} options.allowInInputs - Allow shortcuts in input fields (default: false)
 * @param {string[]} options.allowedShortcutsInInputs - Shortcuts that work even in inputs
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
  const {
    enabled = true,
    allowInInputs = false,
    allowedShortcutsInInputs = ['Escape']
  } = options

  // Use ref to always have latest shortcuts without re-adding listeners
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((event) => {
    // Skip if disabled
    if (!enabled) return

    // Check if in input field
    const inInput = isInputElement(event.target)

    // Find matching shortcut
    const shortcutEntries = Object.entries(shortcutsRef.current)

    for (const [shortcut, callback] of shortcutEntries) {
      if (matchesShortcut(event, shortcut)) {
        // Check if allowed in inputs
        if (inInput && !allowInInputs && !allowedShortcutsInInputs.includes(shortcut)) {
          continue
        }

        event.preventDefault()
        callback(event)
        return
      }
    }
  }, [enabled, allowInInputs, allowedShortcutsInInputs])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Pre-defined common shortcuts for floor plan editor
 */
export const FLOOR_PLAN_SHORTCUTS = {
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  redoAlt: 'Ctrl+Shift+Z',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  cut: 'Ctrl+X',
  delete: 'Delete',
  deleteAlt: 'Backspace',
  selectAll: 'Ctrl+A',
  deselect: 'Escape',
  zoomIn: 'Ctrl+=',
  zoomInAlt: 'Ctrl++',
  zoomOut: 'Ctrl+-',
  zoomReset: 'Ctrl+0',
  help: '?',
}

/**
 * Get human-readable shortcut label
 */
export const getShortcutLabel = (shortcut) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  return shortcut
    .replace(/Ctrl/gi, isMac ? '⌘' : 'Ctrl')
    .replace(/Alt/gi, isMac ? '⌥' : 'Alt')
    .replace(/Shift/gi, isMac ? '⇧' : 'Shift')
    .replace(/Meta/gi, isMac ? '⌘' : 'Win')
    .replace(/\+/g, isMac ? '' : '+')
}

/**
 * Shortcut definitions with descriptions for help modal
 */
export const SHORTCUT_DEFINITIONS = [
  { category: 'Edit', shortcuts: [
    { keys: 'Ctrl+Z', description: 'Undo last action' },
    { keys: 'Ctrl+Y', description: 'Redo last action' },
    { keys: 'Ctrl+C', description: 'Copy selected room(s)' },
    { keys: 'Ctrl+V', description: 'Paste copied room(s)' },
    { keys: 'Ctrl+X', description: 'Cut selected room(s)' },
    { keys: 'Delete', description: 'Delete selected room(s)' },
    { keys: 'Ctrl+A', description: 'Select all rooms' },
    { keys: 'Escape', description: 'Deselect all' },
  ]},
  { category: 'View', shortcuts: [
    { keys: 'Ctrl++', description: 'Zoom in' },
    { keys: 'Ctrl+-', description: 'Zoom out' },
    { keys: 'Ctrl+0', description: 'Reset zoom' },
    { keys: 'Space + Drag', description: 'Pan canvas' },
    { keys: 'Scroll', description: 'Zoom in/out' },
  ]},
  { category: 'Selection', shortcuts: [
    { keys: 'Ctrl+Click', description: 'Toggle selection' },
    { keys: 'Drag on canvas', description: 'Box select' },
  ]},
  { category: 'Help', shortcuts: [
    { keys: '?', description: 'Show keyboard shortcuts' },
  ]},
]

export default useKeyboardShortcuts
