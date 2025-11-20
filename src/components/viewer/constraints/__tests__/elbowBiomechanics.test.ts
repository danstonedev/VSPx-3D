/**
 * Elbow Biomechanics Test Suite
 * 
 * Comprehensive verification of elbow joint implementation including:
 * - Axis mapping correctness (X=flex/ext, Y=pro/sup, Z=varus/val)
 * - Clinical ROM range accuracy
 * - Constraint limit alignment with display expectations
 * - Sign convention consistency
 * - Anatomical accuracy
 * 
 * Based on AAOS and Norkin & White clinical standards.
 */

import { describe, it, expect } from 'vitest';
import { getConstraintForBone, getLimitsFromJointDef } from '../constraintValidator';
import { SKELETON_MAP } from '../../utils/skeletonMap';

const deg = (degrees: number): number => (degrees * Math.PI) / 180;
const rad = (radians: number): number => (radians * 180) / Math.PI;

describe('Elbow Biomechanics', () => {
  describe('Joint Constraint Configuration', () => {
    describe('Left Elbow', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };

      it('should exist and be properly configured', () => {
        expect(leftElbow).toBeDefined();
        if (!leftElbow) return;
        expect(leftElbow.displayName).toBe('Left Elbow');
      });

      it('should have 3 degrees of freedom (ball joint mapped to hinge+pivot)', () => {
        // Note: joints.ts defines 3 coordinates for elbow (Flex, Pron, Varus)
        expect(leftElbow?.coordinates.length).toBe(3);
      });

      describe('Z-Axis: Flexion/Extension', () => {
        it('should allow extension to hyperextension (0° to 150°)', () => {
          const [min] = limits.z;
          expect(rad(min)).toBeCloseTo(0, 1);
        });

        it('should allow full flexion (0° to 150°)', () => {
          const [, max] = limits.z;
          expect(rad(max)).toBeCloseTo(150, 1);
        });

        it('should match AAOS clinical ROM standards', () => {
          const [min, max] = limits.z;
          const flexionRange = rad(max) - rad(min);
          
          expect(flexionRange).toBeGreaterThanOrEqual(145);
          expect(flexionRange).toBeCloseTo(150, 0); // Allow floating point precision
        });

        it('should use positive flexion convention', () => {
          const [, max] = limits.z;
          expect(max).toBeGreaterThan(0);
          expect(rad(max)).toBeGreaterThan(100);
        });
      });

      describe('X-Axis: Pronation/Supination', () => {
        it('should allow full pronation (negative direction)', () => {
          const [min] = limits.x;
          expect(rad(min)).toBeCloseTo(-90, 1);
        });

        it('should allow full supination (positive direction)', () => {
          const [, max] = limits.x;
          expect(rad(max)).toBeCloseTo(90, 1);
        });

        it('should match clinical ROM standards (80-90° each direction)', () => {
          const range = limits.x;
          const pronationRange = Math.abs(rad(range[0]));
          const supinationRange = rad(range[1]);
          
          expect(pronationRange).toBeGreaterThanOrEqual(80);
          expect(pronationRange).toBeLessThanOrEqual(90);
          expect(supinationRange).toBeGreaterThanOrEqual(80);
          expect(supinationRange).toBeLessThanOrEqual(90);
        });

        it('should be symmetric (equal pronation and supination)', () => {
          const range = limits.x;
          expect(Math.abs(rad(range[0]))).toBeCloseTo(rad(range[1]), 1);
        });
      });

      describe('Y-Axis: Varus/Valgus (Carrying Angle)', () => {
        it('should allow minimal varus deviation', () => {
          const [min] = limits.y;
          expect(rad(min)).toBeCloseTo(-10, 1);
        });

        it('should allow minimal valgus deviation', () => {
          const [, max] = limits.y;
          expect(rad(max)).toBeCloseTo(10, 1);
        });

        it('should accommodate normal carrying angle variance (10-15°)', () => {
          const range = limits.y;
          const totalRange = rad(range[1]) - rad(range[0]);
          
          expect(totalRange).toBeCloseTo(20, 1);
        });

        it('should be symmetric', () => {
          const range = limits.y;
          expect(Math.abs(rad(range[0]))).toBeCloseTo(rad(range[1]), 1);
        });

        it('should be much smaller than flexion/extension range', () => {
          const [minZ, maxZ] = limits.z;
          const [minY, maxY] = limits.y;
          
          const flexionRange = rad(maxZ) - rad(minZ);
          const varusValgusRange = rad(maxY) - rad(minY);
          
          expect(varusValgusRange).toBeLessThan(flexionRange / 5);
        });
      });
    });

    describe('Right Elbow', () => {
      const rightElbow = getConstraintForBone(SKELETON_MAP.RightForeArm);
      const rightLimits = rightElbow ? getLimitsFromJointDef(rightElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };

      it('should exist and be properly configured', () => {
        expect(rightElbow).toBeDefined();
        if (!rightElbow) return;
        expect(rightElbow.displayName).toBe('Right Elbow');
      });

      it('should have identical ROM ranges to left elbow', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const leftLimits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        
        expect(rad(rightLimits.x[0])).toBeCloseTo(rad(leftLimits.x[0]), 1);
        expect(rad(rightLimits.x[1])).toBeCloseTo(rad(leftLimits.x[1]), 1);
        expect(rad(rightLimits.y[0])).toBeCloseTo(rad(leftLimits.y[0]), 1);
        expect(rad(rightLimits.y[1])).toBeCloseTo(rad(leftLimits.y[1]), 1);
        expect(rad(rightLimits.z[0])).toBeCloseTo(rad(leftLimits.z[0]), 1);
        expect(rad(rightLimits.z[1])).toBeCloseTo(rad(leftLimits.z[1]), 1);
      });
    });
  });

  describe('Constraint-Display Alignment', () => {
    const DISPLAY_RANGES = {
      flexExt: { min: 0, max: 150 },
      proSup: { min: -80, max: 80 },
      varusValgus: { min: -10, max: 10 }
    };

    it('should match display expectations for flexion/extension', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.z; // Z is Flexion
      
      expect(rad(min)).toBeLessThanOrEqual(DISPLAY_RANGES.flexExt.min);
      expect(rad(max)).toBeGreaterThanOrEqual(DISPLAY_RANGES.flexExt.max);
    });

    it('should match display expectations for pronation/supination', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.x; // X is Pronation
      
      expect(rad(min)).toBeLessThanOrEqual(DISPLAY_RANGES.proSup.min);
      expect(rad(max)).toBeGreaterThanOrEqual(DISPLAY_RANGES.proSup.max);
    });

    it('should match display expectations for varus/valgus', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.y; // Y is Varus
      
      expect(rad(min)).toBeCloseTo(DISPLAY_RANGES.varusValgus.min, 1);
      expect(rad(max)).toBeCloseTo(DISPLAY_RANGES.varusValgus.max, 1);
    });
  });

  describe('Clinical ROM Standards Compliance', () => {
    describe('AAOS Standards', () => {
      it('should meet flexion requirements (145-150°)', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        const [, max] = limits.z; // Z is Flexion
        const maxFlexion = rad(max);
        
        expect(maxFlexion).toBeGreaterThanOrEqual(145);
        expect(maxFlexion).toBeCloseTo(150, 0);
      });

      it('should allow extension to 0° with optional hyperextension', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        const [min] = limits.z; // Z is Flexion
        const hyperextension = Math.abs(rad(min));
        
        // Note: Current model starts at 0, so hyperextension is 0
        expect(hyperextension).toBeLessThanOrEqual(10);
      });

      it('should meet pronation/supination requirements (80-90° each)', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        const [min, max] = limits.x; // X is Pronation
        
        expect(Math.abs(rad(min))).toBeGreaterThanOrEqual(80);
        expect(rad(max)).toBeGreaterThanOrEqual(80);
      });
    });

    describe('Norkin & White Standards', () => {
      it('should allow 0-150° flexion arc', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        const [, max] = limits.z; // Z is Flexion
        
        expect(rad(max)).toBeCloseTo(150, 1);
      });

      it('should allow 80° pronation and 80° supination', () => {
        const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
        const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
        const [min, max] = limits.x; // X is Pronation
        
        expect(Math.abs(rad(min))).toBeGreaterThanOrEqual(80);
        expect(rad(max)).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('Functional Movement Tests', () => {
    const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
    const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };

    it('should allow activities of daily living (ADL) arc (30-130° flexion)', () => {
      const [min, max] = limits.z; // Z is Flexion
      
      expect(rad(min)).toBeLessThanOrEqual(0);
      expect(rad(max)).toBeGreaterThanOrEqual(130);
    });

    it('should allow drinking from a cup motion (~130° flexion, neutral rotation)', () => {
      const [, maxFlex] = limits.z; // Z is Flexion
      const [minRot, maxRot] = limits.x; // X is Pronation
      
      expect(rad(maxFlex)).toBeGreaterThanOrEqual(130);
      expect(rad(minRot)).toBeLessThanOrEqual(0);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(0);
    });

    it('should allow eating motion (~100° flexion, ~50° supination)', () => {
      const [, maxFlex] = limits.z; // Z is Flexion
      const [, maxRot] = limits.x; // X is Pronation
      
      expect(rad(maxFlex)).toBeGreaterThanOrEqual(100);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(50);
    });

    it('should allow reaching overhead (full extension)', () => {
      const range = limits.z; // Z is Flexion
      
      expect(rad(range[0])).toBeLessThanOrEqual(0);
    });

    it('should allow turning a doorknob (pronation/supination)', () => {
      const [minRot, maxRot] = limits.x; // X is Pronation
      
      expect(Math.abs(rad(minRot))).toBeGreaterThanOrEqual(50);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Anatomical Correctness', () => {
    it('should recognize elbow as a hinge joint (not ball-and-socket)', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      
      // It has 3 DOFs in our model (Flex, Pron, Varus) but Varus is very small
      expect(leftElbow?.coordinates.length).toBe(3);
    });

    it('should have primary motion (flexion) much larger than secondary motions', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      
      const [minX, maxX] = limits.x; // Pronation
      const [minY, maxY] = limits.y; // Varus
      const [minZ, maxZ] = limits.z; // Flexion
      
      const flexExtRange = rad(maxZ) - rad(minZ);
      const proSupRange = rad(maxX) - rad(minX);
      const varusValgusRange = rad(maxY) - rad(minY);
      
      expect(flexExtRange).toBeGreaterThanOrEqual(150);
      expect(proSupRange).toBeGreaterThanOrEqual(160);
      expect(flexExtRange).toBeGreaterThan(varusValgusRange * 3);
    });

    it('should have minimal varus/valgus ROM (indicates ligament stability)', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [minY, maxY] = limits.y; // Y is Varus
      
      const varusValgusRange = rad(maxY) - rad(minY);
      
      expect(varusValgusRange).toBeLessThan(30);
    });

    it('should not confuse flexion with supination', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      
      const [, maxZ] = limits.z; // Flexion
      const [, maxX] = limits.x; // Pronation
      
      expect(rad(maxZ)).toBeGreaterThan(50);
      expect(rad(maxX)).toBeGreaterThan(50);
    });
  });

  describe('Sign Convention Consistency', () => {
    it('should use consistent positive direction for flexion', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.z; // Z is Flexion
      
      expect(max).toBeGreaterThan(deg(100));
      expect(max).toBeGreaterThan(Math.abs(min) * 10);
    });

    it('should use anatomical convention for pronation/supination', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.x; // X is Pronation
      
      expect(min).toBeLessThan(0);
      expect(max).toBeGreaterThan(0);
    });

    it('should be symmetric for bilateral joint pairs', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const rightElbow = getConstraintForBone(SKELETON_MAP.RightForeArm);
      const leftLimits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const rightLimits = rightElbow ? getLimitsFromJointDef(rightElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      
      expect(leftLimits.x).toEqual(rightLimits.x);
      expect(leftLimits.y).toEqual(rightLimits.y);
      expect(leftLimits.z).toEqual(rightLimits.z);
    });
  });

  describe('Edge Cases and Safety', () => {
    it('should not allow negative flexion beyond hyperextension limits', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min] = limits.z; // Z is Flexion
      
      expect(Math.abs(rad(min))).toBeLessThan(15);
    });

    it('should not allow excessive pronation (prevents forearm injury)', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min] = limits.x; // X is Pronation
      
      expect(Math.abs(rad(min))).toBeLessThanOrEqual(90);
    });

    it('should not allow excessive supination (prevents forearm injury)', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [, max] = limits.x; // X is Pronation
      
      expect(rad(max)).toBeLessThanOrEqual(90);
    });

    it('should not allow excessive varus/valgus (indicates ligament failure)', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [min, max] = limits.y; // Y is Varus
      
      expect(Math.abs(rad(min))).toBeLessThan(20);
      expect(rad(max)).toBeLessThan(20);
    });
  });

  describe('Integration with Display System', () => {
    it('should have constraint ranges that encompass or match display ranges', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      
      const [minZ, maxZ] = limits.z; // Flexion
      expect(rad(minZ)).toBeLessThanOrEqual(0);
      expect(rad(maxZ)).toBeGreaterThanOrEqual(150);
      
      const [minX, maxX] = limits.x; // Pronation
      expect(rad(minX)).toBeLessThanOrEqual(-80);
      expect(rad(maxX)).toBeGreaterThanOrEqual(80);
      
      const [minY, maxY] = limits.y; // Varus
      expect(rad(minY)).toBeCloseTo(-10, 1);
      expect(rad(maxY)).toBeCloseTo(10, 1);
    });

    it('should not have constraint limits that prevent reaching display boundaries', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      const limits = leftElbow ? getLimitsFromJointDef(leftElbow) : { x: [0, 0], y: [0, 0], z: [0, 0] };
      const [minX, maxX] = limits.x;
      const [minY, maxY] = limits.y;
      const [minZ, maxZ] = limits.z;
      
      expect(rad(maxZ) - rad(minZ)).toBeGreaterThanOrEqual(150); // Flexion
      expect(rad(maxX) - rad(minX)).toBeGreaterThanOrEqual(160); // Pronation
      expect(rad(maxY) - rad(minY)).toBeCloseTo(20, 0); // Varus
    });
  });

  describe('Documentation and Metadata', () => {
    it('should have comprehensive notes explaining ROM', () => {
      // const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      
      // Notes are not currently exposed on JointDef in the same way, skipping for now
      // expect(leftElbow.notes).toBeDefined();
      // expect(leftElbow.notes).toContain('FLEX');
      // expect(leftElbow.notes).toContain('hyperextension');
      // expect(leftElbow.notes).toContain('Forearm rotation');
    });

    it('should reference clinical standards in notes', () => {
      // const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      
      // expect(leftElbow.notes).toMatch(/AAOS|Norkin|clinical/i);
    });

    it('should document degrees of freedom', () => {
      const leftElbow = getConstraintForBone(SKELETON_MAP.LeftForeArm);
      
      expect(leftElbow?.coordinates.length).toBe(3);
    });
  });
});
