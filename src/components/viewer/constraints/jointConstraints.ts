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
  tPoseOffset?: { x?: number; y?: number; z?: number }; // Where T-pose sits in anatomical space (in radians). Example: 57° means T-pose is 57° abducted
  anatomicalNeutral?: { x?: number; y?: number; z?: number }; // DEPRECATED: Use tPoseOffset instead
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
 * @deprecated ROM constraints are migrating to coordinate-level definitions (Phase 2).
 * This bone-level constraint system uses Euler angle limits and cannot represent:
 * - Scapulothoracic (ST) joint separation for shoulder
 * - Anatomically correct coordinate frames (q-space)
 * - Generalized coordinates matching OpenSim/Simbody standards
 * 
 * KEEP for reference: Clinical ROM values are validated and useful.
 * New system uses src/biomech/model/joints.ts with coordinate-level constraints.
 * See docs/LEGACY_CODE_CLEANUP.md for migration path.
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
      x: [deg(-45), deg(45)],  // Flexion/extension. Clinical (cervical combined): FLEX ~45°, EXT ~45-70°
      y: [deg(-80), deg(80)],  // Rotation (head turn). Clinical: ~60-80° each side
      z: [deg(-45), deg(45)]   // Lateral flexion. Clinical: ~45° each side (Physiopedia)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Cervical spine segment - high mobility compared to thoracic/lumbar. Clinical cervical ROM (combined): FLEX ~45°, EXT ~45-70°, ROT ~60-80°, LAT FLEX ~45°'
  },
  
  'mixamorig1Head': {
    boneName: 'mixamorig1Head',
    displayName: 'Head (Atlanto-occipital joint)',
    rotationLimits: {
      x: [deg(-45), deg(50)],  // Nod yes (flexion/extension). Clinical total flex/ext: ~90-110° combined
      y: [deg(-80), deg(80)],  // Shake no (rotation). Clinical: ~60-80° each side (adjusted from -75/+75)
      z: [deg(-45), deg(45)]   // Tilt (lateral flexion). Clinical: ~45° each side
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Head-neck junction (atlanto-occipital and atlantoaxial joints) - primary rotation joint for head. Clinical cervical ROM norms (Physiopedia): Total FLEX/EXT ~90-110°, ROT ~60-80° each side, LAT FLEX ~45° each side'
  },
  
  // ==================== LEFT ARM ====================
  
  'mixamorig1LeftShoulder': {
    boneName: 'mixamorig1LeftShoulder',
    displayName: 'Left Scapula (Scapulothoracic)',
    rotationLimits: {
      x: [deg(-35), deg(40)],   // Upward/downward rotation: -35° (depressed) to 40° (elevated) in anatomical space
      y: [deg(-35), deg(35)],   // Internal/external rotation (scapular plane adjustment)
      z: [deg(-40), deg(20)]    // Protraction/retraction: -40° (protracted) to 20° (retracted) in anatomical space (mirrored)
    },
    tPoseOffset: {
      x: deg(-20),  // T-pose IS at -20° in anatomical space (scapula depressed)
      z: deg(10)    // T-pose IS at 10° in anatomical space for left side (mirrored geometry)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Scapulothoracic joint - contributes ~60° to full overhead motion via scapulohumeral rhythm (2:1 GH:ST ratio). Upward rotation is primary contributor to abduction.'
  },
  
  'mixamorig1LeftArm': {
    boneName: 'mixamorig1LeftArm',
    displayName: 'Left Shoulder (Glenohumeral)',
    rotationLimits: {
      x: [deg(-30), deg(180)],  // X-axis: Abduction/adduction in T-pose space. Clinical: ABD ~180°, ADD ~30-40°
      y: [deg(-90), deg(90)],   // Y-axis: Internal/external rotation. Clinical: IR ~70-90°, ER ~90°
      z: [deg(-60), deg(180)]   // Z-axis: Flexion/extension. Clinical: FLEX ~180°, EXT ~60° (adjusted from -40)
    },
    tPoseOffset: {
      x: deg(90),  // T-pose: arms horizontal = 90° abduction anatomically
      y: deg(0),   // Rotation is neutral
      z: deg(0)    // Horizontal = 0° flexion (pure abduction plane)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Glenohumeral ball-and-socket joint - contributes ~120° to overhead motion. Works with scapula in 2:1 ratio (scapulohumeral rhythm): first 30° is pure GH, then 2° GH per 1° scapular rotation to 180° total elevation. Clinical norms (AAOS): FLEX ~180°, EXT ~60°, ABD ~180°, IR/ER ~70-90°'
  },
  
  'mixamorig1LeftForeArm': {
    boneName: 'mixamorig1LeftForeArm',
    displayName: 'Left Elbow',
    rotationLimits: {
      x: [deg(-10), deg(150)],  // X-axis: Extension/hyperextension -10° to flexion 150° (AAOS/Norkin & White)
      y: [deg(-90), deg(90)],   // Y-axis: Pronation -90° to supination +90° (clinical norms)
      z: [deg(-15), deg(15)]    // Z-axis: Varus/valgus deviation ±15° (accounts for carrying angle variance)
    },
    tPoseOffset: {
      x: deg(0)  // T-pose IS at 0° extended (anatomical neutral)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Hinge joint with minimal hyperextension. Clinical ROM: FLEX ~145-150°, EXT 0° (with 5-10° hyperextension in some individuals). Forearm rotation (radio-ulnar): SUP/PRO ~80-90° each direction. Varus/valgus range includes structural carrying angle (10-15°) plus minimal functional deviation.'
  },
  
  'mixamorig1LeftHand': {
    boneName: 'mixamorig1LeftHand',
    displayName: 'Left Wrist',
    rotationLimits: {
      x: [deg(-70), deg(80)],  // Flexion/extension. Clinical: FLEX ~80°, EXT ~70° (Physiopedia)
      y: [deg(-10), deg(10)],  // Minimal rotation (handled by forearm pronation/supination)
      z: [deg(-20), deg(35)]   // Ulnar/radial deviation. Clinical: ULN DEV ~30-40°, RAD DEV ~20°
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Complex joint - primarily flexion/extension and ulnar/radial deviation. Clinical norms: FLEX ~80°, EXT ~70°, ULN DEV ~30-40°, RAD DEV ~20°'
  },
  
  // ==================== RIGHT ARM ====================
  
  'mixamorig1RightShoulder': {
    boneName: 'mixamorig1RightShoulder',
    displayName: 'Right Scapula (Scapulothoracic)',
    rotationLimits: {
      x: [deg(-35), deg(40)],   // Upward/downward rotation: -35° (depressed) to 40° (elevated) in anatomical space
      y: [deg(-35), deg(35)],   // Internal/external rotation (scapular plane adjustment)
      z: [deg(-20), deg(40)]    // Protraction/retraction: -20° (retracted) to 40° (protracted) in anatomical space
    },
    tPoseOffset: {
      x: deg(-20),  // T-pose IS at -20° in anatomical space (scapula depressed)
      z: deg(-10)   // T-pose IS at -10° in anatomical space (scapula retracted)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Scapulothoracic joint - contributes ~60° to full overhead motion via scapulohumeral rhythm (2:1 GH:ST ratio). Upward rotation is primary contributor to abduction.'
  },
  
  'mixamorig1RightArm': {
    boneName: 'mixamorig1RightArm',
    displayName: 'Right Shoulder (Glenohumeral)',
    rotationLimits: {
      x: [deg(-30), deg(180)],  // X-axis: Abduction/adduction in T-pose space. Clinical: ABD ~180°, ADD ~30-40°
      y: [deg(-90), deg(90)],   // Y-axis: Internal/external rotation. Clinical: IR ~70-90°, ER ~90°
      z: [deg(-60), deg(180)]   // Z-axis: Flexion/extension. Clinical: FLEX ~180°, EXT ~60° (adjusted from -40)
    },
    tPoseOffset: {
      x: deg(90),  // T-pose: arms horizontal = 90° abduction anatomically
      y: deg(0),   // Rotation is neutral
      z: deg(0)    // Horizontal = 0° flexion (pure abduction plane)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Glenohumeral ball-and-socket joint - contributes ~120° to overhead motion. Works with scapula in 2:1 ratio (scapulohumeral rhythm): first 30° is pure GH, then 2° GH per 1° scapular rotation to 180° total elevation. Clinical norms (AAOS): FLEX ~180°, EXT ~60°, ABD ~180°, IR/ER ~70-90°'
  },
  
  'mixamorig1RightForeArm': {
    boneName: 'mixamorig1RightForeArm',
    displayName: 'Right Elbow',
    rotationLimits: {
      x: [deg(-10), deg(150)],  // X-axis: Extension/hyperextension -10° to flexion 150° (AAOS/Norkin & White)
      y: [deg(-90), deg(90)],   // Y-axis: Pronation -90° to supination +90° (clinical norms)
      z: [deg(-15), deg(15)]    // Z-axis: Varus/valgus deviation ±15° (accounts for carrying angle variance)
    },
    tPoseOffset: {
      x: deg(0)  // T-pose IS at 0° extended (anatomical neutral)
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Hinge joint with minimal hyperextension. Clinical ROM: FLEX ~145-150°, EXT 0° (with 5-10° hyperextension in some individuals). Forearm rotation (radio-ulnar): SUP/PRO ~80-90° each direction. Varus/valgus range includes structural carrying angle (10-15°) plus minimal functional deviation.'
  },
  
  'mixamorig1RightHand': {
    boneName: 'mixamorig1RightHand',
    displayName: 'Right Wrist',
    rotationLimits: {
      x: [deg(-70), deg(80)],  // Flexion/extension. Clinical: FLEX ~80°, EXT ~70° (Physiopedia)
      y: [deg(-10), deg(10)],  // Minimal rotation (handled by forearm pronation/supination)
      z: [deg(-35), deg(20)]   // Ulnar/radial deviation (reversed for right side). Clinical: ULN DEV ~30-40°, RAD DEV ~20°
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Complex joint - primarily flexion/extension and ulnar/radial deviation. Clinical norms: FLEX ~80°, EXT ~70°, ULN DEV ~30-40°, RAD DEV ~20°'
  },
  
  // ==================== LEFT LEG ====================
  
  'mixamorig1LeftUpLeg': {
    boneName: 'mixamorig1LeftUpLeg',
    displayName: 'Left Hip',
    rotationLimits: {
      x: [deg(-30), deg(45)],   // X-axis: Abduction/adduction. Clinical (AAOS): ABD ~40-45°, ADD ~20-30°
      y: [deg(-45), deg(45)],   // Y-axis: Internal/external rotation. Clinical: IR ~35-40°, ER ~40-45°
      z: [deg(-20), deg(120)]   // Z-axis: Flexion/extension. Clinical: FLEX ~120°, EXT ~20° (adjusted from -30)
    },
    tPoseOffset: {
      z: deg(-171)  // T-pose IS at -171.3° on Z-axis in anatomical space
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - second most mobile joint after shoulder. Clinical norms (AAOS/Norkin & White): FLEX ~120°, EXT ~20°, ABD ~40-45°, ADD ~20-30°, IR ~35-40°, ER ~40-45°'
  },
  
  'mixamorig1LeftLeg': {
    boneName: 'mixamorig1LeftLeg',
    displayName: 'Left Knee',
    rotationLimits: {
      x: [deg(-135), deg(10)],  // Flexion ~135° (adjusted from -150), extension 0° with 5-10° hyperextension (clinical norms)
      y: [deg(-15), deg(15)],   // Tibial rotation (at ~90° flexion): Internal ~10°, External ~30-40° (conservative range)
      z: [deg(-10), deg(10)]    // Minimal valgus/varus
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint with slight rotation when flexed. Clinical ROM: FLEX ~135°, EXT 0° (with 5-10° hyperextension). Tibial rotation occurs primarily when knee is flexed ~90°: INT ~10°, EXT ~30-40°'
  },
  
  'mixamorig1LeftFoot': {
    boneName: 'mixamorig1LeftFoot',
    displayName: 'Left Ankle',
    rotationLimits: {
      x: [deg(-50), deg(20)],  // Plantarflexion/dorsiflexion. Clinical: DORSI ~20°, PLANT ~50° (adjusted from -45)
      y: [deg(-10), deg(10)],  // Minimal rotation
      z: [deg(-35), deg(20)]   // Inversion/eversion. Clinical (subtalar): INV ~20-35°, EVER ~10-20°
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Modified hinge joint - talocrural (dorsi/plantar) and subtalar (inv/ever). Clinical ROM (AAOS): Talocrural - DORSI ~20°, PLANT ~50°. Subtalar - INV ~20-35°, EVER ~10-20°'
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
      x: [deg(-30), deg(45)],   // X-axis: Abduction/adduction. Clinical (AAOS): ABD ~40-45°, ADD ~20-30°
      y: [deg(-45), deg(45)],   // Y-axis: Internal/external rotation. Clinical: IR ~35-40°, ER ~40-45°
      z: [deg(-20), deg(120)]   // Z-axis: Flexion/extension. Clinical: FLEX ~120°, EXT ~20° (adjusted from -30)
    },
    tPoseOffset: {
      z: deg(-174)  // T-pose IS at -173.9° on Z-axis in anatomical space
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 3,
    notes: 'Ball-and-socket joint - second most mobile joint after shoulder. Clinical norms (AAOS/Norkin & White): FLEX ~120°, EXT ~20°, ABD ~40-45°, ADD ~20-30°, IR ~35-40°, ER ~40-45°'
  },
  
  'mixamorig1RightLeg': {
    boneName: 'mixamorig1RightLeg',
    displayName: 'Right Knee',
    rotationLimits: {
      x: [deg(-135), deg(10)],  // Flexion ~135° (adjusted from -150), extension 0° with 5-10° hyperextension (clinical norms)
      y: [deg(-15), deg(15)],   // Tibial rotation (at ~90° flexion): Internal ~10°, External ~30-40° (conservative range)
      z: [deg(-10), deg(10)]    // Minimal valgus/varus
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 1,
    notes: 'Hinge joint with slight rotation when flexed. Clinical ROM: FLEX ~135°, EXT 0° (with 5-10° hyperextension). Tibial rotation occurs primarily when knee is flexed ~90°: INT ~10°, EXT ~30-40°'
  },
  
  'mixamorig1RightFoot': {
    boneName: 'mixamorig1RightFoot',
    displayName: 'Right Ankle',
    rotationLimits: {
      x: [deg(-50), deg(20)],  // Plantarflexion/dorsiflexion. Clinical: DORSI ~20°, PLANT ~50° (adjusted from -45)
      y: [deg(-10), deg(10)],  // Minimal rotation
      z: [deg(-35), deg(20)]   // Inversion/eversion. Clinical (subtalar): INV ~20-35°, EVER ~10-20°
    },
    translationLock: true,
    enabled: true,
    degreesOfFreedom: 2,
    notes: 'Modified hinge joint - talocrural (dorsi/plantar) and subtalar (inv/ever). Clinical ROM (AAOS): Talocrural - DORSI ~20°, PLANT ~50°. Subtalar - INV ~20-35°, EVER ~10-20°'
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

