/**
 * Skeleton Bone Mapping
 * 
 * Abstraction layer for bone names to support different rig standards.
 * Currently configured for Mixamo-style rigs.
 */

export const SKELETON_MAP = {
  // Spine & Head
  Hips: 'mixamorig1Hips',
  Spine: 'mixamorig1Spine',
  Spine1: 'mixamorig1Spine1',
  Spine2: 'mixamorig1Spine2',
  Neck: 'mixamorig1Neck',
  Head: 'mixamorig1Head',

  // Left Arm
  LeftShoulder: 'mixamorig1LeftShoulder', // Clavicle
  LeftArm: 'mixamorig1LeftArm',           // Shoulder
  LeftForeArm: 'mixamorig1LeftForeArm',   // Elbow
  LeftHand: 'mixamorig1LeftHand',         // Wrist

  // Right Arm
  RightShoulder: 'mixamorig1RightShoulder',
  RightArm: 'mixamorig1RightArm',
  RightForeArm: 'mixamorig1RightForeArm',
  RightHand: 'mixamorig1RightHand',

  // Left Leg
  LeftUpLeg: 'mixamorig1LeftUpLeg',       // Hip
  LeftLeg: 'mixamorig1LeftLeg',           // Knee
  LeftFoot: 'mixamorig1LeftFoot',         // Ankle
  LeftToeBase: 'mixamorig1LeftToeBase',   // Toes

  // Right Leg
  RightUpLeg: 'mixamorig1RightUpLeg',
  RightLeg: 'mixamorig1RightLeg',
  RightFoot: 'mixamorig1RightFoot',
  RightToeBase: 'mixamorig1RightToeBase',
} as const;

export type BoneKey = keyof typeof SKELETON_MAP;

/**
 * Reverse lookup: Get logical name from actual bone name
 */
export function getLogicalBoneName(actualName: string): BoneKey | undefined {
  return (Object.keys(SKELETON_MAP) as BoneKey[]).find(
    key => SKELETON_MAP[key] === actualName
  );
}
