import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { ANIMATIONS, DEFAULT_ANIMATION_ID } from './animations/manifest'
import { useAnimationClips } from './hooks/useAnimationClips'
import { normalizeHumanModel, type ModelMetrics } from './utils/modelMetrics'
import { animationDebug } from '../../shared/utils/animationLogging'
import { getViewerSettings } from '../../shared/settings'
import { playAction } from './utils/mixerController'

type HumanFigureProps = {
  animationId: string
  isPlaying: boolean
  speed: number
  onMetrics?: (metrics: ModelMetrics) => void
}

/**
 * Loads the Manny mannequin once and plays Mixamo animation clips.
 * Uses the scanned animation manifest rather than procedural posing.
 */
export default function HumanFigure({ animationId, isPlaying, speed, onMetrics }: HumanFigureProps) {
  const groupRef = useRef<THREE.Group>(null)
  const currentActionRef = useRef<string | null>(null)

  const { baseScene, clips } = useAnimationClips()

  const { root, metrics } = useMemo(() => {
    return normalizeHumanModel(baseScene)
  }, [baseScene])

  const { actions, names, mixer } = useAnimations(clips, groupRef)

  // Attach the normalized model to the scene graph
  useEffect(() => {
    if (!groupRef.current) return
    // Clear any previous children to avoid duplicates during HMR
    groupRef.current.clear()
    groupRef.current.add(root)
    animationDebug('HumanFigure normalized metrics', metrics)
    onMetrics?.(metrics)
  }, [root, metrics, onMetrics])

  // Ensure the mixer advances while playing
  useFrame((_, delta) => {
    if (!mixer || !isPlaying) return
    try {
      mixer.update(delta)
    } catch {
      /* noop */
    }
  })

  // Handle animation selection / playback state
  useEffect(() => {
    if (!actions || !mixer || names.length === 0) return

    const availableId = actions[animationId] ? animationId : undefined
    const fallbackId = availableId || DEFAULT_ANIMATION_ID || names[0]
    const targetId = actions[fallbackId] ? fallbackId : names.find((n) => actions[n])
    if (!targetId) return

    if (currentActionRef.current !== targetId) {
      playAction(actions as any, mixer as any, targetId)
      currentActionRef.current = targetId
    }

    const targetAction = actions[targetId]
    if (!targetAction) return

    const spec = ANIMATIONS.find((a) => a.id === targetId)
    const baseSpeed = spec?.speed ?? getViewerSettings().defaultSpeed
    const finalSpeed = Math.max(0.1, baseSpeed * speed)

    try {
      targetAction.setEffectiveTimeScale?.(finalSpeed)
      ;(targetAction as any).timeScale = finalSpeed
    } catch {
      /* noop */
    }

    targetAction.paused = !isPlaying
    targetAction.enabled = true

    try {
      mixer.update(0)
    } catch {
      /* noop */
    }
  }, [actions, mixer, names, animationId, isPlaying, speed])

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={root} />
    </group>
  )
}
