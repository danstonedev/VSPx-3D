import * as THREE from 'three'
import { SKELETON_MAP } from './skeletonMap'

/**
 * Bone rotation definition (in radians)
 */
export type BonePose = {
  rotation?: { x?: number; y?: number; z?: number }
  position?: { x?: number; y?: number; z?: number }
}

/**
 * Complete pose definition with all bone rotations
 */
export type Pose = {
  name: string
  description: string
  bones: Record<string, BonePose>
}

/**
 * Predefined pose library for Mixamo rigged characters
 */
export const POSE_LIBRARY: Record<string, Pose> = {
  neutral: {
    name: 'Neutral',
    description: 'Standing relaxed, arms at sides',
    bones: {
      [SKELETON_MAP.Spine]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.Spine1]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.Spine2]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.Neck]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.Head]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.LeftArm]: { rotation: { x: 0, y: 0, z: -0.2 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: 0, y: 0, z: 0.2 } },
      [SKELETON_MAP.LeftUpLeg]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.RightUpLeg]: { rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  'balance-right': {
    name: 'Balance Right',
    description: 'Standing on right foot, left leg raised',
    bones: {
      [SKELETON_MAP.Spine]: { rotation: { x: 0.1, y: -0.1, z: -0.05 } },
      [SKELETON_MAP.Spine1]: { rotation: { x: 0.05, y: 0, z: 0 } },
      [SKELETON_MAP.Spine2]: { rotation: { x: 0.05, y: 0, z: 0 } },
      [SKELETON_MAP.Neck]: { rotation: { x: -0.1, y: 0.05, z: 0 } },
      [SKELETON_MAP.Head]: { rotation: { x: 0, y: 0, z: 0.05 } },

      // Right leg (supporting)
      [SKELETON_MAP.RightUpLeg]: { rotation: { x: -0.1, y: 0, z: 0 } },
      [SKELETON_MAP.RightLeg]: { rotation: { x: 0.2, y: 0, z: 0 } },
      [SKELETON_MAP.RightFoot]: { rotation: { x: -0.1, y: 0, z: 0 } },

      // Left leg (raised)
      [SKELETON_MAP.LeftUpLeg]: { rotation: { x: 1.0, y: 0.2, z: -0.3 } },
      [SKELETON_MAP.LeftLeg]: { rotation: { x: -0.8, y: 0, z: 0 } },
      [SKELETON_MAP.LeftFoot]: { rotation: { x: -0.2, y: 0, z: 0 } },

      // Arms for balance
      [SKELETON_MAP.LeftArm]: { rotation: { x: 0.3, y: 0, z: -0.8 } },
      [SKELETON_MAP.LeftForeArm]: { rotation: { x: 0, y: 0, z: -0.5 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: -0.2, y: 0, z: 0.5 } },
      [SKELETON_MAP.RightForeArm]: { rotation: { x: 0, y: 0, z: 0.3 } },
    },
  },

  'balance-left': {
    name: 'Balance Left',
    description: 'Standing on left foot, right leg raised',
    bones: {
      [SKELETON_MAP.Spine]: { rotation: { x: 0.1, y: 0.1, z: 0.05 } },
      [SKELETON_MAP.Spine1]: { rotation: { x: 0.05, y: 0, z: 0 } },
      [SKELETON_MAP.Spine2]: { rotation: { x: 0.05, y: 0, z: 0 } },
      [SKELETON_MAP.Neck]: { rotation: { x: -0.1, y: -0.05, z: 0 } },
      [SKELETON_MAP.Head]: { rotation: { x: 0, y: 0, z: -0.05 } },

      // Left leg (supporting)
      [SKELETON_MAP.LeftUpLeg]: { rotation: { x: -0.1, y: 0, z: 0 } },
      [SKELETON_MAP.LeftLeg]: { rotation: { x: 0.2, y: 0, z: 0 } },
      [SKELETON_MAP.LeftFoot]: { rotation: { x: -0.1, y: 0, z: 0 } },

      // Right leg (raised)
      [SKELETON_MAP.RightUpLeg]: { rotation: { x: 1.0, y: -0.2, z: 0.3 } },
      [SKELETON_MAP.RightLeg]: { rotation: { x: -0.8, y: 0, z: 0 } },
      [SKELETON_MAP.RightFoot]: { rotation: { x: -0.2, y: 0, z: 0 } },

      // Arms for balance
      [SKELETON_MAP.RightArm]: { rotation: { x: 0.3, y: 0, z: 0.8 } },
      [SKELETON_MAP.RightForeArm]: { rotation: { x: 0, y: 0, z: 0.5 } },
      [SKELETON_MAP.LeftArm]: { rotation: { x: -0.2, y: 0, z: -0.5 } },
      [SKELETON_MAP.LeftForeArm]: { rotation: { x: 0, y: 0, z: -0.3 } },
    },
  },

  'arms-raised': {
    name: 'Arms Raised',
    description: 'Both arms raised above head',
    bones: {
      [SKELETON_MAP.LeftArm]: { rotation: { x: 0, y: 0, z: -2.8 } },
      [SKELETON_MAP.LeftForeArm]: { rotation: { x: 0, y: 0, z: -0.3 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: 0, y: 0, z: 2.8 } },
      [SKELETON_MAP.RightForeArm]: { rotation: { x: 0, y: 0, z: 0.3 } },
    },
  },

  'arms-forward': {
    name: 'Arms Forward',
    description: 'Both arms extended forward',
    bones: {
      [SKELETON_MAP.LeftArm]: { rotation: { x: 1.57, y: 0, z: 0 } },
      [SKELETON_MAP.LeftForeArm]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: 1.57, y: 0, z: 0 } },
      [SKELETON_MAP.RightForeArm]: { rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  't-pose': {
    name: 'T-Pose',
    description: 'Standing with arms extended to sides',
    bones: {
      [SKELETON_MAP.LeftArm]: { rotation: { x: 0, y: 0, z: -1.57 } },
      [SKELETON_MAP.LeftForeArm]: { rotation: { x: 0, y: 0, z: 0 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: 0, y: 0, z: 1.57 } },
      [SKELETON_MAP.RightForeArm]: { rotation: { x: 0, y: 0, z: 0 } },
    },
  },

  sitting: {
    name: 'Sitting',
    description: 'Sitting position with bent legs',
    bones: {
      [SKELETON_MAP.Spine]: { rotation: { x: 0.3, y: 0, z: 0 } },
      [SKELETON_MAP.Spine1]: { rotation: { x: 0.1, y: 0, z: 0 } },
      [SKELETON_MAP.Spine2]: { rotation: { x: 0.1, y: 0, z: 0 } },

      [SKELETON_MAP.LeftUpLeg]: { rotation: { x: 1.5, y: 0.1, z: 0 } },
      [SKELETON_MAP.LeftLeg]: { rotation: { x: -1.5, y: 0, z: 0 } },
      [SKELETON_MAP.LeftFoot]: { rotation: { x: 0.2, y: 0, z: 0 } },

      [SKELETON_MAP.RightUpLeg]: { rotation: { x: 1.5, y: -0.1, z: 0 } },
      [SKELETON_MAP.RightLeg]: { rotation: { x: -1.5, y: 0, z: 0 } },
      [SKELETON_MAP.RightFoot]: { rotation: { x: 0.2, y: 0, z: 0 } },

      [SKELETON_MAP.LeftArm]: { rotation: { x: 0.3, y: 0, z: -0.3 } },
      [SKELETON_MAP.RightArm]: { rotation: { x: 0.3, y: 0, z: 0.3 } },
    },
  },
}

/**
 * Gets a pose by name from the library
 */
export function getPose(poseName: string): Pose | undefined {
  return POSE_LIBRARY[poseName.toLowerCase()]
}

/**
 * Lists all available poses
 */
export function listPoses(): string[] {
  return Object.keys(POSE_LIBRARY)
}

/**
 * Searches for poses matching a query
 */
export function searchPoses(query: string): Pose[] {
  const lowerQuery = query.toLowerCase()
  return Object.values(POSE_LIBRARY).filter(
    pose => pose.name.toLowerCase().includes(lowerQuery) || pose.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Interpolates between two poses
 */
export function interpolatePoses(poseA: Pose, poseB: Pose, alpha: number): Pose {
  const interpolatedBones: Record<string, BonePose> = {}

  // Get all bone names from both poses
  const allBoneNames = new Set([...Object.keys(poseA.bones), ...Object.keys(poseB.bones)])

  allBoneNames.forEach(boneName => {
    const boneA = poseA.bones[boneName] || { rotation: { x: 0, y: 0, z: 0 } }
    const boneB = poseB.bones[boneName] || { rotation: { x: 0, y: 0, z: 0 } }

    interpolatedBones[boneName] = {
      rotation: {
        x: THREE.MathUtils.lerp(boneA.rotation?.x || 0, boneB.rotation?.x || 0, alpha),
        y: THREE.MathUtils.lerp(boneA.rotation?.y || 0, boneB.rotation?.y || 0, alpha),
        z: THREE.MathUtils.lerp(boneA.rotation?.z || 0, boneB.rotation?.z || 0, alpha),
      },
    }
  })

  return {
    name: `${poseA.name} → ${poseB.name}`,
    description: `Interpolated pose between ${poseA.name} and ${poseB.name}`,
    bones: interpolatedBones,
  }
}
