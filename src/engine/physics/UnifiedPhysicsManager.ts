import * as THREE from 'three';
import { SolidCollider, SurfaceMaterialType, SurfacePhysicsProfile } from '../../types/physics';
import { getTerrainHeight } from '../Terrain';

export class UnifiedPhysicsManager {
  private static instance: UnifiedPhysicsManager | null = null;
  public colliders: Map<string, SolidCollider> = new Map();
  public debugGroup: THREE.Group | null = null;
  public isDebugActive: boolean = false;
  private scene: THREE.Scene;

  // Surface physics profiles
  public surfaceProfiles: Record<SurfaceMaterialType, SurfacePhysicsProfile> = {
    concrete: { friction: 1.0, traction: 1.0, dragFactor: 1.0, slidingTendency: 0.0, footstepSound: 'footstep_concrete' },
    asphalt: { friction: 1.0, traction: 1.0, dragFactor: 1.0, slidingTendency: 0.0, footstepSound: 'footstep_concrete' },
    grass: { friction: 0.95, traction: 0.95, dragFactor: 1.0, slidingTendency: 0.05, footstepSound: 'footstep_grass' },
    dirt: { friction: 0.92, traction: 0.92, dragFactor: 1.0, slidingTendency: 0.08, footstepSound: 'footstep_grass' },
    mud: { friction: 0.65, traction: 0.70, dragFactor: 0.75, slidingTendency: 0.20, footstepSound: 'footstep_grass' },
    sand: { friction: 0.80, traction: 0.82, dragFactor: 0.85, slidingTendency: 0.15, footstepSound: 'footstep_grass' },
    gravel: { friction: 0.88, traction: 0.88, dragFactor: 0.92, slidingTendency: 0.12, footstepSound: 'footstep_concrete' },
    snow: { friction: 0.82, traction: 0.80, dragFactor: 0.88, slidingTendency: 0.18, footstepSound: 'footstep_snow' },
    ice: { friction: 0.20, traction: 0.25, dragFactor: 1.05, slidingTendency: 0.85, footstepSound: 'footstep_concrete' },
    wood: { friction: 0.98, traction: 0.98, dragFactor: 1.0, slidingTendency: 0.02, footstepSound: 'footstep_wood' },
    metal: { friction: 0.92, traction: 0.90, dragFactor: 1.0, slidingTendency: 0.05, footstepSound: 'footstep_concrete' },
    shallow_water: { friction: 0.60, traction: 0.65, dragFactor: 0.65, slidingTendency: 0.10, footstepSound: 'footstep_water' },
    deep_water: { friction: 0.40, traction: 0.40, dragFactor: 0.45, slidingTendency: 0.0, footstepSound: 'footstep_water' },
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    UnifiedPhysicsManager.instance = this;
  }

  public static getInstance(): UnifiedPhysicsManager | null {
    return UnifiedPhysicsManager.instance;
  }

  // --- Register Colliders ---
  public registerBoxCollider(
    id: string,
    category: SolidCollider['category'],
    position: THREE.Vector3 | [number, number, number],
    width: number,
    height: number,
    depth: number,
    rotationY: number = 0,
    isOpen: boolean = false
  ): SolidCollider {
    const pos = position instanceof THREE.Vector3 ? position.clone() : new THREE.Vector3(position[0], position[1], position[2]);
    const collider: SolidCollider = {
      id,
      category,
      shape: 'box',
      position: pos,
      halfExtents: new THREE.Vector3(width * 0.5, height * 0.5, depth * 0.5),
      rotationY,
      isSolid: true,
      isOpen,
    };
    this.colliders.set(id, collider);
    return collider;
  }

  public registerCylinderCollider(
    id: string,
    category: SolidCollider['category'],
    position: THREE.Vector3 | [number, number, number],
    radius: number,
    height: number = 2.0
  ): SolidCollider {
    const pos = position instanceof THREE.Vector3 ? position.clone() : new THREE.Vector3(position[0], position[1], position[2]);
    const collider: SolidCollider = {
      id,
      category,
      shape: 'cylinder',
      position: pos,
      radius,
      height,
      isSolid: true,
    };
    this.colliders.set(id, collider);
    return collider;
  }

  public unregisterCollider(id: string) {
    this.colliders.delete(id);
  }

  public updateColliderPosition(id: string, pos: THREE.Vector3 | [number, number, number], rotY?: number) {
    const c = this.colliders.get(id);
    if (!c) return;
    if (pos instanceof THREE.Vector3) {
      c.position.copy(pos);
    } else {
      c.position.set(pos[0], pos[1], pos[2]);
    }
    if (rotY !== undefined) c.rotationY = rotY;
  }

  public setDoorOpenState(id: string, isOpen: boolean) {
    const c = this.colliders.get(id);
    if (c) c.isOpen = isOpen;
  }

  // --- Authoritative Player & Entity Collision Resolution with Smooth Wall Sliding ---
  public resolveMovement(
    currentPos: THREE.Vector3,
    desiredPos: THREE.Vector3,
    playerRadius: number = 0.40,
    playerHeight: number = 1.85,
    ignoreId?: string
  ): {
    resolvedPos: THREE.Vector3;
    collided: boolean;
    collidedWith: SolidCollider | null;
    hitNormal: THREE.Vector3 | null;
  } {
    const result = desiredPos.clone();
    let hitNormal: THREE.Vector3 | null = null;
    let collidedWith: SolidCollider | null = null;
    let anyCollision = false;

    // Movement delta
    const deltaX = desiredPos.x - currentPos.x;
    const deltaZ = desiredPos.z - currentPos.z;

    // Fast distance query filter taking collider extents into account
    const nearbyColliders: SolidCollider[] = [];
    for (const c of this.colliders.values()) {
      if (c.id === ignoreId || !c.isSolid || c.isOpen) continue;
      const reachX = (c.halfExtents ? c.halfExtents.x : c.radius || 2) + playerRadius + 4.0;
      const reachZ = (c.halfExtents ? c.halfExtents.z : c.radius || 2) + playerRadius + 4.0;
      const dx = Math.abs(c.position.x - currentPos.x);
      const dz = Math.abs(c.position.z - currentPos.z);
      if (dx <= reachX && dz <= reachZ) {
        nearbyColliders.push(c);
      }
    }

    // Step 1: Test position with 2-pass solver to prevent corner-tunneling
    let testX = result.x;
    let testZ = result.z;

    for (let pass = 0; pass < 2; pass++) {
      let passCollided = false;
      for (const c of nearbyColliders) {
        // Check vertical overlap
        const cBottom = c.position.y - (c.halfExtents ? c.halfExtents.y : 0);
        const cTop = c.position.y + (c.halfExtents ? c.halfExtents.y : c.height || 2.0);
        const pBottom = desiredPos.y;
        const pTop = desiredPos.y + playerHeight;

        if (pTop <= cBottom || pBottom >= cTop) continue;

        if (c.shape === 'box' && c.halfExtents) {
          const cosR = c.rotationY ? Math.cos(-c.rotationY) : 1;
          const sinR = c.rotationY ? Math.sin(-c.rotationY) : 0;
          const worldDx = testX - c.position.x;
          const worldDz = testZ - c.position.z;

          const localX = worldDx * cosR - worldDz * sinR;
          const localZ = worldDx * sinR + worldDz * cosR;

          const limitX = c.halfExtents.x + playerRadius;
          const limitZ = c.halfExtents.z + playerRadius;

          if (Math.abs(localX) < limitX && Math.abs(localZ) < limitZ) {
            anyCollision = true;
            passCollided = true;
            collidedWith = c;

            // Determine shallowest penetration normal
            const penX = limitX - Math.abs(localX);
            const penZ = limitZ - Math.abs(localZ);

            if (penX < penZ) {
              const signX = localX >= 0 ? 1 : -1;
              const normWorldX = signX * cosR;
              const normWorldZ = -signX * sinR;
              hitNormal = new THREE.Vector3(normWorldX, 0, normWorldZ);

              // Wall slide: cancel displacement into the wall, keep tangent
              const pushDist = limitX - Math.abs(localX) + 0.005;
              const pushX = signX * pushDist;
              const correctedLocalX = localX + pushX;

              const worldCorrX = correctedLocalX * cosR - localZ * -sinR;
              const worldCorrZ = correctedLocalX * -sinR + localZ * cosR;
              testX = c.position.x + worldCorrX;
              testZ = c.position.z + worldCorrZ;
            } else {
              const signZ = localZ >= 0 ? 1 : -1;
              const normWorldX = signZ * sinR;
              const normWorldZ = signZ * cosR;
              hitNormal = new THREE.Vector3(normWorldX, 0, normWorldZ);

              const pushDist = limitZ - Math.abs(localZ) + 0.005;
              const pushZ = signZ * pushDist;
              const correctedLocalZ = localZ + pushZ;

              const worldCorrX = localX * cosR - correctedLocalZ * -sinR;
              const worldCorrZ = localX * -sinR + correctedLocalZ * cosR;
              testX = c.position.x + worldCorrX;
              testZ = c.position.z + worldCorrZ;
            }
          }
        } else if (c.shape === 'cylinder' && c.radius) {
          const dx = testX - c.position.x;
          const dz = testZ - c.position.z;
          const dist = Math.hypot(dx, dz);
          const minDist = c.radius + playerRadius;

          if (dist < minDist && dist > 0.0001) {
            anyCollision = true;
            passCollided = true;
            collidedWith = c;
            const overlap = minDist - dist + 0.005;
            const nx = dx / dist;
            const nz = dz / dist;
            hitNormal = new THREE.Vector3(nx, 0, nz);
            testX += nx * overlap;
            testZ += nz * overlap;
          }
        }
      }
      if (!passCollided) break;
    }

    result.x = testX;
    result.z = testZ;

    return {
      resolvedPos: result,
      collided: anyCollision,
      collidedWith,
      hitNormal,
    };
  }

  // --- Step-Up Calculation for Curbs, Steps & Door Thresholds ---
  public calculateStepUpHeight(
    currentPos: THREE.Vector3,
    targetGroundY: number,
    maxStepHeight: number = 0.45
  ): number {
    const diff = targetGroundY - currentPos.y;
    if (diff > 0.01 && diff <= maxStepHeight) {
      return targetGroundY;
    }
    return currentPos.y;
  }

  // --- Surface Material & Profile Detection ---
  public getSurfaceProfileAt(x: number, z: number): SurfacePhysicsProfile {
    // Check if player is on road/sidewalk
    // Main Avenue (x between -6 and 6, z between -55 and 45)
    if (Math.abs(x) <= 3.8 && z >= -50 && z <= 40) {
      return this.surfaceProfiles.asphalt;
    }
    if (Math.abs(x) <= 6.2 && z >= -50 && z <= 40) {
      return this.surfaceProfiles.concrete; // Sidewalk
    }
    // Cross Street (z between -3.5 and 3.5, x between -55 and 55)
    if (Math.abs(z) <= 3.5 && x >= -50 && x <= 50) {
      return this.surfaceProfiles.asphalt;
    }

    // Apartment Interior
    if (x >= -33 && x <= -19 && z >= 31 && z <= 45) {
      return this.surfaceProfiles.wood;
    }

    // Base Compound (around 0, 0)
    if (Math.abs(x) <= 15 && Math.abs(z) <= 15) {
      return this.surfaceProfiles.concrete;
    }

    // Default to natural grass terrain
    return this.surfaceProfiles.grass;
  }

  // --- Environmental Wind Force ---
  public getEnvironmentalWind(playerPos: THREE.Vector3, weatherType: string): THREE.Vector3 {
    // Sheltered check (inside apartment or starter cabin)
    if (playerPos.x >= -33 && playerPos.x <= -19 && playerPos.z >= 31 && playerPos.z <= 45 && playerPos.y < 3.2) {
      return new THREE.Vector3(0, 0, 0); // Completely sheltered indoors
    }
    if (Math.abs(playerPos.x) <= 4.0 && Math.abs(playerPos.z) <= 3.5 && playerPos.y < 3.0) {
      return new THREE.Vector3(0, 0, 0); // Inside starter cabin
    }

    // Gentle outdoor breeze / storm wind
    const isStorm = weatherType === 'storm' || weatherType === 'rain';
    const windStrength = isStorm ? 1.4 : 0.4;
    const time = performance.now() * 0.001;
    const wx = Math.sin(time * 0.5) * windStrength;
    const wz = Math.cos(time * 0.3) * windStrength * 0.8;

    return new THREE.Vector3(wx, 0, wz);
  }

  // --- Radial Meteorite Shockwave Gameplay Event ---
  public triggerMeteorShockwave(
    origin: THREE.Vector3,
    radius: number = 180,
    maxImpulse: number = 8.5,
    playerPos: THREE.Vector3
  ): { impulseVector: THREE.Vector3; shockIntensity: number } {
    const dx = playerPos.x - origin.x;
    const dz = playerPos.z - origin.z;
    const dist = Math.hypot(dx, dz);

    if (dist >= radius) {
      return { impulseVector: new THREE.Vector3(0, 0, 0), shockIntensity: 0 };
    }

    // Bounded quadratic falloff
    const falloff = Math.max(0, 1 - dist / radius);
    const intensity = falloff * falloff;
    const impulseMag = intensity * maxImpulse;

    const normX = dist > 0.1 ? dx / dist : 0;
    const normZ = dist > 0.1 ? dz / dist : 1;

    const impulseVector = new THREE.Vector3(normX * impulseMag, 2.5 * intensity, normZ * impulseMag);
    return { impulseVector, shockIntensity: intensity };
  }

  // --- Collision Debug Mode (F3 / Developer Menu) ---
  public toggleDebugMode() {
    this.isDebugActive = !this.isDebugActive;
    if (this.isDebugActive) {
      this.renderDebugMeshes();
    } else {
      this.clearDebugMeshes();
    }
  }

  private renderDebugMeshes() {
    this.clearDebugMeshes();
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'physics_colliders_debug';

    const boxMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const npcMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, wireframe: true });

    for (const c of this.colliders.values()) {
      if (c.shape === 'box' && c.halfExtents) {
        const geo = new THREE.BoxGeometry(c.halfExtents.x * 2, c.halfExtents.y * 2, c.halfExtents.z * 2);
        const mesh = new THREE.Mesh(geo, c.category === 'door' ? doorMat : boxMat);
        mesh.position.copy(c.position);
        if (c.rotationY) mesh.rotation.y = c.rotationY;
        this.debugGroup.add(mesh);
      } else if (c.shape === 'cylinder' && c.radius) {
        const geo = new THREE.CylinderGeometry(c.radius, c.radius, c.height || 2.0, 12);
        const mesh = new THREE.Mesh(geo, npcMat);
        mesh.position.copy(c.position);
        mesh.position.y += (c.height || 2.0) * 0.5;
        this.debugGroup.add(mesh);
      }
    }

    this.scene.add(this.debugGroup);
  }

  private clearDebugMeshes() {
    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
      this.debugGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
        }
      });
      this.debugGroup = null;
    }
  }
}
