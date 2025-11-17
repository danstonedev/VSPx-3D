import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { normalizeHumanModel } from '../modelMetrics'
import { computeSceneLayout } from '../sceneLayout'
import { SCENE_WORLD_SIZE } from '../sceneScale'

function makeDummyHuman(height: number) {
  const geo = new THREE.BoxGeometry(0.5, height, 0.5)
  const mat = new THREE.MeshBasicMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  const scene = new THREE.Group()
  scene.add(mesh)
  return scene
}

describe('unit system and layout', () => {
  it('normalizes mannequin height to desired meters', () => {
    const desiredHeight = 1.8
    const scene = makeDummyHuman(3)
    const { metrics } = normalizeHumanModel(scene, desiredHeight)

    const size = metrics.boundingBox.getSize(new THREE.Vector3())
    expect(size.y).toBeGreaterThan(1.7)
    expect(size.y).toBeLessThan(1.9)
    expect(metrics.desiredHeight).toBeCloseTo(desiredHeight)
  })

  it('computes camera distance and ground size as sensible multiples of human height', () => {
    const desiredHeight = 1.8
    const scene = makeDummyHuman(desiredHeight)
    const { metrics } = normalizeHumanModel(scene, desiredHeight)

    const layout = computeSceneLayout(metrics)
    const distance = new THREE.Vector3(...layout.cameraPosition)
      .sub(new THREE.Vector3(...layout.cameraTarget)).length()

    // Camera should be a few human heights away, not orders of magnitude.
    expect(distance).toBeGreaterThan(desiredHeight * 1.5)
    expect(distance).toBeLessThan(desiredHeight * 15)

    // Ground should span dozens of meters around the figure.
    expect(layout.groundSize).toBeGreaterThan(desiredHeight * 10)
  })

  it('derives mannequin height and ground size in meters', () => {
    const desiredHeight = 1.8
    const scene = makeDummyHuman(desiredHeight * 2) // start larger to exercise scaling
    const { metrics } = normalizeHumanModel(scene, desiredHeight)
    const heightMeters = metrics.boundingBox.getSize(new THREE.Vector3()).y
    const layout = computeSceneLayout(metrics)

    expect(heightMeters).toBeGreaterThan(1.79)
    expect(heightMeters).toBeLessThan(1.81)
    expect(layout.groundSize).toBe(SCENE_WORLD_SIZE)
  })
})
