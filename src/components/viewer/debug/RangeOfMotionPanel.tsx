/**
 * Range of Motion Panel
 * 
 * Educational UI panel displaying joint angles, constraint utilization,
 * and collision information for the interactive IK system.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { getConstraintForBone } from '../constraints/jointConstraints';
import { getConstraintUtilization, getRelativeEuler, resetBoneToRest, setRelativeEuler, validateRotation, type ConstraintViolation } from '../constraints/constraintValidator';
import { detectCollisions, getCollisionSummary, type CollisionResult } from '../constraints/selfCollisionDetector';
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
    primary: 'Elev/Depr',
    secondary: 'Rotation',
    tertiary: 'Pro/Retract'
  },
  'mixamorig1LeftArm': {
    primary: 'Flex/Ext',
    secondary: 'Int/Ext Rot',
    tertiary: 'Abd/Add'
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
    primary: 'Elev/Depr',
    secondary: 'Rotation',
    tertiary: 'Pro/Retract'
  },
  'mixamorig1RightArm': {
    primary: 'Flex/Ext',
    secondary: 'Int/Ext Rot',
    tertiary: 'Abd/Add'
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
    primary: 'Flex/Ext',
    secondary: 'Abd/Add',
    tertiary: 'Int/Ext Rot'
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
    primary: 'Flex/Ext',
    secondary: 'Abd/Add',
    tertiary: 'Int/Ext Rot'
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
      const euler = getRelativeEuler(selectedBone);
      
      setJointAngles({
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z)
      });
      
      const util = getConstraintUtilization(euler, constraint.rotationLimits);
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
              
              {/* Joint Angles */}
              {jointAngles && (
                <div className="joint-angles">
                  <h5>Current Angles</h5>
                  <div className="angle-row">
                    <span className="axis">{getMovementLabel(selectedBone.name, 'x')}:</span>
                    <span className="value">{jointAngles.x.toFixed(1)}°</span>
                    <progress
                      className="angle-progress"
                      value={Math.min(100, Math.max(0, utilization?.x ?? 0))}
                      max={100}
                    />
                    <span className="util">{utilization?.x.toFixed(0)}%</span>
                  </div>
                  
                  <div className="angle-row">
                    <span className="axis">{getMovementLabel(selectedBone.name, 'y')}:</span>
                    <span className="value">{jointAngles.y.toFixed(1)}°</span>
                    <progress
                      className="angle-progress"
                      value={Math.min(100, Math.max(0, utilization?.y ?? 0))}
                      max={100}
                    />
                    <span className="util">{utilization?.y.toFixed(0)}%</span>
                  </div>
                  
                  <div className="angle-row">
                    <span className="axis">{getMovementLabel(selectedBone.name, 'z')}:</span>
                    <span className="value">{jointAngles.z.toFixed(1)}°</span>
                    <progress
                      className="angle-progress"
                      value={Math.min(100, Math.max(0, utilization?.z ?? 0))}
                      max={100}
                    />
                    <span className="util">{utilization?.z.toFixed(0)}%</span>
                  </div>
                  
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
              <p className="panel-note">Viewing live animation metrics. Switch to IK mode to manipulate joints.</p>
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
