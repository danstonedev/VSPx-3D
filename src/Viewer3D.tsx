import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import type * as THREE from 'three'
import type { ConstraintViolation } from './components/viewer/constraints/constraintValidator'
import {
  ANIMATIONS,
  DEFAULT_ANIMATION_ID,
  getAnimationDisplayName,
} from './components/viewer/animations/manifest'
import Scene from './components/viewer/Scene'
import './styles/viewer3d.css'
import './styles/animations.css'
import { RangeOfMotionPanel } from './components/viewer/debug/RangeOfMotionPanel'
import {
  ViewerStateProvider,
  useViewerDispatch,
  useViewerSelector,
} from './components/viewer/state/viewerState'

interface Viewer3DProps {
  initialAnimation?: string
}

function Viewer3D({ initialAnimation = DEFAULT_ANIMATION_ID }: Viewer3DProps) {
  const animationOptions = useMemo(() => ANIMATIONS.map((a) => a.id), [])
  const initialId = animationOptions.includes(initialAnimation)
    ? initialAnimation
    : DEFAULT_ANIMATION_ID

  return (
    <ViewerStateProvider
      initialState={{
        playback: { animationId: initialId, isPlaying: true, speed: 1 },
      }}
    >
      <Viewer3DContents animationOptions={animationOptions} />
    </ViewerStateProvider>
  )
}

type Viewer3DContentsProps = {
  animationOptions: string[]
}

function Viewer3DContents({ animationOptions }: Viewer3DContentsProps) {
  const dispatch = useViewerDispatch()
  const selectedAnimation = useViewerSelector((s) => s.playback.animationId)
  const isPlaying = useViewerSelector((s) => s.playback.isPlaying)
  const speedMultiplier = useViewerSelector((s) => s.playback.speed)
  const ikMode = useViewerSelector((s) => s.mode.ikMode)
  const constraintsEnabled = useViewerSelector((s) => s.mode.constraintsEnabled)
  const constraintViolations = useViewerSelector((s) => s.ik.constraintViolations)
  const selectedBone = useViewerSelector((s) => s.ik.selectedBone)
  const skeletonForPanel = useViewerSelector((s) => s.ik.skeleton)
  const ikResetCounter = useViewerSelector((s) => s.ik.resetCounter)

  const handleBoneSelect = useCallback(
    (bone: THREE.Bone | null) => dispatch({ type: 'ik/setSelectedBone', bone }),
    [dispatch]
  )
  const handleConstraintViolation = useCallback(
    (violations: ConstraintViolation[]) =>
      dispatch({ type: 'ik/setConstraintViolations', violations }),
    [dispatch]
  )
  const handleSkeletonReady = useCallback(
    (skeleton: THREE.Skeleton | null) => dispatch({ type: 'ik/setSkeleton', skeleton }),
    [dispatch]
  )
  const requestIkReset = useCallback(() => dispatch({ type: 'ik/requestReset' }), [dispatch])

  useEffect(() => {
    if (ikMode) {
      requestIkReset()
    }
  }, [ikMode, requestIkReset])

  return (
    <div className="viewer-layout">
      <Canvas className="viewer-canvas" shadows>
        <Suspense fallback={null}>
          <Scene
            isAnimating={isPlaying}
            animationPrompt={selectedAnimation}
            humanFigureRef={null}
            onAnimationChange={(id) => dispatch({ type: 'playback/setAnimation', animationId: id })}
            ikMode={ikMode}
            constraintsEnabled={constraintsEnabled}
            speedMultiplier={speedMultiplier}
            onBoneSelect={handleBoneSelect}
            onConstraintViolation={handleConstraintViolation}
            onSkeletonReady={handleSkeletonReady}
            ikResetCounter={ikResetCounter}
          />
        </Suspense>
      </Canvas>

      <RangeOfMotionPanel
        selectedBone={selectedBone}
        skeleton={skeletonForPanel}
        constraintViolations={constraintViolations as any}
        onResetPose={ikMode ? requestIkReset : undefined}
        onToggleConstraints={
          ikMode
            ? () => {
                const next = !constraintsEnabled
                dispatch({ type: 'mode/setConstraintsEnabled', constraintsEnabled: next })
              }
            : undefined
        }
        constraintsEnabled={constraintsEnabled}
        isInteractive={ikMode}
      />

      <aside className="viewer-panel" aria-label="3D animation controls">
        <header className="viewer-panel__header">
          <h2 className="viewer-panel__title">{ikMode ? 'Interactive IK Controls' : '3D Animation Controls'}</h2>
        </header>

        <label className="viewer-panel__label" htmlFor="mode-select">
          Mode
        </label>
        <select
          id="mode-select"
          className="viewer-panel__select"
          value={ikMode ? 'ik' : 'animation'}
          onChange={(event) => dispatch({ type: 'mode/setIkMode', ikMode: event.target.value === 'ik' })}
        >
          <option value="animation">Animation Playback</option>
          <option value="ik">Interactive IK (Pose Mode)</option>
        </select>

        {!ikMode && (
          <>
            <label className="viewer-panel__label" htmlFor="animation-select">
              Animation
            </label>
            <select
              id="animation-select"
              className="viewer-panel__select"
              value={selectedAnimation}
              onChange={(event) =>
                dispatch({ type: 'playback/setAnimation', animationId: event.target.value })
              }
            >
              {animationOptions.map((id) => (
                <option key={id} value={id}>
                  {getAnimationDisplayName(id)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={`viewer-panel__button ${isPlaying ? 'viewer-panel__button--stop' : 'viewer-panel__button--start'}`}
              onClick={() => dispatch({ type: 'playback/setPlaying', isPlaying: !isPlaying })}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <label className="viewer-panel__label" htmlFor="speed-slider">
              Speed {speedMultiplier.toFixed(1)}x
            </label>
            <input
              id="speed-slider"
              className="viewer-panel__slider"
              type="range"
              min={0.25}
              max={2}
              step={0.05}
              value={speedMultiplier}
              onChange={(event) => dispatch({ type: 'playback/setSpeed', speed: Number(event.target.value) })}
            />
          </>
        )}

        {ikMode && (
          <div className="viewer-panel__hint viewer-panel__hint--spaced">
            <strong>🎯 Interactive IK Mode</strong>
            <ul>
              <li>Click and drag orange/green balls to pose</li>
              <li><strong>Shift+click</strong> purple joints to inspect ROM</li>
              <li>See Range of Motion panel (top-right)</li>
              <li>Constraints prevent impossible poses</li>
              <li>Collision warnings show in red</li>
            </ul>
            <button
              type="button"
              className="viewer-panel__button"
              onClick={requestIkReset}
            >
              Reset to T-Pose
            </button>
          </div>
        )}

        {!ikMode && (
          <div className="viewer-panel__hint viewer-panel__hint--spaced">
            <strong>📊 Live ROM Tracking</strong>
            <ul>
              <li>Click <strong className="cyan-text">cyan spheres</strong> to select joints</li>
              <li>Watch Range of Motion update live during animation</li>
              <li>Track hip, knee, shoulder, elbow angles in real-time</li>
              <li>Educational tool for biomechanics students</li>
            </ul>
          </div>
        )}

        {/* Scene layout now handled internally by Scene; omit ground size text for simplicity */}

        <div className="viewer-panel__hint" role="note">
          <strong>Mouse Controls</strong>
          <ul>
            <li>Left click + drag: rotate</li>
            <li>Right click + drag: pan</li>
            <li>Scroll: zoom</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

export default Viewer3D
