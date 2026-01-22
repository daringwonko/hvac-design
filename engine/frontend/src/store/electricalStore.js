import { create } from 'zustand'
import { temporal } from 'zundo'
import { generateElectricalLayout, estimateElectricalCost } from '../utils/canadianElectricalCode'

// Default electrical state structure
const defaultElectricalState = {
  equipment: [],      // Array of electrical equipment (panels, outlets, switches, lights, detectors)
  wires: [],          // Array of wire segments with circuit info
  selectedItem: null, // Currently selected equipment or wire
  tool: 'select',     // Current tool: 'select', 'wire', 'measure'
  isDrawingWire: false,
  wireStart: null,    // Starting point for wire drawing

  // UX-009: CEC design state
  electricalDesign: null,  // Stores calculated design with CEC compliance
}

// Create store with temporal (undo/redo) middleware
const useElectricalStore = create(
  temporal(
    (set, get) => ({
      // State
      ...defaultElectricalState,

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

      // Wire Actions
      setWires: (wires) => set({ wires }),

      addWire: (wire) => set((state) => ({
        wires: [...state.wires, wire]
      })),

      updateWire: (wireId, updates) => set((state) => ({
        wires: state.wires.map(w =>
          w.id === wireId ? { ...w, ...updates } : w
        )
      })),

      deleteWire: (wireId) => set((state) => ({
        wires: state.wires.filter(w => w.id !== wireId),
        selectedItem: state.selectedItem?.id === wireId ? null : state.selectedItem
      })),

      // Selection Actions
      setSelectedItem: (item) => set({ selectedItem: item }),

      clearSelection: () => set({ selectedItem: null }),

      // Tool Actions
      setTool: (tool) => set({
        tool,
        // Reset wire drawing state when switching tools
        isDrawingWire: tool === 'wire' ? false : false,
        wireStart: tool === 'wire' ? null : null
      }),

      // Wire Drawing Actions
      setIsDrawingWire: (isDrawing) => set({ isDrawingWire: isDrawing }),

      setWireStart: (point) => set({ wireStart: point }),

      resetWireDrawing: () => set({
        isDrawingWire: false,
        wireStart: null
      }),

      // Bulk operations for multi-select
      deleteEquipmentItems: (itemIds) => set((state) => ({
        equipment: state.equipment.filter(e => !itemIds.includes(e.id)),
        selectedItem: itemIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      deleteWires: (wireIds) => set((state) => ({
        wires: state.wires.filter(w => !wireIds.includes(w.id)),
        selectedItem: wireIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      moveEquipment: (itemId, position) => set((state) => ({
        equipment: state.equipment.map(e =>
          e.id === itemId ? { ...e, position } : e
        )
      })),

      moveEquipmentItems: (itemIds, deltaX, deltaY) => set((state) => ({
        equipment: state.equipment.map(e =>
          itemIds.includes(e.id)
            ? { ...e, position: { x: e.position.x + deltaX, y: e.position.y + deltaY } }
            : e
        )
      })),

      // Getters
      getEquipmentItem: (itemId) => get().equipment.find(e => e.id === itemId),
      getWire: (wireId) => get().wires.find(w => w.id === wireId),
      getEquipmentCount: () => get().equipment.length,
      getWireCount: () => get().wires.length,
      getEquipmentByType: (type) => get().equipment.filter(e => e.type === type),

      // UX-009: Auto-populate electrical from floor plan using CEC
      autoPopulateFromFloorPlan: (floorPlan) => {
        try {
          // Generate electrical layout using Canadian Electrical Code
          const layout = generateElectricalLayout(floorPlan)
          const cost = estimateElectricalCost(layout)

          // Update store with generated equipment and wires
          set({
            equipment: layout.equipment,
            wires: layout.wires,
            electricalDesign: {
              ...layout,
              estimated_cost: cost,
            },
            selectedItem: null,
          })

          return {
            success: true,
            summary: layout.summary,
            code_compliance: layout.code_compliance,
            estimated_cost: cost,
            equipmentCount: layout.equipment.length,
            wireCount: layout.wires.length,
          }
        } catch (error) {
          console.error('Auto-populate electrical failed:', error)
          return {
            success: false,
            error: error.message,
          }
        }
      },

      // UX-009: Get design summary for display
      getDesignSummary: () => {
        const state = get()
        if (!state.electricalDesign) return null

        return {
          ...state.electricalDesign.summary,
          code_compliance: state.electricalDesign.code_compliance,
          estimated_cost: state.electricalDesign.estimated_cost,
        }
      },

      // Reset
      resetElectricalState: () => set({
        ...defaultElectricalState,
        electricalDesign: null,
      }),
    }),
    {
      // Temporal options
      limit: 50, // Keep 50 history states
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
)

export default useElectricalStore
