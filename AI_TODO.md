# Task Plan

1. Recompute bind pose after model normalization, ensuring skeleton.boneInverses align with the scaled rig.
2. Capture and restore a normalized T-pose snapshot (bone transforms + root matrix) for IK resets, and parent IK targets under the Armature.
3. Re-run manual verification (enter IK, drag, reset) and document results.
