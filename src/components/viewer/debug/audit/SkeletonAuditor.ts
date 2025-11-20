import * as THREE from 'three';
import { SKELETON_MAP } from '../../utils/skeletonMap';
import { getConstraintForBone } from '../../constraints/constraintValidator';

export interface AuditResult {
  boneName: string;
  passed: boolean;
  issues: string[];
  details: {
    boneVector: THREE.Vector3;
    primaryAxis: THREE.Vector3; // The axis that points down the bone (usually Y)
    flexionAxis: THREE.Vector3; // The axis defined as flexion in constraints (usually X)
    alignmentScore: number; // 1.0 = perfect
  };
}

export class SkeletonAuditor {
  private model: THREE.Object3D;
  private bones: Map<string, THREE.Bone> = new Map();

  constructor(model: THREE.Object3D) {
    this.model = model;
    this.indexBones();
  }

  private indexBones() {
    this.model.traverse((object) => {
      if (object instanceof THREE.Bone) {
        this.bones.set(object.name, object);
      }
    });
  }

  public audit(): AuditResult[] {
    const results: AuditResult[] = [];

    // Audit specific chains
    this.auditLimb('LeftArm', 'LeftForeArm', 'LeftHand', results);
    this.auditLimb('RightArm', 'RightForeArm', 'RightHand', results);
    this.auditLimb('LeftUpLeg', 'LeftLeg', 'LeftFoot', results);
    this.auditLimb('RightUpLeg', 'RightLeg', 'RightFoot', results);

    return results;
  }

  private auditLimb(
    upperNameKey: keyof typeof SKELETON_MAP,
    lowerNameKey: keyof typeof SKELETON_MAP,
    endNameKey: keyof typeof SKELETON_MAP,
    results: AuditResult[]
  ) {
    const upperName = SKELETON_MAP[upperNameKey];
    const lowerName = SKELETON_MAP[lowerNameKey];
    const endName = SKELETON_MAP[endNameKey];

    const upperBone = this.bones.get(upperName);
    const lowerBone = this.bones.get(lowerName);
    const endBone = this.bones.get(endName);

    if (!upperBone || !lowerBone) {
      results.push({
        boneName: upperName,
        passed: false,
        issues: [`Missing bones: ${!upperBone ? upperName : ''} ${!lowerBone ? lowerName : ''}`],
        details: {
          boneVector: new THREE.Vector3(),
          primaryAxis: new THREE.Vector3(),
          flexionAxis: new THREE.Vector3(),
          alignmentScore: 0
        }
      });
      return;
    }

    // 1. Check Upper Bone Alignment
    // The vector from Upper to Lower should align with Upper's Y axis (standard rigging)
    const upperResult = this.checkBoneAlignment(upperBone, lowerBone, upperNameKey);
    results.push(upperResult);

    // 2. Check Lower Bone Alignment (if end bone exists)
    if (endBone) {
      const lowerResult = this.checkBoneAlignment(lowerBone, endBone, lowerNameKey);
      results.push(lowerResult);
    }

    // 3. Check Hinge Axis Alignment (for the lower bone, e.g., Elbow/Knee)
    // The constraint says X is flexion. We need to verify what X points to.
    // This is harder without knowing the intended T-pose orientation, but we can report the axis.
  }

  private checkBoneAlignment(
    bone: THREE.Bone,
    childBone: THREE.Bone,
    boneKey: string
  ): AuditResult {
    const issues: string[] = [];

    // Calculate Bone Vector (World Space)
    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    bone.getWorldPosition(startPos);
    childBone.getWorldPosition(endPos);

    const boneVector = new THREE.Vector3().subVectors(endPos, startPos).normalize();

    // Get Local Axes in World Space
    const rotationMatrix = new THREE.Matrix4().extractRotation(bone.matrixWorld);
    const localX = new THREE.Vector3(1, 0, 0).applyMatrix4(rotationMatrix).normalize();
    const localY = new THREE.Vector3(0, 1, 0).applyMatrix4(rotationMatrix).normalize();
    // const localZ = new THREE.Vector3(0, 0, 1).applyMatrix4(rotationMatrix).normalize();

    // Assumption: Y-axis should point down the bone
    const alignmentDot = boneVector.dot(localY);
    const alignmentScore = Math.abs(alignmentDot);

    if (alignmentScore < 0.9) {
      issues.push(`Bone Y-axis does not point to child bone (Dot: ${alignmentDot.toFixed(3)}). Rig may use non-standard orientation (e.g. X-down).`);
    }

    // Check Constraints
    const constraint = getConstraintForBone(bone.name);
    if (constraint) {
      // If it's a hinge joint (1 DOF), check if the rotation axis is perpendicular to the bone
      if (constraint.type === 'hinge' || boneKey.includes('ForeArm') || boneKey.includes('Leg')) {
        // Usually X is the hinge axis.
        // X should be perpendicular to the bone vector (Y).
        const orthogonality = Math.abs(boneVector.dot(localX));
        if (orthogonality > 0.1) {
          issues.push(`Hinge Axis (X) is not perpendicular to Bone Vector (Dot: ${orthogonality.toFixed(3)}). Rotation will cause spiraling.`);
        }
      }
    }

    return {
      boneName: bone.name,
      passed: issues.length === 0,
      issues,
      details: {
        boneVector,
        primaryAxis: localY,
        flexionAxis: localX,
        alignmentScore
      }
    };
  }
}
