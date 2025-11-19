# Legacy Code Cleanup Plan - Before Phase 2

**Status**: Review Required  
**Created**: Phase 1 Complete, Before Phase 2  
**Purpose**: Identify and document legacy biomechanics code that will be replaced by new coordinate system

---

## Executive Summary

The new `src/biomech/` architecture (Phase 1) introduces a **research-grade coordinate system** based on OpenSim/Simbody. However, the existing codebase has **legacy bone-level constraint validation** in `src/components/viewer/constraints/` that will conflict with or duplicate the new system.

**Key Decision**: Keep legacy code **ACTIVE** during Phase 2 (dual-mode operation) for safe migration, then deprecate/remove in Phase 3.

---

## Legacy Files Analysis

### 🔴 HIGH PRIORITY - Will Be Replaced

#### 1. `constraintValidator.ts` (430 lines)
**Location**: `src/components/viewer/constraints/constraintValidator.ts`

**Current Purpose**:
- Validates bone rotations against ROM limits using **Euler angles** (bone-level)
- References Neutral Position for relative angle calculation
- Provides `validateRotation()`, `getRelativeEuler()`, `applyConstraints()`

**Problems**:
- ❌ Operates on **bone Euler angles** (gimbal lock risk)
- ❌ Cannot handle **ST + GH separation** (treats shoulder as single joint)
- ❌ ROM constraints tied to bone names, not anatomical coordinates
- ❌ No quaternion-based math (less numerically stable)

**New System Equivalent**:
- `src/biomech/engine/qSpaceEngine.ts`: Quaternion-based coordinate computation
- `src/biomech/validation/coordinateValidator.ts` (Phase 2 Task B1): Coordinate-level ROM validation

**Migration Path**:
1. **Phase 2**: Keep active, add feature flag check
2. **Phase 2**: Create parallel coordinate-level validator
3. **Phase 3**: Deprecate after validation complete
4. **Phase 4**: Remove entirely

**Active Dependencies** (keep these working):
- `InteractiveBoneController.tsx` (line 738): IK chain constraint enforcement
- `RangeOfMotionPanel.tsx` (lines 342, 421): ROM display and manual validation
- `Viewer3D.tsx` (line 5): Initialization call

---

#### 2. `jointConstraints.ts` (503 lines)
**Location**: `src/components/viewer/constraints/jointConstraints.ts`

**Current Purpose**:
- Defines ROM limits for all joints as **bone Euler ranges**
- Maps Mixamo bone names to clinical labels
- Includes educational notes about each joint

**Problems**:
- ❌ ROM limits on **bone Euler angles**, not anatomical coordinates
- ❌ Shoulder: Only `mixamorig1RightArm` defined (no separate ST/GH)
- ❌ No coordinate-level DOF specification
- ❌ Hard to map to clinical terminology (elevation, plane, rotation)

**New System Equivalent**:
- `src/biomech/model/joints.ts`: Defines joints with coordinate-level ROM constraints
- `src/biomech/model/segments.ts`: Maps bones to anatomical segments
- `src/biomech/mapping/shoulderMapping.ts`: Clinical angle interpretation

**Migration Path**:
1. **Phase 2**: Keep active for non-shoulder joints (elbow, hip, knee, spine)
2. **Phase 2**: Redirect shoulder queries to new system
3. **Phase 3**: Migrate all joints to coordinate-level
4. **Phase 4**: Archive as reference documentation (ROM values still useful)

**Active Dependencies**:
- `constraintValidator.ts` (line 9): `getConstraintForBone()`, `hasConstraint()`
- `InteractiveBoneController.tsx` (lines 25-26): Constraint lookups
- `RangeOfMotionPanel.tsx` (line 10): Display constraint info
- `elbowBiomechanics.test.ts` (line 15): Test ROM values

**Recommendation**: **DO NOT DELETE** - ROM values are clinically validated. Instead:
- Extract ROM values to migrate to new coordinate definitions
- Keep as reference documentation for Phase 3 migration

---

#### 3. `shoulderKinematics.ts` (162 lines)
**Location**: `src/components/viewer/constraints/shoulderKinematics.ts`

**Current Purpose**:
- Decomposes shoulder rotation into elevation, plane, and axial rotation
- Implements ISB shoulder motion analysis
- Provides `analyzeShoulderKinematics()` function

**Problems**:
- ❌ Works on **single humerus bone** (no ST joint)
- ❌ Projects humerus vector, but scapula motion not accounted for
- ❌ Plane of elevation calculated from thorax reference (should be scapula)
- ⚠️ Good math, but wrong parent reference frame

**New System Equivalent**:
- `src/biomech/mapping/shoulderMapping.ts`: GH and ST clinical angles
- `ghToClinical()`: Elevation, plane, rotation from GH coordinates
- `stToClinical()`: Scapular tilt, rotation, upward rotation
- `computeScapulohumeralRhythm()`: GH:ST ratio analysis

**Migration Path**:
1. **Phase 2**: Mark as deprecated, keep for backward compatibility
2. **Phase 2**: Update callers to use new `shoulderMapping.ghToClinical()`
3. **Phase 3**: Remove after all usages migrated
4. **Archive**: Save elevation/plane math as reference (ISB-compliant)

**Active Dependencies**:
- `RangeOfMotionPanel.tsx` (line 13): `getPlaneName()` utility
- `shoulderCalibration.test.ts` (multiple): Extensive test coverage (37 references)

**Recommendation**: **DEPRECATE** but keep temporarily. Tests are valuable for validating new system's accuracy.

---

### 🟡 MEDIUM PRIORITY - Partial Replacement

#### 4. `geometricAnalysis.ts`
**Location**: `src/components/viewer/constraints/geometricAnalysis.ts`

**Current Purpose**:
- Geometric utilities for collision detection and angle analysis

**Status**: **REVIEW NEEDED** - May contain utilities useful for new system

**Action**: Audit for reusable geometry functions, migrate useful helpers to `src/biomech/utils/`

---

#### 5. `selfCollisionDetector.ts`
**Location**: `src/components/viewer/constraints/selfCollisionDetector.ts`

**Current Purpose**:
- Detects limb-limb and limb-torso collisions

**Status**: **KEEP** - Collision detection is orthogonal to coordinate system

**Action**: No changes needed. Collision detection works at world-space level regardless of joint representation.

---

#### 6. `angleConversion.ts` + `angleConversion.test.ts`
**Location**: `src/components/viewer/constraints/angleConversion.ts`

**Current Purpose**:
- Converts between relative Euler and anatomical Euler
- Handles T-pose offset corrections

**Status**: **PARTIALLY OBSOLETE**
- New system uses quaternions internally
- Euler conversion handled by `qSpaceEngine.quatToCoordinates()`
- However, some conversion logic may be useful for legacy bone queries

**Action**: Keep during Phase 2, audit utilities for migration to `src/biomech/utils/angleUtils.ts`

---

#### 7. `neutralPoseLoader.ts`
**Location**: `src/components/viewer/constraints/neutralPoseLoader.ts`

**Current Purpose**:
- Loads Neutral.glb as reference pose
- Captures neutral rotations for each bone
- Used by `constraintValidator.ts` for relative angle calculation

**Status**: **CRITICAL - KEEP AND ENHANCE**
- ✅ Neutral Position reference is CORRECT concept
- ✅ Already implemented in Phase 1
- ⚠️ Currently stores per-bone quaternions (legacy)
- 🎯 Phase 2 enhancement: Store per-joint neutral coordinates

**Action**: 
1. Keep existing `loadNeutralPose()` for legacy validator
2. Add new `calibrateNeutralPose()` in `BiomechState` (Phase 2 Task A1)
3. Both systems use same Neutral.glb source

---

### 🟢 LOW PRIORITY - Keep As-Is

#### 8. Test Files
**Location**: `src/components/viewer/constraints/__tests__/`

**Files**:
- `elbowBiomechanics.test.ts` (267 lines): Tests elbow ROM constraints
- Various other test files

**Status**: **KEEP**
- Excellent clinical validation of ROM values
- Can serve as reference for migrating ROM to new coordinate system
- Update tests to use new API in Phase 3

**Action**: Keep active during migration, update incrementally

---

## Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Active Callers (Must Keep Working)       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  InteractiveBoneController.tsx  ─┐                          │
│  RangeOfMotionPanel.tsx  ────────┼──►  constraintValidator  │
│  Viewer3D.tsx  ───────────────────┘                          │
│                                       ↓                      │
│                                   jointConstraints           │
│                                       ↓                      │
│                                   shoulderKinematics         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommended Cleanup Actions

### ✅ BEFORE Phase 2 (NOW)

#### Action 1: Add Deprecation Warnings
Mark legacy functions with deprecation comments to prevent new usage:

**Files to modify**:
- `constraintValidator.ts`:
  ```typescript
  /**
   * @deprecated Use BiomechState.computeJointState() from Phase 2 coordinate system
   * Legacy bone-level validation. Kept for backward compatibility during migration.
   */
  export function validateRotation(...) { ... }
  ```

- `shoulderKinematics.ts`:
  ```typescript
  /**
   * @deprecated Use shoulderMapping.ghToClinical() + stToClinical() instead
   * This function does not account for scapulothoracic (ST) joint separation.
   */
  export function analyzeShoulderKinematics(...) { ... }
  ```

#### Action 2: Document Migration Path
Create `MIGRATION_GUIDE.md` (Phase 2 Task E2) documenting:
- Old API → New API mappings
- Feature flag usage
- Dual-mode operation during transition

---

### 🔄 DURING Phase 2 (Parallel Operation)

#### Action 3: Implement Feature Flag Checks
Add `useCoordinateEngine()` checks to legacy code:

```typescript
// In constraintValidator.ts
export function validateRotation(bone: THREE.Bone, ...): ValidationResult {
  if (useCoordinateEngine()) {
    console.warn('⚠️ Legacy validateRotation() called with coordinate engine enabled');
    console.warn('Consider using BiomechState.computeJointState() instead');
  }
  
  // ... existing logic
}
```

#### Action 4: Create Adapter Layer (Optional)
For smoother transition, create adapter that bridges old and new APIs:

**File**: `src/biomech/adapters/legacyAdapter.ts`
```typescript
/**
 * Adapter bridging legacy bone-level API to new coordinate system
 * Allows gradual migration without breaking existing code
 */
export function validateRotation_v2(bone: THREE.Bone): ValidationResult {
  if (!useCoordinateEngine()) {
    return validateRotation(bone); // Legacy path
  }
  
  // New path: Look up joint, validate coordinates
  const biomechState = getBiomechState(); // From context
  // ... coordinate-level validation
}
```

---

### 🗑️ AFTER Phase 2 Complete (Phase 3/4)

#### Action 5: Deprecate Legacy Validators
After Phase 2 validation complete and feature flag enabled:
1. Update all callers to use new coordinate API
2. Mark entire `constraintValidator.ts` as deprecated
3. Move to `src/legacy/` directory

#### Action 6: Archive ROM Data
Extract clinically validated ROM values from `jointConstraints.ts`:
1. Create `ROM_CLINICAL_STANDARDS.md` with all ROM ranges
2. Ensure all values migrated to new coordinate definitions
3. Move legacy file to `docs/legacy/`

#### Action 7: Remove Deprecated Code
After Phase 3 complete and all tests passing:
1. Delete `constraintValidator.ts`
2. Delete `shoulderKinematics.ts` (single-joint version)
3. Update imports throughout codebase
4. Clean up test files

---

## Risk Assessment

### ⚠️ High Risk Areas

**1. InteractiveBoneController IK Chain Validation**
- **Risk**: IK system heavily uses `validateRotation()` for real-time constraint enforcement
- **Mitigation**: Phase 2 dual-mode with extensive testing before cutover
- **Testing**: Validate IK chain behavior with both systems in parallel

**2. ROM Panel Display**
- **Risk**: ROM panel displays live angles using `getRelativeEuler()`
- **Mitigation**: Add coordinate display alongside bone display (Task B3)
- **Testing**: Visual comparison of both systems during animation playback

**3. Test Coverage**
- **Risk**: 37 references to `analyzeShoulderKinematics()` in tests
- **Mitigation**: Keep tests active, compare results with new system
- **Testing**: Create validation suite comparing old vs new outputs (Task D3)

---

## Testing Strategy

### Phase 2 Validation Tests

**Test 1: Shoulder Chain Comparison**
```typescript
// Compare old single-joint vs new ST+GH decomposition
const oldResult = analyzeShoulderKinematics(humerusBone);
const newGH = ghToClinical(ghJointState);
const newST = stToClinical(stJointState);

// Old elevation should equal GH elevation (ST was ignored)
expect(oldResult.elevation).toBeCloseTo(newGH.elevation, 1);
```

**Test 2: ROM Violation Parity**
```typescript
// Ensure both validators catch same violations (for non-shoulder joints)
const legacyViolations = validateRotation(elbowBone);
const newViolations = coordinateValidator.validateJointState(elbowJoint);

expect(legacyViolations.length).toBe(newViolations.length);
```

**Test 3: Performance Comparison**
```typescript
// Ensure new system doesn't slow frame rate
const legacyTime = benchmark(() => applyConstraints(skeleton));
const newTime = benchmark(() => biomechState.update(deltaTime));

expect(newTime).toBeLessThan(legacyTime * 1.5); // Allow 50% overhead
```

---

## File Size Summary

### Legacy Code to Eventually Remove
| File | Lines | Status | Phase |
|------|-------|--------|-------|
| `constraintValidator.ts` | 430 | Deprecate | Phase 3 |
| `shoulderKinematics.ts` | 162 | Deprecate | Phase 3 |
| `angleConversion.ts` | ~100 | Partial | Phase 3 |
| **Total** | **~700 lines** | - | - |

### Legacy Code to Keep
| File | Lines | Status | Reason |
|------|-------|--------|--------|
| `jointConstraints.ts` | 503 | Archive | Clinical ROM reference |
| `neutralPoseLoader.ts` | ~200 | Enhance | Neutral pose loading critical |
| `selfCollisionDetector.ts` | ~300 | Keep | Orthogonal to coordinates |
| `geometricAnalysis.ts` | ~200 | Review | May have useful utilities |

---

## Decision: Proceed with Dual-Mode Strategy

### ✅ Recommendation: **NO CLEANUP BEFORE PHASE 2**

**Rationale**:
1. Legacy code is **actively used** by IK system and ROM panel
2. Deleting now would break existing functionality
3. Dual-mode operation (Phase 2 Task B3) provides safe migration
4. Legacy tests are valuable for validating new system accuracy

**Strategy**:
1. **Phase 2**: Add deprecation warnings, implement parallel systems
2. **Phase 2**: Create comparison tests (Task D3)
3. **Phase 3**: Migrate all callers to new API
4. **Phase 4**: Remove deprecated code after validation

### 🚀 Proceed with Phase 2

The legacy code provides:
- ✅ **Working IK constraints** during development
- ✅ **Visual comparison** for validation
- ✅ **Test reference** for ROM values
- ✅ **Safety net** if new system has issues

**Next Steps**:
1. Add deprecation warnings (5 min)
2. Begin Phase 2 Task A1 (BiomechState manager)
3. Implement dual-mode ROM panel (Task B3)

---

## Appendix: Quick Reference

### Legacy API → New API Mapping

| Legacy Function | New Equivalent | Notes |
|-----------------|----------------|-------|
| `validateRotation(bone)` | `coordinateValidator.validateJointState(joint)` | Coordinate-level |
| `getRelativeEuler(bone)` | `qSpaceEngine.quatToCoordinates(q_delta)` | Returns [q0,q1,q2] |
| `analyzeShoulderKinematics(bone)` | `ghToClinical(ghState)` + `stToClinical(stState)` | Separate ST+GH |
| `applyConstraints(skeleton)` | `biomechState.update()` | Per-frame update |
| `getConstraintForBone(name)` | `getJoint(jointId)` | Joint-based lookup |

---

**Document Version**: 1.0  
**Status**: Ready for Review  
**Recommendation**: Proceed to Phase 2 without cleanup. Legacy code stays active during migration.
