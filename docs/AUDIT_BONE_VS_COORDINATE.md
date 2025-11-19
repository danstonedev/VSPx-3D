# Audit Report: Bone-Level vs. Coordinate-Level Systems

**Date:** November 19, 2025
**Subject:** Discrepancy Analysis between Visual "Bone Level" Estimates and "Coordinate Level" Engine

## 1. Executive Summary

The application currently operates with two parallel "sources of truth" for joint angles, which is the primary cause of the observed "drift" and confusion:

1.  **Coordinate Level (The Engine / Gold Standard):** Defined in `src/biomech/model/joints.ts` and managed by `BiomechState`. This system drives the skeleton using precise Euler orders and axis definitions.
2.  **Bone Level (The Visualizer / Legacy):** Defined in `src/components/viewer/biomech/jointAngles.ts`. This system *reads* the skeleton's current pose and attempts to reverse-engineer the angles for display.

**Critical Finding:** There is a fundamental configuration mismatch between these two systems. Specifically, the **Euler Rotation Order** defined for the shoulders differs between the engine (`XZY`) and the visualizer (`XYZ`). This causes mathematical divergence (drift) whenever the joint is not in a neutral position.

## 2. System Architecture Comparison

| Feature | Coordinate Level (Engine) | Bone Level (Visualizer) |
| :--- | :--- | :--- |
| **Source File** | `src/biomech/model/joints.ts` | `src/components/viewer/biomech/jointAngles.ts` |
| **Role** | **Driver**: Calculates angles -> Updates Bone | **Observer**: Reads Bone -> Calculates Angles |
| **Data Source** | Internal State (`q` values) | `THREE.Bone.worldQuaternion` |
| **Shoulder Euler Order** | **`XZY`** | **`XYZ`** (Mismatch!) |
| **Flexion Axis** | Y-Axis | Y-Axis (Hardcoded mapping) |
| **Abduction Axis** | X-Axis | X-Axis (Hardcoded mapping) |
| **Rotation Axis** | Z-Axis | Z-Axis (Hardcoded mapping) |

## 3. Detailed Analysis of the "Drift"

The "drift" occurs because of the **Euler Order Mismatch**.

1.  **The Action:** You move the Flexion slider (Coordinate Level).
2.  **The Engine:** Applies rotation to the bone using order **XZY**.
    *   It calculates the final Quaternion based on: Rotate X (Abd) -> Rotate Z (Rot) -> Rotate Y (Flex).
3.  **The Visualizer:** Reads that final Quaternion.
4.  **The Calculation:** It attempts to decompose that Quaternion back into angles using order **XYZ**.
    *   Because rotation is non-commutative (order matters), decomposing an XZY-created quaternion into XYZ angles results in different values for X, Y, and Z.
5.  **The Result:** You move "Flexion" (Engine Y), but the Visualizer sees changes in "Abduction" (Visualizer X) and "Rotation" (Visualizer Z) as well. This is mathematically inevitable when Euler orders do not match.

## 4. Specific Configuration Audit (Right Shoulder)

### Coordinate Level (`joints.ts`)
*   **Joint ID:** `gh_right`
*   **Euler Order:** `XZY`
*   **Flexion:** Axis Y (Index 1)
*   **Abduction:** Axis X (Index 0)
*   **Rotation:** Axis Z (Index 2)

### Bone Level (`jointAngles.ts`)
*   **Joint ID:** `shoulder`
*   **Euler Order:** `XYZ` **(CRITICAL ERROR)**
*   **Mapping Logic:**
    *   `flexExt = -deg(euler.y)`
    *   `abdAdd = -deg(euler.x)`
    *   `rotation = deg(euler.z)`

## 5. Recommendations

To establish the Coordinate Level as the sole "Gold Standard" and eliminate drift:

### Immediate Fixes
1.  **Align Euler Orders:** Update `src/components/viewer/biomech/jointAngles.ts` to use `XZY` for the shoulder, matching `joints.ts`.
2.  **Align Axis Mapping:** Ensure `jointAngles.ts` mapping logic matches the new `joints.ts` configuration (Flex=Y, Abd=X, Rot=Z).

### Strategic Refactoring
1.  **Single Source of Truth:** The `RangeOfMotionPanel` should prioritize displaying values directly from `BiomechState` (the Engine) when available. The "Bone Level" calculation should only be a fallback for uncalibrated skeletons.
2.  **Deprecate Legacy Logic:** Eventually remove the hardcoded `JOINT_CONFIGS` in `jointAngles.ts` and instead generate them dynamically from `joints.ts` to ensure they never drift apart again.

## 6. Next Steps

I am ready to apply the **Immediate Fixes** to `src/components/viewer/biomech/jointAngles.ts` to align it with the engine. This should immediately stop the visual drift.

## 7. Expert Biomechanical Review (OpenSim/ISB Perspective)

**Reviewer:** Biomechanics Subagent
**Status:** Critical Concerns Identified

While aligning the Euler orders will fix the immediate "drift," a deeper analysis of the **Engine Configuration** (`joints.ts`) suggests potential biomechanical flaws regarding the Mixamo rig structure:

### A. Axis Mapping Anomaly
In a standard Mixamo T-Pose, the Humerus bone vector typically aligns with the **X-Axis**.
*   **Standard Behavior:**
    *   Rotation around **X** = Axial Rotation (Internal/External).
    *   Rotation around **Z** = Abduction/Adduction (Vertical Plane).
    *   Rotation around **Y** = Flexion/Extension (Horizontal Plane).
*   **Current Engine Config:**
    *   Maps **Abduction to X**.
    *   **Risk:** Unless this specific rig has non-standard bone orientations, mapping Abduction to X will likely result in **Axial Rotation** (twisting) instead of lifting the arm. The user might be seeing "motion" but it might be the wrong kind.

### B. Gimbal Lock Risk with `XZY`
The current Engine order is `XZY` (Rotate X -> Rotate Z -> Rotate Y).
*   If **Z** corresponds to Abduction (as per standard T-pose mechanics), and the "Resting Pose" (arms at sides) represents a ~90° rotation from T-pose...
*   Placing the Abduction axis in the **middle** of the Euler sequence (the 'Z' in `XZY`) creates a high risk of **Gimbal Lock** when the arm is at the side (90°).
*   **Consequence:** At rest, the Flexion (Y) and Rotation (X) axes may align, causing erratic behavior or loss of a degree of freedom.

### C. Recommendation
1.  **Verify Bone Orientation:** Before finalizing the "Gold Standard," we must confirm if the Humerus local X-axis points along the bone.
2.  **Consider `YXZ` or `ZXY`:** If Z is Abduction, it should ideally be the *first* or *last* rotation to avoid singularity in the resting position, or we must ensure the range of motion doesn't hit the singularity.
3.  **Proceed with Visualizer Fix (Safe):** Aligning `jointAngles.ts` to `XZY` is safe and necessary to stop the drift *for the current configuration*, but be aware that the configuration itself might need a future overhaul.
