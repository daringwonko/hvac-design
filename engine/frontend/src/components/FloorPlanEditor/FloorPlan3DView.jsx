import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, Text, Environment } from '@react-three/drei'
import Room3D from './Room3D'

// Scale factor: 1 unit = 1 meter
const MM_TO_M = 0.001

function FloorPlanScene({ floorPlan, wallHeight = 2.7, selectedRoomId }) {
  const { rooms, overall_dimensions } = floorPlan

  // Convert overall dimensions to meters
  const width = overall_dimensions.width * MM_TO_M
  const depth = overall_dimensions.depth * MM_TO_M

  // Center offset to center the floor plan
  const offsetX = -width / 2
  const offsetZ = -depth / 2

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[width * 0.8, wallHeight * 2, depth * 0.8]}
        fov={50}
      />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={Math.max(width, depth) * 2}
        target={[0, wallHeight / 2, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial color="#1a1f2e" />
      </mesh>

      {/* Grid */}
      <Grid
        position={[0, 0.01, 0]}
        args={[width + 2, depth + 2]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* Rooms */}
      {rooms.map(room => (
        <Room3D
          key={room.id}
          room={room}
          offsetX={offsetX}
          offsetZ={offsetZ}
          wallHeight={wallHeight}
          isSelected={room.id === selectedRoomId}
        />
      ))}

      {/* Building outline */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.2} />
      </mesh>

      {/* Dimension labels */}
      <Text
        position={[0, 0.1, depth / 2 + 0.5]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
      >
        {(overall_dimensions.width / 1000).toFixed(1)}m
      </Text>
      <Text
        position={[-width / 2 - 0.5, 0.1, 0]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      >
        {(overall_dimensions.depth / 1000).toFixed(1)}m
      </Text>
    </>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#3b82f6" wireframe />
    </mesh>
  )
}

export default function FloorPlan3DView({
  floorPlan,
  selectedRoomId,
  wallHeight = 2.7,
  className = ''
}) {
  if (!floorPlan || !floorPlan.rooms) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 ${className}`}>
        <p className="text-slate-400">No floor plan data</p>
      </div>
    )
  }

  return (
    <div className={`bg-slate-900 relative ${className}`}>
      <Canvas shadows>
        <Suspense fallback={<LoadingFallback />}>
          <FloorPlanScene
            floorPlan={floorPlan}
            wallHeight={wallHeight}
            selectedRoomId={selectedRoomId}
          />
        </Suspense>
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded">
        <p>Drag to rotate | Scroll to zoom | Right-drag to pan</p>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded">
        <p>{floorPlan.rooms.length} rooms</p>
        <p>Wall height: {wallHeight}m</p>
      </div>
    </div>
  )
}
