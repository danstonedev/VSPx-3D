import React from 'react';
import * as THREE from 'three';
import { 
  getBiomechMovementLabel, 
  getDisplayAnglesFromBiomech, 
  getClinicalAngleLimits 
} from '../../utils/jointLabels';
import { getConstraintForBone } from '../../constraints/jointConstraints';
import { ShoulderAnalysisPanel } from './ShoulderAnalysisPanel';
import { ManualControls } from './ManualControls';
import type { BiomechState } from '../../../../biomech/engine/biomechState';
import { getSegmentByBoneName } from '../../../../biomech/model/segments';
import { getParentJoint } from '../../../../biomech/model/joints';

interface BoneInfoPanelProps {
  selectedBone: THREE.Bone;
  skeleton: THREE.Skeleton;
  jointAngles: { x: number; y: number; z: number } | null;
  biomechState: BiomechState | null;
  jointCoordinates: Record<string, number> | null;
  localCoordinates: Record<string, number> | null;
  manualAngles: { x: number; y: number; z: number };
  setManualAngles: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  setLocalCoordinates: React.Dispatch<React.SetStateAction<Record<string, number> | null>>;
  setActiveAxis: React.Dispatch<React.SetStateAction<'x' | 'y' | 'z' | string | null>>;
}

function extractBiomechAnglesFromCoordinates(
  boneName: string, 
  jointCoordinates: Record<string, number>
): { flexExt: number; abdAdd: number; rotation: number } | null {
  const segment = getSegmentByBoneName(boneName);
  const joint = segment ? getParentJoint(segment.id) : null;
  
  if (!joint) return null;

  let flexExt = 0;
  let abdAdd = 0;
  let rotation = 0;

  // Helper to find value by axis
  const getVal = (axis: 'X' | 'Y' | 'Z') => {
    const coord = joint.coordinates.find((c) => c.axis === axis);
    return coord ? (jointCoordinates[coord.id] ?? 0) : 0;
  };

  if (boneName.includes('Arm') && !boneName.includes('ForeArm')) {
    // Shoulder (GH): Flex=Y, Abd=Z, Rot=X
    flexExt = getVal('Y');
    abdAdd = getVal('Z');
    rotation = getVal('X');
  } else if (boneName.includes('ForeArm')) {
    // Elbow: Flex=Z, Rot=Y
    flexExt = getVal('Z');
    rotation = getVal('Y');
    abdAdd = 0; // No varus/valgus coordinate usually
  } else {
    // Hip, Knee, Ankle: Flex=X, Abd=Z, Rot=Y
    flexExt = getVal('X');
    abdAdd = getVal('Z');
    rotation = getVal('Y');
  }

  return { flexExt, abdAdd, rotation };
}

export function BoneInfoPanel({
  selectedBone,
  skeleton,
  jointAngles,
  biomechState,
  jointCoordinates,
  localCoordinates,
  manualAngles,
  setManualAngles,
  setLocalCoordinates,
  setActiveAxis
}: BoneInfoPanelProps) {
  const constraint = getConstraintForBone(selectedBone.name);
  if (!constraint) return null;

  return (
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
      
      {/* Unified Joint Angles Display */}
      {skeleton && (() => {
        // PRIORITY: Use jointCoordinates from BiomechState if available (Coordinate System)
        // FALLBACK: Use computeBiomechAnglesForSelectedBone (Bone System)
        
        let displayAngles: { x: number; y: number; z: number } | null = null;
        
        if (jointCoordinates) {
          const biomechAngles = extractBiomechAnglesFromCoordinates(selectedBone.name, jointCoordinates);
          if (biomechAngles) {
            displayAngles = getDisplayAnglesFromBiomech(selectedBone.name, biomechAngles);
          }
        }
        
        if (!displayAngles && jointAngles) {
           // Fallback to the prop passed in (which comes from computeBiomechAnglesForSelectedBone)
           // Note: jointAngles prop is ALREADY processed by getDisplayAnglesFromBiomech in RangeOfMotionPanel
           displayAngles = jointAngles;
        }

        if (!displayAngles) return null;
        
        return (
          <div className="joint-angles unified">
            <h5>Joint Angles (Anatomical Neutral = 0°)</h5>
            <p className="biomech-note">
              Measured between proximal and distal segments using clinical conventions
            </p>
            
            {(['x', 'y', 'z'] as const).map((axis) => {
              // We don't have the raw anatomical angle here easily if we used jointCoordinates,
              // but we have the display value which is what matters for the badge.
              // For the slider, we need to know the range.
              
              const movementLabel = getBiomechMovementLabel(selectedBone.name, axis);
              const biomechValue = displayAngles![axis];
              
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
              
              // Get limits using helper
              const { min: minAngle, max: maxAngle } = getClinicalAngleLimits(selectedBone.name, axis);
              const anatomicalRange = maxAngle - minAngle;
              
              // Calculate position on scale
              // Note: biomechValue IS the anatomical angle for this axis
              const normalizedPos = ((biomechValue - minAngle) / anatomicalRange) * 100;
              const clampedPos = Math.min(100, Math.max(0, normalizedPos));
              const neutralPos = ((0 - minAngle) / anatomicalRange) * 100;

              const applyScaleVariables = (element: HTMLDivElement | null) => {
                if (!element) return;
                element.style.setProperty('--neutral-pos', `${neutralPos}%`);
                element.style.setProperty('--indicator-pos', `${clampedPos}%`);
                element.style.setProperty('--fill-width', `${Math.abs(clampedPos - neutralPos)}%`);
                element.style.setProperty(
                  '--fill-left',
                  clampedPos < neutralPos ? `${clampedPos}%` : `${neutralPos}%`
                );
              };
              
              return (
                <div key={axis} className="angle-row-scale">
                  <div className="movement-header">
                    <span className="axis-label left-label">{leftLabel}</span>
                    <span className="biomech-badge">{biomechValue.toFixed(1)}°</span>
                    <span className="axis-label right-label">{rightLabel}</span>
                  </div>
                  <div className="linear-scale" ref={applyScaleVariables}>
                    <div className="scale-track">
                      <div className="scale-half scale-left">
                        <span className="scale-limit">{minAngle.toFixed(0)}°</span>
                      </div>
                      <div className="scale-center">
                        <div className="neutral-marker"></div>
                      </div>
                      <div className="scale-half scale-right">
                        <span className="scale-limit">{maxAngle.toFixed(0)}°</span>
                      </div>
                    </div>
                    <div className="position-indicator">
                      <div className="indicator-dot"></div>
                    </div>
                    <div className="scale-fill"></div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      
      <ShoulderAnalysisPanel 
        selectedBone={selectedBone} 
        skeleton={skeleton} 
        jointCoordinates={jointCoordinates}
        biomechState={biomechState}
      />
      
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

      <ManualControls 
        selectedBone={selectedBone}
        skeleton={skeleton}
        biomechState={biomechState}
        jointCoordinates={jointCoordinates}
        localCoordinates={localCoordinates}
        manualAngles={manualAngles}
        setManualAngles={setManualAngles}
        setLocalCoordinates={setLocalCoordinates}
        setActiveAxis={setActiveAxis}
      />
    </div>
  );
}
