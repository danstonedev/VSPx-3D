/**
 * Segment Registry
 * 
 * Runtime service for resolving anatomical segment IDs to actual THREE.Bone instances
 * or virtual frames in the scene graph.
 * 
 * This bridges the gap between the anatomical model (segments.ts) and the
 * Mixamo rig structure in the scene.
 */

import * as THREE from 'three';
import { SegmentDef } from '../model/types';
import { getSegment } from '../model/segments';

/**
 * Virtual segment frame (for segments not represented by bones)
 */
export interface VirtualFrame {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  worldMatrix: THREE.Matrix4;
}

/**
 * Resolved segment - either a bone or virtual frame
 */
export type ResolvedSegment = {
  type: 'bone';
  bone: THREE.Bone;
  def: SegmentDef;
} | {
  type: 'virtual';
  frame: VirtualFrame;
  def: SegmentDef;
};

/**
 * Segment Registry
 * 
 * Maintains mapping between segment IDs and their runtime representations
 */
export class SegmentRegistry {
  private skeleton: THREE.Skeleton;
  private boneCache: Map<string, THREE.Bone> = new Map();
  private virtualFrames: Map<string, VirtualFrame> = new Map();

  constructor(skeleton: THREE.Skeleton) {
    this.skeleton = skeleton;
    this.buildBoneCache();
  }

  /**
   * Build lookup cache for fast bone access by name
   */
  private buildBoneCache(): void {
    this.boneCache.clear();
    this.skeleton.bones.forEach(bone => {
      this.boneCache.set(bone.name, bone);
    });
  }

  /**
   * Resolve segment ID to runtime representation
   */
  resolve(segmentId: string): ResolvedSegment | null {
    const def = getSegment(segmentId);
    if (!def) {
      console.warn(`⚠️ Unknown segment ID: ${segmentId}`);
      return null;
    }

    if (def.source === 'mixamo') {
      if (!def.boneName) {
        console.error(`❌ Mixamo segment ${segmentId} missing boneName`);
        return null;
      }

      const bone = this.boneCache.get(def.boneName);
      if (!bone) {
        console.error(`❌ Bone not found: ${def.boneName} for segment ${segmentId}`);
        return null;
      }

      return { type: 'bone', bone, def };
    }

    // Virtual segment
    const frame = this.virtualFrames.get(segmentId);
    if (!frame) {
      console.warn(`⚠️ Virtual segment ${segmentId} not yet created`);
      return null;
    }

    return { type: 'virtual', frame, def };
  }

  /**
   * Get THREE.Bone for a segment (errors if virtual)
   */
  getBone(segmentId: string): THREE.Bone | null {
    const resolved = this.resolve(segmentId);
    if (!resolved) return null;
    
    if (resolved.type !== 'bone') {
      console.error(`❌ Segment ${segmentId} is virtual, not a bone`);
      return null;
    }

    return resolved.bone;
  }

  /**
   * Get world quaternion for a segment
   */
  getWorldQuaternion(segmentId: string): THREE.Quaternion | null {
    const resolved = this.resolve(segmentId);
    if (!resolved) return null;

    const quat = new THREE.Quaternion();

    if (resolved.type === 'bone') {
      resolved.bone.getWorldQuaternion(quat);
    } else {
      quat.copy(resolved.frame.quaternion);
    }

    return quat;
  }

  /**
   * Get world position for a segment
   */
  getWorldPosition(segmentId: string): THREE.Vector3 | null {
    const resolved = this.resolve(segmentId);
    if (!resolved) return null;

    const pos = new THREE.Vector3();

    if (resolved.type === 'bone') {
      resolved.bone.getWorldPosition(pos);
    } else {
      pos.copy(resolved.frame.position);
    }

    return pos;
  }

  /**
   * Create or update a virtual segment frame
   */
  setVirtualFrame(segmentId: string, position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    const worldMatrix = new THREE.Matrix4().compose(
      position,
      quaternion,
      new THREE.Vector3(1, 1, 1)
    );

    this.virtualFrames.set(segmentId, {
      position: position.clone(),
      quaternion: quaternion.clone(),
      worldMatrix,
    });
  }

  /**
   * Update all virtual frames based on their parent segments
   */
  updateVirtualFrames(): void {
    // For now, virtual frames are manually set
    // Future: compute based on parent segment + offset/rotation from SegmentDef
  }

  /**
   * Check if segment exists
   */
  has(segmentId: string): boolean {
    return this.resolve(segmentId) !== null;
  }

  /**
   * List all available segments
   */
  listSegments(): string[] {
    const segments: string[] = [];
    
    // Add all mixamo segments that have bones
    this.boneCache.forEach((_bone, name) => {
      // Find segment def that references this bone
      const segmentId = Object.keys(import('../model/segments')).find(id => {
        const seg = getSegment(id);
        return seg?.boneName === name;
      });
      if (segmentId) segments.push(segmentId);
    });

    // Add virtual segments
    this.virtualFrames.forEach((_, segmentId) => {
      segments.push(segmentId);
    });

    return segments;
  }

  /**
   * Debug: log all segment mappings
   */
  debugLog(): void {
    console.group('🦴 Segment Registry');
    
    console.log('Mixamo Bones:');
    this.boneCache.forEach((_bone, name) => {
      console.log(`  ${name}`);
    });

    console.log('\nVirtual Frames:');
    this.virtualFrames.forEach((_frame, segmentId) => {
      const def = getSegment(segmentId);
      console.log(`  ${segmentId} (${def?.displayName || 'unknown'})`);
    });

    console.groupEnd();
  }
}

/**
 * Helper: Find bone by name in skeleton
 */
export function findBoneByName(skeleton: THREE.Skeleton, boneName: string): THREE.Bone | null {
  return skeleton.bones.find(b => b.name === boneName) || null;
}

/**
 * Helper: Get bone chain from child to parent
 */
export function getBoneChain(startBone: THREE.Bone, endBone: THREE.Bone): THREE.Bone[] {
  const chain: THREE.Bone[] = [];
  let current: THREE.Object3D | null = startBone;

  while (current && current !== endBone.parent) {
    if (current instanceof THREE.Bone) {
      chain.push(current);
    }
    if (current === endBone) break;
    current = current.parent;
  }

  return chain.reverse();
}
