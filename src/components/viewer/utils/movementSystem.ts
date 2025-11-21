import * as THREE from 'three'
import { animationDebug, animationError, animationWarn } from '../../../shared/utils/animationLogging'
import { SKELETON_MAP } from './skeletonMap'

export interface Movement {
  name: string
  duration: number
  loop: boolean
  keyframes: MovementKeyframe[]
}

export interface MovementKeyframe {
  time: number // 0 to 1 normalized time
  joints: Record<string, JointTransform>
}

export interface JointTransform {
  rotation?: { x?: number; y?: number; z?: number }
  position?: { x?: number; y?: number; z?: number }
}

export class MovementLibrary {
  private static movements: Map<string, Movement> = new Map()
  static {
    // Initialize with basic movements
    this.registerMovement('idle', {
      name: 'idle',
      duration: 4,
      loop: true,
      keyframes: [
        {
          time: 0,
          joints: {
            spine: { rotation: { x: 0, y: 0, z: 0 } },
            chest: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
        {
          time: 0.5,
          joints: {
            spine: { rotation: { x: 0.02, y: 0, z: 0 } },
            chest: { rotation: { x: 0.01, y: 0, z: 0 } },
          },
        },
        {
          time: 1,
          joints: {
            spine: { rotation: { x: 0, y: 0, z: 0 } },
            chest: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
      ],
    })

    this.registerMovement('wave', {
      name: 'wave',
      duration: 2,
      loop: false,
      keyframes: [
        {
          time: 0,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.57 } }, // ~90° shoulder abduction
            rightLowerArm: { rotation: { x: 0, y: 0, z: 1.57 } }, // ~90° flexion (corrected from Y-axis varus)
            rightHand: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
        {
          time: 0.25,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.57 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 1.57 } },
            rightHand: { rotation: { x: 0, y: 0, z: -0.52 } }, // ~30° wrist flexion
          },
        },
        {
          time: 0.5,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.57 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 1.57 } },
            rightHand: { rotation: { x: 0, y: 0, z: 0.52 } }, // ~30° wrist extension
          },
        },
        {
          time: 0.75,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.57 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 1.57 } },
            rightHand: { rotation: { x: 0, y: 0, z: -0.52 } },
          },
        },
        {
          time: 1,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: 0 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 0 } },
            rightHand: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
      ],
    })

    this.registerMovement('walk', {
      name: 'walk',
      duration: 1.5,
      loop: true,
      keyframes: [
        {
          time: 0,
          joints: {
            leftUpperLeg: { rotation: { x: 0.6, y: 0, z: 0 } }, // ~34° hip flexion
            leftLowerLeg: { rotation: { x: -0.5, y: 0, z: 0 } }, // ~29° knee flexion
            rightUpperLeg: { rotation: { x: -0.5, y: 0, z: 0 } }, // ~29° hip extension
            rightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
            leftUpperArm: { rotation: { x: -0.35, y: 0, z: 0 } }, // ~20° shoulder extension
            rightUpperArm: { rotation: { x: 0.35, y: 0, z: 0 } }, // ~20° shoulder flexion
            spine: { rotation: { x: 0.09, y: 0, z: 0 } }, // ~5° forward lean
          },
        },
        {
          time: 0.5,
          joints: {
            leftUpperLeg: { rotation: { x: -0.5, y: 0, z: 0 } },
            leftLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
            rightUpperLeg: { rotation: { x: 0.6, y: 0, z: 0 } },
            rightLowerLeg: { rotation: { x: -0.5, y: 0, z: 0 } },
            leftUpperArm: { rotation: { x: 0.35, y: 0, z: 0 } },
            rightUpperArm: { rotation: { x: -0.35, y: 0, z: 0 } },
            spine: { rotation: { x: 0.09, y: 0, z: 0 } },
          },
        },
        {
          time: 1,
          joints: {
            leftUpperLeg: { rotation: { x: 0.6, y: 0, z: 0 } },
            leftLowerLeg: { rotation: { x: -0.5, y: 0, z: 0 } },
            rightUpperLeg: { rotation: { x: -0.5, y: 0, z: 0 } },
            rightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
            leftUpperArm: { rotation: { x: -0.35, y: 0, z: 0 } },
            rightUpperArm: { rotation: { x: 0.35, y: 0, z: 0 } },
            spine: { rotation: { x: 0.09, y: 0, z: 0 } },
          },
        },
      ],
    })

    this.registerMovement('point', {
      name: 'point',
      duration: 1,
      loop: false,
      keyframes: [
        {
          time: 0,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.5 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 0 } },
            rightHand: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
        {
          time: 1,
          joints: {
            rightUpperArm: { rotation: { x: 0, y: 0, z: -1.5 } },
            rightLowerArm: { rotation: { x: 0, y: 0, z: 0 } },
            rightHand: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
      ],
    })

    this.registerMovement('sit', {
      name: 'sit',
      duration: 1.5,
      loop: false,
      keyframes: [
        {
          time: 0,
          joints: {
            spine: { rotation: { x: 0, y: 0, z: 0 } },
            leftUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
            rightUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          },
        },
        {
          time: 0.5,
          joints: {
            spine: { rotation: { x: 0.17, y: 0, z: 0 } }, // ~10° forward lean
            leftUpperLeg: { rotation: { x: -1.57, y: 0, z: 0 } }, // ~90° hip flexion
            leftLowerLeg: { rotation: { x: 1.57, y: 0, z: 0 } }, // ~90° knee flexion
            rightUpperLeg: { rotation: { x: -1.57, y: 0, z: 0 } },
            rightLowerLeg: { rotation: { x: 1.57, y: 0, z: 0 } },
            hips: { position: { y: -0.5 } },
          },
        },
        {
          time: 1,
          joints: {
            spine: { rotation: { x: 0.17, y: 0, z: 0 } },
            leftUpperLeg: { rotation: { x: -1.57, y: 0, z: 0 } },
            leftLowerLeg: { rotation: { x: 1.57, y: 0, z: 0 } },
            rightUpperLeg: { rotation: { x: -1.57, y: 0, z: 0 } },
            rightLowerLeg: { rotation: { x: 1.57, y: 0, z: 0 } },
            hips: { position: { y: -0.5 } },
          },
        },
      ],
    })
  }

  static registerMovement(name: string, movement: Movement) {
    this.movements.set(name.toLowerCase(), movement)
  }

  static getMovement(name: string): Movement | undefined {
    return this.movements.get(name.toLowerCase())
  }

  static getAllMovementNames(): string[] {
    return Array.from(this.movements.keys())
  }
}

export class MovementController {
  private mixer: THREE.AnimationMixer
  private currentAction: THREE.AnimationAction | null = null
  private clock = new THREE.Clock()
  private boneMap: Map<string, THREE.Bone> = new Map()
  private isPlaying = false
  private paused = false

  constructor(private model: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(model)
    this.mapBones()
  }

  private mapBones() {
    const foundBones: { original: string; mapped: string }[] = []

    this.model.traverse(child => {
      if (child instanceof THREE.Bone) {
        const name = child.name

        // Map using SKELETON_MAP for consistency
        if (name === SKELETON_MAP.Hips) {
          this.boneMap.set('hips', child)
          foundBones.push({ original: name, mapped: 'hips' })
        }
        if (name === SKELETON_MAP.Spine) {
          this.boneMap.set('spine', child)
          foundBones.push({ original: name, mapped: 'spine' })
        }
        if (name === SKELETON_MAP.Spine1) {
          this.boneMap.set('spine1', child)
          foundBones.push({ original: name, mapped: 'spine1' })
        }
        if (name === SKELETON_MAP.Spine2) {
          this.boneMap.set('chest', child)
          foundBones.push({ original: name, mapped: 'chest' })
        }
        if (name === SKELETON_MAP.Neck) {
          this.boneMap.set('neck', child)
          foundBones.push({ original: name, mapped: 'neck' })
        }
        if (name === SKELETON_MAP.Head) {
          this.boneMap.set('head', child)
          foundBones.push({ original: name, mapped: 'head' })
        }

        // Left arm
        if (name === SKELETON_MAP.LeftShoulder) {
          this.boneMap.set('leftShoulder', child)
          foundBones.push({ original: name, mapped: 'leftShoulder' })
        }
        if (name === SKELETON_MAP.LeftArm) {
          this.boneMap.set('leftUpperArm', child)
          foundBones.push({ original: name, mapped: 'leftUpperArm' })
        }
        if (name === SKELETON_MAP.LeftForeArm) {
          this.boneMap.set('leftLowerArm', child)
          foundBones.push({ original: name, mapped: 'leftLowerArm' })
        }
        if (name === SKELETON_MAP.LeftHand) {
          this.boneMap.set('leftHand', child)
          foundBones.push({ original: name, mapped: 'leftHand' })
        }

        // Right arm
        if (name === SKELETON_MAP.RightShoulder) {
          this.boneMap.set('rightShoulder', child)
          foundBones.push({ original: name, mapped: 'rightShoulder' })
        }
        if (name === SKELETON_MAP.RightArm) {
          this.boneMap.set('rightUpperArm', child)
          foundBones.push({ original: name, mapped: 'rightUpperArm' })
        }
        if (name === SKELETON_MAP.RightForeArm) {
          this.boneMap.set('rightLowerArm', child)
          foundBones.push({ original: name, mapped: 'rightLowerArm' })
        }
        if (name === SKELETON_MAP.RightHand) {
          this.boneMap.set('rightHand', child)
          foundBones.push({ original: name, mapped: 'rightHand' })
        }

        // Left leg
        if (name === SKELETON_MAP.LeftUpLeg) {
          this.boneMap.set('leftUpperLeg', child)
          foundBones.push({ original: name, mapped: 'leftUpperLeg' })
        }
        if (name === SKELETON_MAP.LeftLeg) {
          this.boneMap.set('leftLowerLeg', child)
          foundBones.push({ original: name, mapped: 'leftLowerLeg' })
        }
        if (name === SKELETON_MAP.LeftFoot) {
          this.boneMap.set('leftFoot', child)
          foundBones.push({ original: name, mapped: 'leftFoot' })
        }

        // Right leg
        if (name === SKELETON_MAP.RightUpLeg) {
          this.boneMap.set('rightUpperLeg', child)
          foundBones.push({ original: name, mapped: 'rightUpperLeg' })
        }
        if (name === SKELETON_MAP.RightLeg) {
          this.boneMap.set('rightLowerLeg', child)
          foundBones.push({ original: name, mapped: 'rightLowerLeg' })
        }
        if (name === SKELETON_MAP.RightFoot) {
          this.boneMap.set('rightFoot', child)
          foundBones.push({ original: name, mapped: 'rightFoot' })
        }
      }
    })

    // debug logs removed
  }

  playMovement(
    movementName: string,
    options?: {
      fadeIn?: number
      fadeOut?: number
      onComplete?: () => void
    }
  ) {
    // debug logs removed

    const movement = MovementLibrary.getMovement(movementName)
    if (!movement) {
      animationError('Movement not found', { movementName })
      return
    }

    const clip = this.createAnimationClip(movement)
    // debug logs removed

    if (clip.tracks.length === 0) {
      animationError('No animation tracks generated for clip', { movementName: movement.name })
      return
    }

    const action = this.mixer.clipAction(clip)

    if (movement.loop) {
      action.setLoop(THREE.LoopRepeat, Infinity)
    } else {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }

    if (this.currentAction && this.currentAction !== action) {
      // debug logs removed
      this.currentAction.fadeOut(options?.fadeOut ?? 0.5)
    }

    action.reset()
    action.fadeIn(options?.fadeIn ?? 0.5)
    action.play()

    this.currentAction = action
    this.isPlaying = true
    // debug logs removed

    if (options?.onComplete && !movement.loop) {
      const handler = () => {
        // debug logs removed
        options.onComplete?.()
        this.mixer.removeEventListener('finished', handler)
      }
      this.mixer.addEventListener('finished', handler)
    }
  }

  private createAnimationClip(movement: Movement): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = []

    // Collect all joint names from all keyframes
    const allJoints = new Set<string>()
    movement.keyframes.forEach(kf => {
      Object.keys(kf.joints).forEach(joint => allJoints.add(joint))
    })

    // Create tracks for each joint
    allJoints.forEach(jointName => {
      const bone = this.boneMap.get(jointName)
      if (!bone) {
        animationWarn('Bone not found for joint', { jointName })
        return
      }

      const times: number[] = []
      const rotationValues: number[] = []
      const positionValues: number[] = []
      let hasRotation = false
      let hasPosition = false

      movement.keyframes.forEach(kf => {
        const transform = kf.joints[jointName]
        times.push(kf.time * movement.duration)

        if (transform) {
          if (transform.rotation) {
            hasRotation = true
            // Create quaternion from Euler angles
            const euler = new THREE.Euler(
              transform.rotation.x ?? 0,
              transform.rotation.y ?? 0,
              transform.rotation.z ?? 0,
              'XYZ'
            )
            const quaternion = new THREE.Quaternion().setFromEuler(euler)
            rotationValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
          } else {
            // Default quaternion (no rotation)
            rotationValues.push(0, 0, 0, 1)
          }

          if (transform.position) {
            hasPosition = true
            positionValues.push(
              transform.position.x ?? 0,
              transform.position.y ?? 0,
              transform.position.z ?? 0
            )
          } else {
            positionValues.push(bone.position.x, bone.position.y, bone.position.z)
          }
        } else {
          rotationValues.push(0, 0, 0, 1)
          positionValues.push(bone.position.x, bone.position.y, bone.position.z)
        }
      })

      // CRITICAL FIX: Use the actual bone name, not the mapped name
      const boneName = bone.name // This should be like "mixamorig1RightArm"

      if (hasRotation) {
        animationDebug('Creating rotation track for bone', boneName)
        tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, rotationValues))
      }

      if (hasPosition && (jointName === 'hips' || jointName === 'root')) {
        // Only apply position to root/hips to avoid breaking the rig
        animationDebug('Creating position track for bone', boneName)
        tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, times, positionValues))
      }
    })

    if (tracks.length === 0) {
      animationWarn('No animation tracks created for movement', movement.name)
    } else {
      animationDebug('Created animation tracks for movement', {
        movementName: movement.name,
        trackCount: tracks.length,
      })
    }

    return new THREE.AnimationClip(movement.name, movement.duration, tracks)
  }

  update() {
    if (this.paused) return
    const delta = this.clock.getDelta()
    if (delta > 0) {
      this.mixer.update(delta)
    }
  }

  stop() {
    animationDebug('Stopping animation playback')
    if (this.currentAction) {
      this.currentAction.stop()
      this.currentAction = null
      this.isPlaying = false
    }
  }

  // Debug method
  getDebugInfo() {
    return {
      isPlaying: this.isPlaying,
      currentAction: this.currentAction ? this.currentAction.getClip().name : 'none',
      mixerTime: this.mixer.time,
      boneCount: this.boneMap.size,
    }
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
