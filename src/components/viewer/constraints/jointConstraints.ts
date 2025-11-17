/**
 * Joint Constraints System
 * 
 * Defines anatomically correct range of motion limits for human skeleton joints.
 * Based on biomechanics research and ISO 1503 anatomical standards.
 * 
 * All angles are in radians. Coordinate system follows three.js conventions:
 * - X: Red axis (typically flexion/extension)
 * - Y: Green axis (typically abduction/adduction or rotation)
 * - Z: Blue axis (typically internal/external rotation)
 */

import * as THREE from 'three';

/**
 * Represents rotation limits for a single joint in 3D space
 */
export interface RotationLimits {
  x: [number, number]; // [min, max] in radians
  y: [number, number];
  z: [number, number];
}

/**
 * Complete constraint definition for a skeletal joint
 */
export interface JointConstraint {
  boneName: string;
  displayName: string;
  rotationLimits: RotationLimits;
  translationLock: boolean; // If true, bone position is locked, only rotation allowed
  enabled: boolean;
  degreesOfFreedom: number; // 1, 2, or 3
  notes?: string; // Educational notes about the joint
}

/**
 * Utility to convert degrees to radians for readability
 */
const deg = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Full-body joint constraint library for Mixamo-rigged characters
 * 
 * Naming convention: Mixamo rigs use 'mixamorig1' prefix
 * Coordinate systems are approximate and may need adjustment based on specific rig orientation
 */
export const JOINT_CONSTRAINTS: Record<string, JointConstraint> = {
  // ==================== SPINE & TORSO ====================
  
  'mixamorig1Spine': {
    boneName: 'mixamorig1Spine',
    displayName: 'Lower Spine (L5-S1)',
    rotationLimits: {
      x: [deg(-25), deg(15)],  // Flexion/extension
      y: [deg(-30), deg(30)],  // Rotation
      z: [deg(-35), deg(35)]   // Lateral bending
    },
    translationLock: false, // Root can translate
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Lumbar region - limited rotation, moderate flexion'
  },
  
  'mixamorig1Spine1': {
    boneName: 'mixamorig1Spine1',
    displayName: 'Mid Spine (T12-L1)',
    rotationLimits: {
      x: [deg(-20), deg(20)],  // Less flexion than lower spine
      y: [deg(-35), deg(35)],
      z: [deg(-30), deg(30)]
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Thoracolumbar junction - more rotation, less flexion'
  },
  
  'mixamorig1Spine2': {
    boneName: 'mixamorig1Spine2',
    displayName: 'Upper Spine (T6-T8)',
    rotationLimits: {
      x: [deg(-15), deg(15)],
      y: [deg(-30), deg(30)],
      z: [deg(-20), deg(20)]
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Mid-thoracic region - limited by rib cage'
  },
  
  'mixamorig1Neck': {
    boneName: 'mixamorig1Neck',
    displayName: 'Lower Neck (C7)',
    rotationLimits: {
      x: [deg(-40), deg(40)],  // Nodding
      y: [deg(-60), deg(60)],  // Head turn
      z: [deg(-45), deg(45)]   // Side tilt
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Cervical spine - high mobility'
  },
  
  'mixamorig1Head': {
    boneName: 'mixamorig1Head',
    displayName: 'Head (Atlanto-occipital joint)',
    rotationLimits: {
      x: [deg(-30), deg(50)],  // Nod yes
      y: [deg(-75), deg(75)],  // Shake no
      z: [deg(-40), deg(40)]   // Tilt
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Head-neck junction - primary rotation joint'
  },
  
  // ==================== LEFT ARM ====================
  
  'mixamorig1LeftShoulder': {
    boneName: 'mixamorig1LeftShoulder',
    displayName: 'Left Clavicle (Thoracoscapular)',
    rotationLimits: {
      x: [deg(-5), deg(5)],    // Minimal elevation/depression
      y: [deg(-5), deg(5)],    // Minimal rotation
      z: [deg(-8), deg(8)]     // Minimal protraction/retraction
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Thoracoscapular joint - scapula gliding, very limited direct rotation. Main shoulder motion is at glenohumeral (LeftArm)'
  },
  
  'mixamorig1LeftArm': {
    boneName: 'mixamorig1LeftArm',
    displayName: 'Left Shoulder (Glenohumeral)',
    rotationLimits: {
      x: [deg(-50), deg(180)], // Forward raise (flexion) - wide range
      y: [deg(-90), deg(90)],  // Internal/external rotation
      z: [deg(-30), deg(180)]  // Side raise (abduction)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - highest mobility in body'
  },
  
  'mixamorig1LeftForeArm': {
    boneName: 'mixamorig1LeftForeArm',
    displayName: 'Left Elbow',
    rotationLimits: {
      x: [deg(0), deg(145)],   // Flexion only (hinge joint)
      y: [deg(-90), deg(90)],  // Pronation/supination (forearm rotation)
      z: [deg(-5), deg(5)]     // Minimal deviation
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2, // Primarily 1 DOF (flexion) + forearm rotation
    notes: 'Hinge joint - cannot hyperextend in normal anatomy'
  },
  
  'mixamorig1LeftHand': {
    boneName: 'mixamorig1LeftHand',
    displayName: 'Left Wrist',
    rotationLimits: {
      x: [deg(-70), deg(80)],  // Flexion/extension
      y: [deg(-10), deg(10)],  // Minimal rotation (handled by forearm)
      z: [deg(-20), deg(35)]   // Ulnar/radial deviation
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Complex joint - primarily flexion and side-to-side motion'
  },
  
  // ==================== RIGHT ARM ====================
  
  'mixamorig1RightShoulder': {
    boneName: 'mixamorig1RightShoulder',
    displayName: 'Right Clavicle (Thoracoscapular)',
    rotationLimits: {
      x: [deg(-5), deg(5)],    // Minimal elevation/depression
      y: [deg(-5), deg(5)],    // Minimal rotation
      z: [deg(-8), deg(8)]     // Minimal protraction/retraction
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Thoracoscapular joint - scapula gliding, very limited direct rotation. Main shoulder motion is at glenohumeral (RightArm)'
  },
  
  'mixamorig1RightArm': {
    boneName: 'mixamorig1RightArm',
    displayName: 'Right Shoulder (Glenohumeral)',
    rotationLimits: {
      x: [deg(-50), deg(180)],  // Forward raise (flexion)
      y: [deg(-90), deg(90)],   // Internal/external rotation
      z: [deg(-180), deg(30)]   // Side raise (abduction) - negative for right side
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - highest mobility in body'
  },
  
  'mixamorig1RightForeArm': {
    boneName: 'mixamorig1RightForeArm',
    displayName: 'Right Elbow',
    rotationLimits: {
      x: [deg(0), deg(145)],
      y: [deg(-90), deg(90)],  // Pronation/supination (forearm rotation)
      z: [deg(-5), deg(5)]     // Minimal deviation
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Hinge joint - cannot hyperextend in normal anatomy'
  },
  
  'mixamorig1RightHand': {
    boneName: 'mixamorig1RightHand',
    displayName: 'Right Wrist',
    rotationLimits: {
      x: [deg(-70), deg(80)],
      y: [deg(-10), deg(10)],
      z: [deg(-35), deg(20)]  // Reversed for right side
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Complex joint - primarily flexion and side-to-side motion'
  },
  
  // ==================== LEFT LEG ====================
  
  'mixamorig1LeftUpLeg': {
    boneName: 'mixamorig1LeftUpLeg',
    displayName: 'Left Hip',
    rotationLimits: {
      x: [deg(-30), deg(120)], // Flexion/extension - large range
      y: [deg(-45), deg(45)],  // Internal/external rotation
      z: [deg(-45), deg(45)]   // Abduction/adduction
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - second most mobile joint'
  },
  
  'mixamorig1LeftLeg': {
    boneName: 'mixamorig1LeftLeg',
    displayName: 'Left Knee',
    rotationLimits: {
      x: [deg(-150), deg(5)],  // Flexion - hinge joint
      y: [deg(-15), deg(15)],  // Slight rotation when flexed
      z: [deg(-10), deg(10)]   // Minimal valgus/varus
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint - no hyperextension, slight rotation when bent'
  },
  
  'mixamorig1LeftFoot': {
    boneName: 'mixamorig1LeftFoot',
    displayName: 'Left Ankle',
    rotationLimits: {
      x: [deg(-45), deg(20)],  // Plantarflexion/dorsiflexion
      y: [deg(-10), deg(10)],  // Minimal rotation
      z: [deg(-25), deg(25)]   // Inversion/eversion
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Modified hinge joint - primarily up/down with some side tilt'
  },
  
  'mixamorig1LeftToeBase': {
    boneName: 'mixamorig1LeftToeBase',
    displayName: 'Left Toes (MTP joint)',
    rotationLimits: {
      x: [deg(-35), deg(70)],  // Extension for push-off
      y: [deg(-5), deg(5)],
      z: [deg(-5), deg(5)]
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint - important for walking/running'
  },
  
  // ==================== RIGHT LEG ====================
  
  'mixamorig1RightUpLeg': {
    boneName: 'mixamorig1RightUpLeg',
    displayName: 'Right Hip',
    rotationLimits: {
      x: [deg(-30), deg(120)],  // Flexion/extension
      y: [deg(-45), deg(45)],
      z: [deg(-45), deg(45)]    // Abduction/adduction
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - second most mobile joint'
  },
  
  'mixamorig1RightLeg': {
    boneName: 'mixamorig1RightLeg',
    displayName: 'Right Knee',
    rotationLimits: {
      x: [deg(-150), deg(5)],   // Flexion - hinge joint
      y: [deg(-15), deg(15)],
      z: [deg(-10), deg(10)]    // Minimal valgus/varus
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint - no hyperextension, slight rotation when bent'
  },
  
  'mixamorig1RightFoot': {
    boneName: 'mixamorig1RightFoot',
    displayName: 'Right Ankle',
    rotationLimits: {
      x: [deg(-45), deg(20)],   // Plantarflexion/dorsiflexion
      y: [deg(-10), deg(10)],
      z: [deg(-25), deg(25)]    // Inversion/eversion
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Modified hinge joint - primarily up/down with some side tilt'
  },
  
  'mixamorig1RightToeBase': {
    boneName: 'mixamorig1RightToeBase',
    displayName: 'Right Toes (MTP joint)',
    rotationLimits: {
      x: [deg(-35), deg(70)],  // Extension for push-off
      y: [deg(-5), deg(5)],
      z: [deg(-5), deg(5)]
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint - important for walking/running'
  },
};

/**
 * Lookup constraint by bone name
 * Returns undefined if bone has no constraints (e.g., finger bones, end effectors)
 */
export function getConstraintForBone(boneName: string): JointConstraint | undefined {
  return JOINT_CONSTRAINTS[boneName];
}

/**
 * Check if a bone has constraints defined
 */
export function hasConstraint(boneName: string): boolean {
  return boneName in JOINT_CONSTRAINTS;
}

/**
 * Get all constraint names (for UI dropdowns, debugging)
 */
export function getAllConstraintNames(): string[] {
  return Object.keys(JOINT_CONSTRAINTS);
}

/**
 * Get constraints grouped by body region for UI organization
 */
export interface ConstraintGroup {
  name: string;
  constraints: JointConstraint[];
}

export function getConstraintsByRegion(): ConstraintGroup[] {
  return [
    {
      name: 'Spine & Head',
      constraints: [
        JOINT_CONSTRAINTS['mixamorig1Spine'],
        JOINT_CONSTRAINTS['mixamorig1Spine1'],
        JOINT_CONSTRAINTS['mixamorig1Spine2'],
        JOINT_CONSTRAINTS['mixamorig1Neck'],
        JOINT_CONSTRAINTS['mixamorig1Head']
      ].filter(Boolean)
    },
    {
      name: 'Left Arm',
      constraints: [
        JOINT_CONSTRAINTS['mixamorig1LeftShoulder'],
        JOINT_CONSTRAINTS['mixamorig1LeftArm'],
        JOINT_CONSTRAINTS['mixamorig1LeftForeArm'],
        JOINT_CONSTRAINTS['mixamorig1LeftHand']
      ].filter(Boolean)
    },
    {
      name: 'Right Arm',
      constraints: [
        JOINT_CONSTRAINTS['mixamorig1RightShoulder'],
        JOINT_CONSTRAINTS['mixamorig1RightArm'],
        JOINT_CONSTRAINTS['mixamorig1RightForeArm'],
        JOINT_CONSTRAINTS['mixamorig1RightHand']
      ].filter(Boolean)
    },
    {
      name: 'Left Leg',
      constraints: [
        JOINT_CONSTRAINTS['mixamorig1LeftUpLeg'],
        JOINT_CONSTRAINTS['mixamorig1LeftLeg'],
        JOINT_CONSTRAINTS['mixamorig1LeftFoot'],
        JOINT_CONSTRAINTS['mixamorig1LeftToeBase']
      ].filter(Boolean)
    },
    {
      name: 'Right Leg',
      constraints: [
        JOINT_CONSTRAINTS['mixamorig1RightUpLeg'],
        JOINT_CONSTRAINTS['mixamorig1RightLeg'],
        JOINT_CONSTRAINTS['mixamorig1RightFoot'],
        JOINT_CONSTRAINTS['mixamorig1RightToeBase']
      ].filter(Boolean)
    }
  ];
}

/**
 * Utility: Convert THREE.Euler to degrees for display
 */
export function eulerToDegrees(euler: THREE.Euler): { x: number; y: number; z: number } {
  return {
    x: (euler.x * 180) / Math.PI,
    y: (euler.y * 180) / Math.PI,
    z: (euler.z * 180) / Math.PI
  };
}

/**
 * Utility: Check if rotation is within limits (for validation)
 */
export function isWithinLimits(
  rotation: THREE.Euler,
  limits: RotationLimits
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (rotation.x < limits.x[0] || rotation.x > limits.x[1]) {
    violations.push(`X-axis: ${rotation.x.toFixed(2)} outside [${limits.x[0].toFixed(2)}, ${limits.x[1].toFixed(2)}]`);
  }
  if (rotation.y < limits.y[0] || rotation.y > limits.y[1]) {
    violations.push(`Y-axis: ${rotation.y.toFixed(2)} outside [${limits.y[0].toFixed(2)}, ${limits.y[1].toFixed(2)}]`);
  }
  if (rotation.z < limits.z[0] || rotation.z > limits.z[1]) {
    violations.push(`Z-axis: ${rotation.z.toFixed(2)} outside [${limits.z[0].toFixed(2)}, ${limits.z[1].toFixed(2)}]`);
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

