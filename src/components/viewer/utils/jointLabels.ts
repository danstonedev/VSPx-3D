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
    if (axis === 'x') return 'PRONATION/SUPINATION';  // X = Pronation (Long axis)
    if (axis === 'y') return 'VARUS/VALGUS';          // Y = Varus/Valgus (Deviation)
    return 'FLEX/EXT';                                // Z = Flexion (Hinge)
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
    if (axis === 'x') return 'EVERSION/INVERSION';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'DORSIFLEXION/PLANTARFLEXION';
  }

  if (boneName.includes('Shoulder')) {
    // SC Joint (Clavicle)
    if (axis === 'x') return 'AXIAL ROT';
    if (axis === 'y') return 'PROTRACTION/RETRACTION';
    return 'ELEVATION/DEPRESSION';
  }

  if (boneName.includes('Hand')) {
    // Wrist
    if (axis === 'x') return 'FLEX/EXT';
    if (axis === 'y') return 'PRONATION/SUPINATION'; // Passive rotation
    return 'RADIAL/ULNAR DEV';
  }

  if (boneName.includes('Spine') || boneName.includes('Neck') || boneName.includes('Head')) {
    // Spine/Neck/Head
    if (axis === 'x') return 'FLEX/EXT';
    if (axis === 'y') return 'AXIAL ROT';
    return 'LATERAL BEND';
  }

  if (boneName.includes('Toe')) {
    // Toes
    if (axis === 'x') return 'FLEX/EXT';
    return 'DEVIATION';
  }

  if (boneName.includes('Thumb') || boneName.includes('Index') || boneName.includes('Middle') || boneName.includes('Ring') || boneName.includes('Pinky')) {
    // Fingers
    if (axis === 'x') return 'FLEX/EXT';
    if (axis === 'z') return 'ABD/ADD';
    return 'ROTATION';
  }

  return axis.toUpperCase();
}

export function getDisplayAnglesFromBiomech(
  boneName: string,
  biomechAngles: { flexExt: number; abdAdd: number; rotation: number }
): { x: number; y: number; z: number } {
  if (boneName.includes('ForeArm')) {
    // Elbow has different axis mapping (Z=Flex, X=Pron, Y=Varus)
    return {
      x: biomechAngles.rotation,     // PRONATION/SUPINATION
      y: biomechAngles.abdAdd,       // VARUS/VALGUS (carrying angle)
      z: biomechAngles.flexExt       // FLEX/EXT (primary elbow motion)
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
  } else if (boneName.includes('Hand') || boneName.includes('Spine') || boneName.includes('Neck') || boneName.includes('Head')) {
    // Wrist and Spine (X=Flexion, Y=Rotation, Z=Deviation/Bend)
    return {
      x: biomechAngles.flexExt,      // X = Flexion
      y: biomechAngles.rotation,     // Y = Rotation
      z: biomechAngles.abdAdd        // Z = Deviation/Bend
    };
  } else if (boneName.includes('Toe')) {
    // Toes (X=Flexion)
    return {
      x: biomechAngles.flexExt,
      y: biomechAngles.rotation,
      z: biomechAngles.abdAdd
    };
  } else if (boneName.includes('Thumb') || boneName.includes('Index') || boneName.includes('Middle') || boneName.includes('Ring') || boneName.includes('Pinky')) {
    // Fingers (X=Flexion, Z=Abd/Add)
    return {
      x: biomechAngles.flexExt,
      y: biomechAngles.rotation,
      z: biomechAngles.abdAdd
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
    if (axis === 'x') { minAngle = -90; maxAngle = 90; }   // INT ROT -90 to EXT ROT +90
    if (axis === 'y') { minAngle = -60; maxAngle = 180; }  // FLEX 0-180, EXT 0-60
    if (axis === 'z') { minAngle = -45; maxAngle = 180; }  // ABD 0-180, ADD 0-45
  } else if (boneName.includes('Shoulder')) {
    // SC Joint (Clavicle)
    if (axis === 'x') { minAngle = -45; maxAngle = 45; }   // Axial Rotation
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // Protraction/Retraction
    if (axis === 'z') { minAngle = -10; maxAngle = 45; }   // Elevation/Depression
  } else if (boneName.includes('UpLeg')) {
    // Hip/Femur - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -30; maxAngle = 45; }   // ABD 0-45, ADD 0-30
    if (axis === 'y') { minAngle = -45; maxAngle = 45; }   // INT ROT -45 to EXT ROT +45
    if (axis === 'z') { minAngle = -30; maxAngle = 120; }  // FLEX 0-120, EXT 0-30
  } else if (boneName.includes('ForeArm')) {
    // Elbow/Forearm - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -80; maxAngle = 80; }   // PRON -80 to SUP +80
    if (axis === 'y') { minAngle = -15; maxAngle = 15; }   // VARUS/VALGUS carrying angle +/-15
    if (axis === 'z') { minAngle = 0; maxAngle = 150; }    // FLEX 0-150
  } else if (boneName.includes('Leg') && !boneName.includes('UpLeg')) {
    // Knee/Tibia - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -10; maxAngle = 10; }   // VARUS/VALGUS deviation +/-10
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // Tibial INT/EXT ROT +/-30
    if (axis === 'z') { minAngle = 0; maxAngle = 135; }    // FLEX 0-135
  } else if (boneName.includes('Foot')) {
    // Ankle/Foot - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -15; maxAngle = 35; }   // INVERSION 0-35, EVERSION 0-15
    if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // INT/EXT ROT +/-30
    if (axis === 'z') { minAngle = -50; maxAngle = 20; }   // DORSI 0-20, PLANTAR 0-50
  } else if (boneName.includes('Hand')) {
    // Wrist - AAOS clinical ROM standards
    if (axis === 'x') { minAngle = -70; maxAngle = 80; }   // EXT 0-70, FLEX 0-80
    if (axis === 'y') { minAngle = -10; maxAngle = 10; }   // Passive rotation
    if (axis === 'z') { minAngle = -20; maxAngle = 30; }   // RAD 0-20, ULN 0-30
  } else if (boneName.includes('Spine') || boneName.includes('Neck') || boneName.includes('Head')) {
    // Spine - General limits
    if (axis === 'x') { minAngle = -30; maxAngle = 60; }   // Flex/Ext
    if (axis === 'y') { minAngle = -45; maxAngle = 45; }   // Rotation
    if (axis === 'z') { minAngle = -35; maxAngle = 35; }   // Bending
  } else if (boneName.includes('Toe')) {
    // Toes
    if (axis === 'x') { minAngle = -45; maxAngle = 90; }
  } else if (boneName.includes('Thumb') || boneName.includes('Index') || boneName.includes('Middle') || boneName.includes('Ring') || boneName.includes('Pinky')) {
    // Fingers
    if (axis === 'x') { minAngle = -10; maxAngle = 90; }
    if (axis === 'z') { minAngle = -20; maxAngle = 20; }
  }

  return { min: minAngle, max: maxAngle };
}
