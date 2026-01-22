import { create } from 'zustand'
import { temporal } from 'zundo'
import { generateHVACLayout, calculateWholeHouseHVAC, CLIMATE_ZONES, DEFAULT_CLIMATE_ZONE } from '../utils/canadianHVACCode'

// Create store with temporal (undo/redo) middleware
const useHVACStore = create(
  temporal(
    (set, get) => ({
      // State
      equipment: [],
      ducts: [],
      selectedItem: null,
      tool: 'select',
      isDrawingDuct: false,
      ductStart: null,

      // UX-008: Canadian code design state
      climateZone: DEFAULT_CLIMATE_ZONE,
      buildingQuality: 'good',
      hvacDesign: null,  // Stores the calculated design

      // Equipment Actions
      setEquipment: (equipment) => set({ equipment }),

      addEquipment: (item) => set((state) => ({
        equipment: [...state.equipment, item]
      })),

      updateEquipment: (itemId, updates) => set((state) => ({
        equipment: state.equipment.map(e =>
          e.id === itemId ? { ...e, ...updates } : e
        )
      })),

      deleteEquipment: (itemId) => set((state) => ({
        equipment: state.equipment.filter(e => e.id !== itemId),
        selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem
      })),

      // Duct Actions
      setDucts: (ducts) => set({ ducts }),

      addDuct: (duct) => set((state) => ({
        ducts: [...state.ducts, duct]
      })),

      updateDuct: (ductId, updates) => set((state) => ({
        ducts: state.ducts.map(d =>
          d.id === ductId ? { ...d, ...updates } : d
        )
      })),

      deleteDuct: (ductId) => set((state) => ({
        ducts: state.ducts.filter(d => d.id !== ductId),
        selectedItem: state.selectedItem?.id === ductId ? null : state.selectedItem
      })),

      // Selection Actions
      setSelectedItem: (item) => set({ selectedItem: item }),

      clearSelection: () => set({ selectedItem: null }),

      // Tool Actions
      setTool: (tool) => set({
        tool,
        // Reset duct drawing state when switching tools
        isDrawingDuct: tool === 'duct' ? false : false,
        ductStart: tool === 'duct' ? null : null
      }),

      // Duct Drawing Actions
      setIsDrawingDuct: (isDrawing) => set({ isDrawingDuct: isDrawing }),

      setDuctStart: (point) => set({ ductStart: point }),

      resetDuctDrawing: () => set({
        isDrawingDuct: false,
        ductStart: null
      }),

      // Bulk Operations
      deleteEquipmentItems: (itemIds) => set((state) => ({
        equipment: state.equipment.filter(e => !itemIds.includes(e.id)),
        selectedItem: itemIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      deleteDucts: (ductIds) => set((state) => ({
        ducts: state.ducts.filter(d => !ductIds.includes(d.id)),
        selectedItem: ductIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      moveEquipment: (itemId, position) => set((state) => ({
        equipment: state.equipment.map(e =>
          e.id === itemId ? { ...e, position } : e
        )
      })),

      // Getters
      getEquipmentById: (itemId) => get().equipment.find(e => e.id === itemId),
      getDuctById: (ductId) => get().ducts.find(d => d.id === ductId),
      getEquipmentCount: () => get().equipment.length,
      getDuctCount: () => get().ducts.length,
      getEquipmentByType: (type) => get().equipment.filter(e => e.type === type),

      // UX-008: Canadian Code Settings
      setClimateZone: (zone) => set({ climateZone: zone }),

      setBuildingQuality: (quality) => set({ buildingQuality: quality }),

      // UX-008: Auto-populate HVAC from floor plan using Canadian code
      autoPopulateFromFloorPlan: (floorPlan, options = {}) => {
        const state = get()
        const climateZone = options.climateZone || state.climateZone
        const buildingQuality = options.buildingQuality || state.buildingQuality
        const systemType = options.systemType || 'vrf'

        try {
          // Generate HVAC layout using Canadian code
          const layout = generateHVACLayout(floorPlan, {
            climateZone,
            buildingQuality,
            systemType,
          })

          // Update store with generated equipment and ducts
          set({
            equipment: layout.equipment,
            ducts: layout.ducts,
            hvacDesign: layout.design,
            selectedItem: null,
          })

          return {
            success: true,
            design: layout.design,
            calculations: layout.calculations,
            equipmentCount: layout.equipment.length,
            ductCount: layout.ducts.length,
          }
        } catch (error) {
          console.error('Auto-populate HVAC failed:', error)
          return {
            success: false,
            error: error.message,
          }
        }
      },

      // UX-008: Calculate design without populating (preview)
      calculateDesign: (floorPlan, options = {}) => {
        const state = get()
        const climateZone = options.climateZone || state.climateZone
        const buildingQuality = options.buildingQuality || state.buildingQuality

        try {
          const design = calculateWholeHouseHVAC(floorPlan.rooms, {
            climateZone,
            buildingQuality,
          })
          set({ hvacDesign: design })
          return { success: true, design }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // Reset
      resetHVAC: () => set({
        equipment: [],
        ducts: [],
        selectedItem: null,
        tool: 'select',
        isDrawingDuct: false,
        ductStart: null,
        hvacDesign: null,
      }),
    }),
    {
      // Temporal options
      limit: 50, // Keep 50 history states
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
)

export default useHVACStore
