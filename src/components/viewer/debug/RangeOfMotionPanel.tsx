/**
 * Range of Motion Panel
 * 
 * Educational UI panel displaying joint angles, constraint utilization,
 * and collision information for the interactive IK system.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { getConstraintForBone } from '../constraints/jointConstraints';
import { getConstraintUtilization, getRelativeEuler, getAnatomicalEuler, resetBoneToRest, setRelativeEuler, validateRotation, type ConstraintViolation } from '../constraints/constraintValidator';
import { detectCollisions, getCollisionSummary, type CollisionResult } from '../constraints/selfCollisionDetector';
import { 
  analyzeShoulderKinematics, 
  formatShoulderKinematics,
  getPlaneName,
  calculateScapulohumeralRhythm
} from '../constraints/shoulderKinematics';
import { analyzeJointGeometric } from '../constraints/geometricAnalysis';
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

function getMovementLabel(boneName: string, axis: 'x' | 'y' | 'z'): string {
  const labels = JOINT_MOVEMENT_LABELS[boneName];
  if (!labels) return axis.toUpperCase(); // Fallback to X/Y/Z
  
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
  
  // Get anatomical angles for both components
  const scapularEuler = getAnatomicalEuler(shoulderBone);
  const ghEuler = getAnatomicalEuler(armBone);
  
  const scapular = {
    x: THREE.MathUtils.radToDeg(scapularEuler.x),
    y: THREE.MathUtils.radToDeg(scapularEuler.y),
    z: THREE.MathUtils.radToDeg(scapularEuler.z)
  };
  
  const glenohumeral = {
    x: THREE.MathUtils.radToDeg(ghEuler.x),
    y: THREE.MathUtils.radToDeg(ghEuler.y),
    z: THREE.MathUtils.radToDeg(ghEuler.z)
  };
  
  // Composite motion is sum of both components
  // This represents total shoulder complex motion
  const composite = {
    x: scapular.x + glenohumeral.x, // Total abduction/adduction (X-axis)
    y: scapular.y + glenohumeral.y, // Total rotation (Y-axis)
    z: scapular.z + glenohumeral.z  // Total flexion/extension (Z-axis)
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
  const [utilization, setUtilization] = useState<{ x: number; y: number; z: number; max: number } | null>(null);
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
      setUtilization(null);
      setActiveAxis(null);
      return;
    }
    
    const constraint = getConstraintForBone(selectedBone.name);
    if (!constraint) return;
    
    const updateData = () => {
      // Get anatomical angles using GEOMETRIC ANALYSIS (not euler angles!)
      // This provides accurate anatomical measurements regardless of coordinate system
      const geometricMeasurement = analyzeJointGeometric(selectedBone);
      
      const displayAngles = {
        x: geometricMeasurement.primary,    // Primary motion (ABD/ADD for shoulder/hip, FLEX/EXT for elbow/knee)
        y: geometricMeasurement.secondary,  // Secondary motion (rotation)
        z: geometricMeasurement.tertiary    // Tertiary motion (FLEX/EXT for shoulder/hip)
      };
      
      if (viewerDebugEnabled()) {
        console.log(`🔍 ${selectedBone.name} (Geometric Analysis):`);
        console.log(`  Primary (${getMovementLabel(selectedBone.name, 'x')}): ${geometricMeasurement.primary.toFixed(1)}°`);
        console.log(`  Secondary (${getMovementLabel(selectedBone.name, 'y')}): ${geometricMeasurement.secondary.toFixed(1)}°`);
        console.log(`  Tertiary (${getMovementLabel(selectedBone.name, 'z')}): ${geometricMeasurement.tertiary.toFixed(1)}°`);
        if (geometricMeasurement.totalMotion !== undefined) {
          console.log(`  Total Motion: ${geometricMeasurement.totalMotion.toFixed(1)}°`);
        }
      }
      
      setJointAngles(displayAngles);
      
      // Utilization is still calculated from relative rotation against constraints
      // Get relative rotation from T-pose (still needed for constraint checking)
      const relativeEuler = getRelativeEuler(selectedBone);
      const util = getConstraintUtilization(relativeEuler, constraint.rotationLimits);
      setUtilization(util);
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
              
              {/* Composite Shoulder Motion Display */}
              {(() => {
                const compositeData = getCompositeShoulderMotion(selectedBone, skeleton);
                if (!compositeData) return null;
                
                return (
                  <div className="composite-shoulder-info">
                    <h5>🔬 Scapulohumeral Rhythm Analysis</h5>
                    <p className="shoulder-explanation">
                      Total shoulder motion = Glenohumeral (ball-and-socket) + Scapulothoracic (scapular gliding)
                    </p>
                    
                    <div className="composite-breakdown">
                      <div className="composite-row">
                        <span className="component-label">Total Shoulder Abduction:</span>
                        <span className="component-value composite-total">
                          {Math.abs(compositeData.composite.x).toFixed(1)}°
                        </span>
                      </div>
                      
                      <div className="composite-row component-detail">
                        <span className="component-label">↳ Glenohumeral contribution:</span>
                        <span className="component-value">
                          {Math.abs(compositeData.glenohumeral.x).toFixed(1)}°
                        </span>
                      </div>
                      
                      <div className="composite-row component-detail">
                        <span className="component-label">↳ Scapular contribution:</span>
                        <span className="component-value">
                          {Math.abs(compositeData.scapular.x).toFixed(1)}°
                        </span>
                      </div>
                      
                      <div className="composite-row">
                        <span className="component-label">GH:ST Ratio:</span>
                        <span className="component-value">
                          {compositeData.glenohumeral.x !== 0 && compositeData.scapular.x !== 0
                            ? `${(Math.abs(compositeData.glenohumeral.x) / Math.abs(compositeData.scapular.x)).toFixed(1)}:1`
                            : 'N/A'}
                        </span>
                      </div>
                      
                      <p className="rhythm-note">
                        💡 Normal scapulohumeral rhythm: ~2:1 ratio (2° GH per 1° scapular) from 30-180° elevation
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Plane of Elevation Analysis (for shoulder joints only) */}
              {(() => {
                const isShoulderJoint = selectedBone.name === 'mixamorig1RightArm' || selectedBone.name === 'mixamorig1LeftArm';
                if (!isShoulderJoint) return null;
                
                const isRightSide = selectedBone.name === 'mixamorig1RightArm';
                const kinematics = analyzeShoulderKinematics(selectedBone, isRightSide);
                const formatted = formatShoulderKinematics(kinematics);
                const planeName = getPlaneName(kinematics.planeOfElevation);
                const rhythm = calculateScapulohumeralRhythm(kinematics.elevation);
                
                return (
                  <div className="plane-of-elevation-info">
                    <h5>✈️ Plane of Elevation Analysis</h5>
                    <p className="shoulder-explanation">
                      Decomposes shoulder motion into elevation magnitude and plane direction
                    </p>
                    
                    <div className="composite-breakdown">
                      <div className="composite-row">
                        <span className="component-label">Total Elevation:</span>
                        <span className="component-value composite-total">
                          {formatted.elevation}
                        </span>
                      </div>
                      
                      <div className="composite-row component-detail">
                        <span className="component-label">↳ GH Contribution:</span>
                        <span className="component-value">
                          {(rhythm.glenohumeral * 180 / Math.PI).toFixed(1)}°
                        </span>
                      </div>
                      
                      <div className="composite-row component-detail">
                        <span className="component-label">↳ ST Contribution:</span>
                        <span className="component-value">
                          {(rhythm.scapulothoracic * 180 / Math.PI).toFixed(1)}°
                        </span>
                      </div>
                      
                      <div className="composite-row">
                        <span className="component-label">Plane of Elevation:</span>
                        <span className="component-value">
                          {formatted.plane}
                        </span>
                      </div>
                      
                      <div className="composite-row component-detail">
                        <span className="component-label">↳ {planeName}</span>
                      </div>
                      
                      <div className="composite-row">
                        <span className="component-label">Abduction Component:</span>
                        <span className="component-value">
                          {formatted.abduction}
                        </span>
                      </div>
                      
                      <div className="composite-row">
                        <span className="component-label">Flexion Component:</span>
                        <span className="component-value">
                          {formatted.flexion}
                        </span>
                      </div>
                      
                      <div className="composite-row">
                        <span className="component-label">Axial Rotation:</span>
                        <span className="component-value">
                          {formatted.rotation}
                        </span>
                      </div>
                      
                      <p className="rhythm-note">
                        💡 Plane: 0° = Frontal (pure ABD), 90° = Sagittal (pure FLEX), ~30° = Scapular plane
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Joint Angles - Geometric Analysis */}
              {jointAngles && (
                <div className="joint-angles">
                  <h5>Current Angles (Anatomical Neutral = 0°)</h5>
                  {(['x', 'y', 'z'] as const).map((axis) => {
                    const anatomicalAngle = jointAngles[axis];
                    const movementLabel = getMovementLabel(selectedBone.name, axis);
                    
                    // Define standard anatomical ROM for common joints
                    let minAngle = -180;
                    let maxAngle = 180;
                    
                    // Customize based on joint and axis
                    if (selectedBone.name.includes('Arm')) {
                      if (axis === 'x') { minAngle = -30; maxAngle = 180; } // ABD: -30 (ADD) to 180 (overhead)
                      if (axis === 'z') { minAngle = -60; maxAngle = 180; } // FLEX: -60 (EXT) to 180 (overhead)
                    } else if (selectedBone.name.includes('UpLeg')) {
                      if (axis === 'x') { minAngle = -30; maxAngle = 45; }  // ABD: -30 (ADD) to 45
                      if (axis === 'z') { minAngle = -20; maxAngle = 120; } // FLEX: -20 (EXT) to 120
                    } else if (selectedBone.name.includes('ForeArm') || selectedBone.name.includes('Leg')) {
                      if (axis === 'x') { minAngle = 0; maxAngle = 150; }   // Flexion only
                    }
                    
                    const anatomicalRange = maxAngle - minAngle;
                    
                    // Parse movement label
                    const [flexionName, extensionName] = movementLabel.includes('/') 
                      ? movementLabel.split('/').map(s => s.trim())
                      : ['Negative', 'Positive'];
                    
                    // Calculate position on scale
                    const normalizedPos = ((anatomicalAngle - minAngle) / anatomicalRange) * 100;
                    const clampedPos = Math.min(100, Math.max(0, normalizedPos));
                    
                    // Neutral position (0° anatomical)
                    const neutralPos = ((0 - minAngle) / anatomicalRange) * 100;
                    
                    return (
                      <div key={axis} className="angle-row-scale">
                        <div className="movement-header">
                          <span className="axis-label">{movementLabel}</span>
                          <span className="angle-value">{anatomicalAngle.toFixed(1)}°</span>
                        </div>
                        <div className="linear-scale">
                          <div className="scale-track">
                            <div className="scale-half scale-left">
                              <span className="scale-label">{flexionName}</span>
                              <span className="scale-limit">{minAngle.toFixed(0)}°</span>
                            </div>
                            <div className="scale-center" style={{ left: `${neutralPos}%` }}>
                              <div className="neutral-marker">0°</div>
                            </div>
                            <div className="scale-half scale-right">
                              <span className="scale-limit">{maxAngle.toFixed(0)}°</span>
                              <span className="scale-label">{extensionName}</span>
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
                        <div className="utilization-info">
                          <span className="util-label">ROM Utilization:</span>
                          <span className={`util-value ${(utilization?.[axis] ?? 0) > 90 ? 'warning' : ''}`}>
                            {utilization?.[axis].toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {utilization && (
                    <div className="max-util">
                      <span className="label">Max Utilization:</span>
                      <span 
                        className={`value ${utilization.max > 90 ? 'warning' : ''}`}
                      >
                        {utilization.max.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Biomech Joint Angles (Teaching Display) */}
              {skeleton && selectedBone && (() => {
                const biomechData = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
                if (!biomechData) return null;
                
                return (
                  <div className="biomech-angles">
                    <h5>🔬 Biomechanical Joint Angles</h5>
                    <p className="biomech-explanation">
                      <strong>Teaching view:</strong> Angles measured between proximal and distal segments 
                      (e.g., pelvis→femur for hip, femur→tibia for knee). These match clinical measurement conventions.
                    </p>
                    
                    <div className="biomech-angle-grid">
                      <div className="biomech-angle-row">
                        <span className="biomech-label">Flexion/Extension:</span>
                        <span className="biomech-value">{biomechData.angles.flexExt.toFixed(1)}°</span>
                        <span className="biomech-note">
                          {biomechData.angles.flexExt > 0 ? 'Flexion' : 'Extension'}
                        </span>
                      </div>
                      
                      <div className="biomech-angle-row">
                        <span className="biomech-label">Abduction/Adduction:</span>
                        <span className="biomech-value">{biomechData.angles.abdAdd.toFixed(1)}°</span>
                        <span className="biomech-note">
                          {biomechData.angles.abdAdd > 0 ? 'Abduction' : 'Adduction'}
                        </span>
                      </div>
                      
                      <div className="biomech-angle-row">
                        <span className="biomech-label">Internal/External Rotation:</span>
                        <span className="biomech-value">{biomechData.angles.rotation.toFixed(1)}°</span>
                        <span className="biomech-note">
                          {biomechData.angles.rotation > 0 ? 'Internal' : 'External'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="biomech-footer">
                      💡 These angles are relative to anatomical neutral (T-pose = 0°), using 
                      segment-to-segment orientation rather than model-local axes.
                    </p>
                  </div>
                );
              })()}
              
              {/* Rotation Limits */}
              <div className="rotation-limits">
                <h5>Rotation Limits</h5>
                <div className="limit-row">
                  <span className="axis">{getMovementLabel(selectedBone.name, 'x')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.x[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.x[1]).toFixed(0)}°
                  </span>
                </div>
                <div className="limit-row">
                  <span className="axis">{getMovementLabel(selectedBone.name, 'y')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.y[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.y[1]).toFixed(0)}°
                  </span>
                </div>
                <div className="limit-row">
                  <span className="axis">{getMovementLabel(selectedBone.name, 'z')}:</span>
                  <span className="range">
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.z[0]).toFixed(0)}° 
                    to 
                    {THREE.MathUtils.radToDeg(constraint.rotationLimits.z[1]).toFixed(0)}°
                  </span>
                </div>
              </div>

              <div className="manual-controls">
                <h5>Manual Joint Probe</h5>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <label key={axis} className="manual-row">
                    <span className="axis">{getMovementLabel(selectedBone.name, axis)}:</span>
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
          
          {/* Educational Info */}
          <div className="educational-info">
            <h5>💡 About This System</h5>
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
          </div>
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
