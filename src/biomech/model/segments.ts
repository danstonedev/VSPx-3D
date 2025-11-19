/**
 * Segment Definitions
 * 
 * Maps anatomical segments to Mixamo bone names.
 * This establishes the correct anatomical hierarchy for biomechanics calculations.
 * 
 * Key corrections from default Mixamo rig:
 * - Scapula is represented by RightShoulder/LeftShoulder bones
 * - This allows proper ST (scapulothoracic) and GH (glenohumeral) joint separation
 * - Humerus is RightArm/LeftArm (not connected directly to thorax)
 */

import { SegmentDef } from './types';

/**
 * Complete segment registry for Mixamo-based biomechanical model
 */
export const SEGMENTS: Record<string, SegmentDef> = {
  // ============================================================================
  // AXIAL SKELETON
  // ============================================================================
  
  pelvis: {
    id: 'pelvis',
    displayName: 'Pelvis',
    source: 'mixamo',
    boneName: 'mixamorig1Hips',
  },
  
  lumbar: {
    id: 'lumbar',
    displayName: 'Lumbar Spine',
    source: 'mixamo',
    boneName: 'mixamorig1Spine',
  },
  
  thoracic_lower: {
    id: 'thoracic_lower',
    displayName: 'Lower Thoracic Spine',
    source: 'mixamo',
    boneName: 'mixamorig1Spine1',
  },

  thorax: {
    id: 'thorax',
    displayName: 'Thorax',
    source: 'mixamo',
    boneName: 'mixamorig1Spine2', // Upper thoracic - reference for shoulder
  },
  
  neck: {
    id: 'neck',
    displayName: 'Neck',
    source: 'mixamo',
    boneName: 'mixamorig1Neck',
  },
  
  head: {
    id: 'head',
    displayName: 'Head',
    source: 'mixamo',
    boneName: 'mixamorig1Head',
  },
  
  // ============================================================================
  // RIGHT UPPER EXTREMITY
  // ============================================================================
  
  scapula_right: {
    id: 'scapula_right',
    displayName: 'Right Scapula',
    source: 'mixamo',
    boneName: 'mixamorig1RightShoulder',
    // Note: This bone in Mixamo represents the scapula anatomically
    // It's the parent of the humerus (RightArm)
  },
  
  humerus_right: {
    id: 'humerus_right',
    displayName: 'Right Humerus',
    source: 'mixamo',
    boneName: 'mixamorig1RightArm',
  },
  
  radius_right: {
    id: 'radius_right',
    displayName: 'Right Radius',
    source: 'mixamo',
    boneName: 'mixamorig1RightForeArm',
    // Note: Mixamo ForeArm represents the radius-ulna unit
  },
  
  hand_right: {
    id: 'hand_right',
    displayName: 'Right Hand',
    source: 'mixamo',
    boneName: 'mixamorig1RightHand',
  },

  // ============================================================================
  // RIGHT HAND FINGERS
  // ============================================================================

  thumb_prox_right: {
    id: 'thumb_prox_right',
    displayName: 'Right Thumb Metacarpal',
    source: 'mixamo',
    boneName: 'mixamorig1RightHandThumb1',
  },
  index_prox_right: {
    id: 'index_prox_right',
    displayName: 'Right Index Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1RightHandIndex1',
  },
  middle_prox_right: {
    id: 'middle_prox_right',
    displayName: 'Right Middle Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1RightHandMiddle1',
  },
  ring_prox_right: {
    id: 'ring_prox_right',
    displayName: 'Right Ring Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1RightHandRing1',
  },
  pinky_prox_right: {
    id: 'pinky_prox_right',
    displayName: 'Right Pinky Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1RightHandPinky1',
  },
  
  // ============================================================================
  // LEFT UPPER EXTREMITY
  // ============================================================================
  
  scapula_left: {
    id: 'scapula_left',
    displayName: 'Left Scapula',
    source: 'mixamo',
    boneName: 'mixamorig1LeftShoulder',
  },
  
  humerus_left: {
    id: 'humerus_left',
    displayName: 'Left Humerus',
    source: 'mixamo',
    boneName: 'mixamorig1LeftArm',
  },
  
  radius_left: {
    id: 'radius_left',
    displayName: 'Left Radius',
    source: 'mixamo',
    boneName: 'mixamorig1LeftForeArm',
  },
  
  hand_left: {
    id: 'hand_left',
    displayName: 'Left Hand',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHand',
  },

  // ============================================================================
  // LEFT HAND FINGERS
  // ============================================================================

  thumb_prox_left: {
    id: 'thumb_prox_left',
    displayName: 'Left Thumb Metacarpal',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHandThumb1',
  },
  index_prox_left: {
    id: 'index_prox_left',
    displayName: 'Left Index Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHandIndex1',
  },
  middle_prox_left: {
    id: 'middle_prox_left',
    displayName: 'Left Middle Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHandMiddle1',
  },
  ring_prox_left: {
    id: 'ring_prox_left',
    displayName: 'Left Ring Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHandRing1',
  },
  pinky_prox_left: {
    id: 'pinky_prox_left',
    displayName: 'Left Pinky Proximal',
    source: 'mixamo',
    boneName: 'mixamorig1LeftHandPinky1',
  },
  
  // ============================================================================
  // RIGHT LOWER EXTREMITY
  // ============================================================================
  
  femur_right: {
    id: 'femur_right',
    displayName: 'Right Femur',
    source: 'mixamo',
    boneName: 'mixamorig1RightUpLeg',
  },
  
  tibia_right: {
    id: 'tibia_right',
    displayName: 'Right Tibia',
    source: 'mixamo',
    boneName: 'mixamorig1RightLeg',
  },
  
  foot_right: {
    id: 'foot_right',
    displayName: 'Right Foot',
    source: 'mixamo',
    boneName: 'mixamorig1RightFoot',
  },
  
  toes_right: {
    id: 'toes_right',
    displayName: 'Right Toes',
    source: 'mixamo',
    boneName: 'mixamorig1RightToeBase',
  },
  
  // ============================================================================
  // LEFT LOWER EXTREMITY
  // ============================================================================
  
  femur_left: {
    id: 'femur_left',
    displayName: 'Left Femur',
    source: 'mixamo',
    boneName: 'mixamorig1LeftUpLeg',
  },
  
  tibia_left: {
    id: 'tibia_left',
    displayName: 'Left Tibia',
    source: 'mixamo',
    boneName: 'mixamorig1LeftLeg',
  },
  
  foot_left: {
    id: 'foot_left',
    displayName: 'Left Foot',
    source: 'mixamo',
    boneName: 'mixamorig1LeftFoot',
  },
  
  toes_left: {
    id: 'toes_left',
    displayName: 'Left Toes',
    source: 'mixamo',
    boneName: 'mixamorig1LeftToeBase',
  },
};

/**
 * Helper: Get segment by ID
 */
export function getSegment(segmentId: string): SegmentDef | undefined {
  return SEGMENTS[segmentId];
}

/**
 * Helper: Get all segments for a side
 */
export function getSegmentsBySide(side: 'left' | 'right' | 'center'): SegmentDef[] {
  return Object.values(SEGMENTS).filter(seg => {
    if (side === 'center') {
      return !seg.id.includes('_left') && !seg.id.includes('_right');
    }
    return seg.id.includes(`_${side}`);
  });
}

/**
 * Helper: Find segment by Mixamo bone name
 */
export function getSegmentByBoneName(boneName: string): SegmentDef | undefined {
  return Object.values(SEGMENTS).find(seg => seg.boneName === boneName);
}
