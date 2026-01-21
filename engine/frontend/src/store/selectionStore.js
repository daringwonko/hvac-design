import { create } from 'zustand'

const useSelectionStore = create((set, get) => ({
  // State
  selectedIds: [],
  lastSelectedId: null,
  selectionMode: 'single', // 'single', 'multi', 'range'

  // Actions
  select: (id) => set({
    selectedIds: [id],
    lastSelectedId: id
  }),

  // Toggle selection (Ctrl+click)
  toggleSelect: (id) => set((state) => {
    const isSelected = state.selectedIds.includes(id)
    if (isSelected) {
      return {
        selectedIds: state.selectedIds.filter(i => i !== id),
        lastSelectedId: state.selectedIds.length > 1 ? state.lastSelectedId : null
      }
    } else {
      return {
        selectedIds: [...state.selectedIds, id],
        lastSelectedId: id
      }
    }
  }),

  // Add to selection
  addToSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds
      : [...state.selectedIds, id],
    lastSelectedId: id
  })),

  // Select multiple (for drag box selection)
  selectMultiple: (ids) => set({
    selectedIds: ids,
    lastSelectedId: ids.length > 0 ? ids[ids.length - 1] : null
  }),

  // Add multiple to selection
  addMultipleToSelection: (ids) => set((state) => ({
    selectedIds: [...new Set([...state.selectedIds, ...ids])],
    lastSelectedId: ids.length > 0 ? ids[ids.length - 1] : state.lastSelectedId
  })),

  // Clear selection
  clearSelection: () => set({
    selectedIds: [],
    lastSelectedId: null
  }),

  // Select all (receives list of all IDs)
  selectAll: (allIds) => set({
    selectedIds: [...allIds],
    lastSelectedId: allIds.length > 0 ? allIds[allIds.length - 1] : null
  }),

  // Set selection mode
  setSelectionMode: (mode) => set({ selectionMode: mode }),

  // Getters
  isSelected: (id) => get().selectedIds.includes(id),
  getSelectedCount: () => get().selectedIds.length,
  hasSelection: () => get().selectedIds.length > 0,
  isSingleSelection: () => get().selectedIds.length === 1,
  isMultiSelection: () => get().selectedIds.length > 1,

  // Get first selected (for property panel)
  getFirstSelected: () => get().selectedIds[0] || null,
}))

export default useSelectionStore
