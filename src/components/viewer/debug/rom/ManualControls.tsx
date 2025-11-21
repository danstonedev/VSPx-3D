import React from 'react';
import * as THREE from 'three';
import { getSegmentByBoneName } from '../../../../biomech/model/segments';
import { getParentJoint } from '../../../../biomech/model/joints';
import { resetBoneToRest, getConstraintForBone } from '../../constraints/constraintValidator';
import type { BiomechState } from '../../../../biomech/engine/biomechState';

interface ManualControlsProps {
  selectedBone: THREE.Bone;
  skeleton: THREE.Skeleton;
  biomechState: BiomechState | null;
  jointCoordinates: Record<string, number> | null;
  localCoordinates: Record<string, number> | null;
  manualAngles: { x: number; y: number; z: number };
  setManualAngles: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  setLocalCoordinates: React.Dispatch<React.SetStateAction<Record<string, number> | null>>;
  setActiveAxis: React.Dispatch<React.SetStateAction<'x' | 'y' | 'z' | string | null>>;
}

export function ManualControls({
  selectedBone,
  skeleton,
  biomechState,
  jointCoordinates,
  localCoordinates,
  setLocalCoordinates,
  setActiveAxis
}: ManualControlsProps) {
  const constraint = getConstraintForBone(selectedBone.name);
  if (!constraint) return null;

  const applyCoordinateChange = (coordId: string, valueDeg: number) => {
    if (!selectedBone || !biomechState || !biomechState.isCalibrated()) return;

    const segment = getSegmentByBoneName(selectedBone.name);
    const joint = segment ? getParentJoint(segment.id) : null;
    if (!joint) return;

    // Use local coordinates if active, otherwise initialize from current read-back
    // This prevents "drift" where small read-back errors accumulate when modifying one axis
    const baseCoords = localCoordinates || jointCoordinates || {};
    const newCoords = { ...baseCoords, [coordId]: valueDeg };

    setLocalCoordinates(newCoords);

    // Construct the [q0, q1, q2] array expected by applyCoordinates
    // qValues corresponds to [x, y, z] components of the Euler angle
    // The order of application is determined by joint.eulerOrder (e.g., YZX)
    const qValues: [number, number, number] = [0, 0, 0];

    joint.coordinates.forEach(coord => {
      const valDeg = newCoords[coord.id] ?? 0;
      if (coord.index >= 0 && coord.index < 3) {
        qValues[coord.index] = THREE.MathUtils.degToRad(valDeg);
      }
    });

    // Apply to biomech state (which updates skeleton)
    biomechState.applyCoordinates(joint.id, qValues);
  };

  const handleJointReset = () => {
    if (!selectedBone) return;
    resetBoneToRest(selectedBone);
    selectedBone.updateMatrixWorld(true);
    skeleton?.bones.forEach((bone) => bone.updateMatrixWorld(true));
    setLocalCoordinates(null); // Clear local override on reset
  };

  const segment = selectedBone ? getSegmentByBoneName(selectedBone.name) : null;
  const joint = segment ? getParentJoint(segment.id) : null;
  const useCoordinateControls = biomechState?.isCalibrated() && joint && jointCoordinates;

  if (!useCoordinateControls || !joint) {
    return (
      <div className="manual-controls">
        <h5>Manual Joint Probe</h5>
        <div className="local-override-warning">
          ⚠️ Biomechanics Engine not calibrated or joint not mapped.
        </div>
      </div>
    );
  }

  return (
    <div className="manual-controls">
      <h5>Manual Joint Probe</h5>
      {localCoordinates && (
        <div className="local-override-warning">
          ⚠️ Local Override Active - Sliders are driving the model directly
        </div>
      )}
      <p className="control-mode-label">
        Mode: Coordinate Control ({joint.displayName})
      </p>
      {joint.coordinates.map(coord => (
        <label key={coord.id} className="manual-row">
          <span className="axis truncated" title={coord.displayName}>
            {coord.displayName}:
          </span>
          <input
            type="range"
            min={THREE.MathUtils.radToDeg(coord.range.min)}
            max={THREE.MathUtils.radToDeg(coord.range.max)}
            step={1}
            value={localCoordinates?.[coord.id] ?? jointCoordinates?.[coord.id] ?? 0}
            onChange={(event) => applyCoordinateChange(coord.id, Number(event.target.value))}
            onPointerDown={() => setActiveAxis(coord.id)}
            onPointerUp={() => setActiveAxis(null)}
            onPointerLeave={() => setActiveAxis(null)}
          />
          <span className="manual-value">{(localCoordinates?.[coord.id] ?? jointCoordinates?.[coord.id] ?? 0).toFixed(1)}°</span>
        </label>
      ))}
      <button className="control-btn" onClick={handleJointReset}>
        Reset Joint
      </button>
    </div>
  );
}
