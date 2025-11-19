/**
 * Neutral Pose Loader
 * 
 * Loads the Neutral Position (anatomical reference pose) from Neutral.glb
 * and uses it to establish the baseline for all joint angle measurements.
 * 
 * NEUTRAL POSITION DEFINITION:
 * - Arms at sides (0° shoulder abduction)
 * - Elbows extended (0° elbow flexion)
 * - Palms facing body (neutral forearm rotation)
 * - Hips neutral (0° hip flexion/abduction/rotation)
 * - Knees extended (0° knee flexion)
 * - Ankles neutral (0° dorsi/plantarflexion)
 * 
 * This replaces the old T-pose reference system.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { withBase } from '../../../shared/config';

const NEUTRAL_POSE_PATH = withBase('models/animations/Neutral.glb');

// Cache for the neutral pose skeleton data
let neutralPoseCache: Map<string, THREE.Quaternion> | null = null;
let neutralPosePromise: Promise<Map<string, THREE.Quaternion>> | null = null;

/**
 * Load the Neutral Position GLB and extract bone rotations
 * 
 * @returns Map of bone names to their quaternions in neutral pose
 */
export async function loadNeutralPose(): Promise<Map<string, THREE.Quaternion>> {
  // Return cached data if available
  if (neutralPoseCache) {
    return neutralPoseCache;
  }
  
  // Return existing promise if already loading
  if (neutralPosePromise) {
    return neutralPosePromise;
  }
  
  // Start loading
  neutralPosePromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    loader.load(
      NEUTRAL_POSE_PATH,
      (gltf) => {
        const poseData = new Map<string, THREE.Quaternion>();
        
        // Find skeleton in the loaded GLTF
        let skeleton: THREE.Skeleton | null = null;
        gltf.scene.traverse((child: any) => {
          if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
          }
        });
        
        if (!skeleton) {
          reject(new Error('No skeleton found in Neutral.glb'));
          return;
        }
        
        // Store each bone's rotation in neutral pose
        skeleton.bones.forEach(bone => {
          poseData.set(bone.name, bone.quaternion.clone());
        });
        
        console.log(`✅ Loaded Neutral Position reference (${poseData.size} bones)`);
        
        // Cache the result
        neutralPoseCache = poseData;
        resolve(poseData);
      },
      undefined,
      (error) => {
        console.error('❌ Failed to load Neutral.glb:', error);
        neutralPosePromise = null;
        reject(error);
      }
    );
  });
  
  return neutralPosePromise;
}

/**
 * Get the neutral pose quaternion for a specific bone
 * 
 * @param boneName - Name of the bone
 * @returns Quaternion in neutral pose, or null if not found
 */
export function getNeutralPoseRotation(boneName: string): THREE.Quaternion | null {
  if (!neutralPoseCache) {
    console.warn('⚠️ Neutral pose not loaded yet. Call loadNeutralPose() first.');
    return null;
  }
  
  return neutralPoseCache.get(boneName) || null;
}

/**
 * Calculate relative rotation from neutral pose
 * 
 * @param bone - Current bone
 * @returns Euler angles representing rotation FROM neutral position
 */
export function getRotationFromNeutral(bone: THREE.Bone): THREE.Euler | null {
  const neutralQuat = getNeutralPoseRotation(bone.name);
  
  if (!neutralQuat) {
    return null;
  }
  
  // Calculate relative rotation: neutralInverse * current
  const neutralInverse = neutralQuat.clone().invert();
  const relativeQuat = new THREE.Quaternion().multiplyQuaternions(neutralInverse, bone.quaternion);
  
  return new THREE.Euler().setFromQuaternion(relativeQuat, 'XYZ');
}

/**
 * Set bone rotation relative to neutral pose
 * 
 * @param bone - Bone to modify
 * @param relativeEuler - Desired rotation FROM neutral
 */
export function setRotationFromNeutral(bone: THREE.Bone, relativeEuler: THREE.Euler): boolean {
  const neutralQuat = getNeutralPoseRotation(bone.name);
  
  if (!neutralQuat) {
    console.warn(`⚠️ No neutral pose data for ${bone.name}`);
    return false;
  }
  
  // Convert relative euler to quaternion and apply to neutral base
  const relativeQuat = new THREE.Quaternion().setFromEuler(relativeEuler);
  bone.quaternion.copy(neutralQuat.clone().multiply(relativeQuat));
  bone.updateMatrixWorld(true);
  
  return true;
}

/**
 * Reset bone to neutral pose
 * 
 * @param bone - Bone to reset
 */
export function resetToNeutralPose(bone: THREE.Bone): boolean {
  const neutralQuat = getNeutralPoseRotation(bone.name);
  
  if (!neutralQuat) {
    return false;
  }
  
  bone.quaternion.copy(neutralQuat);
  bone.updateMatrixWorld(true);
  
  return true;
}

/**
 * Clear the neutral pose cache (for testing/debugging)
 */
export function clearNeutralPoseCache(): void {
  neutralPoseCache = null;
  neutralPosePromise = null;
}
