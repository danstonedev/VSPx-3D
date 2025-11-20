# Bind Pose & T-Pose Snapshot Updates

## Overview
Addressed the TODO items regarding bind pose recomputation and T-pose snapshotting to ensure robust IK resets and correct skinning after model normalization.

## Changes Implemented

### 1. Armature Transform Capture
- **File**: `src/components/viewer/InteractiveBoneController.tsx`
- **Change**: Added `armatureBindPoseRef` to capture the transform (position, rotation, scale) of the Armature (skeleton root parent).
- **Reason**: `normalizeHumanModel` scales the Armature to normalize the model height. Previous logic only captured/restored bone local transforms, which would miss the Armature scale if it were ever modified or if the reset logic needed to enforce the normalized scale.
- **Mechanism**: 
  - `captureBindPose` now stores the Armature's world-relative properties (local to its parent, which is the Model group).
  - `restoreBindPose` restores these properties before restoring individual bone transforms.

### 2. Bone Inverse Verification
- **File**: `src/components/viewer/InteractiveBoneController.tsx`
- **Change**: Added a diagnostic check during initialization.
- **Logic**: Computes `Bone.matrixWorld * Bone.inverseBindMatrix`. If the result is Identity, the inverses are correct for the current pose.
- **Outcome**: Logs `✅ Bone inverses verified` or `⚠️ Bone inverses mismatch`. This ensures that `normalizeHumanModel`'s call to `calculateInverses()` was successful and that no subsequent operations corrupted the state.

### 3. IK Target Parenting
- **Verification**: Confirmed that `src/components/viewer/utils/ikSolverConfig.ts` already parents IK targets to `skeleton.bones[0].parent` (the Armature). This ensures targets move with the model if the Armature is transformed.

## Verification Steps (Manual)
1. Load the application.
2. Open the Console.
3. Look for "✅ Bone inverses verified".
4. Enter IK Mode.
5. Drag bones around.
6. Click "Reset" (or toggle IK off/on).
7. Verify the model returns to the exact T-pose and size as loaded.
