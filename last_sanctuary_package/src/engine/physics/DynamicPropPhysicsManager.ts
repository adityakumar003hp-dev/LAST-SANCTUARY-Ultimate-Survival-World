import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { isProtectedSpawnZone } from '../world/ProtectedSpawnZones';

export interface DynamicProp {
  id: string;
  name: string;
  mesh: THREE.Mesh | THREE.Group;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  mass: number;
  radius: number;
  isGrounded: boolean;
}

export class DynamicPropPhysicsManager {
  private static instance: DynamicPropPhysicsManager | null = null;
  public props: Map<string, DynamicProp> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    DynamicPropPhysicsManager.instance = this;
  }

  public static getInstance(): DynamicPropPhysicsManager | null {
    return DynamicPropPhysicsManager.instance;
  }

  public registerProp(
    id: string,
    name: string,
    mesh: THREE.Mesh | THREE.Group,
    mass: number = 10,
    radius: number = 0.5
  ): DynamicProp {
    const prop: DynamicProp = {
      id,
      name,
      mesh,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      mass,
      radius,
      isGrounded: false,
    };
    this.props.set(id, prop);
    return prop;
  }

  public unregisterProp(id: string) {
    const p = this.props.get(id);
    if (p) {
      this.scene.remove(p.mesh);
      this.props.delete(id);
    }
  }

  public initCompoundProps(centerX: number, centerZ: number) {
    if (this.props.size > 0) return;
    // Protected mansion/residential and military premises stay free of random
    // debris props. Authored furniture, vehicles and mission objects are separate.
    if (isProtectedSpawnZone(centerX, centerZ)) return;

    // Spawn physics props around town / starter compound
    const propConfigs = [
      { name: 'Wooden Crate', color: 0x8b5a2b, size: [0.8, 0.8, 0.8], mass: 15, offset: [2.5, 3] },
      { name: 'Supply Crate', color: 0xa06535, size: [1.0, 0.9, 0.8], mass: 22, offset: [-3, 2] },
      { name: 'Metal Barrel', color: 0x4a5568, size: [0.6, 1.0, 0.6], mass: 35, offset: [4, -2] },
      { name: 'Camp Stool', color: 0x654321, size: [0.5, 0.5, 0.5], mass: 6, offset: [-1.8, -2.5] },
      { name: 'Cargo Box', color: 0x795548, size: [0.7, 0.7, 0.7], mass: 12, offset: [1.5, -4] },
    ];

    propConfigs.forEach((cfg, idx) => {
      const posX = centerX + cfg.offset[0];
      const posZ = centerZ + cfg.offset[1];
      const posY = getTerrainHeight(posX, posZ) + cfg.size[1] * 0.5;

      const geo = new THREE.BoxGeometry(cfg.size[0], cfg.size[1], cfg.size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.8,
        metalness: cfg.name.includes('Metal') ? 0.6 : 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(posX, posY, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      this.registerProp(`prop_${idx}_${Date.now()}`, cfg.name, mesh, cfg.mass, Math.max(...cfg.size) * 0.5);
    });
  }

  public kickNearbyProp(playerPos: THREE.Vector3, lookDir: THREE.Vector3): boolean {
    let nearest: DynamicProp | null = null;
    let minDist = 2.8;

    for (const prop of this.props.values()) {
      const d = prop.mesh.position.distanceTo(playerPos);
      if (d < minDist) {
        minDist = d;
        nearest = prop;
      }
    }

    if (nearest) {
      const kickImpulse = (280.0 / nearest.mass);
      nearest.velocity.x += lookDir.x * kickImpulse;
      nearest.velocity.y += Math.max(3.0, kickImpulse * 0.35);
      nearest.velocity.z += lookDir.z * kickImpulse;
      nearest.angularVelocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ));
      return true;
    }

    return false;
  }

  public getNearbyPushableProp(playerPos: THREE.Vector3, maxDist: number): { name: string; mass: number } | null {
    let nearest: DynamicProp | null = null;
    let minDist = maxDist;

    for (const prop of this.props.values()) {
      const d = prop.mesh.position.distanceTo(playerPos);
      if (d < minDist) {
        minDist = d;
        nearest = prop;
      }
    }

    if (nearest) {
      return { name: nearest.name, mass: nearest.mass };
    }
    return null;
  }

  public applyRadialImpulse(center: THREE.Vector3, radius: number, force: number) {
    for (const prop of this.props.values()) {
      const dist = prop.mesh.position.distanceTo(center);
      if (dist < radius && dist > 0.01) {
        const factor = (1 - dist / radius) * (force / prop.mass);
        const dir = new THREE.Vector3().subVectors(prop.mesh.position, center).normalize();
        dir.y = Math.max(0.3, dir.y + 0.4);
        prop.velocity.addScaledVector(dir, factor * 15.0);
        prop.angularVelocity.add(new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ));
      }
    }
  }

  public update(delta: number, playerPos: THREE.Vector3, playerVelocity: THREE.Vector3) {
    const gravity = -18.0;
    const clampedDelta = Math.min(0.05, delta);

    for (const prop of this.props.values()) {
      // Apply gravity
      prop.velocity.y += gravity * clampedDelta;

      // Move prop
      prop.mesh.position.addScaledVector(prop.velocity, clampedDelta);

      // Rotate prop
      prop.mesh.rotation.x += prop.angularVelocity.x * clampedDelta;
      prop.mesh.rotation.y += prop.angularVelocity.y * clampedDelta;
      prop.mesh.rotation.z += prop.angularVelocity.z * clampedDelta;

      // Friction
      prop.velocity.x *= 0.94;
      prop.velocity.z *= 0.94;
      prop.angularVelocity.multiplyScalar(0.92);

      // Terrain ground collision
      const groundY = getTerrainHeight(prop.mesh.position.x, prop.mesh.position.z) + prop.radius;
      if (prop.mesh.position.y <= groundY) {
        prop.mesh.position.y = groundY;
        if (prop.velocity.y < -1.0) {
          prop.velocity.y = -prop.velocity.y * 0.3; // Small bounce
        } else {
          prop.velocity.y = 0;
          prop.isGrounded = true;
        }
      } else {
        prop.isGrounded = false;
      }

      // Player push collision
      const dx = prop.mesh.position.x - playerPos.x;
      const dz = prop.mesh.position.z - playerPos.z;
      const distSq = dx * dx + dz * dz;
      const pushDist = prop.radius + 0.6;
      if (distSq < pushDist * pushDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const pushX = dx / dist;
        const pushZ = dz / dist;
        const pushForce = Math.max(2.0, playerVelocity.length() * 1.5);
        prop.velocity.x += pushX * pushForce;
        prop.velocity.z += pushZ * pushForce;
      }
    }
  }

  public dispose() {
    for (const prop of this.props.values()) {
      this.scene.remove(prop.mesh);
    }
    this.props.clear();
    if (DynamicPropPhysicsManager.instance === this) {
      DynamicPropPhysicsManager.instance = null;
    }
  }
}
