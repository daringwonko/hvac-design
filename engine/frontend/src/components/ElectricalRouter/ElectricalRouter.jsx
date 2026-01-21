import { useState, useRef, useCallback, useEffect } from 'react'

// Electrical Equipment types
const EQUIPMENT_TYPES = {
  panel: {
    name: 'Electrical Panel',
    icon: '⚡',
    width: 400,
    height: 600,
    color: '#f59e0b',
    ampOptions: [100, 150, 200, 400]
  },
  subpanel: {
    name: 'Sub Panel',
    icon: '🔌',
    width: 300,
    height: 400,
    color: '#eab308',
    ampOptions: [60, 100, 125]
  },
  outlet_duplex: {
    name: 'Duplex Outlet',
    icon: '🔲',
    width: 100,
    height: 100,
    color: '#3b82f6',
    ampOptions: [15, 20]
  },
  outlet_gfci: {
    name: 'GFCI Outlet',
    icon: '🔳',
    width: 100,
    height: 100,
    color: '#06b6d4',
    ampOptions: [15, 20]
  },
  outlet_240v: {
    name: '240V Outlet',
    icon: '⬜',
    width: 120,
    height: 120,
    color: '#ef4444',
    ampOptions: [30, 50]
  },
  switch_single: {
    name: 'Single Switch',
    icon: '🔘',
    width: 80,
    height: 80,
    color: '#10b981',
    options: ['single']
  },
  switch_3way: {
    name: '3-Way Switch',
    icon: '🔀',
    width: 80,
    height: 80,
    color: '#8b5cf6',
    options: ['3-way']
  },
  switch_dimmer: {
    name: 'Dimmer Switch',
    icon: '🔆',
    width: 80,
    height: 80,
    color: '#ec4899',
    options: ['dimmer']
  },
  light_ceiling: {
    name: 'Ceiling Light',
    icon: '💡',
    width: 150,
    height: 150,
    color: '#fbbf24',
    wattOptions: [10, 15, 20, 40, 60]
  },
  light_recessed: {
    name: 'Recessed Light',
    icon: '○',
    width: 100,
    height: 100,
    color: '#fcd34d',
    wattOptions: [10, 15, 20]
  },
  smoke_detector: {
    name: 'Smoke Detector',
    icon: '🚨',
    width: 100,
    height: 100,
    color: '#dc2626',
    options: ['wired', 'battery']
  }
}

// Wire colors by circuit type
const WIRE_COLORS = {
  '15A': '#3b82f6',   // Blue
  '20A': '#10b981',   // Green
  '30A': '#f59e0b',   // Amber
  '50A': '#ef4444',   // Red
  'low_voltage': '#8b5cf6'  // Purple
}

function EquipmentPalette({ onDragStart }) {
  const categories = {
    'Power': ['panel', 'subpanel', 'outlet_duplex', 'outlet_gfci', 'outlet_240v'],
    'Switches': ['switch_single', 'switch_3way', 'switch_dimmer'],
    'Lighting': ['light_ceiling', 'light_recessed'],
    'Safety': ['smoke_detector']
  }

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <span>⚡</span> Electrical
      </h3>
      {Object.entries(categories).map(([category, types]) => (
        <div key={category}>
          <p className="text-xs text-slate-500 mb-1">{category}</p>
          <div className="grid grid-cols-2 gap-1">
            {types.map(type => {
              const config = EQUIPMENT_TYPES[type]
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  className="flex flex-col items-center p-2 bg-slate-700 rounded cursor-grab hover:bg-slate-600 transition-colors"
                  style={{ borderBottom: `2px solid ${config.color}` }}
                >
                  <span className="text-base">{config.icon}</span>
                  <span className="text-[10px] text-slate-300 text-center mt-1">{config.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function WireSegment({ segment, scale, isSelected, onSelect }) {
  const { start, end, circuitType } = segment
  const x1 = start.x * scale
  const y1 = start.y * scale
  const x2 = end.x * scale
  const y2 = end.y * scale

  const color = WIRE_COLORS[circuitType] || WIRE_COLORS['15A']

  return (
    <g onClick={() => onSelect(segment.id)}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={isSelected ? 4 : 2}
        strokeDasharray={circuitType === 'low_voltage' ? '5,5' : 'none'}
      />
      {isSelected && (
        <>
          <circle cx={x1} cy={y1} r={5} fill="#fff" stroke={color} strokeWidth={2} />
          <circle cx={x2} cy={y2} r={5} fill="#fff" stroke={color} strokeWidth={2} />
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

  // Different shapes for different equipment
  const isCircular = item.type.includes('light') || item.type === 'smoke_detector'

  return (
    <g
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {isCircular ? (
        <circle
          cx={x + width / 2}
          cy={y + height / 2}
          r={width / 2}
          fill={config.color}
          fillOpacity={0.4}
          stroke={isSelected ? '#fff' : config.color}
          strokeWidth={isSelected ? 2 : 1}
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={config.color}
          fillOpacity={0.3}
          stroke={isSelected ? '#fff' : config.color}
          strokeWidth={isSelected ? 2 : 1}
          rx={3}
        />
      )}
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.max(8, Math.min(width, height) * 0.5)}
      >
        {config.icon}
      </text>
    </g>
  )
}

function PropertiesPanel({ selectedItem, equipment, wires, onUpdate, onDelete, calculations }) {
  const item = selectedItem?.type === 'equipment'
    ? equipment.find(e => e.id === selectedItem.id)
    : selectedItem?.type === 'wire'
      ? wires.find(w => w.id === selectedItem.id)
      : null

  if (!item) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Properties</h3>
        <p className="text-slate-400 text-xs">Select element to edit</p>

        {calculations && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-white mb-2">Load Summary</h4>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Total Load: <span className="text-amber-400">{calculations.totalLoad?.toFixed(1) || 0} kW</span></p>
              <p>Main Breaker: <span className="text-amber-400">{calculations.mainBreaker?.toFixed(0) || 0} A</span></p>
              <p>Circuits: <span className="text-blue-400">{calculations.circuitCount || 0}</span></p>
              <p>Est. Cost: <span className="text-green-400">${calculations.cost?.toFixed(0) || 0}</span></p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const config = item.type ? EQUIPMENT_TYPES[item.type] : null

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">
        {config ? config.name : 'Wire'}
      </h3>

      {config?.ampOptions && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Amperage</label>
          <select
            value={item.specs?.amps || config.ampOptions[0]}
            onChange={(e) => onUpdate(item.id, { specs: { ...item.specs, amps: parseInt(e.target.value) } })}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            {config.ampOptions.map(amp => (
              <option key={amp} value={amp}>{amp}A</option>
            ))}
          </select>
        </div>
      )}

      {config?.wattOptions && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Wattage</label>
          <select
            value={item.specs?.watts || config.wattOptions[0]}
            onChange={(e) => onUpdate(item.id, { specs: { ...item.specs, watts: parseInt(e.target.value) } })}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            {config.wattOptions.map(w => (
              <option key={w} value={w}>{w}W</option>
            ))}
          </select>
        </div>
      )}

      {!config && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Circuit Type</label>
          <select
            value={item.circuitType || '15A'}
            onChange={(e) => onUpdate(item.id, { circuitType: e.target.value })}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            <option value="15A">15A Circuit</option>
            <option value="20A">20A Circuit</option>
            <option value="30A">30A Circuit</option>
            <option value="50A">50A Circuit</option>
            <option value="low_voltage">Low Voltage</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-400 mb-1">Circuit #</label>
        <input
          type="number"
          value={item.circuit || 1}
          onChange={(e) => onUpdate(item.id, { circuit: parseInt(e.target.value) })}
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          min={1}
          max={40}
        />
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded mt-2"
      >
        Delete
      </button>
    </div>
  )
}

function Toolbar({ tool, setTool, phase, setPhase, onCalculate, onExport, onAutoDesign, isLoading }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
      <div className="flex gap-1 border-r border-slate-600 pr-2">
        <button
          onClick={() => setTool('select')}
          className={`p-2 rounded ${tool === 'select' ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          title="Select (V)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </button>
        <button
          onClick={() => setTool('wire')}
          className={`p-2 rounded ${tool === 'wire' ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          title="Draw Wire (W)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 border-r border-slate-600 pr-2">
        <span className="text-xs text-slate-400">Phase:</span>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
        >
          <option value="single_phase">Single Phase (120/240V)</option>
          <option value="three_phase">Three Phase (208V)</option>
        </select>
      </div>

      <div className="flex gap-1 ml-auto">
        <button
          onClick={onAutoDesign}
          disabled={isLoading}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-wait text-white text-xs rounded flex items-center gap-1"
          title="Auto-design electrical system using AI"
        >
          <span>{isLoading ? '...' : '🤖'}</span> Auto-Design
        </button>
        <button
          onClick={onCalculate}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded flex items-center gap-1"
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

export default function ElectricalRouter({ floorPlan }) {
  const [equipment, setEquipment] = useState([])
  const [wires, setWires] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [tool, setTool] = useState('select')
  const [phase, setPhase] = useState('single_phase')
  const [scale, setScale] = useState(0.05)
  const [calculations, setCalculations] = useState(null)
  const [isDrawingWire, setIsDrawingWire] = useState(false)
  const [wireStart, setWireStart] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const svgRef = useRef(null)

  const plan = floorPlan || {
    name: 'Sample Floor Plan',
    overall_dimensions: { width: 17850, depth: 7496 },
    rooms: []
  }

  const canvasWidth = plan.overall_dimensions.width * scale + 100
  const canvasHeight = plan.overall_dimensions.depth * scale + 100

  const generateId = () => `elec_${Date.now().toString(36)}`

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
        amps: config.ampOptions?.[0] || null,
        watts: config.wattOptions?.[0] || null
      },
      circuit: 1
    }

    setEquipment(prev => [...prev, newEquipment])
    setSelectedItem({ type: 'equipment', id: newEquipment.id })
  }

  const handleDragOver = (e) => e.preventDefault()
  const handleDragStart = (e, type) => e.dataTransfer.setData('equipment_type', type)

  const handleCanvasClick = (e) => {
    if (tool !== 'wire') {
      setSelectedItem(null)
      return
    }

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - 50) / scale
    const y = (e.clientY - rect.top - 50) / scale

    if (!isDrawingWire) {
      setWireStart({ x, y })
      setIsDrawingWire(true)
    } else {
      const newWire = {
        id: generateId(),
        start: wireStart,
        end: { x, y },
        circuitType: '15A',
        circuit: 1
      }
      setWires(prev => [...prev, newWire])
      setWireStart({ x, y })
    }
  }

  const handleEquipmentDrag = (id, newX, newY) => {
    setEquipment(prev => prev.map(e =>
      e.id === id ? { ...e, position: { x: newX, y: newY } } : e
    ))
  }

  const handleUpdateItem = (id, updates) => {
    if (selectedItem?.type === 'equipment') {
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    } else {
      setWires(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    }
  }

  const handleDeleteItem = (id) => {
    if (selectedItem?.type === 'equipment') {
      setEquipment(prev => prev.filter(e => e.id !== id))
    } else {
      setWires(prev => prev.filter(w => w.id !== id))
    }
    setSelectedItem(null)
  }

  const handleCalculate = () => {
    const totalWatts = equipment
      .filter(e => e.specs?.watts)
      .reduce((sum, e) => sum + (e.specs.watts || 0), 0)

    const outlets = equipment.filter(e => e.type.includes('outlet'))
    const lights = equipment.filter(e => e.type.includes('light'))
    const panels = equipment.filter(e => e.type === 'panel')

    const estimatedLoad = totalWatts + (outlets.length * 180) + (lights.length * 15)
    const voltage = phase === 'single_phase' ? 240 : 208
    const mainBreaker = (estimatedLoad / voltage) * 1.25

    setCalculations({
      totalLoad: estimatedLoad / 1000,
      mainBreaker: Math.ceil(mainBreaker / 10) * 10,
      circuitCount: Math.ceil(equipment.length / 8),
      cost: panels.length * 500 + outlets.length * 25 + lights.length * 50 + wires.length * 10
    })
  }

  const handleExport = () => {
    const data = { phase, equipment, wires, calculations, floorPlanId: plan.id }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `electrical_design_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Auto-design using MEPSystemEngine API
  const handleAutoDesign = async () => {
    setIsLoading(true)
    try {
      const roomsData = plan.rooms.map(room => ({
        name: room.name,
        width: room.dimensions.width,
        height: room.dimensions.depth,
        x: room.position.x,
        y: room.position.y,
        occupancy: 2,
        has_window: true
      }))

      const response = await fetch('/api/electrical/auto-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: roomsData,
          buildingType: 'residential',
          phase: phase
        })
      })

      const result = await response.json()

      if (result.success && result.data) {
        if (result.data.equipment && result.data.equipment.length > 0) {
          const newEquipment = result.data.equipment.map((eq, idx) => ({
            id: generateId(),
            type: eq.type || 'outlet_duplex',
            position: { x: eq.x || 100 + idx * 100, y: eq.y || 100 + idx * 80 },
            specs: { circuit: eq.circuit || 'general' },
            label: eq.label
          }))
          setEquipment(prev => [...prev, ...newEquipment])
        }

        if (result.data.wires && result.data.wires.length > 0) {
          const newWires = result.data.wires.map(w => ({
            id: generateId(),
            start: { x: w.startX, y: w.startY },
            end: { x: w.endX, y: w.endY },
            circuitType: w.circuitType || '15A',
            gauge: w.gauge
          }))
          setWires(prev => [...prev, ...newWires])
        }

        if (result.data.design) {
          setCalculations({
            totalLoad: result.data.design.total_load,
            mainBreaker: result.data.design.main_breaker,
            circuits: result.data.design.circuits,
            wireGauge: result.data.design.wire_gauge,
            cost: result.data.design.cost
          })
        }

        console.log('Electrical auto-design complete:', result.data)
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v') setTool('select')
      if (e.key === 'w') setTool('wire')
      if (e.key === 'Escape') {
        setIsDrawingWire(false)
        setWireStart(null)
        setTool('select')
      }
      if (e.key === 'Delete' && selectedItem) handleDeleteItem(selectedItem.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Electrical Router</h1>
        <p className="text-slate-400 text-sm">Design electrical circuits, outlets, and lighting</p>
      </div>

      <Toolbar
        tool={tool}
        setTool={setTool}
        phase={phase}
        setPhase={setPhase}
        onCalculate={handleCalculate}
        onExport={handleExport}
        onAutoDesign={handleAutoDesign}
        isLoading={isLoading}
      />

      <div className="flex-1 grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-2">
          <EquipmentPalette onDragStart={handleDragStart} />
        </div>

        <div className="col-span-7 bg-slate-900 rounded-lg overflow-auto">
          <svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={tool === 'wire' ? 'cursor-crosshair' : 'cursor-default'}
          >
            <rect width={canvasWidth} height={canvasHeight} fill="#0f172a" />
            <g transform="translate(50, 50)">
              <defs>
                <pattern id="elec-grid" width={500 * scale} height={500 * scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${500 * scale} 0 L 0 0 0 ${500 * scale}`} fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect
                width={plan.overall_dimensions.width * scale}
                height={plan.overall_dimensions.depth * scale}
                fill="url(#elec-grid)"
                stroke="#475569"
                strokeWidth={2}
              />

              {wires.map(wire => (
                <WireSegment
                  key={wire.id}
                  segment={wire}
                  scale={scale}
                  isSelected={selectedItem?.id === wire.id}
                  onSelect={(id) => setSelectedItem({ type: 'wire', id })}
                />
              ))}

              {isDrawingWire && wireStart && (
                <circle cx={wireStart.x * scale} cy={wireStart.y * scale} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
              )}

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

        <div className="col-span-3 space-y-4">
          <PropertiesPanel
            selectedItem={selectedItem}
            equipment={equipment}
            wires={wires}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            calculations={calculations}
          />

          <div className="bg-slate-800 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Shortcuts</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <p><kbd className="px-1 bg-slate-700 rounded">V</kbd> Select</p>
              <p><kbd className="px-1 bg-slate-700 rounded">W</kbd> Draw wire</p>
              <p><kbd className="px-1 bg-slate-700 rounded">Esc</kbd> Cancel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
