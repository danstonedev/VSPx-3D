/**
 * Constraint Validator
 * 
 * Provides functions to validate and enforce anatomical joint constraints
 * on skeletal bones after IK solving or manual manipulation.
 */

import * as THREE from 'three';
import { getConstraintForBone, RotationLimits, JointConstraint, hasConstraint } from './jointConstraints';
import { relativeToAnatomical } from './angleConversion';
import { getNeutralPoseRotation, loadNeutralPose } from './neutralPoseLoader';

export type ConstraintViolation = {
  boneName: string;
  constraint: string;
  violations: string[];
};

// Legacy T-pose capture (deprecated - use Neutral Position instead)
const constraintReferencePose = new Map<string, THREE.Quaternion>();
let useNeutralPoseReference = false;

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
    console.warn('⚠️ Could not load Neutral.glb for reference. Will use captured pose from first animation load.');
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
    throw new Error(`❌ No constraint reference pose for ${bone.name}. Call initializeNeutralPoseReference() or captureConstraintReferencePose() first!`);
  }
  return cached;
}

export function getRelativeEuler(bone: THREE.Bone): THREE.Euler {
  const restQuat = getRestQuaternion(bone);
  const restInverse = restQuat.clone().invert();
  // Calculate relative rotation: restInverse * current
  // Relative rotation represents movement FROM Neutral Position (anatomical zero)
  // When bone is in Neutral Position: restInverse * neutral = identity = (0,0,0)
  // IMPORTANT: multiplyQuaternions creates new result, multiply() modifies in-place
  const relativeQuat = new THREE.Quaternion().multiplyQuaternions(restInverse, bone.quaternion);
  return new THREE.Euler().setFromQuaternion(relativeQuat, 'XYZ');
}

/**
 * Get anatomical angles (relative to true anatomical neutral)
 * 
 * Uses the angleConversion module for clear, testable coordinate transformation.
 * Now references Neutral Position (Neutral.glb) as the anatomical zero point.
 * 
 * @param bone - The bone to measure
 * @returns Euler angles in anatomical reference frame (in radians)
 */
export function getAnatomicalEuler(bone: THREE.Bone): THREE.Euler {
  const relativeEuler = getRelativeEuler(bone);
  const constraint = getConstraintForBone(bone.name);
  
  // Check for new tPoseOffset field first, fall back to deprecated anatomicalNeutral
  const tPoseOffset = constraint?.tPoseOffset || constraint?.anatomicalNeutral;
  
  if (!constraint || !tPoseOffset) {
    // No T-pose offset defined = Neutral Position IS anatomical neutral
    // Return relative angles directly as anatomical angles
    return relativeEuler;
  }
  
  // Use angleConversion module for clear transformation
  return relativeToAnatomical(relativeEuler, tPoseOffset);
}

export function setRelativeEuler(
  bone: THREE.Bone,
  euler: THREE.Euler
): void {
  const restQuat = getRestQuaternion(bone);
  const constrainedQuat = new THREE.Quaternion().setFromEuler(euler);
  bone.quaternion.copy(restQuat.clone().multiply(constrainedQuat));
  bone.updateMatrixWorld(true);
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
 * Validate and clamp a bone's rotation to its defined constraints
 * 
 * @param bone - The THREE.Bone to validate
 * @param constraint - The joint constraint to apply (optional, will look up if not provided)
 * @returns Object with validation result and whether changes were made
 */
export function validateRotation(
  bone: THREE.Bone,
  constraint?: JointConstraint,
  debug: boolean = false
): { valid: boolean; clamped: boolean; violations: string[] } {
  // Look up constraint if not provided
  if (!constraint) {
    constraint = getConstraintForBone(bone.name);
  }
  
  // No constraint defined for this bone - allow any rotation
  if (!constraint || !constraint.enabled) {
    return { valid: true, clamped: false, violations: [] };
  }
  
  const limits = constraint.rotationLimits;
  const violations: string[] = [];
  let clamped = false;
  
  const restQuat = getRestQuaternion(bone);
  const euler = getRelativeEuler(bone);
  
  // Store original values
  const originalX = euler.x;
  const originalY = euler.y;
  const originalZ = euler.z;
  
  if (debug) {
    console.log(`[validateRotation] ${bone.name}:`,
      `X=${(originalX * 180 / Math.PI).toFixed(1)}° [${(limits.x[0] * 180 / Math.PI).toFixed(0)}° to ${(limits.x[1] * 180 / Math.PI).toFixed(0)}°]`,
      `Y=${(originalY * 180 / Math.PI).toFixed(1)}° [${(limits.y[0] * 180 / Math.PI).toFixed(0)}° to ${(limits.y[1] * 180 / Math.PI).toFixed(0)}°]`,
      `Z=${(originalZ * 180 / Math.PI).toFixed(1)}° [${(limits.z[0] * 180 / Math.PI).toFixed(0)}° to ${(limits.z[1] * 180 / Math.PI).toFixed(0)}°]`
    );
  }
  
  // Clamp each axis
  euler.x = clamp(euler.x, limits.x[0], limits.x[1]);
  euler.y = clamp(euler.y, limits.y[0], limits.y[1]);
  euler.z = clamp(euler.z, limits.z[0], limits.z[1]);
  
  // Check if any clamping occurred
  if (euler.x !== originalX) {
    violations.push(`X: ${originalX.toFixed(3)} → ${euler.x.toFixed(3)}`);
    clamped = true;
  }
  if (euler.y !== originalY) {
    violations.push(`Y: ${originalY.toFixed(3)} → ${euler.y.toFixed(3)}`);
    clamped = true;
  }
  if (euler.z !== originalZ) {
    violations.push(`Z: ${originalZ.toFixed(3)} → ${euler.z.toFixed(3)}`);
    clamped = true;
  }
  
  if (clamped) {
    const constrainedQuat = new THREE.Quaternion().setFromEuler(euler);
    bone.quaternion.copy(restQuat.clone().multiply(constrainedQuat));
    bone.updateMatrixWorld(true);
  }
  
  return {
    valid: !clamped,
    clamped,
    violations
  };
}

/**
 * Apply constraints to an entire skeleton
 * 
 * @param skeleton - The THREE.Skeleton to validate
 * @param onlyEnabled - If true, only validate bones with enabled constraints
 * @returns Summary of violations found
 */
export function applyConstraints(
  skeleton: THREE.Skeleton,
  onlyEnabled: boolean = true
): {
  totalBones: number;
  constrainedBones: number;
  violationsFound: number;
  violations: ConstraintViolation[];
} {
  const violations: ConstraintViolation[] = [];
  let constrainedBones = 0;
  let violationsFound = 0;
  
  for (const bone of skeleton.bones) {
    const constraint = getConstraintForBone(bone.name);
    
    if (!constraint) continue;
    if (onlyEnabled && !constraint.enabled) continue;
    
    constrainedBones++;
    
    const result = validateRotation(bone, constraint);
    
    if (!result.valid) {
      violationsFound++;
      violations.push({
        boneName: bone.name,
        constraint: constraint.displayName,
        violations: result.violations
      });
    }
  }
  
  return {
    totalBones: skeleton.bones.length,
    constrainedBones,
    violationsFound,
    violations
  };
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
 * Batch validate multiple bones (for performance)
 * Useful when checking an entire IK chain
 * 
 * @param bones - Array of bones to validate
 * @param stopOnFirstViolation - If true, stops at first constraint violation
 * @returns Summary of validation
 */
export function validateBones(
  bones: THREE.Bone[],
  stopOnFirstViolation: boolean = false
): {
  allValid: boolean;
  validatedCount: number;
  violations: Array<{ boneName: string; violations: string[] }>;
} {
  const violations: Array<{ boneName: string; violations: string[] }> = [];
  let validatedCount = 0;
  
  for (const bone of bones) {
    const result = validateRotation(bone);
    validatedCount++;
    
    if (!result.valid) {
      violations.push({
        boneName: bone.name,
        violations: result.violations
      });
      
      if (stopOnFirstViolation) {
        break;
      }
    }
  }
  
  return {
    allValid: violations.length === 0,
    validatedCount,
    violations
  };
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
export function resetToNeutral(bone: THREE.Bone, constraint?: JointConstraint): void {
  if (!constraint) {
    constraint = getConstraintForBone(bone.name);
  }
  
  if (!constraint) return;
  
  const limits = constraint.rotationLimits;
  const restQuat = getRestQuaternion(bone);
  
  // Set to middle of each range
  const neutralEuler = new THREE.Euler(
    (limits.x[0] + limits.x[1]) / 2,
    (limits.y[0] + limits.y[1]) / 2,
    (limits.z[0] + limits.z[1]) / 2,
    'XYZ'
  );
  
  const delta = new THREE.Quaternion().setFromEuler(neutralEuler);
  bone.quaternion.copy(restQuat.clone().multiply(delta));
  bone.updateMatrixWorld(true);
}
