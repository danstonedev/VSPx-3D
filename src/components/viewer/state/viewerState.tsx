import { createContext, useContext, useMemo, useReducer, type Dispatch } from 'react'
import type * as THREE from 'three'
import type { ConstraintViolation } from '../constraints/constraintValidator'
import type { ModelMetrics } from '../utils/modelMetrics'

export type ViewerPlaybackState = {
  animationId: string
  isPlaying: boolean
  speed: number
}

export type ViewerModeState = {
  ikMode: boolean
  constraintsEnabled: boolean
}

export type ViewerIKState = {
  selectedBone: THREE.Bone | null
  constraintViolations: ConstraintViolation[]
  skeleton: THREE.Skeleton | null
  resetCounter: number
}

export type ViewerMetricsState = {
  modelMetrics: ModelMetrics | null
}

export type ViewerState = {
  playback: ViewerPlaybackState
  mode: ViewerModeState
  ik: ViewerIKState
  metrics: ViewerMetricsState
}

const defaultState: ViewerState = {
  playback: {
    animationId: '',
    isPlaying: true,
    speed: 1,
  },
  mode: {
    ikMode: false,
    constraintsEnabled: true,
  },
  ik: {
    selectedBone: null,
    constraintViolations: [],
    skeleton: null,
    resetCounter: 0,
  },
  metrics: {
    modelMetrics: null,
  },
}

type ViewerAction =
  | { type: 'playback/setAnimation'; animationId: string }
  | { type: 'playback/setPlaying'; isPlaying: boolean }
  | { type: 'playback/setSpeed'; speed: number }
  | { type: 'mode/setIkMode'; ikMode: boolean }
  | { type: 'mode/setConstraintsEnabled'; constraintsEnabled: boolean }
  | { type: 'ik/setSelectedBone'; bone: THREE.Bone | null }
  | { type: 'ik/setConstraintViolations'; violations: ConstraintViolation[] }
  | { type: 'ik/setSkeleton'; skeleton: THREE.Skeleton | null }
  | { type: 'ik/requestReset' }
  | { type: 'metrics/setModelMetrics'; metrics: ModelMetrics | null }

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'playback/setAnimation':
      return {
        ...state,
        playback: { ...state.playback, animationId: action.animationId },
      }
    case 'playback/setPlaying':
      return {
        ...state,
        playback: { ...state.playback, isPlaying: action.isPlaying },
      }
    case 'playback/setSpeed':
      return {
        ...state,
        playback: { ...state.playback, speed: action.speed },
      }
    case 'mode/setIkMode':
      return {
        ...state,
        mode: { ...state.mode, ikMode: action.ikMode },
      }
    case 'mode/setConstraintsEnabled':
      return {
        ...state,
        mode: { ...state.mode, constraintsEnabled: action.constraintsEnabled },
      }
    case 'ik/setSelectedBone':
      return {
        ...state,
        ik: { ...state.ik, selectedBone: action.bone },
      }
    case 'ik/setConstraintViolations':
      return {
        ...state,
        ik: { ...state.ik, constraintViolations: action.violations },
      }
    case 'ik/setSkeleton':
      return {
        ...state,
        ik: { ...state.ik, skeleton: action.skeleton },
      }
    case 'ik/requestReset':
      return {
        ...state,
        ik: { ...state.ik, resetCounter: state.ik.resetCounter + 1 },
      }
    case 'metrics/setModelMetrics':
      return {
        ...state,
        metrics: { ...state.metrics, modelMetrics: action.metrics },
      }
    default:
      return state
  }
}

const ViewerStateContext = createContext<ViewerState | undefined>(undefined)
const ViewerDispatchContext = createContext<Dispatch<ViewerAction> | undefined>(undefined)

export type ViewerStateProviderProps = {
  children: React.ReactNode
  initialState?: Partial<ViewerState>
}

export function ViewerStateProvider({ children, initialState }: ViewerStateProviderProps) {
  const memoInitial = useMemo(() => ({
    ...defaultState,
    ...initialState,
    playback: { ...defaultState.playback, ...initialState?.playback },
    mode: { ...defaultState.mode, ...initialState?.mode },
    ik: { ...defaultState.ik, ...initialState?.ik },
    metrics: { ...defaultState.metrics, ...initialState?.metrics },
  }), [initialState])

  const [state, dispatch] = useReducer(viewerReducer, memoInitial)

  return (
    <ViewerDispatchContext.Provider value={dispatch}>
      <ViewerStateContext.Provider value={state}>{children}</ViewerStateContext.Provider>
    </ViewerDispatchContext.Provider>
  )
}

export function useViewerState(): ViewerState {
  const ctx = useContext(ViewerStateContext)
  if (!ctx) {
    throw new Error('useViewerState must be used within a ViewerStateProvider')
  }
  return ctx
}

export function useViewerDispatch(): Dispatch<ViewerAction> {
  const ctx = useContext(ViewerDispatchContext)
  if (!ctx) {
    throw new Error('useViewerDispatch must be used within a ViewerStateProvider')
  }
  return ctx
}

export function useViewerSelector<T>(selector: (state: ViewerState) => T): T {
  const state = useViewerState()
  return selector(state)
}
