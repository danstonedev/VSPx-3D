/**
 * Interactive Bone Controller
 * 
 * Complete drag-to-pose system with IK solving, constraint enforcement,
 * and visual feedback. Supports both mouse and touch interactions.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CCDIKHelper } from 'three/examples/jsm/animation/CCDIKSolver.js';
import { RotationCompensatedIKSolver } from './utils/RotationCompensatedIKSolver';
import { 
  buildIKConfiguration,
  findBoneByName, 
  getIKChainConfig,
  updateIKTarget,
  type IKChainConfig 
} from './utils/ikSolverConfig';
import { captureConstraintReferencePose, clearConstraintReferencePose, validateRotation, type ConstraintViolation } from './constraints/constraintValidator';
import { getConstraintForBone } from './constraints/jointConstraints';
import { capturePoseSnapshot, diffPoseSnapshots, formatPoseDeltas, type PoseSnapshot } from './utils/skeletonDiagnostics';
import './InteractiveBoneController.css'

export interface InteractiveBoneControllerProps {
  skinnedMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  skeletonRoot: THREE.Object3D;
  enabled?: boolean;
  showVisualFeedback?: boolean;
  showDebugInfo?: boolean;
  constraintsEnabled?: boolean;
  onBoneSelect?: (bone: THREE.Bone | null) => void;
  onConstraintViolation?: (violations: ConstraintViolation[]) => void;
  onDragStart?: (bone: THREE.Bone, plane: THREE.Plane) => void;
  onDragEnd?: () => void;
  resetCounter?: number;
}

interface DragState {
  isDragging: boolean;
  selectedBone: THREE.Bone | null;
  ikTarget: THREE.Bone | null;
  dragPlane: THREE.Plane;
  initialTargetPos: THREE.Vector3;
  chainConfig: IKChainConfig | null;
}

const JOINT_HANDLE_NAMES = [
  'mixamorig1LeftShoulder',
  'mixamorig1LeftArm',
  'mixamorig1LeftForeArm',
  'mixamorig1LeftHand',
  'mixamorig1RightShoulder',
  'mixamorig1RightArm',
  'mixamorig1RightForeArm',
  'mixamorig1RightHand',
  'mixamorig1LeftUpLeg',
  'mixamorig1LeftLeg',
  'mixamorig1LeftFoot',
  'mixamorig1RightUpLeg',
  'mixamorig1RightLeg',
  'mixamorig1RightFoot',
  'mixamorig1Spine',
  'mixamorig1Spine1',
  'mixamorig1Spine2',
  'mixamorig1Neck',
  'mixamorig1Head'
];

export default function InteractiveBoneController({
  skinnedMesh,
  skeleton,
  skeletonRoot,
  enabled = true,
  showVisualFeedback = true,
  showDebugInfo = false,
  constraintsEnabled = true,
  onBoneSelect,
  onConstraintViolation,
  onDragStart,
  onDragEnd,
  resetCounter = 0,
}: InteractiveBoneControllerProps) {
  
  const { camera, raycaster, gl } = useThree();
  const [ikSolver, setIkSolver] = useState<RotationCompensatedIKSolver | null>(null);
  const [ikHelper, setIkHelper] = useState<CCDIKHelper | null>(null);
  const [ikTargets, setIkTargets] = useState<Map<string, THREE.Bone>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const bindPoseRef = useRef<Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>>(new Map());
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
  
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    selectedBone: null,
    ikTarget: null,
    dragPlane: new THREE.Plane(),
    initialTargetPos: new THREE.Vector3(),
    chainConfig: null
  });
  
  const [highlightedBone, setHighlightedBone] = useState<THREE.Bone | null>(null);
  const [constraintViolations, setConstraintViolations] = useState(0);
  const [hoverBone, setHoverBone] = useState<THREE.Bone | null>(null);
  const prevConstraintsEnabledRef = useRef(constraintsEnabled);
  const effectorWorldPos = useMemo(() => new THREE.Vector3(), []);
  const targetWorldPos = useMemo(() => new THREE.Vector3(), []);
  const jointHandleBones = useMemo(() => {
    if (!skeleton) return [];
    return JOINT_HANDLE_NAMES.map(name => findBoneByName(skeleton, name)).filter((bone): bone is THREE.Bone => Boolean(bone));
  }, [skeleton]);
  
  // Refs for raycasting
  const pointerRef = useRef(new THREE.Vector2());

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
  }, [skeleton]);

  const restoreBindPose = useCallback((): boolean => {
    if (!skeleton) return false;
    const storage = bindPoseRef.current;
    if (storage.size === 0) return false;
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

  useEffect(() => {
    if (!skeleton || !skeletonRoot || !enabled) return;
    
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

      // CRITICAL FIX: Reset to clean T-pose BEFORE capturing anything
      // If user was playing animations, bones are in animated poses
      // First, capture the bind pose if not already done (from current state)
      // This happens on first load when skeleton is in T-pose
      if (bindPoseRef.current.size === 0) {
        console.log('📸 Capturing initial bind pose from model T-pose...');
        skeleton.bones.forEach((bone) => {
          bindPoseRef.current.set(bone.uuid, {
            position: bone.position.clone(),
            quaternion: bone.quaternion.clone(),
            scale: bone.scale.clone()
          });
        });
      }
      
      // Now restore to that bind pose (in case animations were playing)
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
      const { iks, targets } = buildIKConfiguration(skeleton, skeletonRoot);
      
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
      captureConstraintReferencePose(skeleton);
      restPoseSnapshotRef.current = capturePoseSnapshot(skeleton);
      restPoseSnapshotRef.current = capturePoseSnapshot(skeleton);
      console.log('✅ Captured IK rest pose (normalized T-pose, excluding targets)');
      
      console.log(`✅ IK Controller ready: ${iks.length} chains, ${targets.size} targets`);
      
    } catch (error) {
      console.error('❌ IK Controller initialization failed:', error);
    }
    
    return () => {
      // Cleanup
      if (ikHelper) {
        skeletonRoot.remove(ikHelper);
        ikHelper.dispose();
      }
      bindPoseRef.current.clear();
      clearConstraintReferencePose();
    };
  }, [skeleton, skeletonRoot, skinnedMesh, enabled, showDebugInfo, captureBindPose]);

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
      
      captureConstraintReferencePose(skeleton);
      restPoseSnapshotRef.current = capturePoseSnapshot(skeleton);
      
      // Re-sync all IK targets to their effector positions
      syncIKTargetsToEffectors();
      
      // NO ikSolver.update() needed - targets are already at effector positions
      // Calling update() here would try to solve IK with targets at current positions = no-op or worse
      
      setHighlightedBone(null);
      setHoverBone(null);
      setConstraintViolations(0);
      onBoneSelect?.(null);
      onConstraintViolation?.([]);
      console.log('🔄 Reset to bind pose (snapshot)');
    } catch (e) {
      console.warn('Failed to reset to bind pose', e);
    }
  }, [skeleton, skeletonRoot, syncIKTargetsToEffectors, restoreBindPose, captureBindPose, onBoneSelect, onConstraintViolation]);


  const lastResetCounterRef = useRef(resetCounter);
  useEffect(() => {
    if (resetCounter !== lastResetCounterRef.current) {
      lastResetCounterRef.current = resetCounter;
      if (resetCounter > 0) {
        resetToBindPose();
      }
    }
  }, [resetCounter, resetToBindPose]);

  useEffect(() => {
    if (!constraintsEnabled && prevConstraintsEnabledRef.current !== constraintsEnabled) {
      setConstraintViolations(0);
      onConstraintViolation?.([]);
    }
    prevConstraintsEnabledRef.current = constraintsEnabled;
  }, [constraintsEnabled, onConstraintViolation]);

  useEffect(() => {
    if (!isReady || dragStateRef.current.isDragging) return;
    syncIKTargetsToEffectors();
  }, [isReady, syncIKTargetsToEffectors]);
  
  // Find IK target at pointer (raycast against target spheres, not bones)
  const findTargetAtPointer = useCallback((event: ThreeEvent<PointerEvent>): { target: THREE.Bone; chainName: string } | null => {
    if (!ikTargets || ikTargets.size === 0) return null;
    
    const ray: THREE.Ray | null = (event as any).ray ?? null;
    if (!ray) return null;
    
    const tmpWorld = new THREE.Vector3();
    let closestTarget: { target: THREE.Bone; chainName: string } | null = null;
    let closestDistance = 0.15; // Max click distance (meters)
    
    // Check each IK target
    ikTargets.forEach((target, chainName) => {
      target.getWorldPosition(tmpWorld);
      const d = ray.distanceToPoint(tmpWorld);
      if (d < closestDistance) {
        closestDistance = d;
        closestTarget = { target, chainName };
      }
    });
    
    return closestTarget;
  }, [ikTargets]);
  
  // Calculate drag plane perpendicular to camera
  const calculateDragPlane = useCallback((position: THREE.Vector3): THREE.Plane => {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Plane normal points toward camera
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(cameraDirection.negate(), position);
    
    return plane;
  }, [camera]);
  
  // Handle pointer down (start drag)
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!enabled || !isReady || !ikSolver) return;
    
    // Find which IK target was clicked
    const targetInfo = findTargetAtPointer(event);
    if (!targetInfo) return;
    
    const { target: ikTarget, chainName } = targetInfo;
    
    // Get chain config
    const chainConfig = getIKChainConfig(chainName);
    if (!chainConfig) {
      console.warn(`No config found for chain ${chainName}`);
      return;
    }
    
    // Find the effector bone for this chain (for display/events)
    const effectorBone = findBoneByName(skeleton, chainConfig.effectorBoneName);
    
    // Get target's current world position
    const targetWorldPos = new THREE.Vector3();
    ikTarget.getWorldPosition(targetWorldPos);
    
    // Calculate drag plane
    const dragPlane = calculateDragPlane(targetWorldPos);
    
    // Start dragging
    dragStateRef.current = {
      isDragging: true,
      selectedBone: effectorBone || null,
      ikTarget,
      dragPlane,
      initialTargetPos: targetWorldPos.clone(),
      chainConfig
    };
    
    setHighlightedBone(effectorBone || null);
    onBoneSelect?.(effectorBone || null);
    onDragStart?.(effectorBone || ikTarget, dragPlane);

    if (showDebugInfo) {
      restPoseSnapshotRef.current = restPoseSnapshotRef.current || capturePoseSnapshot(skeleton);
    }
    
    // Set pointer capture for smooth dragging
    (event.target as any).setPointerCapture?.(event.pointerId);
    
    // Only stop propagation when we actually begin dragging
    event.stopPropagation();
    
    console.log(`🎯 Started dragging IK target: ${chainName}`);
    
  }, [enabled, isReady, ikSolver, ikTargets, skeleton, findTargetAtPointer, calculateDragPlane, onBoneSelect, onDragStart]);
  
  // Handle pointer move (drag)
  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const dragState = dragStateRef.current;
    
    if (!dragState.isDragging || !dragState.ikTarget || !ikSolver) return;
    
    // While dragging, consume events so OrbitControls doesn't fight us
    event.stopPropagation();
    
    // Update pointer position
    const rect = gl.domElement.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast from camera through pointer
    raycaster.setFromCamera(pointerRef.current, camera);
    
    // Intersect with drag plane
    const intersection = new THREE.Vector3();
    const raycastSucceeded = raycaster.ray.intersectPlane(dragState.dragPlane, intersection);
    
    if (raycastSucceeded) {
      let preSolveSnapshot: PoseSnapshot | null = null;
      if (showDebugInfo) {
        preSolveSnapshot = capturePoseSnapshot(skeleton);
      }
      // CRITICAL: Restore IK rest pose ONLY for bones in the active chain
      // Only touch bones that will be modified by the IK solver to prevent drift accumulation
      let restoredCount = 0;
      if (dragState.chainConfig) {
        // Build list of bones in this specific chain
        const chainBoneNames = new Set([
          dragState.chainConfig.effectorBoneName,
          ...dragState.chainConfig.linkBoneNames
        ]);
        
        // Only restore bones in this chain
        skeleton.bones.forEach(bone => {
          if (chainBoneNames.has(bone.name) && !bone.name.startsWith('IKTarget_')) {
            const snapshot = ikRestPoseRef.current.get(bone.uuid);
            if (snapshot) {
              bone.position.copy(snapshot.position);
              bone.quaternion.copy(snapshot.quaternion);
              bone.scale.copy(snapshot.scale);
              restoredCount++;
            }
          }
        });
      }
      
      if (restoredCount > 0) {
        skeleton.bones.forEach(b => {
          b.updateMatrix();
          b.updateMatrixWorld(true);
        });
        skinnedMesh.updateMatrixWorld(true);
        console.log(`🔄 Restored ${restoredCount} bones in active chain to IK rest pose before solve`);
      }
      
      // Update IK target position
      updateIKTarget(dragState.ikTarget, intersection);
      
      const firstBoneBeforeSolve = skeleton.bones[0].position.clone();
      const firstBoneWorldBeforeSolve = new THREE.Vector3();
      skeleton.bones[0].getWorldPosition(firstBoneWorldBeforeSolve);
      
      console.log('🎯 Target moved to:', intersection, 'Solving IK...');
      console.log('   First bone LOCAL pos BEFORE:', firstBoneBeforeSolve);
      console.log('   First bone WORLD pos BEFORE:', firstBoneWorldBeforeSolve);
      
      // Solve IK
      ikSolver.update();
      
      const firstBoneAfterSolve = skeleton.bones[0].position.clone();
      const firstBoneWorldAfterSolve = new THREE.Vector3();
      skeleton.bones[0].getWorldPosition(firstBoneWorldAfterSolve);
      
      console.log('   First bone LOCAL pos AFTER:', firstBoneAfterSolve);
      console.log('   First bone WORLD pos AFTER:', firstBoneWorldAfterSolve);
      
      // DIAGNOSTIC: Log rotation of affected bones
      if (dragState.chainConfig && showDebugInfo) {
        console.log('🔍 DIAGNOSTIC: Post-IK bone rotations (Euler XYZ):');
        const chainBones = [
          dragState.chainConfig.effectorBoneName,
          ...dragState.chainConfig.linkBoneNames
        ];
        chainBones.forEach(boneName => {
          const bone = skeleton.bones.find(b => b.name === boneName);
          if (bone) {
            const euler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
            console.log(`  ${boneName}: x=${(euler.x * 180 / Math.PI).toFixed(1)}° y=${(euler.y * 180 / Math.PI).toFixed(1)}° z=${(euler.z * 180 / Math.PI).toFixed(1)}°`);
          }
        });
      }
      
      // CRITICAL: Update all world matrices after IK solve
      skeleton.bones.forEach(b => b.updateMatrixWorld(true));
      skinnedMesh.updateMatrixWorld(true);
      
      console.log('✅ IK solved. First bone pos:', skeleton.bones[0]?.position);
      
      let afterSnapshot: PoseSnapshot | null = null;
      if (showDebugInfo && dragState.chainConfig) {
        const baselineSnapshot = preSolveSnapshot ?? restPoseSnapshotRef.current;
        if (baselineSnapshot) {
          afterSnapshot = capturePoseSnapshot(skeleton);
          const chainBones = new Set([
            dragState.chainConfig.effectorBoneName,
            ...dragState.chainConfig.linkBoneNames
          ]);
          const deltas = diffPoseSnapshots(baselineSnapshot, afterSnapshot, 1e-3)
            .filter(delta => chainBones.has(delta.boneName));
          if (deltas.length) {
            console.log(`🧪 Pose delta (${dragState.chainConfig.name}):\n${formatPoseDeltas(deltas)}`);
          } else {
            console.log(`🧪 Pose delta (${dragState.chainConfig.name}): none`);
          }
        }
      }

      if (showDebugInfo) {
        logPoseDiagnostics(dragState.chainConfig?.name ?? 'Full Skeleton', afterSnapshot);
      }

      // Apply anatomical constraints post-IK solve
      // QUATERNION-BASED RELATIVE CONSTRAINTS: Match manual probe behavior exactly
      // Uses quaternion multiplication like setRelativeEuler() in constraintValidator.ts
      // Apply constraints using the EXACT same system as manual probe
      // This ensures IK and manual manipulation use identical constraint logic
      if (constraintsEnabled && dragState.chainConfig) {
        const chainBones = [
          dragState.chainConfig.effectorBoneName,
          ...dragState.chainConfig.linkBoneNames
        ];
        
        if (showDebugInfo) {
          console.log(`🔍 Applying constraints for ${dragState.chainConfig.name} chain using validateRotation():`);
        }
        
        let clampedCount = 0;
        chainBones.forEach(boneName => {
          const bone = skeleton.bones.find(b => b.name === boneName);
          if (!bone) return;
          
          const constraint = getConstraintForBone(boneName);
          if (!constraint || !constraint.enabled) return;
          
          // Use the EXACT same validateRotation() function as manual probe
          // This uses the shared constraintReferencePose from constraintValidator.ts
          const result = validateRotation(bone, constraint, showDebugInfo);
          
          if (result.clamped) {
            clampedCount++;
            if (showDebugInfo) {
              console.log(`  ${boneName}: ${result.violations.join(', ')}`);
            }
          }
        });
        
        if (clampedCount > 0 && showDebugInfo) {
          console.log(`✅ Applied constraints to ${clampedCount} bones using validateRotation()`);
        }
      }
    }
    
  }, [ikSolver, skeleton, camera, raycaster, gl, constraintViolations, constraintsEnabled, onConstraintViolation]);
  
  // Handle pointer up (end drag)
  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    const dragState = dragStateRef.current;
    
    if (!dragState.isDragging) return;
    
    // End of drag: consume this final event
    event.stopPropagation();
    
    // Release pointer capture
    (event.target as any).releasePointerCapture?.(event.pointerId);
    
    console.log(`✅ Finished dragging: ${dragState.selectedBone?.name}`);
    
    // CRITICAL: Update IK rest pose ONLY for bones in the active chain
    // Only update bones that were actually modified by the IK solver to prevent drift
    if (dragState.chainConfig) {
      const chainBoneNames = new Set([
        dragState.chainConfig.effectorBoneName,
        ...dragState.chainConfig.linkBoneNames
      ]);
      
      let updatedCount = 0;
      skeleton.bones.forEach((bone) => {
        if (chainBoneNames.has(bone.name) && !bone.name.startsWith('IKTarget_')) {
          ikRestPoseRef.current.set(bone.uuid, {
            position: bone.position.clone(),
            quaternion: bone.quaternion.clone(),
            scale: bone.scale.clone()
          });
          updatedCount++;
        }
      });
      console.log(`📸 Updated IK rest pose for ${updatedCount} bones in ${dragState.chainConfig.name} chain`);
    }
    
    // Call drag end callback
    onDragEnd?.();
    
    // Reset drag state
    dragStateRef.current = {
      ...dragState,
      isDragging: false
    };
    
  }, [skeleton, onDragEnd]);
  
  // Handle hover (visual feedback)
  const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!enabled || dragStateRef.current.isDragging) return;
    
    const targetInfo = findTargetAtPointer(event);
    if (targetInfo) {
      // Show which chain we're hovering over
      const chainConfig = getIKChainConfig(targetInfo.chainName);
      if (chainConfig) {
        const effectorBone = findBoneByName(skeleton, chainConfig.effectorBoneName);
        setHoverBone(effectorBone || null);
      }
      gl.domElement.style.cursor = 'grab';
    }
  }, [enabled, skeleton, findTargetAtPointer, gl]);
  
  const handlePointerLeave = useCallback(() => {
    setHoverBone(null);
    if (!dragStateRef.current.isDragging) {
      gl.domElement.style.cursor = 'default';
    }
  }, [gl]);

  const handleJointHandleSelect = useCallback((bone: THREE.Bone) => {
    setHighlightedBone(bone);
    onBoneSelect?.(bone);
  }, [onBoneSelect]);

  const handleJointHandleHover = useCallback((bone: THREE.Bone | null) => {
    if (dragStateRef.current.isDragging) return;
    setHoverBone(bone);
  }, []);
  
  // Update cursor during drag
  useEffect(() => {
    if (dragStateRef.current.isDragging) {
      gl.domElement.style.cursor = 'grabbing';
    } else if (hoverBone) {
      gl.domElement.style.cursor = 'grab';
    } else {
      gl.domElement.style.cursor = 'default';
    }
  }, [hoverBone, gl]);
  
  // Continuous IK solving and constraint checking
  useFrame(() => {
    if (!ikSolver || !enabled) return;
    if (!dragStateRef.current.isDragging) {
      syncIKTargetsToEffectors();
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        position={[0, 1.0, 0]}
      >
        <boxGeometry args={[1.2, 2.2, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
      {/* Visual feedback */}
      {showVisualFeedback && (
        <>
          {/* Render ALL IK target spheres (clickable) */}
          {Array.from(ikTargets.entries()).map(([chainName, target]) => (
            <IKTargetSphere 
              key={chainName} 
              target={target} 
              isActive={dragStateRef.current.ikTarget === target}
            />
          ))}

          {jointHandleBones.map((bone) => (
            <JointHandle
              key={`joint-${bone.uuid}`}
              bone={bone}
              isSelected={highlightedBone?.uuid === bone.uuid}
              onSelect={() => handleJointHandleSelect(bone)}
              onHover={(hovering: boolean) => handleJointHandleHover(hovering ? bone : null)}
            />
          ))}
          
          {highlightedBone && (
            <BoneHighlight bone={highlightedBone} color="#00ff00" size={0.06} />
          )}
          
          {hoverBone && hoverBone !== highlightedBone && (
            <BoneHighlight bone={hoverBone} color="#ffff00" size={0.04} opacity={0.5} />
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
            {constraintViolations > 0 && (
              <div className="ik-controller-debug__violations">⚠️ Violations: {constraintViolations}</div>
            )}
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
  isActive 
}: { 
  target: THREE.Bone; 
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);
    
    // Pulse effect when active
    if (isActive) {
      const scale = 0.08 + Math.sin(Date.now() * 0.006) * 0.02;
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(0.08);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        color={isActive ? "#00ff00" : "#ffaa00"}
        emissive={isActive ? "#00ff00" : "#ff8800"}
        emissiveIntensity={0.5}
        transparent 
        opacity={0.9}
      />
    </mesh>
  );
}

type JointHandleProps = {
  bone: THREE.Bone;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
};

function JointHandle({ bone, isSelected, onSelect, onHover }: JointHandleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const worldPos = new THREE.Vector3();
    bone.getWorldPosition(worldPos);
    meshRef.current.position.copy(worldPos);
    const scale = isSelected ? 0.075 : 0.055;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh
      ref={meshRef}
      onPointerDown={() => {
        onSelect();
      }}
      onPointerEnter={() => {
        onHover(true);
      }}
      onPointerLeave={() => {
        onHover(false);
      }}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={isSelected ? '#00bbff' : '#8888ff'}
        emissive={isSelected ? '#00bbff' : '#4444ff'}
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
        depthTest={false}
      />
    </mesh>
  );
}
