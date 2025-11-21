/**
 * Biomechanical Joint Angle System
 * 
 * Provides teaching-oriented joint coordinate systems (JCS) for key joints.
 * Computes angles from distal segment orientation relative to proximal segment,
 * using a neutral reference pose so that neutral ≈ 0° on all axes.
 * 
 * This is a TEACHING-ORIENTED JCS, not a full Grood–Suntay implementation.
 * Designed to give students biomechanically meaningful angles that match
 * clinical terminology and measurement conventions.
 * 
 * Key Principles:
 * - Angles are computed from segment-to-segment relationships, not local bone Euler angles
 * - Neutral pose (T-pose) serves as anatomical zero reference
 * - Axis conventions follow clinical norms:
 *   - Flexion/Extension: Movement in sagittal plane
 *   - Abduction/Adduction: Movement in frontal plane
 *   - Internal/External Rotation: Movement in transverse plane
 * 
 * NOTE: These angles are FOR DISPLAY ONLY (e.g., "BiomechAngles").
 * They are DISTINCT from the rig-based angles used for constraints.
 */

import * as THREE from 'three';
import { SKELETON_MAP } from '../utils/skeletonMap';

export type JointSide = 'left' | 'right' | 'center';

export type BiomechJointId =
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'shoulder'
  | 'sc'
  | 'elbow'
  | 'wrist'
  | 'lumbar'
  | 'thoracic'
  | 'thoracic_upper'
  | 'cervical'
  | 'head'
  | 'mtp'
  | 'thumb_cmc'
  | 'finger_mcp';

/**
 * Biomechanically meaningful joint angles expressed in degrees.
 * These match clinical measurement conventions.
 */
export interface BiomechJointAngles {
  /** Flexion (+) / extension (–) in degrees */
  flexExt: number;
  /** Abduction (+) / adduction (–) or analogous frontal-plane motion in degrees */
  abdAdd: number;
  /** Internal (+) / external (–) rotation (axial) in degrees */
  rotation: number;
}

/**
 * Offset in degrees to convert from T-pose to true anatomical neutral.
 * T-pose is a rigging convenience, NOT anatomical neutral.
 * 
 * Example: Shoulder in T-pose has ~90° abduction. To get anatomical neutral
 * (arms at sides = 0° abduction), we need to subtract 90° from the abd/add axis.
 */
export interface TPoseOffset {
  /** Offset for flexion/extension axis (degrees) */
  flexExt: number;
  /** Offset for abduction/adduction axis (degrees) */
  abdAdd: number;
  /** Offset for internal/external rotation axis (degrees) */
  rotation: number;
}

/**
 * Configuration for a biomechanical joint, defining which bones
 * constitute proximal and distal segments and how to decompose
 * their relative orientation.
 */
export interface JointConfig {
  id: BiomechJointId;
  side: JointSide;
  proximalBoneName: string;
  distalBoneName: string;
  /** Euler order used to decompose the joint-relative quaternion */
  eulerOrder: THREE.EulerOrder;
  /**
   * Optional T-pose offset: the angular difference between T-pose and anatomical neutral.
   * If provided, biomech angles will be corrected so that anatomical neutral reads 0°.
   * If omitted, T-pose is assumed to BE anatomical neutral (e.g., for legs/knees).
   */
  tPoseOffset?: TPoseOffset;
}

/**
 * Joint segment mapping for the Manny / Mixamo rig.
 * These names must match the bone.name values in your skeleton.
 * 
 * IMPORTANT: Proximal vs Distal
 * - Proximal = closer to trunk/core
 * - Distal = farther from trunk/core
 * 
 * Examples:
 * - Hip: Pelvis (proximal) → Femur (distal)
 * - Knee: Femur (proximal) → Tibia (distal)
 * - Shoulder: Spine/Scapula (proximal) → Humerus (distal)
 */
export const JOINT_CONFIGS: JointConfig[] = [
  // ==================== HIPS ====================
  // Hip: pelvis → femur
  // Clinical ROM (AAOS/Norkin & White):
  // - Flexion: ~120°, Extension: ~20°
  // - Abduction: ~40-45°, Adduction: ~20-30°
  // - Internal rotation: ~35-40°, External rotation: ~40-45°
  {
    id: 'hip',
    side: 'left',
    proximalBoneName: SKELETON_MAP.Hips,
    distalBoneName: SKELETON_MAP.LeftUpLeg,
    eulerOrder: 'XZY',
  },
  {
    id: 'hip',
    side: 'right',
    proximalBoneName: SKELETON_MAP.Hips,
    distalBoneName: SKELETON_MAP.RightUpLeg,
    eulerOrder: 'XZY',
  },

  // ==================== KNEES ====================
  // Knee: femur → tibia
  // Clinical ROM:
  // - Flexion: ~135°, Extension: 0° (some: 5-10° hyperextension)
  // - Tibial rotation (at ~90° flexion): Internal ~10°, External ~30-40°
  {
    id: 'knee',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftUpLeg,
    distalBoneName: SKELETON_MAP.LeftLeg,
    eulerOrder: 'XZY',
  },
  {
    id: 'knee',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightUpLeg,
    distalBoneName: SKELETON_MAP.RightLeg,
    eulerOrder: 'XZY',
  },

  // ==================== ANKLES ====================
  // Ankle: tibia → foot
  // Clinical ROM:
  // - Talocrural: Dorsiflexion ~20°, Plantarflexion ~50°
  // - Subtalar: Inversion ~20-35°, Eversion ~10-20°
  {
    id: 'ankle',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftLeg,
    distalBoneName: SKELETON_MAP.LeftFoot,
    eulerOrder: 'XYZ',
  },
  {
    id: 'ankle',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightLeg,
    distalBoneName: SKELETON_MAP.RightFoot,
    eulerOrder: 'XYZ',
  },

  // ==================== SHOULDERS (SC + GH) ====================

  // Sternoclavicular (SC): thorax → clavicle/scapula
  // Controls the entire shoulder girdle motion
  {
    id: 'sc',
    side: 'left',
    proximalBoneName: SKELETON_MAP.Spine2,
    distalBoneName: SKELETON_MAP.LeftShoulder,
    eulerOrder: 'XYZ', // Standard order for clavicle
  },
  {
    id: 'sc',
    side: 'right',
    proximalBoneName: SKELETON_MAP.Spine2,
    distalBoneName: SKELETON_MAP.RightShoulder,
    eulerOrder: 'XYZ', // Standard order for clavicle
  },

  // Glenohumeral (GH): scapula → humerus
  // Clinical ROM:
  // - Flexion: ~180°, Extension: ~60°
  // - Abduction: ~180°, Adduction: ~30-40° across midline
  // - Internal rotation: ~70-90°, External rotation: ~90°
  {
    id: 'shoulder',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftShoulder, // Updated to use Scapula/Clavicle as parent
    distalBoneName: SKELETON_MAP.LeftArm,
    eulerOrder: 'ZXY',
    // No tPoseOffset needed - axis mapping handles it correctly
  },
  {
    id: 'shoulder',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightShoulder, // Updated to use Scapula/Clavicle as parent
    distalBoneName: SKELETON_MAP.RightArm,
    eulerOrder: 'ZXY',
    // No tPoseOffset needed - axis mapping handles it correctly
  },

  // ==================== ELBOWS ====================
  // Elbow: humerus → forearm
  // Clinical ROM:
  // - Flexion: ~145-150°, Extension: 0° (with possible 5-10° hyperextension)
  // - Forearm (radio-ulnar): Supination ~80-90°, Pronation ~80-90°
  {
    id: 'elbow',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftArm,
    distalBoneName: SKELETON_MAP.LeftForeArm,
    eulerOrder: 'ZXY',
  },
  {
    id: 'elbow',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightArm,
    distalBoneName: SKELETON_MAP.RightForeArm,
    eulerOrder: 'ZXY',
  },

  // ==================== WRISTS ====================
  // Wrist: forearm → hand
  // Clinical ROM:
  // - Flexion: ~80°, Extension: ~70°
  // - Radial Deviation: ~20°, Ulnar Deviation: ~30°
  {
    id: 'wrist',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftForeArm,
    distalBoneName: SKELETON_MAP.LeftHand,
    eulerOrder: 'XYZ',
  },
  {
    id: 'wrist',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightForeArm,
    distalBoneName: SKELETON_MAP.RightHand,
    eulerOrder: 'XYZ',
  },

  // ==================== SPINE ====================
  // Spine segments mapped to Mixamo bones
  {
    id: 'lumbar',
    side: 'center',
    proximalBoneName: SKELETON_MAP.Hips, // Pelvis
    distalBoneName: SKELETON_MAP.Spine,  // Lumbar
    eulerOrder: 'XYZ',
  },
  {
    id: 'thoracic',
    side: 'center',
    proximalBoneName: SKELETON_MAP.Spine, // Lumbar
    distalBoneName: SKELETON_MAP.Spine1,  // Lower Thoracic
    eulerOrder: 'XYZ',
  },
  {
    id: 'thoracic_upper',
    side: 'center',
    proximalBoneName: SKELETON_MAP.Spine1, // Lower Thoracic
    distalBoneName: SKELETON_MAP.Spine2,   // Thorax
    eulerOrder: 'XYZ',
  },
  {
    id: 'cervical',
    side: 'center',
    proximalBoneName: SKELETON_MAP.Spine2, // Thorax
    distalBoneName: SKELETON_MAP.Neck,     // Neck
    eulerOrder: 'XYZ',
  },
  {
    id: 'head',
    side: 'center',
    proximalBoneName: SKELETON_MAP.Neck,
    distalBoneName: SKELETON_MAP.Head,
    eulerOrder: 'XYZ',
  },

  // ==================== TOES (MTP) ====================
  {
    id: 'mtp',
    side: 'left',
    proximalBoneName: SKELETON_MAP.LeftFoot,
    distalBoneName: SKELETON_MAP.LeftToeBase,
    eulerOrder: 'XYZ',
  },
  {
    id: 'mtp',
    side: 'right',
    proximalBoneName: SKELETON_MAP.RightFoot,
    distalBoneName: SKELETON_MAP.RightToeBase,
    eulerOrder: 'XYZ',
  },

  // ==================== FINGERS (Right) ====================
  { id: 'thumb_cmc', side: 'right', proximalBoneName: SKELETON_MAP.RightHand, distalBoneName: SKELETON_MAP.RightHandThumb1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'right', proximalBoneName: SKELETON_MAP.RightHand, distalBoneName: SKELETON_MAP.RightHandIndex1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'right', proximalBoneName: SKELETON_MAP.RightHand, distalBoneName: SKELETON_MAP.RightHandMiddle1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'right', proximalBoneName: SKELETON_MAP.RightHand, distalBoneName: SKELETON_MAP.RightHandRing1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'right', proximalBoneName: SKELETON_MAP.RightHand, distalBoneName: SKELETON_MAP.RightHandPinky1, eulerOrder: 'XYZ' },

  // ==================== FINGERS (Left) ====================
  { id: 'thumb_cmc', side: 'left', proximalBoneName: SKELETON_MAP.LeftHand, distalBoneName: SKELETON_MAP.LeftHandThumb1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'left', proximalBoneName: SKELETON_MAP.LeftHand, distalBoneName: SKELETON_MAP.LeftHandIndex1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'left', proximalBoneName: SKELETON_MAP.LeftHand, distalBoneName: SKELETON_MAP.LeftHandMiddle1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'left', proximalBoneName: SKELETON_MAP.LeftHand, distalBoneName: SKELETON_MAP.LeftHandRing1, eulerOrder: 'XYZ' },
  { id: 'finger_mcp', side: 'left', proximalBoneName: SKELETON_MAP.LeftHand, distalBoneName: SKELETON_MAP.LeftHandPinky1, eulerOrder: 'XYZ' },
];

/**
 * Internal store of neutral joint-relative quaternions.
 * These are captured from the skeleton in the neutral (T-pose) position.
 * This makes neutral pose = 0° for all biomech angles.
 */
const jointNeutralRelativeQuat = new Map<string, THREE.Quaternion>();

/**
 * Global cache storing the neutral T-pose quaternion for EVERY bone in the skeleton.
 * This ensures we have reference data for all bones, not just the predefined joints.
 * 
 * Key: bone.name
 * Value: World-space quaternion of the bone in T-pose
 */
const boneNeutralWorldQuat = new Map<string, THREE.Quaternion>();

function jointKey(id: BiomechJointId, side: JointSide): string {
  return `${id}:${side}`;
}

function deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Find a bone by name on the given skeleton.
 */
export function findBoneByName(
  skeleton: THREE.Skeleton,
  name: string
): THREE.Bone | null {
  return skeleton.bones.find((b) => b.name === name) ?? null;
}

/**
 * Compute distal orientation relative to proximal orientation in world space.
 * 
 * q_rel = inverse(q_proximal) * q_distal
 * 
 * This gives the orientation of the distal segment in the proximal segment's
 * coordinate frame, which is the basis for joint coordinate systems.
 */
export function computeJointRelativeQuaternion(
  proximal: THREE.Bone,
  distal: THREE.Bone
): THREE.Quaternion {
  const qProx = new THREE.Quaternion();
  const qDist = new THREE.Quaternion();

  proximal.getWorldQuaternion(qProx);
  distal.getWorldQuaternion(qDist);

  return qProx.invert().multiply(qDist);
}

/**
 * Capture the "neutral" joint-relative quaternions for all configured joints.
 * 
 * Call this once while the skeleton is in its intended neutral (T-pose) calibration pose.
 * This will cause biomech angles to be expressed relative to that neutral pose (≈ 0°).
 * 
 * CRITICAL: This must be called AFTER the skeleton is loaded and in T-pose,
 * at the same time as captureConstraintReferencePose().
 * 
 * This function captures TWO levels of neutral pose data:
 * 1. Joint-relative quaternions for the predefined biomech joints (hip, knee, etc.)
 * 2. World-space quaternions for ALL bones in the skeleton
 */
export function captureJointNeutralPose(skeleton: THREE.Skeleton): void {
  jointNeutralRelativeQuat.clear();
  boneNeutralWorldQuat.clear();

  // 1. Capture world-space neutral pose for ALL bones
  skeleton.bones.forEach(bone => {
    bone.updateWorldMatrix(true, false);
    const worldQuat = new THREE.Quaternion();
    bone.getWorldQuaternion(worldQuat);
    boneNeutralWorldQuat.set(bone.name, worldQuat.clone());
  });

  // 2. Capture joint-relative neutral pose for predefined biomech joints
  for (const cfg of JOINT_CONFIGS) {
    const prox = findBoneByName(skeleton, cfg.proximalBoneName);
    const dist = findBoneByName(skeleton, cfg.distalBoneName);

    if (!prox || !dist) {
      console.warn(`⚠️ Could not find bones for ${cfg.id} ${cfg.side}: ${cfg.proximalBoneName} → ${cfg.distalBoneName}`);
      continue;
    }

    const rel = computeJointRelativeQuaternion(prox, dist);
    jointNeutralRelativeQuat.set(jointKey(cfg.id, cfg.side), rel);
  }

  console.log(`✅ Captured biomech neutral pose: ${boneNeutralWorldQuat.size} bones, ${jointNeutralRelativeQuat.size} predefined joints`);
}

/**
 * Clear the neutral pose cache.
 * Use this when reloading a model or switching characters.
 */
export function clearJointNeutralPose(): void {
  jointNeutralRelativeQuat.clear();
  boneNeutralWorldQuat.clear();
}

/**
 * Check if neutral pose has been captured for a specific joint.
 */
export function hasNeutralPose(id: BiomechJointId, side: JointSide): boolean {
  return jointNeutralRelativeQuat.has(jointKey(id, side));
}

/**
 * Check if neutral pose has been captured for a specific bone.
 */
export function hasBoneNeutralPose(boneName: string): boolean {
  return boneNeutralWorldQuat.has(boneName);
}

/**
 * Get the neutral world-space quaternion for a bone.
 * Returns undefined if not captured.
 */
export function getBoneNeutralWorldQuat(boneName: string): THREE.Quaternion | undefined {
  return boneNeutralWorldQuat.get(boneName);
}

/**
 * Get the count of captured neutral poses.
 */
export function getNeutralPoseCounts(): { bones: number; joints: number } {
  return {
    bones: boneNeutralWorldQuat.size,
    joints: jointNeutralRelativeQuat.size,
  };
}

/**
 * Convert a joint-relative quaternion into raw Euler angles (radians)
 * using the joint's chosen Euler order.
 */
export function quaternionToJointEuler(
  qRel: THREE.Quaternion,
  order: THREE.EulerOrder
): THREE.Euler {
  const e = new THREE.Euler();
  e.setFromQuaternion(qRel, order);
  e.order = order;
  return e;
}

/**
 * Map Euler axes to biomech angles for a given joint.
 * 
 * By convention in this project:
 *  - X: flexion (+) / extension (–)
 *  - Y: axial rotation (internal + / external –)
 *  - Z: abduction (+) / adduction (–) or analogous frontal-plane motion
 * 
 * NOTE: If visual testing shows an axis flipped (e.g., flexion is negative),
 * adjust sign or swap components here per joint.
 * 
 * This is where you customize the mapping to match your rig's conventions.
 */
export function mapEulerToBiomech(
  jointId: BiomechJointId,
  side: JointSide,
  euler: THREE.Euler,
  tPoseOffset?: TPoseOffset
): BiomechJointAngles {
  // Base mapping for now. Customize per joint/side if needed.
  let flexExt = deg(euler.x);
  let abdAdd = deg(euler.z);
  let rotation = deg(euler.y);

  // SHOULDER: Special axis mapping due to rig conventions
  // Based on T-pose logs showing RightArm x=56.5° (large value = abduction axis)
  // For shoulders, X-axis represents abduction/adduction in this rig
  // BUT: need to negate axes to match clinical convention
  if (jointId === 'shoulder') {
    flexExt = deg(euler.y);    // Y = flexion/extension (Index 1 in ZXY)
    abdAdd = -deg(euler.z);    // Z = abduction/adduction (Index 2 in ZXY) - Negated for clinical sign
    rotation = deg(euler.x);   // X = rotation (Index 0 in ZXY)
  } else if (jointId === 'elbow') {
    // ELBOW: Flexion is Z-axis (per corrected joints.ts config)
    // Right Elbow: Flexion is -Z (requires inversion)
    // Left Elbow: Flexion is +Z (no inversion)
    if (side === 'right') {
      flexExt = -deg(euler.z);
    } else {
      flexExt = deg(euler.z);
    }
    abdAdd = deg(euler.y);     // Y = varus/valgus (carrying angle)
    rotation = deg(euler.x);   // X = pronation/supination
  }

  // Apply T-pose offset correction to convert from T-pose to anatomical neutral
  if (tPoseOffset) {
    flexExt += tPoseOffset.flexExt;
    abdAdd += tPoseOffset.abdAdd;
    rotation += tPoseOffset.rotation;
  }

  // Joint-specific sign corrections to match clinical conventions

  // KNEE: Clinical convention is extension = 0°, flexion = positive (0° to 135°)
  // But in most rigs, bending the knee produces negative rotation
  // Flip the sign so that bent knee = positive flexion angle
  if (jointId === 'knee') {
    flexExt = -flexExt;
  }

  // Example: For right side joints, you *might* want to flip frontal-plane sign.
  // Uncomment/tune after visual QA:
  //
  // if (side === 'right') {
  //   abdAdd = -abdAdd;
  // }

  // Prevent unused variable warnings while keeping parameters for future customization
  void side;

  return {
    flexExt,
    abdAdd,
    rotation,
  };
}

/**
 * Compute biomechanical joint angles for a given joint configuration on a skeleton.
 * 
 * Returns null if the bones cannot be found or if neutral pose hasn't been captured.
 * 
 * @param skeleton - The skeleton containing the bones
 * @param cfg - Joint configuration defining proximal/distal segments
 * @returns Biomech angles or null if unavailable
 */
export function computeBiomechAnglesForConfig(
  skeleton: THREE.Skeleton,
  cfg: JointConfig
): BiomechJointAngles | null {
  const proximal = findBoneByName(skeleton, cfg.proximalBoneName);
  const distal = findBoneByName(skeleton, cfg.distalBoneName);
  if (!proximal || !distal) return null;

  // Current relative orientation
  const qRel = computeJointRelativeQuaternion(proximal, distal);

  // Subtract neutral if available
  const key = jointKey(cfg.id, cfg.side);
  const qNeutral = jointNeutralRelativeQuat.get(key);

  if (!qNeutral) {
    // Fallback: if no neutral pose captured, assume current pose is neutral (0°)
    // This prevents crashes when UI updates before capture is complete
    // console.warn(`⚠️ No neutral pose captured for ${cfg.id} ${cfg.side}. Call captureJointNeutralPose() first.`);
    const currentRel = computeJointRelativeQuaternion(proximal, distal);
    jointNeutralRelativeQuat.set(key, currentRel);
    return mapEulerToBiomech(cfg.id, cfg.side, new THREE.Euler(0, 0, 0, cfg.eulerOrder), cfg.tPoseOffset);
  }

  const qDelta = qNeutral.clone().invert().multiply(qRel);

  const euler = quaternionToJointEuler(qDelta, cfg.eulerOrder);
  return mapEulerToBiomech(cfg.id, cfg.side, euler, cfg.tPoseOffset);
}

/**
 * Convenience: compute biomech angles for a specific joint by id + side.
 * 
 * @param skeleton - The skeleton
 * @param jointId - Type of joint (hip, knee, ankle, shoulder, elbow)
 * @param side - Left or right
 * @returns Biomech angles or null if unavailable
 */
export function computeBiomechAngles(
  skeleton: THREE.Skeleton,
  jointId: BiomechJointId,
  side: JointSide
): BiomechJointAngles | null {
  const cfg = JOINT_CONFIGS.find(
    (c) => c.id === jointId && c.side === side
  );
  if (!cfg) return null;
  return computeBiomechAnglesForConfig(skeleton, cfg);
}

/**
 * Given a selected bone, try to infer which joint it belongs to and
 * compute biomech angles for that joint.
 * 
 * This is handy for RangeOfMotionPanel: pass in the skeleton + selectedBone.
 * 
 * @param skeleton - The skeleton
 * @param selectedBone - The bone that was selected/clicked
 * @returns Joint info and angles, or null if not a recognized joint
 */
export function computeBiomechAnglesForSelectedBone(
  skeleton: THREE.Skeleton,
  selectedBone: THREE.Bone
): { jointId: BiomechJointId; side: JointSide; angles: BiomechJointAngles } | null {
  // Use distal bone mapping: if the selected bone is the distal segment of a known joint, return that.
  const cfg = JOINT_CONFIGS.find(
    (c) => c.distalBoneName === selectedBone.name
  );
  if (!cfg) return null;

  const angles = computeBiomechAnglesForConfig(skeleton, cfg);
  if (!angles) return null;

  return {
    jointId: cfg.id,
    side: cfg.side,
    angles,
  };
}

/**
 * Get a human-readable label for the joint.
 * 
 * Examples: "Left Hip", "Right Knee", "Left Shoulder"
 */
export function getJointLabel(id: BiomechJointId, side: JointSide): string {
  const jointLabel = id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' ');
  
  if (side === 'center') {
    return jointLabel;
  }
  
  const sideLabel = side === 'left' ? 'Left' : 'Right';
  return `${sideLabel} ${jointLabel}`;
}

/**
 * Get all configured joints as an array of descriptive objects.
 * Useful for UI dropdowns or debug panels.
 */
export function getAllJoints(): Array<{ id: BiomechJointId; side: JointSide; label: string }> {
  return JOINT_CONFIGS.map(cfg => ({
    id: cfg.id,
    side: cfg.side,
    label: getJointLabel(cfg.id, cfg.side),
  }));
}
