import { create } from 'zustand'
import { temporal } from 'zundo'

// Default floor plan structure
const defaultFloorPlan = {
  id: 'fp_goldilocks',
  name: 'Goldilocks 3B-3B',
  overall_dimensions: { width: 17850, depth: 7496 },
  rooms: [],
  walls: []
}

// Create store with temporal (undo/redo) middleware
const useFloorPlanStore = create(
  temporal(
    (set, get) => ({
      // State
      floorPlan: defaultFloorPlan,

      // Actions
      setFloorPlan: (floorPlan) => set({ floorPlan }),

      addRoom: (room) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: [...state.floorPlan.rooms, room]
        }
      })),

      updateRoom: (roomId, updates) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.map(r =>
            r.id === roomId ? { ...r, ...updates } : r
          )
        }
      })),

      deleteRoom: (roomId) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.filter(r => r.id !== roomId)
        }
      })),

      moveRoom: (roomId, position) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.map(r =>
            r.id === roomId ? { ...r, position } : r
          )
        }
      })),

      resizeRoom: (roomId, dimensions, position) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.map(r =>
            r.id === roomId
              ? { ...r, dimensions: { ...r.dimensions, ...dimensions }, position: position || r.position }
              : r
          )
        }
      })),

      // Bulk operations for multi-select
      deleteRooms: (roomIds) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.filter(r => !roomIds.includes(r.id))
        }
      })),

      moveRooms: (roomIds, deltaX, deltaY) => set((state) => ({
        floorPlan: {
          ...state.floorPlan,
          rooms: state.floorPlan.rooms.map(r =>
            roomIds.includes(r.id)
              ? { ...r, position: { x: r.position.x + deltaX, y: r.position.y + deltaY } }
              : r
          )
        }
      })),

      // Getters
      getRoom: (roomId) => get().floorPlan.rooms.find(r => r.id === roomId),
      getRoomCount: () => get().floorPlan.rooms.length,
      getTotalArea: () => get().floorPlan.rooms.reduce(
        (sum, room) => sum + (room.dimensions.width * room.dimensions.depth) / 1000000,
        0
      ),

      // Reset
      resetFloorPlan: () => set({ floorPlan: defaultFloorPlan }),
    }),
    {
      // Temporal options
      limit: 50, // Keep 50 history states
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
)

export default useFloorPlanStore
