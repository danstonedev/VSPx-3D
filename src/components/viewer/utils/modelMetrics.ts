import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

export type ModelMetrics = {
  // All distances are expressed in world units, where 1 unit = 1 meter.
  // desiredHeight is the target mannequin height in meters.
  desiredHeight: number
  scaleFactor: number
  boundingBox: THREE.Box3
  boundingSphere: THREE.Sphere
}

export function normalizeHumanModel(scene: THREE.Object3D, desiredHeight = 1.8) {
  // Use SkeletonUtils.clone to properly rebind skinned meshes to cloned bones
  const root = new THREE.Group()
  const model = SkeletonUtils.clone(scene)
  root.add(model)

  const skinnedMeshes: THREE.SkinnedMesh[] = []

  model.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      // Cast shadows but don't receive them on the skin to avoid self-shadowing artifacts
      mesh.castShadow = true
      mesh.receiveShadow = false

      // Ensure skinned meshes use a skinning-enabled material
      if (child instanceof THREE.SkinnedMesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if (mat && typeof (mat as any) === 'object' && 'skinning' in (mat as any)) {
              ;(mat as any).skinning = true
            }
          })
        } else if (mesh.material) {
          const m = mesh.material as any
          if (m && typeof m === 'object' && 'skinning' in m) {
            m.skinning = true
          }
        }
        skinnedMeshes.push(child as THREE.SkinnedMesh)
      }
    }
  })

  // CRITICAL: Force all transforms to be applied before measuring
  // The GLB may have rotations on the root Armature node (e.g., Z-up → Y-up conversion)
  // Without this, bounding box measurements may use pre-rotation dimensions
  model.updateMatrixWorld(true)

  // Measure raw model as-is
  let bbox = new THREE.Box3().setFromObject(model)
  let size = bbox.getSize(new THREE.Vector3())
  const rawHeight = size.y
  
  console.log('[normalizeHumanModel] RAW BBOX:', bbox.clone())
  console.log('[normalizeHumanModel] RAW SIZE (x,y,z):', size.x, size.y, size.z)
  
  // SIMPLE APPROACH: Scale uniformly so Y = desiredHeight (1.8m)
  const targetScale = desiredHeight / rawHeight
  
  // Apply scale directly to geometry vertices to normalize to ~1.8m
  // This way bones and vertices are in the same coordinate space
  console.log('[normalizeHumanModel] Scaling geometry by:', targetScale)
  
  model.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.geometry) {
        // Scale geometry vertices
        mesh.geometry.scale(targetScale, targetScale, targetScale)
      }
    }
  })
  
  // Find and reset Armature scale to 1.0
  // The Armature currently has scale 0.01, but after scaling geometry we want bones at scale 1.0
  let armature: THREE.Object3D | null = null
  model.traverse(child => {
    if (child.type === 'Bone' && child.parent && child.parent.type !== 'Bone') {
      armature = child.parent
    }
  })
  
  if (armature) {
    const armatureNode = armature as THREE.Object3D
    console.log('[normalizeHumanModel] Found Armature')
    console.log('[normalizeHumanModel] Armature scale BEFORE:', armatureNode.scale.toArray())
    console.log('[normalizeHumanModel] Armature rotation BEFORE:', armatureNode.rotation.toArray())
    
    // The Armature currently has scale 0.01
    // After scaling geometry by targetScale (1.02), we need Armature at targetScale * 0.01 = 0.0102
    // This keeps bones in the same coordinate space as the scaled geometry
    const originalScale = armatureNode.scale.x
    const newScale = originalScale * targetScale
    armatureNode.scale.setScalar(newScale)
    
    // Keep the original rotation - don't mess with it!
    // The geometry was built for this rotation, changing it breaks skinning
    armatureNode.updateMatrix()
    
    console.log('[normalizeHumanModel] Armature scale AFTER:', armatureNode.scale.toArray())
    console.log('[normalizeHumanModel] Armature rotation AFTER:', armatureNode.rotation.toArray())
    console.log('[normalizeHumanModel] Scale calculation:', originalScale, '*', targetScale, '=', newScale)
  }
  
  model.updateMatrixWorld(true)
  
  // Recalculate skeleton binding to match new geometry scale
  skinnedMeshes.forEach(mesh => {
    try {
      console.log('[normalizeHumanModel] Recalculating skeleton for', mesh.name)
      mesh.skeleton.calculateInverses()
      mesh.updateMatrixWorld(true)
    } catch (error) {
      console.warn('[normalizeHumanModel] Failed to recalculate skeleton', error)
    }
  })
  
  // Measure result
  bbox = new THREE.Box3().setFromObject(model)
  size = bbox.getSize(new THREE.Vector3())
  
  console.log('[normalizeHumanModel] TARGET SCALE APPLIED:', targetScale)
  console.log('[normalizeHumanModel] FINAL SIZE (x,y,z):', size.x, size.y, size.z)
  console.log('[normalizeHumanModel] FINAL BBOX:', bbox.clone())

  // Center and ground the model
  bbox = new THREE.Box3().setFromObject(model)
  const center = bbox.getCenter(new THREE.Vector3())
  model.position.sub(center)

  bbox = new THREE.Box3().setFromObject(model)
  model.position.y -= bbox.min.y

  // Final metrics
  bbox = new THREE.Box3().setFromObject(model)

  const metrics: ModelMetrics = {
    desiredHeight,
    scaleFactor: targetScale,
    boundingBox: bbox.clone(),
    boundingSphere: bbox.getBoundingSphere(new THREE.Sphere()),
  }

  return { root, metrics }
}
