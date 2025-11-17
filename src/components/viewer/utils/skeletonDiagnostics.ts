import * as THREE from 'three'

export type BonePoseSnapshot = {
  name: string
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
}

export type PoseSnapshot = Map<string, BonePoseSnapshot>

export type PoseDelta = {
  boneName: string
  positionDelta: THREE.Vector3
  rotationDeltaDeg: number
  scaleDelta: THREE.Vector3
}

/**
 * Capture an immutable snapshot of every bone's world transform.
 */
export function capturePoseSnapshot(skeleton: THREE.Skeleton): PoseSnapshot {
  const snapshot: PoseSnapshot = new Map()

  skeleton.bones.forEach((bone) => {
    bone.updateWorldMatrix(true, false)
    snapshot.set(bone.uuid, {
      name: bone.name,
      position: bone.getWorldPosition(new THREE.Vector3()),
      quaternion: bone.getWorldQuaternion(new THREE.Quaternion()),
      scale: bone.getWorldScale(new THREE.Vector3())
    })
  })

  return snapshot
}

/**
 * Compare two pose snapshots and return per-bone deltas exceeding the tolerance.
 */
export function diffPoseSnapshots(
  baseline: PoseSnapshot,
  comparison: PoseSnapshot,
  tolerance: number = 1e-4
): PoseDelta[] {
  const deltas: PoseDelta[] = []

  baseline.forEach((entry, uuid) => {
    const current = comparison.get(uuid)
    if (!current) {
      deltas.push({
        boneName: entry.name,
        positionDelta: new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN),
        rotationDeltaDeg: Number.NaN,
        scaleDelta: new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN)
      })
      return
    }

    const positionDelta = current.position.clone().sub(entry.position)
    const rotationDeltaDeg = THREE.MathUtils.radToDeg(
      entry.quaternion.angleTo(current.quaternion)
    )
    const scaleDelta = current.scale.clone().sub(entry.scale)

    if (
      positionDelta.lengthSq() > tolerance * tolerance ||
      Math.abs(rotationDeltaDeg) > tolerance ||
      scaleDelta.lengthSq() > tolerance * tolerance
    ) {
      deltas.push({
        boneName: entry.name,
        positionDelta,
        rotationDeltaDeg,
        scaleDelta
      })
    }
  })

  return deltas
}

/**
 * Human-readable summary for debugging output/tests.
 */
export function formatPoseDeltas(deltas: PoseDelta[]): string {
  if (!deltas.length) {
    return 'No pose deltas'
  }

  return deltas
    .map((delta) => {
      const pos = delta.positionDelta
      const scale = delta.scaleDelta
      return [
        delta.boneName,
        `Δpos=(${pos.x.toFixed(4)},${pos.y.toFixed(4)},${pos.z.toFixed(4)})`,
        `Δrot=${delta.rotationDeltaDeg.toFixed(3)}°`,
        `Δscale=(${scale.x.toFixed(4)},${scale.y.toFixed(4)},${scale.z.toFixed(4)})`
      ].join(' ')
    })
    .join('\n')
}
