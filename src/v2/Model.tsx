import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useAnimationClips } from '../components/viewer/hooks/useAnimationClips'
import { usePlaybackAPI, type PlaybackAPI } from '../components/viewer/hooks/usePlaybackAPI'
import { normalizeHumanModel, type ModelMetrics } from '../components/viewer/utils/modelMetrics'
import { ANIMATIONS, DEFAULT_ANIMATION_ID } from '../components/viewer/animations/manifest'
import { getViewerSettings } from '../shared/settings'
import { playAction } from '../components/viewer/utils/mixerController'
import { animationDebug } from '../shared/utils/animationLogging'
import InteractiveBoneController from '../components/viewer/InteractiveBoneController'
import type { ConstraintViolation } from '../components/viewer/constraints/constraintValidator'

export type V2ModelProps = {
  isAnimating: boolean
  requestedId?: string
  onActiveChange?: (id: string) => void
  onMetrics?: (metrics: ModelMetrics) => void
  ikMode?: boolean
  constraintsEnabled?: boolean
  speedMultiplier?: number
  onBoneSelect?: (bone: THREE.Bone | null) => void
  onConstraintViolation?: (violations: ConstraintViolation[]) => void
  onSkeletonReady?: (skeleton: THREE.Skeleton | null) => void
  ikResetCounter?: number
  onDragStateChange?: (dragging: boolean) => void
}

const animationIndex = new Map<string, string>()
ANIMATIONS.forEach(({ id }) => {
  animationIndex.set(id, id)
  animationIndex.set(id.toLowerCase(), id)
  animationIndex.set(id.replace(/\.glb$/i, '').toLowerCase(), id)
})

const resolveAnimationId = (candidate?: string): string | null => {
  if (!candidate) return null
  const raw = candidate.trim()
  if (!raw) return null
  const exact = animationIndex.get(raw) || animationIndex.get(raw.toLowerCase())
  if (exact) return exact
  const withExt = raw.endsWith('.glb') ? raw : `${raw}.glb`
  const match = animationIndex.get(withExt) || animationIndex.get(withExt.toLowerCase())
  return match ?? null
}

const V2Model = forwardRef<PlaybackAPI | null, V2ModelProps>(function V2Model(
  {
    isAnimating,
    requestedId,
    onActiveChange,
    onMetrics,
    ikMode = false,
    constraintsEnabled = true,
    speedMultiplier = 1,
    onBoneSelect,
    onConstraintViolation,
    onSkeletonReady,
    ikResetCounter = 0,
    onDragStateChange,
  },
  ref
) {
  const groupRef = useRef<THREE.Group>(null)
  const currentActionRef = useRef<string | null>(null)
  const [activeId, setActiveId] = useState<string>(DEFAULT_ANIMATION_ID)
  const { baseScene, clips } = useAnimationClips()
  const { root, metrics } = useMemo(() => normalizeHumanModel(baseScene), [baseScene])
  const { actions, names, mixer } = useAnimations(clips, groupRef)
  const viewerSettings = useMemo(() => getViewerSettings(), [])

  // IK mode state
  const [skinnedMesh, setSkinnedMesh] = useState<THREE.SkinnedMesh | null>(null)
  const [skeleton, setSkeleton] = useState<THREE.Skeleton | null>(null)
  const [skeletonRoot, setSkeletonRoot] = useState<THREE.Object3D | null>(null)
  
  // Find skeleton when model loads
  useEffect(() => {
    if (!root) return
    let found = false
    root.traverse((node) => {
      if (found) return
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh
        setSkinnedMesh(mesh)
        setSkeleton(mesh.skeleton)
        
        // Log full hierarchy to debug coordinate space issues
        console.log('🦴 === SKELETON HIERARCHY DEBUG ===')
        console.log('🦴 Root (normalized Group):', root.name, 'scale:', root.scale, 'rotation:', root.rotation)
        
        // Find the scaled model node (first child of root)
        const modelNode = root.children[0]
        if (modelNode) {
          console.log('🦴 Model (scaled child):', modelNode.name, 'scale:', modelNode.scale, 'rotation:', modelNode.rotation)
        }
        
        // Check bone parent
        const boneParent = mesh.skeleton.bones[0]?.parent
        if (boneParent) {
          console.log('🦴 Bone parent (Armature?):', boneParent.name, 'scale:', boneParent.scale, 'rotation:', boneParent.rotation)
        }
        
        console.log('🦴 SkinnedMesh:', mesh.name, 'scale:', mesh.scale, 'rotation:', mesh.rotation)
        console.log('🦴 === END HIERARCHY DEBUG ===')
        
        // Use the entire normalized root as skeletonRoot
        // IK targets will be parented to skeleton.bones[0].parent by ikSolverConfig
        setSkeletonRoot(root)
        found = true
        console.log('🦴 Skeleton bone names:', mesh.skeleton.bones.map(b => b.name))
      }
    })
  }, [root])

  useEffect(() => {
    if (!onSkeletonReady) return
    onSkeletonReady(skeleton ?? null)
    return () => {
      onSkeletonReady(null)
    }
  }, [skeleton, onSkeletonReady])

  useEffect(() => {
    if (!ikMode) return
    try {
      mixer?.stopAllAction()
      currentActionRef.current = null
    } catch {
      /* noop */
    }
  }, [ikMode, mixer])
  

  usePlaybackAPI(ref, {
    actions: actions ?? null,
    currentAnimationId: activeId,
    isAnimating,
    defaultNames: names,
  })

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.clear()
    groupRef.current.add(root)
    animationDebug('V2Model metrics', metrics)
    onMetrics?.(metrics)
  }, [root, metrics, onMetrics])

  useEffect(() => {
    const resolved = resolveAnimationId(requestedId)
    if (resolved && resolved !== activeId) {
      setActiveId(resolved)
    }
  }, [requestedId, activeId])

  useEffect(() => {
    if (!actions || !mixer || ikMode) return
    const fallback = actions[DEFAULT_ANIMATION_ID] ? DEFAULT_ANIMATION_ID : names.find((n) => actions[n])
    const targetId = actions[activeId] ? activeId : fallback
    if (!targetId) return

    const actionChanged = currentActionRef.current !== targetId
    if (actionChanged) {
      playAction(actions as any, mixer as any, targetId)
      currentActionRef.current = targetId
      onActiveChange?.(targetId)
    }

    const targetAction = actions[targetId]
    if (!targetAction) return

    const manifestSpec = ANIMATIONS.find((anim) => anim.id === targetId)
    const baseSpeed = Math.max(0.1, manifestSpec?.speed ?? viewerSettings.defaultSpeed ?? 1)
    const effectiveSpeed = baseSpeed * speedMultiplier

    try {
      targetAction.setEffectiveTimeScale?.(effectiveSpeed)
      if (typeof (targetAction as any).timeScale === 'number') {
        ;(targetAction as any).timeScale = effectiveSpeed
      }
      mixer.update(0)
    } catch {
      /* noop */
    }

    targetAction.paused = !isAnimating
    targetAction.enabled = true
  }, [
    actions,
    mixer,
    names,
    activeId,
    isAnimating,
    onActiveChange,
    viewerSettings,
    ikMode,
    speedMultiplier,
  ])

  useEffect(() => {
    if (!names.length || activeId) return
    const first = names[0]
    if (first) {
      setActiveId(first)
    }
  }, [names, activeId])

  useFrame((_, delta) => {
    if (!mixer || !isAnimating || ikMode) return
    try {
      mixer.update(delta)
    } catch {
      /* noop */
    }
  })

  return (
    <>
      <group ref={groupRef} dispose={null}>
        <primitive object={root} />
      </group>
      
      {skinnedMesh && skeleton && skeletonRoot && (
        <InteractiveBoneController
          skinnedMesh={skinnedMesh}
          skeleton={skeleton}
          skeletonRoot={skeletonRoot}
          enabled={ikMode} // Only enable IK drag in IK mode
          playbackMode={!ikMode} // Enable joint selection for ROM tracking in playback mode
          showVisualFeedback={true}
          showDebugInfo={ikMode} // Only show IK chain debug lines in IK mode
          constraintsEnabled={constraintsEnabled}
          onBoneSelect={onBoneSelect}
          onConstraintViolation={onConstraintViolation}
          onDragStart={() => onDragStateChange?.(true)}
          onDragEnd={() => onDragStateChange?.(false)}
          resetCounter={ikResetCounter}
        />
      )}
    </>
  )
})

export default V2Model
