/**
 * Unit tests for angle conversion system
 * Run in browser console or with a test runner
 */

import { describe, it, expect } from 'vitest';
import { relativeToAnatomical, anatomicalToRelative, deg, rad } from './angleConversion';
import * as THREE from 'three';

describe('Angle Conversion', () => {
  const tPoseOffset = { x: deg(57), y: 0, z: 0 };
  const hipTPoseOffset = { x: 0, y: 0, z: deg(-174) };

  it('Shoulder at T-pose', () => {
    const relativeAtTPose = new THREE.Euler(0, 0, 0, 'XYZ'); // At T-pose = 0° relative
    const anatomicalAtTPose = relativeToAnatomical(relativeAtTPose, tPoseOffset);
    expect(rad(anatomicalAtTPose.x)).toBeCloseTo(57, 1);
  });

  it('Arms at sides (anatomical neutral)', () => {
    const relativeAtSides = new THREE.Euler(deg(-57), 0, 0, 'XYZ'); // Moved -57° from T-pose
    const anatomicalAtSides = relativeToAnatomical(relativeAtSides, tPoseOffset);
    expect(rad(anatomicalAtSides.x)).toBeCloseTo(0, 1);
  });

  it('Arms overhead', () => {
    const relativeOverhead = new THREE.Euler(deg(60), 0, 0, 'XYZ'); // Moved +60° from T-pose
    const anatomicalOverhead = relativeToAnatomical(relativeOverhead, tPoseOffset);
    expect(rad(anatomicalOverhead.x)).toBeCloseTo(117, 1);
  });

  it('Round-trip conversion', () => {
    const anatomicalStart = 45; // 45° anatomical
    const relativeConverted = anatomicalToRelative(new THREE.Euler(deg(anatomicalStart), 0, 0, 'XYZ'), tPoseOffset);
    const anatomicalBack = relativeToAnatomical(relativeConverted, tPoseOffset);
    expect(rad(anatomicalBack.x)).toBeCloseTo(anatomicalStart, 1);
  });

  it('Hip T-pose (negative offset)', () => {
    const hipRelativeAtTPose = new THREE.Euler(0, 0, 0, 'XYZ');
    const hipAnatomicalAtTPose = relativeToAnatomical(hipRelativeAtTPose, hipTPoseOffset);
    expect(rad(hipAnatomicalAtTPose.z)).toBeCloseTo(-174, 1);
  });

  it('Hip standing vertical', () => {
    const hipRelativeStanding = new THREE.Euler(0, 0, deg(174), 'XYZ'); // Moved +174° from T-pose
    const hipAnatomicalStanding = relativeToAnatomical(hipRelativeStanding, hipTPoseOffset);
    expect(rad(hipAnatomicalStanding.z)).toBeCloseTo(0, 1);
  });
});

