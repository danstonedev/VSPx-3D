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
        
        // Find skeleton in the loaded GLTF - check both direct skeleton and in scene
        let skeleton: THREE.Skeleton | null = null;
        
        // First, check if there's animation data and extract the first frame
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`📊 Neutral.glb has ${gltf.animations.length} animation(s), using animation data`);
          // Will extract from scene skeleton below
        }
        
        // Search for skeleton in the scene
        gltf.scene.traverse((child: any) => {
          if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
          }
        });
        
        if (!skeleton) {
          console.warn('⚠️ No skeleton found in Neutral.glb loaded scene');
          // Try to find bones directly in scene
          const bones: THREE.Bone[] = [];
          gltf.scene.traverse((child: any) => {
            if (child.isBone) {
              bones.push(child);
            }
          });
          
          if (bones.length === 0) {
            reject(new Error('No skeleton found in Neutral.glb - file may not contain armature data'));
            return;
          }
          
          console.log(`⚠️ Found ${bones.length} bones directly, creating skeleton...`);
          skeleton = new THREE.Skeleton(bones);
        }
        
        // Store each bone's rotation in neutral pose
        skeleton.bones.forEach(bone => {
          poseData.set(bone.name, bone.quaternion.clone());
        });
        
        console.log(`✅ Loaded Neutral Position reference (${poseData.size} bones)`);
        
        // Diagnostic: Log key joint rotations in neutral pose
        const diagnosticBones = ['mixamorig1LeftArm', 'mixamorig1RightArm', 'mixamorig1LeftForeArm', 'mixamorig1RightForeArm'];
        console.log('🔍 NEUTRAL POSE ROTATIONS (should be anatomical zero):');
        diagnosticBones.forEach(boneName => {
          const quat = poseData.get(boneName);
          if (quat) {
            const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
            console.log(`  ${boneName}: x=${THREE.MathUtils.radToDeg(euler.x).toFixed(1)}° y=${THREE.MathUtils.radToDeg(euler.y).toFixed(1)}° z=${THREE.MathUtils.radToDeg(euler.z).toFixed(1)}°`);
          }
        });
        
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
 * Capture neutral pose from current skeleton state
 * Use this when Neutral.glb file doesn't contain skeleton data
 * 
 * @param skeleton - The skeleton in neutral pose
 * @param animationName - Name of current animation (if "Neutral Position", always capture)
 * @returns true if capture was performed, false if skipped
 */
export function captureNeutralPoseFromSkeleton(skeleton: THREE.Skeleton, animationName?: string): boolean {
  // If this IS the Neutral Position animation, always capture (replace file data)
  const isNeutralAnimation = animationName?.toLowerCase().includes('neutral');
  
  // Don't overwrite if already loaded from file UNLESS this is Neutral Position animation
  if (neutralPoseCache && neutralPoseCache.size > 0 && !isNeutralAnimation) {
    console.log('⏭️ Skipping skeleton capture - Neutral Position already loaded from file');
    return false;
  }
  
  if (isNeutralAnimation && neutralPoseCache && neutralPoseCache.size > 0) {
    console.log('🔄 Replacing file-loaded neutral pose with animation skeleton state');
  }
  
  const poseData = new Map<string, THREE.Quaternion>();
  
  skeleton.bones.forEach(bone => {
    poseData.set(bone.name, bone.quaternion.clone());
  });
  
  console.log(`✅ Captured Neutral Position reference from skeleton (${poseData.size} bones)`);
  
  // Diagnostic: Log key joint rotations
  const diagnosticBones = ['mixamorig1LeftArm', 'mixamorig1RightArm', 'mixamorig1LeftForeArm', 'mixamorig1RightForeArm'];
  console.log('🔍 NEUTRAL POSE ROTATIONS (captured from skeleton):');
  diagnosticBones.forEach(boneName => {
    const quat = poseData.get(boneName);
    if (quat) {
      const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
      console.log(`  ${boneName}: x=${THREE.MathUtils.radToDeg(euler.x).toFixed(1)}° y=${THREE.MathUtils.radToDeg(euler.y).toFixed(1)}° z=${THREE.MathUtils.radToDeg(euler.z).toFixed(1)}°`);
    }
  });
  
  neutralPoseCache = poseData;
  neutralPosePromise = Promise.resolve(poseData);
  return true;
}

/**
 * Check if current bone state matches neutral pose (for debugging)
 * 
 * @param bone - Bone to check
 * @returns Angle difference in degrees
 */
export function getNeutralPoseDeviation(bone: THREE.Bone): number {
  const neutralQuat = getNeutralPoseRotation(bone.name);
  
  if (!neutralQuat) {
    return NaN;
  }
  
  // Calculate angular difference between current and neutral
  const angle = bone.quaternion.angleTo(neutralQuat);
  return THREE.MathUtils.radToDeg(angle);
}

/**
 * Clear the neutral pose cache (for testing/debugging)
 */
export function clearNeutralPoseCache(): void {
  neutralPoseCache = null;
  neutralPosePromise = null;
}
