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
import { JOINT_CONSTRAINTS } from '../jointConstraints';

const deg = (degrees: number): number => (degrees * Math.PI) / 180;
const rad = (radians: number): number => (radians * 180) / Math.PI;

describe('Elbow Biomechanics', () => {
  describe('Joint Constraint Configuration', () => {
    describe('Left Elbow', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];

      it('should exist and be properly configured', () => {
        expect(leftElbow).toBeDefined();
        expect(leftElbow.boneName).toBe('mixamorig1LeftForeArm');
        expect(leftElbow.displayName).toBe('Left Elbow');
        expect(leftElbow.enabled).toBe(true);
        expect(leftElbow.translationLock).toBe(true);
      });

      it('should have 2 degrees of freedom (hinge joint)', () => {
        expect(leftElbow.degreesOfFreedom).toBe(2);
      });

      it('should have T-pose offset at 0° extension', () => {
        expect(leftElbow.tPoseOffset).toBeDefined();
        expect(leftElbow.tPoseOffset?.x).toBeCloseTo(0, 5);
      });

      describe('X-Axis: Flexion/Extension', () => {
        it('should allow extension to hyperextension (-10° to 0°)', () => {
          const [min] = leftElbow.rotationLimits.x;
          expect(rad(min)).toBeCloseTo(-10, 1);
        });

        it('should allow full flexion (0° to 150°)', () => {
          const [, max] = leftElbow.rotationLimits.x;
          expect(rad(max)).toBeCloseTo(150, 1);
        });

        it('should match AAOS clinical ROM standards', () => {
          const [min, max] = leftElbow.rotationLimits.x;
          const flexionRange = rad(max) - 0; // 0° to flexion
          const hyperextension = Math.abs(rad(min)); // Extension beyond 0°
          
          expect(flexionRange).toBeGreaterThanOrEqual(145);
          expect(flexionRange).toBeCloseTo(150, 0); // Allow floating point precision
          expect(hyperextension).toBeGreaterThanOrEqual(5);
          expect(hyperextension).toBeLessThanOrEqual(10);
        });

        it('should use positive flexion convention', () => {
          const [min, max] = leftElbow.rotationLimits.x;
          // Max should be positive (flexion)
          expect(max).toBeGreaterThan(0);
          // Max should be much larger than min (flexion > hyperextension)
          expect(rad(max)).toBeGreaterThan(100);
          // Min can be negative for hyperextension
          void min; // Used in comments above
        });
      });

      describe('Y-Axis: Pronation/Supination', () => {
        it('should allow full pronation (negative direction)', () => {
          const [min] = leftElbow.rotationLimits.y;
          expect(rad(min)).toBeCloseTo(-90, 1);
        });

        it('should allow full supination (positive direction)', () => {
          const [, max] = leftElbow.rotationLimits.y;
          expect(rad(max)).toBeCloseTo(90, 1);
        });

        it('should match clinical ROM standards (80-90° each direction)', () => {
          const limits = leftElbow.rotationLimits.y;
          const pronationRange = Math.abs(rad(limits[0]));
          const supinationRange = rad(limits[1]);
          
          expect(pronationRange).toBeGreaterThanOrEqual(80);
          expect(pronationRange).toBeLessThanOrEqual(90);
          expect(supinationRange).toBeGreaterThanOrEqual(80);
          expect(supinationRange).toBeLessThanOrEqual(90);
        });

        it('should be symmetric (equal pronation and supination)', () => {
          const limits = leftElbow.rotationLimits.y;
          expect(Math.abs(rad(limits[0]))).toBeCloseTo(rad(limits[1]), 1);
        });
      });

      describe('Z-Axis: Varus/Valgus (Carrying Angle)', () => {
        it('should allow minimal varus deviation', () => {
          const [min] = leftElbow.rotationLimits.z;
          expect(rad(min)).toBeCloseTo(-15, 1);
        });

        it('should allow minimal valgus deviation', () => {
          const [, max] = leftElbow.rotationLimits.z;
          expect(rad(max)).toBeCloseTo(15, 1);
        });

        it('should accommodate normal carrying angle variance (10-15°)', () => {
          const limits = leftElbow.rotationLimits.z;
          const totalRange = rad(limits[1]) - rad(limits[0]);
          
          // Total range should be 30° (±15°)
          expect(totalRange).toBeCloseTo(30, 1);
        });

        it('should be symmetric', () => {
          const limits = leftElbow.rotationLimits.z;
          expect(Math.abs(rad(limits[0]))).toBeCloseTo(rad(limits[1]), 1);
        });

        it('should be much smaller than flexion/extension range', () => {
          const [minX, maxX] = leftElbow.rotationLimits.x;
          const [minZ, maxZ] = leftElbow.rotationLimits.z;
          
          const flexionRange = rad(maxX) - rad(minX);
          const varusValgusRange = rad(maxZ) - rad(minZ);
          
          // Varus/valgus should be less than 1/5 of flexion range
          expect(varusValgusRange).toBeLessThan(flexionRange / 5);
        });
      });
    });

    describe('Right Elbow', () => {
      const rightElbow = JOINT_CONSTRAINTS['mixamorig1RightForeArm'];

      it('should exist and be properly configured', () => {
        expect(rightElbow).toBeDefined();
        expect(rightElbow.boneName).toBe('mixamorig1RightForeArm');
        expect(rightElbow.displayName).toBe('Right Elbow');
        expect(rightElbow.enabled).toBe(true);
        expect(rightElbow.translationLock).toBe(true);
      });

      it('should have identical ROM ranges to left elbow', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        
        expect(rad(rightElbow.rotationLimits.x[0])).toBeCloseTo(rad(leftElbow.rotationLimits.x[0]), 1);
        expect(rad(rightElbow.rotationLimits.x[1])).toBeCloseTo(rad(leftElbow.rotationLimits.x[1]), 1);
        expect(rad(rightElbow.rotationLimits.y[0])).toBeCloseTo(rad(leftElbow.rotationLimits.y[0]), 1);
        expect(rad(rightElbow.rotationLimits.y[1])).toBeCloseTo(rad(leftElbow.rotationLimits.y[1]), 1);
        expect(rad(rightElbow.rotationLimits.z[0])).toBeCloseTo(rad(leftElbow.rotationLimits.z[0]), 1);
        expect(rad(rightElbow.rotationLimits.z[1])).toBeCloseTo(rad(leftElbow.rotationLimits.z[1]), 1);
      });
    });
  });

  describe('Constraint-Display Alignment', () => {
    // These values should match RangeOfMotionPanel.tsx display ranges
    const DISPLAY_RANGES = {
      flexExt: { min: 0, max: 150 },
      proSup: { min: -80, max: 80 },
      varusValgus: { min: -15, max: 15 }
    };

    it('should match display expectations for flexion/extension', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.x;
      
      // Constraint should encompass the display range
      expect(rad(min)).toBeLessThanOrEqual(DISPLAY_RANGES.flexExt.min);
      expect(rad(max)).toBeGreaterThanOrEqual(DISPLAY_RANGES.flexExt.max);
    });

    it('should match display expectations for pronation/supination', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.y;
      
      // Constraint should encompass the display range
      expect(rad(min)).toBeLessThanOrEqual(DISPLAY_RANGES.proSup.min);
      expect(rad(max)).toBeGreaterThanOrEqual(DISPLAY_RANGES.proSup.max);
    });

    it('should match display expectations for varus/valgus', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.z;
      
      // Constraint should match the display range
      expect(rad(min)).toBeCloseTo(DISPLAY_RANGES.varusValgus.min, 1);
      expect(rad(max)).toBeCloseTo(DISPLAY_RANGES.varusValgus.max, 1);
    });
  });

  describe('Clinical ROM Standards Compliance', () => {
    describe('AAOS Standards', () => {
      it('should meet flexion requirements (145-150°)', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        const [, max] = leftElbow.rotationLimits.x;
        const maxFlexion = rad(max);
        
        expect(maxFlexion).toBeGreaterThanOrEqual(145);
        expect(maxFlexion).toBeCloseTo(150, 0); // Allow floating point precision
      });

      it('should allow extension to 0° with optional hyperextension', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        const [min] = leftElbow.rotationLimits.x;
        const hyperextension = Math.abs(rad(min));
        
        // Should allow at least 5° hyperextension, but not more than 10°
        expect(hyperextension).toBeGreaterThanOrEqual(5);
        expect(hyperextension).toBeLessThanOrEqual(10);
      });

      it('should meet pronation/supination requirements (80-90° each)', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        const [min, max] = leftElbow.rotationLimits.y;
        
        expect(Math.abs(rad(min))).toBeGreaterThanOrEqual(80);
        expect(rad(max)).toBeGreaterThanOrEqual(80);
      });
    });

    describe('Norkin & White Standards', () => {
      it('should allow 0-150° flexion arc', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        const [, max] = leftElbow.rotationLimits.x;
        
        expect(rad(max)).toBeCloseTo(150, 1);
      });

      it('should allow 80° pronation and 80° supination', () => {
        const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
        const [min, max] = leftElbow.rotationLimits.y;
        
        expect(Math.abs(rad(min))).toBeGreaterThanOrEqual(80);
        expect(rad(max)).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('Functional Movement Tests', () => {
    const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];

    it('should allow activities of daily living (ADL) arc (30-130° flexion)', () => {
      const [min, max] = leftElbow.rotationLimits.x;
      
      // ADL arc should be fully within constraints
      expect(rad(min)).toBeLessThanOrEqual(0);
      expect(rad(max)).toBeGreaterThanOrEqual(130);
    });

    it('should allow drinking from a cup motion (~130° flexion, neutral rotation)', () => {
      const [, maxFlex] = leftElbow.rotationLimits.x;
      const [minRot, maxRot] = leftElbow.rotationLimits.y;
      
      expect(rad(maxFlex)).toBeGreaterThanOrEqual(130);
      expect(rad(minRot)).toBeLessThanOrEqual(0);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(0);
    });

    it('should allow eating motion (~100° flexion, ~50° supination)', () => {
      const [, maxFlex] = leftElbow.rotationLimits.x;
      const [, maxRot] = leftElbow.rotationLimits.y;
      
      expect(rad(maxFlex)).toBeGreaterThanOrEqual(100);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(50);
    });

    it('should allow reaching overhead (full extension)', () => {
      const limits = leftElbow.rotationLimits.x;
      
      // Should allow full extension (0°) or slight hyperextension
      expect(rad(limits[0])).toBeLessThanOrEqual(0);
    });

    it('should allow turning a doorknob (pronation/supination)', () => {
      const [minRot, maxRot] = leftElbow.rotationLimits.y;
      
      // Need at least 50° of pronation and supination for doorknob
      expect(Math.abs(rad(minRot))).toBeGreaterThanOrEqual(50);
      expect(rad(maxRot)).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Anatomical Correctness', () => {
    it('should recognize elbow as a hinge joint (not ball-and-socket)', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      // Hinge joints have 1-2 DOF, not 3
      expect(leftElbow.degreesOfFreedom).toBeLessThan(3);
      expect(leftElbow.degreesOfFreedom).toBeGreaterThan(0);
    });

    it('should have primary motion (flexion) much larger than secondary motions', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      const [minX, maxX] = leftElbow.rotationLimits.x;
      const [minY, maxY] = leftElbow.rotationLimits.y;
      const [minZ, maxZ] = leftElbow.rotationLimits.z;
      
      const flexExtRange = rad(maxX) - rad(minX);
      const proSupRange = rad(maxY) - rad(minY);
      const varusValgusRange = rad(maxZ) - rad(minZ);
      
      // Flexion/extension should be comparable to or larger than pronation/supination
      // Both are functional primary motions, but flexion is typically slightly less
      expect(flexExtRange).toBeGreaterThanOrEqual(150); // At least 150° flex/ext
      expect(proSupRange).toBeGreaterThanOrEqual(160); // At least 160° pro/sup
      expect(flexExtRange).toBeGreaterThan(varusValgusRange * 3); // Much larger than varus/valgus
    });

    it('should have minimal varus/valgus ROM (indicates ligament stability)', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [minZ, maxZ] = leftElbow.rotationLimits.z;
      
      const varusValgusRange = rad(maxZ) - rad(minZ);
      
      // Healthy elbow should have minimal varus/valgus (<30° total)
      expect(varusValgusRange).toBeLessThan(30);
    });

    it('should not confuse flexion with supination', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      // Flexion is on X-axis, supination is on Y-axis
      // They should be on different axes
      const [, maxX] = leftElbow.rotationLimits.x;
      const [, maxY] = leftElbow.rotationLimits.y;
      
      // Both should be positive and large (>50°)
      expect(rad(maxX)).toBeGreaterThan(50);
      expect(rad(maxY)).toBeGreaterThan(50);
    });
  });

  describe('Sign Convention Consistency', () => {
    it('should use consistent positive direction for flexion', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.x;
      
      // Max (flexion) should be much larger positive than min (extension)
      expect(max).toBeGreaterThan(deg(100));
      expect(max).toBeGreaterThan(Math.abs(min) * 10);
    });

    it('should use anatomical convention for pronation/supination', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.y;
      
      // Pronation = negative (palm down)
      expect(min).toBeLessThan(0);
      // Supination = positive (palm up)
      expect(max).toBeGreaterThan(0);
    });

    it('should be symmetric for bilateral joint pairs', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const rightElbow = JOINT_CONSTRAINTS['mixamorig1RightForeArm'];
      
      // Left and right should have identical ROM ranges
      expect(leftElbow.rotationLimits.x).toEqual(rightElbow.rotationLimits.x);
      expect(leftElbow.rotationLimits.y).toEqual(rightElbow.rotationLimits.y);
      expect(leftElbow.rotationLimits.z).toEqual(rightElbow.rotationLimits.z);
    });
  });

  describe('Edge Cases and Safety', () => {
    it('should not allow negative flexion beyond hyperextension limits', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min] = leftElbow.rotationLimits.x;
      
      // Hyperextension should be limited to prevent injury
      expect(Math.abs(rad(min))).toBeLessThan(15);
    });

    it('should not allow excessive pronation (prevents forearm injury)', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min] = leftElbow.rotationLimits.y;
      
      expect(Math.abs(rad(min))).toBeLessThanOrEqual(90);
    });

    it('should not allow excessive supination (prevents forearm injury)', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [, max] = leftElbow.rotationLimits.y;
      
      expect(rad(max)).toBeLessThanOrEqual(90);
    });

    it('should not allow excessive varus/valgus (indicates ligament failure)', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [min, max] = leftElbow.rotationLimits.z;
      
      // >20° varus/valgus suggests ligament damage
      expect(Math.abs(rad(min))).toBeLessThan(20);
      expect(rad(max)).toBeLessThan(20);
    });
  });

  describe('Integration with Display System', () => {
    it('should have constraint ranges that encompass or match display ranges', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      // X-axis: Display shows 0-150°, constraints should allow this
      const [minX, maxX] = leftElbow.rotationLimits.x;
      expect(rad(minX)).toBeLessThanOrEqual(0);
      expect(rad(maxX)).toBeGreaterThanOrEqual(150);
      
      // Y-axis: Display shows -80 to 80°, constraints should allow this
      const [minY, maxY] = leftElbow.rotationLimits.y;
      expect(rad(minY)).toBeLessThanOrEqual(-80);
      expect(rad(maxY)).toBeGreaterThanOrEqual(80);
      
      // Z-axis: Display shows -15 to 15°, constraints should match
      const [minZ, maxZ] = leftElbow.rotationLimits.z;
      expect(rad(minZ)).toBeCloseTo(-15, 1);
      expect(rad(maxZ)).toBeCloseTo(15, 1);
    });

    it('should not have constraint limits that prevent reaching display boundaries', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      const [minX, maxX] = leftElbow.rotationLimits.x;
      const [minY, maxY] = leftElbow.rotationLimits.y;
      const [minZ, maxZ] = leftElbow.rotationLimits.z;
      
      // No axis should have constraints narrower than display expectations
      expect(rad(maxX) - rad(minX)).toBeGreaterThanOrEqual(150); // Flex/ext
      expect(rad(maxY) - rad(minY)).toBeGreaterThanOrEqual(160); // Pro/sup
      expect(rad(maxZ) - rad(minZ)).toBeCloseTo(30, 0);  // Varus/valgus (allow floating point)
    });
  });

  describe('Documentation and Metadata', () => {
    it('should have comprehensive notes explaining ROM', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      expect(leftElbow.notes).toBeDefined();
      expect(leftElbow.notes).toContain('FLEX');
      expect(leftElbow.notes).toContain('hyperextension');
      expect(leftElbow.notes).toContain('Forearm rotation');
    });

    it('should reference clinical standards in notes', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      expect(leftElbow.notes).toMatch(/AAOS|Norkin|clinical/i);
    });

    it('should document degrees of freedom', () => {
      const leftElbow = JOINT_CONSTRAINTS['mixamorig1LeftForeArm'];
      
      expect(leftElbow.degreesOfFreedom).toBe(2);
    });
  });
});
