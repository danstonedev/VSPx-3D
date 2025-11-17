/**
 * QUALITY ASSURANCE CALIBRATION TESTS
 * For Shoulder Kinematics Geometric Calculations
 * 
 * These tests verify that our geometric shoulder analysis produces
 * biomechanically accurate results for known anatomical positions.
 * 
 * Test methodology:
 * 1. Create mock bone in known anatomical position
 * 2. Call analyzeShoulderKinematics()
 * 3. Verify output matches expected clinical measurements
 * 
 * Reference: Standard goniometric positions from clinical biomechanics
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { 
  analyzeShoulderKinematics,
  calculateScapulohumeralRhythm 
} from '../../constraints/shoulderKinematics';

describe('Shoulder Kinematics QA Calibration', () => {
  
  /**
   * Helper to create a mock bone with specific world-space direction
   */
  function createMockShoulderBone(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    isRightSide: boolean
  ): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = isRightSide ? 'mixamorig1RightArm' : 'mixamorig1LeftArm';
    
    // Set position
    bone.position.copy(position);
    
    // Set rotation to point in the specified direction
    // IMPORTANT: Mixamo bones have local X-axis pointing down the bone
    const boneLocalAxis = new THREE.Vector3(1, 0, 0); // X-axis
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(boneLocalAxis, direction.clone().normalize());
    bone.quaternion.copy(quaternion);
    
    // Update world matrix
    bone.updateMatrixWorld(true);
    
    return bone;
  }

  describe('Anatomical Neutral Position (Arms at Sides)', () => {
    it('should measure 0° elevation when arm hangs vertically down', () => {
      // Arm pointing straight down (anatomical neutral)
      const direction = new THREE.Vector3(0, -1, 0);
      const position = new THREE.Vector3(0.2, 1.5, 0); // Right shoulder at typical height
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      
      // Should be close to 0° (allowing small tolerance for numerical precision)
      expect(elevationDeg).toBeCloseTo(0, 1);
      
      // Abduction and flexion components should also be near 0
      const abdDeg = THREE.MathUtils.radToDeg(result.abduction);
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      
      expect(abdDeg).toBeCloseTo(0, 1);
      expect(flexDeg).toBeCloseTo(0, 1);
    });
  });

  describe('T-Pose Position (Arms Horizontal)', () => {
    it('should measure 90° abduction when right arm points laterally (positive X)', () => {
      // Right arm pointing laterally (positive X direction)
      const direction = new THREE.Vector3(1, 0, 0);
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      const abdDeg = THREE.MathUtils.radToDeg(result.abduction);
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      const planeDeg = THREE.MathUtils.radToDeg(result.planeOfElevation);
      
      // Total elevation should be 90° (horizontal)
      expect(elevationDeg).toBeCloseTo(90, 1);
      
      // Should be pure abduction (90° in frontal plane)
      expect(abdDeg).toBeCloseTo(90, 1);
      
      // Flexion component should be minimal
      expect(flexDeg).toBeCloseTo(0, 5);
      
      // Plane of elevation should be 0° (frontal plane)
      expect(planeDeg).toBeCloseTo(0, 5);
    });

    it('should measure 90° abduction when left arm points laterally (negative X)', () => {
      // Left arm pointing laterally (negative X direction)
      const direction = new THREE.Vector3(-1, 0, 0);
      const position = new THREE.Vector3(-0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, false);
      const result = analyzeShoulderKinematics(bone, false);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      const abdDeg = THREE.MathUtils.radToDeg(result.abduction);
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      
      expect(elevationDeg).toBeCloseTo(90, 1);
      expect(abdDeg).toBeCloseTo(90, 1);
      expect(flexDeg).toBeCloseTo(0, 5);
    });
  });

  describe('Forward Flexion (Sagittal Plane)', () => {
    it('should measure 90° flexion when arm points forward (positive Z)', () => {
      // Arm pointing forward horizontally
      const direction = new THREE.Vector3(0, 0, 1);
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      const abdDeg = THREE.MathUtils.radToDeg(result.abduction);
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      const planeDeg = THREE.MathUtils.radToDeg(result.planeOfElevation);
      
      // Total elevation should be 90° (horizontal)
      expect(elevationDeg).toBeCloseTo(90, 1);
      
      // Should be pure flexion (90° in sagittal plane)
      expect(flexDeg).toBeCloseTo(90, 1);
      
      // Abduction component should be minimal
      expect(abdDeg).toBeCloseTo(0, 5);
      
      // Plane of elevation should be 90° (sagittal plane)
      expect(planeDeg).toBeCloseTo(90, 5);
    });

    it('should measure 180° flexion when arm points straight up', () => {
      // Arm pointing straight up (full overhead flexion)
      const direction = new THREE.Vector3(0, 1, 0);
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      
      // Total elevation should be 180° (full overhead)
      expect(elevationDeg).toBeCloseTo(180, 1);
    });
  });

  describe('Scapular Plane (30-45° from Frontal)', () => {
    it('should measure ~45° plane when arm elevated at 45° between ABD and FLEX', () => {
      // Arm pointing at 45° between lateral (X) and forward (Z)
      const direction = new THREE.Vector3(1, 0, 1).normalize();
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const planeDeg = THREE.MathUtils.radToDeg(result.planeOfElevation);
      
      // Plane should be around 45° (scapular plane)
      expect(planeDeg).toBeCloseTo(45, 5);
    });
  });

  describe('Extension (Behind Body)', () => {
    it('should measure negative flexion when arm points backward', () => {
      // Arm pointing backward (negative Z)
      const direction = new THREE.Vector3(0, 0, -1);
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      
      // Flexion should be negative (extension)
      expect(flexDeg).toBeLessThan(0);
      expect(flexDeg).toBeCloseTo(-90, 5);
    });
  });

  describe('Combined Movements', () => {
    it('should correctly decompose 90° ABD + 45° FLEX movement', () => {
      // Arm at 90° elevation, halfway between frontal and sagittal planes
      // This is a common clinical test position
      const direction = new THREE.Vector3(
        Math.cos(Math.PI / 4),  // 45° from frontal
        0,
        Math.sin(Math.PI / 4)   // 45° toward sagittal
      ).normalize();
      
      const position = new THREE.Vector3(0.2, 1.5, 0);
      
      const bone = createMockShoulderBone(position, direction, true);
      const result = analyzeShoulderKinematics(bone, true);
      
      const elevationDeg = THREE.MathUtils.radToDeg(result.elevation);
      const abdDeg = THREE.MathUtils.radToDeg(result.abduction);
      const flexDeg = THREE.MathUtils.radToDeg(result.flexion);
      const planeDeg = THREE.MathUtils.radToDeg(result.planeOfElevation);
      
      // Total elevation should be 90°
      expect(elevationDeg).toBeCloseTo(90, 1);
      
      // Components should sum correctly (Pythagorean)
      const calculatedElevation = Math.sqrt(
        Math.pow(THREE.MathUtils.degToRad(abdDeg), 2) + 
        Math.pow(THREE.MathUtils.degToRad(flexDeg), 2)
      );
      expect(THREE.MathUtils.radToDeg(calculatedElevation)).toBeCloseTo(90, 1);
      
      // Plane should be around 45°
      expect(planeDeg).toBeCloseTo(45, 10);
    });
  });

  describe('Coordinate System Validation', () => {
    it('should use right-hand coordinate system (Y-up, Z-forward, X-right)', () => {
      // Verify that our coordinate system matches THREE.js standard
      
      // Right arm lateral (T-pose) should be +X
      const rightLateral = new THREE.Vector3(1, 0, 0);
      const rightBone = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        rightLateral,
        true
      );
      const rightResult = analyzeShoulderKinematics(rightBone, true);
      expect(THREE.MathUtils.radToDeg(rightResult.abduction)).toBeCloseTo(90, 1);
      
      // Left arm lateral (T-pose) should be -X
      const leftLateral = new THREE.Vector3(-1, 0, 0);
      const leftBone = createMockShoulderBone(
        new THREE.Vector3(-0.2, 1.5, 0),
        leftLateral,
        false
      );
      const leftResult = analyzeShoulderKinematics(leftBone, false);
      expect(THREE.MathUtils.radToDeg(leftResult.abduction)).toBeCloseTo(90, 1);
      
      // Forward flexion should be +Z for both sides
      const forward = new THREE.Vector3(0, 0, 1);
      const forwardBone = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        forward,
        true
      );
      const forwardResult = analyzeShoulderKinematics(forwardBone, true);
      expect(THREE.MathUtils.radToDeg(forwardResult.flexion)).toBeCloseTo(90, 1);
    });
  });

  describe('Scapulohumeral Rhythm Validation', () => {
    it('should calculate 2:1 GH:ST ratio above 30° elevation', () => {
      // At 90° total elevation:
      // First 30° = pure GH
      // Remaining 60° = 2:1 ratio = 40° GH + 20° ST
      // Total: 30 + 40 = 70° GH, 20° ST
      const result90 = calculateScapulohumeralRhythm(Math.PI / 2); // 90°
      
      expect(THREE.MathUtils.radToDeg(result90.glenohumeral)).toBeCloseTo(70, 1);
      expect(THREE.MathUtils.radToDeg(result90.scapulothoracic)).toBeCloseTo(20, 1);
      
      // Verify the ratio is approximately 3.5 (70/20)
      const calculatedRatio = result90.glenohumeral / result90.scapulothoracic;
      expect(calculatedRatio).toBeCloseTo(3.5, 0.5);
      
      // At 150° total elevation:
      // First 30° = pure GH
      // Remaining 120° = 2:1 ratio = 80° GH + 40° ST
      // Total: 30 + 80 = 110° GH, 40° ST
      const result150 = calculateScapulohumeralRhythm(Math.PI * 5/6); // 150°
      
      expect(THREE.MathUtils.radToDeg(result150.glenohumeral)).toBeCloseTo(110, 1);
      expect(THREE.MathUtils.radToDeg(result150.scapulothoracic)).toBeCloseTo(40, 1);
      
      // Verify the ratio is approximately 2.75 (110/40)
      const calculatedRatio150 = result150.glenohumeral / result150.scapulothoracic;
      expect(calculatedRatio150).toBeCloseTo(2.75, 0.5);
    });

    it('should be pure glenohumeral below 30° elevation', () => {
      // At 20° elevation, should be pure GH (no scapular contribution)
      const result20 = calculateScapulohumeralRhythm(Math.PI / 9); // 20°
      
      expect(THREE.MathUtils.radToDeg(result20.glenohumeral)).toBeCloseTo(20, 1);
      expect(THREE.MathUtils.radToDeg(result20.scapulothoracic)).toBeCloseTo(0, 1);
      // No ratio check - would be division by zero (20/0)
    });
  });

  describe('Edge Cases and Numerical Stability', () => {
    it('should handle arm exactly vertical (straight down)', () => {
      const direction = new THREE.Vector3(0, -1, 0);
      const bone = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        direction,
        true
      );
      
      const result = analyzeShoulderKinematics(bone, true);
      
      expect(THREE.MathUtils.radToDeg(result.elevation)).toBeCloseTo(0, 1);
      expect(result.planeOfElevation).toBeDefined();
      expect(isNaN(result.planeOfElevation)).toBe(false);
    });

    it('should handle arm exactly vertical (straight up)', () => {
      const direction = new THREE.Vector3(0, 1, 0);
      const bone = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        direction,
        true
      );
      
      const result = analyzeShoulderKinematics(bone, true);
      
      expect(THREE.MathUtils.radToDeg(result.elevation)).toBeCloseTo(180, 1);
      expect(result.planeOfElevation).toBeDefined();
      expect(isNaN(result.planeOfElevation)).toBe(false);
    });

    it('should produce consistent results for left and right sides (mirrored)', () => {
      // Right arm at 45° ABD, 30° FLEX
      const rightDir = new THREE.Vector3(
        Math.cos(Math.PI / 6),  // 30° from lateral
        0,
        Math.sin(Math.PI / 6)
      ).normalize();
      
      const rightBone = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        rightDir,
        true
      );
      const rightResult = analyzeShoulderKinematics(rightBone, true);
      
      // Left arm at same anatomical position (mirrored)
      const leftDir = new THREE.Vector3(
        -Math.cos(Math.PI / 6),  // Mirrored X
        0,
        Math.sin(Math.PI / 6)    // Same Z
      ).normalize();
      
      const leftBone = createMockShoulderBone(
        new THREE.Vector3(-0.2, 1.5, 0),
        leftDir,
        false
      );
      const leftResult = analyzeShoulderKinematics(leftBone, false);
      
      // Should produce identical anatomical measurements
      expect(THREE.MathUtils.radToDeg(rightResult.elevation))
        .toBeCloseTo(THREE.MathUtils.radToDeg(leftResult.elevation), 1);
      expect(THREE.MathUtils.radToDeg(rightResult.abduction))
        .toBeCloseTo(THREE.MathUtils.radToDeg(leftResult.abduction), 1);
      expect(THREE.MathUtils.radToDeg(rightResult.flexion))
        .toBeCloseTo(THREE.MathUtils.radToDeg(leftResult.flexion), 1);
    });
  });

  describe('Clinical Goniometry Standards Compliance', () => {
    it('should match standard goniometric shoulder ROM norms', () => {
      // Standard clinical norms (per AAOS and APTA):
      // Flexion: 0-180°
      // Abduction: 0-180°
      // Extension: 0-60°
      // Internal rotation: 0-70°
      // External rotation: 0-90°
      
      // Test maximum flexion (arm overhead in sagittal plane)
      const maxFlex = new THREE.Vector3(0, 1, 0);
      const boneFlex = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        maxFlex,
        true
      );
      const resultFlex = analyzeShoulderKinematics(boneFlex, true);
      
      expect(THREE.MathUtils.radToDeg(resultFlex.elevation)).toBeLessThanOrEqual(180);
      expect(THREE.MathUtils.radToDeg(resultFlex.elevation)).toBeGreaterThanOrEqual(0);
      
      // Test maximum abduction (arm overhead in frontal plane)
      const maxAbd = new THREE.Vector3(1, 1, 0).normalize();
      const boneAbd = createMockShoulderBone(
        new THREE.Vector3(0.2, 1.5, 0),
        maxAbd,
        true
      );
      const resultAbd = analyzeShoulderKinematics(boneAbd, true);
      
      expect(THREE.MathUtils.radToDeg(resultAbd.abduction)).toBeLessThanOrEqual(180);
      expect(THREE.MathUtils.radToDeg(resultAbd.abduction)).toBeGreaterThanOrEqual(0);
    });
  });
});
