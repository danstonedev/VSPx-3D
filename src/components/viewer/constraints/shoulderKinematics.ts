/**
 * Shoulder Kinematics - Plane of Elevation Analysis
 * 
 * Implements clinically accurate shoulder motion decomposition:
 * 1. Elevation Angle - How high the arm is raised (0-180°)
 * 2. Plane of Elevation - Which plane the motion occurs in (frontal to sagittal)
 * 3. Axial Rotation - Internal/external rotation of the humerus
 * 
 * References:
 * - ISB recommendations for shoulder motion (Wu et al., 2005)
 * - Clinical assessment of shoulder function (Magermans et al., 2005)
 */

import * as THREE from 'three';

/**
 * Shoulder motion decomposition result
 */
export interface ShoulderKinematics {
  elevation: number;          // Total elevation angle (0-180°) in radians
  planeOfElevation: number;   // Plane angle: 0° = frontal (pure ABD), 90° = sagittal (pure FLEX)
  axialRotation: number;      // Internal(-)/external(+) rotation in radians
  
  // Derived values for display
  abduction: number;          // Component in frontal plane
  flexion: number;            // Component in sagittal plane
}

/**
 * Decompose shoulder rotation into elevation, plane, and axial rotation.
 * 
 * @deprecated Use shoulderMapping.ghToClinical() + stToClinical() from Phase 2 instead.
 * This legacy function analyzes the humerus bone only and does NOT account for 
 * scapulothoracic (ST) joint separation. The new system correctly separates:
 * - ST joint (thorax → scapula): tilt, rotation, upward rotation
 * - GH joint (scapula → humerus): elevation, plane, rotation
 * See docs/LEGACY_CODE_CLEANUP.md and docs/SHOULDER_BIOMECHANICS.md
 * 
 * This method projects the humerus vector onto the horizontal plane to determine
 * the plane of elevation, then calculates the elevation angle from vertical.
 * 
 * @param armBone - The humerus bone (mixamorig1RightArm or mixamorig1LeftArm)
 * @param isRightSide - True for right arm, false for left
 * @returns Shoulder kinematics decomposition
 */
export function analyzeShoulderKinematics( // @deprecated LEGACY
  armBone: THREE.Bone,
  isRightSide: boolean = true
): ShoulderKinematics {
  // Get the humerus direction vector in world space
  // CRITICAL: We need the direction the bone is pointing, not a transformed point
  const humerusDir = new THREE.Vector3(1, 0, 0); // Local X-axis points down the humerus
  humerusDir.applyQuaternion(armBone.getWorldQuaternion(new THREE.Quaternion()));
  humerusDir.normalize();
  
  // For left side, mirror the X component
  if (!isRightSide) {
    humerusDir.x *= -1;
  }
  
  // Project onto horizontal plane (XZ) to find plane of elevation
  const horizontalProjection = new THREE.Vector3(humerusDir.x, 0, humerusDir.z).normalize();
  
  // Calculate plane of elevation (angle in XZ plane)
  // 0° = pure frontal (X-axis, abduction)
  // 90° = pure sagittal (Z-axis, flexion)
  let planeOfElevation = Math.atan2(horizontalProjection.z, horizontalProjection.x);
  
  // Normalize to 0-180° range
  if (planeOfElevation < 0) planeOfElevation += Math.PI * 2;
  
  // Calculate elevation angle (angle from down/vertical to current position)
  // At rest (arm at side): elevation ≈ 0°
  // Arm horizontal: elevation = 90°
  // Arm overhead: elevation = 180°
  const elevation = Math.asin(humerusDir.y) + Math.PI / 2; // Add 90° because Y=0 is horizontal, Y=-1 is down
  
  // Calculate abduction and flexion components
  const abduction = elevation * Math.cos(planeOfElevation);
  const flexion = elevation * Math.sin(planeOfElevation);
  
  // Axial rotation (simplified - would need more complex calculation for accuracy)
  // For now, extract from the bone's rotation matrix
  const rotMatrix = new THREE.Matrix4();
  armBone.updateMatrixWorld(true);
  rotMatrix.extractRotation(armBone.matrixWorld);
  
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, 'YXZ');
  const axialRotation = euler.y; // Y-axis rotation in world space = axial rotation
  
  return {
    elevation,
    planeOfElevation,
    axialRotation,
    abduction,
    flexion
  };
}

/**
 * Calculate scapulohumeral rhythm contribution.
 * Standard 2:1 ratio means for every 3° of total elevation:
 * - 2° comes from glenohumeral joint
 * - 1° comes from scapulothoracic joint
 * 
 * @param totalElevation - Total shoulder elevation angle (GH + ST combined)
 * @returns Object with glenohumeral and scapulothoracic contributions
 */
export function calculateScapulohumeralRhythm(totalElevation: number): {
  glenohumeral: number;
  scapulothoracic: number;
} {
  const totalDeg = totalElevation * 180 / Math.PI;
  
  // First 30° is pure glenohumeral
  if (totalDeg <= 30) {
    return {
      glenohumeral: totalElevation,
      scapulothoracic: 0
    };
  }
  
  // Above 30°: 2:1 ratio (2° GH per 1° ST)
  const elevationAbove30 = totalElevation - (30 * Math.PI / 180);
  const ghAbove30 = (elevationAbove30 * 2) / 3;
  const stAbove30 = elevationAbove30 / 3;
  
  return {
    glenohumeral: (30 * Math.PI / 180) + ghAbove30,
    scapulothoracic: stAbove30
  };
}

/**
 * Format shoulder kinematics for display
 */
export function formatShoulderKinematics(kinematics: ShoulderKinematics): {
  elevation: string;
  plane: string;
  abduction: string;
  flexion: string;
  rotation: string;
} {
  const radToDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(1);
  
  return {
    elevation: `${radToDeg(kinematics.elevation)}°`,
    plane: `${radToDeg(kinematics.planeOfElevation)}°`,
    abduction: `${radToDeg(kinematics.abduction)}°`,
    flexion: `${radToDeg(kinematics.flexion)}°`,
    rotation: `${radToDeg(kinematics.axialRotation)}°`
  };
}

/**
 * Get plane name from angle
 */
export function getPlaneName(planeAngle: number): string {
  const deg = planeAngle * 180 / Math.PI;
  
  if (deg < 15) return 'Frontal (Pure Abduction)';
  if (deg < 45) return 'Scapular Plane';
  if (deg < 75) return 'Oblique';
  if (deg < 105) return 'Sagittal (Pure Flexion)';
  if (deg < 135) return 'Oblique Posterior';
  if (deg < 165) return 'Extension Plane';
  return 'Frontal (Adduction)';
}
