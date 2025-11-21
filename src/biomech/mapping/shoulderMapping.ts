/**
 * Shoulder Anatomical Mapping
 * 
 * Converts internal generalized coordinates (q₀, q₁, q₂) to clinically meaningful
 * shoulder angles for both Scapulothoracic (ST) and Glenohumeral (GH) joints.
 * 
 * Clinical Interpretation:
 * 
 * GLENOHUMERAL (GH):
 * - Elevation: Amount of arm lift (0° = at side, 180° = overhead)
 * - Plane: Direction of elevation (-90° = adduction, 0° = scapular plane, 90° = abduction)
 * - Rotation: Humeral axial rotation (- = IR, + = ER)
 * 
 * SCAPULOTHORACIC (ST):
 * - Tilt: Anterior/posterior tipping of scapula
 * - Rotation: Internal/external rotation of scapula on thorax
 * - Upward Rotation: Upward/downward rotation of scapula (follows GH elevation)
 * 
 * Scapulohumeral Rhythm:
 * - Typically GH:ST ≈ 2:1 for elevation
 * - At 90° total elevation: ~60° GH + ~30° ST upward rotation
 */

import { ClinicalAngles } from '../model/types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Map Glenohumeral (GH) coordinates to clinical angles
 * 
 * @param rotationRad - GH axial rotation (X axis, radians) [Index 0]
 * @param planeRad - GH plane of elevation (Y axis, radians) [Index 1]
 * @param elevationRad - GH elevation (Z axis, radians) [Index 2]
 * @returns Clinical interpretation in degrees
 */
export function ghToClinical(
  rotationRad: number,
  planeRad: number,
  elevationRad: number
): ClinicalAngles {
  return {
    jointId: 'gh',
    angles: {
      elevation: elevationRad * RAD_TO_DEG,
      plane: planeRad * RAD_TO_DEG,
      rotation: rotationRad * RAD_TO_DEG,
    },
    metrics: {
      // Total elevation magnitude (useful for ROM assessment)
      totalElevation: elevationRad * RAD_TO_DEG,
      
      // Classify plane of elevation
      // -90 to -30: Adduction (code: -1)
      // -30 to 30: Scapular plane/optimal (code: 0)
      // 30 to 90: Abduction/Frontal plane (code: 1)
      planeClassification: classifyElevationPlaneCode(planeRad * RAD_TO_DEG),
    },
  };
}

/**
 * Map Scapulothoracic (ST) coordinates to clinical angles
 * 
 * @param tiltRad - ST tilt (X axis, radians) [Index 0]
 * @param rotationRad - ST internal/external rotation (Y axis, radians) [Index 1]
 * @param upwardRad - ST upward/downward rotation (Z axis, radians) [Index 2]
 * @returns Clinical interpretation in degrees
 */
export function stToClinical(
  tiltRad: number,
  rotationRad: number,
  upwardRad: number
): ClinicalAngles {
  return {
    jointId: 'st',
    angles: {
      tilt: tiltRad * RAD_TO_DEG,
      internalRotation: rotationRad * RAD_TO_DEG,
      upwardRotation: upwardRad * RAD_TO_DEG,
    },
    metrics: {
      // Total scapular contribution
      totalSTMotion: Math.sqrt(tiltRad * tiltRad + rotationRad * rotationRad + upwardRad * upwardRad) * RAD_TO_DEG,
    },
  };
}

/**
 * Compute scapulohumeral rhythm
 * 
 * @param ghElevation - GH elevation in degrees
 * @param stUpwardRotation - ST upward rotation in degrees
 * @returns Rhythm metrics
 */
export function computeScapulohumeralRhythm(
  ghElevation: number,
  stUpwardRotation: number
): {
  ratio: number;
  isNormal: boolean;
  totalElevation: number;
  ghContribution: number;
  stContribution: number;
} {
  const totalElevation = ghElevation + stUpwardRotation;
  const ghContribution = totalElevation > 0 ? (ghElevation / totalElevation) * 100 : 0;
  const stContribution = totalElevation > 0 ? (stUpwardRotation / totalElevation) * 100 : 0;
  
  // Calculate ratio (GH:ST)
  const ratio = stUpwardRotation !== 0 ? ghElevation / stUpwardRotation : 0;
  
  // Normal range is typically 1.5:1 to 2.5:1
  const isNormal = ratio >= 1.5 && ratio <= 2.5;
  
  return {
    ratio,
    isNormal,
    totalElevation,
    ghContribution,
    stContribution,
  };
}

/**
 * Classify plane of elevation as numeric code
 * @returns -1 for adduction, 0 for scapular plane, 1 for abduction/frontal
 */
function classifyElevationPlaneCode(planeDeg: number): number {
  if (planeDeg < -30) return -1; // Adduction
  if (planeDeg < 30) return 0;   // Scapular Plane (optimal)
  return 1;                       // Abduction/Frontal
}

/**
 * Classify plane of elevation as string (for display)
 */
export function classifyElevationPlane(planeDeg: number): string {
  if (planeDeg < -30) return 'Adduction';
  if (planeDeg < 30) return 'Scapular Plane';
  return 'Abduction/Frontal';
}

/**
 * Get expected ST upward rotation for given GH elevation (based on 2:1 ratio)
 */
export function getExpectedSTUpwardRotation(ghElevation: number): number {
  // Typical scapulohumeral rhythm: GH:ST ≈ 2:1
  // For every 2° of GH elevation, expect ~1° of ST upward rotation
  return ghElevation / 2;
}

/**
 * Check if shoulder motion is within safe ROM
 */
export function isSafeShoulderROM(
  ghElevation: number,
  ghRotation: number,
  ghPlane: number
): {
  isSafe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check elevation limits
  if (ghElevation > 170) {
    warnings.push('Excessive elevation (>170°)');
  }
  if (ghElevation < -45) {
    warnings.push('Excessive extension (<-45°)');
  }
  
  // Check rotation with elevated arm (high risk for impingement)
  if (ghElevation > 60 && ghRotation < -45) {
    warnings.push('Internal rotation with elevated arm (impingement risk)');
  }
  
  // Check combined elevation + adduction (can stress AC joint)
  if (ghElevation > 90 && ghPlane < -30) {
    warnings.push('High elevation in adduction (AC joint stress)');
  }
  
  return {
    isSafe: warnings.length === 0,
    warnings,
  };
}

/**
 * Describe shoulder position in clinical terms
 */
export function describeShoulderPosition(
  ghElevation: number,
  ghPlane: number,
  ghRotation: number
): string {
  let description = '';
  
  // Elevation component
  if (Math.abs(ghElevation) < 15) {
    description += 'Arm at side';
  } else if (ghElevation >= 15 && ghElevation < 60) {
    description += 'Low elevation';
  } else if (ghElevation >= 60 && ghElevation < 120) {
    description += 'Mid-range elevation';
  } else if (ghElevation >= 120) {
    description += 'High elevation';
  } else {
    description += 'Extension';
  }
  
  // Plane component
  if (Math.abs(ghElevation) >= 15) {
    if (Math.abs(ghPlane) < 30) {
      description += ' in scapular plane';
    } else if (ghPlane >= 30) {
      description += ' in abduction/frontal plane';
    } else {
      description += ' in adduction';
    }
  }
  
  // Rotation component
  if (Math.abs(ghRotation) > 20) {
    description += ghRotation > 0 ? ', externally rotated' : ', internally rotated';
  }
  
  return description;
}

/**
 * Export for testing/validation
 */
export const ShoulderMapping = {
  ghToClinical,
  stToClinical,
  computeScapulohumeralRhythm,
  getExpectedSTUpwardRotation,
  isSafeShoulderROM,
  describeShoulderPosition,
};
