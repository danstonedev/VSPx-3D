/**
 * Biomechanics Model Type Definitions
 * 
 * OpenSim-compatible type system for representing segments, joints, and coordinates.
 * This follows the Simbody/OpenSim architecture where:
 * - Segments are rigid bodies (pelvis, femur, scapula, humerus, etc.)
 * - Joints connect parent and child segments with mobilizers
 * - Coordinates are generalized DOFs (q₀, q₁, q₂) with ROM constraints
 * 
 * Mathematical Foundation:
 * - All 3-DOF joints use X-Y-Z body-fixed Euler sequence: R = Rₓ(q₀) * Rᵧ(q₁) * Rᵢ(q₂)
 * - Joint deviation: q_Δ = q_neutral⁻¹ * q_rel
 * - Relative orientation: q_rel = q_parent⁻¹ * q_child
 */

import * as THREE from 'three';

/**
 * Anatomical segment (rigid body)
 * Maps to either a Mixamo bone or a virtual mathematical frame
 */
export interface SegmentDef {
  /** Unique anatomical identifier (e.g., "scapula_right", "humerus_right") */
  id: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Source type */
  source: 'mixamo' | 'virtual';
  
  /** Mixamo bone name (if source='mixamo') */
  boneName?: string;
  
  /** Parent segment ID (if source='virtual') */
  parentSegmentId?: string;
  
  /** For virtual segments: offset from parent in parent's local frame */
  offset?: THREE.Vector3;
  
  /** For virtual segments: rotation from parent in parent's local frame */
  rotation?: THREE.Quaternion;
}

/**
 * Coordinate (generalized DOF)
 * Represents one degree of freedom in a joint's motion
 */
export interface CoordinateDef {
  /** Unique identifier (e.g., "gh_r_q0", "knee_r_flexion") */
  id: string;
  
  /** Parent joint ID */
  jointId: string;
  
  /** Display name for clinical interpretation */
  displayName: string;
  
  /** Axis in X-Y-Z body-fixed Euler sequence */
  axis: 'X' | 'Y' | 'Z';
  
  /** Index in Euler sequence (0, 1, or 2) */
  index: 0 | 1 | 2;
  
  /** Neutral/zero position in radians */
  neutral: number;
  
  /** Range of motion constraints */
  range: {
    /** Minimum value in radians */
    min: number;
    /** Maximum value in radians */
    max: number;
  };
  
  /** Whether to clamp values to range */
  clamped: boolean;
  
  /** Whether coordinate is locked at neutral */
  locked: boolean;
  
  /** Default value (if different from neutral) */
  default?: number;

  /** Optional: Invert the sign of this coordinate (useful for mirrored joints) */
  invert?: boolean;
}

/**
 * Joint type enumeration
 */
export type JointType = 
  | 'ball'           // 3-DOF: shoulder GH, hip, ST
  | 'hinge'          // 1-DOF: elbow, ankle DF/PF
  | 'universal'      // 2-DOF: wrist, ankle with inversion
  | 'planar_custom'  // Custom 3-DOF for specialized joints
  | 'weld';          // 0-DOF: fixed connection

/**
 * Joint definition
 * Connects parent and child segments with a mobilizer
 */
export interface JointDef {
  /** Unique identifier (e.g., "gh_right", "st_right", "knee_right") */
  id: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Parent segment ID */
  parentSegment: string;
  
  /** Child segment ID */
  childSegment: string;
  
  /** Joint type/mobilizer */
  type: JointType;
  
  /** Euler rotation sequence for 3-DOF joints */
  eulerOrder: 'XYZ' | 'YZX' | 'ZXY' | 'XZY' | 'YXZ' | 'ZYX';
  
  /** Coordinates (generalized DOFs) */
  coordinates: CoordinateDef[];
  
  /** Optional: anatomical side */
  side?: 'left' | 'right' | 'center';
}

/**
 * Complete biomechanical model
 */
export interface BiomechModel {
  /** Model name/identifier */
  id: string;
  
  /** All segments in the model */
  segments: Record<string, SegmentDef>;
  
  /** All joints in the model */
  joints: Record<string, JointDef>;
  
  /** Root segment (typically pelvis or thorax) */
  rootSegment: string;
}

/**
 * Runtime state for coordinate system
 */
export interface CoordinateState {
  /** Current value in radians */
  value: number;
  
  /** Velocity (rad/s) - for future dynamics */
  velocity?: number;
  
  /** Whether this coordinate is currently locked */
  locked: boolean;
  
  /** Whether this coordinate is being clamped */
  clamped: boolean;
  
  /** Last time this coordinate was updated */
  timestamp?: number;
}

/**
 * Runtime joint state
 */
export interface JointState {
  /** Joint ID */
  jointId: string;
  
  /** Current coordinate values */
  coordinates: Record<string, CoordinateState>;
  
  /** Current relative quaternion (child in parent frame) */
  q_rel: THREE.Quaternion;
  
  /** Neutral quaternion (at calibration) */
  q_neutral: THREE.Quaternion;
  
  /** Deviation quaternion: q_Δ = q_neutral⁻¹ * q_rel */
  q_delta: THREE.Quaternion;
}

/**
 * Complete model state (all coordinates across all joints)
 */
export interface ModelState {
  /** Coordinate values by ID */
  q: Record<string, number>;
  
  /** Joint states by joint ID */
  joints: Record<string, JointState>;
  
  /** Timestamp of this state */
  timestamp: number;
}

/**
 * Clinical angle output (post-processed from coordinates)
 */
export interface ClinicalAngles {
  /** Joint identifier */
  jointId: string;
  
  /** Clinically meaningful angles in degrees */
  angles: Record<string, number>;
  
  /** Additional computed metrics */
  metrics?: Record<string, number>;
}
