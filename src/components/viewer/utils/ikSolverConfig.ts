/**
 * IK Solver Configuration
 * 
 * Sets up three.js CCDIKSolver with IK chains for full-body manipulation.
 * Includes target bone creation and constraint integration.
 */

import * as THREE from 'three';
import type { BiomechState } from '../../../biomech/engine/biomechState';
import { getSegmentByBoneName } from '../../../biomech/model/segments';
import { getParentJoint } from '../../../biomech/model/joints';
import { SKELETON_MAP } from './skeletonMap';

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
  // Enabled for IK, but Clavicle (Shoulder) is excluded from the chain
  // so it can be driven procedurally by the Scapulohumeral Rhythm logic
  {
    name: 'Left Arm',
    targetBoneName: 'IKTarget_LeftHand',
    effectorBoneName: SKELETON_MAP.LeftHand,
    linkBoneNames: [
      SKELETON_MAP.LeftForeArm,  // Elbow
      SKELETON_MAP.LeftArm       // Shoulder (Humerus)
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  {
    name: 'Right Arm',
    targetBoneName: 'IKTarget_RightHand',
    effectorBoneName: SKELETON_MAP.RightHand,
    linkBoneNames: [
      SKELETON_MAP.RightForeArm,
      SKELETON_MAP.RightArm
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  
  // ==================== LEGS ====================
  {
    name: 'Left Leg',
    targetBoneName: 'IKTarget_LeftFoot',
    effectorBoneName: SKELETON_MAP.LeftFoot,
    linkBoneNames: [
      SKELETON_MAP.LeftLeg,    // Knee
      SKELETON_MAP.LeftUpLeg   // Hip
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  {
    name: 'Right Leg',
    targetBoneName: 'IKTarget_RightFoot',
    effectorBoneName: SKELETON_MAP.RightFoot,
    linkBoneNames: [
      SKELETON_MAP.RightLeg,
      SKELETON_MAP.RightUpLeg
    ],
    iteration: 10,
    minAngle: 0.01,
    maxAngle: 0.5
  },
  
  // ==================== SPINE ====================
  {
    name: 'Spine Chain',
    targetBoneName: 'IKTarget_Head',
    effectorBoneName: SKELETON_MAP.Head,
    linkBoneNames: [
      SKELETON_MAP.Neck,
      SKELETON_MAP.Spine2,
      SKELETON_MAP.Spine1,
      SKELETON_MAP.Spine
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
  skeleton: THREE.Skeleton,
  biomechState?: BiomechState | null
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
    
    // Basic link definition
    const link: any = {
      index,
      enabled: true
    };
    
    // Apply constraints from BiomechState if available
    if (biomechState && biomechState.isCalibrated()) {
        const segment = getSegmentByBoneName(boneName);
        const joint = segment ? getParentJoint(segment.id) : null;
        const qNeutral = joint ? biomechState.getNeutralQuaternion(joint.id) : null;

        if (joint && qNeutral) {
            const neutralEuler = new THREE.Euler().setFromQuaternion(qNeutral, joint.eulerOrder);
            
            const min = new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI);
            const max = new THREE.Vector3(Math.PI, Math.PI, Math.PI);
            
            joint.coordinates.forEach(coord => {
                if (coord.clamped) {
                    const neutralVal = (coord.index === 0) ? neutralEuler.x :
                                     (coord.index === 1) ? neutralEuler.y :
                                     neutralEuler.z;
                    
                    const absMin = neutralVal + coord.range.min;
                    const absMax = neutralVal + coord.range.max;
                    
                    if (coord.index === 0) { min.x = absMin; max.x = absMax; }
                    if (coord.index === 1) { min.y = absMin; max.y = absMax; }
                    if (coord.index === 2) { min.z = absMin; max.z = absMax; }
                }
            });
            
            link.rotationMin = min;
            link.rotationMax = max;
            // console.log(`🔒 Applied biomech limits for ${boneName}`);
        }
    } else {
        // Fallback: Apply default limits to prevent gross flipping (e.g. 90° extension)
        // We assume T-pose is roughly identity (0,0,0) for these bones
        const segment = getSegmentByBoneName(boneName);
        const joint = segment ? getParentJoint(segment.id) : null;
        
        if (joint && (joint.id.includes('gh_') || joint.id.includes('hip_'))) {
             // For GH joint (Shoulder), prevent backward extension > 40°
             // and prevent abduction > 180° or < -90° (relative to T-pose)
             
             const min = new THREE.Vector3(-Math.PI, -Math.PI, -Math.PI);
             const max = new THREE.Vector3(Math.PI, Math.PI, Math.PI);
             
             // Apply rough limits relative to T-pose
             if (joint.eulerOrder === 'YZX') {
                 // ISB-style: Plane -> Elevation -> Axial
                 
                 // Y (Plane of Elevation): -45° (Extension) to +135° (Cross-body)
                 min.y = THREE.MathUtils.degToRad(-45);
                 max.y = THREE.MathUtils.degToRad(135);
                 
                 // Z (Elevation Angle): -90° (Down) to +90° (Up)
                 min.z = THREE.MathUtils.degToRad(-90);
                 max.z = THREE.MathUtils.degToRad(90);
                 
                 // X (Axial Rotation): -90° to +90°
                 min.x = THREE.MathUtils.degToRad(-90);
                 max.x = THREE.MathUtils.degToRad(90);
             } else if (joint.eulerOrder === 'ZXY') {
                 // Legacy/Fallback
                 // Y (Flexion): -40° to +160°
                 min.y = THREE.MathUtils.degToRad(-40);
                 max.y = THREE.MathUtils.degToRad(160);
                 
                 // Z (Abduction): -90° (Side) to +90° (Up)
                 min.z = THREE.MathUtils.degToRad(-90);
                 max.z = THREE.MathUtils.degToRad(90);
             }
             
             link.rotationMin = min;
             link.rotationMax = max;
             // console.log(`🛡️ Applied fallback limits for ${boneName}`);
        }
    }
    
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
  root: THREE.Object3D,
  biomechState?: BiomechState | null
): {
  iks: any[];
  targets: Map<string, THREE.Bone>;
} {
  // Initialize target bones
  const targets = initializeIKTargets(skeleton, root);
  
  // Build IK definitions
  const iks = IK_CHAIN_CONFIGS.map((config) => createIKDefinition(config, skeleton, biomechState))
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
