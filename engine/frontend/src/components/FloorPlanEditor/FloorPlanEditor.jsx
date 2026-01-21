import { useState, useRef, useEffect, useCallback } from 'react'

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

function Room({ room, scale, isSelected, onSelect, onDrag, onResize }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const x = room.position.x * scale
  const y = room.position.y * scale
  const width = room.dimensions.width * scale
  const depth = room.dimensions.depth * scale

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) {
      setIsResizing(true)
    } else {
      setIsDragging(true)
    }
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelect(room.id)
    e.stopPropagation()
  }

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale
      onDrag(room.id, room.position.x + dx, room.position.y + dy)
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isResizing) {
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale
      onResize(room.id, room.dimensions.width + dx, room.dimensions.depth + dy)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, isResizing, dragStart, room, scale, onDrag, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

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

      {/* Resize handle (bottom-right corner) */}
      {isSelected && (
        <rect
          className="resize-handle"
          x={x + width - 10}
          y={y + depth - 10}
          width={12}
          height={12}
          fill="#ffffff"
          stroke={roomColor}
          strokeWidth={2}
          rx={2}
          style={{ cursor: 'se-resize' }}
        />
      )}
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

function Toolbar({ onAddRoom, onDelete, onExport, selectedRoom }) {
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
        <p className="text-slate-400 text-sm">Select a room to edit properties</p>
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
        <div>
          <label className="block text-sm text-slate-400 mb-1">Width (mm)</label>
          <input
            type="number"
            value={room.dimensions.width}
            onChange={(e) => onUpdate(room.id, {
              dimensions: { ...room.dimensions, width: parseFloat(e.target.value) || 0 }
            })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Depth (mm)</label>
          <input
            type="number"
            value={room.dimensions.depth}
            onChange={(e) => onUpdate(room.id, {
              dimensions: { ...room.dimensions, depth: parseFloat(e.target.value) || 0 }
            })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm text-slate-400 mb-1">X Position</label>
          <input
            type="number"
            value={room.position.x}
            onChange={(e) => onUpdate(room.id, {
              position: { ...room.position, x: parseFloat(e.target.value) || 0 }
            })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Y Position</label>
          <input
            type="number"
            value={room.position.y}
            onChange={(e) => onUpdate(room.id, {
              position: { ...room.position, y: parseFloat(e.target.value) || 0 }
            })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
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
  // Floor plan state
  const [floorPlan, setFloorPlan] = useState({
    id: 'fp_goldilocks',
    name: 'Goldilocks 3B-3B',
    overall_dimensions: { width: 17850, depth: 7496 },
    rooms: [],
    walls: []
  })

  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [scale, setScale] = useState(0.05) // 1mm = 0.05px
  const [gridSize, setGridSize] = useState(500) // 500mm grid
  const svgRef = useRef(null)

  // Canvas dimensions
  const canvasWidth = floorPlan.overall_dimensions.width * scale + 100
  const canvasHeight = floorPlan.overall_dimensions.depth * scale + 100

  // Get selected room
  const selectedRoom = floorPlan.rooms.find(r => r.id === selectedRoomId)

  // Generate unique ID
  const generateId = () => `room_${Date.now().toString(36)}`

  // Add a new room
  const handleAddRoom = (roomType) => {
    const defaultSize = DEFAULT_ROOM_SIZES[roomType] || DEFAULT_ROOM_SIZES.other
    const newRoom = {
      id: generateId(),
      name: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} ${floorPlan.rooms.length + 1}`,
      room_type: roomType,
      position: { x: 1000, y: 1000 },
      dimensions: { width: defaultSize.width, depth: defaultSize.depth, height: 2743 },
      walls: [],
      fixtures: [],
      hvac_zone: null,
      occupancy: roomType === 'bedroom' ? 2 : roomType === 'living' ? 4 : 0,
      metadata: {}
    }

    setFloorPlan(prev => ({
      ...prev,
      rooms: [...prev.rooms, newRoom]
    }))
    setSelectedRoomId(newRoom.id)
  }

  // Delete selected room
  const handleDeleteRoom = () => {
    if (!selectedRoomId) return
    setFloorPlan(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => r.id !== selectedRoomId)
    }))
    setSelectedRoomId(null)
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

    setFloorPlan(prev => ({
      ...prev,
      rooms: prev.rooms.map(r =>
        r.id === roomId
          ? { ...r, position: { x: clampedX, y: clampedY } }
          : r
      )
    }))
  }

  // Resize room
  const handleResizeRoom = (roomId, newWidth, newDepth) => {
    // Snap to grid
    const snappedWidth = Math.max(gridSize, Math.round(newWidth / gridSize) * gridSize)
    const snappedDepth = Math.max(gridSize, Math.round(newDepth / gridSize) * gridSize)

    setFloorPlan(prev => ({
      ...prev,
      rooms: prev.rooms.map(r =>
        r.id === roomId
          ? { ...r, dimensions: { ...r.dimensions, width: snappedWidth, depth: snappedDepth } }
          : r
      )
    }))
  }

  // Update room properties
  const handleUpdateRoom = (roomId, updates) => {
    setFloorPlan(prev => ({
      ...prev,
      rooms: prev.rooms.map(r =>
        r.id === roomId
          ? { ...r, ...updates }
          : r
      )
    }))
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
    setSelectedRoomId(null)
  }

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 0.2))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.02))
  const handleZoomReset = () => setScale(0.05)

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
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleZoomOut} className="px-3 py-1 bg-slate-700 rounded text-white">-</button>
          <button onClick={handleZoomReset} className="px-3 py-1 bg-slate-700 rounded text-white">
            {Math.round(scale * 1000)}%
          </button>
          <button onClick={handleZoomIn} className="px-3 py-1 bg-slate-700 rounded text-white">+</button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onAddRoom={handleAddRoom}
        onDelete={handleDeleteRoom}
        onExport={handleExport}
        selectedRoom={selectedRoom}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3 bg-slate-900 rounded-lg overflow-auto" style={{ height: '600px' }}>
          <svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            className="cursor-crosshair"
            onClick={handleBackgroundClick}
          >
            {/* Background */}
            <rect width={canvasWidth} height={canvasHeight} fill="#0f172a" />

            {/* Transform group for padding */}
            <g transform="translate(50, 50)">
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

              {/* Rooms */}
              {floorPlan.rooms.map(room => (
                <Room
                  key={room.id}
                  room={room}
                  scale={scale}
                  isSelected={room.id === selectedRoomId}
                  onSelect={setSelectedRoomId}
                  onDrag={handleDragRoom}
                  onResize={handleResizeRoom}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Properties panel */}
        <div className="space-y-4">
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
              <li>Drag corner handle to resize</li>
              <li>Click room to select and edit properties</li>
              <li>Click background to deselect</li>
              <li>Export JSON for use with HVAC router</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
