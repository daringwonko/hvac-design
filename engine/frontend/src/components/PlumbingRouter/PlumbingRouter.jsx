import { useState, useRef, useCallback, useEffect } from 'react'

// Plumbing fixture types based on MEPSystemEngine.design_plumbing()
const FIXTURE_TYPES = {
  // Supply fixtures
  sink: { label: 'Sink', category: 'fixture', hotWater: true, coldWater: true, drain: true, ventSize: 1.5 },
  toilet: { label: 'Toilet', category: 'fixture', hotWater: false, coldWater: true, drain: true, ventSize: 3 },
  shower: { label: 'Shower', category: 'fixture', hotWater: true, coldWater: true, drain: true, ventSize: 2 },
  bathtub: { label: 'Bathtub', category: 'fixture', hotWater: true, coldWater: true, drain: true, ventSize: 1.5 },
  dishwasher: { label: 'Dishwasher', category: 'appliance', hotWater: true, coldWater: false, drain: true, ventSize: 1.5 },
  washing_machine: { label: 'Washing Machine', category: 'appliance', hotWater: true, coldWater: true, drain: true, ventSize: 2 },
  water_heater: { label: 'Water Heater', category: 'equipment', hotWater: false, coldWater: true, drain: false, ventSize: 0 },

  // Distribution
  main_shutoff: { label: 'Main Shutoff', category: 'valve', hotWater: false, coldWater: true, drain: false, ventSize: 0 },
  branch_valve: { label: 'Branch Valve', category: 'valve', hotWater: false, coldWater: true, drain: false, ventSize: 0 },
  hose_bib: { label: 'Hose Bib', category: 'fixture', hotWater: false, coldWater: true, drain: false, ventSize: 0 },

  // Drainage
  floor_drain: { label: 'Floor Drain', category: 'drain', hotWater: false, coldWater: false, drain: true, ventSize: 2 },
  cleanout: { label: 'Cleanout', category: 'drain', hotWater: false, coldWater: false, drain: true, ventSize: 0 },
  vent_stack: { label: 'Vent Stack', category: 'vent', hotWater: false, coldWater: false, drain: false, ventSize: 3 },
}

// Pipe types for different systems
const PIPE_TYPES = {
  cold_water: { label: 'Cold Water', color: '#3B82F6', defaultSize: 0.75 },
  hot_water: { label: 'Hot Water', color: '#EF4444', defaultSize: 0.75 },
  drain: { label: 'Drain/Waste', color: '#6B7280', defaultSize: 2 },
  vent: { label: 'Vent', color: '#A855F7', defaultSize: 1.5 },
}

// SketchUp-style fixture palette
function FixturePalette({ selectedFixture, onSelectFixture }) {
  const categories = {
    'Fixtures': ['sink', 'toilet', 'shower', 'bathtub', 'hose_bib'],
    'Appliances': ['dishwasher', 'washing_machine', 'water_heater'],
    'Valves': ['main_shutoff', 'branch_valve'],
    'Drainage': ['floor_drain', 'cleanout', 'vent_stack'],
  }

  return (
    <div className="w-56 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300">Plumbing Fixtures</h3>
      </div>
      {Object.entries(categories).map(([category, fixtures]) => (
        <div key={category} className="border-b border-slate-700">
          <div className="px-3 py-2 text-xs font-medium text-slate-400 bg-slate-750">
            {category}
          </div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {fixtures.map(type => (
              <button
                key={type}
                onClick={() => onSelectFixture(type)}
                className={`p-2 rounded text-xs text-center transition-colors ${
                  selectedFixture === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <FixtureIcon type={type} className="w-6 h-6 mx-auto mb-1" />
                <span className="block truncate">{FIXTURE_TYPES[type].label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Fixture icons
function FixtureIcon({ type, className = "w-5 h-5" }) {
  const iconProps = { className, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }

  switch (type) {
    case 'sink':
      return (
        <svg {...iconProps}>
          <rect x="4" y="8" width="16" height="10" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="13" r="2" strokeWidth={1.5} />
          <line x1="12" y1="4" x2="12" y2="8" strokeWidth={1.5} />
        </svg>
      )
    case 'toilet':
      return (
        <svg {...iconProps}>
          <ellipse cx="12" cy="14" rx="5" ry="6" strokeWidth={1.5} />
          <rect x="9" y="4" width="6" height="6" rx="1" strokeWidth={1.5} />
        </svg>
      )
    case 'shower':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="8" r="2" strokeWidth={1.5} />
          <line x1="10" y1="12" x2="10" y2="18" strokeWidth={1} strokeDasharray="2 2" />
          <line x1="12" y1="12" x2="12" y2="18" strokeWidth={1} strokeDasharray="2 2" />
          <line x1="14" y1="12" x2="14" y2="18" strokeWidth={1} strokeDasharray="2 2" />
        </svg>
      )
    case 'bathtub':
      return (
        <svg {...iconProps}>
          <path d="M4 12h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z" strokeWidth={1.5} />
          <path d="M6 12V6a2 2 0 012-2h2" strokeWidth={1.5} />
          <circle cx="8" cy="15" r="1" fill="currentColor" />
        </svg>
      )
    case 'dishwasher':
    case 'washing_machine':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="13" r="4" strokeWidth={1.5} />
          <line x1="6" y1="8" x2="18" y2="8" strokeWidth={1.5} />
        </svg>
      )
    case 'water_heater':
      return (
        <svg {...iconProps}>
          <rect x="6" y="2" width="12" height="20" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="8" r="2" strokeWidth={1.5} />
          <line x1="8" y1="14" x2="16" y2="14" strokeWidth={1.5} />
          <line x1="8" y1="18" x2="16" y2="18" strokeWidth={1.5} />
        </svg>
      )
    case 'main_shutoff':
    case 'branch_valve':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
          <line x1="12" y1="6" x2="12" y2="2" strokeWidth={2} />
          <line x1="6" y1="12" x2="2" y2="12" strokeWidth={2} />
          <line x1="18" y1="12" x2="22" y2="12" strokeWidth={2} />
        </svg>
      )
    case 'hose_bib':
      return (
        <svg {...iconProps}>
          <circle cx="10" cy="12" r="4" strokeWidth={1.5} />
          <line x1="14" y1="12" x2="20" y2="12" strokeWidth={2} />
          <line x1="10" y1="8" x2="10" y2="4" strokeWidth={1.5} />
        </svg>
      )
    case 'floor_drain':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
          <line x1="9" y1="9" x2="15" y2="15" strokeWidth={1} />
          <line x1="15" y1="9" x2="9" y2="15" strokeWidth={1} />
        </svg>
      )
    case 'cleanout':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
          <rect x="9" y="9" width="6" height="6" strokeWidth={1.5} />
        </svg>
      )
    case 'vent_stack':
      return (
        <svg {...iconProps}>
          <line x1="12" y1="20" x2="12" y2="4" strokeWidth={2} />
          <path d="M8 8l4-4 4 4" strokeWidth={1.5} />
          <circle cx="12" cy="16" r="2" strokeWidth={1.5} />
        </svg>
      )
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
        </svg>
      )
  }
}

// Pipe segment component
function PipeSegment({ pipe, isSelected, onSelect }) {
  const { startX, startY, endX, endY, pipeType, size } = pipe
  const pipeInfo = PIPE_TYPES[pipeType]
  const strokeWidth = Math.max(2, size * 3)

  return (
    <g onClick={(e) => { e.stopPropagation(); onSelect(pipe.id) }}>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={pipeInfo.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="cursor-pointer"
        opacity={0.8}
      />
      {isSelected && (
        <>
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="#FBBF24"
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            opacity={0.3}
          />
          <circle cx={startX} cy={startY} r={6} fill="#FBBF24" />
          <circle cx={endX} cy={endY} r={6} fill="#FBBF24" />
        </>
      )}
      {/* Flow direction arrow */}
      {pipeType !== 'vent' && (
        <polygon
          points={calculateArrowPoints(startX, startY, endX, endY)}
          fill={pipeInfo.color}
        />
      )}
    </g>
  )
}

function calculateArrowPoints(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const arrowSize = 8

  const p1x = midX - arrowSize * Math.cos(angle - Math.PI / 6)
  const p1y = midY - arrowSize * Math.sin(angle - Math.PI / 6)
  const p2x = midX + arrowSize * Math.cos(angle)
  const p2y = midY + arrowSize * Math.sin(angle)
  const p3x = midX - arrowSize * Math.cos(angle + Math.PI / 6)
  const p3y = midY - arrowSize * Math.sin(angle + Math.PI / 6)

  return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`
}

// Fixture component
function Fixture({ fixture, isSelected, onSelect, onDrag }) {
  const fixtureInfo = FIXTURE_TYPES[fixture.type]
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    e.stopPropagation()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    onSelect(fixture.id)
  }

  // Handle drag with window event listeners (matches HVAC pattern)
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      onDrag(fixture.id, fixture.x + dx, fixture.y + dy)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, fixture, onDrag])

  return (
    <g
      transform={`translate(${fixture.x}, ${fixture.y})`}
      onMouseDown={handleMouseDown}
      className="cursor-move"
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={-24}
          y={-24}
          width={48}
          height={48}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={2}
          strokeDasharray="4 2"
          rx={4}
        />
      )}

      {/* Fixture background */}
      <rect
        x={-20}
        y={-20}
        width={40}
        height={40}
        fill={isSelected ? '#374151' : '#1F2937'}
        stroke={isSelected ? '#FBBF24' : '#4B5563'}
        strokeWidth={2}
        rx={4}
      />

      {/* Fixture icon */}
      <g transform="translate(-12, -12) scale(1)">
        <FixtureIcon type={fixture.type} className="w-6 h-6" />
      </g>

      {/* Connection points */}
      {fixtureInfo.coldWater && (
        <circle cx={-20} cy={0} r={4} fill="#3B82F6" stroke="#1E3A8A" strokeWidth={1} />
      )}
      {fixtureInfo.hotWater && (
        <circle cx={20} cy={0} r={4} fill="#EF4444" stroke="#7F1D1D" strokeWidth={1} />
      )}
      {fixtureInfo.drain && (
        <circle cx={0} cy={20} r={4} fill="#6B7280" stroke="#374151" strokeWidth={1} />
      )}

      {/* Label */}
      <text
        y={32}
        textAnchor="middle"
        className="text-xs fill-slate-400"
        style={{ fontSize: '10px' }}
      >
        {fixtureInfo.label}
      </text>
    </g>
  )
}

// Properties panel
function PropertiesPanel({ selectedItem, fixtures, pipes, onUpdateFixture, onUpdatePipe, onDelete }) {
  if (!selectedItem) {
    return (
      <div className="w-64 bg-slate-800 border-l border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Properties</h3>
        <p className="text-xs text-slate-500">Select a fixture or pipe to edit properties</p>

        <div className="mt-6 border-t border-slate-700 pt-4">
          <h4 className="text-xs font-semibold text-slate-400 mb-2">Pipe Legend</h4>
          {Object.entries(PIPE_TYPES).map(([type, info]) => (
            <div key={type} className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-1 rounded"
                style={{ backgroundColor: info.color }}
              />
              <span className="text-xs text-slate-400">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const fixture = fixtures.find(f => f.id === selectedItem)
  const pipe = pipes.find(p => p.id === selectedItem)

  if (fixture) {
    const fixtureInfo = FIXTURE_TYPES[fixture.type]
    return (
      <div className="w-64 bg-slate-800 border-l border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Fixture Properties</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <div className="text-sm text-white">{fixtureInfo.label}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">X Position</label>
              <input
                type="number"
                value={Math.round(fixture.x)}
                onChange={(e) => onUpdateFixture(fixture.id, { x: parseInt(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Y Position</label>
              <input
                type="number"
                value={Math.round(fixture.y)}
                onChange={(e) => onUpdateFixture(fixture.id, { y: parseInt(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Label</label>
            <input
              type="text"
              value={fixture.label || ''}
              onChange={(e) => onUpdateFixture(fixture.id, { label: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
              placeholder="Optional label"
            />
          </div>

          <div className="border-t border-slate-700 pt-3">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Connections</h4>
            <div className="space-y-1 text-xs">
              {fixtureInfo.coldWater && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Cold Water</span>
                </div>
              )}
              {fixtureInfo.hotWater && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-300">Hot Water</span>
                </div>
              )}
              {fixtureInfo.drain && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-slate-300">Drain ({fixtureInfo.ventSize}" vent)</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onDelete(fixture.id)}
            className="w-full mt-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Delete Fixture
          </button>
        </div>
      </div>
    )
  }

  if (pipe) {
    const pipeInfo = PIPE_TYPES[pipe.pipeType]
    const length = Math.sqrt(
      Math.pow(pipe.endX - pipe.startX, 2) +
      Math.pow(pipe.endY - pipe.startY, 2)
    )

    return (
      <div className="w-64 bg-slate-800 border-l border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Pipe Properties</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={pipe.pipeType}
              onChange={(e) => onUpdatePipe(pipe.id, { pipeType: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
            >
              {Object.entries(PIPE_TYPES).map(([type, info]) => (
                <option key={type} value={type}>{info.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Size (inches)</label>
            <select
              value={pipe.size}
              onChange={(e) => onUpdatePipe(pipe.id, { size: parseFloat(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
            >
              <option value={0.5}>1/2"</option>
              <option value={0.75}>3/4"</option>
              <option value={1}>1"</option>
              <option value={1.25}>1-1/4"</option>
              <option value={1.5}>1-1/2"</option>
              <option value={2}>2"</option>
              <option value={3}>3"</option>
              <option value={4}>4"</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Length</label>
            <div className="text-sm text-white">{(length / 10).toFixed(1)} mm</div>
          </div>

          <div
            className="flex items-center gap-2 p-2 rounded"
            style={{ backgroundColor: pipeInfo.color + '20' }}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: pipeInfo.color }}
            />
            <span className="text-sm text-slate-300">{pipeInfo.label}</span>
          </div>

          <button
            onClick={() => onDelete(pipe.id)}
            className="w-full mt-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Delete Pipe
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Main toolbar
function Toolbar({ activeTool, onToolChange, activePipeType, onPipeTypeChange, onAutoRoute, onValidate, onExport }) {
  return (
    <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
      <div className="flex items-center gap-1 border-r border-slate-700 pr-4 mr-2">
        <button
          onClick={() => onToolChange('select')}
          className={`p-2 rounded ${activeTool === 'select' ? 'bg-primary-600' : 'hover:bg-slate-700'}`}
          title="Select (V)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </button>
        <button
          onClick={() => onToolChange('pipe')}
          className={`p-2 rounded ${activeTool === 'pipe' ? 'bg-primary-600' : 'hover:bg-slate-700'}`}
          title="Draw Pipe (P)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M12 4v16" />
          </svg>
        </button>
        <button
          onClick={() => onToolChange('measure')}
          className={`p-2 rounded ${activeTool === 'measure' ? 'bg-primary-600' : 'hover:bg-slate-700'}`}
          title="Measure (M)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Pipe type selector */}
      {activeTool === 'pipe' && (
        <div className="flex items-center gap-1 border-r border-slate-700 pr-4 mr-2">
          {Object.entries(PIPE_TYPES).map(([type, info]) => (
            <button
              key={type}
              onClick={() => onPipeTypeChange(type)}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${
                activePipeType === type ? 'ring-2 ring-white' : ''
              }`}
              style={{ backgroundColor: info.color }}
              title={info.label}
            >
              {info.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onAutoRoute}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
          title="Auto-route pipes using MEPSystemEngine"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Auto-Route
        </button>
        <button
          onClick={onValidate}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-sm flex items-center gap-1"
          title="Validate plumbing design"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Validate
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 rounded text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  )
}

// Main PlumbingRouter component
export default function PlumbingRouter() {
  const svgRef = useRef(null)
  const [fixtures, setFixtures] = useState([])
  const [pipes, setPipes] = useState([])
  const [selectedFixture, setSelectedFixture] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [activeTool, setActiveTool] = useState('select')
  const [activePipeType, setActivePipeType] = useState('cold_water')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drawingPipe, setDrawingPipe] = useState(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [floorPlanRooms, setFloorPlanRooms] = useState([])

  // Load floor plan data
  useEffect(() => {
    fetch('/api/floor-plan')
      .then(res => res.json())
      .then(data => {
        if (data.rooms) {
          setFloorPlanRooms(data.rooms)
        }
      })
      .catch(err => console.log('No floor plan loaded:', err))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select')
          break
        case 'p':
          setActiveTool('pipe')
          break
        case 'm':
          setActiveTool('measure')
          break
        case 'escape':
          setSelectedItem(null)
          setSelectedFixture(null)
          setDrawingPipe(null)
          break
        case 'delete':
        case 'backspace':
          if (selectedItem) {
            handleDelete(selectedItem)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  const handleCanvasMouseMove = useCallback((e) => {
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Snap to grid
    const snappedX = Math.round(x / 10) * 10
    const snappedY = Math.round(y / 10) * 10

    setCursorPosition({ x: snappedX, y: snappedY })
  }, [zoom, pan])

  const handleCanvasClick = useCallback((e) => {
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Snap to grid
    const snappedX = Math.round(x / 10) * 10
    const snappedY = Math.round(y / 10) * 10

    if (selectedFixture) {
      // Place fixture
      const newFixture = {
        id: `fixture-${Date.now()}`,
        type: selectedFixture,
        x: snappedX,
        y: snappedY,
        rotation: 0,
      }
      setFixtures(prev => [...prev, newFixture])
      setSelectedItem(newFixture.id)
    } else if (activeTool === 'pipe') {
      if (!drawingPipe) {
        // Start drawing pipe
        setDrawingPipe({
          startX: snappedX,
          startY: snappedY,
        })
      } else {
        // Finish pipe
        const newPipe = {
          id: `pipe-${Date.now()}`,
          ...drawingPipe,
          endX: snappedX,
          endY: snappedY,
          pipeType: activePipeType,
          size: PIPE_TYPES[activePipeType].defaultSize,
        }
        setPipes(prev => [...prev, newPipe])
        setDrawingPipe(null)
        setSelectedItem(newPipe.id)
      }
    } else {
      setSelectedItem(null)
    }
  }, [selectedFixture, activeTool, activePipeType, drawingPipe, zoom, pan])

  const handleUpdateFixture = (id, updates) => {
    setFixtures(prev => prev.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ))
  }

  const handleUpdatePipe = (id, updates) => {
    setPipes(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ))
  }

  const handleDelete = (id) => {
    setFixtures(prev => prev.filter(f => f.id !== id))
    setPipes(prev => prev.filter(p => p.id !== id))
    setSelectedItem(null)
  }

  const handleAutoRoute = async () => {
    try {
      const response = await fetch('/api/plumbing/auto-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures, rooms: floorPlanRooms }),
      })
      const data = await response.json()
      if (data.pipes) {
        setPipes(prev => [...prev, ...data.pipes])
      }
      if (data.message) {
        alert(data.message)
      }
    } catch (err) {
      console.error('Auto-route failed:', err)
      // Demo: generate sample pipes for fixtures
      const newPipes = []
      fixtures.forEach((fixture, idx) => {
        const fixtureInfo = FIXTURE_TYPES[fixture.type]
        if (fixtureInfo.coldWater) {
          newPipes.push({
            id: `auto-cold-${idx}-${Date.now()}`,
            startX: fixture.x - 20,
            startY: fixture.y,
            endX: fixture.x - 100,
            endY: fixture.y,
            pipeType: 'cold_water',
            size: 0.75,
          })
        }
        if (fixtureInfo.hotWater) {
          newPipes.push({
            id: `auto-hot-${idx}-${Date.now()}`,
            startX: fixture.x + 20,
            startY: fixture.y,
            endX: fixture.x + 100,
            endY: fixture.y,
            pipeType: 'hot_water',
            size: 0.75,
          })
        }
        if (fixtureInfo.drain) {
          newPipes.push({
            id: `auto-drain-${idx}-${Date.now()}`,
            startX: fixture.x,
            startY: fixture.y + 20,
            endX: fixture.x,
            endY: fixture.y + 100,
            pipeType: 'drain',
            size: fixtureInfo.ventSize || 2,
          })
        }
      })
      setPipes(prev => [...prev, ...newPipes])
    }
  }

  const handleValidate = async () => {
    try {
      const response = await fetch('/api/plumbing/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures, pipes }),
      })
      const data = await response.json()
      alert(data.valid ? 'Plumbing design is valid!' : `Validation issues:\n${data.issues.join('\n')}`)
    } catch (err) {
      // Demo validation
      const issues = []
      fixtures.forEach(fixture => {
        const fixtureInfo = FIXTURE_TYPES[fixture.type]
        if (fixtureInfo.drain && fixtureInfo.ventSize > 0) {
          const hasVent = pipes.some(p =>
            p.pipeType === 'vent' &&
            Math.abs(p.startX - fixture.x) < 50 &&
            Math.abs(p.startY - fixture.y) < 50
          )
          if (!hasVent) {
            issues.push(`${fixtureInfo.label} at (${fixture.x}, ${fixture.y}) needs a vent connection`)
          }
        }
      })
      alert(issues.length === 0
        ? 'Plumbing design passes basic validation!'
        : `Validation issues:\n${issues.join('\n')}`)
    }
  }

  const handleExport = () => {
    const designData = {
      fixtures,
      pipes,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
    }
    const blob = new Blob([JSON.stringify(designData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plumbing-design.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool)
          setSelectedFixture(null)
        }}
        activePipeType={activePipeType}
        onPipeTypeChange={setActivePipeType}
        onAutoRoute={handleAutoRoute}
        onValidate={handleValidate}
        onExport={handleExport}
      />

      <div className="flex-1 flex overflow-hidden">
        <FixturePalette
          selectedFixture={selectedFixture}
          onSelectFixture={(type) => {
            setSelectedFixture(type)
            setActiveTool('select')
          }}
        />

        {/* Canvas */}
        <div className="flex-1 bg-slate-900 overflow-hidden relative">
          <svg
            ref={svgRef}
            className="w-full h-full"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            style={{ cursor: activeTool === 'pipe' ? 'crosshair' : 'default' }}
          >
            <defs>
              <pattern id="plumbing-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
              </pattern>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Grid */}
              <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#plumbing-grid)" />

              {/* Floor plan rooms (background) */}
              {floorPlanRooms.map((room, idx) => (
                <g key={idx}>
                  <rect
                    x={room.x / 10}
                    y={room.y / 10}
                    width={room.width / 10}
                    height={room.height / 10}
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                  <text
                    x={room.x / 10 + room.width / 20}
                    y={room.y / 10 + room.height / 20}
                    className="fill-slate-500"
                    style={{ fontSize: '10px' }}
                    textAnchor="middle"
                  >
                    {room.name}
                  </text>
                </g>
              ))}

              {/* Pipes */}
              {pipes.map(pipe => (
                <PipeSegment
                  key={pipe.id}
                  pipe={pipe}
                  isSelected={selectedItem === pipe.id}
                  onSelect={setSelectedItem}
                />
              ))}

              {/* Drawing pipe preview */}
              {drawingPipe && (
                <line
                  x1={drawingPipe.startX}
                  y1={drawingPipe.startY}
                  x2={cursorPosition.x}
                  y2={cursorPosition.y}
                  stroke={PIPE_TYPES[activePipeType].color}
                  strokeWidth={3}
                  strokeDasharray="5,5"
                  opacity={0.7}
                />
              )}

              {/* Fixtures */}
              {fixtures.map(fixture => (
                <Fixture
                  key={fixture.id}
                  fixture={fixture}
                  isSelected={selectedItem === fixture.id}
                  onSelect={setSelectedItem}
                  onDrag={(id, x, y) => handleUpdateFixture(id, { x, y })}
                />
              ))}
            </g>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-2 hover:bg-slate-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(4, z + 0.25))}
              className="p-2 hover:bg-slate-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Tool hint */}
          <div className="absolute top-4 left-4 bg-slate-800/80 px-3 py-1.5 rounded text-xs text-slate-400">
            {activeTool === 'select' && selectedFixture && `Click to place ${FIXTURE_TYPES[selectedFixture].label}`}
            {activeTool === 'select' && !selectedFixture && 'Click fixture to select, or choose from palette'}
            {activeTool === 'pipe' && !drawingPipe && 'Click to start drawing pipe'}
            {activeTool === 'pipe' && drawingPipe && 'Click to finish pipe segment'}
            {activeTool === 'measure' && 'Click two points to measure distance'}
          </div>
        </div>

        <PropertiesPanel
          selectedItem={selectedItem}
          fixtures={fixtures}
          pipes={pipes}
          onUpdateFixture={handleUpdateFixture}
          onUpdatePipe={handleUpdatePipe}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
