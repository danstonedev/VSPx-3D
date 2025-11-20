# Task Plan

1. [x] Recompute bind pose after model normalization, ensuring skeleton.boneInverses align with the scaled rig. (Verified in `InteractiveBoneController.tsx` via diagnostic check)
2. [x] Capture and restore a normalized T-pose snapshot (bone transforms + root matrix) for IK resets, and parent IK targets under the Armature. (Implemented in `InteractiveBoneController.tsx`)
3. [ ] Re-run manual verification (enter IK, drag, reset) and document results.
