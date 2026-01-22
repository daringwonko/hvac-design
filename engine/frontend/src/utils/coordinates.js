/**
 * Coordinate transformation utilities for 2D/3D views
 *
 * Coordinate Systems:
 * - Canvas: Pixel coordinates on the 2D SVG canvas (origin top-left)
 * - World2D: Real-world coordinates in feet (origin top-left, Y down)
 * - World3D: Three.js coordinates (origin center, Y up, Z towards camera)
 */

/**
 * Default scale factor: pixels per foot
 */
export const DEFAULT_SCALE = 10 // 10 pixels = 1 foot

/**
 * Convert canvas coordinates to 2D world coordinates
 * @param {number} canvasX - X position in pixels
 * @param {number} canvasY - Y position in pixels
 * @param {Object} options - { scale, panX, panY }
 * @returns {{ x: number, y: number }} World coordinates in feet
 */
export const canvasToWorld2D = (canvasX, canvasY, options = {}) => {
  const { scale = DEFAULT_SCALE, panX = 0, panY = 0 } = options
  return {
    x: (canvasX - panX) / scale,
    y: (canvasY - panY) / scale
  }
}

/**
 * Convert 2D world coordinates to canvas coordinates
 * @param {number} worldX - X position in feet
 * @param {number} worldY - Y position in feet
 * @param {Object} options - { scale, panX, panY }
 * @returns {{ x: number, y: number }} Canvas coordinates in pixels
 */
export const world2DToCanvas = (worldX, worldY, options = {}) => {
  const { scale = DEFAULT_SCALE, panX = 0, panY = 0 } = options
  return {
    x: worldX * scale + panX,
    y: worldY * scale + panY
  }
}

/**
 * Convert 2D world coordinates to 3D world coordinates
 * Note: In Three.js, Y is up and Z is towards camera
 * We place floor at Y=0, so 2D Y becomes 3D -Z
 * @param {number} worldX - X position in feet (2D)
 * @param {number} worldY - Y position in feet (2D)
 * @param {number} height - Height/elevation in feet (default 0)
 * @returns {{ x: number, y: number, z: number }} 3D coordinates
 */
export const world2DTo3D = (worldX, worldY, height = 0) => {
  return {
    x: worldX,
    y: height,
    z: -worldY // Flip Y to Z (negative because Three.js Z points towards camera)
  }
}

/**
 * Convert 3D world coordinates to 2D world coordinates
 * @param {number} x3d - X position in 3D
 * @param {number} y3d - Y/height position in 3D
 * @param {number} z3d - Z position in 3D
 * @returns {{ x: number, y: number, height: number }} 2D coordinates with height
 */
export const world3DTo2D = (x3d, y3d, z3d) => {
  return {
    x: x3d,
    y: -z3d, // Flip Z back to Y
    height: y3d
  }
}

/**
 * Convert room dimensions from 2D to 3D box dimensions
 * @param {Object} room - Room with { width, height } in feet
 * @param {number} wallHeight - Wall height in feet (default 10)
 * @returns {{ width: number, height: number, depth: number }} 3D dimensions
 */
export const roomDimensionsTo3D = (room, wallHeight = 10) => {
  return {
    width: room.width,
    height: wallHeight,
    depth: room.height // 2D height becomes 3D depth
  }
}

/**
 * Get 3D position for a room's center
 * @param {Object} room - Room with { position: { x, y }, width, height }
 * @param {number} elevation - Floor elevation (default 0)
 * @returns {{ x: number, y: number, z: number }} 3D center position
 */
export const getRoomCenter3D = (room, elevation = 0) => {
  const centerX = room.position.x + room.width / 2
  const centerY = room.position.y + room.height / 2
  return world2DTo3D(centerX, centerY, elevation)
}

export default {
  DEFAULT_SCALE,
  canvasToWorld2D,
  world2DToCanvas,
  world2DTo3D,
  world3DTo2D,
  roomDimensionsTo3D,
  getRoomCenter3D
}
