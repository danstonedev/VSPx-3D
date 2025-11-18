/**
 * Range of Motion Panel
 * 
 * Educational UI panel displaying joint angles, constraint utilization,
 * and collision information for the interactive IK system.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { getConstraintForBone } from '../constraints/jointConstraints';
import { getRelativeEuler, resetBoneToRest, setRelativeEuler, validateRotation, type ConstraintViolation } from '../constraints/constraintValidator';
import { detectCollisions, getCollisionSummary, type CollisionResult } from '../constraints/selfCollisionDetector';
import { 
  getPlaneName
} from '../constraints/shoulderKinematics';
import { computeBiomechAnglesForSelectedBone } from '../biomech/jointAngles';
import { viewerDebugEnabled } from '../utils/debugFlags';
import './RangeOfMotionPanel.css';

/**
 * Anatomical movement labels for each joint type
 * Maps bone names to their primary, secondary, and tertiary movement axes
 */
type MovementLabels = {
  primary: string;
  secondary: string;
  tertiary: string;
};

const JOINT_MOVEMENT_LABELS: Record<string, MovementLabels> = {
  // Spine
  'mixamorig1Spine': {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  'mixamorig1Spine1': {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  'mixamorig1Spine2': {
    primary: 'Flex/Ext',
    secondary: 'Axial Rot',
    tertiary: 'Lat Bend'
  },
  
  // Neck/Head
  'mixamorig1Neck': {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Lat Bend'
  },
  'mixamorig1Head': {
    primary: 'Nod',
    secondary: 'Turn',
    tertiary: 'Tilt'
  },
  
  // Left Arm
  'mixamorig1LeftShoulder': {
    primary: 'Upward Rot',     // Scapular upward/downward rotation
    secondary: 'Scap Plane',   // Scapular plane adjustment
    tertiary: 'Pro/Retract'    // Protraction/retraction
  },
  'mixamorig1LeftArm': {
    primary: 'Elevation',      // GH elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // GH internal/external rotation (twist)
    tertiary: 'Flex/Ext'       // GH flexion/extension component
  },
  'mixamorig1LeftForeArm': {
    primary: 'Flex/Ext',
    secondary: 'Pro/Sup',
    tertiary: 'Deviation'
  },
  'mixamorig1LeftHand': {
    primary: 'Flex/Ext',
    secondary: 'Twist',
    tertiary: 'Rad/Uln Dev'
  },
  
  // Right Arm
  'mixamorig1RightShoulder': {
    primary: 'Upward Rot',     // Scapular upward/downward rotation
    secondary: 'Scap Plane',   // Scapular plane adjustment
    tertiary: 'Pro/Retract'    // Protraction/retraction
  },
  'mixamorig1RightArm': {
    primary: 'Elevation',      // GH elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // GH internal/external rotation (twist)
    tertiary: 'Flex/Ext'       // GH flexion/extension component
  },
  'mixamorig1RightForeArm': {
    primary: 'Flex/Ext',
    secondary: 'Pro/Sup',
    tertiary: 'Deviation'
  },
  'mixamorig1RightHand': {
    primary: 'Flex/Ext',
    secondary: 'Twist',
    tertiary: 'Rad/Uln Dev'
  },
  
  // Left Leg
  'mixamorig1LeftUpLeg': {
    primary: 'Elevation',      // Hip elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // Hip internal/external rotation
    tertiary: 'Flex/Ext'       // Hip flexion/extension component
  },
  'mixamorig1LeftLeg': {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Valgus/Varus'
  },
  'mixamorig1LeftFoot': {
    primary: 'Dorsi/Plant',
    secondary: 'Inv/Ever',
    tertiary: 'Rotation'
  },
  'mixamorig1LeftToeBase': {
    primary: 'Flex/Ext',
    secondary: 'Deviation',
    tertiary: 'Twist'
  },
  
  // Right Leg
  'mixamorig1RightUpLeg': {
    primary: 'Elevation',      // Hip elevation magnitude (0° down → 180° up)
    secondary: 'Axial Rot',    // Hip internal/external rotation
    tertiary: 'Flex/Ext'       // Hip flexion/extension component
  },
  'mixamorig1RightLeg': {
    primary: 'Flex/Ext',
    secondary: 'Rotation',
    tertiary: 'Valgus/Varus'
  },
  'mixamorig1RightFoot': {
    primary: 'Plant/Dorsi',
    secondary: 'Rotation',
    tertiary: 'Inv/Ever'
  },
  'mixamorig1RightToeBase': {
    primary: 'Flex/Ext',
    secondary: 'Deviation',
    tertiary: 'Twist'
  }
};

/**
 * Get biomech-consistent movement labels for display axes
 * Since we're using biomech system now:
 * - X axis = ABD/ADD (frontal plane)
 * - Y axis = Internal/External Rotation (transverse plane) 
 * - Z axis = FLEX/EXT (sagittal plane)
 */
function getBiomechMovementLabel(boneName: string, axis: 'x' | 'y' | 'z'): string {
  // For major joints covered by biomech system
  if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
    // Shoulder/Humerus
    if (axis === 'x') return 'ABD/ADD';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'FLEX/EXT';
  }
  
  if (boneName.includes('UpLeg')) {
    // Hip/Femur
    if (axis === 'x') return 'ABD/ADD';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'FLEX/EXT';
  }
  
  if (boneName.includes('ForeArm')) {
    // Elbow/Forearm
    if (axis === 'x') return 'FLEX/EXT';              // Primary elbow motion
    if (axis === 'y') return 'PRONATION/SUPINATION';  // Forearm rotation
    return 'VARUS/VALGUS';                             // Carrying angle deviation
  }
  
  if (boneName.includes('Leg') && !boneName.includes('UpLeg')) {
    // Knee/Tibia
    if (axis === 'x') return 'VARUS/VALGUS';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'FLEX/EXT';
  }
  
  if (boneName.includes('Foot')) {
    // Ankle/Foot
    // X-axis: Inversion/Eversion (frontal plane - subtalar)
    // Y-axis: Internal/External Rotation (transverse plane)
    // Z-axis: Dorsiflexion/Plantarflexion (sagittal plane - talocrural)
    if (axis === 'x') return 'INVERSION/EVERSION';
    if (axis === 'y') return 'INT ROT/EXT ROT';
    return 'DORSIFLEXION/PLANTARFLEXION';
  }
  
  // Fallback to old system for non-biomech joints
  const labels = JOINT_MOVEMENT_LABELS[boneName];
  if (!labels) return axis.toUpperCase();
  
  if (axis === 'x') return labels.primary;
  if (axis === 'y') return labels.secondary;
  return labels.tertiary;
}

/**
 * Calculate composite shoulder motion (scapulothoracic + glenohumeral)
 * Reflects scapulohumeral rhythm: total shoulder elevation = GH + ST contributions
 * 
 * @returns Object with composite angles and component contributions, or null if not shoulder complex
 */
function getCompositeShoulderMotion(
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

interface RangeOfMotionPanelProps {
  selectedBone: THREE.Bone | null;
  skeleton: THREE.Skeleton | null;
  constraintViolations: ConstraintViolation[];
  onResetPose?: () => void;
  onToggleConstraints?: () => void;
  constraintsEnabled: boolean;
  isInteractive?: boolean;
}

export function RangeOfMotionPanel({
  selectedBone,
  skeleton,
  constraintViolations,
  onResetPose,
  onToggleConstraints,
  constraintsEnabled,
  isInteractive = true
}: RangeOfMotionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collisionData, setCollisionData] = useState<CollisionResult | null>(null);
  const [jointAngles, setJointAngles] = useState<{ x: number; y: number; z: number } | null>(null);
  const [manualAngles, setManualAngles] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const normalizedViolations = useMemo(() => {
    if (!constraintViolations?.length) return [];
    return constraintViolations.flatMap((entry, entryIndex) => {
      if (!entry?.violations?.length) return [];
      return entry.violations.map((raw, idx) => {
        const [axisChunk, rest] = raw?.split(':') ?? [];
        const axis = axisChunk?.trim()?.toUpperCase?.() || '—';
        const detail = (rest ?? axisChunk ?? '').trim() || 'Outside limits';
        return {
          id: `${entry.boneName}-${axis}-${entryIndex}-${idx}`,
          boneName: entry.boneName,
          axis,
          detail,
        };
      });
    });
  }, [constraintViolations]);
  
  // Update collision data periodically
  useEffect(() => {
    if (!skeleton) return;
    
    const interval = setInterval(() => {
      const result = detectCollisions(skeleton);
      setCollisionData(result);
    }, 100); // Check every 100ms
    
    return () => clearInterval(interval);
  }, [skeleton]);
  
  // Update joint angles and utilization when bone changes
  useEffect(() => {
    if (!selectedBone) {
      setJointAngles(null);
      setActiveAxis(null);
      return;
    }
    
    const constraint = getConstraintForBone(selectedBone.name);
    if (!constraint) return;
    
    const updateData = () => {
      // Get anatomical angles using BIOMECH SYSTEM (segment-to-segment joint angles)
      // This provides accurate anatomical measurements using joint-relative quaternions
      const biomechData = skeleton ? computeBiomechAnglesForSelectedBone(skeleton, selectedBone) : null;
      
      if (!biomechData) {
        // Fallback: use relative Euler angles from constraint system
        const relativeEuler = getRelativeEuler(selectedBone);
        const displayAngles = {
          x: THREE.MathUtils.radToDeg(relativeEuler.x),
          y: THREE.MathUtils.radToDeg(relativeEuler.y),
          z: THREE.MathUtils.radToDeg(relativeEuler.z),
        };
        setJointAngles(displayAngles);
        return;
      }
      
      // Map biomech angles to display axes
      // Standard mapping: X=ABD/ADD, Y=rotation, Z=FLEX/EXT
      // Elbow exception: X=FLEX/EXT, Y=rotation, Z=ABD/ADD (varus/valgus)
      let displayAngles: { x: number; y: number; z: number };
      
      if (selectedBone.name.includes('ForeArm')) {
        // Elbow has different axis mapping
        displayAngles = {
          x: biomechData.angles.flexExt,      // FLEX/EXT (primary elbow motion)
          y: biomechData.angles.rotation,     // PRONATION/SUPINATION
          z: biomechData.angles.abdAdd        // VARUS/VALGUS (carrying angle)
        };
      } else {
        // Standard mapping for hip, shoulder, knee, ankle
        displayAngles = {
          x: biomechData.angles.abdAdd,       // ABD/ADD
          y: biomechData.angles.rotation,     // Internal/External rotation
          z: biomechData.angles.flexExt       // FLEX/EXT
        };
      }
      
      if (viewerDebugEnabled()) {
        console.log(`🔍 ${selectedBone.name} (Biomech System):`);
        console.log(`  ${biomechData.side} ${biomechData.jointId}:`);
        console.log(`    Flex/Ext: ${biomechData.angles.flexExt.toFixed(1)}°`);
        console.log(`    Abd/Add: ${biomechData.angles.abdAdd.toFixed(1)}°`);
        console.log(`    Rotation: ${biomechData.angles.rotation.toFixed(1)}°`);
      }
      
      setJointAngles(displayAngles);
    };
    
    // Initial update
    updateData();
    
    // Update on animation frame
    const frameId = setInterval(updateData, 50); // 20 FPS
    
    return () => clearInterval(frameId);
  }, [selectedBone]);

  useEffect(() => {
    if (!jointAngles || activeAxis !== null) return;
    setManualAngles({
      x: jointAngles.x,
      y: jointAngles.y,
      z: jointAngles.z,
    });
  }, [jointAngles, activeAxis]);

  const applyManualRotation = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      if (!selectedBone) return;
      setManualAngles((prev) => {
        const next = {
          ...prev,
          [axis]: degrees,
        } as { x: number; y: number; z: number };

        const euler = new THREE.Euler(
          THREE.MathUtils.degToRad(next.x),
          THREE.MathUtils.degToRad(next.y),
          THREE.MathUtils.degToRad(next.z),
          'XYZ'
        );

        setRelativeEuler(selectedBone, euler);
        selectedBone.updateMatrixWorld(true);
        skeleton?.bones.forEach((bone) => bone.updateMatrixWorld(true));
        validateRotation(selectedBone);

        return next;
      });
    },
    [selectedBone, skeleton]
  );

  const handleJointReset = useCallback(() => {
    if (!selectedBone) return;
    resetBoneToRest(selectedBone);
    selectedBone.updateMatrixWorld(true);
    skeleton?.bones.forEach((bone) => bone.updateMatrixWorld(true));
    setManualAngles({ x: 0, y: 0, z: 0 });
  }, [selectedBone, skeleton]);
  
  const collisionSummary = collisionData ? getCollisionSummary(collisionData) : null;
  const constraint = selectedBone ? getConstraintForBone(selectedBone.name) : null;
  
  return (
    <div className={`rom-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="rom-panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>Range of Motion</h3>
        <button className="collapse-btn">{isCollapsed ? '▼' : '▲'}</button>
      </div>
      
      {!isCollapsed && (
        <div className="rom-panel-content">
          {/* Bone Information */}
          {selectedBone && constraint ? (
            <div className="bone-info">
              <h4>Selected Joint</h4>
              <p className="bone-name">{selectedBone.name}</p>
              
              <div className="dof-info">
                <span className="label">Degrees of Freedom:</span>
                <span className="value">{constraint.degreesOfFreedom}</span>
              </div>
              
              
              {constraint.notes && (
                <p className="bone-description">{constraint.notes}</p>
              )}
              
              {/* Unified Joint Angles Display - Combines visual scales with biomech values */}
              {jointAngles && skeleton && (() => {
                const biomechData = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
                if (!biomechData) return null;
                
                return (
                  <div className="joint-angles unified">
                    <h5>Joint Angles (Anatomical Neutral = 0°)</h5>
                    <p className="biomech-note">
                      Measured between proximal and distal segments using clinical conventions
                    </p>
                    
                    {(['x', 'y', 'z'] as const).map((axis) => {
                      const anatomicalAngle = jointAngles[axis];
                      const movementLabel = getBiomechMovementLabel(selectedBone.name, axis);
                      
                      // Get biomech value for this axis
                      // For elbow (ForeArm): X=flexExt, Y=rotation, Z=abdAdd
                      // For other joints: X=abdAdd, Y=rotation, Z=flexExt
                      let biomechValue: number;
                      if (selectedBone.name.includes('ForeArm')) {
                        // Elbow has different axis mapping
                        biomechValue = axis === 'x' ? biomechData.angles.flexExt :
                                      axis === 'y' ? biomechData.angles.rotation :
                                      biomechData.angles.abdAdd;
                      } else {
                        // Standard mapping for hip, shoulder, knee, ankle
                        biomechValue = axis === 'x' ? biomechData.angles.abdAdd :
                                      axis === 'y' ? biomechData.angles.rotation :
                                      biomechData.angles.flexExt;
                      }
                      
                      // Parse movement label for display on left/right sides
                      let leftLabel: string, rightLabel: string;
                      if (movementLabel.includes('/')) {
                        const [term1, term2] = movementLabel.split('/').map(s => s.trim());
                        // term1 is positive direction (right side), term2 is negative direction (left side)
                        leftLabel = term2;   // Negative side (e.g., "ADD", "EXT", "EXT")
                        rightLabel = term1;  // Positive side (e.g., "ABD", "INT", "FLEX")
                      } else {
                        leftLabel = 'NEGATIVE';
                        rightLabel = 'POSITIVE';
                      }
                      
                      // Define standard anatomical ROM for common joints
                      let minAngle = -180;
                      let maxAngle = 180;
                      
                      // Customize based on joint and axis
                      if (selectedBone.name.includes('Arm') && !selectedBone.name.includes('ForeArm')) {
                        // Shoulder/Humerus - AAOS clinical ROM standards
                        if (axis === 'x') { minAngle = -45; maxAngle = 180; }  // ABD 0-180°, ADD 0-45°
                        if (axis === 'y') { minAngle = -90; maxAngle = 90; }   // INT ROT -90° to EXT ROT +90°
                        if (axis === 'z') { minAngle = -60; maxAngle = 180; }  // FLEX 0-180°, EXT 0-60°
                      } else if (selectedBone.name.includes('UpLeg')) {
                        // Hip/Femur - AAOS clinical ROM standards
                        if (axis === 'x') { minAngle = -30; maxAngle = 45; }   // ABD 0-45°, ADD 0-30°
                        if (axis === 'y') { minAngle = -45; maxAngle = 45; }   // INT ROT -45° to EXT ROT +45°
                        if (axis === 'z') { minAngle = -30; maxAngle = 120; }  // FLEX 0-120°, EXT 0-30°
                      } else if (selectedBone.name.includes('ForeArm')) {
                        // Elbow/Forearm - AAOS clinical ROM standards
                        if (axis === 'x') { minAngle = 0; maxAngle = 150; }    // FLEX 0-150°
                        if (axis === 'y') { minAngle = -80; maxAngle = 80; }   // PRON -80° to SUP +80°
                        if (axis === 'z') { minAngle = -15; maxAngle = 15; }   // VARUS/VALGUS carrying angle ±15°
                      } else if (selectedBone.name.includes('Leg') && !selectedBone.name.includes('UpLeg')) {
                        // Knee/Tibia - AAOS clinical ROM standards
                        if (axis === 'x') { minAngle = -10; maxAngle = 10; }   // VARUS/VALGUS deviation ±10°
                        if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // Tibial INT/EXT ROT ±30°
                        if (axis === 'z') { minAngle = 0; maxAngle = 135; }    // FLEX 0-135°
                      } else if (selectedBone.name.includes('Foot')) {
                        // Ankle/Foot - AAOS clinical ROM standards
                        if (axis === 'x') { minAngle = -15; maxAngle = 35; }   // INVERSION 0-35°, EVERSION 0-15°
                        if (axis === 'y') { minAngle = -30; maxAngle = 30; }   // INT/EXT ROT ±30°
                        if (axis === 'z') { minAngle = -50; maxAngle = 20; }   // DORSI 0-20°, PLANTAR 0-50°
                      }
                      
                      const anatomicalRange = maxAngle - minAngle;
                      
                      // Calculate position on scale
                      const normalizedPos = ((anatomicalAngle - minAngle) / anatomicalRange) * 100;
                      const clampedPos = Math.min(100, Math.max(0, normalizedPos));
                      const neutralPos = ((0 - minAngle) / anatomicalRange) * 100;
                      
                      return (
                        <div key={axis} className="angle-row-scale">
                          <div className="movement-header">
                            <span className="axis-label left-label">{leftLabel}</span>
                            <span className="biomech-badge">{biomechValue.toFixed(1)}°</span>
                            <span className="axis-label right-label">{rightLabel}</span>
                          </div>
                          <div className="linear-scale">
                            <div className="scale-track">
                              <div className="scale-half scale-left">
                                <span className="scale-limit">{minAngle.toFixed(0)}°</span>
                              </div>
                              <div className="scale-center" style={{ left: `${neutralPos}%` }}>
                                <div className="neutral-marker"></div>
                              </div>
                              <div className="scale-half scale-right">
                                <span className="scale-limit">{maxAngle.toFixed(0)}°</span>
                              </div>
                            </div>
                            <div 
                              className="position-indicator" 
                              style={{ left: `${clampedPos}%` }}
                            >
                              <div className="indicator-dot"></div>
                            </div>
                            <div 
                              className="scale-fill"
                              style={{ 
                                width: `${Math.abs(clampedPos - neutralPos)}%`,
                                left: clampedPos < neutralPos ? `${clampedPos}%` : `${neutralPos}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Advanced Shoulder Analysis - Only shown for shoulder joints */}
              {(() => {
                const isShoulderJoint = selectedBone.name === 'mixamorig1RightArm' || selectedBone.name === 'mixamorig1LeftArm';
                if (!isShoulderJoint || !skeleton) return null;
                
                const biomechData = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
                const compositeData = getCompositeShoulderMotion(selectedBone, skeleton);
                if (!biomechData || !compositeData) return null;
                
                const { flexExt, abdAdd } = biomechData.angles;
                const totalElevation = Math.sqrt(flexExt * flexExt + abdAdd * abdAdd);
                const planeOfElevation = totalElevation < 5 ? 0 : Math.atan2(flexExt, abdAdd) * 180 / Math.PI;
                const planeName = getPlaneName(planeOfElevation * Math.PI / 180);
                
                return (
                  <div className="shoulder-analysis-advanced">
                    <h5>🔬 Advanced Shoulder Analysis</h5>
                    
                    <div className="analysis-grid">
                      {/* Scapulohumeral Rhythm */}
                      <div className="analysis-section">
                        <h6>Scapulohumeral Rhythm</h6>
                        <div className="composite-breakdown">
                          <div className="composite-row">
                            <span className="component-label">Total Abduction:</span>
                            <span className="component-value">{Math.abs(compositeData.composite.x).toFixed(1)}°</span>
                          </div>
                          <div className="composite-row component-detail">
                            <span className="component-label">↳ GH:</span>
                            <span className="component-value">{Math.abs(compositeData.glenohumeral.x).toFixed(1)}°</span>
                          </div>
                          <div className="composite-row component-detail">
                            <span className="component-label">↳ ST:</span>
                            <span className="component-value">{Math.abs(compositeData.scapular.x).toFixed(1)}°</span>
                          </div>
                          <div className="composite-row">
                            <span className="component-label">GH:ST Ratio:</span>
                            <span className="component-value">
                              {compositeData.glenohumeral.x !== 0 && compositeData.scapular.x !== 0
                                ? `${(Math.abs(compositeData.glenohumeral.x) / Math.abs(compositeData.scapular.x)).toFixed(1)}:1`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Plane of Elevation */}
                      <div className="analysis-section">
                        <h6>✈️ Plane of Elevation</h6>
                        <div className="composite-breakdown">
                          <div className="composite-row">
                            <span className="component-label">Total Elevation:</span>
                            <span className="component-value">{totalElevation.toFixed(1)}°</span>
                          </div>
                          <div className="composite-row">
                            <span className="component-label">Plane:</span>
                            <span className="component-value">{planeOfElevation.toFixed(1)}° ({planeName})</span>
                          </div>
                          <div className="composite-row component-detail">
                            <span className="component-label">↳ Abd Component:</span>
                            <span className="component-value">{Math.abs(abdAdd).toFixed(1)}°</span>
                          </div>
                          <div className="composite-row component-detail">
                            <span className="component-label">↳ Flex Component:</span>
                            <span className="component-value">{Math.abs(flexExt).toFixed(1)}°</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="rhythm-note">
                      💡 Normal: ~2:1 GH:ST ratio, scapular plane ~30°
                    </p>
                  </div>
                );
              })()}
              
              {/* Rotation Limits - Collapsible */}
              <details className="rotation-limits-section">
                <summary><h5>Rotation Limits</h5></summary>
                <div className="limit-row">
                  <span className="axis">{getBiomechMovementLabel(selectedBone.name, 'x')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.x[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.x[1]).toFixed(0)}°
                  </span>
                </div>
                <div className="limit-row">
                  <span className="axis">{getBiomechMovementLabel(selectedBone.name, 'y')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.y[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.y[1]).toFixed(0)}°
                  </span>
                </div>
                <div className="limit-row">
                  <span className="axis">{getBiomechMovementLabel(selectedBone.name, 'z')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.z[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.z[1]).toFixed(0)}°
                  </span>
                </div>
              </details>

              <div className="manual-controls">
                <h5>Manual Joint Probe</h5>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <label key={axis} className="manual-row">
                    <span className="axis">{getBiomechMovementLabel(selectedBone.name, axis)}:</span>
                    <input
                      type="range"
                      min={THREE.MathUtils.radToDeg(constraint.rotationLimits[axis][0])}
                      max={THREE.MathUtils.radToDeg(constraint.rotationLimits[axis][1])}
                      step={0.5}
                      value={manualAngles[axis] ?? 0}
                      onChange={(event) => applyManualRotation(axis, Number(event.target.value))}
                      onPointerDown={() => setActiveAxis(axis)}
                      onPointerUp={() => setActiveAxis(null)}
                      onPointerLeave={() => setActiveAxis(null)}
                    />
                    <span className="manual-value">{(manualAngles[axis] ?? 0).toFixed(1)}°</span>
                  </label>
                ))}
                <button className="control-btn" onClick={handleJointReset}>
                  Reset Joint
                </button>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Click on a bone to see details</p>
            </div>
          )}
          
          {/* Constraint Violations */}
          {normalizedViolations.length > 0 && (
            <div className="constraint-violations">
              <h5>⚠️ Constraint Violations</h5>
              <ul>
                {normalizedViolations.map((violation) => (
                  <li key={violation.id} className="violation-item">
                    <span className="bone">{violation.boneName}</span>
                    <span className="axis">{violation.axis}</span>
                    <span className="delta">{violation.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Collision Summary */}
          {collisionSummary && collisionSummary.total > 0 && (
            <div className="collision-summary">
              <h5>🚨 Collision Warnings</h5>
              <div className="collision-stats">
                {collisionSummary.critical > 0 && (
                  <div className="stat critical">
                    <span className="label">Critical:</span>
                    <span className="value">{collisionSummary.critical}</span>
                  </div>
                )}
                {collisionSummary.warning > 0 && (
                  <div className="stat warning">
                    <span className="label">Warning:</span>
                    <span className="value">{collisionSummary.warning}</span>
                  </div>
                )}
                {collisionSummary.minor > 0 && (
                  <div className="stat minor">
                    <span className="label">Minor:</span>
                    <span className="value">{collisionSummary.minor}</span>
                  </div>
                )}
              </div>
              {collisionSummary.maxPenetration > 0 && (
                <div className="max-penetration">
                  <span className="label">Max Penetration:</span>
                  <span className="value">
                    {(collisionSummary.maxPenetration * 100).toFixed(1)} cm
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Controls */}
          <div className="panel-controls">
            {isInteractive ? (
              <>
                {onResetPose && (
                  <button className="control-btn" onClick={onResetPose}>
                    Reset Pose
                  </button>
                )}
                
                {onToggleConstraints && (
                  <button 
                    className={`control-btn ${constraintsEnabled ? 'active' : ''}`}
                    onClick={onToggleConstraints}
                  >
                    {constraintsEnabled ? 'Constraints: ON' : 'Constraints: OFF'}
                  </button>
                )}
              </>
            ) : (
              <p className="panel-note">
                <strong>Live ROM Tracking Active</strong> - Click cyan spheres on joints to track their range of motion during animation playback. 
                Switch to IK mode to manipulate joints directly.
              </p>
            )}
          </div>
          
          {/* Educational Info - Collapsible */}
          <details className="educational-info">
            <summary><h5>💡 About This System</h5></summary>
            <p className="info-text">
              This interactive system uses <strong>Inverse Kinematics (IK)</strong> to 
              calculate realistic joint movements. Drag any bone to see how the entire 
              chain responds while respecting anatomical constraints.
            </p>
            <p className="info-text">
              <strong>Constraint utilization</strong> shows how close you are to the 
              joint's rotation limit. 100% means the joint is at maximum extension.
            </p>
            <p className="info-text">
              <strong>Collision detection</strong> prevents anatomically impossible 
              poses by warning when limbs intersect the torso or each other.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}

/**
 * Simple FPS counter for performance monitoring
 */
export function PerformanceMonitor() {
  const [fps, setFps] = useState(60);
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const updateFps = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(updateFps);
    };
    
    updateFps();
  }, []);
  
  return (
    <div className="performance-monitor">
      <div className="perf-stat">
        <span className="label">FPS:</span>
        <span className={`value ${fps < 45 ? 'warning' : ''}`}>{fps}</span>
      </div>
    </div>
  );
}
