# Angle Conversion System - Technical Specification

**Version:** 2.0 (Refactored)  
**Date:** November 17, 2025

---

## Overview

The ROM measurement system uses three coordinate reference frames to accurately represent joint angles. This document provides the mathematical foundation and implementation details.

---

## Reference Frames

### 1. T-Pose Space (Model Bind Pose)
- **Definition:** The model's initial bind pose as stored in the GLB file
- **Characteristics:**
  - Arms abducted ~55-57° (spread out to sides)
  - Legs rotated ~-171° to -174° on Z-axis
  - This is the "zero point" captured in `constraintReferencePose`
- **Use case:** Internal skeletal calculations, quaternion references

### 2. Relative Space
- **Definition:** Rotation FROM T-pose
- **Zero point:** T-pose itself (0° = at T-pose)
- **Calculation:** `relativeQuat = tPoseInverse * currentQuat`
- **Use case:** Measuring how far bones have moved from bind pose
- **Example:** Arms lowered to sides = -57° X-axis (moved 57° from T-pose)

### 3. Anatomical Space (Clinical Reference)
- **Definition:** Standard anatomical neutral position
- **Zero point:** Anatomical neutral (0° = arms at sides, legs vertical, facing forward)
- **Use case:** Display to clinicians, PT documentation, ROM reporting
- **Example:** Arms at sides = 0° abduction, T-pose = 57° abduction

---

## Mathematical Transformations

### Core Formula

```typescript
anatomicalAngle = tPoseOffset + relativeAngle
```

Where:
- `tPoseOffset` = Where T-pose sits in anatomical space
- `relativeAngle` = Rotation FROM T-pose (can be positive or negative)
- `anatomicalAngle` = Final clinical angle

### Proof of Correctness

**Shoulder X-axis (Abduction):**

| Position | T-pose Offset | Relative | Anatomical | Verification |
|----------|---------------|----------|------------|--------------|
| At T-pose | 57° | 0° | 57° + 0° = **57°** | ✅ T-pose IS 57° abducted |
| Arms at sides | 57° | -57° | 57° + (-57°) = **0°** | ✅ Sides = anatomical neutral |
| Arms overhead | 57° | +60° | 57° + 60° = **117°** | ✅ Matches clinical ROM |

**Hip Z-axis (Flexion):**

| Position | T-pose Offset | Relative | Anatomical | Verification |
|----------|---------------|----------|------------|--------------|
| At T-pose | -174° | 0° | -174° + 0° = **-174°** | ✅ T-pose IS -174° rotated |
| Standing | -174° | +174° | -174° + 174° = **0°** | ✅ Standing = anatomical neutral |
| Hip flexed 90° | -174° | +264° | -174° + 264° = **90°** | ✅ Kick position |

---

## Implementation

### Key Files

1. **`angleConversion.ts`** - Core math functions (NEW)
   - `relativeToAnatomical()` - Convert relative → anatomical
   - `anatomicalToRelative()` - Convert anatomical → relative (inverse)
   - `convertLimitsToAnatomical()` - Convert constraint limits for display
   - Unit-testable, no dependencies on THREE.js bone objects

2. **`constraintValidator.ts`** - Bone angle measurement
   - `getRelativeEuler()` - Calculates relative from cached T-pose quaternion
   - `getAnatomicalEuler()` - Uses angleConversion module (refactored)
   - `setRelativeEuler()` - Applies rotation in relative space
   
3. **`jointConstraints.ts`** - Constraint definitions
   - `tPoseOffset` field - NEW, replaces confusing `anatomicalNeutral`
   - `anatomicalNeutral` - DEPRECATED but still supported for compatibility
   - ROM limits still defined in T-pose relative space

### Data Flow

```
Model GLB File
    ↓
[T-pose Quaternions Captured]
    ↓
constraintReferencePose Map
    ↓
getRelativeEuler() → Relative Euler
    ↓
getAnatomicalEuler() → Uses angleConversion
    ↓
Anatomical Euler → Display in UI
```

---

## Configuration

### Defining tPoseOffset

**Positive Offset Example (Shoulder):**
```typescript
'mixamorig1RightArm': {
  tPoseOffset: {
    x: deg(57),  // T-pose IS at 57° abduction anatomically
    y: deg(0),   // No rotation offset
    z: deg(0)    // No flexion offset
  }
}
```

**Negative Offset Example (Hip):**
```typescript
'mixamorig1RightUpLeg': {
  tPoseOffset: {
    z: deg(-174)  // T-pose IS at -174° on Z-axis anatomically
  }
}
```

**No Offset Example (Elbow):**
```typescript
'mixamorig1RightForeArm': {
  tPoseOffset: {
    x: deg(0)  // T-pose IS at anatomical neutral (extended)
  }
}
```

### Determining Correct Offset Values

Run T-pose diagnostic at initialization:
```typescript
const euler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
console.log(`${boneName}: x=${radToDeg(euler.x).toFixed(1)}°`);
```

The printed value IS the `tPoseOffset` for that axis.

---

## Validation & Testing

### Unit Tests

See `angleConversion.test.ts` for comprehensive test suite:
- ✅ Shoulder at T-pose → 57°
- ✅ Arms at sides → 0°
- ✅ Arms overhead → 117°
- ✅ Round-trip conversion accuracy
- ✅ Hip negative offsets
- ✅ Hip standing vertical → 0°

### Runtime Validation

Console logs show formula verification:
```
🔍 mixamorig1RightArm:
  Relative (from T-pose): x=-57.0° y=0.0° z=0.0°
  Anatomical (display): x=0.0° y=0.0° z=0.0°
  T-pose offset: x=57.0° y=0.0° z=0.0°
  ✅ Formula check: 57.0° + -57.0° = 0.0°
```

### Common Pitfalls

❌ **WRONG:** `anatomicalAngle = relativeAngle - tPoseOffset`  
✅ **CORRECT:** `anatomicalAngle = tPoseOffset + relativeAngle`

❌ **WRONG:** `tPoseOffset = negative of T-pose angle`  
✅ **CORRECT:** `tPoseOffset = exactly what T-pose angle IS anatomically`

---

## Migration Guide

### From Old System

**OLD (Confusing):**
```typescript
anatomicalNeutral: { x: deg(57) }  // What does this mean?
```

**NEW (Clear):**
```typescript
tPoseOffset: { x: deg(57) }  // T-pose IS at 57° in anatomical space
```

### Backward Compatibility

The system supports both field names:
```typescript
const tPoseOffset = constraint?.tPoseOffset || constraint?.anatomicalNeutral;
```

Gradually migrate all constraints to use `tPoseOffset`.

---

## Troubleshooting

### Symptoms: Arms at sides showing 114° instead of 0°

**Diagnosis:** Using subtraction formula  
**Fix:** Change to addition: `tPoseOffset + relative`

### Symptoms: T-pose showing 0° instead of 57°

**Diagnosis:** tPoseOffset = 0 when should be 57°  
**Fix:** Update constraint definition with T-pose diagnostic values

### Symptoms: Angles correct but ROM scale wrong

**Diagnosis:** Scale calculation not using tPoseOffset  
**Fix:** Update display: `anatomicalMin = tPoseOffset + limitMin`

---

## Clinical Validation Checklist

Before using in research:

- [ ] Unit tests passing (all 6 tests)
- [ ] T-pose diagnostic matches tPoseOffset values
- [ ] Arms at sides show 0° ± 2°
- [ ] Full abduction shows 180° ± 5°
- [ ] Hip standing shows 0° ± 2°
- [ ] Hip flexion matches animation keyframes
- [ ] Scapulohumeral rhythm 2:1 ratio maintained
- [ ] Goniometer validation study completed
- [ ] Inter-rater reliability > 0.95
- [ ] Test-retest reliability > 0.90

---

## Future Enhancements

1. **Automatic T-pose Detection**
   - Analyze model on load
   - Auto-populate tPoseOffset values
   - Warn if diagnostic doesn't match config

2. **Multiple Reference Frames**
   - Support clinical vs research conventions
   - International anatomical standards
   - Sport-specific angle definitions

3. **Angle Decomposition**
   - Separate shoulder rhythm components
   - Spine coupling analysis
   - Kinematic chain visualization

4. **Validation Tools**
   - Real-time goniometer comparison
   - Motion capture ground truth overlay
   - Statistical accuracy metrics

---

**Document Version:** 2.0  
**Last Updated:** 2025-11-17  
**Status:** REFACTORED - Requires Testing
