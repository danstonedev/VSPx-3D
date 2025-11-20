/**
 * Joint Definitions
 * 
 * Defines all joints in the biomechanical model with correct anatomical parent-child relationships.
 * 
 * CRITICAL SHOULDER CORRECTION:
 * - ST (scapulothoracic): thorax → scapula (3-DOF)
 * - GH (glenohumeral): scapula → humerus (3-DOF)
 * 
 * This fixes the Mixamo default where humerus appears to connect directly to thorax.
 * Now scapular motion (ST) and humeral motion (GH) are properly separated.
 */

import { JointDef } from './types';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Complete joint registry
 */
export const JOINTS: Record<string, JointDef> = {
  // ============================================================================
  // RIGHT SHOULDER COMPLEX (ST + GH)
  // ============================================================================

  st_right: {
    id: 'st_right',
    displayName: 'Right Scapulothoracic',
    parentSegment: 'thorax',
    childSegment: 'scapula_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      {
        id: 'st_r_tilt',
        jointId: 'st_right',
        displayName: 'ST Tilt (Anterior/Posterior)',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'st_r_rotation',
        jointId: 'st_right',
        displayName: 'ST Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'st_r_upward',
        jointId: 'st_right',
        displayName: 'ST Upward/Downward Rotation',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 60 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  gh_right: {
    id: 'gh_right',
    displayName: 'Right Glenohumeral',
    parentSegment: 'scapula_right',
    childSegment: 'humerus_right',
    type: 'ball',
    eulerOrder: 'YZX', // ISB-style: Plane -> Elevation -> Axial
    side: 'right',
    coordinates: [
      {
        id: 'gh_r_plane',
        jointId: 'gh_right',
        displayName: 'GH Plane of Elevation',
        axis: 'Y', // Y-axis sets the plane (0=Abduction, 90=Flexion)
        index: 1,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 135 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'gh_r_elevation',
        jointId: 'gh_right',
        displayName: 'GH Elevation',
        axis: 'Z', // Z-axis lifts the arm within the plane
        index: 2,
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, // -90=Down, 0=Horizontal, 90=Up (approx)
        clamped: true,
        locked: false,
        invert: true, // +Z is Down for Right Arm, so invert for Up
      },
      {
        id: 'gh_r_rotation',
        jointId: 'gh_right',
        displayName: 'GH Axial Rotation',
        axis: 'X', // X-axis is long axis
        index: 0,
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT SHOULDER COMPLEX (ST + GH)
  // ============================================================================

  st_left: {
    id: 'st_left',
    displayName: 'Left Scapulothoracic',
    parentSegment: 'thorax',
    childSegment: 'scapula_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      {
        id: 'st_l_tilt',
        jointId: 'st_left',
        displayName: 'ST Tilt (Anterior/Posterior)',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'st_l_rotation',
        jointId: 'st_left',
        displayName: 'ST Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'st_l_upward',
        jointId: 'st_left',
        displayName: 'ST Upward/Downward Rotation',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 60 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  gh_left: {
    id: 'gh_left',
    displayName: 'Left Glenohumeral',
    parentSegment: 'scapula_left',
    childSegment: 'humerus_left',
    type: 'ball',
    eulerOrder: 'YZX', // ISB-style: Plane -> Elevation -> Axial
    side: 'left',
    coordinates: [
      {
        id: 'gh_l_plane',
        jointId: 'gh_left',
        displayName: 'GH Plane of Elevation',
        axis: 'Y', // Y-axis sets the plane
        index: 1,
        neutral: 0,
        range: { min: -135 * DEG_TO_RAD, max: 45 * DEG_TO_RAD }, // Signs flipped for Left
        clamped: true,
        locked: false,
        invert: true,
      },
      {
        id: 'gh_l_elevation',
        jointId: 'gh_left',
        displayName: 'GH Elevation',
        axis: 'Z', // Z-axis lifts the arm
        index: 2,
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD },
        clamped: true,
        locked: false,
        invert: false, // Check sign for Left
      },
      {
        id: 'gh_l_rotation',
        jointId: 'gh_left',
        displayName: 'GH Axial Rotation',
        axis: 'X', // X-axis is long axis
        index: 0,
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT ELBOW
  // ============================================================================

  /**
   * ELBOW BIOMECHANICS (Gold Standard / ISB Definition):
   * The elbow complex consists of three joints:
   * 1. Humeroulnar Joint (HUJ): Hinge joint for Flexion/Extension.
   * 2. Humeroradial Joint (HRJ): Gliding joint, moves with HUJ.
   * 3. Proximal Radioulnar Joint (PRUJ): Pivot joint for Pronation/Supination.
   * 
   * MODELING STRATEGY:
   * In a single-bone forearm rig (Mixamo), we map these to a 3-DOF joint:
   * - Primary Axis (Z): Flexion/Extension (Humeroulnar).
   * - Long Axis (X): Pronation/Supination (Radioulnar).
   * - Floating Axis (Y): Varus/Valgus (Carrying Angle & Laxity).
   * 
   * EULER ORDER 'ZXY' (Flexion -> Pronation -> Varus):
   * We prioritize Flexion (Z) as the frame-defining rotation.
   * Then Pronation (X) occurs along the displaced long axis.
   * Finally Varus/Valgus (Y) is the small deviation/laxity.
   */
  elbow_right: {
    id: 'elbow_right',
    displayName: 'Right Elbow',
    parentSegment: 'humerus_right',
    childSegment: 'radius_right',
    type: 'ball',
    eulerOrder: 'ZXY', // Critical: Flexion (Z) first to establish the plane
    side: 'right',
    coordinates: [
      {
        id: 'elbow_r_flexion',
        jointId: 'elbow_right',
        displayName: 'Elbow Flexion',
        axis: 'Z', // Z-axis is the hinge axis in anatomical position
        index: 2,  // Maps to 3rd Euler component (Z)
        neutral: 0,
        range: { min: 0, max: 150 * DEG_TO_RAD }, // ISB: 0-150°
        clamped: true,
        locked: false,
      },
      {
        id: 'elbow_r_pronation',
        jointId: 'elbow_right',
        displayName: 'Forearm Pronation/Supination',
        axis: 'X', // X-axis is the longitudinal axis of the forearm
        index: 0,  // Maps to 1st Euler component (X)
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, // ISB: -90 (Sup) to 90 (Pro)
        clamped: true,
        locked: false,
      },
      {
        id: 'elbow_r_varus',
        jointId: 'elbow_right',
        displayName: 'Elbow Varus/Valgus (Laxity)',
        axis: 'Y', // Y-axis is the carrying angle / deviation
        index: 1,  // Maps to 2nd Euler component (Y)
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, // Small laxity range
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT ELBOW
  // ============================================================================

  elbow_left: {
    id: 'elbow_left',
    displayName: 'Left Elbow',
    parentSegment: 'humerus_left',
    childSegment: 'radius_left',
    type: 'ball',
    eulerOrder: 'ZXY',
    side: 'left',
    coordinates: [
      {
        id: 'elbow_l_flexion',
        jointId: 'elbow_left',
        displayName: 'Elbow Flexion',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: 0, max: 150 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'elbow_l_pronation',
        jointId: 'elbow_left',
        displayName: 'Forearm Pronation/Supination',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -90 * DEG_TO_RAD, max: 90 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'elbow_l_varus',
        jointId: 'elbow_left',
        displayName: 'Elbow Varus/Valgus (Laxity)',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT HIP
  // ============================================================================

  hip_right: {
    id: 'hip_right',
    displayName: 'Right Hip',
    parentSegment: 'pelvis',
    childSegment: 'femur_right',
    type: 'ball',
    eulerOrder: 'XZY',
    side: 'right',
    coordinates: [
      {
        id: 'hip_r_flexion',
        jointId: 'hip_right',
        displayName: 'Hip Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 120 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'hip_r_adduction',
        jointId: 'hip_right',
        displayName: 'Hip Adduction/Abduction',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
        invert: true,
      },
      {
        id: 'hip_r_rotation',
        jointId: 'hip_right',
        displayName: 'Hip Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT HIP
  // ============================================================================

  hip_left: {
    id: 'hip_left',
    displayName: 'Left Hip',
    parentSegment: 'pelvis',
    childSegment: 'femur_left',
    type: 'ball',
    eulerOrder: 'XZY',
    side: 'left',
    coordinates: [
      {
        id: 'hip_l_flexion',
        jointId: 'hip_left',
        displayName: 'Hip Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 120 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'hip_l_adduction',
        jointId: 'hip_left',
        displayName: 'Hip Adduction/Abduction',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'hip_l_rotation',
        jointId: 'hip_left',
        displayName: 'Hip Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT KNEE
  // ============================================================================

  knee_right: {
    id: 'knee_right',
    displayName: 'Right Knee',
    parentSegment: 'femur_right',
    childSegment: 'tibia_right',
    type: 'ball', // 3-DOF for Grood & Suntay, but primarily flexion
    eulerOrder: 'XZY',
    side: 'right',
    coordinates: [
      {
        id: 'knee_r_flexion',
        jointId: 'knee_right',
        displayName: 'Knee Flexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -140 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, // Allow negative flexion
        clamped: true,
        locked: false,
      },
      {
        id: 'knee_r_varus',
        jointId: 'knee_right',
        displayName: 'Knee Varus/Valgus',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'knee_r_tibial_rotation',
        jointId: 'knee_right',
        displayName: 'Tibial Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT KNEE
  // ============================================================================

  knee_left: {
    id: 'knee_left',
    displayName: 'Left Knee',
    parentSegment: 'femur_left',
    childSegment: 'tibia_left',
    type: 'ball',
    eulerOrder: 'XZY',
    side: 'left',
    coordinates: [
      {
        id: 'knee_l_flexion',
        jointId: 'knee_left',
        displayName: 'Knee Flexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -140 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, // Allow negative flexion
        clamped: true,
        locked: false,
      },
      {
        id: 'knee_l_varus',
        jointId: 'knee_left',
        displayName: 'Knee Varus/Valgus',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'knee_l_tibial_rotation',
        jointId: 'knee_left',
        displayName: 'Tibial Internal/External Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT WRIST
  // ============================================================================

  wrist_right: {
    id: 'wrist_right',
    displayName: 'Right Wrist',
    parentSegment: 'radius_right',
    childSegment: 'hand_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      {
        id: 'wrist_r_flexion',
        jointId: 'wrist_right',
        displayName: 'Wrist Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -70 * DEG_TO_RAD, max: 80 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'wrist_r_deviation',
        jointId: 'wrist_right',
        displayName: 'Radial/Ulnar Deviation',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'wrist_r_rotation',
        jointId: 'wrist_right',
        displayName: 'Wrist Rotation (Passive)',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT WRIST
  // ============================================================================

  wrist_left: {
    id: 'wrist_left',
    displayName: 'Left Wrist',
    parentSegment: 'radius_left',
    childSegment: 'hand_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      {
        id: 'wrist_l_flexion',
        jointId: 'wrist_left',
        displayName: 'Wrist Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -70 * DEG_TO_RAD, max: 80 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'wrist_l_deviation',
        jointId: 'wrist_left',
        displayName: 'Radial/Ulnar Deviation',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 30 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'wrist_l_rotation',
        jointId: 'wrist_left',
        displayName: 'Wrist Rotation (Passive)',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT HAND FINGERS
  // ============================================================================

  thumb_right_cmc: {
    id: 'thumb_right_cmc',
    displayName: 'Right Thumb CMC',
    parentSegment: 'hand_right',
    childSegment: 'thumb_prox_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      { id: 'thumb_r_flex', jointId: 'thumb_right_cmc', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -20 * DEG_TO_RAD, max: 50 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'thumb_r_abd', jointId: 'thumb_right_cmc', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -20 * DEG_TO_RAD, max: 40 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  index_right_mcp: {
    id: 'index_right_mcp',
    displayName: 'Right Index MCP',
    parentSegment: 'hand_right',
    childSegment: 'index_prox_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      { id: 'index_r_flex', jointId: 'index_right_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'index_r_abd', jointId: 'index_right_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -15 * DEG_TO_RAD, max: 15 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  middle_right_mcp: {
    id: 'middle_right_mcp',
    displayName: 'Right Middle MCP',
    parentSegment: 'hand_right',
    childSegment: 'middle_prox_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      { id: 'middle_r_flex', jointId: 'middle_right_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'middle_r_abd', jointId: 'middle_right_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  ring_right_mcp: {
    id: 'ring_right_mcp',
    displayName: 'Right Ring MCP',
    parentSegment: 'hand_right',
    childSegment: 'ring_prox_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      { id: 'ring_r_flex', jointId: 'ring_right_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'ring_r_abd', jointId: 'ring_right_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  pinky_right_mcp: {
    id: 'pinky_right_mcp',
    displayName: 'Right Pinky MCP',
    parentSegment: 'hand_right',
    childSegment: 'pinky_prox_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      { id: 'pinky_r_flex', jointId: 'pinky_right_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'pinky_r_abd', jointId: 'pinky_right_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -15 * DEG_TO_RAD, max: 15 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },

  // ============================================================================
  // LEFT HAND FINGERS
  // ============================================================================

  thumb_left_cmc: {
    id: 'thumb_left_cmc',
    displayName: 'Left Thumb CMC',
    parentSegment: 'hand_left',
    childSegment: 'thumb_prox_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      { id: 'thumb_l_flex', jointId: 'thumb_left_cmc', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -20 * DEG_TO_RAD, max: 50 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'thumb_l_abd', jointId: 'thumb_left_cmc', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -20 * DEG_TO_RAD, max: 40 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  index_left_mcp: {
    id: 'index_left_mcp',
    displayName: 'Left Index MCP',
    parentSegment: 'hand_left',
    childSegment: 'index_prox_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      { id: 'index_l_flex', jointId: 'index_left_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'index_l_abd', jointId: 'index_left_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -15 * DEG_TO_RAD, max: 15 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  middle_left_mcp: {
    id: 'middle_left_mcp',
    displayName: 'Left Middle MCP',
    parentSegment: 'hand_left',
    childSegment: 'middle_prox_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      { id: 'middle_l_flex', jointId: 'middle_left_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'middle_l_abd', jointId: 'middle_left_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  ring_left_mcp: {
    id: 'ring_left_mcp',
    displayName: 'Left Ring MCP',
    parentSegment: 'hand_left',
    childSegment: 'ring_prox_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      { id: 'ring_l_flex', jointId: 'ring_left_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'ring_l_abd', jointId: 'ring_left_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },
  pinky_left_mcp: {
    id: 'pinky_left_mcp',
    displayName: 'Left Pinky MCP',
    parentSegment: 'hand_left',
    childSegment: 'pinky_prox_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      { id: 'pinky_l_flex', jointId: 'pinky_left_mcp', displayName: 'Flexion', axis: 'X', index: 0, neutral: 0, range: { min: -10 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, clamped: true, locked: false },
      { id: 'pinky_l_abd', jointId: 'pinky_left_mcp', displayName: 'Abduction', axis: 'Z', index: 2, neutral: 0, range: { min: -15 * DEG_TO_RAD, max: 15 * DEG_TO_RAD }, clamped: true, locked: false },
    ],
  },

  // ============================================================================
  // RIGHT ANKLE
  // ============================================================================

  ankle_right: {
    id: 'ankle_right',
    displayName: 'Right Ankle Complex',
    parentSegment: 'tibia_right',
    childSegment: 'foot_right',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      {
        id: 'ankle_r_flexion',
        jointId: 'ankle_right',
        displayName: 'Talocrural Dorsi/Plantarflexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -50 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'ankle_r_inversion',
        jointId: 'ankle_right',
        displayName: 'Subtalar Inversion/Eversion',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -35 * DEG_TO_RAD, max: 15 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'ankle_r_rotation',
        jointId: 'ankle_right',
        displayName: 'Foot Int/Ext Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT ANKLE
  // ============================================================================

  ankle_left: {
    id: 'ankle_left',
    displayName: 'Left Ankle Complex',
    parentSegment: 'tibia_left',
    childSegment: 'foot_left',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      {
        id: 'ankle_l_flexion',
        jointId: 'ankle_left',
        displayName: 'Talocrural Dorsi/Plantarflexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -50 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'ankle_l_inversion',
        jointId: 'ankle_left',
        displayName: 'Subtalar Inversion/Eversion',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -35 * DEG_TO_RAD, max: 15 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'ankle_l_rotation',
        jointId: 'ankle_left',
        displayName: 'Foot Int/Ext Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // SPINE & HEAD
  // ============================================================================

  lumbar_spine: {
    id: 'lumbar_spine',
    displayName: 'Lumbar Spine',
    parentSegment: 'pelvis',
    childSegment: 'lumbar',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'center',
    coordinates: [
      {
        id: 'lumbar_flexion',
        jointId: 'lumbar_spine',
        displayName: 'Lumbar Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -30 * DEG_TO_RAD, max: 60 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'lumbar_bending',
        jointId: 'lumbar_spine',
        displayName: 'Lumbar Lateral Bending',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -25 * DEG_TO_RAD, max: 25 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'lumbar_rotation',
        jointId: 'lumbar_spine',
        displayName: 'Lumbar Axial Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  thoracic_spine: {
    id: 'thoracic_spine',
    displayName: 'Lower Thoracic Spine',
    parentSegment: 'lumbar',
    childSegment: 'thoracic_lower',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'center',
    coordinates: [
      {
        id: 'thoracic_flexion',
        jointId: 'thoracic_spine',
        displayName: 'Lower Thoracic Flexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'thoracic_bending',
        jointId: 'thoracic_spine',
        displayName: 'Lower Thoracic Bending',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -25 * DEG_TO_RAD, max: 25 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'thoracic_rotation',
        jointId: 'thoracic_spine',
        displayName: 'Lower Thoracic Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -35 * DEG_TO_RAD, max: 35 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  thoracic_upper_spine: {
    id: 'thoracic_upper_spine',
    displayName: 'Upper Thoracic Spine',
    parentSegment: 'thoracic_lower',
    childSegment: 'thorax',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'center',
    coordinates: [
      {
        id: 'thoracic_upper_flexion',
        jointId: 'thoracic_upper_spine',
        displayName: 'Upper Thoracic Flexion',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'thoracic_upper_bending',
        jointId: 'thoracic_upper_spine',
        displayName: 'Upper Thoracic Bending',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -15 * DEG_TO_RAD, max: 15 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'thoracic_upper_rotation',
        jointId: 'thoracic_upper_spine',
        displayName: 'Upper Thoracic Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -20 * DEG_TO_RAD, max: 20 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  cervical_spine: {
    id: 'cervical_spine',
    displayName: 'Lower Cervical Spine',
    parentSegment: 'thorax',
    childSegment: 'neck',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'center',
    coordinates: [
      {
        id: 'cervical_flexion',
        jointId: 'cervical_spine',
        displayName: 'Neck Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -40 * DEG_TO_RAD, max: 40 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'cervical_bending',
        jointId: 'cervical_spine',
        displayName: 'Neck Lateral Bending',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -35 * DEG_TO_RAD, max: 35 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'cervical_rotation',
        jointId: 'cervical_spine',
        displayName: 'Neck Axial Rotation',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  head: {
    id: 'head',
    displayName: 'Upper Cervical (Head)',
    parentSegment: 'neck',
    childSegment: 'head',
    type: 'ball',
    eulerOrder: 'XYZ',
    side: 'center',
    coordinates: [
      {
        id: 'head_flexion',
        jointId: 'head',
        displayName: 'Head Nod (Flex/Ext)',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -25 * DEG_TO_RAD, max: 25 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'head_bending',
        jointId: 'head',
        displayName: 'Head Tilt (Lateral)',
        axis: 'Z',
        index: 2,
        neutral: 0,
        range: { min: -10 * DEG_TO_RAD, max: 10 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
      {
        id: 'head_rotation',
        jointId: 'head',
        displayName: 'Head Turn (Rotation)',
        axis: 'Y',
        index: 1,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 45 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // RIGHT TOES (MTP)
  // ============================================================================

  mtp_right: {
    id: 'mtp_right',
    displayName: 'Right Toes (MTP)',
    parentSegment: 'foot_right',
    childSegment: 'toes_right',
    type: 'hinge', // Primarily flexion/extension
    eulerOrder: 'XYZ',
    side: 'right',
    coordinates: [
      {
        id: 'mtp_r_flexion',
        jointId: 'mtp_right',
        displayName: 'Toe Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 90 * DEG_TO_RAD }, // Extension is dominant (toe off)
        clamped: true,
        locked: false,
      },
    ],
  },

  // ============================================================================
  // LEFT TOES (MTP)
  // ============================================================================

  mtp_left: {
    id: 'mtp_left',
    displayName: 'Left Toes (MTP)',
    parentSegment: 'foot_left',
    childSegment: 'toes_left',
    type: 'hinge',
    eulerOrder: 'XYZ',
    side: 'left',
    coordinates: [
      {
        id: 'mtp_l_flexion',
        jointId: 'mtp_left',
        displayName: 'Toe Flexion/Extension',
        axis: 'X',
        index: 0,
        neutral: 0,
        range: { min: -45 * DEG_TO_RAD, max: 90 * DEG_TO_RAD },
        clamped: true,
        locked: false,
      },
    ],
  },
};

/**
 * Helper: Get joint by ID
 */
export function getJoint(jointId: string): JointDef | undefined {
  return JOINTS[jointId];
}

/**
 * Helper: Get all joints for a segment (where segment is parent)
 */
export function getChildJoints(segmentId: string): JointDef[] {
  return Object.values(JOINTS).filter(joint => joint.parentSegment === segmentId);
}

/**
 * Helper: Get parent joint for a segment (where segment is child)
 */
export function getParentJoint(segmentId: string): JointDef | undefined {
  return Object.values(JOINTS).find(joint => joint.childSegment === segmentId);
}

/**
 * Helper: Get all shoulder complex joints (ST + GH for both sides)
 */
export function getShoulderJoints(): JointDef[] {
  return [
    JOINTS.st_right,
    JOINTS.gh_right,
    JOINTS.st_left,
    JOINTS.gh_left,
  ];
}

/**
 * Helper: Get all joints as an array
 */
export function getAllJoints(): JointDef[] {
  return Object.values(JOINTS);
}
