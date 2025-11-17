import type { PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { SceneLayout } from './sceneLayout'

/**
 * Frame the camera and orbit controls around the model using its metrics.
 * Keeps all camera math in one place for easier debugging.
 */
export function frameCamera(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null | undefined,
  layout: SceneLayout
) {
  const [px, py, pz] = layout.cameraPosition
  const [tx, ty, tz] = layout.cameraTarget

  camera.position.set(px, py, pz)
  camera.near = 0.05
  camera.far = layout.far
  camera.updateProjectionMatrix()

  if (controls) {
    controls.minDistance = layout.minDistance
    controls.maxDistance = layout.maxDistance
    controls.target.set(tx, ty, tz)
    controls.update()
  }
}
