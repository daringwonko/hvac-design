import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import useSelectionStore from '../../store/selectionStore'

// Scale factor: 1 unit = 1 meter
const MM_TO_M = 0.001

// Room type colors (same as 2D editor)
const ROOM_COLORS = {
  living: '#3b82f6',
  bedroom: '#8b5cf6',
  kitchen: '#f59e0b',
  bathroom: '#06b6d4',
  entry: '#10b981',
  corridor: '#6b7280',
  utility: '#64748b',
  mechanical: '#ef4444',
  office: '#6366f1',
  dining: '#ec4899',
  garage: '#78716c',
  storage: '#a1a1aa',
  other: '#9ca3af',
}

function Wall({
  position,
  size,
  rotation = [0, 0, 0],
  color,
  opacity = 0.6,
  isSelected,
  baseColor
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={isSelected ? 0.8 : opacity}
        side={THREE.DoubleSide}
        emissive={isSelected ? baseColor : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  )
}

export default function Room3D({
  room,
  offsetX,
  offsetZ,
  wallHeight = 2.7,
}) {
  const { select, selectedIds } = useSelectionStore()
  const isSelected = selectedIds.includes(room.id)

  const color = ROOM_COLORS[room.room_type] || ROOM_COLORS.other
  const selectedColor = '#ffffff'

  // Handle room click for selection
  const handleClick = (e) => {
    e.stopPropagation()
    select(room.id)
  }

  // Convert dimensions from mm to meters
  const width = room.dimensions.width * MM_TO_M
  const depth = room.dimensions.depth * MM_TO_M
  const height = wallHeight

  // Position (convert from mm to meters and apply offset)
  const x = room.position.x * MM_TO_M + offsetX + width / 2
  const z = room.position.y * MM_TO_M + offsetZ + depth / 2

  const wallThickness = 0.05

  // Memoize wall positions to prevent recalculation
  const walls = useMemo(() => [
    // Front wall (positive Z)
    {
      position: [x, height / 2, z + depth / 2],
      size: [width, height, wallThickness],
      rotation: [0, 0, 0]
    },
    // Back wall (negative Z)
    {
      position: [x, height / 2, z - depth / 2],
      size: [width, height, wallThickness],
      rotation: [0, 0, 0]
    },
    // Right wall (positive X)
    {
      position: [x + width / 2, height / 2, z],
      size: [wallThickness, height, depth],
      rotation: [0, 0, 0]
    },
    // Left wall (negative X)
    {
      position: [x - width / 2, height / 2, z],
      size: [wallThickness, height, depth],
      rotation: [0, 0, 0]
    },
  ], [x, z, width, depth, height])

  return (
    <group onClick={handleClick}>
      {/* Floor */}
      <mesh
        position={[x, 0.03, z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width - 0.02, depth - 0.02]} />
        <meshStandardMaterial
          color={isSelected ? selectedColor : color}
          transparent
          opacity={isSelected ? 0.5 : 0.3}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Floor outline */}
      <lineSegments position={[x, 0.04, z]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} />
        <lineBasicMaterial color={isSelected ? selectedColor : color} linewidth={2} />
      </lineSegments>

      {/* Walls */}
      {walls.map((wall, i) => (
        <Wall
          key={i}
          position={wall.position}
          size={wall.size}
          rotation={wall.rotation}
          color={isSelected ? selectedColor : color}
          opacity={0.4}
          isSelected={isSelected}
          baseColor={color}
        />
      ))}

      {/* Room name label */}
      <Text
        position={[x, height + 0.3, z]}
        fontSize={0.3}
        color={isSelected ? selectedColor : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {room.name}
      </Text>

      {/* Dimensions label */}
      <Text
        position={[x, height + 0.05, z]}
        fontSize={0.15}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {(room.dimensions.width / 1000).toFixed(1)}m × {(room.dimensions.depth / 1000).toFixed(1)}m
      </Text>

      {/* Area label */}
      <Text
        position={[x, 0.2, z]}
        fontSize={0.2}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {((room.dimensions.width * room.dimensions.depth) / 1000000).toFixed(1)} m²
      </Text>
    </group>
  )
}
