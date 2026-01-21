import { useState, useEffect, useRef } from 'react'
import { SHORTCUT_DEFINITIONS, getShortcutLabel } from '../../hooks/useKeyboardShortcuts'

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef(null)
  const searchInputRef = useRef(null)

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Close on outside click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Filter shortcuts based on search
  const filteredDefinitions = SHORTCUT_DEFINITIONS.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.shortcuts.length > 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Shortcuts list */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-180px)]">
          {filteredDefinitions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No shortcuts found</p>
          ) : (
            <div className="space-y-6">
              {filteredDefinitions.map(category => (
                <div key={category.category}>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 bg-slate-700/50 rounded"
                      >
                        <span className="text-slate-200">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-slate-900 rounded text-sm font-mono text-slate-300 border border-slate-600">
                          {getShortcutLabel(shortcut.keys)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 text-center">
          <p className="text-sm text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">?</kbd> anytime to show this menu
          </p>
        </div>
      </div>
    </div>
  )
}
