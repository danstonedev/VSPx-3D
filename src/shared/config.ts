// Centralized viewer configuration and constants
export const BASE_URL: string = (import.meta as any).env?.BASE_URL || '/'

// Base model path under public
// CRITICAL: Use Neutral_Model.glb (Anatomical Pose WITH mesh geometry)
// This ensures skeleton bind pose matches biomechanical calibration reference.
export const BASE_MODEL_PATH = 'models/animations/Neutral_Model.glb'

// Default playback speed for animations when not overridden by manifest
export const DEFAULT_ANIMATION_SPEED = 0.5

// Helper to build absolute URLs respecting BASE_URL
export const withBase = (relative: string) => `${BASE_URL}${relative.replace(/^\//, '')}`

// Global viewer zoom factor used by scene layout/camera framing
// Higher values move the camera further away while preserving proportions
export const VIEWER_ZOOM_OUT_FACTOR = 250
