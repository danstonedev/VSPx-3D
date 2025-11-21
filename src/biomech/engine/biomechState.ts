/**
 * BiomechState - Central State Manager for Coordinate Engine
 * 
 * Manages the lifecycle of the OpenSim-compatible coordinate system:
 * - Initializes segment registry from skeleton
 * - Calibrates neutral pose (captures q_neutral for all joints)
 * - Updates joint states every frame
 * - Provides coordinate queries and validation
 * 
 * This is the main integration point between the biomech engine and Three.js scene.
 * Singleton pattern: one instance per skeleton.
 * 
 * Phase 2 - Task A1
 */

import * as THREE from 'three';
import { SegmentRegistry } from './segmentRegistry';
import {
  calibrateNeutralPose,
  computeJointState,
  applyCoordinatesToSkeleton
} from './qSpaceEngine';
import { getJoint, getAllJoints } from '../model/joints';
import type { JointState, ModelState } from '../model/types';

/**
 * Initialization result with diagnostics
 */
export interface InitializationResult {
  success: boolean;
  segmentCount: number;
  jointsInitialized: number;
  missingSegments: string[];
  errors: string[];
}

/**
 * Calibration result with diagnostics
 */
export interface CalibrationResult {
  success: boolean;
  jointsCalibratedCount: number;
  skippedJoints: string[];
  timestamp: number;
  animationName?: string;
}

/**
 * Update result for performance monitoring
 */
export interface UpdateResult {
  jointsUpdated: number;
  timeMs: number;
  violations: Array<{ jointId: string; coordinateIndex: number }>;
}

/**
 * Central state manager for coordinate-based biomechanics system
 */
export class BiomechState {
  private segmentRegistry: SegmentRegistry | null = null;
  private skeleton: THREE.Skeleton | null = null;
  private neutralPose: Map<string, THREE.Quaternion> = new Map(); // q_neutral per joint
  private currentState: ModelState = { q: {}, joints: {}, timestamp: 0 };
  private calibrated: boolean = false;
  private lastUpdateTime: number = 0;
  private boneToJointMap: Map<string, string> = new Map(); // bone.uuid -> jointId

  /**
   * Initialize the biomech state from a skeleton
   * This must be called after the skeleton is loaded
   * 
   * @param skeleton - The THREE.Skeleton to manage
   * @returns Initialization result with diagnostics
   */
  initialize(skeleton: THREE.Skeleton): InitializationResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const missingSegments: string[] = [];

    try {
      this.skeleton = skeleton;
      this.segmentRegistry = new SegmentRegistry(skeleton);
      this.boneToJointMap.clear();

      // Verify all joint segments can be resolved
      const allJoints = getAllJoints();
      let jointsInitialized = 0;

      for (const joint of allJoints) {
        const parentResolved = this.segmentRegistry.resolve(joint.parentSegment);
        const childResolved = this.segmentRegistry.resolve(joint.childSegment);

        if (!parentResolved) {
          missingSegments.push(`${joint.id}::parent(${joint.parentSegment})`);
          errors.push(`Cannot resolve parent segment '${joint.parentSegment}' for joint '${joint.id}'`);
        }
        if (!childResolved) {
          missingSegments.push(`${joint.id}::child(${joint.childSegment})`);
          errors.push(`Cannot resolve child segment '${joint.childSegment}' for joint '${joint.id}'`);
        }

        if (parentResolved && childResolved) {
          jointsInitialized++;
          
          // Cache bone mapping for fast lookup
          if (childResolved.type === 'bone') {
            this.boneToJointMap.set(childResolved.bone.uuid, joint.id);
          }
        }
      }

      const initTime = performance.now() - startTime;
      console.log(`✅ BiomechState initialized: ${jointsInitialized}/${allJoints.length} joints in ${initTime.toFixed(2)}ms`);

      return {
        success: errors.length === 0,
        segmentCount: skeleton.bones.length, // Count from skeleton since registry doesn't have getSegmentCount
        jointsInitialized,
        missingSegments: Array.from(new Set(missingSegments)),
        errors
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Initialization failed: ${errorMsg}`);

      return {
        success: false,
        segmentCount: 0,
        jointsInitialized: 0,
        missingSegments,
        errors
      };
    }
  }

  /**
   * Calibrate neutral pose from current skeleton state
   * This captures q_neutral for all joints based on the current animation frame
   * Typically called when Neutral_Model.glb is loaded
   * 
   * @param animationName - Optional name of the animation being calibrated
   * @returns Calibration result with diagnostics
   */
  calibrateNeutral(animationName?: string): CalibrationResult {
    if (!this.segmentRegistry || !this.skeleton) {
      return {
        success: false,
        jointsCalibratedCount: 0,
        skippedJoints: [],
        timestamp: Date.now(),
        animationName
      };
    }

    const startTime = performance.now();
    const skippedJoints: string[] = [];
    let jointsCalibratedCount = 0;

    try {
      // Update skeleton world matrices
      this.skeleton.update();

      // Calibrate each joint
      const allJoints = getAllJoints();
      for (const joint of allJoints) {
        // Verify both segments exist
        const parentBone = this.segmentRegistry.getBone(joint.parentSegment);
        const childBone = this.segmentRegistry.getBone(joint.childSegment);

        if (!parentBone || !childBone) {
          skippedJoints.push(joint.id);
          continue;
        }

        // Compute and store neutral quaternion
        const qNeutral = calibrateNeutralPose(joint, this.segmentRegistry);
        if (qNeutral) {
          this.neutralPose.set(joint.id, qNeutral);
          jointsCalibratedCount++;
        } else {
          skippedJoints.push(joint.id);
        }
      }

      this.calibrated = true;
      const calibTime = performance.now() - startTime;

      console.log(
        `✅ Neutral pose calibrated: ${jointsCalibratedCount}/${allJoints.length} joints in ${calibTime.toFixed(2)}ms`,
        animationName ? `(from ${animationName})` : ''
      );

      return {
        success: true,
        jointsCalibratedCount,
        skippedJoints,
        timestamp: Date.now(),
        animationName
      };
    } catch (error) {
      console.error('❌ Neutral pose calibration failed:', error);
      return {
        success: false,
        jointsCalibratedCount,
        skippedJoints,
        timestamp: Date.now(),
        animationName
      };
    }
  }

  /**
   * Update joint states from current skeleton pose
   * Should be called every animation frame
   * 
   * @param deltaTime - Time since last update (seconds)
   * @returns Update result with performance metrics
   */
  update(_deltaTime: number): UpdateResult {
    const startTime = performance.now();
    const violations: Array<{ jointId: string; coordinateIndex: number }> = [];
    let jointsUpdated = 0;

    if (!this.segmentRegistry || !this.skeleton || !this.calibrated) {
      return { jointsUpdated: 0, timeMs: 0, violations: [] };
    }

    try {
      // Update skeleton world matrices
      this.skeleton.update();

      // Compute joint states for all joints
      const allJoints = getAllJoints();
      const newQ: Record<string, number> = {};
      const newJoints: Record<string, JointState> = {};

      for (const joint of allJoints) {
        const qNeutral = this.neutralPose.get(joint.id);
        if (!qNeutral) {
          continue; // Skip joints that weren't calibrated
        }

        // Compute joint state
        const jointState = computeJointState(joint, this.segmentRegistry, qNeutral);
        if (!jointState) continue;

        // Store joint state
        newJoints[joint.id] = jointState;

        // Check for ROM violations (informational only, don't clamp yet)
        for (let i = 0; i < joint.coordinates.length; i++) {
          const coord = joint.coordinates[i];
          const coordState = jointState.coordinates[coord.id];
          if (coordState && (coordState.value < coord.range.min || coordState.value > coord.range.max)) {
            violations.push({ jointId: joint.id, coordinateIndex: i });
          }
        }

        jointsUpdated++;
      }

      // Update state
      this.currentState = { q: newQ, joints: newJoints, timestamp: Date.now() };
      this.lastUpdateTime = Date.now();

      const updateTime = performance.now() - startTime;
      return {
        jointsUpdated,
        timeMs: updateTime,
        violations
      };
    } catch (error) {
      console.error('❌ BiomechState update failed:', error);
      return { jointsUpdated, timeMs: performance.now() - startTime, violations };
    }
  }

  /**
   * Apply coordinate values back to the skeleton
   * Used for IK solving or manual coordinate manipulation
   * 
   * @param jointId - The joint to modify
   * @param coordinates - The coordinate values [q0, q1, q2] in radians
   * @param clampToROM - If true, clamp to joint ROM before applying
   */
  applyCoordinates(
    jointId: string,
    coordinates: [number, number, number],
    clampToROM: boolean = false
  ): void {
    if (!this.segmentRegistry || !this.skeleton) {
      console.warn('⚠️ Cannot apply coordinates: BiomechState not initialized');
      return;
    }

    const joint = getJoint(jointId);
    if (!joint) {
      console.warn(`⚠️ Cannot apply coordinates: Unknown joint '${jointId}'`);
      return;
    }

    const qNeutral = this.neutralPose.get(jointId);

    if (!qNeutral) {
      console.warn(`⚠️ Cannot apply coordinates: No neutral pose for '${jointId}'`);
      return;
    }

    let finalCoordinates = [...coordinates] as [number, number, number];

    if (clampToROM) {
      // Clamp each coordinate
      joint.coordinates.forEach((coord) => {
        // Map index (0,1,2) to the coordinate value
        let val = finalCoordinates[coord.index];
        
        // Handle inversion if needed for checking limits
        if (coord.invert) val = -val;

        // Clamp
        if (val < coord.range.min) val = coord.range.min;
        if (val > coord.range.max) val = coord.range.max;

        // Invert back if needed
        if (coord.invert) val = -val;

        finalCoordinates[coord.index] = val;
      });
    }

    applyCoordinatesToSkeleton(joint, finalCoordinates, qNeutral, this.segmentRegistry);

    // Update current state
    // TODO: Update ModelState correctly
  }

  /**
   * Validate and clamp a bone's rotation based on biomechanical constraints
   * Replaces legacy validateRotation()
   */
  validateBone(bone: THREE.Bone): void {
    if (!this.segmentRegistry || !this.calibrated) return;

    const jointId = this.boneToJointMap.get(bone.uuid);
    if (!jointId) return;

    const joint = getJoint(jointId);
    if (!joint) return;

    // Get current state (which computes q from current bone rotation)
    const jointState = this.getJointState(jointId);
    if (!jointState) return;

    // Extract coordinates and prepare for re-application
    const coords: [number, number, number] = [0, 0, 0];
    
    joint.coordinates.forEach(coord => {
        const state = jointState.coordinates[coord.id];
        if (state) {
            let val = state.value;
            // Un-invert because applyCoordinates will re-invert
            if (coord.invert) val = -val;
            coords[coord.index] = val;
        }
    });

    // Apply with clamping enabled
    this.applyCoordinates(jointId, coords, true);
  }

  /**
   * Get neutral quaternion for a joint
   */
  getNeutralQuaternion(jointId: string): THREE.Quaternion | undefined {
    return this.neutralPose.get(jointId)?.clone();
  }

  /**
   * Get current joint state (coordinates and quaternions)
   * 
   * @param jointId - The joint to query
   * @returns Joint state or null if not available
   */
  getJointState(jointId: string): JointState | null {
    if (!this.segmentRegistry || !this.calibrated) {
      return null;
    }

    const joint = getJoint(jointId);
    if (!joint) {
      return null;
    }

    const qNeutral = this.neutralPose.get(jointId);

    if (!qNeutral) {
      return null;
    }

    return computeJointState(joint, this.segmentRegistry, qNeutral);
  }

  /**
   * Get coordinate value for a specific DOF
   * 
   * @param jointId - The joint to query
   * @param coordIndex - The coordinate index (0, 1, or 2)
   * @returns Coordinate value in radians, or null if not available
   */
  getCoordinateValue(jointId: string, coordIndex: 0 | 1 | 2): number | null {
    const jointState = this.currentState.joints[jointId];
    if (!jointState) {
      return null;
    }
    const joint = getJoint(jointId);
    if (!joint || coordIndex >= joint.coordinates.length) {
      return null;
    }
    const coordId = joint.coordinates[coordIndex].id;
    const coordState = jointState.coordinates[coordId];
    return coordState ? coordState.value : null;
  }

  /**
   * Get all current coordinate values
   * 
   * @returns Model state with all joint coordinates
   */
  getModelState(): ModelState {
    return { ...this.currentState };
  }

  /**
   * Check if the system is initialized
   */
  isInitialized(): boolean {
    return this.segmentRegistry !== null && this.skeleton !== null;
  }

  /**
   * Check if neutral pose has been calibrated
   */
  isCalibrated(): boolean {
    return this.calibrated;
  }

  /**
   * Get the segment registry (for advanced queries)
   */
  getSegmentRegistry(): SegmentRegistry | null {
    return this.segmentRegistry;
  }

  /**
   * Get time since last update
   * 
   * @returns Milliseconds since last update, or -1 if never updated
   */
  getTimeSinceLastUpdate(): number {
    if (this.lastUpdateTime === 0) {
      return -1;
    }
    return Date.now() - this.lastUpdateTime;
  }

  /**
   * Reset the state (for testing or skeleton replacement)
   */
  reset(): void {
    this.segmentRegistry = null;
    this.skeleton = null;
    this.neutralPose.clear();
    this.currentState = { q: {}, joints: {}, timestamp: 0 };
    this.calibrated = false;
    this.lastUpdateTime = 0;
    console.log('🔄 BiomechState reset');
  }

  /**
   * Get diagnostics for debugging
   */
  getDiagnostics(): {
    initialized: boolean;
    calibrated: boolean;
    segmentCount: number;
    jointCount: number;
    neutralPoseCount: number;
    lastUpdateAge: number;
  } {
    return {
      initialized: this.isInitialized(),
      calibrated: this.calibrated,
      segmentCount: this.skeleton?.bones.length ?? 0,
      jointCount: Object.keys(this.currentState.joints).length,
      neutralPoseCount: this.neutralPose.size,
      lastUpdateAge: this.getTimeSinceLastUpdate()
    };
  }
}
