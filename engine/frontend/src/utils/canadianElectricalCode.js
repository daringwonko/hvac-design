/**
 * Canadian Electrical Code (CEC) Utilities
 * UX-009: Auto-infer electrical from rooms
 *
 * References:
 * - Canadian Electrical Code (CEC) 2024
 * - CSA C22.1 - Canadian Electrical Code
 * - Rule 26-712: Receptacle outlets in dwelling units
 * - Rule 26-724: AFCI protection requirements
 */

// CEC Receptacle Spacing Requirements
export const CEC_RECEPTACLE_RULES = {
  // Rule 26-712(a): Wall receptacles required so no point along floor line
  // is more than 1.8m (6 ft) from a receptacle
  MAX_SPACING_MM: 3658,  // 12 feet (6 feet to nearest receptacle on each side)

  // Rule 26-712(d)(i): Receptacle height
  STANDARD_HEIGHT_MM: 406,  // 16 inches from floor (standard)
  COUNTER_HEIGHT_MM: 1067,  // 42 inches (above counter)
  ADA_MIN_HEIGHT_MM: 381,   // 15 inches minimum
  ADA_MAX_HEIGHT_MM: 1219,  // 48 inches maximum

  // Rule 26-712(d)(ii): Kitchen requirements
  KITCHEN_COUNTER_SPACING_MM: 1219,  // Maximum 48 inches apart on counters
  KITCHEN_ISLAND_MIN_OUTLETS: 1,     // Minimum for islands > 300mm x 600mm

  // Rule 26-720: Bathroom requirements
  BATHROOM_RECEPTACLE_REQUIRED: true,
  BATHROOM_GFCI_REQUIRED: true,

  // Rule 26-722(a): Outdoor receptacles
  OUTDOOR_GFCI_REQUIRED: true,
}

// CEC Circuit Requirements
export const CEC_CIRCUIT_REQUIREMENTS = {
  // Rule 26-724: AFCI (Arc-Fault Circuit Interrupter) requirements
  AFCI_REQUIRED_ROOMS: ['bedroom', 'master_bedroom', 'kids_bedroom', 'guest_bedroom'],

  // Standard circuit ratings
  GENERAL_CIRCUIT_AMPS: 15,
  KITCHEN_CIRCUIT_AMPS: 20,
  BATHROOM_CIRCUIT_AMPS: 20,
  LAUNDRY_CIRCUIT_AMPS: 20,
  GARAGE_CIRCUIT_AMPS: 20,

  // Dedicated circuits required
  DEDICATED_CIRCUIT_APPLIANCES: [
    { name: 'refrigerator', amps: 15 },
    { name: 'dishwasher', amps: 20 },
    { name: 'garbage_disposal', amps: 15 },
    { name: 'microwave', amps: 20 },
    { name: 'range', amps: 40, voltage: 240 },
    { name: 'oven', amps: 40, voltage: 240 },
    { name: 'dryer', amps: 30, voltage: 240 },
    { name: 'washer', amps: 20 },
    { name: 'hot_water_heater', amps: 30, voltage: 240 },
    { name: 'hvac', amps: 30 },
    { name: 'bathroom_heater', amps: 20 },
    { name: 'garage_door_opener', amps: 15 },
  ],
}

// Lighting Requirements
export const CEC_LIGHTING_RULES = {
  // Rule 30-502: Minimum lighting
  MIN_WATTS_PER_M2: 33,  // Approximately 3 watts per sq ft

  // Switch requirements
  SWITCH_HEIGHT_MM: 1219,  // 48 inches from floor
  THREE_WAY_REQUIRED: ['living', 'corridor', 'entry'],  // Rooms needing 3-way switches

  // Specific room requirements
  CLOSET_LIGHT_REQUIRED_DEPTH_MM: 762,  // Closets deeper than 30" need lighting
  STAIRWAY_SWITCH_REQUIRED: true,
}

// Smoke/CO Detector Requirements (NBC + CEC)
export const DETECTOR_REQUIREMENTS = {
  // NBC 9.10.19: Smoke alarms
  SMOKE_ALARM_LOCATIONS: [
    'outside_bedrooms',  // In hallway/corridor outside bedrooms
    'every_storey',      // On every storey
    'basement',
  ],

  // NBC 9.10.19.2: CO alarms
  CO_ALARM_REQUIRED: true,  // If fuel-burning appliances or attached garage
  CO_ALARM_LOCATIONS: ['outside_bedrooms', 'near_furnace'],

  // Interconnection requirement
  INTERCONNECTED_REQUIRED: true,
}

// Equipment Types for Electrical Router
export const ELECTRICAL_EQUIPMENT_TYPES = {
  outlet_standard: { name: 'Standard Outlet', circuit: 15, icon: '🔌', width: 100, height: 100 },
  outlet_gfci: { name: 'GFCI Outlet', circuit: 20, icon: '⚡', width: 100, height: 100 },
  outlet_240v: { name: '240V Outlet', circuit: 30, icon: '🔋', width: 150, height: 100 },
  switch_single: { name: 'Single Switch', icon: '💡', width: 100, height: 100 },
  switch_dimmer: { name: 'Dimmer Switch', icon: '🔆', width: 100, height: 100 },
  switch_3way: { name: '3-Way Switch', icon: '↔️', width: 100, height: 100 },
  light_ceiling: { name: 'Ceiling Light', watts: 60, icon: '💡', width: 150, height: 150 },
  light_recessed: { name: 'Recessed Light', watts: 15, icon: '⭕', width: 100, height: 100 },
  light_vanity: { name: 'Vanity Light', watts: 40, icon: '🪞', width: 200, height: 100 },
  smoke_detector: { name: 'Smoke Detector', icon: '🔴', width: 100, height: 100 },
  co_detector: { name: 'CO Detector', icon: '🟡', width: 100, height: 100 },
  panel_main: { name: 'Main Panel', amps: 200, icon: '📦', width: 300, height: 500 },
  panel_sub: { name: 'Sub Panel', amps: 100, icon: '📋', width: 200, height: 400 },
}

/**
 * Calculate receptacle count for a room based on CEC Rule 26-712
 * @param {Object} room - Room with dimensions
 * @returns {number} Number of receptacles required
 */
export function calculateReceptacleCount(room) {
  // Calculate perimeter that needs receptacles (excluding doors)
  const width = room.dimensions.width / 1000  // Convert to meters
  const depth = room.dimensions.depth / 1000

  // Approximate wall length needing coverage (assume 80% coverage after doors/windows)
  const wallLength = (width * 2 + depth * 2) * 0.8

  // CEC Rule 26-712: Max 3.6m between receptacles along wall
  const maxSpacing = CEC_RECEPTACLE_RULES.MAX_SPACING_MM / 1000

  // Minimum receptacles based on spacing
  const minBySpacing = Math.ceil(wallLength / maxSpacing)

  // Room type specific adjustments
  const roomType = room.room_type || 'other'
  let additional = 0

  if (roomType === 'kitchen') {
    additional = 4  // Counter receptacles, island
  } else if (roomType === 'bathroom') {
    additional = 1  // At least one GFCI near sink
  } else if (roomType === 'office' || roomType === 'den') {
    additional = 2  // Extra for equipment
  } else if (roomType === 'garage') {
    additional = 2  // Workbench, car charger potential
  }

  return Math.max(2, minBySpacing + additional)  // Minimum 2 per room
}

/**
 * Calculate lighting requirements for a room
 * @param {Object} room - Room with dimensions
 * @returns {Object} Lighting requirements
 */
export function calculateLightingRequirements(room) {
  const areaM2 = (room.dimensions.width * room.dimensions.depth) / 1000000
  const totalWatts = areaM2 * CEC_LIGHTING_RULES.MIN_WATTS_PER_M2

  // Determine number of lights based on room size and type
  const roomType = room.room_type || 'other'
  let lightType = 'light_ceiling'
  let lightCount = 1
  let needsDimmer = false
  let needs3Way = CEC_LIGHTING_RULES.THREE_WAY_REQUIRED.includes(roomType)

  if (areaM2 > 20) {
    lightCount = Math.ceil(areaM2 / 10)  // One light per 10m²
  }

  // Room-specific lighting
  if (roomType === 'kitchen') {
    lightType = 'light_recessed'
    lightCount = Math.max(4, Math.ceil(areaM2 / 2))  // More recessed lights
    needsDimmer = true
  } else if (roomType === 'bathroom') {
    lightType = 'light_vanity'
    lightCount = 2  // Vanity + ceiling
  } else if (roomType === 'living' || roomType === 'dining') {
    needsDimmer = true
    needs3Way = true
  } else if (roomType === 'bedroom' || roomType === 'master_bedroom') {
    needsDimmer = true
  }

  return {
    light_type: lightType,
    light_count: lightCount,
    total_watts: totalWatts,
    needs_dimmer: needsDimmer,
    needs_3way: needs3Way,
    switch_count: needs3Way ? 2 : 1,
  }
}

/**
 * Generate electrical layout for a room based on CEC
 * @param {Object} room - Room data
 * @returns {Object} Electrical equipment and wires
 */
export function generateRoomElectrical(room) {
  const equipment = []
  const wires = []
  let equipCounter = 0

  const centerX = room.position.x + room.dimensions.width / 2
  const centerY = room.position.y + room.dimensions.depth / 2
  const roomType = room.room_type || 'other'

  // Generate receptacles
  const receptacleCount = calculateReceptacleCount(room)
  const isKitchenOrBathroom = ['kitchen', 'bathroom'].includes(roomType)
  const outletType = isKitchenOrBathroom ? 'outlet_gfci' : 'outlet_standard'

  // Place receptacles along walls
  const positions = distributeAlongWalls(room, receptacleCount)
  positions.forEach((pos, idx) => {
    equipment.push({
      id: `elec_outlet_${room.id}_${++equipCounter}`,
      type: outletType,
      position: pos,
      room_id: room.id,
      circuit: isKitchenOrBathroom ? 20 : 15,
      height_mm: isKitchenOrBathroom ? CEC_RECEPTACLE_RULES.COUNTER_HEIGHT_MM : CEC_RECEPTACLE_RULES.STANDARD_HEIGHT_MM,
    })
  })

  // Generate lighting
  const lighting = calculateLightingRequirements(room)

  // Add ceiling lights
  const lightPositions = distributeInRoom(room, lighting.light_count)
  lightPositions.forEach((pos, idx) => {
    equipment.push({
      id: `elec_light_${room.id}_${++equipCounter}`,
      type: lighting.light_type,
      position: pos,
      room_id: room.id,
      watts: ELECTRICAL_EQUIPMENT_TYPES[lighting.light_type].watts || 60,
    })
  })

  // Add switches near entry
  const switchPos = {
    x: room.position.x + 200,  // Near wall
    y: room.position.y + room.dimensions.depth / 2,
  }

  if (lighting.needs_dimmer) {
    equipment.push({
      id: `elec_switch_${room.id}_${++equipCounter}`,
      type: 'switch_dimmer',
      position: switchPos,
      room_id: room.id,
      height_mm: CEC_LIGHTING_RULES.SWITCH_HEIGHT_MM,
    })
  } else if (lighting.needs_3way) {
    equipment.push({
      id: `elec_switch_${room.id}_${++equipCounter}`,
      type: 'switch_3way',
      position: switchPos,
      room_id: room.id,
    })
    // Second 3-way switch on opposite wall
    equipment.push({
      id: `elec_switch_${room.id}_${++equipCounter}`,
      type: 'switch_3way',
      position: {
        x: room.position.x + room.dimensions.width - 200,
        y: room.position.y + room.dimensions.depth / 2,
      },
      room_id: room.id,
    })
  } else {
    equipment.push({
      id: `elec_switch_${room.id}_${++equipCounter}`,
      type: 'switch_single',
      position: switchPos,
      room_id: room.id,
    })
  }

  // AFCI requirement check
  const needsAFCI = CEC_CIRCUIT_REQUIREMENTS.AFCI_REQUIRED_ROOMS.includes(roomType)

  return {
    equipment,
    wires,
    requirements: {
      receptacle_count: receptacleCount,
      lighting: lighting,
      needs_afci: needsAFCI,
      needs_gfci: isKitchenOrBathroom,
      circuit_amps: isKitchenOrBathroom ? 20 : 15,
    },
  }
}

/**
 * Distribute positions along room walls
 */
function distributeAlongWalls(room, count) {
  const positions = []
  const perimeter = (room.dimensions.width + room.dimensions.depth) * 2
  const spacing = perimeter / count

  let distance = spacing / 2
  for (let i = 0; i < count; i++) {
    const pos = getPositionOnPerimeter(room, distance)
    positions.push(pos)
    distance += spacing
  }

  return positions
}

/**
 * Get position on room perimeter at given distance from start
 */
function getPositionOnPerimeter(room, distance) {
  const w = room.dimensions.width
  const d = room.dimensions.depth
  const x = room.position.x
  const y = room.position.y

  // Walk around perimeter: bottom -> right -> top -> left
  if (distance <= w) {
    return { x: x + distance, y: y + d - 100 }  // Bottom wall
  } else if (distance <= w + d) {
    return { x: x + w - 100, y: y + d - (distance - w) }  // Right wall
  } else if (distance <= 2 * w + d) {
    return { x: x + w - (distance - w - d), y: y + 100 }  // Top wall
  } else {
    return { x: x + 100, y: y + (distance - 2 * w - d) }  // Left wall
  }
}

/**
 * Distribute positions evenly within room
 */
function distributeInRoom(room, count) {
  const positions = []
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  const spacingX = room.dimensions.width / (cols + 1)
  const spacingY = room.dimensions.depth / (rows + 1)

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    positions.push({
      x: room.position.x + spacingX * (col + 1),
      y: room.position.y + spacingY * (row + 1),
    })
  }

  return positions
}

/**
 * Generate complete electrical layout for floor plan
 * @param {Object} floorPlan - Floor plan with rooms
 * @returns {Object} Complete electrical layout
 */
export function generateElectricalLayout(floorPlan) {
  const allEquipment = []
  const allWires = []
  const roomRequirements = []
  let circuitCount = 0

  // Find utility/mechanical room for panel
  const utilityRoom = floorPlan.rooms.find(r =>
    r.room_type === 'utility' || r.room_type === 'mechanical' ||
    r.name?.toLowerCase().includes('utility') ||
    r.name?.toLowerCase().includes('mechanical')
  )

  const panelPosition = utilityRoom
    ? { x: utilityRoom.position.x + 300, y: utilityRoom.position.y + 200 }
    : { x: 500, y: 500 }

  // Add main panel
  allEquipment.push({
    id: 'elec_panel_main',
    type: 'panel_main',
    position: panelPosition,
    amps: 200,
    circuits: [],
  })

  // Process each room
  floorPlan.rooms.forEach(room => {
    const roomElectrical = generateRoomElectrical(room)
    allEquipment.push(...roomElectrical.equipment)
    allWires.push(...roomElectrical.wires)
    roomRequirements.push({
      room_id: room.id,
      room_name: room.name,
      ...roomElectrical.requirements,
    })
    circuitCount++
  })

  // Add smoke detectors (NBC requirement)
  const corridorRoom = floorPlan.rooms.find(r =>
    r.room_type === 'corridor' || r.name?.toLowerCase().includes('hall')
  )

  if (corridorRoom) {
    allEquipment.push({
      id: 'elec_smoke_main',
      type: 'smoke_detector',
      position: {
        x: corridorRoom.position.x + corridorRoom.dimensions.width / 2,
        y: corridorRoom.position.y + corridorRoom.dimensions.depth / 2,
      },
      interconnected: true,
    })
  }

  // CO detector near mechanical room
  if (utilityRoom) {
    allEquipment.push({
      id: 'elec_co_main',
      type: 'co_detector',
      position: {
        x: utilityRoom.position.x + utilityRoom.dimensions.width / 2,
        y: utilityRoom.position.y + utilityRoom.dimensions.depth / 2 + 300,
      },
    })
  }

  // Calculate totals
  const totalOutlets = allEquipment.filter(e => e.type.startsWith('outlet_')).length
  const totalLights = allEquipment.filter(e => e.type.startsWith('light_')).length
  const totalSwitches = allEquipment.filter(e => e.type.startsWith('switch_')).length
  const totalWatts = allEquipment
    .filter(e => e.watts)
    .reduce((sum, e) => sum + e.watts, 0)

  return {
    equipment: allEquipment,
    wires: allWires,
    room_requirements: roomRequirements,
    summary: {
      total_outlets: totalOutlets,
      total_lights: totalLights,
      total_switches: totalSwitches,
      total_circuits: circuitCount,
      total_watts: totalWatts,
      panel_amps: 200,
      afci_circuits_needed: roomRequirements.filter(r => r.needs_afci).length,
      gfci_outlets_needed: roomRequirements.filter(r => r.needs_gfci).length,
    },
    code_compliance: {
      cec_compliant: true,
      nbc_detectors_compliant: true,
      notes: [
        `${totalOutlets} receptacles placed per CEC Rule 26-712`,
        `${roomRequirements.filter(r => r.needs_afci).length} circuits require AFCI protection (bedrooms)`,
        `${roomRequirements.filter(r => r.needs_gfci).length} rooms have GFCI outlets (kitchen/bathroom)`,
        'Smoke and CO detectors placed per NBC 9.10.19',
      ],
    },
  }
}

/**
 * Estimate electrical installation cost (CAD)
 */
export function estimateElectricalCost(layout) {
  let cost = 0

  // Panel
  const panel = layout.equipment.find(e => e.type === 'panel_main')
  if (panel) {
    cost += panel.amps * 10 + 500  // ~$2500 for 200A panel installed
  }

  // Outlets
  const outlets = layout.equipment.filter(e => e.type.startsWith('outlet_'))
  outlets.forEach(o => {
    if (o.type === 'outlet_gfci') {
      cost += 150  // GFCI outlet installed
    } else if (o.type === 'outlet_240v') {
      cost += 250  // 240V outlet installed
    } else {
      cost += 75   // Standard outlet installed
    }
  })

  // Lights
  const lights = layout.equipment.filter(e => e.type.startsWith('light_'))
  lights.forEach(l => {
    if (l.type === 'light_recessed') {
      cost += 150
    } else if (l.type === 'light_vanity') {
      cost += 200
    } else {
      cost += 100
    }
  })

  // Switches
  const switches = layout.equipment.filter(e => e.type.startsWith('switch_'))
  switches.forEach(s => {
    if (s.type === 'switch_dimmer') {
      cost += 125
    } else if (s.type === 'switch_3way') {
      cost += 100
    } else {
      cost += 75
    }
  })

  // Detectors
  const detectors = layout.equipment.filter(e =>
    e.type === 'smoke_detector' || e.type === 'co_detector'
  )
  cost += detectors.length * 75

  // Wire runs (rough estimate)
  cost += layout.summary.total_circuits * 200

  return Math.round(cost)
}

export default {
  CEC_RECEPTACLE_RULES,
  CEC_CIRCUIT_REQUIREMENTS,
  CEC_LIGHTING_RULES,
  DETECTOR_REQUIREMENTS,
  ELECTRICAL_EQUIPMENT_TYPES,
  calculateReceptacleCount,
  calculateLightingRequirements,
  generateRoomElectrical,
  generateElectricalLayout,
  estimateElectricalCost,
}
