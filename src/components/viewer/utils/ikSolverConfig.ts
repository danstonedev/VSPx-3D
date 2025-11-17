/**
 * IK Solver Configuration
 * 
 * Sets up three.js CCDIKSolver with IK chains for full-body manipulation.
 * Includes target bone creation and constraint integration.
 */

import * as THREE from 'three';

/**
 * IK chain definition for CCDIKSolver
 */
export interface IKChainConfig {
  name: string;
  targetBoneName: string;   // Name of invisible target bone
  effectorBoneName: string; // End effector (e.g., hand, foot)
  linkBoneNames: string[];  // Bones in chain (from effector to root)
  iteration?: number;        // IK iterations (higher = more accurate, slower)
  minAngle?: number;         // Minimum rotation per step (prevents vibration)
  maxAngle?: number;         // Maximum rotation per step
}

/**
 * Predefined IK chains for Mixamo-rigged humanoid
 */
export const IK_CHAIN_CONFIGS: IKChainConfig[] = [
  // ==================== ARMS ====================
  {
    name: 'Left Arm',
    targetBoneName: 'IKTarget_LeftHand',
    effectorBoneName: 'mixamorig1LeftHand',
    linkBoneNames: [
      'mixamorig1LeftForeArm',  // Elbow
      'mixamorig1LeftArm',      // Shoulder
      'mixamorig1LeftShoulder'  // Clavicle (optional)
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  {
    name: 'Right Arm',
    targetBoneName: 'IKTarget_RightHand',
    effectorBoneName: 'mixamorig1RightHand',
    linkBoneNames: [
      'mixamorig1RightForeArm',
      'mixamorig1RightArm',
      'mixamorig1RightShoulder'
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  
  // ==================== LEGS ====================
  {
    name: 'Left Leg',
    targetBoneName: 'IKTarget_LeftFoot',
    effectorBoneName: 'mixamorig1LeftFoot',
    linkBoneNames: [
      'mixamorig1LeftLeg',    // Knee
      'mixamorig1LeftUpLeg'   // Hip
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  {
    name: 'Right Leg',
    targetBoneName: 'IKTarget_RightFoot',
    effectorBoneName: 'mixamorig1RightFoot',
    linkBoneNames: [
      'mixamorig1RightLeg',
      'mixamorig1RightUpLeg'
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  
  // ==================== SPINE ====================
  {
    name: 'Spine Chain',
    targetBoneName: 'IKTarget_Head',
    effectorBoneName: 'mixamorig1Head',
    linkBoneNames: [
      'mixamorig1Neck',
      'mixamorig1Spine2',
      'mixamorig1Spine1',
      'mixamorig1Spine'
    ],
    iteration: 8,
    minAngle: 0.005,
    maxAngle: 0.3
  }
];

/**
 * Create invisible target bones for IK
 * These bones are positioned by the user and the IK solver adjusts
 * the skeleton to reach them
 */
export function createIKTargetBone(
  name: string,
  position: THREE.Vector3,
  parent?: THREE.Object3D
): THREE.Bone {
  const target = new THREE.Bone();
  target.name = name;
  
  if (parent) {
    parent.add(target);
  }

  setBoneWorldPosition(target, position);
  
  return target;
}

function setBoneWorldPosition(bone: THREE.Bone, worldPosition: THREE.Vector3): void {
  if (bone.parent) {
    const local = worldPosition.clone();
    bone.parent.worldToLocal(local);
    bone.position.copy(local);
  } else {
    bone.position.copy(worldPosition);
  }
  bone.updateMatrixWorld(true);
}

/**
 * Find a bone by name in skeleton
 */
export function findBoneByName(
  skeleton: THREE.Skeleton,
  name: string
): THREE.Bone | undefined {
  return skeleton.bones.find((bone) => bone.name === name);
}

/**
 * Get bone index in skeleton.bones array
 */
export function getBoneIndex(skeleton: THREE.Skeleton, boneName: string): number {
  return skeleton.bones.findIndex((bone) => bone.name === boneName);
}

/**
 * Convert IK chain config to CCDIKSolver format
 * Automatically applies anatomical constraints from jointConstraints
 */
export function createIKDefinition(
  config: IKChainConfig,
  skeleton: THREE.Skeleton
): any | null {
  const targetIndex = getBoneIndex(skeleton, config.targetBoneName);
  const effectorIndex = getBoneIndex(skeleton, config.effectorBoneName);
  
  // If target or effector not found, skip this chain
  if (targetIndex === -1 || effectorIndex === -1) {
    console.warn(
      `IK chain "${config.name}" skipped: target or effector bone not found`,
      { target: config.targetBoneName, effector: config.effectorBoneName }
    );
    return null;
  }
  
  // Build links array with constraint data
  const links = config.linkBoneNames.map((boneName) => {
    const index = getBoneIndex(skeleton, boneName);
    if (index === -1) {
      console.warn(`Link bone "${boneName}" not found in skeleton`);
      return null;
    }
    
    // CONSTRAINTS DISABLED: Don't fetch constraint data
    // const constraint = getConstraintForBone(boneName);
    
    // Basic link definition
    const link: any = {
      index,
      enabled: true
    };
    
    // CONSTRAINTS DISABLED: Don't apply rotationMin/rotationMax to allow full range of motion
    // The three.js CCDIKSolver will clamp rotations if these are set, preventing natural movement
    // if (constraint && constraint.enabled) {
    //   const limits = constraint.rotationLimits;
    //   
    //   link.rotationMin = new THREE.Vector3(
    //     limits.x[0],
    //     limits.y[0],
    //     limits.z[0]
    //   );
    //   
    //   link.rotationMax = new THREE.Vector3(
    //     limits.x[1],
    //     limits.y[1],
    //     limits.z[1]
    //   );
    // }
    
    console.log(`🔓 Constraint limits DISABLED for ${boneName} - full range of motion allowed`);
    
    return link;
  }).filter((link) => link !== null); // Remove null entries
  
  // Build IK definition for CCDIKSolver
  return {
    target: targetIndex,
    effector: effectorIndex,
    links,
    iteration: config.iteration || 10,
    minAngle: config.minAngle || 0.01,
    maxAngle: config.maxAngle || 0.5
  };
}

/**
 * Initialize all IK targets for a skeleton
 * Positions targets at current effector positions
 */
export function initializeIKTargets(
  skeleton: THREE.Skeleton,
  root: THREE.Object3D
): Map<string, THREE.Bone> {
  const targets = new Map<string, THREE.Bone>();
  
  // CRITICAL: Parent IK targets to the SAME parent as skeleton bones
  // This ensures targets are in the same coordinate space (including any rotations)
  // The bone parent is typically an Armature node with Z-up → Y-up rotation
  const targetParent = skeleton.bones[0]?.parent || root;
  
  console.log('🎯 IK Target Parent:', targetParent.name || 'unnamed', 'rotation:', targetParent.rotation, 'scale:', targetParent.scale);
  console.log('🎯 Skeleton bone count BEFORE adding targets:', skeleton.bones.length);
  
  for (const config of IK_CHAIN_CONFIGS) {
    // Check if target already exists
    const existing = findBoneByName(skeleton, config.targetBoneName);
    if (existing) {
      console.warn(`⚠️ IK target "${config.targetBoneName}" already exists, reusing it`);
      targets.set(config.name, existing);
      continue;
    }
    
    const effectorBone = findBoneByName(skeleton, config.effectorBoneName);
    
    if (!effectorBone) {
      console.warn(`Effector bone "${config.effectorBoneName}" not found for IK chain "${config.name}"`);
      continue;
    }
    
    // Get world position of effector
    const worldPos = new THREE.Vector3();
    effectorBone.getWorldPosition(worldPos);
    
    // Create target bone parented to same node as skeleton bones
    const target = createIKTargetBone(
      config.targetBoneName,
      worldPos,
      targetParent
    );
    
    // Add to skeleton arrays SAFELY: also append a matching inverse matrix
    // to keep bones[] and boneInverses[] lengths in sync for Skeleton.update()
    skeleton.bones.push(target);
    skeleton.boneInverses.push(new THREE.Matrix4());
    
    targets.set(config.name, target);
    
    console.log(`✅ Created IK target "${config.targetBoneName}" at world pos:`, worldPos);
  }
  
  console.log('🎯 Skeleton bone count AFTER adding targets:', skeleton.bones.length);
  
  // Ensure all matrices are up-to-date after inserting targets
  try {
    skeleton.update();
  } catch { /* no-op */ }
  
  return targets;
}

/**
 * Build complete IK configuration for CCDIKSolver
 */
export function buildIKConfiguration(
  skeleton: THREE.Skeleton,
  root: THREE.Object3D
): {
  iks: any[];
  targets: Map<string, THREE.Bone>;
} {
  // Initialize target bones
  const targets = initializeIKTargets(skeleton, root);
  
  // Build IK definitions
  const iks = IK_CHAIN_CONFIGS.map((config) => createIKDefinition(config, skeleton))
    .filter((ik) => ik !== null); // Remove failed chains
  
  console.log(`IK Configuration: ${iks.length} chains created from ${IK_CHAIN_CONFIGS.length} configs`);
  
  return { iks, targets };
}

/**
 * Update IK target position (for drag interactions)
 */
export function updateIKTarget(
  target: THREE.Bone,
  position: THREE.Vector3
): void {
  setBoneWorldPosition(target, position);
}

/**
 * Reset IK target to effector's current position
 */
export function resetIKTarget(
  target: THREE.Bone,
  effectorBone: THREE.Bone
): void {
  const worldPos = new THREE.Vector3();
  effectorBone.getWorldPosition(worldPos);
  setBoneWorldPosition(target, worldPos);
}

/**
 * Helper: Get IK chain config by name
 */
export function getIKChainConfig(chainName: string): IKChainConfig | undefined {
  return IK_CHAIN_CONFIGS.find((config) => config.name === chainName);
}

/**
 * Helper: Get IK chain config by effector bone name
 */
export function getIKChainByEffector(effectorName: string): IKChainConfig | undefined {
  return IK_CHAIN_CONFIGS.find((config) => config.effectorBoneName === effectorName);
}

/**
 * Helper: Get IK chain config by any link bone name
 */
export function getIKChainByLink(boneName: string): IKChainConfig | undefined {
  return IK_CHAIN_CONFIGS.find((config) => 
    config.linkBoneNames.includes(boneName) || 
    config.effectorBoneName === boneName
  );
}

/**
 * Visualize IK targets for debugging
 * Returns mesh array that can be added to scene
 */
export function createIKTargetVisualizers(
  targets: Map<string, THREE.Bone>,
  size: number = 0.05,
  color: number = 0xff0000
): THREE.Mesh[] {
  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({ 
    color,
    transparent: true,
    opacity: 0.7,
    depthTest: false
  });
  
  const meshes: THREE.Mesh[] = [];
  
  targets.forEach((target, chainName) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(target.position);
    mesh.name = `IKTargetVisualizer_${chainName}`;
    meshes.push(mesh);
  });
  
  return meshes;
}
