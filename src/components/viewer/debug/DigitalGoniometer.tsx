/**
 * Digital Goniometer Component
 * 
 * Visual measurement tool that displays three transparent circles aligned with X, Y, Z planes
 * when a joint is selected. Each plane shows:
 * - Transparent circle with colored edge (red=X, green=Y, blue=Z)
 * - Moving arm indicating current angle
 * - Digital numeric readout
 * 
 * This mimics a physical goniometer used in biomechanics and physical therapy.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { getBiomechMovementLabel } from '../utils/jointLabels';
import { JOINTS } from '../../../biomech/model/joints';
import { SEGMENTS } from '../../../biomech/model/segments';
import type { BiomechState } from '../../../biomech/engine/biomechState';
import './DigitalGoniometer.css';

interface DigitalGoniometerProps {
  bone: THREE.Bone;
  biomechState?: BiomechState | null;
  size?: number;
  opacity?: number;
  showLabels?: boolean;
}

export function DigitalGoniometer({
  bone,
  biomechState,
  size = 0.3,
  opacity = 0.15,
  showLabels = true
}: DigitalGoniometerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const panelGroupRef = useRef<THREE.Group>(null);
  const xValueRef = useRef<HTMLSpanElement>(null);
  const yValueRef = useRef<HTMLSpanElement>(null);
  const zValueRef = useRef<HTMLSpanElement>(null);
  
  // State for current angles
  const anglesRef = useRef({ x: 0, y: 0, z: 0 });

  // Find the joint definition for this bone - MUST BE FIRST
  const jointDef = useMemo(() => {
    const segment = Object.values(SEGMENTS).find(s => s.boneName === bone.name);
    if (!segment) return null;
    return Object.values(JOINTS).find(j => j.childSegment === segment.id);
  }, [bone.name]);

  // Get movement labels - prefer joint definition if available
  const xLabel = useMemo(() => {
    if (jointDef) {
      const coord = jointDef.coordinates.find(c => c.axis === 'X');
      return coord ? coord.displayName : getBiomechMovementLabel(bone.name, 'x');
    }
    return getBiomechMovementLabel(bone.name, 'x');
  }, [bone.name, jointDef]);

  const yLabel = useMemo(() => {
    if (jointDef) {
      const coord = jointDef.coordinates.find(c => c.axis === 'Y');
      return coord ? coord.displayName : getBiomechMovementLabel(bone.name, 'y');
    }
    return getBiomechMovementLabel(bone.name, 'y');
  }, [bone.name, jointDef]);

  const zLabel = useMemo(() => {
    if (jointDef) {
      const coord = jointDef.coordinates.find(c => c.axis === 'Z');
      return coord ? coord.displayName : getBiomechMovementLabel(bone.name, 'z');
    }
    return getBiomechMovementLabel(bone.name, 'z');
  }, [bone.name, jointDef]);

  // Format bone name for display
  const jointName = useMemo(() => {
    if (jointDef) return jointDef.displayName.toUpperCase();
    
    let name = bone.name;
    name = name.replace('mixamorig1', '');
    name = name.replace(/([A-Z])/g, ' $1').trim();
    return name.toUpperCase();
  }, [bone.name, jointDef]);

  // Determine if this is an upper extremity joint to adjust visual alignment
  // Lower extremity (Legs): Long axis is Y -> Visual Offset 90
  // Upper extremity (Arms): Long axis is X -> Visual Offset 0
  const isUpperExtremity = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    // Exclude elbow from "Upper Extremity" 0-offset group because it aligns with Y-axis (like legs)
    return (id.includes('shoulder') || 
           id.includes('wrist') || 
           id.includes('hand') ||
           id.includes('thumb') ||
           id.includes('index') ||
           id.includes('middle') ||
           id.includes('ring') ||
           id.includes('pinky') ||
           id.includes('gh_') ||
           id.includes('st_')) && !id.includes('elbow');
  }, [jointDef]);

  const isHip = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    return id.includes('hip');
  }, [jointDef]);

  const isRightHip = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    return id.includes('hip') && id.includes('right');
  }, [jointDef]);

  const isAnkle = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    return id.includes('ankle');
  }, [jointDef]);

  const isShoulder = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    return id.includes('shoulder') || id.includes('gh_') || id.includes('st_');
  }, [jointDef]);

  const isElbow = useMemo(() => {
    if (!jointDef) return false;
    const id = jointDef.id.toLowerCase();
    return id.includes('elbow');
  }, [jointDef]);

  // Check for inversion flags to ensure visual arm follows physical bone movement
  // even when the displayed value is inverted for clinical correctness
  const inversions = useMemo(() => ({
    x: jointDef?.coordinates.find(c => c.axis === 'X')?.invert ?? false,
    y: jointDef?.coordinates.find(c => c.axis === 'Y')?.invert ?? false,
    z: jointDef?.coordinates.find(c => c.axis === 'Z')?.invert ?? false,
  }), [jointDef]);

  const visualOffset = isUpperExtremity ? 0 : 90;

  const useAlternateColors = isShoulder || isElbow;

  // Define colors based on joint type to ensure vertical planes (Flex/Abd) are Red/Blue
  const colors = {
    x: useAlternateColors ? 0x0000ff : 0xff0000, // Alt: X=Rot(Blue), Std: X=Flex(Red)
    y: 0x00ff00,                                 // Alt: Y=Plane(Green), Std: Y=Rot(Green)
    z: useAlternateColors ? 0xff0000 : 0x0000ff  // Alt: Z=Flex(Red), Std: Z=Abd(Blue)
  };

  // Create materials for each plane
  const materials = useMemo(() => ({
    x: new THREE.MeshBasicMaterial({
      color: colors.x,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    y: new THREE.MeshBasicMaterial({
      color: colors.y,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    z: new THREE.MeshBasicMaterial({
      color: colors.z,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    })
  }), [opacity, colors]);

  // Create sector materials (more opaque for measured space)
  const sectorMaterials = useMemo(() => ({
    x: new THREE.MeshBasicMaterial({
      color: colors.x,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    y: new THREE.MeshBasicMaterial({
      color: colors.y,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    }),
    z: new THREE.MeshBasicMaterial({
      color: colors.z,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    })
  }), [colors]);

  // Create edge materials (thicker, more visible)
  const edgeMaterials = useMemo(() => ({
    x: new THREE.LineBasicMaterial({
      color: colors.x,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    }),
    y: new THREE.LineBasicMaterial({
      color: colors.y,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    }),
    z: new THREE.LineBasicMaterial({
      color: colors.z,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    })
  }), [colors]);

  // Arm materials (indicator arms)
  const armMaterials = useMemo(() => ({
    x: new THREE.LineBasicMaterial({
      color: colors.x,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      depthTest: false
    }),
    y: new THREE.LineBasicMaterial({
      color: colors.y,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      depthTest: false
    }),
    z: new THREE.LineBasicMaterial({
      color: colors.z,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      depthTest: false
    })
  }), [colors]);

  // Update position and rotation each frame
  useFrame(() => {
    if (!bone) return;

    // Position at joint
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    
    // Update goniometer (planes) - Position AND Rotation
    if (groupRef.current) {
      groupRef.current.position.copy(worldPos);
      
      // ALIGNMENT FIX: Align the goniometer with the PARENT bone (Proximal Segment)
      // This ensures the "0" reference represents the neutral/proximal frame,
      // and the moving arm represents the child bone's deviation.
      if (bone.parent && (bone.parent as THREE.Bone).isBone) {
        const parentQuat = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentQuat);
        groupRef.current.quaternion.copy(parentQuat);

        if (isHip || isAnkle) {
          groupRef.current.rotateZ(Math.PI);
        }
      } else {
        // Fallback for root bone - align with world
        groupRef.current.quaternion.identity();
      }
      
      // Calculate angles
      let x = 0, y = 0, z = 0;

      // Priority 1: Use BiomechState if available and calibrated
      if (biomechState && biomechState.isCalibrated() && jointDef) {
        const jointState = biomechState.getJointState(jointDef.id);
        if (jointState) {
          // Map coordinates to axes
          const xCoord = jointDef.coordinates.find(c => c.axis === 'X');
          const yCoord = jointDef.coordinates.find(c => c.axis === 'Y');
          const zCoord = jointDef.coordinates.find(c => c.axis === 'Z');

          if (xCoord) x = THREE.MathUtils.radToDeg(jointState.coordinates[xCoord.id]?.value ?? 0);
          if (yCoord) y = THREE.MathUtils.radToDeg(jointState.coordinates[yCoord.id]?.value ?? 0);
          if (zCoord) z = THREE.MathUtils.radToDeg(jointState.coordinates[zCoord.id]?.value ?? 0);
        }
      } else {
        // No valid biomech state - show 0 to indicate "no data" rather than misleading Euler angles
        x = 0;
        y = 0;
        z = 0;
      }

      anglesRef.current = { x, y, z };

      // Update DOM elements directly for performance
      if (xValueRef.current) xValueRef.current.innerText = `${x.toFixed(1)}°`;
      if (yValueRef.current) yValueRef.current.innerText = `${y.toFixed(1)}°`;
      if (zValueRef.current) zValueRef.current.innerText = `${z.toFixed(1)}°`;
    }

    // Update panel - Position ONLY (Rotation fixed to identity)
    if (panelGroupRef.current) {
      // Lock to global center and fixed height (approx 2.2m to clear head + 0.25m)
      // This prevents the panel from bouncing around with the joint
      panelGroupRef.current.position.set(0, 2.2, 0);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* X-Plane (YZ plane - red) */}
        <GoniometerPlane
          size={size}
          material={materials.x}
          sectorMaterial={sectorMaterials.x}
          edgeMaterial={edgeMaterials.x}
          armMaterial={armMaterials.x}
          rotation={isAnkle ? [0, Math.PI / 2, Math.PI / 2] : [0, Math.PI / 2, 0]}
          getAngle={() => inversions.x ? -anglesRef.current.x : anglesRef.current.x}
          visualOffset={visualOffset} // Dynamic offset based on limb type
          scale={isAnkle ? [-1, 1, 1] : isShoulder ? [1, -1, 1] : [1, 1, 1]}
        />

        {/* Y-Plane (XZ plane - green) */}
        <GoniometerPlane
          size={size}
          material={materials.y}
          sectorMaterial={sectorMaterials.y}
          edgeMaterial={edgeMaterials.y}
          armMaterial={armMaterials.y}
          rotation={isShoulder ? [Math.PI / 2, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
          getAngle={() => inversions.y ? -anglesRef.current.y : anglesRef.current.y}
          visualOffset={visualOffset} // Dynamic offset based on limb type
          scale={isHip ? [-1, 1, 1] : isShoulder ? [1, -1, 1] : [1, 1, 1]}
        />

        {/* Z-Plane (XY plane - blue) */}
        <GoniometerPlane
          size={size}
          material={materials.z}
          sectorMaterial={sectorMaterials.z}
          edgeMaterial={edgeMaterials.z}
          armMaterial={armMaterials.z}
          rotation={isAnkle ? [0, 0, Math.PI] : [0, 0, 0]}
          getAngle={() => inversions.z ? -anglesRef.current.z : anglesRef.current.z}
          visualOffset={visualOffset} // Dynamic offset based on limb type
          scale={(isRightHip || isAnkle) ? [-1, 1, 1] : [1, 1, 1]}
        />
      </group>

      {/* Unified Data Panel - Separate group to avoid rotation */}
      <group ref={panelGroupRef}>
        {showLabels && (
          <Html
            position={[0, 0, 0]} // Centered on the fixed global position
            center
            distanceFactor={4}
            className="goniometer-panel-container"
          >
            <div className="goniometer-panel">
              <div className="goniometer-header">{jointName}</div>
              {[
                { axis: 'x', label: xLabel, ref: xValueRef, color: colors.x },
                { axis: 'y', label: yLabel, ref: yValueRef, color: colors.y },
                { axis: 'z', label: zLabel, ref: zValueRef, color: colors.z }
              ]
              .sort((a, b) => b.color - a.color) // Sort by color value (Red > Green > Blue) to keep consistent visual order
              .map((row) => (
                <div key={row.axis} className={`goniometer-row row-${row.axis}`}>
                  <span 
                    className="goniometer-label-text" 
                    style={{ color: '#' + row.color.toString(16).padStart(6, '0') }}
                  >
                    {row.label}:
                  </span>
                  <span 
                    ref={row.ref} 
                    className="goniometer-value-text"
                    style={{ color: '#' + row.color.toString(16).padStart(6, '0') }}
                  >
                    0.0°
                  </span>
                </div>
              ))}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

interface GoniometerPlaneProps {
  size: number;
  material: THREE.Material;
  sectorMaterial: THREE.Material;
  edgeMaterial: THREE.LineBasicMaterial;
  armMaterial: THREE.LineBasicMaterial;
  rotation: [number, number, number];
  getAngle: () => number;
  visualOffset?: number; // Offset in degrees to align "0" with bone axis
  scale?: [number, number, number];
}

function GoniometerPlane({
  size,
  material,
  sectorMaterial,
  edgeMaterial,
  armMaterial,
  rotation,
  getAngle,
  visualOffset = 0,
  scale = [1, 1, 1]
}: GoniometerPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const armLineRef = useRef<THREE.Line>(null);
  const angleRef = useRef(0);

  // Create circle geometry
  const circleGeometry = useMemo(() => {
    return new THREE.CircleGeometry(size, 64);
  }, [size]);

  // Create dynamic sector geometry
  const sectorGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const segments = 64;
    const vertices = new Float32Array((segments + 2) * 3);
    const indices = [];
    
    // Center point is always 0,0,0
    vertices[0] = 0; vertices[1] = 0; vertices[2] = 0;

    // Generate indices for triangle fan
    for (let i = 1; i <= segments; i++) {
      indices.push(0, i, i + 1);
    }
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  // Create edge line
  const edgeLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * size,
        Math.sin(theta) * size,
        0
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, edgeMaterial);
  }, [size, edgeMaterial]);

  // Create moving arm line
  const armLine = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, armMaterial);
  }, [size, armMaterial]);

  // Create reference arm (at 0 degrees)
  const referenceArm = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const mat = armMaterial.clone();
    mat.opacity = 0.3;
    return new THREE.Line(geometry, mat);
  }, [size, armMaterial]);

  // Update arm rotation based on angle
  useFrame(() => {
    if (!armLineRef.current) return;
    
    const angle = getAngle();
    angleRef.current = angle;
    
    // Rotate the arm to show the current angle
    // Apply visual offset to align with bone axis
    const offsetRad = THREE.MathUtils.degToRad(visualOffset);
    const angleRad = THREE.MathUtils.degToRad(angle);
    armLineRef.current.rotation.z = offsetRad + angleRad;

    // Update sector geometry
    const positionAttribute = sectorGeometry.attributes.position as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const segments = 64;
    
    // Sector spans from visualOffset to visualOffset + angle
    // We need to handle the direction of the angle
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const currentTheta = offsetRad + (angleRad * t);
      
      const x = Math.cos(currentTheta) * size;
      const y = Math.sin(currentTheta) * size;
      
      const idx = (i + 1) * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = 0;
    }
    
    positionAttribute.needsUpdate = true;
    // Update draw range to avoid drawing full circle if angle is 0?
    // Actually triangle fan handles 0 area triangles fine (they just don't render)
  });

  return (
    <group ref={groupRef} rotation={rotation} scale={scale}>
      {/* Transparent circle */}
      <mesh geometry={circleGeometry} material={material} renderOrder={1000} />
      
      {/* Measured Sector (More Opaque) */}
      <mesh geometry={sectorGeometry} material={sectorMaterial} renderOrder={1001} />

      {/* Colored edge */}
      <primitive object={edgeLine} renderOrder={1002} />
      
      {/* Reference arm at 0 deg (with offset) */}
      <primitive 
        object={referenceArm} 
        rotation={[0, 0, THREE.MathUtils.degToRad(visualOffset)]} 
        renderOrder={1003} 
      />
      
      {/* Moving arm indicator */}
      <primitive ref={armLineRef} object={armLine} renderOrder={1004} />
    </group>
  );
}
