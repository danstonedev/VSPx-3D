/**
 * Rotation-Compensated IK Solver Wrapper
 * 
 * Wraps CCDIKSolver to handle skeletons with rotated parent nodes.
 * Temporarily removes parent rotation during IK solve, then restores it.
 */

import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js'
import * as THREE from 'three'

export class RotationCompensatedIKSolver {
  private solver: CCDIKSolver
  private mesh: THREE.SkinnedMesh
  private armature: THREE.Object3D | null = null
  private originalRotation: THREE.Euler | null = null

  constructor(mesh: THREE.SkinnedMesh, iks: any[]) {
    this.mesh = mesh
    this.solver = new CCDIKSolver(mesh, iks)
    
    // Find the Armature node (parent of skeleton bones)
    if (mesh.skeleton && mesh.skeleton.bones.length > 0) {
      this.armature = mesh.skeleton.bones[0].parent
      if (this.armature) {
        console.log('🔧 RotationCompensatedIKSolver: Found Armature with rotation:', this.armature.rotation.toArray())
      }
    }
  }

  /**
   * Update IK with rotation compensation
   */
  update(): this {
    if (!this.armature) {
      // No armature rotation to compensate, just solve normally
      this.solver.update()
      return this
    }

    // Store original rotation
    this.originalRotation = this.armature.rotation.clone()
    
    // Temporarily remove rotation for IK solve
    this.armature.rotation.set(0, 0, 0)
    this.armature.updateMatrix()
    this.armature.updateMatrixWorld(true)
    
    // Update all bone matrices in the new space
    this.mesh.skeleton.bones.forEach(bone => {
      bone.updateMatrix()
      bone.updateMatrixWorld(true)
    })
    
    // Solve IK in non-rotated space
    this.solver.update()
    
    // Restore original rotation
    this.armature.rotation.copy(this.originalRotation)
    this.armature.updateMatrix()
    this.armature.updateMatrixWorld(true)
    
    // Update all bone matrices back to rotated space
    this.mesh.skeleton.bones.forEach(bone => {
      bone.updateMatrix()
      bone.updateMatrixWorld(true)
    })
    
    return this
  }

  /**
   * Create IK helper (delegates to CCDIKSolver)
   */
  createHelper(): any {
    return this.solver.createHelper()
  }
}
