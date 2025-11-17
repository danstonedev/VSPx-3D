/**
 * Self-Collision Detection System
 * 
 * Detects and prevents anatomically impossible poses where body parts
 * would intersect (e.g., forearm through torso, legs crossing impossibly).
 */

import * as THREE from 'three';
import { findBoneByName } from '../utils/ikSolverConfig';

/**
 * Collision pair definition
 */
export interface CollisionPair {
  bone1: string;
  bone2: string;
  minDistance: number; // Minimum allowed distance in meters
  severity: 'critical' | 'warning' | 'minor';
  description: string;
}

/**
 * Collision detection result
 */
export interface CollisionResult {
  hasCollision: boolean;
  collidingPairs: Array<{
    pair: CollisionPair;
    currentDistance: number;
    penetrationDepth: number;
  }>;
}

/**
 * Predefined collision pairs for Mixamo humanoid
 * These prevent anatomically impossible poses
 */
export const COLLISION_PAIRS: CollisionPair[] = [
  // Arms vs Torso
  {
    bone1: 'mixamorigLeftForeArm',
    bone2: 'mixamorigSpine1',
    minDistance: 0.12,
    severity: 'critical',
    description: 'Left forearm penetrating torso'
  },
  {
    bone1: 'mixamorigRightForeArm',
    bone2: 'mixamorigSpine1',
    minDistance: 0.12,
    severity: 'critical',
    description: 'Right forearm penetrating torso'
  },
  {
    bone1: 'mixamorigLeftArm',
    bone2: 'mixamorigSpine2',
    minDistance: 0.10,
    severity: 'warning',
    description: 'Left upper arm too close to torso'
  },
  {
    bone1: 'mixamorigRightArm',
    bone2: 'mixamorigSpine2',
    minDistance: 0.10,
    severity: 'warning',
    description: 'Right upper arm too close to torso'
  },
  
  // Hands vs Body
  {
    bone1: 'mixamorigLeftHand',
    bone2: 'mixamorigHead',
    minDistance: 0.08,
    severity: 'warning',
    description: 'Left hand penetrating head'
  },
  {
    bone1: 'mixamorigRightHand',
    bone2: 'mixamorigHead',
    minDistance: 0.08,
    severity: 'warning',
    description: 'Right hand penetrating head'
  },
  
  // Legs vs Torso
  {
    bone1: 'mixamorigLeftUpLeg',
    bone2: 'mixamorigSpine',
    minDistance: 0.10,
    severity: 'critical',
    description: 'Left thigh penetrating pelvis'
  },
  {
    bone1: 'mixamorigRightUpLeg',
    bone2: 'mixamorigSpine',
    minDistance: 0.10,
    severity: 'critical',
    description: 'Right thigh penetrating pelvis'
  },
  
  // Knees vs Torso (extreme bends)
  {
    bone1: 'mixamorigLeftLeg',
    bone2: 'mixamorigSpine1',
    minDistance: 0.15,
    severity: 'warning',
    description: 'Left knee too close to torso'
  },
  {
    bone1: 'mixamorigRightLeg',
    bone2: 'mixamorigSpine1',
    minDistance: 0.15,
    severity: 'warning',
    description: 'Right knee too close to torso'
  },
  
  // Legs vs each other
  {
    bone1: 'mixamorigLeftLeg',
    bone2: 'mixamorigRightLeg',
    minDistance: 0.12,
    severity: 'minor',
    description: 'Legs crossing'
  },
  {
    bone1: 'mixamorigLeftFoot',
    bone2: 'mixamorigRightFoot',
    minDistance: 0.08,
    severity: 'minor',
    description: 'Feet overlapping'
  },
  
  // Arms vs each other (behind back poses)
  {
    bone1: 'mixamorigLeftForeArm',
    bone2: 'mixamorigRightForeArm',
    minDistance: 0.10,
    severity: 'minor',
    description: 'Forearms intersecting'
  },
  {
    bone1: 'mixamorigLeftHand',
    bone2: 'mixamorigRightHand',
    minDistance: 0.06,
    severity: 'minor',
    description: 'Hands overlapping'
  }
];

/**
 * Check for collisions between all defined bone pairs
 */
export function detectCollisions(
  skeleton: THREE.Skeleton,
  pairs: CollisionPair[] = COLLISION_PAIRS
): CollisionResult {
  const collidingPairs: CollisionResult['collidingPairs'] = [];
  const worldPos1 = new THREE.Vector3();
  const worldPos2 = new THREE.Vector3();
  
  for (const pair of pairs) {
    const bone1 = findBoneByName(skeleton, pair.bone1);
    const bone2 = findBoneByName(skeleton, pair.bone2);
    
    if (!bone1 || !bone2) {
      // Bone not found - skip this pair
      continue;
    }
    
    // Get world positions
    bone1.getWorldPosition(worldPos1);
    bone2.getWorldPosition(worldPos2);
    
    // Calculate distance
    const distance = worldPos1.distanceTo(worldPos2);
    
    // Check if collision occurred
    if (distance < pair.minDistance) {
      const penetrationDepth = pair.minDistance - distance;
      collidingPairs.push({
        pair,
        currentDistance: distance,
        penetrationDepth
      });
    }
  }
  
  return {
    hasCollision: collidingPairs.length > 0,
    collidingPairs
  };
}

/**
 * Check collision for a specific bone pair
 */
export function checkBonePairCollision(
  skeleton: THREE.Skeleton,
  bone1Name: string,
  bone2Name: string,
  minDistance: number
): { colliding: boolean; distance: number } {
  const bone1 = findBoneByName(skeleton, bone1Name);
  const bone2 = findBoneByName(skeleton, bone2Name);
  
  if (!bone1 || !bone2) {
    return { colliding: false, distance: Infinity };
  }
  
  const worldPos1 = new THREE.Vector3();
  const worldPos2 = new THREE.Vector3();
  
  bone1.getWorldPosition(worldPos1);
  bone2.getWorldPosition(worldPos2);
  
  const distance = worldPos1.distanceTo(worldPos2);
  
  return {
    colliding: distance < minDistance,
    distance
  };
}

/**
 * Get collision pairs by severity level
 */
export function getCollisionPairsBySeverity(
  severity: 'critical' | 'warning' | 'minor'
): CollisionPair[] {
  return COLLISION_PAIRS.filter(pair => pair.severity === severity);
}

/**
 * Filter collision results by severity
 */
export function filterCollisionsBySeverity(
  result: CollisionResult,
  severity: 'critical' | 'warning' | 'minor'
): CollisionResult {
  return {
    hasCollision: result.collidingPairs.some(c => c.pair.severity === severity),
    collidingPairs: result.collidingPairs.filter(c => c.pair.severity === severity)
  };
}

/**
 * Get collision summary for UI display
 */
export function getCollisionSummary(result: CollisionResult): {
  total: number;
  critical: number;
  warning: number;
  minor: number;
  maxPenetration: number;
} {
  const summary = {
    total: result.collidingPairs.length,
    critical: 0,
    warning: 0,
    minor: 0,
    maxPenetration: 0
  };
  
  for (const collision of result.collidingPairs) {
    if (collision.pair.severity === 'critical') summary.critical++;
    else if (collision.pair.severity === 'warning') summary.warning++;
    else if (collision.pair.severity === 'minor') summary.minor++;
    
    if (collision.penetrationDepth > summary.maxPenetration) {
      summary.maxPenetration = collision.penetrationDepth;
    }
  }
  
  return summary;
}

/**
 * Create a bounding sphere for a bone (for advanced collision detection)
 */
export function createBoneBoundingSphere(
  bone: THREE.Bone,
  radius: number = 0.05
): THREE.Sphere {
  const center = new THREE.Vector3();
  bone.getWorldPosition(center);
  return new THREE.Sphere(center, radius);
}

/**
 * Check if two bounding spheres intersect
 */
export function checkSphereIntersection(
  sphere1: THREE.Sphere,
  sphere2: THREE.Sphere
): { intersecting: boolean; penetrationDepth: number } {
  const distance = sphere1.center.distanceTo(sphere2.center);
  const combinedRadii = sphere1.radius + sphere2.radius;
  
  return {
    intersecting: distance < combinedRadii,
    penetrationDepth: Math.max(0, combinedRadii - distance)
  };
}

/**
 * Batch collision check with early exit (for performance)
 * Returns true on first collision found
 */
export function hasAnyCollision(
  skeleton: THREE.Skeleton,
  severityThreshold: 'critical' | 'warning' | 'minor' = 'critical'
): boolean {
  const worldPos1 = new THREE.Vector3();
  const worldPos2 = new THREE.Vector3();
  
  // Filter pairs by severity threshold
  let pairsToCheck = COLLISION_PAIRS;
  if (severityThreshold === 'critical') {
    pairsToCheck = getCollisionPairsBySeverity('critical');
  } else if (severityThreshold === 'warning') {
    pairsToCheck = COLLISION_PAIRS.filter(p => p.severity !== 'minor');
  }
  
  for (const pair of pairsToCheck) {
    const bone1 = findBoneByName(skeleton, pair.bone1);
    const bone2 = findBoneByName(skeleton, pair.bone2);
    
    if (!bone1 || !bone2) continue;
    
    bone1.getWorldPosition(worldPos1);
    bone2.getWorldPosition(worldPos2);
    
    if (worldPos1.distanceTo(worldPos2) < pair.minDistance) {
      return true; // Early exit
    }
  }
  
  return false;
}

/**
 * Get bones involved in collisions (for visual highlighting)
 */
export function getCollidingBones(result: CollisionResult): Set<string> {
  const boneNames = new Set<string>();
  
  for (const collision of result.collidingPairs) {
    boneNames.add(collision.pair.bone1);
    boneNames.add(collision.pair.bone2);
  }
  
  return boneNames;
}
