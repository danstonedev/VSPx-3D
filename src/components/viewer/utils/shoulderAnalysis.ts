import * as THREE from 'three';
import { computeBiomechAnglesForSelectedBone } from '../biomech/jointAngles';

/**
 * Calculate composite shoulder motion (scapulothoracic + glenohumeral)
 * Reflects scapulohumeral rhythm: total shoulder elevation = GH + ST contributions
 * 
 * @returns Object with composite angles and component contributions, or null if not shoulder complex
 */
export function getCompositeShoulderMotion(
  bone: THREE.Bone,
  skeleton: THREE.Skeleton | null
): { 
  composite: { x: number; y: number; z: number };
  scapular: { x: number; y: number; z: number };
  glenohumeral: { x: number; y: number; z: number };
  side: 'left' | 'right';
} | null {
  if (!skeleton) return null;
  
  // Determine if this is a shoulder complex bone
  let shoulderBone: THREE.Bone | undefined;
  let armBone: THREE.Bone | undefined;
  let side: 'left' | 'right';
  
  if (bone.name === 'mixamorig1RightShoulder' || bone.name === 'mixamorig1RightArm') {
    side = 'right';
    shoulderBone = skeleton.bones.find(b => b.name === 'mixamorig1RightShoulder');
    armBone = skeleton.bones.find(b => b.name === 'mixamorig1RightArm');
  } else if (bone.name === 'mixamorig1LeftShoulder' || bone.name === 'mixamorig1LeftArm') {
    side = 'left';
    shoulderBone = skeleton.bones.find(b => b.name === 'mixamorig1LeftShoulder');
    armBone = skeleton.bones.find(b => b.name === 'mixamorig1LeftArm');
  } else {
    return null; // Not a shoulder bone
  }
  
  if (!shoulderBone || !armBone) return null;
  
  // Use BIOMECH angles for accurate scapulohumeral rhythm
  const scapularData = computeBiomechAnglesForSelectedBone(skeleton, shoulderBone);
  const ghData = computeBiomechAnglesForSelectedBone(skeleton, armBone);
  
  if (!scapularData || !ghData) return null;
  
  const scapular = {
    x: scapularData.angles.abdAdd,
    y: scapularData.angles.rotation,
    z: scapularData.angles.flexExt
  };
  
  const glenohumeral = {
    x: ghData.angles.abdAdd,
    y: ghData.angles.rotation,
    z: ghData.angles.flexExt
  };
  
  // Composite motion is sum of both components
  // This represents total shoulder complex motion
  const composite = {
    x: scapular.x + glenohumeral.x, // Total abduction/adduction
    y: scapular.y + glenohumeral.y, // Total rotation
    z: scapular.z + glenohumeral.z  // Total flexion/extension
  };
  
  return { composite, scapular, glenohumeral, side };
}
