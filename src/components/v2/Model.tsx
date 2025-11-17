import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useAnimationClips } from '../viewer/hooks/useAnimationClips'
import { usePlaybackAPI, type PlaybackAPI } from '../viewer/hooks/usePlaybackAPI'
import { normalizeHumanModel, type ModelMetrics } from '../viewer/utils/modelMetrics'
import { ANIMATIONS, DEFAULT_ANIMATION_ID } from '../viewer/animations/manifest'
import { getViewerSettings } from '../../shared/settings'
import { playAction } from '../viewer/utils/mixerController'
import { animationDebug } from '../../shared/utils/animationLogging'

export type V2ModelProps = {
  isAnimating: boolean
  requestedId?: string
  onActiveChange?: (id: string) => void
  onMetrics?: (metrics: ModelMetrics) => void
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
  { isAnimating, requestedId, onActiveChange, onMetrics },
  ref
) {
  const groupRef = useRef<THREE.Group>(null)
  const currentActionRef = useRef<string | null>(null)
  const [activeId, setActiveId] = useState<string>(DEFAULT_ANIMATION_ID)
  const { baseScene, clips } = useAnimationClips()
  const { root, metrics } = useMemo(() => normalizeHumanModel(baseScene), [baseScene])
  const { actions, names, mixer } = useAnimations(clips, groupRef)
  const viewerSettings = useMemo(() => getViewerSettings(), [])

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
    if (!actions || !mixer) return
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

    if (actionChanged) {
      const manifestSpec = ANIMATIONS.find((anim) => anim.id === targetId)
      const baseSpeed = Math.max(0.1, manifestSpec?.speed ?? viewerSettings.defaultSpeed ?? 1)
      try {
        targetAction.setEffectiveTimeScale?.(baseSpeed)
        if (typeof (targetAction as any).timeScale === 'number') {
          ;(targetAction as any).timeScale = baseSpeed
        }
        mixer.update(0)
      } catch {
        /* noop */
      }
    }

    targetAction.paused = !isAnimating
    targetAction.enabled = true
  }, [actions, mixer, names, activeId, isAnimating, onActiveChange, viewerSettings])

  useEffect(() => {
    if (!names.length || activeId) return
    const first = names[0]
    if (first) {
      setActiveId(first)
    }
  }, [names, activeId])

  useFrame((_, delta) => {
    if (!mixer || !isAnimating) return
    try {
      mixer.update(delta)
    } catch {
      /* noop */
    }
  })

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={root} />
    </group>
  )
})

export default V2Model
