import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { capturePoseSnapshot, diffPoseSnapshots, formatPoseDeltas } from '../skeletonDiagnostics'

function createTestSkeleton() {
  const root = new THREE.Bone()
  root.name = 'root'

  const child = new THREE.Bone()
  child.name = 'child'
  child.position.set(0, 1, 0)
  root.add(child)

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial()
  const skinnedMesh = new THREE.SkinnedMesh(geometry, material)
  skinnedMesh.add(root)
  const skeleton = new THREE.Skeleton([root, child])
  skinnedMesh.bind(skeleton)
  skinnedMesh.updateMatrixWorld(true)

  return { skeleton, bones: { root, child }, dispose: () => geometry.dispose() }
}

describe('skeletonDiagnostics', () => {
  it('reports no deltas when pose is unchanged', () => {
    const { skeleton, dispose } = createTestSkeleton()
    const baseline = capturePoseSnapshot(skeleton)
    const comparison = capturePoseSnapshot(skeleton)
    const deltas = diffPoseSnapshots(baseline, comparison)

    expect(deltas).toHaveLength(0)
    dispose()
  })

  it('detects translation and rotation deltas', () => {
    const { skeleton, bones, dispose } = createTestSkeleton()
    const baseline = capturePoseSnapshot(skeleton)

    bones.child.position.x = 0.5
    bones.child.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0))
    bones.child.updateMatrixWorld(true)
    skeleton.bones.forEach((bone) => bone.updateMatrixWorld(true))

    const comparison = capturePoseSnapshot(skeleton)
    const deltas = diffPoseSnapshots(baseline, comparison, 1e-5)

    expect(deltas).toHaveLength(1)
    expect(deltas[0].boneName).toBe('child')
    expect(deltas[0].positionDelta.length()).toBeGreaterThan(0.4)
    expect(deltas[0].rotationDeltaDeg).toBeCloseTo(45, 1)
    expect(formatPoseDeltas(deltas)).toContain('child')

    dispose()
  })
})
