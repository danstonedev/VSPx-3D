/**
 * Constraint Validator
 * 
 * Provides functions to validate and enforce anatomical joint constraints
 * on skeletal bones after IK solving or manual manipulation.
 * 
 * REFACTORED: Now uses the single source of truth (joints.ts) instead of legacy jointConstraints.ts.
 */

import * as THREE from 'three';
import { getParentJoint } from '../../../biomech/model/joints';
import { JointDef } from '../../../biomech/model/types';
import { getSegmentByBoneName } from '../../../biomech/model/segments';
import { getNeutralPoseRotation, loadNeutralPose } from './neutralPoseLoader';

export type ConstraintViolation = {
  boneName: string;
  constraint: string;
  violations: string[];
};

export interface RotationLimits {
  x: [number, number];
  y: [number, number];
  z: [number, number];
}

// Legacy T-pose capture (deprecated - use Neutral Position instead)
const constraintReferencePose = new Map<string, THREE.Quaternion>();
let useNeutralPoseReference = false;

/**
 * Helper: Get the JointDef for a given bone name
 */
export function getConstraintForBone(boneName: string): JointDef | undefined {
  const segment = getSegmentByBoneName(boneName);
  if (!segment) return undefined;
  return getParentJoint(segment.id);
}

/**
 * Helper: Check if a bone has a constraint
 */
export function hasConstraint(boneName: string): boolean {
  return !!getConstraintForBone(boneName);
}

/**
 * Helper: Convert JointDef coordinates to RotationLimits format
 */
export function getLimitsFromJointDef(joint: JointDef): RotationLimits {
  // Default to full range
  const limits: RotationLimits = {
    x: [-Math.PI, Math.PI],
    y: [-Math.PI, Math.PI],
    z: [-Math.PI, Math.PI]
  };

  joint.coordinates.forEach(coord => {
    const axis = coord.axis.toLowerCase() as 'x' | 'y' | 'z';
    if (coord.clamped) {
      limits[axis] = [coord.range.min, coord.range.max];
    }
  });

  return limits;
}


/**
 * Initialize constraint system to use Neutral Position as reference
 * This should be called once at app startup
 */
export async function initializeNeutralPoseReference(): Promise<void> {
  try {
    await loadNeutralPose();
    useNeutralPoseReference = true;
    console.log('✅ Constraint system initialized with Neutral Position reference');
  } catch (error) {
    console.warn('⚠️ Could not load Neutral_Model.glb for reference. Will use captured pose from first animation load.');
    // Fall back to legacy capture mode
    useNeutralPoseReference = false;
  }
}

/**
 * @deprecated Use initializeNeutralPoseReference() instead
 * Legacy function for T-pose capture - kept for backward compatibility
 */
export function captureConstraintReferencePose(skeleton: THREE.Skeleton): void {
  console.warn('⚠️ captureConstraintReferencePose() is deprecated. Use initializeNeutralPoseReference() instead.');
  constraintReferencePose.clear();
  for (const bone of skeleton.bones) {
    if (!hasConstraint(bone.name)) continue;
    constraintReferencePose.set(bone.name, bone.quaternion.clone());
  }
}

export function clearConstraintReferencePose(): void {
  constraintReferencePose.clear();
  useNeutralPoseReference = false;
}

function getRestQuaternion(bone: THREE.Bone): THREE.Quaternion {
  // Try Neutral Position reference first
  if (useNeutralPoseReference) {
    const neutralQuat = getNeutralPoseRotation(bone.name);
    if (neutralQuat) {
      return neutralQuat;
    }
    console.warn(`⚠️ No Neutral Position data for ${bone.name}, falling back to captured pose`);
  }

  // Fall back to legacy captured pose
  const cached = constraintReferencePose.get(bone.name);
  if (!cached) {
    // If no reference pose exists, assume current pose is rest pose (fallback)
    // This prevents crashes when initializing UI before capture is complete
    console.warn(`⚠️ No constraint reference pose for ${bone.name}. Using current pose as fallback.`);
    const currentPose = bone.quaternion.clone();
    constraintReferencePose.set(bone.name, currentPose);
    return currentPose;
  }
  return cached;
}

export function resetBoneToRest(bone: THREE.Bone): void {
  const restQuat = getRestQuaternion(bone);
  bone.quaternion.copy(restQuat);
  bone.updateMatrixWorld(true);
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate a single rotation value against limits without modifying the bone
 * 
 * @param euler - The Euler rotation to check
 * @param limits - The rotation limits to validate against
 * @returns Validation result
 */
export function checkRotationLimits(
  euler: THREE.Euler,
  limits: RotationLimits
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (euler.x < limits.x[0] || euler.x > limits.x[1]) {
    violations.push(
      `X-axis: ${euler.x.toFixed(3)} outside [${limits.x[0].toFixed(3)}, ${limits.x[1].toFixed(3)}]`
    );
  }
  if (euler.y < limits.y[0] || euler.y > limits.y[1]) {
    violations.push(
      `Y-axis: ${euler.y.toFixed(3)} outside [${limits.y[0].toFixed(3)}, ${limits.y[1].toFixed(3)}]`
    );
  }
  if (euler.z < limits.z[0] || euler.z > limits.z[1]) {
    violations.push(
      `Z-axis: ${euler.z.toFixed(3)} outside [${limits.z[0].toFixed(3)}, ${limits.z[1].toFixed(3)}]`
    );
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Clamp rotation to limits and return new Euler (non-mutating)
 * 
 * @param euler - The Euler rotation to clamp
 * @param limits - The rotation limits
 * @returns New clamped Euler rotation
 */
export function clampRotation(
  euler: THREE.Euler,
  limits: RotationLimits
): THREE.Euler {
  return new THREE.Euler(
    clamp(euler.x, limits.x[0], limits.x[1]),
    clamp(euler.y, limits.y[0], limits.y[1]),
    clamp(euler.z, limits.z[0], limits.z[1]),
    euler.order
  );
}

/**
 * Create a visual representation of constraint limits for debugging
 * Generates min/max rotation matrices for visualization
 * 
 * @param limits - The rotation limits to visualize
 * @returns Array of euler angles representing the constraint boundary
 */
export function generateConstraintBoundary(
  limits: RotationLimits
): THREE.Euler[] {
  const boundary: THREE.Euler[] = [];

  // Generate sample points along each axis
  const steps = 8;

  // X-axis sweep
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = limits.x[0] + t * (limits.x[1] - limits.x[0]);
    boundary.push(new THREE.Euler(x, 0, 0, 'XYZ'));
  }

  // Y-axis sweep
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = limits.y[0] + t * (limits.y[1] - limits.y[0]);
    boundary.push(new THREE.Euler(0, y, 0, 'XYZ'));
  }

  // Z-axis sweep
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = limits.z[0] + t * (limits.z[1] - limits.z[0]);
    boundary.push(new THREE.Euler(0, 0, z, 'XYZ'));
  }

  return boundary;
}

/**
 * Smooth blend from current rotation to constrained rotation
 * Useful for avoiding jarring constraint enforcement
 * 
 * @param bone - The bone to adjust
 * @param targetRotation - The desired rotation (already validated)
 * @param blendFactor - Blend amount (0-1), where 1 = full snap to target
 */
export function blendToConstrainedRotation(
  bone: THREE.Bone,
  targetRotation: THREE.Euler,
  blendFactor: number = 0.3
): void {
  const currentQuat = bone.quaternion.clone();
  const targetQuat = new THREE.Quaternion().setFromEuler(targetRotation);

  // Spherical linear interpolation for smooth blending
  currentQuat.slerp(targetQuat, blendFactor);

  bone.quaternion.copy(currentQuat);
  bone.updateMatrixWorld(true);
}

/**
 * Get the percentage of how close a rotation is to its limits
 * Useful for visual feedback (e.g., color coding joints approaching limits)
 * 
 * @param euler - Current rotation
 * @param limits - Joint limits
 * @returns Object with percentage for each axis (0-100, where 100 = at limit)
 */
export function getConstraintUtilization(
  euler: THREE.Euler,
  limits: RotationLimits
): { x: number; y: number; z: number; max: number } {
  const xRange = limits.x[1] - limits.x[0];
  const yRange = limits.y[1] - limits.y[0];
  const zRange = limits.z[1] - limits.z[0];

  // Calculate how close to limits (0 = at min, 0.5 = center, 1 = at max)
  const xNorm = (euler.x - limits.x[0]) / xRange;
  const yNorm = (euler.y - limits.y[0]) / yRange;
  const zNorm = (euler.z - limits.z[0]) / zRange;

  // Convert to utilization percentage (distance from center)
  const xUtil = Math.abs(xNorm - 0.5) * 200; // 0-100%
  const yUtil = Math.abs(yNorm - 0.5) * 200;
  const zUtil = Math.abs(zNorm - 0.5) * 200;

  return {
    x: Math.min(100, xUtil),
    y: Math.min(100, yUtil),
    z: Math.min(100, zUtil),
    max: Math.max(xUtil, yUtil, zUtil)
  };
}

/**
 * Reset bone to center of its constraint range (neutral position)
 * 
 * @param bone - The bone to reset
 * @param constraint - Optional constraint (will look up if not provided)
 */
export function resetToNeutral(bone: THREE.Bone, constraint?: JointDef): void {
  if (!constraint) {
    constraint = getConstraintForBone(bone.name);
  }

  if (!constraint) return;

  const limits = getLimitsFromJointDef(constraint);
  const restQuat = getRestQuaternion(bone);

  // Set to middle of each range
  const neutralEuler = new THREE.Euler(
    (limits.x[0] + limits.x[1]) / 2,
    (limits.y[0] + limits.y[1]) / 2,
    (limits.z[0] + limits.z[1]) / 2,
    (constraint.eulerOrder || 'XYZ') as THREE.EulerOrder
  );

  const delta = new THREE.Quaternion().setFromEuler(neutralEuler);
  bone.quaternion.copy(restQuat.clone().multiply(delta));
  bone.updateMatrixWorld(true);
}
