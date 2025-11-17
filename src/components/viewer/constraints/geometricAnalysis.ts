/**
 * Geometric Analysis for Anatomical Measurements
 * 
 * This module provides quaternion-based + geometric vector analysis for accurate
 * anatomical angle measurements, avoiding euler angle coordinate system issues.
 * 
 * Core principle: Anatomical angles are measured in WORLD SPACE using geometric
 * relationships between bone direction vectors and anatomical reference planes.
 */

import * as THREE from 'three';

/**
 * Anatomical measurement result for any joint
 */
export interface AnatomicalMeasurement {
  // Primary motion (e.g., ABD/ADD for shoulder, FLEX/EXT for hip)
  primary: number;           // Degrees
  
  // Secondary motion (e.g., rotation)
  secondary: number;         // Degrees
  
  // Tertiary motion (e.g., FLEX/EXT for shoulder)
  tertiary: number;          // Degrees
  
  // Additional context
  totalMotion?: number;      // Total angular displacement from neutral
  planeOfMotion?: number;    // Which plane dominates (0-360°)
}

// Internal helpers
const EPS = 1e-6;

function getRoot(object: THREE.Object3D): THREE.Object3D {
  let cur: THREE.Object3D = object;
  while (cur.parent) cur = cur.parent;
  return cur;
}

function forEachDescendant(node: THREE.Object3D, cb: (o: THREE.Object3D) => void) {
  node.children.forEach(child => {
    cb(child);
    forEachDescendant(child, cb);
  });
}

function findBoneByIncludes(root: THREE.Object3D, includes: string[]): THREE.Bone | undefined {
  let found: THREE.Bone | undefined;
  forEachDescendant(root, (o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && includes.every(tok => o.name.includes(tok))) {
      found = o as THREE.Bone;
    }
  });
  return found;
}

function findDescendantByIncludes(node: THREE.Object3D, includes: string[]): THREE.Bone | undefined {
  let found: THREE.Bone | undefined;
  forEachDescendant(node, (o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && includes.every(tok => o.name.includes(tok))) {
      found = o as THREE.Bone;
    }
  });
  return found;
}

function getWorldPos(o: THREE.Object3D): THREE.Vector3 {
  return o.getWorldPosition(new THREE.Vector3());
}

function projectOntoPlane(v: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
  const nDot = v.dot(normal);
  return v.clone().sub(normal.clone().multiplyScalar(nDot));
}

function signedAngleAroundAxis(a: THREE.Vector3, b: THREE.Vector3, axis: THREE.Vector3): number {
  // Assumes a and b are on the plane perpendicular to axis
  const cross = new THREE.Vector3().crossVectors(a, b);
  const sin = axis.dot(cross);
  const cos = a.dot(b);
  return Math.atan2(sin, cos);
}

function safeNormalize(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  if (len < EPS) return v.set(0, 0, 0);
  return v.multiplyScalar(1 / len);
}

/**
 * Analyze shoulder joint using geometric decomposition
 * Returns clinically accurate ABD/ADD, rotation, and FLEX/EXT
 */
export function analyzeShoulderGeometric(
  bone: THREE.Bone,
  isRightSide: boolean
): AnatomicalMeasurement {
  // Build thorax frame from shoulders and spine
  const root = getRoot(bone);
  const leftShoulder = findBoneByIncludes(root, ['Left', 'Shoulder']);
  const rightShoulder = findBoneByIncludes(root, ['Right', 'Shoulder']);
  const hips = findBoneByIncludes(root, ['Hips']);
  const chest = findBoneByIncludes(root, ['Spine2']) || findBoneByIncludes(root, ['Spine1']) || findBoneByIncludes(root, ['Spine']);

  if (!leftShoulder || !rightShoulder || !hips || !chest) {
    // Fallback to zeros if required landmarks are missing
    return { primary: 0, secondary: 0, tertiary: 0 };
  }

  const Ls = getWorldPos(leftShoulder);
  const Rs = getWorldPos(rightShoulder);
  const Hp = getWorldPos(hips);
  const Ch = getWorldPos(chest);

  let thoraxRight = safeNormalize(Rs.clone().sub(Ls));
  let thoraxUp = safeNormalize(Ch.clone().sub(Hp));
  let thoraxForward = safeNormalize(new THREE.Vector3().crossVectors(thoraxRight, thoraxUp));
  // Re-orthogonalize to ensure orthonormal basis
  thoraxRight = safeNormalize(new THREE.Vector3().crossVectors(thoraxUp, thoraxForward));
  thoraxForward = safeNormalize(new THREE.Vector3().crossVectors(thoraxRight, thoraxUp));

  // Segment directions from joint positions
  const shoulderPos = getWorldPos(bone);
  const foreArm = findDescendantByIncludes(bone, ['ForeArm']);
  const elbowPos = foreArm ? getWorldPos(foreArm) : shoulderPos.clone().add(thoraxRight.clone().multiplyScalar(isRightSide ? 0.3 : -0.3));
  const humerusDir = safeNormalize(elbowPos.clone().sub(shoulderPos));

  // Elevation (ψ): angle from downward thorax-up direction
  const elevation = Math.acos(THREE.MathUtils.clamp(humerusDir.dot(thoraxUp.clone().multiplyScalar(-1)), -1, 1));

  // Plane of elevation (θ): project onto thorax transverse plane and measure vs thoraxRight
  const hProj = projectOntoPlane(humerusDir, thoraxUp);
  let plane = 0;
  if (hProj.length() > EPS) {
    const rx = hProj.dot(thoraxRight);
    const fz = hProj.dot(thoraxForward);
    plane = Math.atan2(fz, rx);
  }

  // Axial rotation (γ): project forearm direction into plane perpendicular to humerus and measure vs thoraxForward projection
  let axial = 0;
  const hand = foreArm ? findDescendantByIncludes(foreArm, ['Hand']) : undefined;
  if (foreArm && hand) {
    const wristPos = getWorldPos(hand);
    const forearmDir = safeNormalize(wristPos.clone().sub(elbowPos));
    const ref = safeNormalize(projectOntoPlane(thoraxForward, humerusDir));
    const foreProj = safeNormalize(projectOntoPlane(forearmDir, humerusDir));
    if (ref.length() > EPS && foreProj.length() > EPS) {
      axial = signedAngleAroundAxis(ref, foreProj, humerusDir);
    }
  }

  return {
    // Report elevation as primary for clarity; label in UI can say Elevation
    primary: THREE.MathUtils.radToDeg(elevation),
    secondary: THREE.MathUtils.radToDeg(axial),
    // Flex/Ext component (sagittal) for reference: angle in sagittal plane
    tertiary: THREE.MathUtils.radToDeg(Math.atan2(hProj.dot(thoraxForward), -humerusDir.dot(thoraxUp))),
    totalMotion: THREE.MathUtils.radToDeg(elevation),
    planeOfMotion: THREE.MathUtils.radToDeg(plane)
  };
}

/**
 * Analyze hip joint using geometric decomposition
 */
export function analyzeHipGeometric(
  bone: THREE.Bone,
  _isRightSide: boolean
): AnatomicalMeasurement {
  // Pelvis frame from hips, spine, and hips width
  const root = getRoot(bone);
  const hips = findBoneByIncludes(root, ['Hips']);
  const spine = findBoneByIncludes(root, ['Spine2']) || findBoneByIncludes(root, ['Spine1']) || findBoneByIncludes(root, ['Spine']);
  const leftHip = findBoneByIncludes(root, ['Left', 'UpLeg']);
  const rightHip = findBoneByIncludes(root, ['Right', 'UpLeg']);

  if (!hips || !spine || !leftHip || !rightHip) {
    return { primary: 0, secondary: 0, tertiary: 0 };
  }

  const Hp = getWorldPos(hips);
  const Sp = getWorldPos(spine);
  let pelvisRight = safeNormalize(getWorldPos(rightHip).clone().sub(getWorldPos(leftHip)));
  let pelvisUp = safeNormalize(Sp.clone().sub(Hp));
  let pelvisForward = safeNormalize(new THREE.Vector3().crossVectors(pelvisRight, pelvisUp));
  pelvisRight = safeNormalize(new THREE.Vector3().crossVectors(pelvisUp, pelvisForward));
  pelvisForward = safeNormalize(new THREE.Vector3().crossVectors(pelvisRight, pelvisUp));

  // Segment direction from hip to knee
  const hipPos = getWorldPos(bone);
  const shank = findDescendantByIncludes(bone, ['Leg']);
  const kneePos = shank ? getWorldPos(shank) : hipPos.clone().add(pelvisUp.clone().multiplyScalar(-0.4));
  const femurDir = safeNormalize(kneePos.clone().sub(hipPos));

  // Elevation (ψ): from downward pelvis-up
  const elevation = Math.acos(THREE.MathUtils.clamp(femurDir.dot(pelvisUp.clone().multiplyScalar(-1)), -1, 1));

  // Plane (θ): projection onto pelvis transverse plane vs pelvisRight
  const fProj = projectOntoPlane(femurDir, pelvisUp);
  let plane = 0;
  if (fProj.length() > EPS) {
    plane = Math.atan2(fProj.dot(pelvisForward), fProj.dot(pelvisRight));
  }

  // Axial rotation (γ): optional, using shank orientation if ankle available
  let axial = 0;
  const calf = shank;
  const foot = calf ? findDescendantByIncludes(calf, ['Foot']) : undefined;
  if (calf && foot) {
    const anklePos = getWorldPos(foot);
    const shankDir = safeNormalize(anklePos.clone().sub(kneePos));
    const ref = safeNormalize(projectOntoPlane(pelvisForward, femurDir));
    const shankProj = safeNormalize(projectOntoPlane(shankDir, femurDir));
    if (ref.length() > EPS && shankProj.length() > EPS) {
      axial = signedAngleAroundAxis(ref, shankProj, femurDir);
    }
  }

  return {
    primary: THREE.MathUtils.radToDeg(elevation),
    secondary: THREE.MathUtils.radToDeg(axial),
    tertiary: THREE.MathUtils.radToDeg(Math.atan2(fProj.dot(pelvisForward), -femurDir.dot(pelvisUp))),
    totalMotion: THREE.MathUtils.radToDeg(elevation),
    planeOfMotion: THREE.MathUtils.radToDeg(plane)
  };
}

/**
 * Analyze elbow joint (simple hinge - one degree of freedom)
 */
export function analyzeElbowGeometric(
  bone: THREE.Bone,
  _isRightSide: boolean
): AnatomicalMeasurement {
  const parent = bone.parent as THREE.Bone | null;
  if (!parent) return { primary: 0, secondary: 0, tertiary: 0 };

  const elbowPos = getWorldPos(bone);
  // Upper arm: shoulder to elbow
  const shoulderPos = getWorldPos(parent);
  // Forearm: elbow to wrist
  const hand = findDescendantByIncludes(bone, ['Hand']);
  const wristPos = hand ? getWorldPos(hand) : elbowPos.clone().add(new THREE.Vector3(0.3, 0, 0));

  const upperArmDir = safeNormalize(elbowPos.clone().sub(shoulderPos));
  const forearmDir = safeNormalize(wristPos.clone().sub(elbowPos));

  const flexion = Math.acos(THREE.MathUtils.clamp(upperArmDir.dot(forearmDir), -1, 1));

  return {
    primary: THREE.MathUtils.radToDeg(flexion), // FLEX/EXT
    secondary: 0, // PRO/SUP not implemented here
    tertiary: 0
  };
}

/**
 * Analyze knee joint (simple hinge)
 */
export function analyzeKneeGeometric(
  bone: THREE.Bone,
  _isRightSide: boolean
): AnatomicalMeasurement {
  const parent = bone.parent as THREE.Bone | null;
  if (!parent) return { primary: 0, secondary: 0, tertiary: 0 };

  const kneePos = getWorldPos(bone);
  const hipPos = getWorldPos(parent);
  const foot = findDescendantByIncludes(bone, ['Foot']);
  const anklePos = foot ? getWorldPos(foot) : kneePos.clone().add(new THREE.Vector3(0, -0.4, 0));

  const thighDir = safeNormalize(kneePos.clone().sub(hipPos));
  const shankDir = safeNormalize(anklePos.clone().sub(kneePos));
  const flexion = Math.acos(THREE.MathUtils.clamp(thighDir.dot(shankDir), -1, 1));

  return {
    primary: THREE.MathUtils.radToDeg(flexion),
    secondary: 0,
    tertiary: 0
  };
}

/**
 * Generic geometric analysis - detects joint type and routes to appropriate analyzer
 */
export function analyzeJointGeometric(
  bone: THREE.Bone
): AnatomicalMeasurement {
  const name = bone.name;
  
  // Shoulders
  if (name === 'mixamorig1RightArm') {
    return analyzeShoulderGeometric(bone, true);
  }
  if (name === 'mixamorig1LeftArm') {
    return analyzeShoulderGeometric(bone, false);
  }
  
  // Hips
  if (name === 'mixamorig1RightUpLeg') {
    return analyzeHipGeometric(bone, true);
  }
  if (name === 'mixamorig1LeftUpLeg') {
    return analyzeHipGeometric(bone, false);
  }
  
  // Elbows
  if (name === 'mixamorig1RightForeArm') {
    return analyzeElbowGeometric(bone, true);
  }
  if (name === 'mixamorig1LeftForeArm') {
    return analyzeElbowGeometric(bone, false);
  }
  
  // Knees
  if (name === 'mixamorig1RightLeg') {
    return analyzeKneeGeometric(bone, true);
  }
  if (name === 'mixamorig1LeftLeg') {
    return analyzeKneeGeometric(bone, false);
  }
  
  // Default: return zeros for unsupported joints
  return {
    primary: 0,
    secondary: 0,
    tertiary: 0
  };
}

/**
 * Calculate rotation magnitude from T-pose using quaternions
 * This gives us the total angular displacement regardless of axis
 */
export function calculateRotationFromTPose(
  currentQuat: THREE.Quaternion,
  tPoseQuat: THREE.Quaternion
): number {
  // Calculate relative rotation: q_rel = q_current * q_tpose_inverse
  const relativeQuat = currentQuat.clone();
  const tPoseInverse = tPoseQuat.clone().invert();
  relativeQuat.multiply(tPoseInverse);
  
  // Extract angle from quaternion (q = [cos(θ/2), sin(θ/2) * axis])
  const angle = 2 * Math.acos(Math.abs(relativeQuat.w));
  
  return THREE.MathUtils.radToDeg(angle);
}
