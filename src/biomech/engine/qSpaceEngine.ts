/**
 * Q-Space Coordinate Engine
 * 
 * Core mathematical engine for joint kinematics using generalized coordinates (q-space).
 * Implements OpenSim/Simbody-compatible math for:
 * - Relative quaternion calculation (child in parent frame)
 * - Neutral pose calibration
 * - Deviation calculation (q_Δ = q_neutral⁻¹ * q_rel)
 * - Coordinate extraction/conversion (quaternion ↔ Euler X-Y-Z)
 * 
 * Mathematical Foundation:
 * All 3-DOF joints use body-fixed X-Y-Z Euler sequence:
 *   R = R_X(q₀) * R_Y(q₁) * R_Z(q₂)
 * 
 * This matches OpenSim's BallJoint mobilizer.
 */

import * as THREE from 'three';
import { JointDef, JointState, CoordinateState } from '../model/types';
import { SegmentRegistry } from './segmentRegistry';

/**
 * Compute relative quaternion between parent and child segments
 * q_rel = q_parent⁻¹ * q_child
 * 
 * This gives child's orientation in parent's local frame.
 */
export function computeRelativeQuaternion(
  parentSegmentId: string,
  childSegmentId: string,
  registry: SegmentRegistry
): THREE.Quaternion | null {
  const q_parent = registry.getWorldQuaternion(parentSegmentId);
  const q_child = registry.getWorldQuaternion(childSegmentId);

  if (!q_parent || !q_child) {
    return null;
  }

  // q_rel = q_parent^-1 * q_child
  const q_rel = new THREE.Quaternion();
  q_rel.copy(q_parent).invert().multiply(q_child);

  return q_rel;
}

/**
 * Calibrate neutral pose for a joint
 * Stores the relative orientation at calibration as the neutral reference.
 * 
 * @returns Neutral quaternion (q_neutral = q_parent⁻¹ * q_child at calibration)
 */
export function calibrateNeutralPose(
  joint: JointDef,
  registry: SegmentRegistry
): THREE.Quaternion | null {
  const q_rel = computeRelativeQuaternion(
    joint.parentSegment,
    joint.childSegment,
    registry
  );

  if (!q_rel) {
    console.error(`❌ Cannot calibrate ${joint.id}: segments not found`);
    return null;
  }

  console.log(`✅ Calibrated neutral pose for ${joint.displayName}`);
  return q_rel.clone();
}

/**
 * Compute deviation quaternion
 * q_Δ = q_neutral⁻¹ * q_rel
 * 
 * This gives the rotation FROM neutral TO current pose.
 */
export function computeDeviationQuaternion(
  q_neutral: THREE.Quaternion,
  q_rel: THREE.Quaternion
): THREE.Quaternion {
  const q_delta = new THREE.Quaternion();
  // q_Δ = q_neutral^-1 * q_rel
  q_delta.copy(q_neutral).invert().multiply(q_rel);
  return q_delta;
}

/**
 * Convert deviation quaternion to coordinates (q₀, q₁, q₂)
 * Uses body-fixed X-Y-Z Euler sequence.
 * 
 * @param q_delta - Deviation quaternion
 * @param eulerOrder - Should be 'XYZ' for standard ball joints
 * @returns [q₀, q₁, q₂] in radians
 */
export function quatToCoordinates(
  q_delta: THREE.Quaternion,
  eulerOrder: THREE.EulerOrder = 'XYZ'
): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(q_delta, eulerOrder);
  return [euler.x, euler.y, euler.z];
}

/**
 * Convert coordinates (q₀, q₁, q₂) to quaternion
 * Uses body-fixed X-Y-Z Euler sequence.
 * 
 * @param q0 - First rotation (X axis) in radians
 * @param q1 - Second rotation (Y axis) in radians
 * @param q2 - Third rotation (Z axis) in radians
 * @param eulerOrder - Should be 'XYZ' for standard ball joints
 * @returns Quaternion
 */
export function coordinatesToQuat(
  q0: number,
  q1: number,
  q2: number,
  eulerOrder: THREE.EulerOrder = 'XYZ'
): THREE.Quaternion {
  const euler = new THREE.Euler(q0, q1, q2, eulerOrder);
  return new THREE.Quaternion().setFromEuler(euler);
}

/**
 * Compute full joint state (q_rel, q_neutral, q_delta, coordinates)
 * 
 * @param joint - Joint definition
 * @param registry - Segment registry
 * @param q_neutral - Neutral pose quaternion (from calibration)
 * @returns Complete joint state
 */
export function computeJointState(
  joint: JointDef,
  registry: SegmentRegistry,
  q_neutral: THREE.Quaternion
): JointState | null {
  // Compute current relative orientation
  const q_rel = computeRelativeQuaternion(
    joint.parentSegment,
    joint.childSegment,
    registry
  );

  if (!q_rel) {
    return null;
  }

  // Compute deviation from neutral
  const q_delta = computeDeviationQuaternion(q_neutral, q_rel);

  // Extract coordinates
  const [q0, q1, q2] = quatToCoordinates(q_delta, joint.eulerOrder);

  // Build coordinate states
  const coordinates: Record<string, CoordinateState> = {};
  
  joint.coordinates.forEach((coordDef) => {
    // Use coordDef.index to map to the correct Euler component (X=0, Y=1, Z=2)
    // Do NOT use the loop index, as coordinates array order may not match Euler axis order
    let value = coordDef.index === 0 ? q0 : coordDef.index === 1 ? q1 : q2;
    
    // Apply inversion if needed (e.g. for mirrored joints where axis direction is opposite to desired sign)
    if (coordDef.invert) {
      value = -value;
    }
    
    // Apply ROM clamping if enabled
    let clampedValue = value;
    let wasClamped = false;
    
    if (coordDef.clamped) {
      if (value < coordDef.range.min) {
        clampedValue = coordDef.range.min;
        wasClamped = true;
      } else if (value > coordDef.range.max) {
        clampedValue = coordDef.range.max;
        wasClamped = true;
      }
    }

    coordinates[coordDef.id] = {
      value: clampedValue,
      locked: coordDef.locked,
      clamped: wasClamped,
      timestamp: performance.now(),
    };
  });

  return {
    jointId: joint.id,
    coordinates,
    q_rel,
    q_neutral,
    q_delta,
  };
}

/**
 * Apply coordinates back to skeleton
 * Converts coordinate values to quaternion and applies to child bone.
 * 
 * @param joint - Joint definition
 * @param coordinates - Coordinate values [q0, q1, q2]
 * @param q_neutral - Neutral pose quaternion
 * @param registry - Segment registry
 */
export function applyCoordinatesToSkeleton(
  joint: JointDef,
  coordinates: [number, number, number],
  q_neutral: THREE.Quaternion,
  registry: SegmentRegistry
): boolean {
  let [q0, q1, q2] = coordinates;

  // Apply inversion if needed
  joint.coordinates.forEach(coord => {
    if (coord.invert) {
      if (coord.index === 0) q0 = -q0;
      if (coord.index === 1) q1 = -q1;
      if (coord.index === 2) q2 = -q2;
    }
  });

  // Convert coordinates to deviation quaternion
  const q_delta = coordinatesToQuat(q0, q1, q2, joint.eulerOrder);

  // Compute new relative quaternion: q_rel = q_neutral * q_delta
  const q_rel = new THREE.Quaternion().multiplyQuaternions(q_neutral, q_delta);

  // Get parent and child bones
  const parentBone = registry.getBone(joint.parentSegment);
  const childBone = registry.getBone(joint.childSegment);

  if (!parentBone || !childBone) {
    console.error(`❌ Cannot apply coordinates for ${joint.id}: bones not found`);
    return false;
  }

  // Get parent's world quaternion
  const q_parent_world = new THREE.Quaternion();
  parentBone.getWorldQuaternion(q_parent_world);

  // Compute child's new world quaternion: q_child = q_parent * q_rel
  const q_child_world = new THREE.Quaternion().multiplyQuaternions(q_parent_world, q_rel);

  // Convert to child's local quaternion
  // Note: This assumes child's parent in the scene graph is the joint parent
  // If there are intermediate transforms, this needs adjustment
  const parentWorldInv = q_parent_world.clone().invert();
  const q_child_local = new THREE.Quaternion().multiplyQuaternions(parentWorldInv, q_child_world);

  // Apply to child bone
  childBone.quaternion.copy(q_child_local);
  childBone.updateMatrixWorld(true);

  return true;
}

/**
 * Clamp coordinate value to range
 */
export function clampCoordinate(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if coordinate is within valid range
 */
export function isCoordinateValid(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Interpolate between two coordinate values (for smooth transitions)
 */
export function lerpCoordinate(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Convert radians to degrees (for display)
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}
