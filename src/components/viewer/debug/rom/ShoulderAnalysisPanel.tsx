import React from 'react';
import * as THREE from 'three';
import { getCompositeShoulderMotion } from '../../utils/shoulderAnalysis';
import { getPlaneName } from '../../constraints/shoulderKinematics';
import { computeBiomechAnglesForSelectedBone } from '../../biomech/jointAngles';
import type { BiomechState } from '../../../../biomech/engine/biomechState';

interface ShoulderAnalysisPanelProps {
  selectedBone: THREE.Bone;
  skeleton: THREE.Skeleton;
  jointCoordinates?: Record<string, number> | null;
  biomechState?: BiomechState | null;
}

export function ShoulderAnalysisPanel({ selectedBone, skeleton, jointCoordinates, biomechState }: ShoulderAnalysisPanelProps) {
  const isShoulderJoint = selectedBone.name === 'mixamorig1RightArm' || selectedBone.name === 'mixamorig1LeftArm';
  if (!isShoulderJoint || !skeleton) return null;
  
  // --------------------------------------------------------------------------
  // STRATEGY 1: Use Biomech Engine Coordinates (Preferred)
  // --------------------------------------------------------------------------
  // We prefer using biomechState directly if available to get the full complex data
  if (biomechState && biomechState.isCalibrated()) {
    const side = selectedBone.name.includes('Right') ? 'right' : 'left';
    const prefix = side === 'right' ? 'r' : 'l';
    
    const ghState = biomechState.getJointState(`gh_${side}`);
    const stState = biomechState.getJointState(`st_${side}`);
    
    if (ghState && stState) {
      const rad2deg = 180 / Math.PI;
      
      // Extract GH Coordinates (Radians -> Degrees)
      const ghAbd = (ghState.coordinates[`gh_${prefix}_abduction`]?.value ?? 0) * rad2deg;
      const ghFlex = (ghState.coordinates[`gh_${prefix}_flexion`]?.value ?? 0) * rad2deg;
      
      // Extract ST Coordinates (Radians -> Degrees)
      const stUpward = (stState.coordinates[`st_${prefix}_upward`]?.value ?? 0) * rad2deg;
      
      // Total Abduction (Elevation in Coronal Plane)
      const totalAbduction = Math.abs(ghAbd) + Math.abs(stUpward);
      
      // Plane of Elevation
      const totalElevation = Math.sqrt(ghFlex * ghFlex + ghAbd * ghAbd);
      const planeOfElevation = totalElevation < 5 ? 0 : Math.atan2(ghFlex, ghAbd) * rad2deg;
      const planeName = getPlaneName(planeOfElevation * Math.PI / 180);

      return (
        <div className="shoulder-analysis-advanced">
          <h5>🔬 Advanced Shoulder Analysis (Coordinate System)</h5>
          
          <div className="analysis-grid">
            {/* Scapulohumeral Rhythm */}
            <div className="analysis-section">
              <h6>Scapulohumeral Rhythm</h6>
              <div className="composite-breakdown">
                <div className="composite-row">
                  <span className="component-label">Total Abduction:</span>
                  <span className="component-value">{totalAbduction.toFixed(1)}°</span>
                </div>
                <div className="composite-row component-detail">
                  <span className="component-label">↳ GH Abduction:</span>
                  <span className="component-value">{Math.abs(ghAbd).toFixed(1)}°</span>
                </div>
                <div className="composite-row component-detail">
                  <span className="component-label">↳ ST Upward Rot:</span>
                  <span className="component-value">{Math.abs(stUpward).toFixed(1)}°</span>
                </div>
                <div className="composite-row">
                  <span className="component-label">GH:ST Ratio:</span>
                  <span className="component-value">
                    {Math.abs(ghAbd) > 1 && Math.abs(stUpward) > 0.1
                      ? `${(Math.abs(ghAbd) / Math.abs(stUpward)).toFixed(1)}:1`
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
                  <span className="component-label">↳ GH Abd:</span>
                  <span className="component-value">{Math.abs(ghAbd).toFixed(1)}°</span>
                </div>
                <div className="composite-row component-detail">
                  <span className="component-label">↳ GH Flex:</span>
                  <span className="component-value">{Math.abs(ghFlex).toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="rhythm-note">
            💡 Normal: ~2:1 GH:ST ratio, scapular plane ~30°
          </p>
        </div>
      );
    }
  }

  // --------------------------------------------------------------------------
  // STRATEGY 2: Use Partial Joint Coordinates (Fallback)
  // --------------------------------------------------------------------------
  if (jointCoordinates) {
    // ... existing logic for jointCoordinates ...
    // But wait, jointCoordinates likely misses ST data if we selected the Arm.
    // So this fallback might be partial.
    // However, if we are here, it means biomechState was null or not calibrated.
    // If biomechState is null, jointCoordinates probably comes from somewhere else?
    // Actually, jointCoordinates in RangeOfMotionPanel ONLY comes from biomechState.
    // So if biomechState is null, jointCoordinates is null.
    // So this block is redundant if we handle biomechState above.
    // BUT, for testing purposes (where we mock jointCoordinates but not biomechState), we might want to keep it.
    // I'll keep it but be aware it might lack ST data in production if selectedBone is Arm.
    
    const side = selectedBone.name.includes('Right') ? 'right' : 'left';
    const prefix = side === 'right' ? 'r' : 'l';
    
    // Extract GH Coordinates
    const ghAbd = (jointCoordinates[`gh_${prefix}_abduction`] || 0);
    const ghFlex = (jointCoordinates[`gh_${prefix}_flexion`] || 0);
    
    // Extract ST Coordinates
    const stUpward = (jointCoordinates[`st_${prefix}_upward`] || 0);
    
    // If we have ST data, great. If not, it will be 0.
    
    const rad2deg = 180 / Math.PI;
    const ghAbdDeg = ghAbd * rad2deg;
    const ghFlexDeg = ghFlex * rad2deg;
    const stUpwardDeg = stUpward * rad2deg;
    
    const totalAbduction = Math.abs(ghAbdDeg) + Math.abs(stUpwardDeg);
    const totalElevation = Math.sqrt(ghFlexDeg * ghFlexDeg + ghAbdDeg * ghAbdDeg);
    const planeOfElevation = totalElevation < 5 ? 0 : Math.atan2(ghFlexDeg, ghAbdDeg) * rad2deg;
    const planeName = getPlaneName(planeOfElevation * Math.PI / 180);

    return (
      <div className="shoulder-analysis-advanced">
        <h5>🔬 Advanced Shoulder Analysis (Coordinate System)</h5>
        {/* ... same JSX ... */}
        <div className="analysis-grid">
          {/* Scapulohumeral Rhythm */}
          <div className="analysis-section">
            <h6>Scapulohumeral Rhythm</h6>
            <div className="composite-breakdown">
              <div className="composite-row">
                <span className="component-label">Total Abduction:</span>
                <span className="component-value">{totalAbduction.toFixed(1)}°</span>
              </div>
              <div className="composite-row component-detail">
                <span className="component-label">↳ GH Abduction:</span>
                <span className="component-value">{Math.abs(ghAbdDeg).toFixed(1)}°</span>
              </div>
              <div className="composite-row component-detail">
                <span className="component-label">↳ ST Upward Rot:</span>
                <span className="component-value">{Math.abs(stUpwardDeg).toFixed(1)}°</span>
              </div>
              <div className="composite-row">
                <span className="component-label">GH:ST Ratio:</span>
                <span className="component-value">
                  {Math.abs(ghAbdDeg) > 1 && Math.abs(stUpwardDeg) > 0.1
                    ? `${(Math.abs(ghAbdDeg) / Math.abs(stUpwardDeg)).toFixed(1)}:1`
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
                <span className="component-label">↳ GH Abd:</span>
                <span className="component-value">{Math.abs(ghAbdDeg).toFixed(1)}°</span>
              </div>
              <div className="composite-row component-detail">
                <span className="component-label">↳ GH Flex:</span>
                <span className="component-value">{Math.abs(ghFlexDeg).toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="rhythm-note">
          💡 Normal: ~2:1 GH:ST ratio, scapular plane ~30°
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STRATEGY 3: Fallback to Visual Bone Analysis (Legacy)
  // --------------------------------------------------------------------------
  // ... existing legacy code ...


  // --------------------------------------------------------------------------
  // STRATEGY 2: Fallback to Visual Bone Analysis (Legacy)
  // --------------------------------------------------------------------------
  const biomechData = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
  const compositeData = getCompositeShoulderMotion(selectedBone, skeleton);
  if (!biomechData || !compositeData) return null;
  
  const { flexExt, abdAdd } = biomechData.angles;
  const totalElevation = Math.sqrt(flexExt * flexExt + abdAdd * abdAdd);
  const planeOfElevation = totalElevation < 5 ? 0 : Math.atan2(flexExt, abdAdd) * 180 / Math.PI;
  const planeName = getPlaneName(planeOfElevation * Math.PI / 180);
  
  return (
    <div className="shoulder-analysis-advanced">
      <h5>🔬 Advanced Shoulder Analysis (Visual Estimate)</h5>
      
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
}
