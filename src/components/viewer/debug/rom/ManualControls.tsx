import React from 'react';
import * as THREE from 'three';
import { getBiomechMovementLabel } from '../../utils/jointLabels';
import { getSegmentByBoneName } from '../../../../biomech/model/segments';
import { getParentJoint } from '../../../../biomech/model/joints';
import { resetBoneToRest, setRelativeEuler, validateRotation } from '../../constraints/constraintValidator';
import type { BiomechState } from '../../../../biomech/engine/biomechState';
import { getConstraintForBone } from '../../constraints/jointConstraints';

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
  manualAngles,
  setManualAngles,
  setLocalCoordinates,
  setActiveAxis
}: ManualControlsProps) {
  const constraint = getConstraintForBone(selectedBone.name);
  if (!constraint) return null;

  const applyManualRotation = (axis: 'x' | 'y' | 'z', degrees: number) => {
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
  };

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
    setManualAngles({ x: 0, y: 0, z: 0 });
    setLocalCoordinates(null); // Clear local override on reset
  };

  const segment = selectedBone ? getSegmentByBoneName(selectedBone.name) : null;
  const joint = segment ? getParentJoint(segment.id) : null;
  const useCoordinateControls = biomechState?.isCalibrated() && joint && jointCoordinates;

  return (
    <div className="manual-controls">
      <h5>Manual Joint Probe</h5>
      {useCoordinateControls && joint ? (
        <>
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
        </>
      ) : (
        <>
            <p className="control-mode-label">
                Mode: Bone Rotation (Euler)
            </p>
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
        </>
      )}
      <button className="control-btn" onClick={handleJointReset}>
        Reset Joint
      </button>
    </div>
  );
}
