import { SKELETON_MAP } from './skeletonMap';

/**
 * Anatomical movement labels for each joint type
 * Maps bone names to their primary, secondary, and tertiary movement axes
 */
export type MovementLabels = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export const JOINT_MOVEMENT_LABELS: Record<string, MovementLabels> = {
  // Spine
  [SKELETON_MAP.Spine]: {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  [SKELETON_MAP.Spine1]: {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  [SKELETON_MAP.Spine2]: {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  
  // Neck/Head
  [SKELETON_MAP.Neck]: {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Lat Bend'
  },
  [SKELETON_MAP.Head]: {
    primary: 'Nod',
    secondary: 'Turn',
    tertiary: 'Tilt'
  },
  
  // Left Arm
  [SKELETON_MAP.LeftShoulder]: {
    primary: 'Upward Rot',     // Scapular upward/downward rotation
    secondary: 'Scap Plane',   // Scapular plane adjustment
    tertiary: 'Pro/Retract'    // Protraction/retraction
  },
  [SKELETON_MAP.LeftArm]: {
    primary: 'Elevation',      // GH elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // GH internal/external rotation (twist)
    tertiary: 'Flex/Ext'       // GH flexion/extension component
  },
  [SKELETON_MAP.LeftForeArm]: {
    primary: 'Flex/Ext',
    secondary: 'Pro/Sup',
    tertiary: 'Deviation'
  },
  [SKELETON_MAP.LeftHand]: {
    primary: 'Flex/Ext',
    secondary: 'Twist',
    tertiary: 'Rad/Uln Dev'
  },
  
  // Right Arm
  [SKELETON_MAP.RightShoulder]: {
    primary: 'Upward Rot',     // Scapular upward/downward rotation
    secondary: 'Scap Plane',   // Scapular plane adjustment
    tertiary: 'Pro/Retract'    // Protraction/retraction
  },
  [SKELETON_MAP.RightArm]: {
    primary: 'Elevation',      // GH elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // GH internal/external rotation (twist)
    tertiary: 'Flex/Ext'       // GH flexion/extension component
  },
  [SKELETON_MAP.RightForeArm]: {
    primary: 'Flex/Ext',
    secondary: 'Pro/Sup',
    tertiary: 'Deviation'
  },
  [SKELETON_MAP.RightHand]: {
    primary: 'Flex/Ext',
    secondary: 'Twist',
    tertiary: 'Rad/Uln Dev'
  },
  
  // Left Leg
  [SKELETON_MAP.LeftUpLeg]: {
    primary: 'Elevation',      // Hip elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // Hip internal/external rotation
    tertiary: 'Flex/Ext'       // Hip flexion/extension component
  },
  [SKELETON_MAP.LeftLeg]: {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Valgus/Varus'
  },
  [SKELETON_MAP.LeftFoot]: {
    primary: 'Dorsi/Plant',
    secondary: 'Inv/Ever',
    tertiary: 'Rotation'
  },
  [SKELETON_MAP.LeftToeBase]: {
    primary: 'Flex/Ext',
    secondary: 'Deviation',
    tertiary: 'Twist'
  },
  
  // Right Leg
  [SKELETON_MAP.RightUpLeg]: {
    primary: 'Elevation',      // Hip elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // Hip internal/external rotation
    tertiary: 'Flex/Ext'       // Hip flexion/extension component
  },
  [SKELETON_MAP.RightLeg]: {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Valgus/Varus'
  },
  [SKELETON_MAP.RightFoot]: {
    primary: 'Plant/Dorsi',
    secondary: 'Rotation',
    tertiary: 'Inv/Ever'
  },
  [SKELETON_MAP.RightToeBase]: {
    primary: 'Flex/Ext',
    secondary: 'Deviation',
    tertiary: 'Twist'
  }
};

export const JOINT_HANDLE_NAMES = [
  SKELETON_MAP.LeftShoulder,
  SKELETON_MAP.LeftArm,
  SKELETON_MAP.LeftForeArm,
  SKELETON_MAP.LeftHand,
  SKELETON_MAP.RightShoulder,
  SKELETON_MAP.RightArm,
  SKELETON_MAP.RightForeArm,
  SKELETON_MAP.RightHand,
  SKELETON_MAP.LeftUpLeg,
  SKELETON_MAP.LeftLeg,
  SKELETON_MAP.LeftFoot,
  SKELETON_MAP.RightUpLeg,
  SKELETON_MAP.RightLeg,
  SKELETON_MAP.RightFoot,
  SKELETON_MAP.Spine,
  SKELETON_MAP.Spine1,
  SKELETON_MAP.Spine2,
  SKELETON_MAP.Neck,
  SKELETON_MAP.Head
];

export const DIAGNOSTIC_BONES = [
  SKELETON_MAP.RightArm,
  SKELETON_MAP.LeftArm,
  SKELETON_MAP.RightForeArm,
  SKELETON_MAP.LeftForeArm,
  SKELETON_MAP.RightUpLeg,
  SKELETON_MAP.LeftUpLeg,
  SKELETON_MAP.RightLeg,
  SKELETON_MAP.LeftLeg
];

export const SHOULDER_COORD_IDS = {
  right: {
    gh: ['gh_r_flexion', 'gh_r_abduction', 'gh_r_rotation'] as const,
    st: ['st_r_tilt', 'st_r_rotation', 'st_r_upward'] as const,
  },
  left: {
    gh: ['gh_l_flexion', 'gh_l_abduction', 'gh_l_rotation'] as const,
    st: ['st_l_tilt', 'st_l_rotation', 'st_l_upward'] as const,
  },
};

/**
 * Get biomech-consistent movement labels for display axes
 * Since we're using biomech system now:
 * - X axis = ABD/ADD (frontal plane)
 * - Y axis = Internal/External Rotation (transverse plane) 
 * - Z axis = FLEX/EXT (sagittal plane)
 */
export function getBiomechMovementLabel(boneName: string, axis: 'x' | 'y' | 'z'): string {
  // For major joints covered by biomech system
  if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
    // Shoulder/Humerus
    if (axis === 'x') return 'INT ROT/EXT ROT';
    if (axis === 'y') return 'FLEX/EXT';
    return 'ABD/ADD';
  }
  
  if (boneName.includes('UpLeg')) {
    // Hip/Femur
    if (axis === 'x') return 'ABD/ADD';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'FLEX/EXT';
  }
  
  if (boneName.includes('ForeArm')) {
    // Elbow/Forearm
    if (axis === 'x') return 'FLEX/EXT';              // Primary elbow motion
    if (axis === 'y') return 'PRONATION/SUPINATION';  // Forearm rotation
    return 'VARUS/VALGUS';                             // Carrying angle deviation
  }
  
  if (boneName.includes('Leg') && !boneName.includes('UpLeg')) {
    // Knee/Tibia
    if (axis === 'x') return 'VARUS/VALGUS';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'FLEX/EXT';
  }
  
  if (boneName.includes('Foot')) {
    // Ankle/Foot
    // X-axis: Inversion/Eversion (frontal plane - subtalar)
    // Y-axis: Internal/External Rotation (transverse plane)
    // Z-axis: Dorsiflexion/Plantarflexion (sagittal plane - talocrural)
    if (axis === 'x') return 'INVERSION/EVERSION';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'DORSIFLEXION/PLANTARFLEXION';
  }
  
  if (boneName.includes('Shoulder')) {
    // SC Joint (Clavicle)
    if (axis === 'x') return 'AXIAL ROT';
    if (axis === 'y') return 'PROTRACTION/RETRACTION';
    return 'ELEVATION/DEPRESSION';
  }
  
  // Fallback to old system for non-biomech joints
  const labels = JOINT_MOVEMENT_LABELS[boneName];
  if (!labels) return axis.toUpperCase();
  
  if (axis === 'x') return labels.primary;
  if (axis === 'y') return labels.secondary;
  return labels.tertiary;
}

export function getDisplayAnglesFromBiomech(
  boneName: string,
  biomechAngles: { flexExt: number; abdAdd: number; rotation: number }
): { x: number; y: number; z: number } {
  if (boneName.includes('ForeArm')) {
    // Elbow has different axis mapping
    return {
      x: biomechAngles.flexExt,      // FLEX/EXT (primary elbow motion)
      y: biomechAngles.rotation,     // PRONATION/SUPINATION
      z: biomechAngles.abdAdd        // VARUS/VALGUS (carrying angle)
    };
  } else if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
    // Shoulder/Humerus - Updated mapping for ZXY order
    return {
      x: biomechAngles.rotation,     // X = Rotation
      y: biomechAngles.flexExt,      // Y = Flexion
      z: biomechAngles.abdAdd        // Z = Abduction
    };
  } else if (boneName.includes('Shoulder')) {
    // SC Joint (Clavicle)
    // X=Axial, Y=Protraction, Z=Elevation
    return {
      x: biomechAngles.flexExt,      // Mapped to X in jointAngles.ts (needs verification)
      y: biomechAngles.rotation,     // Mapped to Y
      z: biomechAngles.abdAdd        // Mapped to Z
    };
  } else {
    // Standard mapping for hip, knee, ankle
    return {
      x: biomechAngles.abdAdd,       // ABD/ADD
      y: biomechAngles.rotation,     // Internal/External rotation
      z: biomechAngles.flexExt       // FLEX/EXT
    };
  }
}

export function getClinicalAngleLimits(boneName: string, axis: 'x' | 'y' | 'z'): { min: number; max: number } {
  let minAngle = -180;
  let maxAngle = 180;
  
  // Customize based on joint and axis
  if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
    // Shoulder/Humerus - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -90; maxAngle = 90; }   // INT ROT -90° to EXT ROT +90°
    if (axis === 'y') { minAngle = -60; maxAngle = 180; }  // FLEX 0-180°, EXT 0-60°
    if (axis === 'z') { minAngle = -45; maxAngle = 180; }  // ABD 0-180°, ADD 0-45°
  } else if (boneName.includes('Shoulder')) {
    // SC Joint (Clavicle)
    if (axis === 'x') { minAngle = -45; maxAngle = 45; }   // Axial Rotation
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // Protraction/Retraction
    if (axis === 'z') { minAngle = -10; maxAngle = 45; }   // Elevation/Depression
  } else if (boneName.includes('UpLeg')) {
    // Hip/Femur - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -30; maxAngle = 45; }   // ABD 0-45°, ADD 0-30°
    if (axis === 'y') { minAngle = -45; maxAngle = 45; }   // INT ROT -45° to EXT ROT +45°
    if (axis === 'z') { minAngle = -30; maxAngle = 120; }  // FLEX 0-120°, EXT 0-30°
  } else if (boneName.includes('ForeArm')) {
    // Elbow/Forearm - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = 0; maxAngle = 150; }    // FLEX 0-150°
    if (axis === 'y') { minAngle = -80; maxAngle = 80; }   // PRON -80° to SUP +80°
    if (axis === 'z') { minAngle = -15; maxAngle = 15; }   // VARUS/VALGUS carrying angle ±15°
  } else if (boneName.includes('Leg') && !boneName.includes('UpLeg')) {
    // Knee/Tibia - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -10; maxAngle = 10; }   // VARUS/VALGUS deviation ±10°
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // Tibial INT/EXT ROT ±30°
    if (axis === 'z') { minAngle = 0; maxAngle = 135; }    // FLEX 0-135°
  } else if (boneName.includes('Foot')) {
    // Ankle/Foot - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -15; maxAngle = 35; }   // INVERSION 0-35°, EVERSION 0-15°
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // INT/EXT ROT ±30°
    if (axis === 'z') { minAngle = -50; maxAngle = 20; }   // DORSI 0-20°, PLANTAR 0-50°
  }
  
  return { min: minAngle, max: maxAngle };
}
