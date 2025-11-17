import * as THREE from 'three'
import type { ModelMetrics } from './modelMetrics'
import { SCENE_WORLD_SIZE } from './sceneScale'

export type SceneLayout = {
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  groundSize: number
  minDistance: number
  maxDistance: number
  far: number
}

export type GridConfig = {
  size: [number, number]
  cellSize: number
  cellThickness: number
  sectionSize: number
  sectionThickness: number
  fadeDistance: number
}

const DEFAULT_LAYOUT: SceneLayout = {
  cameraPosition: [4.2, 3.1, 7.2],
  cameraTarget: [0, 1.1, 0],
  groundSize: SCENE_WORLD_SIZE,
  minDistance: 3,
  maxDistance: 10,
  far: Math.max(200, SCENE_WORLD_SIZE * 1.5),
}

export function computeSceneLayout(metrics?: ModelMetrics | null): SceneLayout {
  if (!metrics) {
    return DEFAULT_LAYOUT
  }

  const { boundingSphere, desiredHeight } = metrics

  // Human height in meters (1 unit = 1 m)
  const humanHeight = desiredHeight

  // Aim at belly button height (mid-body)
  const cx = boundingSphere.center.x
  const cz = boundingSphere.center.z
  const cy = Math.max(boundingSphere.center.y, humanHeight * 0.5)
  const target = new THREE.Vector3(cx, cy, cz)

  // Classic FOV-based full-body framing.
  const fovDeg = 35
  const fovRad = (fovDeg * Math.PI) / 180
  const marginFactor = 1.3 // how much extra space above/below the figure
  const visibleHeight = humanHeight * marginFactor
  const baseDistance = Math.max(visibleHeight / (2 * Math.tan(fovRad / 2)), humanHeight * 2)
  
  // Position camera 2x closer and directly in front for pure frontal view
  const distance = baseDistance * 0.5
  const cameraPosition = target.clone().add(new THREE.Vector3(0, 0, distance))

  // Ground spans a reasonable area around the figure.
  const groundSize = Math.max(humanHeight * 20, SCENE_WORLD_SIZE)

  // Orbit controls: allow some zoom in/out, but keep scale sane.
  const minDistance = distance * 0.5
  const maxDistance = distance * 3.0
  const far = distance * 8

  return {
    cameraPosition: cameraPosition.toArray() as [number, number, number],
    cameraTarget: target.toArray() as [number, number, number],
    groundSize,
    minDistance,
    maxDistance,
    far,
  }
}

export function getGridConfig(perfMode: boolean): GridConfig {
  // Scale grid to match the zoomed-out world so lines remain visible but not overwhelming
  const baseSizeValue = perfMode ? SCENE_WORLD_SIZE * 0.4 : SCENE_WORLD_SIZE * 0.6
  const sizeValue = baseSizeValue // already in meters
  const cellSize = perfMode ? 2 : 1.5 // meters per minor cell
  const cellThickness = (perfMode ? 0.5 : 1) // thin lines
  const sectionSize = sizeValue * (perfMode ? 0.08 : 0.1) // more frequent section lines
  const sectionThickness = (perfMode ? 2 : 3) // slightly thicker for major lines
  
  return {
    size: [sizeValue, sizeValue],
    cellSize,
    cellThickness,
    sectionSize,
    sectionThickness,
    fadeDistance: sizeValue * (perfMode ? 1.2 : 1.5),
  }
}
