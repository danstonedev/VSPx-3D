# Phase 2: Coordinate System Integration - Task Breakdown

**Status**: Ready to begin after Phase 1 validation  
**Prerequisite**: Shoulder chain validation complete (4 validation poses tested)  
**Goal**: Integrate q-space coordinate engine with existing ROM system while maintaining backward compatibility

---

## Architecture Overview

### Current State (Phase 1 Complete)
- ✅ Core types defined (`SegmentDef`, `JointDef`, `CoordinateDef`, `JointState`)
- ✅ Segments mapped to Mixamo bones
- ✅ Joints defined with correct ST + GH separation
- ✅ Q-space engine implements OpenSim math (q_rel, q_Δ, Euler conversion)
- ✅ Shoulder clinical mapping (GH, ST) complete
- ✅ Feature flag `useCoordinateEngine()` added (default: false)

### Phase 2 Target State
- 🎯 Coordinate engine integrated with live skeleton updates
- 🎯 ROM panel displays q-space coordinates alongside clinical angles
- 🎯 ROM constraints migrated from bone-level to coordinate-level
- 🎯 Existing constraint validator continues working (dual-mode)
- 🎯 Scapulohumeral rhythm monitoring active
- 🎯 Feature flag enables new system for testing

---

## Task Groups

### Group A: Runtime Integration (Core Plumbing)
**Priority**: Critical  
**Estimated Complexity**: Medium  
**Dependencies**: None (Phase 1 complete)

#### Task A1: Create Biomech State Manager
**File**: `src/biomech/engine/biomechState.ts`  
**Purpose**: Central state manager for coordinate engine lifecycle

**Requirements**:
- `BiomechState` class managing:
  - `SegmentRegistry` instance
  - `ModelState` (current coordinate values for all joints)
  - Neutral pose calibration status
  - Feature flag state
- Singleton pattern (one instance per skeleton)
- Lifecycle methods:
  - `initialize(skeleton: THREE.Skeleton)`: Set up segment registry
  - `calibrateNeutral(animationName: string)`: Capture neutral pose
  - `update(deltaTime: number)`: Compute joint states from current skeleton
  - `applyCoordinates(jointId: string, coords: [q0, q1, q2])`: Write coordinates back to bones
- State queries:
  - `getJointState(jointId: string): JointState | null`
  - `isCalibrated(): boolean`
  - `getCoordinateValue(jointId: string, coordIndex: 0 | 1 | 2): number`

**Integration Points**:
- Called from `InteractiveBoneController.tsx` after skeleton loads
- Updated every frame during animation playback
- Accessed by ROM panel for coordinate display

**Testing**:
- Unit test: State transitions (uninitialized → initialized → calibrated)
- Integration test: Update cycle with shoulder chain (ST + GH)

---

#### Task A2: Hook Biomech State into Skeleton Lifecycle
**Files**: 
- `src/components/viewer/InteractiveBoneController.tsx`
- `src/components/viewer/hooks/useHumanFigure.ts`

**Purpose**: Ensure biomech state initializes and updates with skeleton

**Requirements**:
- Import `BiomechState` and `useCoordinateEngine()` flag
- In `InteractiveBoneController`:
  - Add `useMemo(() => useCoordinateEngine() ? new BiomechState() : null, [])`
  - Call `biomechState?.initialize(skeleton)` after skeleton loads
  - Call `biomechState?.calibrateNeutral(animationId)` when Neutral.glb loads
  - Add `useAnimationFrame()` hook calling `biomechState?.update(deltaTime)` if enabled
- Store `biomechState` in viewer state via context (optional, for global access)

**Edge Cases**:
- Handle skeleton replacement (animation change)
- Graceful degradation if coordinate engine disabled
- Avoid duplicate initialization

**Testing**:
- Manual: Enable feature flag, load Neutral.glb, verify no errors
- Console log: `biomechState.isCalibrated()` should return true after load

---

#### Task A3: Create Coordinate Display Component
**File**: `src/components/viewer/debug/CoordinateDisplay.tsx`  
**Purpose**: Show q-space and clinical angles in ROM panel

**Requirements**:
- Component renders for a single joint (e.g., `gh_right`)
- Display format:
  ```
  GH Right (Glenohumeral)
  Q-Space: [q0: 15.2°, q1: 42.8°, q2: -5.3°]
  Clinical: Elevation: 42.8° | Plane: 15.2° | Rotation: -5.3°
  ROM Violations: None
  ```
- Props:
  - `jointId: string` (e.g., 'gh_right')
  - `biomechState: BiomechState`
  - `showClinical?: boolean` (default: true)
- Use `shoulderMapping.ghToClinical()` for clinical angles
- Highlight ROM violations in red if coordinate exceeds constraints

**Styling**:
- Compact, monospace font for numbers
- Color-coded: green (safe), yellow (near limit), red (violation)
- Collapsible per joint (expand/collapse)

**Testing**:
- Storybook: Mock `BiomechState` with sample joint states
- Visual: Verify formatting and color coding

---

### Group B: ROM Constraint Migration
**Priority**: High  
**Estimated Complexity**: Medium-High  
**Dependencies**: Task A1 (BiomechState), Task A2 (integration)

#### Task B1: Create Coordinate-Level ROM Validator
**File**: `src/biomech/validation/coordinateValidator.ts`  
**Purpose**: Replace bone-level ROM checks with coordinate-level checks

**Requirements**:
- `validateJointState(joint: JointDef, state: JointState): ROMViolation[]`
  - Check each coordinate (q0, q1, q2) against `coordinate.range`
  - Return violations with:
    - `coordinateIndex: 0 | 1 | 2`
    - `coordinateName: string` (e.g., 'elevation')
    - `currentValue: number` (in degrees)
    - `minValue: number`, `maxValue: number`
    - `severity: 'warning' | 'error'` (warning if within 5° of limit)
- `validateModelState(modelState: ModelState): Map<string, ROMViolation[]>`
  - Validate all joints
  - Return map of jointId → violations

**Advantages Over Bone-Level**:
- Respects anatomical DOF (GH elevation is q1, not Euler Y)
- Works with ST + GH separation (old system can't handle scapula)
- Coordinate-specific feedback ("GH elevation too high" vs "RightArm rotation X violated")

**Testing**:
- Unit test: Create joint state with q1 = 170° (exceeds GH elevation max 160°)
- Assert violation returned with correct coordinate name and range

---

#### Task B2: Add Coordinate Clamping Option
**File**: `src/biomech/engine/qSpaceEngine.ts` (enhancement)  
**Purpose**: Optionally clamp coordinates to ROM during `applyCoordinatesToSkeleton()`

**Requirements**:
- Add `clampToROM: boolean` parameter to `applyCoordinatesToSkeleton()`
- If enabled, call `clampCoordinate()` before converting to quaternion
- Store clamped vs unclamped values in `JointState` for comparison:
  ```typescript
  interface JointState {
    // ... existing fields
    coordinates_clamped?: [number, number, number];
    was_clamped: boolean;
  }
  ```
- Update `computeJointState()` to populate clamped coordinates

**Use Cases**:
- **User input**: Clamp when user drags bone (prevent invalid poses)
- **Animation playback**: Do NOT clamp (preserve original animation)
- **IK solve**: Clamp during iteration to respect constraints

**Testing**:
- Unit test: Create joint state with q1 = 170°, apply with clamp enabled
- Assert resulting quaternion matches q1 = 160° (max elevation)

---

#### Task B3: Dual-Mode ROM Panel
**File**: `src/components/viewer/debug/RangeOfMotionPanel.tsx` (enhancement)  
**Purpose**: Show both old bone-level and new coordinate-level ROM side-by-side

**Requirements**:
- Add toggle: "ROM Mode: Bone-Level | Coordinate-Level | Both"
- When "Both" selected:
  - Left column: Existing bone Euler angles (from `constraintValidator.ts`)
  - Right column: Q-space coordinates (from `CoordinateDisplay.tsx`)
- When "Coordinate-Level" only:
  - Show all joints from `joints.ts` (st_right, gh_right, elbow_right, etc.)
  - Use `CoordinateDisplay` component for each
- Add scapulohumeral rhythm metric for shoulder:
  ```
  Scapulohumeral Rhythm (Right)
  GH:ST Ratio: 2.3:1 (Normal: 2.0 ± 0.3)
  GH Elevation: 85°
  ST Upward Rotation: 37°
  Status: ✓ Normal
  ```

**Styling**:
- Split-pane layout for "Both" mode
- Highlight mismatches between bone and coordinate violations (for debugging migration)

**Testing**:
- Manual: Load Neutral.glb, raise arm to 90° abduction
- Verify GH elevation ≈ 60-80°, ST upward ≈ 20-30°, ratio ≈ 2:1

---

### Group C: Advanced Features
**Priority**: Medium  
**Estimated Complexity**: Medium  
**Dependencies**: Tasks A1-A3, B1-B2

#### Task C1: Implement Soft Constraints for Scapulohumeral Rhythm
**File**: `src/biomech/validation/shoulderRhythmValidator.ts`  
**Purpose**: Warn if GH:ST ratio deviates from 2:1 physiological norm

**Requirements**:
- `validateShoulderRhythm(ghState: JointState, stState: JointState): RhythmWarning | null`
- Extract GH elevation (q1) and ST upward rotation (q2)
- Compute ratio: `ghElevation / stUpwardRotation`
- If ratio < 1.7 or > 2.3: return warning with expected vs actual
- Consider GH elevation ranges:
  - 0-30°: ST should be minimal (0-10°)
  - 30-90°: Linear ratio ≈ 2:1
  - 90-160°: Ratio increases (GH dominates)

**Use Cases**:
- **PT education**: Show how scapula "sets" the shoulder
- **Animation QA**: Detect unrealistic shoulder motion in mocap data
- **Future IK**: Soft constraint to encourage natural rhythm

**Testing**:
- Unit test: GH = 90°, ST = 30° → ratio 3.0 → warning
- Unit test: GH = 90°, ST = 45° → ratio 2.0 → no warning

---

#### Task C2: Add Coordinate History Tracking
**File**: `src/biomech/engine/coordinateHistory.ts`  
**Purpose**: Record coordinate values over time for analysis

**Requirements**:
- `CoordinateHistory` class:
  - `record(jointId: string, timestamp: number, coordinates: [q0, q1, q2])`
  - `getHistory(jointId: string, timeRange?: [start, end]): HistoryEntry[]`
  - `clear()`, `export(): JSON`
- Fixed-size ring buffer (last 10 seconds at 60 FPS = 600 samples per joint)
- Use cases:
  - Plot coordinate trajectories over animation
  - Compute velocity/acceleration for dynamic analysis
  - Export for external biomechanics tools

**Integration**:
- Call `coordinateHistory.record()` in `BiomechState.update()`
- Add "Export Coordinate History" button in ROM panel

**Testing**:
- Unit test: Record 100 samples, verify ring buffer wraps correctly
- Integration test: Play 5-second animation, export JSON, verify timestamps

---

#### Task C3: Create OpenSim JSON Exporter
**File**: `src/biomech/export/openSimExporter.ts`  
**Purpose**: Export model to OpenSim-compatible JSON format

**Requirements**:
- `exportToOpenSim(modelState: ModelState): OpenSimJSON`
- JSON structure matches OpenSim 4.x format:
  ```json
  {
    "model": {
      "segments": [
        {"name": "thorax", "mass": 20.0, "inertia": [...], ...},
        {"name": "scapula_right", "mass": 0.5, ...}
      ],
      "joints": [
        {
          "name": "st_right",
          "parent": "thorax",
          "child": "scapula_right",
          "type": "BallJoint",
          "coordinates": [
            {"name": "st_tilt", "range": [-20, 30], "default_value": 0},
            ...
          ]
        }
      ]
    }
  }
  ```
- Include current coordinate values if `includeState: true`
- Validate against OpenSim schema (if available)

**Use Cases**:
- Export to OpenSim for detailed musculoskeletal simulation
- Verify coordinate system compatibility
- Cross-validate ROM constraints with literature

**Testing**:
- Manual: Export shoulder chain (ST + GH), import into OpenSim, verify hierarchy

---

### Group D: Testing & Validation
**Priority**: Critical  
**Estimated Complexity**: Medium  
**Dependencies**: All tasks A, B, C

#### Task D1: Create Validation Pose Suite
**File**: `public/models/animations/validation/` (new directory)  
**Purpose**: Reference poses for regression testing

**Requirements**:
- Create 8 GLB animations (static poses):
  1. `NeutralPose.glb`: T-pose, all joints at neutral (0°)
  2. `ShoulderAbd90.glb`: GH ≈ 60-80° elevation, scapular plane
  3. `ShoulderOverhead.glb`: GH ≈ 120-140° elevation
  4. `ShoulderIR90.glb`: GH 90° elevation, max internal rotation
  5. `ShoulderER90.glb`: GH 90° elevation, max external rotation
  6. `ElbowFlex90.glb`: Elbow flexion 90°, supination 0°
  7. `HipFlex90.glb`: Hip flexion 90°, neutral add/abd and rotation
  8. `KneeFlex90.glb`: Knee flexion 90°, neutral rotation
- Document expected coordinate values for each pose in `validation_targets.json`

**Testing**:
- Load each pose, compute joint states, compare to targets
- Assert coordinate values within ±5° of expected
- Generate validation report with pass/fail for each joint

---

#### Task D2: Automated ROM Validation Tests
**File**: `src/biomech/__tests__/romValidation.test.ts`  
**Purpose**: Regression tests for coordinate-level ROM constraints

**Requirements**:
- Test suite:
  - `it('should validate GH elevation range 0-160°')`
  - `it('should detect violation when GH elevation > 160°')`
  - `it('should validate ST upward rotation range 0-60°')`
  - `it('should compute scapulohumeral rhythm correctly')`
  - `it('should match clinical norms for shoulder abduction')`
- Use validation pose suite as input
- Mock `BiomechState` with known joint states
- Assert violations match expected

**Coverage Target**: >90% for validation logic

**CI Integration**:
- Run on every commit to `main` and PRs
- Fail if any validation pose exceeds tolerance

---

#### Task D3: Compare Bone-Level vs Coordinate-Level ROM
**File**: `src/biomech/__tests__/migrationValidation.test.ts`  
**Purpose**: Ensure parity between old and new constraint systems during migration

**Requirements**:
- Load same animation twice:
  - First: Compute bone Euler violations (old system)
  - Second: Compute coordinate violations (new system)
- Compare violation counts and locations
- Expected mismatches:
  - Shoulder: New system catches ST violations (old can't)
  - Elbow: Should match exactly (both are hinge joints)
- Document mismatches in `MIGRATION_NOTES.md`

**Acceptance Criteria**:
- <10% difference in violation count for non-shoulder joints
- Shoulder violations should be MORE accurate in new system

---

### Group E: Documentation & Handoff
**Priority**: High  
**Estimated Complexity**: Low  
**Dependencies**: All tasks complete

#### Task E1: Update Developer Documentation
**Files**: 
- `docs/COORDINATE_SYSTEM.md` (new)
- `docs/SHOULDER_BIOMECHANICS.md` (update)
- `README.md` (update)

**Requirements**:
- `COORDINATE_SYSTEM.md`:
  - Overview of segment-joint-coordinate model
  - Q-space math (quaternions, Euler sequences)
  - Clinical mapping rationale
  - Feature flag usage and migration path
- `SHOULDER_BIOMECHANICS.md`:
  - Add Phase 2 integration details
  - Document ST + GH separation in runtime
  - Scapulohumeral rhythm monitoring
- `README.md`:
  - Add "Biomechanics Engine" section
  - Link to coordinate system docs
  - Update feature flag instructions

---

#### Task E2: Create Migration Guide
**File**: `docs/MIGRATION_GUIDE.md`  
**Purpose**: Help developers transition from bone-level to coordinate-level ROM

**Requirements**:
- Side-by-side comparison:
  | Old (Bone-Level) | New (Coordinate-Level) |
  |------------------|------------------------|
  | `bone.rotation.y > maxY` | `jointState.coordinates[1] > coord1.range[1]` |
  | Euler angles (gimbal lock) | Quaternions (robust) |
  | Shoulder: 1 joint (wrong) | Shoulder: ST + GH (correct) |
- Code examples for common tasks:
  - Get GH elevation angle
  - Check ROM violation
  - Clamp coordinates during IK
  - Display clinical angles in UI
- Troubleshooting:
  - "Coordinates not updating" → Check feature flag enabled
  - "Shoulder angles wrong" → Verify neutral pose calibrated
  - "Scapula not moving" → Check ST joint defined

---

#### Task E3: Record Demo Video
**Deliverable**: 5-minute video walkthrough  
**Audience**: PT collaborators, future developers

**Script**:
1. **Intro (30s)**: Problem statement (Mixamo shoulder chain wrong)
2. **Architecture (1m)**: Segments → Joints → Coordinates (show diagram)
3. **Demo (2m)**: 
   - Load Neutral.glb, show calibration
   - Raise arm to 90° abduction
   - Show ROM panel: GH 60-80°, ST 20-30°, ratio 2:1
   - Trigger violation (overhead reach), show warning
4. **Clinical Value (1m)**: PT education, EMR-Sim feedback
5. **Future (30s)**: Phase 3 (other joints), IMU integration

**Tools**: OBS Studio, screen recording, voiceover

---

## Estimated Timeline

| Group | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **A: Runtime Integration** | A1, A2, A3 | 2-3 days | Critical |
| **B: ROM Migration** | B1, B2, B3 | 3-4 days | High |
| **C: Advanced Features** | C1, C2, C3 | 2-3 days | Medium |
| **D: Testing** | D1, D2, D3 | 2-3 days | Critical |
| **E: Documentation** | E1, E2, E3 | 1-2 days | High |
| **Total** | 15 tasks | **10-15 days** | - |

**Phases**:
- **Week 1**: Groups A + B (runtime integration + ROM migration)
- **Week 2**: Groups C + D (advanced features + testing)
- **Week 3**: Group E + buffer (docs + polish)

---

## Success Metrics

### Functional
- ✅ Coordinate engine initializes without errors
- ✅ ROM panel displays q-space and clinical angles
- ✅ Validation poses match expected coordinates (±5°)
- ✅ Scapulohumeral rhythm computes correctly (GH:ST ≈ 2:1)
- ✅ Feature flag works (old system still functional when disabled)

### Performance
- ✅ Coordinate update <1ms per frame (60 FPS target)
- ✅ ROM validation <0.5ms per joint
- ✅ No memory leaks during animation playback

### Clinical
- ✅ GH elevation range matches literature (0-160°)
- ✅ ST upward rotation matches scapulohumeral rhythm norms
- ✅ Clinical angle labels match PT terminology

---

## Risk Mitigation

### Risk: Coordinate engine slows frame rate
**Mitigation**:
- Profile `BiomechState.update()` with Chrome DevTools
- Optimize quaternion operations (reuse objects, avoid allocations)
- Consider Web Workers for validation (off main thread)

### Risk: Neutral pose calibration fails for some animations
**Mitigation**:
- Add calibration status indicator in UI
- Allow manual re-calibration via button
- Fallback to identity quaternions if calibration missing

### Risk: Old and new ROM systems disagree
**Mitigation**:
- Task D3 explicitly compares both systems
- Document expected mismatches (shoulder ST joint)
- Keep old system functional until migration validated

---

## Phase 3 Preview (Future Work)

After Phase 2 complete:
- **Hip, Knee, Ankle Mapping**: Implement Grood & Suntay for knee (flexion, ad/abduction, IR/ER)
- **IK Integration**: Use coordinate-level constraints during IK solve
- **EMR-Sim Feedback**: Real-time clinical angle feedback to AI model
- **IMU Sensor Fusion**: Map sensor quaternions directly to q-space (bypass Mixamo)
- **Clavicle Virtual Frame**: Add ST joint origin as virtual segment

---

## Appendix: Key Files Reference

### Phase 1 (Complete)
- `src/biomech/model/types.ts`: Type definitions
- `src/biomech/model/segments.ts`: Anatomical segment registry
- `src/biomech/model/joints.ts`: Joint definitions (ST + GH)
- `src/biomech/engine/segmentRegistry.ts`: Runtime segment lookup
- `src/biomech/engine/qSpaceEngine.ts`: Coordinate math
- `src/biomech/mapping/shoulderMapping.ts`: Clinical angles

### Phase 2 (To Create)
- `src/biomech/engine/biomechState.ts`: State manager (Task A1)
- `src/biomech/validation/coordinateValidator.ts`: ROM validator (Task B1)
- `src/biomech/validation/shoulderRhythmValidator.ts`: Rhythm checker (Task C1)
- `src/biomech/engine/coordinateHistory.ts`: History tracking (Task C2)
- `src/biomech/export/openSimExporter.ts`: OpenSim JSON export (Task C3)
- `src/components/viewer/debug/CoordinateDisplay.tsx`: UI component (Task A3)
- `public/models/animations/validation/*.glb`: Validation poses (Task D1)

### Phase 2 (To Modify)
- `src/components/viewer/InteractiveBoneController.tsx`: Hook biomech state (Task A2)
- `src/components/viewer/debug/RangeOfMotionPanel.tsx`: Dual-mode display (Task B3)
- `src/biomech/engine/qSpaceEngine.ts`: Add clamping (Task B2)

---

**Document Version**: 1.0  
**Created**: Phase 1 completion  
**Next Review**: After Task A2 (runtime integration complete)
