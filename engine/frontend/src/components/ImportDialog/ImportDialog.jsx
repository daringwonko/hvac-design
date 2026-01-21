import { useState, useRef, useCallback } from 'react'

const ALLOWED_TYPES = ['.dxf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function ImportDialog({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    if (!file) return 'No file selected'

    const extension = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_TYPES.includes(extension)) {
      return `Invalid file type. Supported formats: ${ALLOWED_TYPES.join(', ')}`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }

    return null
  }

  const handleFile = async (selectedFile) => {
    setError(null)
    setPreview(null)

    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      setFile(null)
      return
    }

    setFile(selectedFile)

    // Get preview from API
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/v1/imports/preview', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setPreview(data.data)
      } else {
        setError(data.error?.message || 'Failed to preview file')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/imports/dxf', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        onImport(data.data)
        handleClose()
      } else {
        setError(data.error?.message || 'Import failed')
      }
    } catch (err) {
      setError('Failed to import file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setIsLoading(false)
    setIsDragging(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Import Floor Plan</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
              }
              ${error ? 'border-red-500/50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {isLoading ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-300">Processing file...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-primary-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-300">Drag & drop a DXF file here</p>
                <p className="text-slate-500 text-sm mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Import Preview</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Shapes found:</span>
                  <span className="text-white ml-2">{preview.entities?.total_shapes || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400">Text labels:</span>
                  <span className="text-white ml-2">{preview.entities?.texts || 0}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Estimated rooms:</span>
                  <span className="text-primary-400 ml-2 font-semibold">{preview.estimated_rooms || 0}</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">{preview.preview_note}</p>
            </div>
          )}

          {/* Supported Formats */}
          <div className="text-sm text-slate-400">
            <p className="font-medium mb-1">Supported formats:</p>
            <ul className="list-disc list-inside text-slate-500">
              <li>AutoCAD DXF (.dxf) - Export from AutoCAD, SketchUp, Revit, etc.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || !preview || isLoading}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
