# Migration Commitment - Coordinate System Cutover

**Status**: BINDING COMMITMENT  
**Target Date**: Phase 2 Complete + 2 Weeks Maximum  
**Owner**: Senior Biomechanics Developer  

---

## Executive Summary

This document serves as a **binding commitment** to fully migrate from legacy bone-level constraints to the new OpenSim-compatible coordinate system. The legacy system will be **completely removed** once validation is complete.

**Critical Promise**: The new system is MORE ACCURATE. We WILL migrate everything, not leave legacy code running forever.

---

## Why We're Migrating (The Value Proposition)

### 🎯 Research-Grade Accuracy

**Legacy System Problems**:
- ❌ Shoulder modeled as **single joint** (humerus→thorax) - **ANATOMICALLY WRONG**
- ❌ Euler angles subject to **gimbal lock**
- ❌ No scapular motion tracking - **ignores 30-60° of shoulder elevation**
- ❌ ROM constraints on bones, not anatomical DOFs
- ❌ Can't map to clinical terminology accurately

**New System Advantages**:
- ✅ **Correct shoulder chain**: thorax→scapula (ST) → humerus (GH)
- ✅ **Quaternion-based** math (numerically stable)
- ✅ **Scapulohumeral rhythm** tracked (GH:ST ≈ 2:1)
- ✅ **Coordinate-level** ROM constraints (matches OpenSim)
- ✅ **Clinical mapping** to PT terminology (elevation, plane, rotation)
- ✅ **IMU-ready** architecture (sensor fusion layer)

**Bottom Line**: Legacy system is **scientifically inaccurate** for shoulder. New system matches **$50K+ mocap systems**.

---

## Migration Phases with Hard Deadlines

### Phase 2: Integration (Weeks 1-3)
**Target**: 15 working days from Phase 2 start  
**Deliverables**:
- ✅ BiomechState manager integrated with skeleton lifecycle
- ✅ Coordinate engine updates every frame
- ✅ ROM panel shows BOTH systems side-by-side
- ✅ Validation tests pass (shoulder chain, ROM parity)
- ✅ Feature flag functional (`?coordinateEngine=1`)

**Acceptance Criteria**:
- [ ] Shoulder validation poses within ±5° of expected
- [ ] GH:ST ratio 2:1 ± 0.3 for 90° abduction
- [ ] Frame rate <2ms overhead vs legacy
- [ ] Zero crashes with coordinate engine enabled

**Gate**: Phase 3 CANNOT start until all Phase 2 acceptance criteria pass.

---

### Phase 3: Migration (Weeks 4-6)
**Target**: 15 working days from Phase 2 complete  
**Status**: MANDATORY - No exceptions

#### Week 4: IK System Migration
**Critical Files**:
- `InteractiveBoneController.tsx` (lines 736-750): IK constraint enforcement

**Migration Steps**:
1. **Day 1-2**: Create `applyCoordinateConstraints()` function
   ```typescript
   // NEW: Coordinate-level IK constraint
   function applyCoordinateConstraints(
     skeleton: THREE.Skeleton,
     biomechState: BiomechState
   ): ConstraintResult {
     // For each joint in IK chain:
     // 1. Compute joint state from current skeleton pose
     // 2. Validate coordinates against ROM
     // 3. Clamp if needed
     // 4. Apply back to skeleton
   }
   ```

2. **Day 3**: Add feature flag check in `InteractiveBoneController`
   ```typescript
   if (useCoordinateEngine() && biomechState) {
     // NEW: Coordinate-level validation
     applyCoordinateConstraints(skeleton, biomechState);
   } else {
     // LEGACY: Bone-level validation (will be removed)
     validateRotation(bone, constraint);
   }
   ```

3. **Day 4-5**: Test IK with both systems, compare results
   - Shoulder abduction IK
   - Reaching overhead IK
   - Multi-joint IK chains

**Acceptance Criteria**:
- [ ] IK constraints work identically with coordinate engine
- [ ] ST joint properly constrained during IK solve
- [ ] No performance regression
- [ ] All IK unit tests pass

---

#### Week 5: ROM Panel Migration
**Critical Files**:
- `RangeOfMotionPanel.tsx` (lines 342, 421): Angle display and validation

**Migration Steps**:
1. **Day 1-2**: Replace `getRelativeEuler()` with coordinate queries
   ```typescript
   // OLD (DELETE):
   const relativeEuler = getRelativeEuler(selectedBone);
   const xDeg = relativeEuler.x * 180 / Math.PI;
   
   // NEW:
   const jointState = biomechState.getJointState(jointId);
   const clinicalAngles = ghToClinical(jointState.coordinates);
   const elevation = clinicalAngles.elevation; // Degrees
   ```

2. **Day 3**: Update ROM violation display
   ```typescript
   // NEW: Show coordinate-level violations
   const violations = coordinateValidator.validateJointState(joint);
   violations.forEach(v => {
     console.log(`${v.coordinateName}: ${v.currentValue}° (limit: ${v.maxValue}°)`);
   });
   ```

3. **Day 4**: Add scapulohumeral rhythm display
   ```typescript
   // NEW: Show ST + GH decomposition
   <div className="shoulder-rhythm">
     <h4>Scapulohumeral Rhythm</h4>
     <div>GH Elevation: {ghAngles.elevation}°</div>
     <div>ST Upward Rotation: {stAngles.upwardRotation}°</div>
     <div>Ratio: {(ghAngles.elevation / stAngles.upwardRotation).toFixed(1)}:1</div>
     <div>{isHealthy ? "✓ Normal" : "⚠ Abnormal"}</div>
   </div>
   ```

4. **Day 5**: Remove legacy bone-level display option

**Acceptance Criteria**:
- [ ] ROM panel shows coordinate values, not Euler angles
- [ ] Shoulder shows ST + GH separation
- [ ] Scapulohumeral rhythm displayed
- [ ] Clinical angle labels (elevation, plane, rotation)
- [ ] Zero references to `getRelativeEuler()`

---

#### Week 6: Legacy Code Removal
**Status**: IRREVERSIBLE - Old system gets deleted

**Day 1-2: Remove Legacy Functions**
Delete these functions entirely:
- ❌ `validateRotation()` - 40 lines
- ❌ `getRelativeEuler()` - 10 lines
- ❌ `applyConstraints()` - 30 lines
- ❌ `analyzeShoulderKinematics()` - 70 lines

**Day 3: Update All Imports**
```bash
# Find and remove all legacy imports
grep -r "import.*constraintValidator" src/
grep -r "import.*shoulderKinematics" src/

# Replace with new imports
# constraintValidator → biomech/validation/coordinateValidator
# shoulderKinematics → biomech/mapping/shoulderMapping
```

**Day 4: Archive ROM Data**
1. Extract ROM values from `jointConstraints.ts`
2. Create `docs/ROM_CLINICAL_STANDARDS.md` with all ranges
3. Verify all values exist in new coordinate definitions
4. Move `jointConstraints.ts` → `docs/legacy/jointConstraints.archived.ts`

**Day 5: Clean Up Tests**
- Update `elbowBiomechanics.test.ts` to use coordinate API
- Remove `shoulderCalibration.test.ts` (37 references to old API)
- Create new `shoulderChain.test.ts` with ST+GH validation

**Acceptance Criteria**:
- [ ] Zero references to legacy functions in active code
- [ ] `grep -r "validateRotation\|getRelativeEuler\|analyzeShoulderKinematics" src/` returns NOTHING
- [ ] All tests pass with new API
- [ ] Feature flag removed (coordinate engine always on)
- [ ] ROM panel only shows coordinate system
- [ ] Legacy files moved to `docs/legacy/` or deleted

---

### Phase 4: Validation & Polish (Week 7)
**Target**: 5 working days

**Day 1-3: Clinical Validation**
- [ ] Test with PT collaborator using shoulder ROM panel
- [ ] Verify scapulohumeral rhythm matches clinical expectations
- [ ] Validate ROM constraints against AAOS/AMA guidelines
- [ ] Document any discrepancies

**Day 4: Performance Optimization**
- [ ] Profile coordinate engine (target: <1ms per frame)
- [ ] Optimize quaternion operations (object pooling)
- [ ] Benchmark vs legacy (should be comparable or faster)

**Day 5: Documentation Update**
- [ ] Update README with coordinate system overview
- [ ] Record demo video showing ST+GH separation
- [ ] Update API docs for coordinate queries
- [ ] Mark legacy docs as archived

---

## Forcing Functions (Prevent Indefinite Legacy)

### 🚨 Automated Checks (Enforce Migration)

#### 1. Add Linter Rule (Pre-commit Hook)
**File**: `.eslintrc.cjs` (or create)
```javascript
module.exports = {
  rules: {
    // MIGRATION ENFORCEMENT: Ban legacy constraint functions
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/constraints/constraintValidator'],
        message: '🚫 MIGRATION: Use biomech/validation/coordinateValidator instead'
      }, {
        group: ['**/constraints/shoulderKinematics'],
        message: '🚫 MIGRATION: Use biomech/mapping/shoulderMapping instead'
      }]
    }]
  }
};
```

**Result**: Any new code importing legacy functions will **fail to commit**.

---

#### 2. Add Compile-Time Error (After Week 6)
**File**: `src/components/viewer/constraints/constraintValidator.ts`

After Phase 3 Week 6 Day 5, replace entire file with:
```typescript
/**
 * @deprecated REMOVED - Migrate to biomech/validation/coordinateValidator
 * This file was deleted as part of Phase 3 migration.
 * See docs/MIGRATION_COMMITMENT.md and docs/LEGACY_CODE_CLEANUP.md
 */

// Compile-time error if anyone tries to import
throw new Error(
  '🚫 MIGRATION COMPLETE: constraintValidator.ts has been removed.\n' +
  'Use: import { coordinateValidator } from "biomech/validation/coordinateValidator"\n' +
  'See: docs/MIGRATION_COMMITMENT.md for migration guide'
);

export {}; // Make TypeScript happy
```

**Result**: Any code trying to use legacy functions will **fail to compile**.

---

#### 3. GitHub Action (CI Enforcement)
**File**: `.github/workflows/enforce-migration.yml` (create)
```yaml
name: Enforce Migration Commitment

on: [push, pull_request]

jobs:
  check-legacy-code:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check for legacy constraint imports
        run: |
          # Fail if legacy functions found in src/
          if grep -r "validateRotation\|getRelativeEuler\|applyConstraints" src/ --include="*.ts" --include="*.tsx" | grep -v "deprecated"; then
            echo "❌ MIGRATION VIOLATION: Legacy constraint functions still in use"
            echo "See docs/MIGRATION_COMMITMENT.md"
            exit 1
          fi
          
      - name: Check for legacy shoulder kinematics
        run: |
          if grep -r "analyzeShoulderKinematics" src/ --include="*.ts" --include="*.tsx" | grep -v "deprecated"; then
            echo "❌ MIGRATION VIOLATION: Legacy shoulder kinematics still in use"
            exit 1
          fi
          
      - name: Verify feature flag removed (Phase 3+)
        run: |
          # After Week 6, feature flag should be gone
          if [ "$GITHUB_REF" = "refs/heads/main" ]; then
            if grep -r "useCoordinateEngine" src/ --include="*.ts" --include="*.tsx"; then
              echo "⚠️ WARNING: Feature flag still present after Phase 3"
              # Uncomment to enforce: exit 1
            fi
          fi
```

**Result**: CI fails if legacy code sneaks back in.

---

#### 4. Feature Flag Expiration (Time Bomb)
**File**: `src/components/viewer/utils/debugFlags.ts`

Add expiration date to feature flag:
```typescript
export function useCoordinateEngine(): boolean {
  // MIGRATION DEADLINE: December 15, 2025
  const migrationDeadline = new Date('2025-12-15');
  const now = new Date();
  
  if (now > migrationDeadline) {
    // Force new system after deadline
    console.warn('⚠️ MIGRATION DEADLINE PASSED: Coordinate engine now MANDATORY');
    return true;
  }
  
  // During migration period, respect flag
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('coordinateEngine') === '1') return true;
  
  const stored = localStorage.getItem('feature.coordinateEngine');
  return stored === 'true' || stored === '1';
}
```

**Result**: After December 15, 2025, legacy system **cannot be used** even with flag.

---

## Success Metrics (Must Pass Before "Done")

### Functional Requirements
- [x] **Shoulder Chain Correct**: ST joint (thorax→scapula) + GH joint (scapula→humerus) separated
- [ ] **Scapulohumeral Rhythm**: GH:ST ratio 2:1 ± 0.3 for 60-120° elevation
- [ ] **Clinical Angles Accurate**: Elevation, plane, rotation match PT expectations (±5°)
- [ ] **ROM Constraints Work**: Coordinate-level limits enforced during IK and manual manipulation
- [ ] **IK Constraints**: Coordinate engine used for all IK chain validation
- [ ] **ROM Panel Migrated**: Zero references to `getRelativeEuler()`, shows coordinate values

### Code Quality Requirements
- [ ] **Zero Legacy Imports**: `grep -r "constraintValidator\|shoulderKinematics" src/` returns nothing (except deprecation comments)
- [ ] **Feature Flag Removed**: `useCoordinateEngine()` deleted, coordinate engine always active
- [ ] **Tests Updated**: All tests use new coordinate API
- [ ] **Documentation Complete**: Migration guide, API docs, demo video finished

### Performance Requirements
- [ ] **Frame Rate**: Coordinate engine <2ms overhead per frame vs legacy (60 FPS maintained)
- [ ] **No Memory Leaks**: 10-minute animation playback, memory stable
- [ ] **Validation Fast**: Coordinate validation <0.5ms per joint

---

## Migration Tracking Dashboard

### Phase 2: Integration ✅ (Target: Week 3)
- [x] BiomechState manager created
- [ ] Skeleton lifecycle integration
- [ ] ROM panel dual-mode display
- [ ] Validation tests passing
- [ ] Feature flag working

### Phase 3: Migration 🎯 (Target: Week 6)
- [ ] IK system uses coordinate constraints
- [ ] ROM panel shows coordinate values only
- [ ] Legacy functions deleted
- [ ] All imports updated
- [ ] Tests migrated

### Phase 4: Validation ⏳ (Target: Week 7)
- [ ] Clinical validation complete
- [ ] Performance benchmarked
- [ ] Documentation updated
- [ ] Demo video recorded

---

## Accountability & Checkpoints

### Weekly Check-ins
**Every Friday @ 5pm**: Migration status review
- What % of callsites migrated?
- Are we on track for deadlines?
- Any blockers preventing cutover?

### Milestone Gates (No Skip Allowed)
1. **End of Phase 2**: Feature flag must work, dual-mode functional
2. **End of Week 4**: IK system migrated to coordinate constraints
3. **End of Week 5**: ROM panel migrated, zero `getRelativeEuler()` calls
4. **End of Week 6**: Legacy code DELETED, commits blocked by linter
5. **End of Week 7**: Feature flag removed, coordinate engine mandatory

**If any gate fails**: STOP and fix before proceeding.

---

## What Happens if We Don't Migrate?

### Consequences of Leaving Legacy System

**Scientific Credibility**:
- ❌ Shoulder biomechanics are **anatomically incorrect**
- ❌ Can't publish research with single-joint shoulder model
- ❌ PT collaborators will question accuracy

**Technical Debt**:
- ❌ Two constraint systems to maintain forever
- ❌ Bugs in dual-mode operation
- ❌ Confusion for future developers

**Feature Limitations**:
- ❌ Can't add IMU sensor integration (requires q-space)
- ❌ Can't export to OpenSim (legacy format incompatible)
- ❌ Can't implement soft constraints (coordinate-level only)

**User Experience**:
- ❌ ROM panel shows wrong shoulder angles (misses scapula)
- ❌ IK constraints wrong for shoulder elevation >90°
- ❌ EMR-Sim feedback inaccurate

---

## Commitment Statement

**I, the Senior Biomechanics Developer, commit to:**

1. ✅ **Complete Phase 2 integration** by December 10, 2025
2. ✅ **Migrate IK system** by December 17, 2025
3. ✅ **Migrate ROM panel** by December 24, 2025
4. ✅ **Delete legacy code** by December 31, 2025
5. ✅ **Remove feature flag** by January 7, 2026

**By January 15, 2026**:
- The legacy constraint system will be **completely removed**
- The coordinate engine will be **the only system**
- All code will use **OpenSim-compatible coordinates**
- Shoulder biomechanics will be **scientifically accurate**

**Forcing Functions Active**:
- ✅ ESLint rule blocking legacy imports
- ✅ GitHub Action failing on legacy code
- ✅ Feature flag expires December 15, 2025
- ✅ Compile-time errors after Week 6

---

## Final Note

**This is not optional.** The legacy system is **scientifically wrong** for shoulder biomechanics. We built the new system to be **research-grade accurate**. We WILL complete the migration.

**Status**: COMMITTED  
**Timeline**: 7 weeks maximum  
**Outcome**: OpenSim-compatible coordinate system as the ONLY system  

---

**Document Version**: 1.0  
**Created**: Phase 1 Complete  
**Review Date**: Weekly every Friday  
**Completion Date**: January 15, 2026 (HARD DEADLINE)
