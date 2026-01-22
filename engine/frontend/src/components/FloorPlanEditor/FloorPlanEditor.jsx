import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import useFloorPlanStore from '../../store/floorPlanStore'
import useSelectionStore from '../../store/selectionStore'
import { useFloorPlanPersistence } from '../../hooks/useLocalStorage'
import { useKeyboardShortcuts, FLOOR_PLAN_SHORTCUTS } from '../../hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from '../ui/KeyboardShortcutsModal'
import ConfirmDialog from '../ui/ConfirmDialog'
import FloorPlan3DView from './FloorPlan3DView'
import ImportDialog from '../ImportDialog/ImportDialog'

// Room type colors for visual distinction
const ROOM_COLORS = {
  living: '#3b82f6',      // Blue
  bedroom: '#8b5cf6',     // Purple
  kitchen: '#f59e0b',     // Amber
  bathroom: '#06b6d4',    // Cyan
  entry: '#10b981',       // Emerald
  corridor: '#6b7280',    // Gray
  utility: '#64748b',     // Slate
  mechanical: '#ef4444',  // Red
  office: '#6366f1',      // Indigo
  dining: '#ec4899',      // Pink
  garage: '#78716c',      // Stone
  storage: '#a1a1aa',     // Zinc
  other: '#9ca3af',       // Gray
}

// 8-point resize handle definitions
const RESIZE_HANDLES = [
  { id: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
  { id: 'n', cursor: 'n-resize', x: 0.5, y: 0 },
  { id: 'ne', cursor: 'ne-resize', x: 1, y: 0 },
  { id: 'e', cursor: 'e-resize', x: 1, y: 0.5 },
  { id: 'se', cursor: 'se-resize', x: 1, y: 1 },
  { id: 's', cursor: 's-resize', x: 0.5, y: 1 },
  { id: 'sw', cursor: 'sw-resize', x: 0, y: 1 },
  { id: 'w', cursor: 'w-resize', x: 0, y: 0.5 },
]

// Default room dimensions by type (mm)
const DEFAULT_ROOM_SIZES = {
  living: { width: 4000, depth: 3500 },
  bedroom: { width: 3500, depth: 3000 },
  kitchen: { width: 3500, depth: 3000 },
  bathroom: { width: 2000, depth: 1800 },
  entry: { width: 2000, depth: 1500 },
  corridor: { width: 1200, depth: 3000 },
  utility: { width: 1500, depth: 1500 },
  mechanical: { width: 2500, depth: 1800 },
  office: { width: 3000, depth: 2500 },
  dining: { width: 3500, depth: 3000 },
  garage: { width: 6000, depth: 6000 },
  storage: { width: 2000, depth: 2000 },
  other: { width: 3000, depth: 3000 },
}

// Dimension validation limits (mm)
const DIMENSION_LIMITS = {
  minWidth: 500,    // 0.5m minimum
  maxWidth: 20000,  // 20m maximum
  minDepth: 500,
  maxDepth: 20000,
  minPosition: 0,
  maxPosition: 50000,
}

// Validation helper function
const validateDimension = (value, min, max) => {
  const num = parseFloat(value)
  if (isNaN(num)) return { valid: false, error: 'Must be a number' }
  if (num < min) return { valid: false, error: `Min: ${min}mm` }
  if (num > max) return { valid: false, error: `Max: ${max}mm` }
  return { valid: true, value: num }
}

// Throttle helper for smooth drag/resize performance
const throttle = (func, limit) => {
  let inThrottle = false
  let pendingArgs = null

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (pendingArgs) {
          func.apply(this, pendingArgs)
          pendingArgs = null
        }
      }, limit)
    } else {
      pendingArgs = args
    }
  }
}

// Validated input component with error feedback
function ValidatedInput({ value, onChange, min, max, label }) {
  const [localValue, setLocalValue] = useState(value)
  const [error, setError] = useState(null)

  // Sync local value when prop changes (e.g., from drag/resize)
  useEffect(() => {
    setLocalValue(value)
    setError(null)
  }, [value])

  const handleChange = (e) => {
    const val = e.target.value
    setLocalValue(val)
    const result = validateDimension(val, min, max)
    if (result.valid) {
      setError(null)
      onChange(result.value)
    } else {
      setError(result.error)
    }
  }

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        min={min}
        max={max}
        className={`w-full px-3 py-2 bg-slate-700 border rounded text-white text-sm ${
          error ? 'border-red-500' : 'border-slate-600'
        }`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function Room({ room, scale, isSelected, onSelect, onToggleSelect, onDrag, onResize, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  // Use ref for dragStart to prevent throttle recreation on every mouse move
  const dragStartRef = useRef({ x: 0, y: 0 })

  const x = room.position.x * scale
  const y = room.position.y * scale
  const width = room.dimensions.width * scale
  const depth = room.dimensions.depth * scale

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) {
      const handleId = e.target.getAttribute('data-handle')
      setIsResizing(true)
      setResizeHandle(handleId)
    } else {
      setIsDragging(true)
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    // Ctrl+click or Cmd+click toggles selection instead of replacing
    if (e.ctrlKey || e.metaKey) {
      onToggleSelect(room.id)
    } else {
      onSelect(room.id)
    }
    e.stopPropagation()
  }

  // Throttled mouse move handler for smooth drag/resize performance (16ms = 60fps)
  // Note: dragStartRef is intentionally NOT in the dependency array to prevent throttle recreation
  const throttledMouseMove = useMemo(() =>
    throttle((e) => {
      if (isDragging) {
        const dx = (e.clientX - dragStartRef.current.x) / scale
        const dy = (e.clientY - dragStartRef.current.y) / scale
        onDrag(room.id, room.position.x + dx, room.position.y + dy)
        dragStartRef.current = { x: e.clientX, y: e.clientY }
      } else if (isResizing && resizeHandle) {
        const dx = (e.clientX - dragStartRef.current.x) / scale
        const dy = (e.clientY - dragStartRef.current.y) / scale
        onResize(room.id, dx, dy, resizeHandle)
        dragStartRef.current = { x: e.clientX, y: e.clientY }
      }
    }, 16),
    [isDragging, isResizing, resizeHandle, room, scale, onDrag, onResize]
  )

  const handleMouseUp = useCallback(() => {
    // Notify parent when drag ends to clear alignment guides
    if (isDragging && onDragEnd) {
      onDragEnd()
    }
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [isDragging, onDragEnd])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', throttledMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', throttledMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, throttledMouseMove, handleMouseUp])

  const roomColor = ROOM_COLORS[room.room_type] || ROOM_COLORS.other

  return (
    <g
      className="room-group"
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Room fill */}
      <rect
        x={x}
        y={y}
        width={width}
        height={depth}
        fill={roomColor}
        fillOpacity={0.3}
        stroke={isSelected ? '#ffffff' : roomColor}
        strokeWidth={isSelected ? 3 : 1.5}
        rx={4}
      />

      {/* Room label */}
      <text
        x={x + width / 2}
        y={y + depth / 2 - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {room.name}
      </text>

      {/* Dimensions label */}
      <text
        x={x + width / 2}
        y={y + depth / 2 + 10}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        style={{ pointerEvents: 'none' }}
      >
        {(room.dimensions.width / 1000).toFixed(1)}m x {(room.dimensions.depth / 1000).toFixed(1)}m
      </text>

      {/* Area label */}
      <text
        x={x + width / 2}
        y={y + depth / 2 + 24}
        textAnchor="middle"
        fill="#64748b"
        fontSize={9}
        style={{ pointerEvents: 'none' }}
      >
        {((room.dimensions.width * room.dimensions.depth) / 1000000).toFixed(1)} m²
      </text>

      {/* 8-point resize handles */}
      {isSelected && RESIZE_HANDLES.map(handle => (
        <rect
          key={handle.id}
          className="resize-handle"
          data-handle={handle.id}
          x={x + width * handle.x - 5}
          y={y + depth * handle.y - 5}
          width={10}
          height={10}
          fill="#ffffff"
          stroke={roomColor}
          strokeWidth={2}
          rx={2}
          style={{ cursor: handle.cursor }}
        />
      ))}
    </g>
  )
}

function Grid({ width, height, gridSize, scale }) {
  const lines = []
  const scaledGridSize = gridSize * scale

  // Vertical lines
  for (let x = 0; x <= width; x += scaledGridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#334155"
        strokeWidth={x % (scaledGridSize * 5) === 0 ? 0.5 : 0.25}
      />
    )
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += scaledGridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#334155"
        strokeWidth={y % (scaledGridSize * 5) === 0 ? 0.5 : 0.25}
      />
    )
  }

  return <g className="grid">{lines}</g>
}

// Alignment guides component - shows dashed lines when rooms align
function AlignmentGuides({ guides, scale, canvasWidth, canvasHeight }) {
  if (!guides || guides.length === 0) return null

  return (
    <g className="alignment-guides">
      {guides.map((guide, i) => (
        guide.type === 'vertical' ? (
          <line
            key={`v-${i}-${guide.position}`}
            x1={guide.position * scale}
            y1={0}
            x2={guide.position * scale}
            y2={canvasHeight * scale}
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="4,4"
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <line
            key={`h-${i}-${guide.position}`}
            x1={0}
            y1={guide.position * scale}
            x2={canvasWidth * scale}
            y2={guide.position * scale}
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="4,4"
            style={{ pointerEvents: 'none' }}
          />
        )
      ))}
    </g>
  )
}

function Toolbar({ onAddRoom, onDelete, onExport, onImport, selectedRoom }) {
  const roomTypes = [
    'living', 'bedroom', 'kitchen', 'bathroom',
    'entry', 'corridor', 'utility', 'mechanical'
  ]

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-800 rounded-lg">
      <div className="flex gap-2">
        <span className="text-slate-400 text-sm self-center mr-2">Add Room:</span>
        {roomTypes.map(type => (
          <button
            key={type}
            onClick={() => onAddRoom(type)}
            className="px-3 py-1.5 text-xs rounded capitalize"
            style={{
              backgroundColor: ROOM_COLORS[type] + '40',
              borderColor: ROOM_COLORS[type],
              borderWidth: 1,
              color: ROOM_COLORS[type]
            }}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          onClick={onImport}
          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
        >
          Import DXF
        </button>
        {selectedRoom && (
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Delete Room
          </button>
        )}
        <button
          onClick={onExport}
          className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}

function PropertiesPanel({ room, onUpdate }) {
  if (!room) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg">
        <div className="text-center py-4">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p className="text-slate-400 text-sm font-medium mb-2">No room selected</p>
          <p className="text-slate-500 text-xs">Click on a room in the canvas to view and edit its properties</p>
          <div className="mt-3 text-left text-xs text-slate-500 space-y-1">
            <p>Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Click a room to select it</li>
              <li>Ctrl+click to multi-select</li>
              <li>Drag to reposition rooms</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-white">Room Properties</h3>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Name</label>
        <input
          type="text"
          value={room.name}
          onChange={(e) => onUpdate(room.id, { name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Type</label>
        <select
          value={room.room_type}
          onChange={(e) => onUpdate(room.id, { room_type: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
        >
          {Object.keys(ROOM_COLORS).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ValidatedInput
          label="Width (mm)"
          value={room.dimensions.width}
          min={DIMENSION_LIMITS.minWidth}
          max={DIMENSION_LIMITS.maxWidth}
          onChange={(value) => onUpdate(room.id, {
            dimensions: { ...room.dimensions, width: value }
          })}
        />
        <ValidatedInput
          label="Depth (mm)"
          value={room.dimensions.depth}
          min={DIMENSION_LIMITS.minDepth}
          max={DIMENSION_LIMITS.maxDepth}
          onChange={(value) => onUpdate(room.id, {
            dimensions: { ...room.dimensions, depth: value }
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ValidatedInput
          label="X Position"
          value={room.position.x}
          min={DIMENSION_LIMITS.minPosition}
          max={DIMENSION_LIMITS.maxPosition}
          onChange={(value) => onUpdate(room.id, {
            position: { ...room.position, x: value }
          })}
        />
        <ValidatedInput
          label="Y Position"
          value={room.position.y}
          min={DIMENSION_LIMITS.minPosition}
          max={DIMENSION_LIMITS.maxPosition}
          onChange={(value) => onUpdate(room.id, {
            position: { ...room.position, y: value }
          })}
        />
      </div>

      <div className="pt-2 border-t border-slate-700">
        <p className="text-sm text-slate-400">
          Area: <span className="text-white font-semibold">
            {((room.dimensions.width * room.dimensions.depth) / 1000000).toFixed(2)} m²
          </span>
        </p>
      </div>
    </div>
  )
}

export default function FloorPlanEditor() {
  // Zustand stores
  const {
    floorPlan,
    addRoom,
    updateRoom,
    deleteRoom,
    moveRoom,
    resizeRoom
  } = useFloorPlanStore()

  const {
    selectedIds,
    select,
    clearSelection,
    toggleSelect,
    selectMultiple,
    hasSelection,
    getFirstSelected
  } = useSelectionStore()

  // For undo/redo - subscribe to temporal state for reactivity
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    // Subscribe to temporal state changes
    const temporalStore = useFloorPlanStore.temporal
    const updateUndoRedoState = () => {
      const { pastStates, futureStates } = temporalStore.getState()
      setCanUndo(pastStates.length > 0)
      setCanRedo(futureStates.length > 0)
    }

    // Initial state
    updateUndoRedoState()

    // Subscribe to changes
    const unsubscribe = temporalStore.subscribe(updateUndoRedoState)
    return unsubscribe
  }, [])

  const handleUndo = useCallback(() => {
    useFloorPlanStore.temporal.getState().undo()
  }, [])

  const handleRedo = useCallback(() => {
    useFloorPlanStore.temporal.getState().redo()
  }, [])

  // For persistence
  const { saveStatus, lastSaved } = useFloorPlanPersistence(useFloorPlanStore, 'hvac_floor_plan')

  // Local UI state
  const [scale, setScale] = useState(0.05) // 1mm = 0.05px
  const [gridSize, setGridSize] = useState(500) // 500mm grid
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const svgRef = useRef(null)

  // Pan and zoom state
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacebarDown, setSpacebarDown] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false)
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 })
  const [boxEnd, setBoxEnd] = useState({ x: 0, y: 0 })

  // Alignment guides state
  // Each guide: { type: 'vertical'|'horizontal', position: number }
  const [alignmentGuides, setAlignmentGuides] = useState([])

  // Clipboard state for copy/paste operations
  const [clipboard, setClipboard] = useState([])

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // 2D/3D view mode state
  const [viewMode, setViewMode] = useState('2d') // '2d' | '3d'

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'default'
  })

  // Canvas dimensions
  const canvasWidth = floorPlan.overall_dimensions.width * scale + 100
  const canvasHeight = floorPlan.overall_dimensions.depth * scale + 100

  // Get selected room
  const selectedRoom = floorPlan.rooms.find(r => r.id === getFirstSelected())

  // Generate unique ID
  const generateId = () => `room_${Date.now().toString(36)}`

  // Find a position that doesn't overlap with existing rooms
  const findNonOverlappingPosition = (existingRooms, newWidth, newDepth) => {
    const maxWidth = floorPlan.overall_dimensions.width
    const maxDepth = floorPlan.overall_dimensions.depth
    const padding = gridSize

    // Grid-based placement: try positions row by row
    for (let y = padding; y < maxDepth - newDepth; y += gridSize * 2) {
      for (let x = padding; x < maxWidth - newWidth; x += gridSize * 2) {
        const candidate = { x, y }
        const overlaps = existingRooms.some(room => {
          return !(candidate.x + newWidth <= room.position.x ||
                   candidate.x >= room.position.x + room.dimensions.width ||
                   candidate.y + newDepth <= room.position.y ||
                   candidate.y >= room.position.y + room.dimensions.depth)
        })
        if (!overlaps) return candidate
      }
    }

    // Fallback: offset from last room
    if (existingRooms.length > 0) {
      const lastRoom = existingRooms[existingRooms.length - 1]
      return {
        x: Math.min(lastRoom.position.x + gridSize, maxWidth - newWidth - padding),
        y: Math.min(lastRoom.position.y + gridSize, maxDepth - newDepth - padding)
      }
    }

    return { x: padding, y: padding }
  }

  // Add a new room
  const handleAddRoom = (roomType) => {
    const defaultSize = DEFAULT_ROOM_SIZES[roomType] || DEFAULT_ROOM_SIZES.other
    const position = findNonOverlappingPosition(floorPlan.rooms, defaultSize.width, defaultSize.depth)
    const newRoom = {
      id: generateId(),
      name: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} ${floorPlan.rooms.length + 1}`,
      room_type: roomType,
      position: position,
      dimensions: { width: defaultSize.width, depth: defaultSize.depth, height: 2743 },
      walls: [],
      fixtures: [],
      hvac_zone: null,
      occupancy: roomType === 'bedroom' ? 2 : roomType === 'living' ? 4 : 0,
      metadata: {}
    }

    addRoom(newRoom)
    select(newRoom.id)
  }

  // Confirm dialog helpers
  const showConfirmDialog = useCallback(({ title, message, onConfirm, variant = 'default' }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant
    })
  }, [])

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Delete selected room
  const handleDeleteRoom = () => {
    const selectedId = getFirstSelected()
    if (!selectedId) return

    const room = floorPlan.rooms.find(r => r.id === selectedId)

    showConfirmDialog({
      title: 'Delete Room?',
      message: `Are you sure you want to delete "${room?.name || 'this room'}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        deleteRoom(selectedId)
        clearSelection()
        closeConfirmDialog()
      }
    })
  }

  // Drag room
  const handleDragRoom = (roomId, newX, newY) => {
    // Snap to grid
    const snappedX = Math.round(newX / gridSize) * gridSize
    const snappedY = Math.round(newY / gridSize) * gridSize

    // Clamp to bounds
    const room = floorPlan.rooms.find(r => r.id === roomId)
    const clampedX = Math.max(0, Math.min(snappedX, floorPlan.overall_dimensions.width - room.dimensions.width))
    const clampedY = Math.max(0, Math.min(snappedY, floorPlan.overall_dimensions.depth - room.dimensions.depth))

    // Detect alignments with other rooms
    const draggedRoom = {
      ...room,
      position: { x: clampedX, y: clampedY }
    }
    const guides = detectAlignments(draggedRoom, floorPlan.rooms)
    setAlignmentGuides(guides)

    moveRoom(roomId, { x: clampedX, y: clampedY })
  }

  // Resize room with 8-directional handle support
  const handleResizeRoom = (roomId, dx, dy, handleId) => {
    const room = floorPlan.rooms.find(r => r.id === roomId)
    if (!room) return

    let newX = room.position.x
    let newY = room.position.y
    let newWidth = room.dimensions.width
    let newDepth = room.dimensions.depth

    // Calculate new dimensions based on which handle is being dragged
    switch (handleId) {
      case 'nw': // Top-left: adjust x, y, width, depth (bottom-right anchored)
        newX = room.position.x + dx
        newY = room.position.y + dy
        newWidth = room.dimensions.width - dx
        newDepth = room.dimensions.depth - dy
        break
      case 'n': // Top: adjust y and depth (bottom anchored)
        newY = room.position.y + dy
        newDepth = room.dimensions.depth - dy
        break
      case 'ne': // Top-right: adjust y, width, depth (bottom-left anchored)
        newY = room.position.y + dy
        newWidth = room.dimensions.width + dx
        newDepth = room.dimensions.depth - dy
        break
      case 'e': // Right: adjust width (left anchored)
        newWidth = room.dimensions.width + dx
        break
      case 'se': // Bottom-right: adjust width, depth (top-left anchored) - original behavior
        newWidth = room.dimensions.width + dx
        newDepth = room.dimensions.depth + dy
        break
      case 's': // Bottom: adjust depth (top anchored)
        newDepth = room.dimensions.depth + dy
        break
      case 'sw': // Bottom-left: adjust x, width, depth (top-right anchored)
        newX = room.position.x + dx
        newWidth = room.dimensions.width - dx
        newDepth = room.dimensions.depth + dy
        break
      case 'w': // Left: adjust x, width (right anchored)
        newX = room.position.x + dx
        newWidth = room.dimensions.width - dx
        break
      default:
        return
    }

    // Enforce minimum size constraints using DIMENSION_LIMITS
    const minSize = Math.max(gridSize, DIMENSION_LIMITS.minWidth)
    if (newWidth < minSize) {
      if (handleId.includes('w')) {
        newX = room.position.x + room.dimensions.width - minSize
      }
      newWidth = minSize
    }
    if (newDepth < minSize) {
      if (handleId.includes('n')) {
        newY = room.position.y + room.dimensions.depth - minSize
      }
      newDepth = minSize
    }

    // Enforce maximum size constraints
    if (newWidth > DIMENSION_LIMITS.maxWidth) {
      newWidth = DIMENSION_LIMITS.maxWidth
    }
    if (newDepth > DIMENSION_LIMITS.maxDepth) {
      newDepth = DIMENSION_LIMITS.maxDepth
    }

    // Snap to grid
    const snappedX = Math.round(newX / gridSize) * gridSize
    const snappedY = Math.round(newY / gridSize) * gridSize
    const snappedWidth = Math.max(minSize, Math.round(newWidth / gridSize) * gridSize)
    const snappedDepth = Math.max(minSize, Math.round(newDepth / gridSize) * gridSize)

    // Clamp position to bounds
    const clampedX = Math.max(0, Math.min(snappedX, floorPlan.overall_dimensions.width - snappedWidth))
    const clampedY = Math.max(0, Math.min(snappedY, floorPlan.overall_dimensions.depth - snappedDepth))

    resizeRoom(roomId, { width: snappedWidth, depth: snappedDepth }, { x: clampedX, y: clampedY })
  }

  // Update room properties
  const handleUpdateRoom = (roomId, updates) => {
    updateRoom(roomId, updates)
  }

  // Export to JSON
  const handleExport = () => {
    const json = JSON.stringify(floorPlan, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${floorPlan.name.replace(/\s+/g, '_')}_floorplan.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Deselect on background click
  const handleBackgroundClick = () => {
    clearSelection()
  }

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 0.2))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.02))
  const handleZoomReset = () => setScale(0.05)

  // Reset view (zoom and pan)
  const handleResetView = () => {
    setScale(0.05)
    setViewOffset({ x: 0, y: 0 })
  }

  // Wheel zoom handler - zoom centered on mouse cursor
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.02, Math.min(0.2, prev * delta)))
  }, [])

  // Spacebar key handlers for pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpacebarDown(true)
      }
    }
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacebarDown(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Pan handlers
  const handlePanStart = (e) => {
    if (spacebarDown) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y })
    }
  }

  const handlePanMove = (e) => {
    if (isPanning) {
      setViewOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // Detect alignments between dragged room and other rooms
  const detectAlignments = useCallback((draggedRoom, allRooms) => {
    const guides = []
    const threshold = gridSize // Snap threshold in mm

    const draggedLeft = draggedRoom.position.x
    const draggedRight = draggedRoom.position.x + draggedRoom.dimensions.width
    const draggedTop = draggedRoom.position.y
    const draggedBottom = draggedRoom.position.y + draggedRoom.dimensions.depth
    const draggedCenterX = draggedRoom.position.x + draggedRoom.dimensions.width / 2
    const draggedCenterY = draggedRoom.position.y + draggedRoom.dimensions.depth / 2

    allRooms.forEach(room => {
      if (room.id === draggedRoom.id) return

      const roomLeft = room.position.x
      const roomRight = room.position.x + room.dimensions.width
      const roomTop = room.position.y
      const roomBottom = room.position.y + room.dimensions.depth
      const roomCenterX = room.position.x + room.dimensions.width / 2
      const roomCenterY = room.position.y + room.dimensions.depth / 2

      // Vertical alignments (x-axis) - left/right edges and center
      if (Math.abs(draggedLeft - roomLeft) < threshold) {
        guides.push({ type: 'vertical', position: roomLeft })
      }
      if (Math.abs(draggedLeft - roomRight) < threshold) {
        guides.push({ type: 'vertical', position: roomRight })
      }
      if (Math.abs(draggedRight - roomLeft) < threshold) {
        guides.push({ type: 'vertical', position: roomLeft })
      }
      if (Math.abs(draggedRight - roomRight) < threshold) {
        guides.push({ type: 'vertical', position: roomRight })
      }
      if (Math.abs(draggedCenterX - roomCenterX) < threshold) {
        guides.push({ type: 'vertical', position: roomCenterX })
      }

      // Horizontal alignments (y-axis) - top/bottom edges and center
      if (Math.abs(draggedTop - roomTop) < threshold) {
        guides.push({ type: 'horizontal', position: roomTop })
      }
      if (Math.abs(draggedTop - roomBottom) < threshold) {
        guides.push({ type: 'horizontal', position: roomBottom })
      }
      if (Math.abs(draggedBottom - roomTop) < threshold) {
        guides.push({ type: 'horizontal', position: roomTop })
      }
      if (Math.abs(draggedBottom - roomBottom) < threshold) {
        guides.push({ type: 'horizontal', position: roomBottom })
      }
      if (Math.abs(draggedCenterY - roomCenterY) < threshold) {
        guides.push({ type: 'horizontal', position: roomCenterY })
      }
    })

    // Dedupe guides by type and position
    return guides.filter((g, i, arr) =>
      arr.findIndex(x => x.type === g.type && x.position === g.position) === i
    )
  }, [gridSize])

  // Clear alignment guides when drag ends
  const handleDragEnd = useCallback(() => {
    setAlignmentGuides([])
  }, [])

  // Clipboard handlers for keyboard shortcuts
  const handleCopy = useCallback(() => {
    const selectedRooms = floorPlan.rooms.filter(r => selectedIds.includes(r.id))
    if (selectedRooms.length > 0) {
      setClipboard(selectedRooms.map(r => ({ ...r })))
    }
  }, [floorPlan.rooms, selectedIds])

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return

    const newRoomIds = []
    clipboard.forEach((room, i) => {
      const newRoom = {
        ...room,
        id: generateId(),
        name: `${room.name} (copy)`,
        position: {
          x: room.position.x + gridSize * (i + 1),
          y: room.position.y + gridSize * (i + 1)
        }
      }
      addRoom(newRoom)
      newRoomIds.push(newRoom.id)
    })
    selectMultiple(newRoomIds)
  }, [clipboard, gridSize, addRoom, selectMultiple])

  const handleCut = useCallback(() => {
    handleCopy()
    selectedIds.forEach(id => deleteRoom(id))
    clearSelection()
  }, [handleCopy, selectedIds, deleteRoom, clearSelection])

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return

    const count = selectedIds.length

    showConfirmDialog({
      title: `Delete ${count} Room${count > 1 ? 's' : ''}?`,
      message: `Are you sure you want to delete ${count} room${count > 1 ? 's' : ''}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        selectedIds.forEach(id => deleteRoom(id))
        clearSelection()
        closeConfirmDialog()
      }
    })
  }, [selectedIds, deleteRoom, clearSelection, showConfirmDialog, closeConfirmDialog])

  const handleSelectAll = useCallback(() => {
    selectMultiple(floorPlan.rooms.map(r => r.id))
  }, [floorPlan.rooms, selectMultiple])

  // Import handler
  const handleImportComplete = useCallback((importedData) => {
    // Add imported rooms to the floor plan
    importedData.rooms?.forEach(room => {
      addRoom(room)
    })
  }, [addRoom])

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    [FLOOR_PLAN_SHORTCUTS.undo]: handleUndo,
    [FLOOR_PLAN_SHORTCUTS.redo]: handleRedo,
    [FLOOR_PLAN_SHORTCUTS.redoAlt]: handleRedo,
    [FLOOR_PLAN_SHORTCUTS.copy]: handleCopy,
    [FLOOR_PLAN_SHORTCUTS.paste]: handlePaste,
    [FLOOR_PLAN_SHORTCUTS.cut]: handleCut,
    [FLOOR_PLAN_SHORTCUTS.delete]: handleDeleteSelected,
    [FLOOR_PLAN_SHORTCUTS.deleteAlt]: handleDeleteSelected,
    [FLOOR_PLAN_SHORTCUTS.selectAll]: handleSelectAll,
    [FLOOR_PLAN_SHORTCUTS.deselect]: clearSelection,
    [FLOOR_PLAN_SHORTCUTS.zoomIn]: handleZoomIn,
    [FLOOR_PLAN_SHORTCUTS.zoomInAlt]: handleZoomIn,
    [FLOOR_PLAN_SHORTCUTS.zoomOut]: handleZoomOut,
    [FLOOR_PLAN_SHORTCUTS.zoomReset]: handleZoomReset,
    [FLOOR_PLAN_SHORTCUTS.help]: () => setShowShortcutsModal(true),
    'v': () => setViewMode(prev => prev === '2d' ? '3d' : '2d'),
  })

  // Box selection handlers
  const handleCanvasMouseDown = (e) => {
    // Only start box select if clicking on background (not a room) and no spacebar (not panning)
    if (!spacebarDown && e.target === e.currentTarget) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - 50 - viewOffset.x) / scale
      const y = (e.clientY - rect.top - 50 - viewOffset.y) / scale
      setBoxStart({ x, y })
      setBoxEnd({ x, y })
      setIsBoxSelecting(true)
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (isBoxSelecting) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - 50 - viewOffset.x) / scale
      const y = (e.clientY - rect.top - 50 - viewOffset.y) / scale
      setBoxEnd({ x, y })
    }
  }

  const handleCanvasMouseUp = () => {
    if (isBoxSelecting) {
      // Calculate selection box bounds
      const left = Math.min(boxStart.x, boxEnd.x)
      const right = Math.max(boxStart.x, boxEnd.x)
      const top = Math.min(boxStart.y, boxEnd.y)
      const bottom = Math.max(boxStart.y, boxEnd.y)

      // Find rooms that intersect with box
      const roomsInBox = floorPlan.rooms.filter(room => {
        const roomLeft = room.position.x
        const roomRight = room.position.x + room.dimensions.width
        const roomTop = room.position.y
        const roomBottom = room.position.y + room.dimensions.depth

        // Check intersection
        return !(roomRight < left || roomLeft > right || roomBottom < top || roomTop > bottom)
      })

      if (roomsInBox.length > 0) {
        selectMultiple(roomsInBox.map(r => r.id))
      } else {
        clearSelection()
      }

      setIsBoxSelecting(false)
    }
  }

  // Calculate total area
  const totalArea = floorPlan.rooms.reduce(
    (sum, room) => sum + (room.dimensions.width * room.dimensions.depth) / 1000000,
    0
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Floor Plan Editor</h1>
          <p className="text-slate-400 mt-1">
            {floorPlan.name} - {floorPlan.rooms.length} rooms - {totalArea.toFixed(1)} m² total
            {selectedIds.length > 1 && ` (${selectedIds.length} selected)`}
          </p>
        </div>
        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-sm mr-4">
          {saveStatus === 'saving' && (
            <span className="text-yellow-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              Save failed
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-3 py-1 bg-slate-700 rounded text-white disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="px-3 py-1 bg-slate-700 rounded text-white disabled:opacity-50"
            title="Redo (Ctrl+Y)"
          >
            Redo
          </button>
          <div className="flex gap-1 bg-slate-700 rounded p-0.5 mr-2">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === '2d'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === '3d'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3D
            </button>
          </div>
          <div className="w-px bg-slate-600 mx-1"></div>
          <button onClick={handleZoomOut} className="px-3 py-1 bg-slate-700 rounded text-white">-</button>
          <button onClick={handleZoomReset} className="px-3 py-1 bg-slate-700 rounded text-white">
            {Math.round(scale * 1000)}%
          </button>
          <button onClick={handleZoomIn} className="px-3 py-1 bg-slate-700 rounded text-white">+</button>
          <button
            onClick={handleResetView}
            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
            title="Reset zoom and pan"
          >
            Reset View
          </button>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
            title="Keyboard Shortcuts (?)"
          >
            <span role="img" aria-label="Keyboard">Shortcuts</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onAddRoom={handleAddRoom}
        onDelete={handleDeleteRoom}
        onExport={handleExport}
        onImport={() => setShowImportDialog(true)}
        selectedRoom={selectedRoom}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3 bg-slate-900 rounded-lg overflow-hidden h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[600px] min-h-[300px] relative">
          {/* Empty state when no rooms */}
          {floorPlan.rooms.length === 0 && viewMode === '2d' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 pointer-events-none">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-lg font-medium mb-2">No rooms yet</p>
              <p className="text-sm">Click the toolbar buttons above to add your first room</p>
            </div>
          )}
          {viewMode === '2d' ? (
            <div
              className="w-full h-full overflow-auto"
              onWheel={handleWheel}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              style={{ cursor: spacebarDown ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            >
              <svg
                ref={svgRef}
                width={canvasWidth}
                height={canvasHeight}
                className="cursor-crosshair absolute inset-0"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* Background */}
                <rect width={canvasWidth} height={canvasHeight} fill="#0f172a" />

                {/* Transform group for padding and pan offset */}
                <g transform={`translate(${50 + viewOffset.x}, ${50 + viewOffset.y})`}>
                  {/* Grid */}
                  <Grid
                    width={floorPlan.overall_dimensions.width * scale}
                    height={floorPlan.overall_dimensions.depth * scale}
                    gridSize={gridSize}
                    scale={scale}
                  />

                  {/* Building outline */}
                  <rect
                    x={0}
                    y={0}
                    width={floorPlan.overall_dimensions.width * scale}
                    height={floorPlan.overall_dimensions.depth * scale}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={2}
                    strokeDasharray="10,5"
                  />

                  {/* Dimension labels */}
                  <text
                    x={floorPlan.overall_dimensions.width * scale / 2}
                    y={-10}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize={12}
                  >
                    {(floorPlan.overall_dimensions.width / 1000).toFixed(2)}m
                  </text>
                  <text
                    x={-10}
                    y={floorPlan.overall_dimensions.depth * scale / 2}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize={12}
                    transform={`rotate(-90, -10, ${floorPlan.overall_dimensions.depth * scale / 2})`}
                  >
                    {(floorPlan.overall_dimensions.depth / 1000).toFixed(2)}m
                  </text>

                  {/* Alignment guides - rendered before rooms so they appear behind */}
                  <AlignmentGuides
                    guides={alignmentGuides}
                    scale={scale}
                    canvasWidth={floorPlan.overall_dimensions.width}
                    canvasHeight={floorPlan.overall_dimensions.depth}
                  />

                  {/* Rooms */}
                  {floorPlan.rooms.map(room => (
                    <Room
                      key={room.id}
                      room={room}
                      scale={scale}
                      isSelected={selectedIds.includes(room.id)}
                      onSelect={select}
                      onToggleSelect={toggleSelect}
                      onDrag={handleDragRoom}
                      onResize={handleResizeRoom}
                      onDragEnd={handleDragEnd}
                    />
                  ))}

                  {/* Selection box visual */}
                  {isBoxSelecting && (
                    <rect
                      x={Math.min(boxStart.x, boxEnd.x) * scale}
                      y={Math.min(boxStart.y, boxEnd.y) * scale}
                      width={Math.abs(boxEnd.x - boxStart.x) * scale}
                      height={Math.abs(boxEnd.y - boxStart.y) * scale}
                      fill="rgba(59, 130, 246, 0.2)"
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeDasharray="4,4"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </g>
              </svg>
            </div>
          ) : (
            <FloorPlan3DView
              floorPlan={floorPlan}
              selectedRoomId={getFirstSelected()}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Properties panel - drawer on mobile, sidebar on desktop */}
        <div className={`
          lg:relative lg:block
          ${propertiesOpen ? 'fixed inset-x-0 bottom-0 z-50' : 'hidden lg:block'}
          lg:space-y-4
        `}>
          {/* Mobile drawer header */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
            <span className="font-semibold">Room Properties</span>
            <button onClick={() => setPropertiesOpen(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[50vh] lg:max-h-none overflow-auto space-y-4">
            <PropertiesPanel
              room={selectedRoom}
              onUpdate={handleUpdateRoom}
            />

            {/* Instructions */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Instructions</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>Click toolbar buttons to add rooms</li>
                <li>Drag rooms to reposition</li>
                <li>Green guides show alignment with other rooms</li>
                <li>Drag any of the 8 handles to resize</li>
                <li>Corner handles resize both dimensions</li>
                <li>Edge handles resize one dimension</li>
                <li>Click room to select and edit properties</li>
                <li>Ctrl+click to add/remove from selection</li>
                <li>Drag on background to box-select multiple rooms</li>
                <li>Click background to deselect</li>
                <li>Scroll wheel to zoom in/out</li>
                <li>Hold spacebar + drag to pan the view</li>
                <li>Click "Reset View" to restore defaults</li>
                <li>Export JSON for use with HVAC router</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile properties toggle - only visible on small screens when room selected */}
      {selectedRoom && (
        <button
          className="lg:hidden fixed bottom-4 right-4 z-40 p-3 bg-primary-600 rounded-full shadow-lg"
          onClick={() => setPropertiesOpen(!propertiesOpen)}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      )}

      {/* Backdrop for mobile drawer */}
      {propertiesOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setPropertiesOpen(false)}
        />
      )}

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Import dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportComplete}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  )
}
