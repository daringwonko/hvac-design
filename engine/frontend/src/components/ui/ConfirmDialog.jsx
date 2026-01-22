import { useEffect, useRef, useState, useCallback } from 'react'
import { modalOpenRef } from '../../hooks/useKeyboardShortcuts'

/**
 * Reusable confirmation dialog component.
 *
 * Props:
 * - isOpen: boolean - whether dialog is visible
 * - onClose: function - callback when dialog is closed/cancelled
 * - onConfirm: function - callback when confirmed
 * - title: string - dialog title
 * - message: string - dialog message
 * - confirmLabel: string - confirm button text (default: "Confirm")
 * - cancelLabel: string - cancel button text (default: "Cancel")
 * - variant: 'default' | 'danger' - styling variant
 * - confirmDisabled: boolean - disable confirm button
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  confirmDisabled = false
}) {
  const cancelRef = useRef(null)

  // Focus cancel button on open (safer default)
  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus()
    }
  }, [isOpen])

  // Track modal open state to prevent Escape from clearing selection
  // When modal is open, Escape should only close the modal
  useEffect(() => {
    modalOpenRef.current = isOpen
    return () => {
      modalOpenRef.current = false
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const confirmButtonClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-primary-600 hover:bg-primary-500 focus:ring-primary-500'

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h2
            id="confirm-dialog-title"
            className={`text-lg font-semibold ${variant === 'danger' ? 'text-red-400' : 'text-white'}`}
          >
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-slate-300">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 rounded text-white transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for managing confirm dialog state
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({})
  const resolveRef = useRef(null)

  const confirm = useCallback(({
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant
  } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfig({ title, message, confirmLabel, cancelLabel, variant })
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    setIsOpen(false)
  }, [])

  const handleClose = useCallback(() => {
    resolveRef.current?.(false)
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    config,
    confirm,
    onConfirm: handleConfirm,
    onClose: handleClose
  }
}
