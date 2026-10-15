'use client';

import { Billboard, ContactShadows, OrbitControls, Text } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { Facility } from '@/lib/types';

const statusColor: Record<Facility['status'], string> = { normal: '#55e6a5', warning: '#f2bb63', critical: '#f16f66' };

type Props = { facilities: Facility[]; selectedId: string | null; onSelect: (facility: Facility) => void };

function CampusLabel({ facility, hovered }: { facility: Facility; hovered: boolean }) {
  return <Billboard position={[0, facility.size[1] + 0.42, 0]} follow lockX={false} lockY={false} lockZ={false}>
    <Text
      anchorX="center"
      anchorY="middle"
      fontSize={0.24}
      color={statusColor[facility.status]}
      outlineColor="#07111f"
      outlineWidth={hovered ? 0.045 : 0.03}
      material-toneMapped={false}
      renderOrder={10}
    >
      {facility.shortName}
    </Text>
  </Billboard>;
}

function Windows({ width, height, depth, accent }: { width: number; height: number; depth: number; accent: string }) {
  const rows = Math.max(1, Math.floor(height / 1.25));
  const cols = Math.max(2, Math.floor(width / 1.15));
  return <group>
    {Array.from({ length: rows }).flatMap((_, row) => Array.from({ length: cols }).map((__, col) => {
      const x = -width / 2 + .72 + col * ((width - 1.1) / Math.max(1, cols - 1));
      const y = .78 + row * 1.16;
      return <group key={`${row}-${col}`} position={[x, y, depth / 2 + .012]}>
        <mesh><boxGeometry args={[.42, .46, .035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.11} roughness={.32} metalness={.2} /></mesh>
        <mesh position={[0, 0, -.03]}><boxGeometry args={[.5, .54, .02]} /><meshStandardMaterial color="#10263a" roughness={.8} /></mesh>
      </group>;
    }))}
  </group>;
}

function FacilityMesh({ facility, selected, onSelect }: { facility: Facility; selected: boolean; onSelect: (facility: Facility) => void }) {
  const [hovered, setHovered] = useState(false);
  const [width, height, depth] = facility.size;
  const tone = statusColor[facility.status];
  return <group position={facility.position} onClick={(event) => { event.stopPropagation(); onSelect(facility); }} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, 0]}><ringGeometry args={[Math.max(width, depth) * .5, Math.max(width, depth) * .62, 48]} /><meshBasicMaterial color="#54d7f2" transparent opacity={.32} side={THREE.DoubleSide} /></mesh>}
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={selected ? '#21455d' : '#193348'} roughness={.7} metalness={.08} emissive={selected ? '#0f7185' : tone} emissiveIntensity={selected ? .18 : .025} />
    </mesh>
    <mesh position={[0, height + .08, 0]} castShadow>
      <boxGeometry args={[width + .16, .15, depth + .16]} />
      <meshStandardMaterial color={selected ? '#8ae7ef' : '#7b9bad'} roughness={.36} metalness={.3} />
    </mesh>
    <mesh position={[0, .74, depth / 2 + .045]} castShadow><boxGeometry args={[.76, 1.24, .12]} /><meshStandardMaterial color="#07111f" emissive={tone} emissiveIntensity={.12} metalness={.35} roughness={.3} /></mesh>
    <Windows width={width} height={height} depth={depth} accent={selected ? '#b8f6ff' : '#70d4e6'} />
    <mesh position={[width / 2 + .05, .55, 0]}><boxGeometry args={[.13, 1.1, Math.min(1.2, depth * .42)]} /><meshStandardMaterial color="#aac6d1" transparent opacity={.35} /></mesh>
    <mesh position={[-width / 2 - .05, .55, 0]}><boxGeometry args={[.13, 1.1, Math.min(1.2, depth * .42)]} /><meshStandardMaterial color="#aac6d1" transparent opacity={.35} /></mesh>
    <pointLight position={[0, height + .5, 0]} color={tone} intensity={selected ? .5 : 0} distance={4} />
    <CampusLabel facility={facility} hovered={hovered || selected} />
  </group>;
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, .55, 0]} castShadow><cylinderGeometry args={[.09, .13, 1.1, 8]} /><meshStandardMaterial color="#6d4931" roughness={1} /></mesh>
    <mesh position={[0, 1.32, 0]} castShadow><dodecahedronGeometry args={[.58, 1]} /><meshStandardMaterial color="#287956" roughness={1} /></mesh>
    <mesh position={[.24, 1.75, .1]} castShadow><dodecahedronGeometry args={[.38, 1]} /><meshStandardMaterial color="#3f9c69" roughness={1} /></mesh>
  </group>;
}

function CampusGround({ facilities, selectedId, onSelect }: Props) {
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[35, 28]} /><meshStandardMaterial color="#102b2d" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}><planeGeometry args={[29, 22]} /><meshStandardMaterial color="#183b36" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .024, 2.5]}><planeGeometry args={[3.3, 24]} /><meshStandardMaterial color="#6b746d" roughness={.95} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.9, .025, 0]}><planeGeometry args={[22, 2.25]} /><meshStandardMaterial color="#777c7b" roughness={.95} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.4, .026, -1.2]}><planeGeometry args={[7.4, 1.35]} /><meshStandardMaterial color="#6f7775" roughness={.95} /></mesh>
    {[-8.7, -5.6, 4.2, 7.3].map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, .032, 2.5]}><planeGeometry args={[.08, 20]} /><meshStandardMaterial color="#d6c46f" roughness={.8} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, -8]}><circleGeometry args={[4.1, 32]} /><meshStandardMaterial color="#245c43" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .045, -8]}><ringGeometry args={[3.05, 3.15, 32]} /><meshStandardMaterial color="#79b978" roughness={1} /></mesh>
    {facilities.map((facility) => <FacilityMesh key={facility.id} facility={facility} selected={selectedId === facility.id} onSelect={onSelect} />)}
    <Tree position={[-12, .05, -7]} scale={1.25} /><Tree position={[-12.8, .05, 2]} scale={.85} /><Tree position={[-5.2, .05, 9]} scale={1.1} /><Tree position={[4.6, .05, -8.8]} scale={1.05} /><Tree position={[11.8, .05, -7.2]} scale={.9} /><Tree position={[12.4, .05, 3.2]} scale={1.2} /><Tree position={[-.2, .05, -12]} scale={.9} />
    {[-4.2, 3.8, 10.8].map((x) => <group key={x} position={[x, .05, 9.5]}><mesh position={[0, 1, 0]}><cylinderGeometry args={[.045, .045, 2, 8]} /><meshStandardMaterial color="#9ab9c7" /></mesh><mesh position={[0, 2.03, 0]}><sphereGeometry args={[.16, 12, 8]} /><meshStandardMaterial color="#f2bb63" emissive="#f2bb63" emissiveIntensity={1.4} /></mesh></group>)}
  </>;
}

function CameraRig({ targetId, facilities, controls }: { targetId: string | null; facilities: Facility[]; controls: React.MutableRefObject<any> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 13, 24));
  useFrame((_, delta) => {
    const facility = facilities.find((item) => item.id === targetId);
    const next = facility ? new THREE.Vector3(facility.position[0] + 4.5, 5.7, facility.position[2] + 8) : new THREE.Vector3(0, 13, 24);
    target.current.lerp(next, Math.min(1, delta * 2.2));
    camera.position.lerp(target.current, Math.min(1, delta * 2.2));
    if (controls.current) { const look = facility ? new THREE.Vector3(...facility.position).setY(.7) : new THREE.Vector3(0, 0, 0); controls.current.target.lerp(look, Math.min(1, delta * 2.2)); controls.current.update(); }
  });
  return null;
}

export default function CampusScene({ facilities, selectedId, onSelect }: Props) {
  const controls = useRef<any>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const reset = () => { setFocusTarget(null); controls.current?.reset(); };
  const zoomCamera = (factor: number) => { const object = controls.current?.object as THREE.PerspectiveCamera | undefined; const target = controls.current?.target as THREE.Vector3 | undefined; if (object && target) { object.position.copy(target).add(object.position.clone().sub(target).multiplyScalar(factor)); controls.current.update(); } };
  const focusSelected = () => { if (selectedId) setFocusTarget(selectedId); };
  return <div className="map-surface glass">
    <div className="map-badge"><div className="kicker mb-1">Live spatial twin</div><div className="flex items-center gap-2 text-xs text-slate-200"><span className="signal-dot pulse-dot" /> Campus overview · <span className="text-cyan">orbit ready</span></div></div>
    <div className="map-controls"><button aria-label="Reset campus view" onClick={reset}><RotateCcw size={15} /></button><button aria-label="Zoom out" onClick={() => zoomCamera(1.12)}><Minus size={15} /></button><button aria-label="Zoom in" onClick={() => zoomCamera(.88)}><Plus size={15} /></button><button aria-label="Focus campus" onClick={focusSelected}><Maximize2 size={15} /></button></div>
    <div className="canvas-shell"><Canvas shadows dpr={[1, 1.65]} camera={{ position: [0, 13, 24], fov: 36 }}>
      <color attach="background" args={['#07111f']} /><fog attach="fog" args={['#07111f', 25, 42]} />
      <ambientLight intensity={1.25} color="#b8dbe7" /><directionalLight castShadow position={[-8, 14, 10]} intensity={2.5} color="#fff5dd" shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} /><directionalLight position={[10, 6, -12]} intensity={1.1} color="#5ed3e2" />
      <CampusGround facilities={facilities} selectedId={selectedId} onSelect={(facility) => { setFocusTarget(facility.id); onSelect(facility); }} /><ContactShadows position={[0, .02, 0]} opacity={.42} scale={28} blur={2.4} far={12} />
      <OrbitControls ref={controls} enablePan enableDamping dampingFactor={.08} minDistance={7} maxDistance={27} maxPolarAngle={Math.PI / 2.18} minPolarAngle={Math.PI / 5} />
      <CameraRig targetId={focusTarget} facilities={facilities} controls={controls} />
    </Canvas></div>
    <div className="absolute bottom-4 left-4 z-[2] flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400"><span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Healthy</span><span className="badge badge-amber"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Watch</span><span className="badge badge-red"><span className="h-1.5 w-1.5 rounded-full bg-signal" /> Critical</span><span className="badge badge-blue">Drag · scroll · click</span></div>
  </div>;
}
