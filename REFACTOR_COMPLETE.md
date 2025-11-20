# Refactoring Complete: Skeleton Map Implementation

## Overview
To address the "Hardcoded Asset Dependencies" weakness identified in the SWOT analysis, we have introduced a `SKELETON_MAP` abstraction layer. This decouples the application logic from the specific bone names of the Mixamo rig, making the system more robust and easier to adapt to other rigs in the future.

## Changes Implemented

### 1. New Abstraction Layer
- **Created `src/components/viewer/utils/skeletonMap.ts`**:
  - Defines a `SKELETON_MAP` constant that maps logical bone names (e.g., `LeftArm`) to rig-specific names (e.g., `mixamorig1LeftArm`).
  - Serves as the Single Source of Truth for bone naming.

### 2. Codebase Refactoring
The following files were updated to use `SKELETON_MAP` instead of hardcoded string literals:

- **`src/components/viewer/utils/jointLabels.ts`**:
  - Updated `JOINT_MOVEMENT_LABELS`, `JOINT_HANDLE_NAMES`, and `DIAGNOSTIC_BONES`.

- **`src/components/viewer/utils/ikSolverConfig.ts`**:
  - Updated IK chain definitions (`chains` object).

- **`src/components/viewer/constraints/jointConstraints.ts`**:
  - Updated the `JOINT_CONSTRAINTS` object keys and `boneName` properties.
  - Used computed property names (e.g., `[SKELETON_MAP.LeftArm]`) for type safety.

- **`src/components/viewer/biomech/jointAngles.ts`**:
  - Updated `JOINT_CONFIGS` array to use mapped bone names.

### 3. Test Updates
Test files were updated to ensure they validate the refactored code correctly:

- **`src/components/viewer/constraints/__tests__/elbowBiomechanics.test.ts`**:
  - Replaced hardcoded strings with `SKELETON_MAP` references.
  - Verified 47/47 tests passed.

- **`src/components/viewer/utils/__tests__/shoulderCalibration.test.ts`**:
  - Replaced hardcoded strings with `SKELETON_MAP` references.
  - Verified 15/15 tests passed.

## Verification
- Ran `npm test` to validate changes.
- Relevant tests passed successfully.
- Some unrelated test failures persist (e.g., missing dependencies for other tests), but do not impact the validity of this refactor.

## Next Steps
- Future work involving bone access should strictly import and use `SKELETON_MAP`.
- If a new rig is introduced, only `skeletonMap.ts` needs to be updated (or a new map created/swapped).
