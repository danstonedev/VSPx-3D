/**
 * Interactive Bone Controller
 * 
 * Complete drag-to-pose system with IK solving, constraint enforcement,
 * and visual feedback. Supports both mouse and touch interactions.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CCDIKHelper } from 'three/examples/jsm/animation/CCDIKSolver.js';
import { RotationCompensatedIKSolver } from './utils/RotationCompensatedIKSolver';
import {
  buildIKConfiguration,
  findBoneByName,
  getIKChainConfig,
  updateIKTarget
} from './utils/ikSolverConfig';
import { SKELETON_MAP } from './utils/skeletonMap';
import { JOINT_HANDLE_NAMES } from './utils/jointLabels';
import { captureConstraintReferencePose, clearConstraintReferencePose, type ConstraintViolation } from './constraints/constraintValidator';
import { useViewerDispatch, useViewerSelector } from './state/viewerState';
import { captureJointNeutralPose, clearJointNeutralPose } from './biomech/jointAngles';
import { BiomechState } from '../../biomech/engine/biomechState';
import { useCoordinateEngine } from './utils/debugFlags';

import { capturePoseSnapshot, diffPoseSnapshots, formatPoseDeltas, type PoseSnapshot } from './utils/skeletonDiagnostics';
import { useBoneInteraction } from './hooks/useBoneInteraction';
import { DigitalGoniometer } from './debug/DigitalGoniometer';
import './InteractiveBoneController.css'

// Global feature flag to table IK end-to-end without removing code paths
// When false, no IK targets or solvers are created and the skeleton remains unchanged
const IK_FEATURE_ENABLED = true;

export interface InteractiveBoneControllerProps {
  skinnedMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  skeletonRoot: THREE.Object3D;
  enabled?: boolean;
  showVisualFeedback?: boolean;
  showDebugInfo?: boolean;
  constraintsEnabled?: boolean;
  playbackMode?: boolean; // New: enables joint selection during animation playback for live ROM tracking
  onBoneSelect?: (bone: THREE.Bone | null) => void;
  onConstraintViolation?: (violations: ConstraintViolation[]) => void;
  onDragStart?: (bone: THREE.Bone, plane: THREE.Plane) => void;
  onDragEnd?: () => void;
  resetCounter?: number;
}

export default function InteractiveBoneController({
  skinnedMesh,
  skeleton,
  skeletonRoot,
  enabled = true,
  showVisualFeedback = true,
  showDebugInfo = false,
  constraintsEnabled = true,
  playbackMode = false,
  onBoneSelect,
  onConstraintViolation,
  onDragStart,
  onDragEnd,
  resetCounter = 0,
}: InteractiveBoneControllerProps) {

  const animationId = useViewerSelector(state => state.playback.animationId);
  const biomechState = useViewerSelector(state => state.ik.biomechState); // Get biomechState from store
  const dispatch = useViewerDispatch();
  const [ikSolver, setIkSolver] = useState<RotationCompensatedIKSolver | null>(null);
  const [ikHelper, setIkHelper] = useState<CCDIKHelper | null>(null);
  const [ikTargets, setIkTargets] = useState<Map<string, THREE.Bone>>(new Map());

  // Phase 2: Coordinate engine state (only created if feature flag enabled)
  const biomechStateRef = useRef<BiomechState | null>(null);
  const coordinateEngineEnabled = useCoordinateEngine();

  // Debug: Log feature flag status on mount
  useEffect(() => {
    console.log(`🧬 Coordinate engine ${coordinateEngineEnabled ? 'ENABLED' : 'DISABLED'}`);
  }, [coordinateEngineEnabled]);

  // Force re-render when calibration changes
  const [calibrationVersion, setCalibrationVersion] = useState(0);

  // Keep viewer state in sync with coordinate engine lifecycle
  useEffect(() => {
    if (coordinateEngineEnabled) return;
    biomechStateRef.current?.reset();
    biomechStateRef.current = null;
    dispatch({ type: 'ik/setBiomechState', biomechState: null });
  }, [coordinateEngineEnabled, dispatch]);

  useEffect(() => {
    if (skeleton) return;
    biomechStateRef.current?.reset();
    biomechStateRef.current = null;
    dispatch({ type: 'ik/setBiomechState', biomechState: null });
  }, [skeleton, dispatch]);

  // Cleanup on unmount (or when controller is removed)
  useEffect(() => {
    return () => {
      biomechStateRef.current?.reset();
      biomechStateRef.current = null;
      dispatch({ type: 'ik/setBiomechState', biomechState: null });
    };
  }, [dispatch]);

  const [isReady, setIsReady] = useState(false);
  const bindPoseRef = useRef<Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>>(new Map());
  const armatureBindPoseRef = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } | null>(null);
  const ikRestPoseRef = useRef<Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>>(new Map());
  // Note: constraintBindPoseRef removed - now using shared constraintReferencePose from constraintValidator.ts
  const restPoseSnapshotRef = useRef<PoseSnapshot | null>(null);
  const logPoseDiagnostics = useCallback((label: string, poseSnapshot?: PoseSnapshot | null) => {
    if (!showDebugInfo || !skeleton) return;
    const baseline = restPoseSnapshotRef.current;
    if (!baseline) return;
    const snapshot = poseSnapshot ?? capturePoseSnapshot(skeleton);
    const deltas = diffPoseSnapshots(baseline, snapshot, 1e-4);
    if (!deltas.length) {
      console.log(`🧪 Pose delta (${label}): none`);
      return;
    }
    console.log(`🧪 Pose delta (${label}) — ${deltas.length}/${skeleton.bones.length} bones:
${formatPoseDeltas(deltas)}`);
  }, [showDebugInfo, skeleton]);

  const effectorWorldPos = useMemo(() => new THREE.Vector3(), []);
  const targetWorldPos = useMemo(() => new THREE.Vector3(), []);
  const jointHandleBones = useMemo(() => {
    if (!skeleton) return [];
    return JOINT_HANDLE_NAMES.map(name => findBoneByName(skeleton, name)).filter((bone): bone is THREE.Bone => Boolean(bone));
  }, [skeleton]);

  // Scapulohumeral Rhythm Logic
  const applyShoulderRhythm = useCallback(() => {
    if (!skeleton) return;

    const applySide = (armName: string, shoulderName: string, spineName: string, isLeft: boolean) => {
      const arm = findBoneByName(skeleton, armName);
      const shoulder = findBoneByName(skeleton, shoulderName);
      const spine = findBoneByName(skeleton, spineName);

      if (!arm || !shoulder || !spine) return;

      // Calculate Arm elevation relative to Spine (Thorax)
      // Use world vectors to determine angle
      const armVector = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.quaternion);
      const spineVector = new THREE.Vector3(0, 1, 0).applyQuaternion(spine.quaternion);

      // Angle between arm and spine
      const angleRad = armVector.angleTo(spineVector);
      const angleDeg = THREE.MathUtils.radToDeg(angleRad);

      // Elevation is roughly (180 - angleDeg)
      let elevation = 180 - angleDeg;
      elevation = Math.max(0, Math.min(180, elevation));

      // Scapulohumeral Rhythm: 2:1 ratio.
      // Total Elevation = GH + ST.
      // ST = Total / 3.

      // CRITICAL FIX: The restPose is the T-pose (Arm Elev ~90°).
      // In T-pose, the clavicle is already elevated ~20-30°.
      // If we just apply 'targetST' (e.g. 0° for arms down) as an absolute rotation on top of T-pose,
      // we are actually ADDING 0° to the existing T-pose elevation.
      // Result: When arms are down, shoulders remain shrugged (at T-pose height).
      //
      // We must apply the DELTA from T-pose.
      // T-pose corresponds to ~90° arm elevation.
      const tPoseArmElevation = 90;
      const deltaElevation = elevation - tPoseArmElevation;

      // ST moves 1 degree for every 3 degrees of arm elevation
      const stRotationDelta = deltaElevation / 3;

      // Apply ST rotation to Shoulder bone (Clavicle)
      // We assume Z axis is elevation axis for Clavicle (based on joints.ts st_right/left)
      const restPose = ikRestPoseRef.current.get(shoulder.uuid);
      if (!restPose) return;

      const restQuat = restPose.quaternion.clone();
      const axis = new THREE.Vector3(0, 0, 1);
      // Heuristic: Left = -Z, Right = +Z for elevation (based on joints.ts)
      // st_right: Z is Upward Rotation. Range -10 to 60.
      // st_left: Z is Upward Rotation.
      const sign = isLeft ? -1 : 1;

      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(stRotationDelta * sign));

      shoulder.quaternion.copy(restQuat.multiply(rotation));
      shoulder.updateMatrixWorld(true);
    };

    applySide(SKELETON_MAP.LeftArm, SKELETON_MAP.LeftShoulder, SKELETON_MAP.Spine2, true);
    applySide(SKELETON_MAP.RightArm, SKELETON_MAP.RightShoulder, SKELETON_MAP.Spine2, false);

  }, [skeleton]);

  // Use the new interaction hook
  const {
    dragStateRef,
    highlightedBone,
    setHighlightedBone,
    hoverBone,
    isShiftHeld,
    handlers
  } = useBoneInteraction({
    skeleton,
    skinnedMesh,
    ikSolver,
    ikTargets,
    jointHandleBones,
    enabled,
    isReady,
    showDebugInfo,
    constraintsEnabled,
    ikRestPoseRef,
    restPoseSnapshotRef,
    onBoneSelect,
    onDragStart,
    onDragEnd,
    onConstraintViolation,
    onAfterSolve: applyShoulderRhythm,
    logPoseDiagnostics
  });

  const syncIKTargetsToEffectors = useCallback(() => {
    if (!skeleton || ikTargets.size === 0) return;

    ikTargets.forEach((target, chainName) => {
      const config = getIKChainConfig(chainName);
      if (!config) return;
      const effector = findBoneByName(skeleton, config.effectorBoneName);
      if (!effector) return;

      effector.getWorldPosition(effectorWorldPos);
      target.getWorldPosition(targetWorldPos);

      if (effectorWorldPos.distanceToSquared(targetWorldPos) > 1e-5) {
        updateIKTarget(target, effectorWorldPos);
      }
    });
  }, [effectorWorldPos, targetWorldPos, skeleton, ikTargets]);

  // Initialize IK system
  const captureBindPose = useCallback(() => {
    if (!skeleton) return;
    const storage = bindPoseRef.current;
    storage.clear();
    skeleton.bones.forEach((bone) => {
      storage.set(bone.uuid, {
        position: bone.position.clone(),
        quaternion: bone.quaternion.clone(),
        scale: bone.scale.clone()
      });
      bone.userData.restPose = {
        position: bone.position.clone(),
        quaternion: bone.quaternion.clone(),
        scale: bone.scale.clone()
      };
    });

    // Capture Armature (root) transform
    const armature = skeleton.bones[0]?.parent;
    if (armature) {
      armatureBindPoseRef.current = {
        position: armature.position.clone(),
        quaternion: armature.quaternion.clone(),
        scale: armature.scale.clone()
      };
      console.log('📸 Captured Armature bind pose:', armature.name, armature.scale.toArray());
    }
  }, [skeleton]);

  const restoreBindPose = useCallback((): boolean => {
    if (!skeleton) return false;
    const storage = bindPoseRef.current;
    if (storage.size === 0) return false;

    // Restore Armature transform first
    const armature = skeleton.bones[0]?.parent;
    if (armature && armatureBindPoseRef.current) {
      const snapshot = armatureBindPoseRef.current;
      armature.position.copy(snapshot.position);
      armature.quaternion.copy(snapshot.quaternion);
      armature.scale.copy(snapshot.scale);
      armature.updateMatrixWorld(true);
    }

    skeleton.bones.forEach((bone) => {
      const snapshot = storage.get(bone.uuid);
      if (!snapshot) return;
      bone.position.copy(snapshot.position);
      bone.quaternion.copy(snapshot.quaternion);
      bone.scale.copy(snapshot.scale);
      bone.updateMatrixWorld(true);
    });
    skinnedMesh?.updateMatrixWorld(true);
    return true;
  }, [skeleton, skinnedMesh]);

  // ALWAYS capture constraint reference pose (needed for ROM panel in both modes)
  useEffect(() => {
    if (!skeleton || bindPoseRef.current.size > 0) return;

    const initializeController = async () => {
      try {
        // SUCCESS: Neutral_Model.glb contains BOTH mesh geometry AND anatomical neutral pose
        // The skeleton is already in the correct calibration pose - no transform needed!

        console.log('📸 Capturing Anatomical Neutral Pose (base model is Neutral_Model.glb)...');

        // Capture current skeleton state as bind pose
        skeleton.bones.forEach((bone) => {
          bindPoseRef.current.set(bone.uuid, {
            position: bone.position.clone(),
            quaternion: bone.quaternion.clone(), // Already in Neutral!
            scale: bone.scale.clone()
          });
        });

        console.log('✅ Controller initialized with Anatomical Neutral Pose (from Neutral_Model.glb)');

        // Capture biomech neutral pose for joint coordinate systems
        console.log('🔬 Capturing biomech neutral pose for joint coordinate systems...');
        captureJointNeutralPose(skeleton);

        // Phase 2: Initialize coordinate engine if enabled
        if (coordinateEngineEnabled && !biomechStateRef.current) {
          console.log('🚀 Phase 2: Initializing coordinate engine...');
          biomechStateRef.current = new BiomechState();
          const initResult = biomechStateRef.current.initialize(skeleton);

          if (initResult.success) {
            dispatch({ type: 'ik/setBiomechState', biomechState: biomechStateRef.current });

            // Calibrate immediately since we are now in Neutral Pose
            const calibResult = biomechStateRef.current.calibrateNeutral('Neutral_Model.glb (File)');
            if (calibResult.success) {
              setCalibrationVersion(v => v + 1);
            }
          }
        }

        setIsReady(true);

      } catch (err) {
        console.error('❌ Failed to load Neutral Pose:', err);
        // Fallback: Capture current state (better than nothing, but might be T-pose or animated)
        captureConstraintReferencePose(skeleton);
        setIsReady(true);
      }
    };

    initializeController();

    return () => {
      clearConstraintReferencePose();
      clearJointNeutralPose();
    };
  }, [skeleton, coordinateEngineEnabled, animationId, dispatch]);

  // IK system initialization (only in IK mode when enabled=true)
  useEffect(() => {
    if (!skeleton || !skeletonRoot || !enabled) return;
    if (!IK_FEATURE_ENABLED) {
      console.log('🧰 IK feature is disabled (tabled). Skipping IK setup and leaving skeleton intact.');
      // Ensure UI dependent on readiness can still function
      setIsReady(true);
      return;
    }

    try {
      console.log('🎯 Initializing Interactive Bone Controller...');
      console.log('🔍 SkinnedMesh bindMatrix:', skinnedMesh.bindMatrix);
      console.log('🔍 SkinnedMesh bindMatrixInverse:', skinnedMesh.bindMatrixInverse);
      console.log('🔍 First bone inverse:', skeleton.boneInverses[0]);
      console.log('🔍 Skeleton bones:', skeleton.bones.length);
      console.log('🔍 Skeleton inverses:', skeleton.boneInverses.length);

      // DIAGNOSTIC: Check raw model T-pose BEFORE any IK setup
      const rightUpLegRaw = skeleton.bones.find(b => b.name === 'mixamorig1RightUpLeg');
      const leftUpLegRaw = skeleton.bones.find(b => b.name === 'mixamorig1LeftUpLeg');
      if (rightUpLegRaw && leftUpLegRaw) {
        const rEulerRaw = new THREE.Euler().setFromQuaternion(rightUpLegRaw.quaternion, 'XYZ');
        const lEulerRaw = new THREE.Euler().setFromQuaternion(leftUpLegRaw.quaternion, 'XYZ');
        console.log(`🏭 RAW MODEL T-POSE (before any IK setup):`);
        console.log(`   RightUpLeg: x=${(rEulerRaw.x * 180 / Math.PI).toFixed(1)}° y=${(rEulerRaw.y * 180 / Math.PI).toFixed(1)}° z=${(rEulerRaw.z * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   LeftUpLeg:  x=${(lEulerRaw.x * 180 / Math.PI).toFixed(1)}° y=${(lEulerRaw.y * 180 / Math.PI).toFixed(1)}° z=${(lEulerRaw.z * 180 / Math.PI).toFixed(1)}°`);
      }

      // Just ensure matrices are up to date - DO NOT call calculateInverses() or pose()
      // The skeleton was already correctly bound by normalizeHumanModel()
      skeleton.bones.forEach(b => b.updateMatrixWorld(true));
      skinnedMesh.updateMatrixWorld(true);

      // DIAGNOSTIC: Verify bone inverses align with the scaled rig
      if (skeleton.bones.length > 0 && skeleton.boneInverses.length > 0) {
        const testBoneIndex = 0; // Usually Hips
        const testBone = skeleton.bones[testBoneIndex];
        const inverse = skeleton.boneInverses[testBoneIndex];

        if (testBone && inverse) {
          const worldMatrix = testBone.matrixWorld.clone();
          const product = new THREE.Matrix4().multiplyMatrices(worldMatrix, inverse);
          const identity = new THREE.Matrix4();

          // Check if product is close to identity
          let maxDiff = 0;
          for (let i = 0; i < 16; i++) {
            maxDiff = Math.max(maxDiff, Math.abs(product.elements[i] - identity.elements[i]));
          }

          if (maxDiff < 0.01) {
            console.log('✅ Bone inverses verified: aligned with current bind pose');
          } else {
            console.warn(`⚠️ Bone inverses mismatch! Max diff: ${maxDiff.toFixed(6)}. Skinning artifacts may occur.`);
            console.warn('   This suggests the model was scaled/moved AFTER calculateInverses() was called.');
          }
        }
      }

      // Reset to bind T-pose if bindPose was already captured
      // (Constraint reference was already captured in the always-run effect above)
      if (bindPoseRef.current.size > 0) {
        console.log('🔄 Resetting skeleton to bind T-pose before IK setup...');
        skeleton.bones.forEach((bone) => {
          const snapshot = bindPoseRef.current.get(bone.uuid);
          if (snapshot) {
            bone.position.copy(snapshot.position);
            bone.quaternion.copy(snapshot.quaternion);
            bone.scale.copy(snapshot.scale);
          }
        });
        skeleton.bones.forEach(b => b.updateMatrixWorld(true));
        skinnedMesh.updateMatrixWorld(true);
        console.log('✅ Skeleton reset to bind T-pose');
      }

      // CRITICAL: Capture bind pose FIRST - this is NOW the clean T-pose after reset
      // This must happen before ANY other operations that might modify bone transforms
      captureBindPose();
      console.log('📸 Captured bind pose (clean model T-pose after reset)');

      // CRITICAL: Capture IK rest pose SECOND, before any IK setup
      // This must be the clean T-pose state before targets are added
      // Otherwise we capture a polluted state with previous animations/poses
      ikRestPoseRef.current.clear();
      skeleton.bones.forEach((bone) => {
        if (!bone.name.startsWith('IKTarget_')) {
          ikRestPoseRef.current.set(bone.uuid, {
            position: bone.position.clone(),
            quaternion: bone.quaternion.clone(),
            scale: bone.scale.clone()
          });
        }
      });

      // ALWAYS log hip angles when capturing rest pose (unconditional diagnostic)
      const rightUpLeg = skeleton.bones.find(b => b.name === 'mixamorig1RightUpLeg');
      const leftUpLeg = skeleton.bones.find(b => b.name === 'mixamorig1LeftUpLeg');
      if (rightUpLeg && leftUpLeg) {
        const rEuler = new THREE.Euler().setFromQuaternion(rightUpLeg.quaternion, 'XYZ');
        const lEuler = new THREE.Euler().setFromQuaternion(leftUpLeg.quaternion, 'XYZ');
        console.log(`📸 CAPTURED IK REST POSE (${ikRestPoseRef.current.size} bones):`);
        console.log(`   RightUpLeg: x=${(rEuler.x * 180 / Math.PI).toFixed(1)}° y=${(rEuler.y * 180 / Math.PI).toFixed(1)}° z=${(rEuler.z * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   LeftUpLeg:  x=${(lEuler.x * 180 / Math.PI).toFixed(1)}° y=${(lEuler.y * 180 / Math.PI).toFixed(1)}° z=${(lEuler.z * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   ⚠️ If these angles are at constraint limits (-45°/45°/-30°), the MODEL FILE T-POSE is corrupted!`);
      }

      // Build IK configuration AFTER capturing rest pose
      const { iks, targets } = buildIKConfiguration(skeleton, skeletonRoot, biomechState);

      if (iks.length === 0) {
        console.warn('No valid IK chains created');
        return;
      }

      console.log('🦴 IK Setup:');
      console.log('  - Chains:', iks.length);
      console.log('  - Targets:', targets.size);
      console.log('  - Sample target pos:', Array.from(targets.values())[0]?.position);

      // Create RotationCompensatedIKSolver to handle the Armature's 90° rotation
      const solver = new RotationCompensatedIKSolver(skinnedMesh, iks);
      setIkSolver(solver);

      // Create visual helper (for debugging)
      if (showDebugInfo) {
        const helper = new CCDIKHelper(skinnedMesh, iks, 0.03);
        setIkHelper(helper);
        skeletonRoot.add(helper);
      }

      // CRITICAL: Bind pose and IK rest pose already captured at the start
      // (See lines ~193-230 above where we capture both BEFORE any IK setup)

      setIkTargets(targets);
      setIsReady(true);
      restPoseSnapshotRef.current = capturePoseSnapshot(skeleton);
      console.log('✅ IK Controller ready (constraint reference already locked to T-pose)');

      console.log(`✅ IK Controller ready: ${iks.length} chains, ${targets.size} targets`);

    } catch (error) {
      console.error('❌ IK Controller initialization failed:', error);
    }

    return () => {
      // Cleanup IK-specific resources only
      if (ikHelper) {
        skeletonRoot.remove(ikHelper);
        ikHelper.dispose();
        setIkHelper(null);
      }
      // Note: bindPoseRef and constraint reference are cleaned up by the always-run effect
    };
  }, [skeleton, skeletonRoot, skinnedMesh, enabled, showDebugInfo, captureBindPose, biomechState, calibrationVersion]); // Add calibrationVersion dependency

  // Remove IK helper when switching back to playback mode
  useEffect(() => {
    if (playbackMode && ikHelper && skeletonRoot) {
      console.log('🧹 Removing IK debug helper (switched to playback mode)');
      skeletonRoot.remove(ikHelper);
      ikHelper.dispose();
      setIkHelper(null);
    }
  }, [playbackMode, ikHelper, skeletonRoot]);

  // Reset to bind T-pose and move IK targets back to effectors
  const resetToBindPose = useCallback(() => {
    if (!skeleton || !skeletonRoot) return;
    try {
      // Restore the captured bind pose (normalized T-pose)
      const restored = restoreBindPose();
      if (!restored) {
        // If we have no snapshot, restore from IK rest pose
        ikRestPoseRef.current.forEach((snapshot, uuid) => {
          const bone = skeleton.bones.find(b => b.uuid === uuid);
          if (bone && !bone.name.startsWith('IKTarget_')) {
            bone.position.copy(snapshot.position);
            bone.quaternion.copy(snapshot.quaternion);
            bone.scale.copy(snapshot.scale);
          }
        });
        skeleton.bones.forEach(b => b.updateMatrixWorld(true));
        captureBindPose();
      } else {
        skeleton.bones.forEach(b => b.updateMatrixWorld(true));
      }

      // NOTE: Do NOT recapture constraint reference pose here!
      // The constraint reference is IMMUTABLE and was locked to the anatomical T-pose at initialization.
      // Recapturing would pollute it with any accumulated drift or manual adjustments.
      restPoseSnapshotRef.current = capturePoseSnapshot(skeleton);

      // Re-sync all IK targets to their effector positions
      syncIKTargetsToEffectors();

      // NO ikSolver.update() needed - targets are already at effector positions
      // Calling update() here would try to solve IK with targets at current positions = no-op or worse

      setHighlightedBone(null);
      onBoneSelect?.(null);
      onConstraintViolation?.([]);
      console.log('🔄 Reset to bind pose (snapshot)');
    } catch (e) {
      console.warn('Failed to reset to bind pose', e);
    }
  }, [skeleton, skeletonRoot, syncIKTargetsToEffectors, restoreBindPose, captureBindPose, onBoneSelect, onConstraintViolation, setHighlightedBone]);


  const lastResetCounterRef = useRef(resetCounter);
  useEffect(() => {
    if (resetCounter !== lastResetCounterRef.current) {
      lastResetCounterRef.current = resetCounter;
      if (resetCounter > 0) {
        resetToBindPose();
      }
    }
  }, [resetCounter, resetToBindPose]);

  // Auto-reset on load (once when ready)
  const hasAutoResetRef = useRef(false);
  useEffect(() => {
    if (isReady && !hasAutoResetRef.current && enabled) {
      console.log('🚀 Auto-resetting to bind pose on initialization...');
      resetToBindPose();
      hasAutoResetRef.current = true;
    }
  }, [isReady, enabled, resetToBindPose]);

  useEffect(() => {
    if (!isReady || dragStateRef.current.isDragging) return;
    syncIKTargetsToEffectors();
  }, [isReady, syncIKTargetsToEffectors, dragStateRef]);

  // Continuous IK solving and constraint checking
  useFrame(() => {
    if (!ikSolver || !enabled) return;
    if (!dragStateRef.current.isDragging) {
      syncIKTargetsToEffectors();
      // Also apply rhythm when not dragging (e.g. manual FK)
      applyShoulderRhythm();
    }
  });

  // Phase 2: Update coordinate engine every frame
  useFrame((_, delta) => {
    if (!coordinateEngineEnabled || !biomechStateRef.current) return;
    if (!biomechStateRef.current.isCalibrated()) return;

    const updateResult = biomechStateRef.current.update(delta);

    // Log violations only if verbose debugging enabled
    if (showDebugInfo && updateResult.violations.length > 0) {
      console.log(`⚠️ Coordinate ROM violations (${updateResult.violations.length}):`,
        updateResult.violations.slice(0, 3) // Only log first 3
      );
    }
  });

  if (!isReady) {
    return null;
  }

  return (
    <>
      {/* Interaction layer: invisible capture volume around the model.
          We avoid re-parenting the actual SkinnedMesh to prevent flicker/twitching. */}
      <mesh
        onPointerDown={handlers.handlePointerDown}
        onPointerMove={handlers.handlePointerMove}
        onPointerUp={handlers.handlePointerUp}
        onPointerEnter={handlers.handlePointerEnter}
        onPointerLeave={handlers.handlePointerLeave}
        position={[0, 1.0, 0]}
      >
        <boxGeometry args={[1.2, 2.2, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Visual feedback */}
      {showVisualFeedback && (
        <>
          {/* IK targets only visible in IK mode */}
          {!playbackMode && Array.from(ikTargets.entries()).map(([chainName, target]) => (
            <IKTargetSphere
              key={chainName}
              target={target}
              isActive={dragStateRef.current.ikTarget === target}
              size={0.12}
              renderOrder={1000}
            />
          ))}

          {/* Render joint handles based on mode */}
          {playbackMode ? (
            // Playback mode: cyan spheres for live ROM tracking during animation
            jointHandleBones.map((bone) => (
              <PlaybackJointHandle
                key={`playback-joint-${bone.uuid}`}
                bone={bone}
                isSelected={highlightedBone?.uuid === bone.uuid}
                onSelect={() => handlers.handleJointHandleSelect(bone)}
                size={0.05}
              />
            ))
          ) : (
            // IK mode: purple spheres with Shift+click interaction
            jointHandleBones.map((bone) => (
              <JointHandle
                key={`joint-${bone.uuid}`}
                bone={bone}
                isSelected={highlightedBone?.uuid === bone.uuid}
                isShiftHeld={isShiftHeld}
                onSelect={() => handlers.handleJointHandleSelect(bone)}
                onHover={(hovering: boolean) => handlers.handleJointHandleHover(hovering ? bone : null)}
                size={0.04}
                opacity={0.65}
                renderOrder={500}
              />
            ))
          )}

          {highlightedBone && (
            <BoneHighlight bone={highlightedBone} color="#00ff00" size={0.06} />
          )}

          {hoverBone && hoverBone !== highlightedBone && (
            <BoneHighlight bone={hoverBone} color="#ffff00" size={0.04} opacity={0.5} />
          )}

          {/* Digital Goniometer - appears when joint is selected */}
          {highlightedBone && skeleton && (
            <DigitalGoniometer
              bone={highlightedBone}
              skeleton={skeleton}
              biomechState={biomechState}
              size={0.25}
              opacity={0.12}
              showLabels={true}
            />
          )}
        </>
      )}

      {/* Debug info */}
      {showDebugInfo && (
        <Html position={[0, 2.5, 0]} center>
          <div className="ik-controller-debug">
            <div className="ik-controller-debug__header">🎮 Interactive Bone Controller</div>
            <div className="ik-controller-debug__status">Status: {isReady ? '✅ Ready' : '⏳ Loading'}</div>
            <div className="ik-controller-debug__status">Mode: {dragStateRef.current.isDragging ? '🖱️ Dragging' : '⏸️ Idle'}</div>
            {highlightedBone && (
              <>
                <div className="ik-controller-debug__selected">
                  <strong>Selected:</strong> {highlightedBone.name}
                </div>
                {dragStateRef.current.chainConfig && (
                  <div className="ik-controller-debug__chain">
                    Chain: {dragStateRef.current.chainConfig.name}
                  </div>
                )}
              </>
            )}
            {hoverBone && hoverBone !== highlightedBone && (
              <div className="ik-controller-debug__hover">Hover: {hoverBone.name}</div>
            )}
          </div>
        </Html>
      )}

      {/* IK Helper (if enabled) */}
      {ikHelper && <primitive object={ikHelper} />}
    </>
  );
}

/**
 * Visual highlight for selected/hovered bones
 */
function BoneHighlight({
  bone,
  color = '#00ff00',
  size = 0.05,
  opacity = 0.7
}: {
  bone: THREE.Bone;
  color?: string;
  size?: number;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);

    // Pulse animation
    const scale = size + Math.sin(Date.now() * 0.004) * (size * 0.2);
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest={false}
      />
    </mesh>
  );
}

/**
 * Clickable IK target sphere
 */
function IKTargetSphere({
  target,
  isActive,
  size = 0.12,
  renderOrder = 1000
}: {
  target: THREE.Bone;
  isActive: boolean;
  size?: number;
  renderOrder?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);

    // Pulse effect when active
    if (isActive) {
      const scale = size + Math.sin(Date.now() * 0.006) * (size * 0.2);
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(size);
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={renderOrder}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={isActive ? "#00ff00" : "#ffaa00"}
        emissive={isActive ? "#00ff00" : "#ff8800"}
        emissiveIntensity={0.5}
        transparent
        opacity={0.9}
        depthTest={false}
      />
    </mesh>
  );
}

type JointHandleProps = {
  bone: THREE.Bone;
  isSelected: boolean;
  isShiftHeld: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  size?: number;
  opacity?: number;
  renderOrder?: number;
};

function JointHandle({
  bone,
  isSelected,
  isShiftHeld,
  onSelect,
  onHover,
  size = 0.04,
  opacity = 0.65,
  renderOrder = 500
}: JointHandleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);

    // Size feedback: larger when selected or when Shift+hover
    let targetSize = size;
    if (isSelected) {
      targetSize = size * 1.5;
    } else if (isHovered && isShiftHeld) {
      targetSize = size * 1.3; // Grow when hovering with Shift
    }

    meshRef.current.scale.setScalar(targetSize);
  });

  return (
    <mesh
      ref={meshRef}
      renderOrder={renderOrder}
      onPointerDown={(e) => {
        // Stop all propagation to prevent OrbitControls from activating
        e.stopPropagation();
        e.nativeEvent.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onSelect();
      }}
      onPointerEnter={() => {
        setIsHovered(true);
        onHover(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        onHover(false);
      }}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        color={isSelected ? "#00ff00" : (isHovered && isShiftHeld ? "#ffaa00" : "#aa00ff")}
        emissive={isSelected ? "#00ff00" : (isHovered && isShiftHeld ? "#ff8800" : "#8800ff")}
        emissiveIntensity={isSelected ? 0.5 : (isHovered && isShiftHeld ? 0.4 : 0.3)}
        transparent
        opacity={isSelected ? 0.85 : (isHovered && isShiftHeld ? 0.8 : opacity)}
        depthTest={true}
      />
    </mesh>
  );
}

// Playback mode joint handle - clickable spheres for ROM tracking during animation
type PlaybackJointHandleProps = {
  bone: THREE.Bone;
  isSelected: boolean;
  onSelect: () => void;
  size?: number;
};

function PlaybackJointHandle({ bone, isSelected, onSelect, size = 0.05 }: PlaybackJointHandleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);

    // Scale feedback for selection and hover
    let targetSize = size;
    if (isSelected) {
      targetSize = size * 1.5;
    } else if (isHovered) {
      targetSize = size * 1.2;
    }
    meshRef.current.scale.setScalar(targetSize);
  });

  return (
    <mesh
      ref={meshRef}
      renderOrder={600}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onSelect();
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={isSelected ? "#00ffff" : (isHovered ? "#66ddff" : "#00cccc")}
        emissive={isSelected ? "#00ffff" : (isHovered ? "#00cccc" : "#008888")}
        emissiveIntensity={isSelected ? 0.6 : (isHovered ? 0.4 : 0.3)}
        transparent
        opacity={isSelected ? 0.85 : 0.65}
        depthTest={true}
      />
    </mesh>
  );
}
