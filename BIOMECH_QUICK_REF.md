# Biomech System Quick Reference

## 🎯 What We Built

A **teaching-oriented biomechanical joint angle system** that gives PT students clinically meaningful joint angles (flexion/extension, abduction/adduction, rotation) measured from segment-to-segment relationships.

---

## 📦 Key Files

```
src/components/viewer/biomech/
  └── jointAngles.ts              # Core biomech angle module (NEW)

src/components/viewer/constraints/
  └── jointConstraints.ts         # ROM limits (UPDATED with clinical norms)

src/components/viewer/debug/
  ├── RangeOfMotionPanel.tsx      # UI display (UPDATED with biomech section)
  └── RangeOfMotionPanel.css      # Styling (UPDATED)

src/components/viewer/
  └── InteractiveBoneController.tsx  # Init (UPDATED with neutral pose capture)

docs/
  └── BIOMECH_SYSTEM.md           # Full documentation (NEW)

IMPLEMENTATION_SUMMARY.md         # Feature summary (NEW)
```

---

## 🚀 Quick Start

### For Developers

```typescript
import { 
  computeBiomechAngles,
  captureJointNeutralPose 
} from './biomech/jointAngles';

// 1. Capture neutral pose (once, during init)
captureJointNeutralPose(skeleton);

// 2. Get angles for a specific joint
const hipAngles = computeBiomechAngles(skeleton, 'hip', 'left');
// Returns: { flexExt: 45.2, abdAdd: 12.5, rotation: -8.3 }

// 3. Or auto-detect from selected bone
const result = computeBiomechAnglesForSelectedBone(skeleton, selectedBone);
if (result) {
  console.log(result.angles.flexExt); // Flexion/Extension
}
```

### For Users (PT Students)

1. **Load the 3D model** (T-pose appears)
2. **Click "Enable IK"** to enter interactive mode
3. **Click any joint sphere** (cyan dots)
4. **Check the Range of Motion Panel** (right side of screen)
5. **Look for the section**: 🔬 Biomechanical Joint Angles
6. **Read the three angles**:
   - Flexion/Extension (sagittal plane)
   - Abduction/Adduction (frontal plane)
   - Internal/External Rotation (transverse plane)

---

## 🎓 Supported Joints

| Joint | Proximal Segment | Distal Segment | Bones |
|-------|-----------------|----------------|-------|
| **Hip** | Pelvis | Femur | `Hips` → `UpLeg` |
| **Knee** | Femur | Tibia | `UpLeg` → `Leg` |
| **Ankle** | Tibia | Foot | `Leg` → `Foot` |
| **Shoulder** | Thorax | Humerus | `Spine2` → `Arm` |
| **Elbow** | Humerus | Forearm | `Arm` → `ForeArm` |

---

## 📊 Clinical ROM Updates

All ROM limits now match AAOS/Norkin & White standards:

### Major Changes:
- **Hip Extension**: -30° → **-20°**
- **Knee Flexion**: -150° → **-135°**
- **Knee Hyperextension**: 0° → **+10°**
- **Ankle Plantarflexion**: -45° → **-50°**
- **Shoulder Extension**: -40° → **-60°**
- **Elbow Flexion**: -145° → **-150°**
- **Cervical Rotation**: ±75° → **±80°**

---

## 🔍 Two Angle Systems

| System | Purpose | Reference | Module | User |
|--------|---------|-----------|--------|------|
| **Rig Angles** | Constraint enforcement | Bone's local axes in T-pose | `constraintValidator.ts` | Background system |
| **Biomech Angles** | Teaching/education | Segment-to-segment (prox→dist) | `biomech/jointAngles.ts` | PT students |

**They're BOTH correct** — just measuring different things!

---

## 🧪 Testing Checklist

After loading the model:

- [ ] Console shows "✅ Biomech neutral pose captured"
- [ ] Select hip joint
- [ ] Biomech section appears in panel
- [ ] T-pose shows angles near 0°
- [ ] Flex hip forward → flexion angle increases (positive)
- [ ] Move hip laterally → abduction angle increases (positive)
- [ ] Rotate hip → rotation angle changes

---

## 🐛 Troubleshooting

### "Biomech angles are null"
**Fix**: Check console for neutral pose capture. Should see:
```
🔬 Capturing biomech neutral pose...
✅ Biomech neutral pose captured for 10 joints
```

### "Angles look inverted"
**Fix**: Adjust `mapEulerToBiomech()` in `jointAngles.ts`:
```typescript
if (side === 'right' && jointId === 'shoulder') {
  rotation = -rotation; // Flip for right side
}
```

### "Section doesn't appear"
**Check**: Only displays for supported joints (hip, knee, ankle, shoulder, elbow)

---

## 📚 Documentation

- **Full Guide**: `docs/BIOMECH_SYSTEM.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Code**: Inline JSDoc comments in `jointAngles.ts`

---

## 🎯 Key Principles

1. **Neutral = 0°** — All angles relative to T-pose
2. **Segment-based** — Measures distal relative to proximal
3. **Clinical terminology** — Matches goniometry conventions
4. **Display only** — Doesn't affect constraints
5. **Extensible** — Easy to add joints or customize mappings

---

## 🔮 Future Enhancements

- [ ] Grood–Suntay JCS implementation
- [ ] Visual axis arrows at joints
- [ ] ROM cone visualization
- [ ] Side-to-side symmetry comparison
- [ ] ROM report generation

---

## 💡 Remember

- **T-pose is captured ONCE** during initialization
- **Don't recapture** during runtime (angles will drift)
- **Biomech angles are educational** (for display)
- **Rig angles are functional** (for constraints)
- **Both are correct** — just different reference frames!

---

*Last Updated: November 2025 | System Version: v1.0*
