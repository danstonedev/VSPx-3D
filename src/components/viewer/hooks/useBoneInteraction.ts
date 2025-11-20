import { useState, useRef, useCallback, useEffect } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  findBoneByName, 
  getIKChainConfig, 
  updateIKTarget, 
  type IKChainConfig 
} from '../utils/ikSolverConfig';
import { validateRotation, type ConstraintViolation } from '../constraints/constraintValidator'; // @deprecated - TODO: Migrate to biomechState.computeJointState() in Phase 2
import { getConstraintForBone } from '../constraints/jointConstraints';
import { capturePoseSnapshot, diffPoseSnapshots, type PoseSnapshot } from '../utils/skeletonDiagnostics';
import { RotationCompensatedIKSolver } from '../utils/RotationCompensatedIKSolver';

export interface DragState {
  isDragging: boolean;
  selectedBone: THREE.Bone | null;
  ikTarget: THREE.Bone | null;
  dragPlane: THREE.Plane;
  initialTargetPos: THREE.Vector3;
  chainConfig: IKChainConfig | null;
}

interface UseBoneInteractionProps {
  skeleton: THREE.Skeleton | undefined;
  skinnedMesh: THREE.SkinnedMesh;
  ikSolver: RotationCompensatedIKSolver | null;
  ikTargets: Map<string, THREE.Bone>;
  jointHandleBones: THREE.Bone[];
  enabled: boolean;
  isReady: boolean;
  showDebugInfo: boolean;
  constraintsEnabled: boolean;
  ikRestPoseRef: React.MutableRefObject<Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>>;
  restPoseSnapshotRef: React.MutableRefObject<PoseSnapshot | null>;
  onBoneSelect?: (bone: THREE.Bone | null) => void;
  onDragStart?: (bone: THREE.Bone, plane: THREE.Plane) => void;
  onDragEnd?: () => void;
  onConstraintViolation?: (violations: ConstraintViolation[]) => void;
  onAfterSolve?: () => void;
  logPoseDiagnostics: (label: string, poseSnapshot?: PoseSnapshot | null) => void;
}

export function useBoneInteraction({
  skeleton,
  skinnedMesh,
  ikSolver,
  ikTargets,
  // jointHandleBones,
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
  onAfterSolve,
  logPoseDiagnostics
}: UseBoneInteractionProps) {
  const { camera, raycaster, gl } = useThree();
  
  const [highlightedBone, setHighlightedBone] = useState<THREE.Bone | null>(null);
  const [hoverBone, setHoverBone] = useState<THREE.Bone | null>(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  // const [constraintViolations, setConstraintViolations] = useState(0);

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    selectedBone: null,
    ikTarget: null,
    dragPlane: new THREE.Plane(),
    initialTargetPos: new THREE.Vector3(),
    chainConfig: null
  });

  const pointerRef = useRef(new THREE.Vector2());

  // Keyboard event listeners for Shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update cursor during drag
  useEffect(() => {
    if (dragStateRef.current.isDragging) {
      gl.domElement.style.cursor = 'grabbing';
    } else if (hoverBone && isShiftHeld) {
      gl.domElement.style.cursor = 'pointer'; // Pointer for inspection
    } else if (hoverBone) {
      gl.domElement.style.cursor = 'grab'; // Grab for IK drag
    } else {
      gl.domElement.style.cursor = 'default';
    }
  }, [hoverBone, isShiftHeld, gl]);

  // Find joint handle at pointer (for Shift+click inspection)
  /*
  const findJointHandleAtPointer = useCallback((event: ThreeEvent<PointerEvent>): THREE.Bone | null => {
    if (!jointHandleBones || jointHandleBones.length === 0) return null;
    
    const ray: THREE.Ray | null = (event as any).ray ?? null;
    if (!ray) return null;
    
    const tmpWorld = new THREE.Vector3();
    let closestJoint: THREE.Bone | null = null;
    let closestDistance = 0.15; // Slightly larger click radius for joint handles
    
    // Check each joint handle
    jointHandleBones.forEach((bone) => {
      bone.getWorldPosition(tmpWorld);
      const d = ray.distanceToPoint(tmpWorld);
      if (d < closestDistance) {
        closestDistance = d;
        closestJoint = bone;
      }
    });
    
    return closestJoint;
  }, [jointHandleBones]);
  */
  
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
    if (!enabled || !isReady || !ikSolver || !skeleton) return;
    
    // If Shift is held, don't start IK drag - let JointHandle components handle their own clicks
    if (event.nativeEvent.shiftKey || isShiftHeld) {
      return; // JointHandle will stop propagation after handling selection
    }
    
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
    
  }, [enabled, isReady, ikSolver, ikTargets, skeleton, isShiftHeld, findTargetAtPointer, calculateDragPlane, onBoneSelect, onDragStart, showDebugInfo, restPoseSnapshotRef]);

  // Handle pointer move (drag)
  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const dragState = dragStateRef.current;
    
    if (!dragState.isDragging || !dragState.ikTarget || !ikSolver || !skeleton) return;
    
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
        // console.log(`🔄 Restored ${restoredCount} bones in active chain to IK rest pose before solve`);
      }
      
      // Update IK target position
      updateIKTarget(dragState.ikTarget, intersection);
      
      // Solve IK
      ikSolver.update();
      
      // Run post-solve callback (e.g. for scapulohumeral rhythm)
      onAfterSolve?.();
      
      // CRITICAL: Update all world matrices after IK solve
      skeleton.bones.forEach(b => b.updateMatrixWorld(true));
      skinnedMesh.updateMatrixWorld(true);
      
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
            // console.log(`🧪 Pose delta (${dragState.chainConfig.name}):\n${formatPoseDeltas(deltas)}`);
          }
        }
      }

      if (showDebugInfo) {
        logPoseDiagnostics(dragState.chainConfig?.name ?? 'Full Skeleton', afterSnapshot);
      }

      // Apply anatomical constraints post-IK solve
      if (constraintsEnabled && dragState.chainConfig) {
        const chainBones = [
          dragState.chainConfig.effectorBoneName,
          ...dragState.chainConfig.linkBoneNames
        ];
        
        let clampedCount = 0;
        chainBones.forEach(boneName => {
          const bone = skeleton.bones.find(b => b.name === boneName);
          if (!bone) return;
          
          const constraint = getConstraintForBone(boneName);
          if (!constraint || !constraint.enabled) return;
          
          const result = validateRotation(bone, constraint, showDebugInfo); // @deprecated - TODO: Migrate to biomechState.computeJointState()
          
          if (result.clamped) {
            clampedCount++;
          }
        });
        
        if (clampedCount > 0 && showDebugInfo) {
          // console.log(`✅ Applied constraints to ${clampedCount} bones using validateRotation()`);
        }
      }
    }
    
  }, [ikSolver, skeleton, camera, raycaster, gl, constraintsEnabled, onConstraintViolation, showDebugInfo, skinnedMesh, ikRestPoseRef, restPoseSnapshotRef, logPoseDiagnostics]);

  // Handle pointer up (end drag)
  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    const dragState = dragStateRef.current;
    
    if (!dragState.isDragging || !skeleton) return;
    
    // End of drag: consume this final event
    event.stopPropagation();
    
    // Release pointer capture
    (event.target as any).releasePointerCapture?.(event.pointerId);
    
    console.log(`✅ Finished dragging: ${dragState.selectedBone?.name}`);
    
    // CRITICAL: Update IK rest pose ONLY for bones in the active chain
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
    
  }, [skeleton, onDragEnd, ikRestPoseRef]);

  // Handle hover (visual feedback)
  const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!enabled || dragStateRef.current.isDragging || !skeleton) return;
    
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

  return {
    dragStateRef,
    highlightedBone,
    setHighlightedBone,
    hoverBone,
    isShiftHeld,
    // constraintViolations,
    handlers: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerEnter,
      handlePointerLeave,
      handleJointHandleSelect,
      handleJointHandleHover
    }
  };
}
