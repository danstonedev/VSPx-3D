# Biomechanical Joint Angle System

## Overview

The VSPx-3D viewer now includes a **teaching-oriented biomechanical joint coordinate system (JCS)** that provides clinically meaningful joint angles for physical therapy education. This system complements the existing constraint system by offering segment-relative angles that match clinical measurement conventions.

## Architecture

### Two-Layer Angle System

The system maintains **two distinct views** of joint angles:

#### 1. **Model (Rig) Angles** - For Constraints
- **Purpose**: Enforce anatomical ROM limits and prevent invalid poses
- **Reference**: Relative to bone's local coordinate system in T-pose
- **Module**: `constraints/constraintValidator.ts`
- **Function**: `getRelativeEuler(bone)` 
- **Usage**: IK constraint enforcement, collision detection

#### 2. **Biomech (Teaching) Angles** - For Education
- **Purpose**: Display clinically meaningful joint angles to students
- **Reference**: Distal segment orientation relative to proximal segment
- **Module**: `biomech/jointAngles.ts`
- **Function**: `computeBiomechAngles(skeleton, jointId, side)`
- **Usage**: Educational displays, clinical teaching, ROM visualization

### Key Principles

1. **Neutral Pose = 0°**: All biomech angles are measured relative to anatomical neutral (T-pose)
2. **Segment-Based**: Angles computed from proximal→distal segment relationships (e.g., pelvis→femur for hip)
3. **Clinical Convention**: Matches standard clinical terminology:
   - **Flexion/Extension**: Sagittal plane motion
   - **Abduction/Adduction**: Frontal plane motion
   - **Internal/External Rotation**: Transverse plane motion
4. **Display Only**: Biomech angles are for visualization; constraints use rig angles

## Supported Joints

### Lower Extremity

#### Hip (Ball-and-Socket)
- **Segments**: Pelvis (proximal) → Femur (distal)
- **Clinical ROM** (AAOS/Norkin & White):
  - Flexion: ~120°, Extension: ~20°
  - Abduction: ~40-45°, Adduction: ~20-30°
  - Internal Rotation: ~35-40°, External Rotation: ~40-45°
- **Bones**: `mixamorig1Hips` → `mixamorig1[Left/Right]UpLeg`

#### Knee (Hinge)
- **Segments**: Femur (proximal) → Tibia (distal)
- **Clinical ROM**:
  - Flexion: ~135°, Extension: 0° (5-10° hyperextension in some)
  - Tibial rotation (at 90° flexion): Internal ~10°, External ~30-40°
- **Bones**: `mixamorig1[Left/Right]UpLeg` → `mixamorig1[Left/Right]Leg`

#### Ankle (Modified Hinge)
- **Segments**: Tibia (proximal) → Foot (distal)
- **Clinical ROM**:
  - **Talocrural**: Dorsiflexion ~20°, Plantarflexion ~50°
  - **Subtalar**: Inversion ~20-35°, Eversion ~10-20°
- **Bones**: `mixamorig1[Left/Right]Leg` → `mixamorig1[Left/Right]Foot`

### Upper Extremity

#### Shoulder (Ball-and-Socket)
- **Segments**: Thorax/Scapula (proximal) → Humerus (distal)
- **Clinical ROM**:
  - Flexion: ~180°, Extension: ~60°
  - Abduction: ~180°, Adduction: ~30-40°
  - Internal Rotation: ~70-90°, External Rotation: ~90°
- **Bones**: `mixamorig1Spine2` → `mixamorig1[Left/Right]Arm`
- **Note**: Works with scapulothoracic joint (scapulohumeral rhythm ~2:1)

#### Elbow (Hinge)
- **Segments**: Humerus (proximal) → Radius/Ulna (distal)
- **Clinical ROM**:
  - Flexion: ~145-150°, Extension: 0° (5-10° hyperextension possible)
  - Forearm rotation: Supination ~80-90°, Pronation ~80-90°
- **Bones**: `mixamorig1[Left/Right]Arm` → `mixamorig1[Left/Right]ForeArm`

## Implementation Details

### Initialization Sequence

```typescript
// In InteractiveBoneController.tsx after skeleton loads:

// 1. Capture constraint reference (for rig-based ROM enforcement)
captureConstraintReferencePose(skeleton);

// 2. Capture biomech neutral pose (for teaching angles)
captureJointNeutralPose(skeleton);
```

**CRITICAL**: Both captures must occur **while the skeleton is in T-pose** (anatomical neutral). This ensures:
- Constraints measure rotation relative to T-pose
- Biomech angles measure rotation relative to anatomical neutral (T-pose = 0°)

### Computing Biomech Angles

```typescript
import { computeBiomechAngles } from './biomech/jointAngles';

// For a specific joint
const hipAngles = computeBiomechAngles(skeleton, 'hip', 'left');
// Returns: { flexExt: number, abdAdd: number, rotation: number }

// For a selected bone (auto-detect joint)
const result = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
if (result) {
  console.log(`${result.jointId} ${result.side}:`, result.angles);
}
```

### Joint Configuration

Each joint is defined in `JOINT_CONFIGS` with:

```typescript
{
  id: 'hip',                          // Joint type
  side: 'left',                       // Left or right
  proximalBoneName: 'mixamorig1Hips', // Closer to trunk
  distalBoneName: 'mixamorig1LeftUpLeg', // Farther from trunk
  eulerOrder: 'XYZ'                   // Decomposition order
}
```

### Angle Mapping Convention

By default, Euler axes map to biomech movements as:
- **X-axis** → Flexion (+) / Extension (−)
- **Y-axis** → Internal (+) / External (−) Rotation
- **Z-axis** → Abduction (+) / Adduction (−)

This can be customized per joint in `mapEulerToBiomech()`.

## UI Integration

### Range of Motion Panel

The `RangeOfMotionPanel` displays both views:

1. **Current Angles (Geometric Analysis)** - Primary display
   - Shows rig-based angles relative to T-pose
   - Used for real-time joint tracking during animations
   - Visual scale with neutral marker at 0°

2. **🔬 Biomechanical Joint Angles** - Teaching section
   - Displays segment-relative clinical angles
   - Three rows: Flexion/Extension, Abduction/Adduction, Rotation
   - Color-coded with explanatory labels
   - Footer note explaining the difference

Example display:
```
🔬 Biomechanical Joint Angles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flexion/Extension:     45.2°  (Flexion)
Abduction/Adduction:   12.5°  (Abduction)
Internal/Ext Rotation: -8.3°  (External)

💡 These angles are relative to anatomical neutral
   (T-pose = 0°), using segment-to-segment
   orientation rather than model-local axes.
```

## Clinical ROM Audit Summary

All ROM limits in `jointConstraints.ts` have been updated to match clinical norms:

### Key Changes Made

| Joint | Axis | Old Limit | New Limit | Clinical Reference |
|-------|------|-----------|-----------|-------------------|
| Hip | Extension | -30° | -20° | AAOS (typical adult PROM) |
| Knee | Flexion | -150° | -135° | Norkin & White |
| Ankle | Plantarflexion | -45° | -50° | AAOS talocrural norms |
| Shoulder | Extension | -40° | -60° | AAOS (revised for full ROM) |
| Elbow | Flexion | -145° | -150° | Clinical teaching tables |
| Elbow | Hyperext | 0° | +10° | Allow normal hyperextension |

### Documentation in Code

Each joint constraint now includes:
```typescript
rotationLimits: {
  x: [deg(-20), deg(120)],  // Clinical: FLEX ~120°, EXT ~20° (AAOS/Norkin & White)
  // ...
},
notes: 'Ball-and-socket joint. Clinical norms (AAOS): FLEX ~120°, EXT ~20°, ...'
```

## Calibration & Validation

### Ensuring Neutral = 0°

After loading a model, verify that key joints read ~0° in T-pose:

```typescript
const hipAngles = computeBiomechAngles(skeleton, 'hip', 'left');
console.assert(
  Math.abs(hipAngles.flexExt) < 5 &&
  Math.abs(hipAngles.abdAdd) < 5 &&
  Math.abs(hipAngles.rotation) < 5,
  'Hip should be near 0° in T-pose'
);
```

### Axis Convention Verification

If visual testing shows inverted motion (e.g., flexion decreases when it should increase), adjust in `mapEulerToBiomech()`:

```typescript
// Example: flip abduction for right side
if (side === 'right') {
  abdAdd = -abdAdd;
}
```

## Testing Recommendations

### Unit Tests (Suggested)

```typescript
describe('Biomech Joint Angles', () => {
  it('should return 0° for all angles in neutral pose', () => {
    // Load skeleton in T-pose
    // Capture neutral
    // Assert all angles ≈ 0
  });

  it('should measure 90° hip flexion correctly', () => {
    // Set hip to 90° flexion pose
    // Assert flexExt ≈ 90, others ≈ 0
  });

  it('should distinguish abduction from flexion', () => {
    // Test pure frontal vs pure sagittal plane motion
  });
});
```

### Visual QA Checklist

- [ ] Hip flexion increases (positive) when leg moves forward
- [ ] Knee flexion increases (positive) when leg bends
- [ ] Shoulder abduction increases (positive) when arm moves laterally
- [ ] Elbow flexion increases (positive) when forearm approaches upper arm
- [ ] Ankle dorsiflexion (positive) and plantarflexion (negative) are correct

## Future Enhancements

### Phase 2 Potential Features

1. **Proper Cardan/Euler Sequence per Joint**
   - Implement joint-specific decomposition sequences (e.g., ZXY for shoulders)
   - Consider Grood–Suntay JCS for more rigorous clinical accuracy

2. **Visual Axis Indicators**
   - Debug mode showing colored arrows for flexion/abduction/rotation axes
   - Interactive visualization of segment coordinate frames

3. **ROM Limit Visualization**
   - Overlay clinical ROM ranges on biomech angle display
   - Color-code angles approaching limits (green → yellow → red)

4. **Multi-Segment Motion Analysis**
   - Compute total spine ROM (sum of thoracic + lumbar segments)
   - Scapulohumeral rhythm breakdown (already partially implemented)

5. **Comparative Analysis**
   - Side-to-side symmetry comparison (left hip vs right hip)
   - Normative data overlay (show how patient compares to population norms)

6. **Export & Reporting**
   - Generate ROM reports for clinical documentation
   - Export joint angles for external analysis tools

## Troubleshooting

### Problem: Biomech angles are null

**Cause**: Neutral pose not captured or bones not found

**Solution**:
```typescript
// Verify neutral pose was captured
import { hasNeutralPose } from './biomech/jointAngles';
console.log('Hip neutral captured?', hasNeutralPose('hip', 'left'));

// Verify bone names match
const cfg = JOINT_CONFIGS.find(c => c.id === 'hip' && c.side === 'left');
console.log('Expected bones:', cfg.proximalBoneName, cfg.distalBoneName);
```

### Problem: Angles are inverted or flipped

**Cause**: Axis conventions differ from clinical expectations

**Solution**: Adjust `mapEulerToBiomech()` function:
```typescript
// Example: flip rotation for right side joints
if (side === 'right' && jointId === 'shoulder') {
  rotation = -rotation;
}
```

### Problem: Angles drift during animation

**Cause**: Neutral pose reference being recaptured accidentally

**Solution**: Ensure `captureJointNeutralPose()` is called **once** during initialization, not on every frame or reset.

## References

1. **AAOS (American Academy of Orthopedic Surgeons)** - Joint motion standards
2. **Norkin & White** - *Measurement of Joint Motion: A Guide to Goniometry*
3. **Physiopedia** - Clinical ROM reference tables
4. **ISB (International Society of Biomechanics)** - Standardization of joint coordinate systems
5. **Grood & Suntay (1983)** - Joint coordinate system for clinical gait analysis

## Contact & Maintenance

For questions or issues with the biomech system:
- Review this document first
- Check `biomech/jointAngles.ts` for implementation details
- Verify ROM limits in `constraints/jointConstraints.ts`
- Test with known poses (T-pose, 90° flexion, etc.)

**Last Updated**: November 2025
**System Version**: v1.0 (Teaching-Oriented JCS)
