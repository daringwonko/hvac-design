import { create } from 'zustand'
import { temporal } from 'zundo'

// Create store with temporal (undo/redo) middleware
const usePlumbingStore = create(
  temporal(
    (set, get) => ({
      // State
      fixtures: [],
      pipes: [],
      selectedItem: null,
      tool: 'select',
      isDrawingPipe: false,
      pipeStart: null,
      pipeType: 'cold',

      // Fixture Actions
      setFixtures: (fixtures) => set({ fixtures }),

      addFixture: (fixture) => set((state) => ({
        fixtures: [...state.fixtures, fixture]
      })),

      updateFixture: (fixtureId, updates) => set((state) => ({
        fixtures: state.fixtures.map(f =>
          f.id === fixtureId ? { ...f, ...updates } : f
        )
      })),

      deleteFixture: (fixtureId) => set((state) => ({
        fixtures: state.fixtures.filter(f => f.id !== fixtureId),
        selectedItem: state.selectedItem?.id === fixtureId ? null : state.selectedItem
      })),

      // Pipe Actions
      setPipes: (pipes) => set({ pipes }),

      addPipe: (pipe) => set((state) => ({
        pipes: [...state.pipes, pipe]
      })),

      updatePipe: (pipeId, updates) => set((state) => ({
        pipes: state.pipes.map(p =>
          p.id === pipeId ? { ...p, ...updates } : p
        )
      })),

      deletePipe: (pipeId) => set((state) => ({
        pipes: state.pipes.filter(p => p.id !== pipeId),
        selectedItem: state.selectedItem?.id === pipeId ? null : state.selectedItem
      })),

      // Selection Actions
      setSelectedItem: (item) => set({ selectedItem: item }),

      clearSelection: () => set({ selectedItem: null }),

      // Tool Actions
      setTool: (tool) => set({
        tool,
        // Reset pipe drawing state when switching tools (matches HVAC/Electrical pattern)
        isDrawingPipe: false,
        pipeStart: null
      }),

      // Move fixture to new position
      moveFixture: (fixtureId, x, y) => set((state) => ({
        fixtures: state.fixtures.map(f =>
          f.id === fixtureId ? { ...f, x, y } : f
        )
      })),

      // Pipe Drawing Actions
      setIsDrawingPipe: (isDrawingPipe) => set({ isDrawingPipe }),

      setPipeStart: (pipeStart) => set({ pipeStart }),

      setPipeType: (pipeType) => set({ pipeType }),

      resetPipeDrawing: () => set({
        isDrawingPipe: false,
        pipeStart: null
      }),

      // Bulk Operations
      deleteFixtures: (fixtureIds) => set((state) => ({
        fixtures: state.fixtures.filter(f => !fixtureIds.includes(f.id)),
        selectedItem: fixtureIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      deletePipes: (pipeIds) => set((state) => ({
        pipes: state.pipes.filter(p => !pipeIds.includes(p.id)),
        selectedItem: pipeIds.includes(state.selectedItem?.id) ? null : state.selectedItem
      })),

      // Getters
      getFixture: (fixtureId) => get().fixtures.find(f => f.id === fixtureId),
      getPipe: (pipeId) => get().pipes.find(p => p.id === pipeId),
      getFixtureCount: () => get().fixtures.length,
      getPipeCount: () => get().pipes.length,
      getFixturesByType: (type) => get().fixtures.filter(f => f.type === type),
      getPipesByType: (type) => get().pipes.filter(p => p.pipeType === type),

      // Reset
      resetPlumbing: () => set({
        fixtures: [],
        pipes: [],
        selectedItem: null,
        tool: 'select',
        isDrawingPipe: false,
        pipeStart: null,
        pipeType: 'cold'
      }),
    }),
    {
      // Temporal options
      limit: 50, // Keep 50 history states
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
)

export default usePlumbingStore
