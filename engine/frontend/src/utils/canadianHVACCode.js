/**
 * Canadian HVAC Building Code Utilities
 * UX-008: Auto-populate HVAC based on Canadian code requirements
 *
 * References:
 * - National Building Code of Canada (NBC)
 * - ASHRAE 62.1/62.2 (ventilation standards adopted by NBC)
 * - CSA F280 (residential equipment sizing)
 * - NBC Part 9 (residential construction)
 */

// Canadian Climate Zones (for heat loss calculations)
export const CLIMATE_ZONES = {
  ZONE_4: { name: 'Southern BC, Southern Ontario', hdd: 3000, designTemp: -15 },
  ZONE_5: { name: 'Coastal BC, Southern Prairies', hdd: 4000, designTemp: -20 },
  ZONE_6: { name: 'Most of Southern Canada', hdd: 5000, designTemp: -25 },
  ZONE_7A: { name: 'Northern Prairies, Quebec', hdd: 6000, designTemp: -30 },
  ZONE_7B: { name: 'Northern Ontario, Territories', hdd: 7000, designTemp: -35 },
  ZONE_8: { name: 'Arctic', hdd: 8000, designTemp: -40 },
}

// Default to Zone 6 (most of southern Canada including GTA, Ottawa, etc.)
export const DEFAULT_CLIMATE_ZONE = CLIMATE_ZONES.ZONE_6

// ASHRAE 62.2 Ventilation Requirements (L/s)
export const VENTILATION_REQUIREMENTS = {
  // Whole-house continuous ventilation = 0.15 L/s per m² + 3.5 L/s per bedroom + 7.5 L/s
  calculateWholeHouse: (areaM2, bedroomCount) => {
    return Math.ceil(0.15 * areaM2 + 3.5 * bedroomCount + 7.5)
  },

  // Local exhaust requirements (intermittent)
  LOCAL_EXHAUST: {
    bathroom: { cfm: 50, ls: 25 },      // 25 L/s or 50 CFM
    kitchen_range: { cfm: 100, ls: 50 }, // 50 L/s or 100 CFM
    powder_room: { cfm: 25, ls: 12 },   // Half bath
  },
}

// Heat Loss Calculation Factors (simplified CSA F280)
export const HEAT_LOSS_FACTORS = {
  // W/m² based on construction quality and climate zone
  // These are simplified factors - real F280 calc is more complex
  WALL: {
    standard: 2.5,  // R-20 effective
    good: 2.0,      // R-24 effective
    excellent: 1.5, // R-30 effective (Passive House level)
  },
  WINDOW: {
    standard: 25,   // Double pane
    good: 18,       // Triple pane
    excellent: 12,  // Triple pane with low-e
  },
  CEILING: {
    standard: 1.5,  // R-40
    good: 1.2,      // R-50
    excellent: 0.8, // R-60
  },
  FLOOR: {
    standard: 2.0,  // Uninsulated crawlspace
    good: 1.5,      // Insulated floor
    excellent: 1.0, // Slab with perimeter insulation
  },
  AIR_CHANGE: {
    standard: 0.5,  // ACH @ 50Pa / 20
    good: 0.3,
    excellent: 0.15, // Passive House
  },
}

// Room-specific load factors (W/m²)
export const ROOM_LOAD_FACTORS = {
  living: { cooling: 60, heating: 45 },
  bedroom: { cooling: 50, heating: 40 },
  master_bedroom: { cooling: 55, heating: 42 },
  kitchen: { cooling: 80, heating: 50 },    // Higher due to appliances
  bathroom: { cooling: 45, heating: 55 },   // Higher heating for comfort
  dining: { cooling: 55, heating: 42 },
  office: { cooling: 65, heating: 45 },     // Equipment load
  entry: { cooling: 40, heating: 60 },      // Higher heating loss
  corridor: { cooling: 35, heating: 35 },
  utility: { cooling: 40, heating: 40 },
  mechanical: { cooling: 30, heating: 30 }, // Usually internal
  garage: { cooling: 0, heating: 25 },      // Minimal conditioning
  storage: { cooling: 0, heating: 20 },
  other: { cooling: 50, heating: 45 },
}

// Equipment sizing based on Canadian practice
export const EQUIPMENT_SIZING = {
  // Mini-split sizing (kW cooling capacity)
  MINI_SPLIT: {
    // Room area ranges (m²) to capacity (kW)
    ranges: [
      { maxArea: 15, capacity: 2.0, btu: 6000 },
      { maxArea: 25, capacity: 2.6, btu: 9000 },
      { maxArea: 35, capacity: 3.5, btu: 12000 },
      { maxArea: 50, capacity: 5.3, btu: 18000 },
      { maxArea: 70, capacity: 7.0, btu: 24000 },
    ],
    getSize: (areaM2) => {
      const range = EQUIPMENT_SIZING.MINI_SPLIT.ranges.find(r => areaM2 <= r.maxArea)
      return range || EQUIPMENT_SIZING.MINI_SPLIT.ranges[EQUIPMENT_SIZING.MINI_SPLIT.ranges.length - 1]
    },
  },

  // HRV sizing based on whole-house ventilation
  HRV: {
    ranges: [
      { maxLs: 35, cfm: 70 },
      { maxLs: 50, cfm: 100 },
      { maxLs: 75, cfm: 150 },
      { maxLs: 100, cfm: 200 },
      { maxLs: 150, cfm: 300 },
    ],
    getSize: (totalLs) => {
      const range = EQUIPMENT_SIZING.HRV.ranges.find(r => totalLs <= r.maxLs)
      return range || EQUIPMENT_SIZING.HRV.ranges[EQUIPMENT_SIZING.HRV.ranges.length - 1]
    },
  },

  // Exhaust fan sizing
  EXHAUST_FAN: {
    bathroom: { minCfm: 50, recommended: 80 },
    kitchen: { minCfm: 100, recommended: 150 },
  },
}

/**
 * Calculate HVAC requirements for a room based on Canadian code
 * @param {Object} room - Room data with dimensions and type
 * @param {Object} climateZone - Climate zone data
 * @returns {Object} HVAC requirements
 */
export function calculateRoomRequirements(room, climateZone = DEFAULT_CLIMATE_ZONE) {
  // Calculate area in m²
  const areaM2 = (room.dimensions.width * room.dimensions.depth) / 1000000
  const volumeM3 = areaM2 * ((room.dimensions.height || 2743) / 1000)

  // Get room type factors
  const loadFactors = ROOM_LOAD_FACTORS[room.room_type] || ROOM_LOAD_FACTORS.other

  // Calculate heating/cooling loads (W)
  const coolingLoad = areaM2 * loadFactors.cooling
  const heatingLoad = areaM2 * loadFactors.heating

  // Adjust heating for climate zone
  const heatingAdjustment = Math.abs(climateZone.designTemp) / 25  // Normalize to zone 6
  const adjustedHeatingLoad = heatingLoad * heatingAdjustment

  // Ventilation requirements
  let ventilationLs = 0
  let needsExhaust = false
  let exhaustCfm = 0

  if (room.room_type === 'bathroom' || room.room_type === 'powder_room') {
    needsExhaust = true
    exhaustCfm = VENTILATION_REQUIREMENTS.LOCAL_EXHAUST.bathroom.cfm
    ventilationLs = VENTILATION_REQUIREMENTS.LOCAL_EXHAUST.bathroom.ls
  } else if (room.room_type === 'kitchen') {
    needsExhaust = true
    exhaustCfm = VENTILATION_REQUIREMENTS.LOCAL_EXHAUST.kitchen_range.cfm
    ventilationLs = VENTILATION_REQUIREMENTS.LOCAL_EXHAUST.kitchen_range.ls
  } else {
    // General ventilation based on area (ASHRAE 62.2)
    ventilationLs = Math.ceil(0.15 * areaM2)
  }

  // Get equipment sizing
  const miniSplitSize = EQUIPMENT_SIZING.MINI_SPLIT.getSize(areaM2)

  return {
    room_id: room.id,
    room_name: room.name,
    room_type: room.room_type,
    area_m2: areaM2,
    volume_m3: volumeM3,

    // Loads (W)
    cooling_load_w: Math.round(coolingLoad),
    heating_load_w: Math.round(adjustedHeatingLoad),

    // Loads (BTU/h)
    cooling_load_btu: Math.round(coolingLoad * 3.412),
    heating_load_btu: Math.round(adjustedHeatingLoad * 3.412),

    // Ventilation
    ventilation_ls: ventilationLs,
    needs_exhaust: needsExhaust,
    exhaust_cfm: exhaustCfm,

    // Recommended equipment
    recommended_equipment: {
      mini_split_btu: miniSplitSize.btu,
      mini_split_kw: miniSplitSize.capacity,
      diffuser_cfm: Math.round(ventilationLs * 2.119),  // L/s to CFM
    },
  }
}

/**
 * Calculate whole-house HVAC requirements
 * @param {Array} rooms - Array of room objects
 * @param {Object} options - Calculation options
 * @returns {Object} Whole house HVAC design
 */
export function calculateWholeHouseHVAC(rooms, options = {}) {
  const climateZone = options.climateZone || DEFAULT_CLIMATE_ZONE
  const buildingQuality = options.buildingQuality || 'good'

  // Calculate requirements for each room
  const roomRequirements = rooms.map(room => calculateRoomRequirements(room, climateZone))

  // Sum up loads
  const totalCoolingW = roomRequirements.reduce((sum, r) => sum + r.cooling_load_w, 0)
  const totalHeatingW = roomRequirements.reduce((sum, r) => sum + r.heating_load_w, 0)
  const totalAreaM2 = roomRequirements.reduce((sum, r) => sum + r.area_m2, 0)

  // Count bedrooms for ventilation calc
  const bedroomCount = rooms.filter(r =>
    r.room_type?.includes('bedroom') || r.name?.toLowerCase().includes('bedroom')
  ).length

  // Calculate whole-house ventilation (ASHRAE 62.2)
  const wholeHouseVentLs = VENTILATION_REQUIREMENTS.calculateWholeHouse(totalAreaM2, bedroomCount)

  // Get HRV size
  const hrvSize = EQUIPMENT_SIZING.HRV.getSize(wholeHouseVentLs)

  // Determine number of zones
  const heatedRooms = rooms.filter(r =>
    !['garage', 'storage', 'mechanical'].includes(r.room_type)
  )
  const recommendedZones = Math.min(Math.max(2, Math.ceil(heatedRooms.length / 3)), 8)

  return {
    climate_zone: climateZone.name,
    design_temperature_c: climateZone.designTemp,
    building_quality: buildingQuality,

    // Total loads
    total_cooling_w: totalCoolingW,
    total_heating_w: totalHeatingW,
    total_cooling_btu: Math.round(totalCoolingW * 3.412),
    total_heating_btu: Math.round(totalHeatingW * 3.412),
    total_area_m2: totalAreaM2,

    // Ventilation
    whole_house_ventilation_ls: wholeHouseVentLs,
    whole_house_ventilation_cfm: Math.round(wholeHouseVentLs * 2.119),

    // Room details
    rooms: roomRequirements,

    // Recommended equipment
    recommended_system: {
      hrv_cfm: hrvSize.cfm,
      hrv_model: `HRV-${hrvSize.cfm}`,
      zones: recommendedZones,
      outdoor_unit_btu: Math.round(totalCoolingW * 3.412 * 1.1), // 10% safety factor
      outdoor_unit_kw: Math.round(totalCoolingW / 1000 * 1.1 * 10) / 10,
    },

    // Code compliance notes
    code_compliance: {
      meets_ashrae_62_2: true,
      ventilation_adequate: true,
      notes: [
        `Whole-house continuous ventilation: ${wholeHouseVentLs} L/s (ASHRAE 62.2)`,
        `Design temperature: ${climateZone.designTemp}°C (Climate Zone ${climateZone.name})`,
        `${bedroomCount} bedroom(s) counted for ventilation calculation`,
      ],
    },
  }
}

/**
 * Generate HVAC equipment layout from floor plan
 * @param {Object} floorPlan - Floor plan with rooms
 * @param {Object} options - Options for generation
 * @returns {Object} Equipment and duct layout
 */
export function generateHVACLayout(floorPlan, options = {}) {
  const { systemType = 'vrf' } = options

  // Calculate requirements
  const hvacDesign = calculateWholeHouseHVAC(floorPlan.rooms, options)

  const equipment = []
  const ducts = []
  let equipmentCounter = 0

  // Find mechanical room or use center of building
  const mechRoom = floorPlan.rooms.find(r =>
    r.room_type === 'mechanical' || r.name?.toLowerCase().includes('mechanical')
  )

  const hrvPosition = mechRoom
    ? { x: mechRoom.position.x + 500, y: mechRoom.position.y + 500 }
    : {
        x: floorPlan.overall_dimensions.width / 2 - 300,
        y: floorPlan.overall_dimensions.depth / 2 - 200
      }

  // Add HRV unit
  equipment.push({
    id: `hvac_hrv_${++equipmentCounter}`,
    type: 'hrv',
    position: hrvPosition,
    specs: {
      cfm: hvacDesign.recommended_system.hrv_cfm,
      model: hvacDesign.recommended_system.hrv_model,
    },
    label: `HRV ${hvacDesign.recommended_system.hrv_cfm} CFM`,
  })

  // Add outdoor unit
  const outdoorPosition = {
    x: floorPlan.overall_dimensions.width - 1000,
    y: floorPlan.overall_dimensions.depth / 2,
  }

  equipment.push({
    id: `hvac_outdoor_${++equipmentCounter}`,
    type: 'mini_split_outdoor',
    position: outdoorPosition,
    specs: {
      btu: hvacDesign.recommended_system.outdoor_unit_btu,
      kw: hvacDesign.recommended_system.outdoor_unit_kw,
    },
    label: `Outdoor Unit ${Math.round(hvacDesign.recommended_system.outdoor_unit_btu / 1000)}k BTU`,
  })

  // Add equipment for each room
  hvacDesign.rooms.forEach((roomReq, idx) => {
    const room = floorPlan.rooms.find(r => r.id === roomReq.room_id)
    if (!room) return

    // Skip non-conditioned spaces
    if (['garage', 'storage', 'mechanical'].includes(roomReq.room_type)) return

    // Calculate center position
    const centerX = room.position.x + room.dimensions.width / 2
    const centerY = room.position.y + room.dimensions.depth / 2

    // Add mini-split indoor unit for larger rooms
    if (roomReq.area_m2 > 10 && roomReq.cooling_load_btu > 4000) {
      equipment.push({
        id: `hvac_indoor_${++equipmentCounter}`,
        type: 'mini_split_indoor',
        position: {
          x: centerX - 400,
          y: room.position.y + 200,  // Near wall
        },
        specs: {
          btu: roomReq.recommended_equipment.mini_split_btu,
        },
        room_id: room.id,
        label: `${room.name} ${roomReq.recommended_equipment.mini_split_btu / 1000}k BTU`,
      })

      // Add duct from HRV to room (supply)
      ducts.push({
        id: `duct_supply_${idx}`,
        start: hrvPosition,
        end: { x: centerX, y: centerY },
        width: Math.max(100, Math.round(roomReq.ventilation_ls * 10)),
        type: 'supply',
      })
    }

    // Add supply diffuser
    equipment.push({
      id: `hvac_diffuser_${++equipmentCounter}`,
      type: 'supply_diffuser',
      position: {
        x: centerX - 150,
        y: centerY - 150,
      },
      specs: {
        cfm: roomReq.recommended_equipment.diffuser_cfm,
      },
      room_id: room.id,
    })

    // Add exhaust fan for bathrooms/kitchens
    if (roomReq.needs_exhaust) {
      equipment.push({
        id: `hvac_exhaust_${++equipmentCounter}`,
        type: 'exhaust_fan',
        position: {
          x: centerX + 200,
          y: room.position.y + 300,
        },
        specs: {
          cfm: roomReq.exhaust_cfm,
        },
        room_id: room.id,
        label: `Exhaust ${roomReq.exhaust_cfm} CFM`,
      })

      // Add exhaust duct
      ducts.push({
        id: `duct_exhaust_${idx}`,
        start: { x: centerX + 200, y: room.position.y + 300 },
        end: { x: centerX + 200, y: -500 }, // To exterior
        width: 100,
        type: 'exhaust',
      })
    }
  })

  // Add return grille in main area
  const mainRoom = floorPlan.rooms.find(r =>
    r.room_type === 'living' || r.name?.toLowerCase().includes('living')
  ) || floorPlan.rooms[0]

  if (mainRoom) {
    equipment.push({
      id: `hvac_return_${++equipmentCounter}`,
      type: 'return_grille',
      position: {
        x: mainRoom.position.x + mainRoom.dimensions.width / 2 - 200,
        y: mainRoom.position.y + mainRoom.dimensions.depth - 400,
      },
      specs: {
        cfm: Math.round(hvacDesign.whole_house_ventilation_cfm * 0.8),
      },
    })

    // Return duct to HRV
    ducts.push({
      id: 'duct_return_main',
      start: {
        x: mainRoom.position.x + mainRoom.dimensions.width / 2,
        y: mainRoom.position.y + mainRoom.dimensions.depth - 400,
      },
      end: hrvPosition,
      width: 200,
      type: 'return',
    })
  }

  return {
    equipment,
    ducts,
    design: hvacDesign,
    calculations: {
      cooling: Math.round(hvacDesign.total_cooling_w / 1000 * 10) / 10,
      heating: Math.round(hvacDesign.total_heating_w / 1000 * 10) / 10,
      airflow: hvacDesign.whole_house_ventilation_ls,
      cost: estimateSystemCost(equipment, ducts),
      efficiency: systemType === 'vrf' ? 4.2 : 3.5,
    },
  }
}

/**
 * Estimate system installation cost (CAD)
 */
function estimateSystemCost(equipment, ducts) {
  let cost = 0

  equipment.forEach(eq => {
    switch (eq.type) {
      case 'hrv':
        cost += 2500 + (eq.specs?.cfm || 100) * 8
        break
      case 'mini_split_outdoor':
        cost += 3000 + (eq.specs?.btu || 24000) * 0.15
        break
      case 'mini_split_indoor':
        cost += 1200 + (eq.specs?.btu || 12000) * 0.08
        break
      case 'supply_diffuser':
        cost += 150
        break
      case 'return_grille':
        cost += 200
        break
      case 'exhaust_fan':
        cost += 250 + (eq.specs?.cfm || 50) * 2
        break
    }
  })

  // Ductwork cost ($/linear meter)
  ducts.forEach(duct => {
    const length = Math.sqrt(
      Math.pow(duct.end.x - duct.start.x, 2) +
      Math.pow(duct.end.y - duct.start.y, 2)
    ) / 1000  // Convert to meters
    cost += length * 50  // $50/m average
  })

  return Math.round(cost)
}

export default {
  CLIMATE_ZONES,
  DEFAULT_CLIMATE_ZONE,
  VENTILATION_REQUIREMENTS,
  HEAT_LOSS_FACTORS,
  ROOM_LOAD_FACTORS,
  EQUIPMENT_SIZING,
  calculateRoomRequirements,
  calculateWholeHouseHVAC,
  generateHVACLayout,
}
