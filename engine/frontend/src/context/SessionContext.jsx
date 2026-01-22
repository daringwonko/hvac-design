/**
 * Session Context - UX-002: Cross-Module Data Flow Pipeline
 *
 * Provides session context and hooks for all components.
 * Centralizes session state access and cross-module communication.
 */

import { createContext, useContext, useEffect, useCallback } from 'react'
import useSessionStore, {
  MODULE_ORDER,
  MODULE_INFO,
  CANADIAN_JURISDICTIONS,
  SESSION_STATUS,
} from '../store/sessionStore'
import useFloorPlanStore from '../store/floorPlanStore'
import useHVACStore from '../store/hvacStore'
import useElectricalStore from '../store/electricalStore'
import usePlumbingStore from '../store/plumbingStore'

// Create context
const SessionContext = createContext(null)

/**
 * Session Provider - wraps the app to provide session context
 */
export function SessionProvider({ children }) {
  // Get session store
  const sessionStore = useSessionStore()

  // Get module stores for cross-module data flow
  const floorPlanStore = useFloorPlanStore()
  const hvacStore = useHVACStore()
  const electricalStore = useElectricalStore()
  const plumbingStore = usePlumbingStore()

  // Initialize session on mount if not exists
  useEffect(() => {
    if (!sessionStore.sessionId) {
      sessionStore.initSession()
    }
  }, [])

  // Sync floor plan changes to session
  useEffect(() => {
    if (floorPlanStore.floorPlan?.rooms?.length > 0) {
      sessionStore.updateModuleData('floor-plan', {
        roomCount: floorPlanStore.floorPlan.rooms.length,
        totalArea: floorPlanStore.getTotalArea?.() || 0,
        hasRooms: true,
      })
    }
  }, [floorPlanStore.floorPlan?.rooms?.length])

  // Context value with all session utilities
  const contextValue = {
    // Session state
    session: sessionStore,
    sessionId: sessionStore.sessionId,
    projectId: sessionStore.projectId,
    projectName: sessionStore.projectName,
    currentModule: sessionStore.currentModule,
    moduleStatus: sessionStore.moduleStatus,
    status: sessionStore.status,

    // Navigation
    navigateToModule: sessionStore.navigateToModule,
    navigateNext: sessionStore.navigateNext,
    navigatePrevious: sessionStore.navigatePrevious,
    navigateBack: sessionStore.navigateBack,
    canAccessModule: sessionStore.canAccessModule,

    // Module completion
    completeModule: sessionStore.completeModule,
    markModuleIncomplete: sessionStore.markModuleIncomplete,
    getCompletionPercentage: sessionStore.getCompletionPercentage,

    // Building codes
    jurisdiction: sessionStore.jurisdiction,
    buildingCodes: sessionStore.buildingCodes,
    climateZone: sessionStore.climateZone,
    getElectricalRules: sessionStore.getElectricalRules,
    getPlumbingRules: sessionStore.getPlumbingRules,
    getBuildingCodeRules: sessionStore.getBuildingCodeRules,

    // Cross-module data access
    floorPlan: floorPlanStore.floorPlan,
    rooms: floorPlanStore.floorPlan?.rooms || [],
    hvacEquipment: hvacStore.equipment,
    electricalEquipment: electricalStore.equipment,
    plumbingFixtures: plumbingStore.fixtures,

    // Validation
    validationErrors: sessionStore.validationErrors,
    addValidationError: sessionStore.addValidationError,
    clearModuleErrors: sessionStore.clearModuleErrors,

    // Constants
    MODULE_ORDER,
    MODULE_INFO,
    CANADIAN_JURISDICTIONS,
    SESSION_STATUS,
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Hook to access session context
 */
export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

/**
 * Hook to get current module info
 */
export function useCurrentModule() {
  const { currentModule, moduleStatus, session } = useSession()
  return {
    moduleId: currentModule,
    moduleInfo: MODULE_INFO[currentModule],
    status: moduleStatus[currentModule],
    isCompleted: moduleStatus[currentModule]?.completed || false,
    canProceed: session.canAccessModule(MODULE_ORDER[MODULE_ORDER.indexOf(currentModule) + 1]),
  }
}

/**
 * Hook to get navigation utilities
 */
export function useSessionNavigation() {
  const session = useSession()
  return {
    currentModule: session.currentModule,
    navigateTo: session.navigateToModule,
    navigateNext: session.navigateNext,
    navigatePrevious: session.navigatePrevious,
    navigateBack: session.navigateBack,
    canAccess: session.canAccessModule,
    breadcrumbs: session.session.getBreadcrumbs(),
    moduleOrder: MODULE_ORDER,
    moduleInfo: MODULE_INFO,
  }
}

/**
 * Hook to get Canadian building code rules
 */
export function useCanadianCodes() {
  const session = useSession()
  return {
    jurisdiction: session.jurisdiction,
    electricalRules: session.getElectricalRules(),
    plumbingRules: session.getPlumbingRules(),
    buildingCodes: session.getBuildingCodeRules(),
    climateZone: session.climateZone,
    CANADIAN_JURISDICTIONS,
  }
}

/**
 * Hook to get floor plan data for MEP modules
 */
export function useFloorPlanForMEP() {
  const session = useSession()
  const floorPlan = session.floorPlan

  // Transform rooms to format needed by MEP modules
  const roomsForCalculation = (floorPlan?.rooms || []).map(room => ({
    id: room.id,
    name: room.name,
    type: room.roomType || inferRoomType(room.name),
    position: room.position,
    dimensions: room.dimensions,
    area: (room.dimensions?.width * room.dimensions?.depth) / 1000000, // m²
    perimeter: room.dimensions
      ? 2 * (room.dimensions.width + room.dimensions.depth) / 1000 // m
      : 0,
  }))

  return {
    floorPlan,
    rooms: roomsForCalculation,
    totalArea: roomsForCalculation.reduce((sum, r) => sum + r.area, 0),
    roomCount: roomsForCalculation.length,
    hasFloorPlan: roomsForCalculation.length > 0,
  }
}

/**
 * Hook to check if session is ready for a specific action
 */
export function useSessionReadiness() {
  const session = useSession()
  return {
    hasFloorPlan: session.rooms.length > 0,
    canDesignHVAC: session.moduleStatus['floor-plan']?.completed,
    canDesignElectrical: session.moduleStatus['floor-plan']?.completed,
    canDesignPlumbing: session.moduleStatus['floor-plan']?.completed,
    canExport: session.session.isReadyForExport(),
    completionPercentage: session.getCompletionPercentage(),
  }
}

/**
 * Infer room type from room name
 * UX-018: Room Type Inference (basic version, enhanced in DXF importer)
 */
function inferRoomType(name) {
  const nameLower = (name || '').toLowerCase()

  // Bedrooms
  if (nameLower.includes('master') || nameLower.includes('primary')) return 'master_bedroom'
  if (nameLower.includes('bedroom') || nameLower.includes('bed')) return 'bedroom'
  if (nameLower.includes('kid') || nameLower.includes('child')) return 'kids_bedroom'

  // Living spaces
  if (nameLower.includes('living')) return 'living_room'
  if (nameLower.includes('family')) return 'family_room'
  if (nameLower.includes('dining')) return 'dining_room'
  if (nameLower.includes('great')) return 'great_room'

  // Kitchen
  if (nameLower.includes('kitchen')) return 'kitchen'
  if (nameLower.includes('pantry')) return 'pantry'

  // Bathrooms
  if (nameLower.includes('ensuite') || nameLower.includes('en-suite')) return 'ensuite'
  if (nameLower.includes('bathroom') || nameLower.includes('bath')) return 'bathroom'
  if (nameLower.includes('powder') || nameLower.includes('half bath')) return 'powder_room'
  if (nameLower.includes('laundry')) return 'laundry'

  // Utility
  if (nameLower.includes('garage')) return 'garage'
  if (nameLower.includes('storage')) return 'storage'
  if (nameLower.includes('mechanical') || nameLower.includes('furnace')) return 'mechanical'
  if (nameLower.includes('utility')) return 'utility'
  if (nameLower.includes('mudroom') || nameLower.includes('mud room')) return 'mudroom'

  // Circulation
  if (nameLower.includes('hallway') || nameLower.includes('hall')) return 'hallway'
  if (nameLower.includes('foyer') || nameLower.includes('entry')) return 'foyer'
  if (nameLower.includes('stair')) return 'stairs'

  // Office
  if (nameLower.includes('office') || nameLower.includes('study') || nameLower.includes('den')) return 'office'

  // Default
  return 'other'
}

// Room type categories for electrical code compliance
export const ROOM_TYPE_CATEGORIES = {
  // Rooms requiring AFCI protection (CEC)
  afciRequired: ['bedroom', 'master_bedroom', 'kids_bedroom'],

  // Rooms requiring GFCI near water
  gfciRequired: ['kitchen', 'bathroom', 'ensuite', 'powder_room', 'laundry', 'garage'],

  // Rooms with 20A circuit requirement
  twentyAmpCircuit: ['kitchen', 'laundry', 'garage'],

  // Rooms with special ventilation requirements
  ventilationRequired: ['bathroom', 'ensuite', 'powder_room', 'kitchen', 'laundry'],

  // Wet rooms (plumbing)
  wetRooms: ['kitchen', 'bathroom', 'ensuite', 'powder_room', 'laundry'],
}

export default SessionContext
