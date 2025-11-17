# Shoulder Complex Biomechanics Implementation

## Overview

The shoulder complex has been updated to accurately reflect the biomechanics of the **scapulohumeral rhythm** - the coordinated motion between the glenohumeral (ball-and-socket) joint and the scapulothoracic (scapular gliding) articulation.

## Anatomical Background

### The Four Joints of the Shoulder Complex

1. **Glenohumeral Joint (GH)** - Ball-and-socket (humerus & scapula)
2. **Scapulothoracic Joint (ST)** - Gliding articulation (scapula & thorax)
3. **Acromioclavicular Joint (AC)** - Gliding (scapula & clavicle)
4. **Sternoclavicular Joint (SC)** - Saddle joint (clavicle & sternum)

### Scapulohumeral Rhythm

**Definition**: The coordinated motion pattern between the glenohumeral and scapulothoracic joints during arm elevation.

**Classic 2:1 Ratio**:
- Total shoulder elevation (0-180°) = GH contribution (~120°) + ST contribution (~60°)
- For every 3° of arm elevation, approximately:
  - 2° comes from glenohumeral rotation
  - 1° comes from scapular upward rotation

**Three Phases**:
1. **0-30° (Setting Phase)**: Almost entirely glenohumeral motion, scapula seeks stable position
2. **30-90°**: Classic 2:1 rhythm establishes
3. **90-180°**: Maintained 2:1 ratio, full overhead reach

## Implementation in Mixamo Skeleton

### Bone Hierarchy
```
mixamorig1Spine2
  ├─ mixamorig1RightShoulder (Scapulothoracic component)
  │   └─ mixamorig1RightArm (Glenohumeral component)
  │       └─ mixamorig1RightForeArm (Elbow)
  └─ mixamorig1LeftShoulder (Scapulothoracic component)
      └─ mixamorig1LeftArm (Glenohumeral component)
          └─ mixamorig1LeftForeArm (Elbow)
```

### Joint Definitions

#### mixamorig1RightShoulder (Scapulothoracic)
- **Display Name**: Right Scapula (Scapulothoracic)
- **Primary Motion**: Upward/downward rotation (contributes to abduction)
- **ROM**:
  - X (Upward Rotation): -15° to 60° (75° total)
  - Y (Scapular Plane): -35° to 35° (70° total)
  - Z (Pro/Retraction): -30° to 30° (60° total)
- **Anatomical Neutral**:
  - X: +20° (T-pose has scapula upwardly rotated from neutral)
  - Z: +10° (T-pose has scapula protracted from resting)

#### mixamorig1RightArm (Glenohumeral)
- **Display Name**: Right Shoulder (Glenohumeral)
- **Ball-and-Socket Joint**: Highest mobility in the body
- **ROM**:
  - X (Flexion/Extension): -40° to 120° (160° total)
  - Y (Int/Ext Rotation): -70° to 90° (160° total)
  - Z (Abduction/Adduction): -30° to 120° (150° total)
- **Anatomical Neutral**:
  - X: 0° (T-pose forward/back is neutral)
  - Y: 0° (T-pose rotation is neutral)
  - Z: +90° (T-pose arm horizontal = 90° abducted from hanging)

### Axis Mapping Notes

The coordinate system follows Three.js conventions:
- **X-axis (Red)**: Typically flexion/extension or upward rotation
- **Y-axis (Green)**: Typically internal/external rotation
- **Z-axis (Blue)**: Typically abduction/adduction or protraction/retraction

For the **right shoulder**, positive Z rotation moves the arm laterally away from the body (abduction).
For the **left shoulder**, negative Z rotation moves the arm laterally away from the body (due to mirrored geometry).

## UI Features

### Composite Motion Display

When selecting either the `Shoulder` (scapula) or `Arm` (glenohumeral) bone, the ROM panel displays:

1. **Total Shoulder Elevation**: Sum of GH + ST contributions
2. **Glenohumeral Contribution**: Degrees from ball-and-socket joint
3. **Scapular Contribution**: Degrees from scapulothoracic gliding
4. **GH:ST Ratio**: Real-time calculation of the rhythm ratio

**Example Display**:
```
🔬 Scapulohumeral Rhythm Analysis

Total Shoulder Elevation: 87.3°
  ↳ Glenohumeral contribution: 58.2°
  ↳ Scapular contribution: 29.1°

GH:ST Ratio: 2.0:1

💡 Normal scapulohumeral rhythm: ~2:1 ratio (2° GH per 1° scapular) from 30-180° elevation
```

### Movement Labels

Updated to reflect biomechanically accurate terminology:

**Scapulothoracic (Shoulder)**:
- Primary: "Upward Rot" (upward/downward rotation)
- Secondary: "Scap Plane" (scapular plane adjustment)
- Tertiary: "Pro/Retract" (protraction/retraction)

**Glenohumeral (Arm)**:
- Primary: "Flex/Ext" (flexion/extension)
- Secondary: "Int/Ext Rot" (internal/external rotation)
- Tertiary: "Abd/Add" (abduction/adduction)

## Clinical Relevance

### Normal vs Abnormal Rhythm

**Normal**:
- GH:ST ratio ~2:1 during 30-180° elevation
- Smooth, coordinated motion
- Total elevation reaches 180° overhead

**Abnormal Patterns** (Pathology):
- **Frozen Shoulder**: Reduced GH motion, compensatory ST elevation (ratio reverses)
- **Impingement**: Excessive ST motion early, reduced GH contribution
- **Rotator Cuff Tear**: Weak GH control, scapular winging, altered rhythm
- **Scapular Dyskinesia**: Irregular ST motion, often excessive protraction

### Educational Value

This implementation helps PT/biomechanics students:
1. **Visualize** the coordinated motion between joints
2. **Quantify** individual joint contributions
3. **Assess** whether rhythm matches the expected 2:1 ratio
4. **Identify** compensatory patterns in animations
5. **Understand** how T-pose relates to anatomical neutral

## Technical Notes

### Anatomical Neutral Offsets

The `anatomicalNeutral` property maps T-pose rotations to true anatomical position (arms hanging at sides):

```typescript
anatomicalNeutral: {
  x: deg(20),  // Scapula upwardly rotated in T-pose
  z: deg(90)   // Arm horizontal in T-pose = 90° abducted
}
```

This allows the ROM panel to display:
- **0°** when the arm is hanging at the side (anatomical position)
- **90°** when the arm is horizontal (T-pose)
- **180°** when the arm is fully overhead

### Constraint System

Constraints are defined independently for each component:
- Scapular motion is constrained to realistic gliding ranges
- GH motion is constrained to ball-and-socket limits
- Both work together to prevent unnatural combined motion

### Future Enhancements

Potential improvements:
1. **Phase detection**: Identify setting phase (0-30°), classic rhythm (30-90°), overhead (90-180°)
2. **Rhythm validation**: Flag when ratio deviates significantly from 2:1
3. **Animation analysis**: Track rhythm patterns across entire animation sequence
4. **Pathology simulation**: Add presets for common dysfunction patterns
5. **3D rhythm visualization**: Show scapular rotation graphically on the model

## References

- Inman VT, Saunders JB, Abbott LC. Observations of the function of the shoulder joint. *J Bone Joint Surg Am*. 1944;26(1):1-30.
- Codman EA. *The Shoulder: Rupture of the Supraspinatus Tendon and Other Lesions in or about the Subacromial Bursa*. Boston: Thomas Todd; 1934.
- Paine RM, Voight M. The role of the scapula. *J Orthop Sports Phys Ther*. 1993;18(1):386-391.
- Kibler WB, McMullen J. Scapular dyskinesis and its relation to shoulder pain. *J Am Acad Orthop Surg*. 2003;11(2):142-151.

## Summary

The shoulder complex now properly models:
- ✅ Scapulothoracic gliding (60° contribution)
- ✅ Glenohumeral ball-and-socket (120° contribution)
- ✅ Anatomical neutral offsets (T-pose → anatomical position)
- ✅ Composite motion calculation (GH + ST = Total)
- ✅ Real-time rhythm ratio (GH:ST)
- ✅ Educational UI with biomechanics context

This provides PT students with an accurate, quantifiable view of shoulder biomechanics during motion analysis.
