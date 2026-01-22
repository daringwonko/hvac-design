import { useState, useRef, useCallback, useEffect } from 'react'

// HVAC Equipment types
const EQUIPMENT_TYPES = {
  mini_split_indoor: {
    name: 'Mini-Split Indoor',
    icon: '❄️',
    width: 800,
    height: 300,
    color: '#3b82f6',
    btuOptions: [6000, 9000, 12000, 18000, 24000]
  },
  mini_split_outdoor: {
    name: 'Mini-Split Outdoor',
    icon: '🌡️',
    width: 900,
    height: 400,
    color: '#6366f1',
    btuOptions: [24000, 36000, 48000]
  },
  hrv: {
    name: 'HRV Unit',
    icon: '🔄',
    width: 600,
    height: 400,
    color: '#10b981',
    cfmOptions: [70, 100, 150, 200]
  },
  supply_diffuser: {
    name: 'Supply Diffuser',
    icon: '💨',
    width: 300,
    height: 300,
    color: '#06b6d4',
    cfmOptions: [25, 50, 75, 100]
  },
  return_grille: {
    name: 'Return Grille',
    icon: '🔙',
    width: 400,
    height: 200,
    color: '#8b5cf6',
    cfmOptions: [50, 100, 150]
  },
  exhaust_fan: {
    name: 'Exhaust Fan',
    icon: '🌀',
    width: 250,
    height: 250,
    color: '#f59e0b',
    cfmOptions: [25, 50, 80, 110]
  },
  radiant_manifold: {
    name: 'Radiant Manifold',
    icon: '🔥',
    width: 500,
    height: 150,
    color: '#ef4444',
    zones: [4, 6, 8, 10, 12]
  }
}

// HVAC System types
const SYSTEM_TYPES = [
  { id: 'vrf', name: 'VRF Multi-Zone', efficiency: 4.2 },
  { id: 'split_system', name: 'Split System', efficiency: 3.5 },
  { id: 'radiant_floor', name: 'Radiant Floor', efficiency: 0.95 },
  { id: 'hrv_erv', name: 'HRV/ERV Ventilation', efficiency: 0.8 }
]

function EquipmentPalette({ onDragStart }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>❄️</span> HVAC Equipment
      </h3>
      <div className="space-y-2">
        {Object.entries(EQUIPMENT_TYPES).map(([type, config]) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="flex items-center gap-2 p-2 bg-slate-700 rounded cursor-grab hover:bg-slate-600 transition-colors"
            style={{ borderLeft: `3px solid ${config.color}` }}
          >
            <span className="text-lg">{config.icon}</span>
            <span className="text-xs text-white">{config.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DuctSegment({ segment, scale, isSelected, onSelect }) {
  const { start, end, width, type } = segment
  const x1 = start.x * scale
  const y1 = start.y * scale
  const x2 = end.x * scale
  const y2 = end.y * scale
  const strokeWidth = (width || 150) * scale

  const color = type === 'supply' ? '#3b82f6' : type === 'return' ? '#8b5cf6' : '#10b981'

  return (
    <g onClick={() => onSelect(segment.id)}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.6}
        strokeLinecap="round"
      />
      {isSelected && (
        <>
          <circle cx={x1} cy={y1} r={6} fill="#fff" stroke={color} strokeWidth={2} />
          <circle cx={x2} cy={y2} r={6} fill="#fff" stroke={color} strokeWidth={2} />
        </>
      )}
    </g>
  )
}

function Equipment({ item, scale, isSelected, onSelect, onDrag }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const config = EQUIPMENT_TYPES[item.type]
  const x = item.position.x * scale
  const y = item.position.y * scale
  const width = config.width * scale
  const height = config.height * scale

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelect(item.id)
    e.stopPropagation()
  }

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale
      onDrag(item.id, item.position.x + dx, item.position.y + dy)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, dragStart, item, scale, onDrag])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <g
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={config.color}
        fillOpacity={0.3}
        stroke={isSelected ? '#fff' : config.color}
        strokeWidth={isSelected ? 2 : 1}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.max(10, height * 0.4)}
      >
        {config.icon}
      </text>
      <text
        x={x + width / 2}
        y={y + height + 12}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={9}
      >
        {item.specs?.btu ? `${item.specs.btu / 1000}k BTU` : config.name}
      </text>
    </g>
  )
}

function PropertiesPanel({ selectedItem, equipment, ducts, onUpdate, onDelete, calculations }) {
  const item = selectedItem?.type === 'equipment'
    ? equipment.find(e => e.id === selectedItem.id)
    : selectedItem?.type === 'duct'
      ? ducts.find(d => d.id === selectedItem.id)
      : null

  if (!item) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Properties</h3>
        <p className="text-slate-400 text-xs">Select equipment or duct to edit</p>

        {calculations && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-white mb-2">System Summary</h4>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Cooling: <span className="text-cyan-400">{calculations.cooling?.toFixed(1) || 0} kW</span></p>
              <p>Heating: <span className="text-orange-400">{calculations.heating?.toFixed(1) || 0} kW</span></p>
              <p>Airflow: <span className="text-blue-400">{calculations.airflow?.toFixed(0) || 0} L/s</span></p>
              <p>Est. Cost: <span className="text-green-400">${calculations.cost?.toFixed(0) || 0}</span></p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const config = item.type ? EQUIPMENT_TYPES[item.type] : null

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">
        {config ? config.name : 'Duct Segment'}
      </h3>

      {config?.btuOptions && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Capacity (BTU)</label>
          <select
            value={item.specs?.btu || config.btuOptions[0]}
            onChange={(e) => onUpdate(item.id, { specs: { ...item.specs, btu: parseInt(e.target.value) } })}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            {config.btuOptions.map(btu => (
              <option key={btu} value={btu}>{btu.toLocaleString()} BTU</option>
            ))}
          </select>
        </div>
      )}

      {config?.cfmOptions && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Airflow (CFM)</label>
          <select
            value={item.specs?.cfm || config.cfmOptions[0]}
            onChange={(e) => onUpdate(item.id, { specs: { ...item.specs, cfm: parseInt(e.target.value) } })}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            {config.cfmOptions.map(cfm => (
              <option key={cfm} value={cfm}>{cfm} CFM</option>
            ))}
          </select>
        </div>
      )}

      {!config && (
        <>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Duct Type</label>
            <select
              value={item.ductType || 'supply'}
              onChange={(e) => onUpdate(item.id, { ductType: e.target.value })}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="supply">Supply</option>
              <option value="return">Return</option>
              <option value="exhaust">Exhaust</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Width (mm)</label>
            <input
              type="number"
              value={item.width || 150}
              onChange={(e) => onUpdate(item.id, { width: parseInt(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            />
          </div>
        </>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
      >
        Delete
      </button>
    </div>
  )
}

function Toolbar({ tool, setTool, systemType, setSystemType, onCalculate, onExport, onAutoDesign, isLoading }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
      {/* Tool buttons - SketchUp style */}
      <div className="flex gap-1 border-r border-slate-600 pr-2">
        <button
          onClick={() => setTool('select')}
          className={`p-2 rounded ${tool === 'select' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          title="Select (V)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </button>
        <button
          onClick={() => setTool('duct')}
          className={`p-2 rounded ${tool === 'duct' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          title="Draw Duct (D)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={() => setTool('measure')}
          className={`p-2 rounded ${tool === 'measure' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          title="Measure (M)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </div>

      {/* System type selector */}
      <div className="flex items-center gap-2 border-r border-slate-600 pr-2">
        <span className="text-xs text-slate-400">System:</span>
        <select
          value={systemType}
          onChange={(e) => setSystemType(e.target.value)}
          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
        >
          {SYSTEM_TYPES.map(sys => (
            <option key={sys.id} value={sys.id}>{sys.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-1 ml-auto">
        <button
          onClick={onAutoDesign}
          disabled={isLoading}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-wait text-white text-xs rounded flex items-center gap-1"
          title="Auto-design HVAC system using AI"
        >
          <span>{isLoading ? '...' : '🤖'}</span> Auto-Design
        </button>
        <button
          onClick={onCalculate}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded flex items-center gap-1"
        >
          <span>⚡</span> Calculate
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded flex items-center gap-1"
        >
          <span>📤</span> Export
        </button>
      </div>
    </div>
  )
}

function RoomOverlay({ rooms, scale }) {
  return (
    <g className="room-overlay" opacity={0.3}>
      {rooms.map(room => (
        <rect
          key={room.id}
          x={room.position.x * scale}
          y={room.position.y * scale}
          width={room.dimensions.width * scale}
          height={room.dimensions.depth * scale}
          fill="#475569"
          stroke="#64748b"
          strokeWidth={1}
        />
      ))}
    </g>
  )
}

export default function HVACRouter({ floorPlan, onSave }) {
  // State
  const [equipment, setEquipment] = useState([])
  const [ducts, setDucts] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [tool, setTool] = useState('select')
  const [systemType, setSystemType] = useState('vrf')
  const [scale, setScale] = useState(0.05)
  const [calculations, setCalculations] = useState(null)
  const [isDrawingDuct, setIsDrawingDuct] = useState(false)
  const [ductStart, setDuctStart] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const svgRef = useRef(null)

  // Reset duct drawing state when tool changes away from 'duct'
  useEffect(() => {
    if (tool !== 'duct') {
      setIsDrawingDuct(false)
      setDuctStart(null)
    }
  }, [tool])

  // Default floor plan if none provided
  const plan = floorPlan || {
    name: 'Sample Floor Plan',
    overall_dimensions: { width: 17850, depth: 7496 },
    rooms: [
      { id: 'r1', name: 'Living Room', position: { x: 0, y: 1355 }, dimensions: { width: 4614, depth: 3000 } },
      { id: 'r2', name: 'Kitchen', position: { x: 4614, y: 1355 }, dimensions: { width: 5630, depth: 2980 } },
      { id: 'r3', name: 'Master Bedroom', position: { x: 15050, y: 0 }, dimensions: { width: 2800, depth: 5941 } },
    ]
  }

  const canvasWidth = plan.overall_dimensions.width * scale + 100
  const canvasHeight = plan.overall_dimensions.depth * scale + 100

  // Generate unique ID
  const generateId = () => `hvac_${Date.now().toString(36)}`

  // Handle drop from palette
  const handleDrop = (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('equipment_type')
    if (!type) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - 50) / scale
    const y = (e.clientY - rect.top - 50) / scale

    const config = EQUIPMENT_TYPES[type]
    const newEquipment = {
      id: generateId(),
      type,
      position: { x, y },
      specs: {
        btu: config.btuOptions?.[1] || null,
        cfm: config.cfmOptions?.[1] || null
      }
    }

    setEquipment(prev => [...prev, newEquipment])
    setSelectedItem({ type: 'equipment', id: newEquipment.id })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('equipment_type', type)
  }

  // Handle duct drawing
  const handleCanvasClick = (e) => {
    if (tool !== 'duct') {
      setSelectedItem(null)
      return
    }

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - 50) / scale
    const y = (e.clientY - rect.top - 50) / scale

    if (!isDrawingDuct) {
      setDuctStart({ x, y })
      setIsDrawingDuct(true)
    } else {
      const newDuct = {
        id: generateId(),
        start: ductStart,
        end: { x, y },
        width: 150,
        type: 'supply'
      }
      setDucts(prev => [...prev, newDuct])
      setDuctStart({ x, y }) // Continue from end point
    }
  }

  // Handle equipment drag
  const handleEquipmentDrag = (id, newX, newY) => {
    setEquipment(prev => prev.map(e =>
      e.id === id ? { ...e, position: { x: newX, y: newY } } : e
    ))
  }

  // Update item
  const handleUpdateItem = (id, updates) => {
    if (selectedItem?.type === 'equipment') {
      setEquipment(prev => prev.map(e =>
        e.id === id ? { ...e, ...updates } : e
      ))
    } else {
      setDucts(prev => prev.map(d =>
        d.id === id ? { ...d, ...updates } : d
      ))
    }
  }

  // Delete item
  const handleDeleteItem = (id) => {
    if (selectedItem?.type === 'equipment') {
      setEquipment(prev => prev.filter(e => e.id !== id))
    } else {
      setDucts(prev => prev.filter(d => d.id !== id))
    }
    setSelectedItem(null)
  }

  // Calculate system
  const handleCalculate = () => {
    // Simplified calculation
    const totalBTU = equipment
      .filter(e => e.specs?.btu)
      .reduce((sum, e) => sum + (e.specs.btu || 0), 0)

    const totalCFM = equipment
      .filter(e => e.specs?.cfm)
      .reduce((sum, e) => sum + (e.specs.cfm || 0), 0)

    const totalArea = plan.rooms.reduce((sum, r) => sum + (r.dimensions.width * r.dimensions.depth / 1000000), 0)

    setCalculations({
      cooling: totalBTU / 3412, // BTU to kW
      heating: totalBTU / 3412 * 0.7,
      airflow: totalCFM * 0.472, // CFM to L/s
      cost: totalBTU * 0.15 + totalCFM * 5 + ducts.length * 50,
      efficiency: SYSTEM_TYPES.find(s => s.id === systemType)?.efficiency || 3.5,
      totalArea
    })
  }

  // Export
  const handleExport = () => {
    const data = {
      systemType,
      equipment,
      ducts,
      calculations,
      floorPlanId: plan.id
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hvac_design_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Auto-design using MEPSystemEngine API
  const handleAutoDesign = async () => {
    setIsLoading(true)
    try {
      // Prepare rooms data from floor plan
      const roomsData = plan.rooms.map(room => ({
        name: room.name,
        width: room.dimensions.width,
        height: room.dimensions.depth,
        x: room.position.x,
        y: room.position.y,
        occupancy: 2,
        has_window: true
      }))

      const response = await fetch('/api/hvac/auto-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: roomsData,
          systemType: systemType
        })
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Add equipment from API response
        if (result.data.equipment && result.data.equipment.length > 0) {
          const newEquipment = result.data.equipment.map((eq, idx) => ({
            id: generateId(),
            type: eq.type || 'mini_split_indoor',
            position: { x: eq.x || 100 + idx * 150, y: eq.y || 100 + idx * 100 },
            specs: {
              btu: eq.capacity ? eq.capacity * 3412 : 12000,
              cfm: eq.airflow || 100
            },
            label: eq.label
          }))
          setEquipment(prev => [...prev, ...newEquipment])
        }

        // Add ducts from API response
        if (result.data.ducts && result.data.ducts.length > 0) {
          const newDucts = result.data.ducts.map(d => ({
            id: generateId(),
            start: { x: d.startX, y: d.startY },
            end: { x: d.endX, y: d.endY },
            width: d.size?.width || 200,
            type: d.type || 'supply'
          }))
          setDucts(prev => [...prev, ...newDucts])
        }

        // Update calculations from design
        if (result.data.design) {
          setCalculations({
            cooling: result.data.design.cooling_capacity,
            heating: result.data.design.heating_capacity,
            airflow: result.data.design.airflow,
            cost: result.data.design.cost,
            efficiency: result.data.design.energy_efficiency,
            totalArea: plan.rooms.reduce((sum, r) => sum + (r.dimensions.width * r.dimensions.depth / 1000000), 0)
          })
        }

        console.log('HVAC auto-design complete:', result.data)
      } else {
        console.error('Auto-design failed:', result.error)
        alert('Auto-design failed: ' + (result.error?.message || 'Unknown error'))
      }
    } catch (err) {
      console.error('Auto-design API error:', err)
      alert('Failed to connect to API. Make sure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v' || e.key === 'V') setTool('select')
      if (e.key === 'd' || e.key === 'D') setTool('duct')
      if (e.key === 'm' || e.key === 'M') setTool('measure')
      if (e.key === 'Escape') {
        setIsDrawingDuct(false)
        setDuctStart(null)
        setTool('select')
      }
      if (e.key === 'Delete' && selectedItem) {
        handleDeleteItem(selectedItem.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">HVAC Router</h1>
        <p className="text-slate-400 text-sm">Design heating, ventilation, and air conditioning systems</p>
      </div>

      {/* Toolbar - SketchUp style */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        systemType={systemType}
        setSystemType={setSystemType}
        onCalculate={handleCalculate}
        onExport={handleExport}
        onAutoDesign={handleAutoDesign}
        isLoading={isLoading}
      />

      {/* Main content - SketchUp layout: palette left, canvas center, properties right */}
      <div className="flex-1 grid grid-cols-12 gap-4 mt-4">
        {/* Left panel - Equipment palette */}
        <div className="col-span-2 space-y-4">
          <EquipmentPalette onDragStart={handleDragStart} />

          {/* Layers panel */}
          <div className="bg-slate-800 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Layers</h3>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" defaultChecked className="rounded" />
                Floor Plan
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" defaultChecked className="rounded" />
                Supply Ducts
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" defaultChecked className="rounded" />
                Return Ducts
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" defaultChecked className="rounded" />
                Equipment
              </label>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="col-span-7 bg-slate-900 rounded-lg overflow-auto">
          <svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={tool === 'duct' ? 'cursor-crosshair' : 'cursor-default'}
          >
            <rect width={canvasWidth} height={canvasHeight} fill="#0f172a" />

            <g transform="translate(50, 50)">
              {/* Grid */}
              <defs>
                <pattern id="grid" width={500 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${500 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect
                width={plan.overall_dimensions.width * scale}
                height={plan.overall_dimensions.depth * scale}
                fill="url(#grid)"
              />

              {/* Building outline */}
              <rect
                width={plan.overall_dimensions.width * scale}
                height={plan.overall_dimensions.depth * scale}
                fill="none"
                stroke="#475569"
                strokeWidth={2}
              />

              {/* Room overlay */}
              <RoomOverlay rooms={plan.rooms} scale={scale} />

              {/* Ducts */}
              {ducts.map(duct => (
                <DuctSegment
                  key={duct.id}
                  segment={duct}
                  scale={scale}
                  isSelected={selectedItem?.id === duct.id}
                  onSelect={(id) => setSelectedItem({ type: 'duct', id })}
                />
              ))}

              {/* Drawing preview */}
              {isDrawingDuct && ductStart && (
                <circle
                  cx={ductStart.x * scale}
                  cy={ductStart.y * scale}
                  r={8}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}

              {/* Equipment */}
              {equipment.map(item => (
                <Equipment
                  key={item.id}
                  item={item}
                  scale={scale}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={(id) => setSelectedItem({ type: 'equipment', id })}
                  onDrag={handleEquipmentDrag}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Right panel - Properties */}
        <div className="col-span-3 space-y-4">
          <PropertiesPanel
            selectedItem={selectedItem}
            equipment={equipment}
            ducts={ducts}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            calculations={calculations}
          />

          {/* Status bar */}
          <div className="bg-slate-800 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Status</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Tool: <span className="text-white capitalize">{tool}</span></p>
              <p>Equipment: <span className="text-cyan-400">{equipment.length}</span></p>
              <p>Duct segments: <span className="text-blue-400">{ducts.length}</span></p>
              <p>Scale: <span className="text-white">{Math.round(scale * 1000)}%</span></p>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="bg-slate-800 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Shortcuts</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <p><kbd className="px-1 bg-slate-700 rounded">V</kbd> Select tool</p>
              <p><kbd className="px-1 bg-slate-700 rounded">D</kbd> Draw duct</p>
              <p><kbd className="px-1 bg-slate-700 rounded">M</kbd> Measure</p>
              <p><kbd className="px-1 bg-slate-700 rounded">Esc</kbd> Cancel</p>
              <p><kbd className="px-1 bg-slate-700 rounded">Del</kbd> Delete selected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
