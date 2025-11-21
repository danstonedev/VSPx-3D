# VSPx 3D Viewer Demo - AI Coding Instructions

## 1. Project Overview

This is a standalone 3D biomechanics viewer built with **React**, **Vite**, **Three.js**, and **React Three Fiber (R3F)**. It features a custom **Biomechanics Engine** for analyzing joint angles and enforcing constraints on a 3D human model.

## 2. Architecture & Key Components

### Core Layers

1.  **UI Layer (React)**: Managed by `ViewerStateProvider` (`src/components/viewer/state/viewerState.tsx`). Uses Context + Reducer pattern for global state (playback, IK mode, selection).
2.  **3D Layer (R3F)**:
    - `Viewer3D.tsx`: Main canvas entry point.
    - `Scene.tsx`: Sets up lights, camera, and environment.
    - `HumanFigure.tsx`: Loads the GLB model and handles animation playback.
    - `InteractiveBoneController.tsx`: The bridge between 3D scene and logic. Handles IK solving, bone dragging, and updates the Biomech Engine.
3.  **Biomechanics Engine (`src/biomech/`)**:
    - `BiomechState.ts`: Singleton-like class managing the biomechanical model. Handles initialization, neutral pose calibration, and per-frame updates.
    - `SegmentRegistry.ts`: Maps Three.js bones to biomechanical segments.
    - `qSpaceEngine.ts`: Core math for joint angle calculations.

### Data Flow

- **State**: `ViewerState` holds references to `BiomechState` and `Skeleton`.
- **Updates**: `InteractiveBoneController` runs a `useFrame` loop to update `BiomechState` and sync IK targets.
- **Events**: User interactions (clicks, drags) are captured in `InteractiveBoneController` and dispatched to `ViewerState`.

## 3. Critical Workflows

### Development

- **Start Server**: `npm run dev` (Runs on port 3000).
- **Restart Server**: `npm run dev:restart` (Kills port 3000 and restarts - useful if Vite hangs).
- **Linting**: `npm run lint`.

### Testing

- **Run Tests**: `npm test` (Uses Vitest).
- **Test Files**: Located in `__tests__` directories next to components (e.g., `src/components/viewer/__tests__`).

## 4. Project Conventions & Patterns

### 3D & Biomechanics

- **Bone Naming**: Follows Mixamo rig conventions (e.g., `mixamorig1Hips`, `mixamorig1LeftUpLeg`).
- **Neutral Pose**: The system relies on a "Neutral Pose" calibration (T-pose) to calculate joint angles correctly. This is handled in `BiomechState.calibrateNeutral()`.
- **Coordinate Systems**:
  - **World**: Three.js standard (Y-up).
  - **Joints**: Local coordinate systems defined in `src/biomech/model/joints.ts`.
- **Goniometers**: Visual debug tools (`DigitalGoniometer.tsx`) use specific rotations/scales to match clinical views (e.g., Shoulder Green plane rotated 90°).

### State Management

- **Access**: Use `useViewerState()` for reading and `useViewerDispatch()` for actions.
- **Action Types**: String literals namespaced by domain (e.g., `playback/setAnimation`, `ik/setSelectedBone`).

### File Structure

- `src/components/viewer/`: UI and 3D components specific to the viewer.
- `src/biomech/`: Pure logic/math for biomechanics (no React dependencies where possible).
- `public/models/`: GLB assets (animations and base mesh).

## 5. Integration Points

- **Animation**: `HumanFigure.tsx` uses `useAnimations` from `@react-three/drei`.
- **IK Solving**: Custom `RotationCompensatedIKSolver` and `CCDIKHelper` in `InteractiveBoneController.tsx`.
- **Debug Tools**: `DigitalGoniometer`, `RangeOfMotionPanel` integrate directly with `BiomechState` to display real-time data.

## 6. Detailed Component Logic

### Biomechanics Engine

- **SegmentRegistry (`src/biomech/engine/segmentRegistry.ts`)**:
  - Maps anatomical segment IDs (e.g., `femur_right`) to Three.js bones (`mixamorig1RightUpLeg`).
  - Supports "Virtual Frames" for segments not directly represented by bones (e.g., thorax center).
  - Used by `BiomechState` to resolve joint endpoints.
- **Q-Space Engine (`src/biomech/engine/qSpaceEngine.ts`)**:
  - Calculates joint angles using quaternion math relative to a calibrated neutral pose.
  - `computeRelativeQuaternion`: Calculates child orientation in parent frame.
  - `computeDeviationQuaternion`: Calculates rotation from neutral pose.
  - `quatToCoordinates`: Decomposes deviation into Euler angles based on joint-specific orders (e.g., `YZX` for Shoulder, `ZXY` for Elbow).
- **Joint Definitions (`src/biomech/model/joints.ts`)**:
  - Defines the kinematic chain (parent/child segments).
  - Specifies Euler rotation orders critical for correct angle extraction.
  - Defines ROM limits and coordinate axes (X/Y/Z).

### Interactive Bone Controller (`src/components/viewer/InteractiveBoneController.tsx`)

- **Initialization**:
  - Captures "Bind Pose" (T-pose) on startup.
  - Initializes `BiomechState` and calibrates neutral pose.
  - Creates IK targets (invisible bones) for end-effectors (hands, feet).
- **Interaction Loop**:
  - Uses `useBoneInteraction` hook to handle raycasting and drag events.
  - On drag: Updates IK target position -> Solves IK -> Updates bone matrices -> Updates `BiomechState`.
  - **Scapulohumeral Rhythm**: Custom logic in `applyShoulderRhythm` automatically rotates the clavicle based on humerus elevation (2:1 ratio).
- **IK Solver**:
  - Uses `RotationCompensatedIKSolver` to handle the root armature's 90° rotation quirk common in Mixamo rigs.
  - Chains are defined in `src/components/viewer/utils/ikSolverConfig.ts`.

### Visual Debug Tools

- **DigitalGoniometer (`src/components/viewer/debug/DigitalGoniometer.tsx`)**:
  - Renders 3 orthogonal planes (Red=X, Green=Y, Blue=Z) attached to a bone.
  - **Visual Calibration**: Uses `rotation` and `scale` props to align planes with clinical expectations (e.g., flipping axes for left/right symmetry).
  - **Data Source**: Prioritizes `BiomechState` angles; falls back to raw Euler angles if uncalibrated.

## 7. System Inventory

### Bones (Skeleton Map)

Standardized names mapped to Mixamo rig (defined in `src/components/viewer/utils/skeletonMap.ts`):

- **Core**: Hips, Spine, Spine1, Spine2, Neck, Head
- **Arms**: Left/Right Shoulder (Clavicle), Arm (Humerus), ForeArm (Radius/Ulna), Hand (Wrist)
- **Legs**: Left/Right UpLeg (Femur), Leg (Tibia), Foot (Ankle), ToeBase

### Joints (Biomech Model)

Defined in `src/biomech/model/joints.ts`. Note the separation of the Shoulder Complex:

- **Shoulder Complex**: `st_right`/`st_left` (Scapulothoracic), `gh_right`/`gh_left` (Glenohumeral)
- **Arm**: `elbow_right`/`elbow_left`, `wrist_right`/`wrist_left`
- **Hand**: `thumb_[side]_cmc`, `[finger]_[side]_mcp` (e.g., `index_right_mcp`)
- **Leg**: `hip_right`/`hip_left`, `knee_right`/`knee_left`, `ankle_right`/`ankle_left`, `mtp_right`/`mtp_left`
- **Spine**: `lumbar_spine`, `thoracic_spine`, `thoracic_upper_spine`, `cervical_spine`, `head`

### Visual Tools

Located in `src/components/viewer/debug/`:

- **DigitalGoniometer**: Visualizes joint planes (Red=X, Green=Y, Blue=Z) and current angles.
- **RangeOfMotionPanel**: UI panel displaying real-time joint data, limits, and locking controls.
- **CoordinateDisplay**: Helper to visualize local coordinate axes of specific bones.
- **DebugOverlay**: General purpose overlay for system stats.

## 8. Refactoring & Modernization Inventory

### State Management

- **Pattern**: `Context` + `useReducer` (`src/components/viewer/state/viewerState.tsx`).
- **Slices**: `playback`, `mode`, `ik`, `metrics`.
- **Caution**: The `ik` slice contains non-serializable, mutable Three.js objects (`THREE.Bone`, `THREE.Skeleton`, `BiomechState`). Avoid deep cloning these in reducers; treat them as references.

### Custom Hooks

Located in `src/components/viewer/hooks/`:

- **Interaction**: `useBoneInteraction` (Drag/drop logic, raycasting).
- **Animation**: `useAnimationClips`, `usePlaybackAPI`, `useAnimationState`.
- **Model**: `useHumanFigure` (GLTF loading, skeleton setup), `useModelMetrics`.

### Utility Clusters

Located in `src/components/viewer/utils/`:

- **IK & Solvers**: `RotationCompensatedIKSolver.ts` (Custom solver), `ikSolverConfig.ts` (Chain definitions).
- **Skeleton**: `skeletonMap.ts` (Bone naming), `skeletonAnalyzer.ts`, `skeletonDiagnostics.ts`.
- **Scene**: `cameraFramer.ts`, `sceneLayout.ts`, `sceneScale.ts`.
- **Legacy/Experimental**: `movementLibrary.ts`, `movementSystem.ts`, `promptRouter.ts` (Remnants of text-to-animation features).

### Core Types

- **Biomechanics**: `src/biomech/model/types.ts` (Defines `SegmentDef`, `JointDef`, `CoordinateDef`).
- **Global**: `src/global.d.ts` (Three.js extensions).
