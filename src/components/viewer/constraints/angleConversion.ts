/**
 * Angle Conversion System
 * 
 * Provides clear, testable conversion between different angle reference frames.
 * 
 * REFERENCE FRAMES:
 * 1. Neutral Position Space: Anatomical reference pose from Neutral_Model.glb (arms at sides, legs vertical)
 * 2. Relative Space: Rotation FROM Neutral Position (0° = at Neutral Position)
 * 3. Anatomical Space: Clinical reference (same as Neutral Position - 0° = anatomical neutral)
 * 
 * TERMINOLOGY:
 * - neutralOffset: For legacy bones that may have offsets from true anatomical neutral
 *   (This replaces the old tPoseOffset concept)
 * 
 * - relativeAngle: Current rotation FROM Neutral Position
 *   Example: Shoulder abduction = +90° means raised 90° from neutral (arms at sides)
 * 
 * - anatomicalAngle: Angle in clinical reference frame
 *   Example: Arms at sides = 0°, arms raised = 90°, arms overhead = 180°
 * 
 * NOTE: With Neutral Position as reference, relativeAngle === anatomicalAngle for most joints.
 */

import * as THREE from 'three';

/**
 * Represents the T-pose offset from anatomical neutral for each axis.
 * 
 * Positive means T-pose is in positive direction from anatomical neutral.
 * Example: tPoseOffset.x = 57° means T-pose has 57° abduction
 */
export interface TPoseOffset {
  x?: number; // Radians
  y?: number; // Radians
  z?: number; // Radians
}

/**
 * Convert relative euler (from T-pose) to anatomical euler (clinical reference).
 * 
 * Formula: anatomical = tPoseOffset + relative
 * 
 * Example (Shoulder X-axis):
 * - tPoseOffset = 57° (T-pose is abducted)
 * - At T-pose: relative = 0°, anatomical = 57° + 0° = 57° ✓
 * - Arms at sides: relative = -57°, anatomical = 57° + (-57°) = 0° ✓
 * - Arms overhead: relative = +60°, anatomical = 57° + 60° = 117° ✓
 * 
 * @param relativeEuler - Rotation FROM T-pose (T-pose = 0°)
 * @param tPoseOffset - Where T-pose sits in anatomical space
 * @returns Anatomical euler angles (clinical reference frame)
 */
export function relativeToAnatomical(
  relativeEuler: THREE.Euler,
  tPoseOffset: TPoseOffset
): THREE.Euler {
  return new THREE.Euler(
    relativeEuler.x + (tPoseOffset.x ?? 0),
    relativeEuler.y + (tPoseOffset.y ?? 0),
    relativeEuler.z + (tPoseOffset.z ?? 0),
    relativeEuler.order
  );
}

/**
 * Convert anatomical euler to relative euler (for setting joint angles).
 * 
 * Formula: relative = anatomical - tPoseOffset
 * 
 * Example (Shoulder X-axis):
 * - tPoseOffset = 57°
 * - Want anatomical = 0° (sides): relative = 0° - 57° = -57° ✓
 * - Want anatomical = 90° (raised): relative = 90° - 57° = 33° ✓
 * 
 * @param anatomicalEuler - Desired angle in clinical reference
 * @param tPoseOffset - Where T-pose sits in anatomical space
 * @returns Relative euler (rotation from T-pose)
 */
export function anatomicalToRelative(
  anatomicalEuler: THREE.Euler,
  tPoseOffset: TPoseOffset
): THREE.Euler {
  return new THREE.Euler(
    anatomicalEuler.x - (tPoseOffset.x ?? 0),
    anatomicalEuler.y - (tPoseOffset.y ?? 0),
    anatomicalEuler.z - (tPoseOffset.z ?? 0),
    anatomicalEuler.order
  );
}

/**
 * Convert T-pose relative limits to anatomical limits.
 * 
 * Formula: anatomicalLimit = tPoseOffset + relativeLimit
 * 
 * Example (Shoulder X-axis):
 * - tPoseOffset = 57°
 * - T-pose limits: [-30°, 180°] (relative to T-pose)
 * - Anatomical limits: [57° + (-30°), 57° + 180°] = [27°, 237°]
 * 
 * But this might exceed anatomical ROM! The limits should be ANATOMICAL limits.
 * This function is for visualization/scale display only.
 * 
 * @param relativeLimits - Min/max in T-pose relative space
 * @param tPoseOffset - Where T-pose sits in anatomical space
 * @returns Min/max in anatomical space
 */
export function convertLimitsToAnatomical(
  relativeLimits: [number, number],
  tPoseOffset: number
): [number, number] {
  return [
    relativeLimits[0] + tPoseOffset,
    relativeLimits[1] + tPoseOffset
  ];
}

/**
 * Validate that conversion round-trips correctly (for testing).
 * 
 * @param anatomical - Starting anatomical angle
 * @param tPoseOffset - T-pose offset
 * @returns True if anatomical → relative → anatomical gives same result
 */
export function validateRoundTrip(
  anatomical: number,
  tPoseOffset: number,
  tolerance: number = 0.0001
): boolean {
  const relative = anatomical - tPoseOffset;
  const backToAnatomical = tPoseOffset + relative;
  return Math.abs(backToAnatomical - anatomical) < tolerance;
}

/**
 * Helper to convert degrees to radians for readability.
 */
export const deg = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Helper to convert radians to degrees for debugging.
 */
export const rad = (radians: number): number => (radians * 180) / Math.PI;
