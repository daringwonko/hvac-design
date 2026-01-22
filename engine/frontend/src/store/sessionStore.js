/**
 * Session Store - UX-001: Session State Architecture
 *
 * Central state management for the design session experience.
 * Tracks:
 * - Current project and session context
 * - Module completion status
 * - Navigation history
 * - Building code configuration (Canadian codes)
 * - Session persistence
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Module workflow order
export const MODULE_ORDER = ['floor-plan', 'hvac', 'electrical', 'plumbing', 'review']

// Module metadata
export const MODULE_INFO = {
  'floor-plan': {
    id: 'floor-plan',
    name: 'Floor Plan',
    description: 'Import or draw your floor plan',
    icon: 'layout',
    required: true,
  },
  'hvac': {
    id: 'hvac',
    name: 'HVAC',
    description: 'Design heating, ventilation, and air conditioning',
    icon: 'thermometer',
    required: false,
  },
  'electrical': {
    id: 'electrical',
    name: 'Electrical',
    description: 'Design electrical circuits and lighting',
    icon: 'zap',
    required: false,
  },
  'plumbing': {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Design water supply and drainage',
    icon: 'droplet',
    required: false,
  },
  'review': {
    id: 'review',
    name: 'Review & Export',
    description: 'Review design and export documents',
    icon: 'check-circle',
    required: true,
  },
}

// Canadian Building Code jurisdictions
export const CANADIAN_JURISDICTIONS = {
  'CEC': {
    code: 'CEC',
    name: 'Canadian Electrical Code',
    version: '2024',
    rules: {
      receptacleSpacing: 3658, // 12 feet in mm
      receptacleHeight: 406,   // 16 inches in mm (standard)
      receptacleHeightCounter: 1067, // 42 inches for counter
      standardCircuitAmps: 15,
      kitchenCircuitAmps: 20,
      stoveVoltage: 240,
      gfciDistanceFromWater: 914, // 3 feet in mm
      afciRequiredRooms: ['bedroom', 'master_bedroom', 'kids_bedroom'],
    }
  },
  'NPC': {
    code: 'NPC',
    name: 'National Plumbing Code of Canada',
    version: '2020',
    rules: {
      minVentSize: 38, // 1.5 inches in mm
      maxTrapToVent: 1524, // 5 feet in mm
      drainSlope: 0.02, // 2% (1/4" per foot)
    }
  },
  'NBC': {
    code: 'NBC',
    name: 'National Building Code of Canada',
    version: '2020',
    rules: {
      minCeilingHeight: 2134, // 7 feet in mm (habitable rooms)
      minRoomWidth: 2134, // 7 feet minimum dimension
    }
  },
  'NECB': {
    code: 'NECB',
    name: 'National Energy Code for Buildings',
    version: '2020',
    rules: {
      // Climate zone specific requirements
    }
  }
}

// Session status enum
export const SESSION_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPORTED: 'exported',
}

// Initial session state
const initialState = {
  // Session identity
  sessionId: null,
  projectId: null,
  projectName: 'Untitled Project',
  createdAt: null,
  updatedAt: null,
  status: SESSION_STATUS.NEW,

  // Current navigation
  currentModule: 'floor-plan',
  navigationHistory: [],

  // Module completion tracking
  moduleStatus: {
    'floor-plan': { completed: false, visitedAt: null, completedAt: null, data: null },
    'hvac': { completed: false, visitedAt: null, completedAt: null, data: null },
    'electrical': { completed: false, visitedAt: null, completedAt: null, data: null },
    'plumbing': { completed: false, visitedAt: null, completedAt: null, data: null },
    'review': { completed: false, visitedAt: null, completedAt: null, data: null },
  },

  // Building code configuration
  jurisdiction: 'CEC', // Default to Canadian Electrical Code
  buildingCodes: ['CEC', 'NPC', 'NBC'],
  climateZone: 6, // Canadian climate zone (1-8)

  // Project metadata
  buildingType: 'residential',
  projectAddress: '',
  projectCity: '',
  projectProvince: 'ON', // Ontario default

  // Validation errors
  validationErrors: [],

  // Last sync time for offline support
  lastSyncAt: null,
  pendingChanges: false,
}

const useSessionStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // === Session Management ===

      /**
       * Initialize a new session
       */
      initSession: (projectId = null, projectName = 'Untitled Project') => {
        const sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
        set({
          sessionId,
          projectId: projectId || `project_${Date.now().toString(36)}`,
          projectName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: SESSION_STATUS.NEW,
          currentModule: 'floor-plan',
          navigationHistory: ['floor-plan'],
          moduleStatus: { ...initialState.moduleStatus },
          validationErrors: [],
        })
        return sessionId
      },

      /**
       * Load an existing session
       */
      loadSession: (sessionData) => {
        set({
          ...sessionData,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Reset session to initial state
       */
      resetSession: () => {
        set(initialState)
      },

      // === Navigation ===

      /**
       * Navigate to a module
       */
      navigateToModule: (moduleId) => {
        const { navigationHistory, moduleStatus } = get()

        // Update visited timestamp
        const newModuleStatus = {
          ...moduleStatus,
          [moduleId]: {
            ...moduleStatus[moduleId],
            visitedAt: moduleStatus[moduleId]?.visitedAt || new Date().toISOString(),
          },
        }

        set({
          currentModule: moduleId,
          navigationHistory: [...navigationHistory, moduleId],
          moduleStatus: newModuleStatus,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Navigate to next module in workflow
       */
      navigateNext: () => {
        const { currentModule } = get()
        const currentIndex = MODULE_ORDER.indexOf(currentModule)
        if (currentIndex < MODULE_ORDER.length - 1) {
          get().navigateToModule(MODULE_ORDER[currentIndex + 1])
        }
      },

      /**
       * Navigate to previous module
       */
      navigatePrevious: () => {
        const { currentModule } = get()
        const currentIndex = MODULE_ORDER.indexOf(currentModule)
        if (currentIndex > 0) {
          get().navigateToModule(MODULE_ORDER[currentIndex - 1])
        }
      },

      /**
       * Go back in navigation history
       */
      navigateBack: () => {
        const { navigationHistory } = get()
        if (navigationHistory.length > 1) {
          const newHistory = [...navigationHistory]
          newHistory.pop() // Remove current
          const previousModule = newHistory[newHistory.length - 1]
          set({
            currentModule: previousModule,
            navigationHistory: newHistory,
          })
        }
      },

      // === Module Status ===

      /**
       * Mark a module as completed
       */
      completeModule: (moduleId, data = null) => {
        const { moduleStatus } = get()
        set({
          moduleStatus: {
            ...moduleStatus,
            [moduleId]: {
              ...moduleStatus[moduleId],
              completed: true,
              completedAt: new Date().toISOString(),
              data,
            },
          },
          status: SESSION_STATUS.IN_PROGRESS,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Mark a module as incomplete (e.g., after making changes)
       */
      markModuleIncomplete: (moduleId) => {
        const { moduleStatus } = get()
        set({
          moduleStatus: {
            ...moduleStatus,
            [moduleId]: {
              ...moduleStatus[moduleId],
              completed: false,
              completedAt: null,
            },
          },
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Update module data without changing completion status
       */
      updateModuleData: (moduleId, data) => {
        const { moduleStatus } = get()
        set({
          moduleStatus: {
            ...moduleStatus,
            [moduleId]: {
              ...moduleStatus[moduleId],
              data: { ...moduleStatus[moduleId]?.data, ...data },
            },
          },
          updatedAt: new Date().toISOString(),
          pendingChanges: true,
        })
      },

      /**
       * Check if a module can be accessed (dependencies met)
       */
      canAccessModule: (moduleId) => {
        const { moduleStatus } = get()

        // Floor plan is always accessible
        if (moduleId === 'floor-plan') return true

        // Review requires floor plan to be complete
        if (moduleId === 'review') {
          return moduleStatus['floor-plan'].completed
        }

        // MEP modules require floor plan
        return moduleStatus['floor-plan'].completed
      },

      /**
       * Get completion percentage
       */
      getCompletionPercentage: () => {
        const { moduleStatus } = get()
        const completedCount = Object.values(moduleStatus).filter(m => m.completed).length
        return Math.round((completedCount / MODULE_ORDER.length) * 100)
      },

      // === Building Code Configuration ===

      /**
       * Set jurisdiction (Canadian province/territory)
       */
      setJurisdiction: (jurisdiction) => {
        set({
          jurisdiction,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Set climate zone (affects HVAC calculations)
       */
      setClimateZone: (zone) => {
        set({
          climateZone: zone,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Get active building code rules
       */
      getBuildingCodeRules: () => {
        const { buildingCodes } = get()
        const rules = {}
        buildingCodes.forEach(code => {
          if (CANADIAN_JURISDICTIONS[code]) {
            rules[code] = CANADIAN_JURISDICTIONS[code].rules
          }
        })
        return rules
      },

      /**
       * Get electrical code rules (CEC)
       */
      getElectricalRules: () => {
        return CANADIAN_JURISDICTIONS.CEC.rules
      },

      /**
       * Get plumbing code rules (NPC)
       */
      getPlumbingRules: () => {
        return CANADIAN_JURISDICTIONS.NPC.rules
      },

      // === Project Metadata ===

      /**
       * Update project metadata
       */
      updateProjectInfo: (info) => {
        set({
          ...info,
          updatedAt: new Date().toISOString(),
        })
      },

      /**
       * Set project name
       */
      setProjectName: (name) => {
        set({
          projectName: name,
          updatedAt: new Date().toISOString(),
        })
      },

      // === Validation ===

      /**
       * Add validation error
       */
      addValidationError: (error) => {
        const { validationErrors } = get()
        set({
          validationErrors: [...validationErrors, {
            id: `err_${Date.now()}`,
            ...error,
            timestamp: new Date().toISOString(),
          }],
        })
      },

      /**
       * Clear validation errors for a module
       */
      clearModuleErrors: (moduleId) => {
        const { validationErrors } = get()
        set({
          validationErrors: validationErrors.filter(e => e.moduleId !== moduleId),
        })
      },

      /**
       * Clear all validation errors
       */
      clearAllErrors: () => {
        set({ validationErrors: [] })
      },

      // === Sync Status ===

      /**
       * Mark as synced
       */
      markSynced: () => {
        set({
          lastSyncAt: new Date().toISOString(),
          pendingChanges: false,
        })
      },

      /**
       * Mark as having pending changes
       */
      markPendingChanges: () => {
        set({ pendingChanges: true })
      },

      // === Selectors (computed values) ===

      /**
       * Get current module info
       */
      getCurrentModuleInfo: () => {
        const { currentModule } = get()
        return MODULE_INFO[currentModule]
      },

      /**
       * Get breadcrumb trail
       */
      getBreadcrumbs: () => {
        const { navigationHistory } = get()
        // Deduplicate while preserving order
        const seen = new Set()
        return navigationHistory.filter(moduleId => {
          if (seen.has(moduleId)) return false
          seen.add(moduleId)
          return true
        }).map(moduleId => MODULE_INFO[moduleId])
      },

      /**
       * Check if session is ready for export
       */
      isReadyForExport: () => {
        const { moduleStatus } = get()
        return moduleStatus['floor-plan'].completed
      },

      /**
       * Get session summary for export/save
       */
      getSessionSummary: () => {
        const state = get()
        return {
          sessionId: state.sessionId,
          projectId: state.projectId,
          projectName: state.projectName,
          status: state.status,
          completionPercentage: state.getCompletionPercentage(),
          moduleStatus: state.moduleStatus,
          jurisdiction: state.jurisdiction,
          buildingCodes: state.buildingCodes,
          climateZone: state.climateZone,
          buildingType: state.buildingType,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        }
      },
    }),
    {
      name: 'mep-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        sessionId: state.sessionId,
        projectId: state.projectId,
        projectName: state.projectName,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        status: state.status,
        currentModule: state.currentModule,
        moduleStatus: state.moduleStatus,
        jurisdiction: state.jurisdiction,
        buildingCodes: state.buildingCodes,
        climateZone: state.climateZone,
        buildingType: state.buildingType,
        projectAddress: state.projectAddress,
        projectCity: state.projectCity,
        projectProvince: state.projectProvince,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
)

export default useSessionStore
