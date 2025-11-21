/**
 * Range of Motion Panel
 * 
 * Educational UI panel displaying joint angles, constraint utilization,
 * and collision information for the interactive IK system.
 */

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { getConstraintForBone, type ConstraintViolation } from '../constraints/constraintValidator';
import { detectCollisions, type CollisionResult } from '../constraints/selfCollisionDetector';
import { computeBiomechAnglesForSelectedBone } from '../biomech/jointAngles';
import type { BiomechState } from '../../../biomech/engine/biomechState';
import { getAllJoints, getParentJoint } from '../../../biomech/model/joints';
import { getSegmentByBoneName } from '../../../biomech/model/segments';
import { computeScapulohumeralRhythm, ghToClinical, stToClinical } from '../../../biomech/mapping/shoulderMapping';
import { viewerDebugEnabled } from '../utils/debugFlags';
import { CoordinateDisplay } from './CoordinateDisplay';
import { getDisplayAnglesFromBiomech, SHOULDER_COORD_IDS } from '../utils/jointLabels';
import { BoneInfoPanel } from './rom/BoneInfoPanel';
import { CollisionSummary } from './rom/CollisionSummary';
import './RangeOfMotionPanel.css';

/**
 * Range of Motion Panel
 * 
 * Educational UI panel displaying joint angles, constraint utilization,
 * and collision information for the interactive IK system.
 */

type ROMMode = 'bone' | 'coordinate' | 'both';

type ShoulderSummary = {
  side: 'left' | 'right';
  ratio: number;
  isNormal: boolean;
  ghElevation: number;
  ghPlane: number;
  ghRotation: number;
  stUpward: number;
  totalElevation: number;
};

function inferShoulderSide(bone: THREE.Bone | null): 'left' | 'right' {
  if (!bone) return 'right';
  if (bone.name.toLowerCase().includes('left')) return 'left';
  if (bone.name.toLowerCase().includes('right')) return 'right';
  return 'right';
}

interface RangeOfMotionPanelProps {
  selectedBone: THREE.Bone | null;
  skeleton: THREE.Skeleton | null;
  biomechState?: BiomechState | null;
  constraintViolations: ConstraintViolation[];
  onResetPose?: () => void;
  onToggleConstraints?: () => void;
  constraintsEnabled: boolean;
  isInteractive?: boolean;
}

export function RangeOfMotionPanel({
  selectedBone,
  skeleton,
  biomechState = null,
  constraintViolations,
  onResetPose,
  onToggleConstraints,
  constraintsEnabled,
  isInteractive = true
}: RangeOfMotionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collisionData, setCollisionData] = useState<CollisionResult | null>(null);
  const [jointAngles, setJointAngles] = useState<{ x: number; y: number; z: number } | null>(null);
  const [jointCoordinates, setJointCoordinates] = useState<Record<string, number> | null>(null);
  const [localCoordinates, setLocalCoordinates] = useState<Record<string, number> | null>(null);
  const [manualAngles, setManualAngles] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z' | string | null>(null);
  const [romMode, setRomMode] = useState<ROMMode>(() => (biomechState ? 'both' : 'bone'));
  const [shoulderSummary, setShoulderSummary] = useState<ShoulderSummary | null>(null);
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
  const biomechJoints = useMemo(() => getAllJoints(), []);

  useEffect(() => {
    if (!biomechState && romMode !== 'bone') {
      setRomMode('bone');
    }
  }, [biomechState, romMode]);

  // Update collision data periodically
  useEffect(() => {
    if (!skeleton) return;

    const interval = setInterval(() => {
      const result = detectCollisions(skeleton);
      setCollisionData(result);
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [skeleton]);

  useEffect(() => {
    if (!biomechState || !biomechState.isCalibrated()) {
      setShoulderSummary(null);
      return;
    }

    let mounted = true;

    const updateSummary = () => {
      if (!mounted) return;
      const side = inferShoulderSide(selectedBone);
      const ghState = biomechState.getJointState(side === 'left' ? 'gh_left' : 'gh_right');
      const stState = biomechState.getJointState(side === 'left' ? 'st_left' : 'st_right');
      if (!ghState || !stState) {
        setShoulderSummary(null);
        return;
      }

      const ghIds = SHOULDER_COORD_IDS[side].gh;
      const stIds = SHOULDER_COORD_IDS[side].st;
      const ghValues = ghIds.map((id) => ghState.coordinates[id]?.value ?? null);
      const stValues = stIds.map((id) => stState.coordinates[id]?.value ?? null);

      if (ghValues.some((v) => typeof v !== 'number') || stValues.some((v) => typeof v !== 'number')) {
        setShoulderSummary(null);
        return;
      }

      const ghClinical = ghToClinical(ghValues[0] as number, ghValues[1] as number, ghValues[2] as number);
      const stClinical = stToClinical(stValues[0] as number, stValues[1] as number, stValues[2] as number);
      const rhythm = computeScapulohumeralRhythm(ghClinical.angles.elevation, stClinical.angles.upwardRotation);

      setShoulderSummary({
        side,
        ratio: rhythm.ratio,
        isNormal: rhythm.isNormal,
        ghElevation: ghClinical.angles.elevation,
        ghPlane: ghClinical.angles.plane,
        ghRotation: ghClinical.angles.rotation,
        stUpward: stClinical.angles.upwardRotation,
        totalElevation: rhythm.totalElevation,
      });
    };

    updateSummary();
    const timer = window.setInterval(updateSummary, 150);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [biomechState, selectedBone]);

  // Update joint angles and utilization when bone changes
  useEffect(() => {
    if (!selectedBone) {
      setJointAngles(null);
      setActiveAxis(null);
      setLocalCoordinates(null); // Reset local coordinates when bone changes
      return;
    }

    const constraint = getConstraintForBone(selectedBone.name);
    if (!constraint) return;

    const updateData = () => {
      // Get anatomical angles using BIOMECH SYSTEM (segment-to-segment joint angles)
      // This provides accurate anatomical measurements using joint-relative quaternions
      const biomechData = skeleton ? computeBiomechAnglesForSelectedBone(skeleton, selectedBone) : null;

      if (!biomechData) {
        setJointAngles(null);
        return;
      }

      // Map biomech angles to display axes using helper
      const displayAngles = getDisplayAnglesFromBiomech(selectedBone.name, biomechData.angles);

      if (viewerDebugEnabled()) {
        console.log(`🔍 ${selectedBone.name} (Biomech System):`);
        console.log(`  ${biomechData.side} ${biomechData.jointId}:`);
        console.log(`    Flex/Ext: ${biomechData.angles.flexExt.toFixed(1)}°`);
        console.log(`    Abd/Add: ${biomechData.angles.abdAdd.toFixed(1)}°`);
        console.log(`    Rotation: ${biomechData.angles.rotation.toFixed(1)}°`);
      }

      setJointAngles(displayAngles);

      // Update coordinate values if biomechState is available
      if (biomechState && biomechState.isCalibrated()) {
        const segment = getSegmentByBoneName(selectedBone.name);
        const joint = segment ? getParentJoint(segment.id) : null;
        if (joint) {
          const jointState = biomechState.getJointState(joint.id);
          if (jointState) {
            const coords: Record<string, number> = {};
            joint.coordinates.forEach(coord => {
              const val = jointState.coordinates[coord.id]?.value ?? 0;
              coords[coord.id] = THREE.MathUtils.radToDeg(val);
            });
            setJointCoordinates(coords);
          }
        } else {
          setJointCoordinates(null);
        }
      }
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

  const constraint = selectedBone ? getConstraintForBone(selectedBone.name) : null;
  const coordinatePanel = (
    <div className="coordinate-panel">
      <h4>Coordinate-Level ROM</h4>
      {!biomechState && (
        <p className="coordinate-panel-note">
          Enable the coordinate engine feature flag to inspect q-space coordinates.
        </p>
      )}

      {biomechState && (
        <>
          {!biomechState.isCalibrated() && (
            <p className="coordinate-panel-note">
              Load the Neutral pose to calibrate and unlock coordinate readouts.
            </p>
          )}

          {biomechState.isCalibrated() && (
            <>
              {shoulderSummary ? (
                <div className="scap-summary-card">
                  <div className="scap-summary-header">
                    <h5>
                      Scapulohumeral Rhythm ({shoulderSummary.side === 'left' ? 'Left' : 'Right'})
                    </h5>
                    <span className={`scap-status ${shoulderSummary.isNormal ? 'ok' : 'warning'}`}>
                      {shoulderSummary.isNormal ? '✓ Normal' : '⚠️ Out of Range'}
                    </span>
                  </div>
                  <div className="scap-summary-grid">
                    <div>
                      <span className="scap-label">GH Elevation</span>
                      <span className="scap-value">{shoulderSummary.ghElevation.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="scap-label">ST Upward Rot.</span>
                      <span className="scap-value">{shoulderSummary.stUpward.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="scap-label">Ratio</span>
                      <span className="scap-value">{shoulderSummary.ratio.toFixed(2)}:1</span>
                    </div>
                    <div>
                      <span className="scap-label">Total Elevation</span>
                      <span className="scap-value">{shoulderSummary.totalElevation.toFixed(1)}°</span>
                    </div>
                  </div>
                  <p className="scap-summary-note">
                    Plane {shoulderSummary.ghPlane.toFixed(1)}° · Rotation {shoulderSummary.ghRotation.toFixed(1)}°
                  </p>
                </div>
              ) : (
                <p className="coordinate-panel-note">
                  Select a shoulder joint to monitor scapulohumeral rhythm.
                </p>
              )}

              <div className="coordinate-display-grid">
                {biomechJoints.map((joint) => (
                  <CoordinateDisplay
                    key={joint.id}
                    jointId={joint.id}
                    biomechState={biomechState}
                    showClinical={joint.id.startsWith('gh_') || joint.id.startsWith('st_')}
                    defaultExpanded={joint.id.startsWith('gh_') || joint.id.startsWith('st_')}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`rom-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="rom-panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>Range of Motion</h3>
        <button className="collapse-btn">{isCollapsed ? '▼' : '▲'}</button>
      </div>

      {!isCollapsed && (
        <div className="rom-panel-content">
          <div className="rom-mode-toggle">
            <span className="rom-mode-label">ROM Mode</span>
            <div className="rom-mode-buttons">
              {([
                { key: 'bone', label: 'Bone-Level' },
                { key: 'coordinate', label: 'Coordinate-Level' },
                { key: 'both', label: 'Dual View' },
              ] as Array<{ key: ROMMode; label: string }>).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`rom-mode-btn ${romMode === key ? 'active' : ''}`}
                  onClick={() => setRomMode(key)}
                  disabled={key !== 'bone' && !biomechState}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`rom-layout rom-mode-${romMode}`}>
            <div className="rom-column bone-column">
              {/* Bone Information */}
              {selectedBone && constraint && skeleton ? (
                <BoneInfoPanel
                  selectedBone={selectedBone}
                  skeleton={skeleton}
                  jointAngles={jointAngles}
                  biomechState={biomechState}
                  jointCoordinates={jointCoordinates}
                  localCoordinates={localCoordinates}
                  manualAngles={manualAngles}
                  setManualAngles={setManualAngles}
                  setLocalCoordinates={setLocalCoordinates}
                  setActiveAxis={setActiveAxis}
                />
              ) : (
                <div className="no-selection">
                  <p>Click on a bone to see details</p>
                </div>
              )}
            </div>
            <div className="rom-column coordinate-column">
              {coordinatePanel}
            </div>
          </div>

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
          <CollisionSummary collisionData={collisionData} />

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
