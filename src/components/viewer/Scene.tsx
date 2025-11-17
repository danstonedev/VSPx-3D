import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { Grid, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { PassiveOrbitControls } from './PassiveOrbitControls'
import V2Model from '@/v2/Model'
import { frameCamera } from './utils/cameraFramer'
import { computeSceneLayout, getGridConfig } from './utils/sceneLayout'
import type { ModelMetrics } from './utils/modelMetrics'
import type * as THREE from 'three'
import type { ConstraintViolation } from './constraints/constraintValidator'



type SceneProps = {
  isAnimating: boolean
  animationPrompt?: string
  controlsRef?: MutableRefObject<OrbitControlsImpl | null>
  onPromptResult?: (result: string) => void
  humanFigureRef?: React.Ref<unknown>
  onAnimationChange?: (id: string) => void
  ikMode?: boolean
  constraintsEnabled?: boolean
  speedMultiplier?: number
  onBoneSelect?: (bone: THREE.Bone | null) => void
  onConstraintViolation?: (violations: ConstraintViolation[]) => void
  onSkeletonReady?: (skeleton: THREE.Skeleton | null) => void
  ikResetCounter?: number
}

/**
 * 3D Scene setup with lighting, environment, and the human figure
 */
// Define Error Boundary outside of the Scene component so React preserves subtree between renders
class LocalErrorBoundary extends React.Component<React.PropsWithChildren<object>, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any) {
    // Silent error handling for production
    try {
      console.error('3D Scene Error:', error?.message || error)
    } catch {
      /* noop */
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="r3f-debug-overlay">
            <div className="r3f-debug-title">3D Scene Error</div>
            <div>There was a problem rendering the scene.</div>
            <div className="error-hint">Check the browser console for details.</div>
          </div>
        </Html>
      )
    }
    return this.props.children
  }
}

export default function Scene({
  isAnimating,
  animationPrompt,
  controlsRef,
  humanFigureRef,
  onAnimationChange,
  ikMode = false,
  constraintsEnabled = true,
  speedMultiplier = 1,
  onBoneSelect,
  onConstraintViolation,
  onSkeletonReady,
  ikResetCounter = 0,
}: SceneProps) {

  const internalControlsRef = useRef<OrbitControlsImpl>(null)
  const orbitRef = controlsRef ?? internalControlsRef
  const { camera } = useThree()
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const metricsReceivedRef = useRef(false)
  const [lightsReady, setLightsReady] = useState(false)
  // Env-driven perf mode: trims lights and grid complexity
  const parseBool = useCallback((v: unknown, fallback: boolean) => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v !== 0
    if (typeof v !== 'string') return fallback
    const s = v.trim().toLowerCase()
    return ['1','true','yes','on','enable','enabled'].includes(s) ? true : (['0','false','no','off','disable','disabled'].includes(s) ? false : fallback)
  }, [])
  const env = (import.meta as any)?.env ?? {}
  const perfMode = parseBool(env.VITE_VIEWER_PERF_MODE, false)
  // Debug overlay removed
  
  // Memoize the metrics callback to prevent infinite re-renders
  const handleMetrics = useCallback((newMetrics: ModelMetrics) => {
    // Only set metrics once to avoid triggering camera framing loop
    if (!metricsReceivedRef.current) {
      metricsReceivedRef.current = true
      setMetrics(newMetrics)
    }
  }, [])

  const layout = useMemo(() => computeSceneLayout(metrics), [metrics])
  const gridConfig = useMemo(() => getGridConfig(perfMode), [perfMode])
  

  useEffect(() => {
    if (!metrics || !orbitRef.current) {
      return
    }

    const computedLayout = computeSceneLayout(metrics)
    frameCamera(camera as any, orbitRef.current, computedLayout)
  }, [camera, metrics, orbitRef])

  const disableControls = useCallback(() => {
    if (orbitRef.current) {
      ;(orbitRef.current as any).enabled = false
    }
  }, [orbitRef])

  const enableControls = useCallback(() => {
    if (orbitRef.current) {
      ;(orbitRef.current as any).enabled = true
    }
  }, [orbitRef])

  useEffect(() => () => enableControls(), [enableControls])

  const handleDragStateChange = useCallback(
    (dragging: boolean) => {
      if (dragging) {
        disableControls()
      } else {
        enableControls()
      }
    },
    [disableControls, enableControls]
  )

  // Defer secondary lights to reduce TTFP; keep ambient + key light immediate
  useEffect(() => {
    if (perfMode) return
  const raf = requestAnimationFrame(() => setLightsReady(true))
  return () => cancelAnimationFrame(raf)
  }, [perfMode])

  // Lightweight HUD for diagnostics (polls every 200ms when enabled)
  // Debug HUD polling removed

  // (moved LocalErrorBoundary to file scope above)

  return (
    <>
      {/* Camera controls - orbit around the figure */}
      <PassiveOrbitControls
        ref={orbitRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={layout.minDistance}
        maxDistance={layout.maxDistance}
        target={layout.cameraTarget}
        maxPolarAngle={Math.PI * 0.9}
      />

      {/* Enhanced lighting for realistic skin rendering - custom configuration for full viewer */}
      <ambientLight intensity={perfMode ? 0.6 : 0.8} />
      {/* Key light always present; shadowing still controlled by Canvas prop */}
      <directionalLight
        position={[5, 10, 7]}
        intensity={perfMode ? 0.9 : 1.2}
        castShadow={!perfMode}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Secondary lights are skipped in perf mode; otherwise deferred one frame */}
      {!perfMode && lightsReady && (
        <>
          <directionalLight position={[-5, 5, -5]} intensity={0.6} />
          <directionalLight position={[0, 5, -10]} intensity={0.4} />
          <pointLight position={[0, 3, 5]} intensity={0.5} />
        </>
      )}

      {/* UND-green grid at ground level */}
      <Grid
        args={[layout.groundSize, layout.groundSize]}
        cellSize={gridConfig.cellSize}
        cellThickness={gridConfig.cellThickness}
        cellColor="#009A44"
        sectionSize={gridConfig.sectionSize}
        sectionThickness={gridConfig.sectionThickness}
        sectionColor="#009A44"
        fadeDistance={gridConfig.fadeDistance}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0, 0]}
      />

      {/* No placeholder - keep scene clean during load */}

      {/* v2 Model viewer */}
      <LocalErrorBoundary>
        <Suspense fallback={null}>
          <V2Model
            ref={humanFigureRef as any}
            isAnimating={ikMode ? false : isAnimating}
            requestedId={animationPrompt}
            onActiveChange={onAnimationChange}
            onMetrics={handleMetrics}
            ikMode={ikMode}
            constraintsEnabled={constraintsEnabled}
            speedMultiplier={speedMultiplier}
            onBoneSelect={onBoneSelect}
            onConstraintViolation={onConstraintViolation}
            onSkeletonReady={onSkeletonReady}
            ikResetCounter={ikResetCounter}
            onDragStateChange={handleDragStateChange}
          />
        </Suspense>
      </LocalErrorBoundary>
      {/* ROM panel is rendered outside Canvas in Viewer3D */}
      {/* Debug overlay removed */}
    </>
  )
}
