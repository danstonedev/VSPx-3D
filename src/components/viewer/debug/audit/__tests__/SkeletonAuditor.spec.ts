import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SkeletonAuditor } from '../SkeletonAuditor';
import { SKELETON_MAP } from '../../../utils/skeletonMap';

describe('SkeletonAuditor', () => {
  it('should pass for a perfectly aligned Y-down bone', () => {
    const root = new THREE.Group();

    // Create bones
    const shoulder = new THREE.Bone();
    shoulder.name = SKELETON_MAP.LeftArm;

    const elbow = new THREE.Bone();
    elbow.name = SKELETON_MAP.LeftForeArm;

    const wrist = new THREE.Bone();
    wrist.name = SKELETON_MAP.LeftHand;

    // Build hierarchy
    root.add(shoulder);
    shoulder.add(elbow);
    elbow.add(wrist);

    // Position bones (Standard T-Pose: Left Arm along +X)
    // Shoulder at 0,0,0
    shoulder.position.set(0, 0, 0);

    // Elbow at 10,0,0 (Child of Shoulder)
    // For Shoulder Y to point to Elbow (+X), Shoulder must be rotated -90 deg around Z.
    // Initial Y is (0,1,0). Rotate -90 Z -> (1,0,0).
    shoulder.rotation.set(0, 0, -Math.PI / 2);
    elbow.position.set(0, 10, 0); // Local position relative to rotated parent!
    // Wait, if Parent is rotated, Local (0,10,0) is World (10,0,0).
    // So Elbow is at World (10,0,0).

    // Wrist at 20,0,0 (Child of Elbow)
    // Elbow needs to point to Wrist.
    // Elbow is at World (10,0,0). Wrist is at World (20,0,0).
    // Vector is (1,0,0).
    // Elbow needs to be rotated so its Y points +X (World).
    // Since Elbow inherits Shoulder's rotation (-90 Z), its default Y is already +X.
    // So Elbow rotation can be 0.
    elbow.position.set(0, 10, 0); // Relative to Shoulder Y-axis (which is World X)
    wrist.position.set(0, 10, 0); // Relative to Elbow Y-axis (which is World X)

    // Update matrices
    root.updateMatrixWorld(true);

    const auditor = new SkeletonAuditor(root);
    const results = auditor.audit();

    const shoulderResult = results.find(r => r.boneName === SKELETON_MAP.LeftArm);
    const elbowResult = results.find(r => r.boneName === SKELETON_MAP.LeftForeArm);

    expect(shoulderResult).toBeDefined();
    expect(shoulderResult?.passed).toBe(true);

    expect(elbowResult).toBeDefined();
    expect(elbowResult?.passed).toBe(true);
  });

  it('should fail if bone axis is misaligned', () => {
    const root = new THREE.Group();
    const shoulder = new THREE.Bone();
    shoulder.name = SKELETON_MAP.LeftArm;
    const elbow = new THREE.Bone();
    elbow.name = SKELETON_MAP.LeftForeArm;

    root.add(shoulder);
    shoulder.add(elbow);

    // Shoulder at 0,0,0. No rotation (Y is Up).
    // Elbow at 10,0,0 (World X).
    // Bone Vector is (1,0,0).
    // Bone Axis is (0,1,0).
    // Dot product is 0. Fail.
    shoulder.position.set(0, 0, 0);
    elbow.position.set(10, 0, 0);

    root.updateMatrixWorld(true);

    const auditor = new SkeletonAuditor(root);
    const results = auditor.audit();
    const shoulderResult = results.find(r => r.boneName === SKELETON_MAP.LeftArm);

    expect(shoulderResult?.passed).toBe(false);
    expect(shoulderResult?.issues[0]).toContain('Bone Y-axis does not point to child');
  });

  it('should fail if hinge axis (X) is aligned with bone vector', () => {
    // Case: Bone is X-down (X points to child).
    // This means X is the bone axis.
    // But constraints say X is the rotation axis.
    // Rotating around the bone axis is twisting, not flexing.

    const root = new THREE.Group();
    const shoulder = new THREE.Bone();
    shoulder.name = SKELETON_MAP.LeftArm;
    const elbow = new THREE.Bone();
    elbow.name = SKELETON_MAP.LeftForeArm; // Hinge joint
    const wrist = new THREE.Bone();
    wrist.name = SKELETON_MAP.LeftHand;

    root.add(shoulder);
    shoulder.add(elbow);
    elbow.add(wrist);

    // Shoulder at 0. Elbow at 0 (relative to shoulder? No, need position).
    shoulder.position.set(0, 0, 0);
    elbow.position.set(0, 10, 0); // Shoulder Y points to Elbow

    // Elbow at 0,10,0 (World).
    // Wrist at 10,10,0 (World).
    // So Elbow->Wrist vector is (1,0,0) [World X].

    // Elbow rotation is 0.
    // Elbow Local X is (1,0,0).
    // Elbow Local Y is (0,1,0).

    // Bone Vector (Elbow->Wrist) is (1,0,0).
    // Local X is (1,0,0).
    // Dot product is 1.
    // This implies X is the bone axis.
    // But X is also the rotation axis (Constraint).
    // So rotation = twist.
    // Should fail "Hinge Axis (X) is not perpendicular".

    wrist.position.set(10, 0, 0); // Relative to Elbow.
    // If Elbow is at (0,10,0) World, and Wrist is at (10,0,0) Local...
    // Wrist World = Elbow World + (10,0,0) = (10,10,0).
    // Correct.

    root.updateMatrixWorld(true);

    const auditor = new SkeletonAuditor(root);
    const results = auditor.audit();
    const elbowResult = results.find(r => r.boneName === SKELETON_MAP.LeftForeArm);

    expect(elbowResult).toBeDefined();
    expect(elbowResult?.issues.some(i => i.includes('Hinge Axis (X) is not perpendicular'))).toBe(true);
  });
});
