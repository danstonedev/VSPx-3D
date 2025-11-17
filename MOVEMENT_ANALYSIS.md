# Movement System Analysis

## Problem Identified

Your movement system has a **fundamental coordinate space mismatch** between:
1. **Movement definitions** (direct Euler angles, amplified 2x)
2. **IK solver output** (world/local rotations)
3. **Constraint validator** (relative-to-rest-pose rotations)

## Evidence from Logs

### IK Solver Behavior (Correct)
```
RightLeg X-axis progression during drag:
-134.5° → -135.1° → -135.7° → -115.1° → -113.1° → -111.9° → -110.7° → -109.5° → -109.1° → -108.6° → -107.4° → -107.0°
```
✅ Smooth, gradual changes = natural motion

### Constraint Validator Behavior (Broken)
```
Every frame:
Pre-constraint:  RightUpLeg z=45.0°
Post-constraint: RightUpLeg z=137.5°
```
❌ Sudden 92.5° jump = coordinate space mismatch

## Root Cause

The constraint validator uses:
```typescript
// getRelativeEuler() computes rotation relative to captured rest pose
const restInverse = restQuat.clone().invert();
const relativeQuat = restInverse.multiply(bone.quaternion.clone());
```

This creates rotations **relative to rest pose**, but IK solver produces rotations in **local space**.

## Movement System Issues

### Current Approach in `movementSystem.ts`:
```typescript
// Lines 234-239: Amplifying rotations by 2x
const euler = new THREE.Euler(
  (transform.rotation.x ?? 0) * 2, // ⚠️ Arbitrary amplification
  (transform.rotation.y ?? 0) * 2,
  (transform.rotation.z ?? 0) * 2,
  'XYZ'
)
```

### Problems:
1. **No constraint validation** - movements can exceed anatomical limits
2. **Arbitrary amplification** - 2x multiplier has no biomechanical basis
3. **Inconsistent with IK** - different coordinate system than IK solver
4. **Bone name mapping** - uses mapped names (e.g., "rightUpperArm") but creates tracks with original names (e.g., "mixamorig1RightArm")

## Movement Definitions Analysis

### Walk Cycle
```typescript
leftUpperLeg: { rotation: { x: 0.3, y: 0, z: 0 } }  // After 2x = 0.6 rad = 34°
rightUpperLeg: { rotation: { x: -0.3, y: 0, z: 0 } } // After 2x = -0.6 rad = -34°
```
**Constraint limits**: Hip flexion/extension typically ±120°
✅ **Status**: Within limits

### Wave Animation
```typescript
rightUpperArm: { rotation: { x: 0, y: 0, z: -1.8 } } // After 2x = -3.6 rad = -206°
```
**Constraint limits**: Shoulder abduction typically 0° to 180°
❌ **Status**: EXCEEDS LIMITS (tries to go to -206°!)

### Sit Animation
```typescript
leftUpperLeg: { rotation: { x: -1.5, y: 0, z: 0 } }  // After 2x = -3.0 rad = -172°
leftLowerLeg: { rotation: { x: 1.5, y: 0, z: 0 } }   // After 2x = 3.0 rad = 172°
```
**Constraint limits**: Knee flexion typically 0° to 140°
❌ **Status**: EXCEEDS LIMITS

## Recommendations

### Immediate Fix: Remove 2x Amplification
```typescript
// Change from:
const euler = new THREE.Euler(
  (transform.rotation.x ?? 0) * 2,
  (transform.rotation.y ?? 0) * 2,
  (transform.rotation.z ?? 0) * 2,
  'XYZ'
)

// To:
const euler = new THREE.Euler(
  transform.rotation.x ?? 0,
  transform.rotation.y ?? 0,
  transform.rotation.z ?? 0,
  'XYZ'
)
```

### Medium-term Fix: Validate Movement Definitions
Add constraint checking to movement definitions:
```typescript
import { JOINT_CONSTRAINTS } from '../constraints/jointConstraints'

// Before creating keyframe track, validate against constraints
const constraint = JOINT_CONSTRAINTS[boneName]
if (constraint && constraint.enabled) {
  euler.x = THREE.MathUtils.clamp(euler.x, constraint.rotationLimits.x[0], constraint.rotationLimits.x[1])
  euler.y = THREE.MathUtils.clamp(euler.y, constraint.rotationLimits.y[0], constraint.rotationLimits.y[1])
  euler.z = THREE.MathUtils.clamp(euler.z, constraint.rotationLimits.z[0], constraint.rotationLimits.z[1])
}
```

### Long-term Fix: Unify Coordinate Systems
Either:
1. **Modify constraint validator** to work in same space as IK solver
2. **Modify IK solver** to output rotations in rest-pose-relative space
3. **Replace constraint validator** with simpler clamping that works in local space

## Next Steps

1. ✅ **Analyze logs** - COMPLETE
2. 🔄 **Remove 2x amplification** - Ready to implement
3. 🔄 **Add constraint validation to movements** - Ready to implement
4. ⏳ **Fix coordinate space mismatch** - Requires deeper refactoring
5. ⏳ **Update movement definitions** - After amplification removed

Would you like me to implement fixes 2 and 3?
