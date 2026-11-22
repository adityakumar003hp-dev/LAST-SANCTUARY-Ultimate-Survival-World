import * as THREE from 'three';
import { ZombieEntity, ZombieType } from '../types/game';
import { getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { soundEngine } from '../utils/audio';
import { getZombieFleshPBR } from './rendering/ProceduralTextures';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { PROTECTED_SPAWN_ZONES, isProtectedSpawnZone } from './world/ProtectedSpawnZones';

export class ZombieManager {
  public scene: THREE.Scene;
  public zombies: ZombieEntity[] = [];
  public zombieMeshes: Map<string, THREE.Group> = new Map();
  private nextId: number = 1;

  // Shared procedural materials
  private skinMat: THREE.MeshStandardMaterial;
  private clothesMat: THREE.MeshStandardMaterial;
  private eyeMat: THREE.MeshStandardMaterial;
  private bruteMat: THREE.MeshStandardMaterial;

  public isOutbreakActive: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const normalSkin = getZombieFleshPBR(false);
    this.skinMat = new THREE.MeshStandardMaterial({
      map: normalSkin.albedo,
      normalMap: normalSkin.normal,
      roughnessMap: normalSkin.roughness,
      roughness: 0.82,
      metalness: 0.05,
    });

    this.clothesMat = new THREE.MeshStandardMaterial({
      color: 0x2b2724,
      roughness: 0.95,
      metalness: 0.0,
    });

    const bruteSkin = getZombieFleshPBR(true);
    this.bruteMat = new THREE.MeshStandardMaterial({
      map: bruteSkin.albedo,
      normalMap: bruteSkin.normal,
      roughnessMap: bruteSkin.roughness,
      roughness: 0.78,
      metalness: 0.1,
    });

    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff1122,
      emissive: 0xff1122,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
  }

  public spawnZombie(
    type: ZombieType,
    position: [number, number, number]
  ): ZombieEntity | null {
    // Strict requirement: No zombies should appear before the meteorite impact.
    // Zombies begin spawning only after the impact and outbreak storyline.
    if (!this.isOutbreakActive) {
      return null;
    }

    // Authored encounters and random spawns must never instantiate a zombie inside
    // either protected compound. If a caller supplies an unsafe point, move the
    // spawn to the nearest outside edge with a small safety margin.
    if (isProtectedSpawnZone(position[0], position[2])) {
      let nearest = { x: position[0], z: position[2], distance: Number.POSITIVE_INFINITY };
      for (const zone of PROTECTED_SPAWN_ZONES) {
        if (position[0] < zone.minX || position[0] > zone.maxX || position[2] < zone.minZ || position[2] > zone.maxZ) continue;
        const candidates = [
          { x: zone.minX - 2, z: position[2] }, { x: zone.maxX + 2, z: position[2] },
          { x: position[0], z: zone.minZ - 2 }, { x: position[0], z: zone.maxZ + 2 },
        ];
        for (const candidate of candidates) {
          const distance = Math.hypot(candidate.x - position[0], candidate.z - position[2]);
          if (distance < nearest.distance) nearest = { ...candidate, distance };
        }
      }
      position = [nearest.x, position[1], nearest.z];
    }
    const id = `zombie_${this.nextId++}`;
    let maxHealth = 80;
    let speed = 2.2;
    let damage = 14;
    let detectionRadius = 26;

    if (type === 'runner') {
      maxHealth = 55;
      speed = 4.8;
      damage = 10;
      detectionRadius = 32;
    } else if (type === 'brute') {
      maxHealth = 280;
      speed = 1.35;
      damage = 38;
      detectionRadius = 22;
    } else if (type === 'screamer') {
      maxHealth = 65;
      speed = 2.6;
      damage = 8;
      detectionRadius = 36;
    } else if (type === 'crawler') {
      maxHealth = 45;
      speed = 1.5;
      damage = 12;
      detectionRadius = 20;
    }

    const groundY = getTerrainHeight(position[0], position[2]);
    const entity: ZombieEntity = {
      id,
      type,
      position: [position[0], groundY, position[2]],
      rotationY: Math.random() * Math.PI * 2,
      health: maxHealth,
      maxHealth,
      speed,
      damage,
      state: 'idle',
      attackCooldown: 0,
      detectionRadius,
    };

    this.zombies.push(entity);
    this.createZombieMesh(entity);

    const physMgr = UnifiedPhysicsManager.getInstance();
    if (physMgr) {
      physMgr.registerCylinderCollider(entity.id, 'zombie', entity.position, entity.type === 'brute' ? 0.8 : 0.45, 1.9);
    }

    return entity;
  }

  public spawnHordeWave(playerPos: THREE.Vector3, count: number) {
    if (!this.isOutbreakActive) return;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 38 + Math.random() * 22;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;

      // Type distribution
      const roll = Math.random();
      let type: ZombieType = 'walker';
      if (roll > 0.85) type = 'brute';
      else if (roll > 0.55) type = 'runner';
      else if (roll > 0.45) type = 'screamer';

      const zEntity = this.spawnZombie(type, [x, 0, z]);
      if (zEntity) {
        zEntity.state = 'chase'; // Night horde immediately hunts
      }
    }
  }

  public clearAllZombies() {
    this.zombies.forEach((z) => {
      const mesh = this.zombieMeshes.get(z.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.zombies = [];
    this.zombieMeshes.clear();
  }

  private moveZombieWithCollision(z: ZombieEntity, nextX: number, nextZ: number) {
    const phys = UnifiedPhysicsManager.getInstance();
    const radius = z.type === 'brute' ? 0.72 : 0.42;
    let current = new THREE.Vector3(z.position[0], z.position[1], z.position[2]);
    const totalDistance = Math.hypot(nextX - current.x, nextZ - current.z);
    // Subdivide long knockback steps so fast movement cannot tunnel through a wall.
    const steps = Math.max(1, Math.ceil(totalDistance / 0.2));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const desired = new THREE.Vector3(
        THREE.MathUtils.lerp(z.position[0], nextX, t),
        current.y,
        THREE.MathUtils.lerp(z.position[2], nextZ, t)
      );
      if (phys) {
        const resolved = phys.resolveMovement(current, desired, radius, 1.9, z.id).resolvedPos;
        current = resolved;
      } else {
        current = desired;
      }
    }
    z.position[0] = current.x;
    z.position[2] = current.z;
    z.position[1] = getTerrainHeight(current.x, current.z);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    buildingMgr: BuildingManager,
    onPlayerDamage: (dmg: number) => void
  ) {
    const toRemove: string[] = [];

    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];
      const mesh = this.zombieMeshes.get(z.id);
      if (!mesh) continue;

      if (z.state === 'dead') {
        z.deathTimer = (z.deathTimer || 0) + delta;
        mesh.position.y -= delta * 0.4;
        if (z.deathTimer > 3.0) {
          toRemove.push(z.id);
        }
        continue;
      }

      z.attackCooldown = Math.max(0, z.attackCooldown - delta);

      // Distance to player (squared check first)
      const dx = playerPos.x - z.position[0];
      const dz = playerPos.z - z.position[2];
      const distSqToPlayer = dx * dx + dz * dz;

      // Animation gait (Skip bone animation calculations for distant zombies to conserve CPU)
      if (distSqToPlayer < 75 * 75) {
        const walkCycle = Math.sin(Date.now() * 0.008 * (z.speed / 2.0));
        const leftLeg = mesh.getObjectByName('leftLeg');
        const rightLeg = mesh.getObjectByName('rightLeg');
        const leftArm = mesh.getObjectByName('leftArm');
        const rightArm = mesh.getObjectByName('rightArm');
        if (leftLeg && rightLeg) {
          leftLeg.rotation.x = walkCycle * 0.45;
          rightLeg.rotation.x = -walkCycle * 0.45;
        }
        if (leftArm && rightArm) {
          leftArm.rotation.x = -Math.PI / 2.8 + walkCycle * 0.2;
          rightArm.rotation.x = -Math.PI / 2.8 - walkCycle * 0.2;
        }
      }

      // Check for defensive spikes collision (squared distance check: 1.8^2 = 3.24)
      for (const struct of buildingMgr.structures) {
        if (struct.typeId === 'defense_spikes') {
          const sDistSq = (struct.position[0] - z.position[0]) ** 2 + (struct.position[2] - z.position[2]) ** 2;
          if (sDistSq < 3.24) {
            this.damageZombie(z.id, 25 * delta, 0);
          }
        }
      }

      // State handling (using squared threshold)
      const detectSq = z.detectionRadius * z.detectionRadius;
      if (distSqToPlayer < detectSq || z.state === 'chase') {
        z.state = 'chase';

        // Check if an obstacle/structure is directly between zombie and player (squared check: 2.4^2 = 5.76)
        let nearestStructure: string | null = null;
        const minStructDistSq = 5.76;

        for (const s of buildingMgr.structures) {
          if (s.isOpen) continue; // Can walk through open doors and gates
          if (s.typeId === 'wooden_foundation' || s.typeId === 'perimeter_torch' || s.typeId === 'modern_lamp') continue;
          const sdx = s.position[0] - z.position[0];
          const sdz = s.position[2] - z.position[2];
          const sDistSq = sdx * sdx + sdz * sdz;
          if (sDistSq < minStructDistSq) {
            nearestStructure = s.uid;
            break;
          }
        }

        if (nearestStructure) {
          // Attack structure blocking way
          z.state = 'attack_structure';
          z.targetStructureUid = nearestStructure;
          if (z.attackCooldown <= 0) {
            z.attackCooldown = 1.3;
            soundEngine.playZombieGrowl();
            buildingMgr.damageStructure(nearestStructure, z.damage);
          }
        } else if (distSqToPlayer < 2.56) { // 1.6^2 = 2.56
          // Attack player
          z.state = 'attack_player';
          if (z.attackCooldown <= 0) {
            z.attackCooldown = 1.2;
            soundEngine.playZombieGrowl();
            onPlayerDamage(z.damage);
          }
        } else {
          // Move towards player
          const distToPlayer = Math.sqrt(distSqToPlayer);
          const dirX = dx / distToPlayer;
          const dirZ = dz / distToPlayer;

          this.moveZombieWithCollision(z, z.position[0] + dirX * z.speed * delta, z.position[2] + dirZ * z.speed * delta);

          z.rotationY = Math.atan2(dirX, dirZ);
        }
      } else {
        // Idle wander
        z.state = 'idle';
        this.moveZombieWithCollision(z, z.position[0] + Math.sin(z.rotationY) * 0.4 * delta, z.position[2] + Math.cos(z.rotationY) * 0.4 * delta);
        if (Math.random() < 0.01) {
          z.rotationY += (Math.random() - 0.5) * 1.5;
        }
      }

      // Sync mesh & physics collider
      mesh.position.set(z.position[0], z.position[1], z.position[2]);
      mesh.rotation.y = z.rotationY;

      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        physMgr.updateColliderPosition(z.id, z.position, z.rotationY);
      }
    }

    // Cleanup dead zombies
    toRemove.forEach((id) => {
      const mesh = this.zombieMeshes.get(id);
      if (mesh) this.scene.remove(mesh);
      this.zombieMeshes.delete(id);
      this.zombies = this.zombies.filter((z) => z.id !== id);
      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        physMgr.unregisterCollider(id);
      }
    });
  }

  public damageZombie(
    zombieId: string,
    amount: number,
    knockbackStrength: number = 2.0
  ): { killed: boolean; xp: number } | null {
    const z = this.zombies.find((e) => e.id === zombieId);
    if (!z || z.state === 'dead') return null;

    z.health = Math.max(0, z.health - amount);
    const mesh = this.zombieMeshes.get(zombieId);

    if (mesh) {
      // Knockback
      this.moveZombieWithCollision(z, z.position[0] - Math.sin(z.rotationY) * knockbackStrength, z.position[2] - Math.cos(z.rotationY) * knockbackStrength);

      // Flash red
      mesh.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.material = this.eyeMat;
        }
      });
      setTimeout(() => {
        if (mesh && z.state !== 'dead') {
          mesh.traverse((c) => {
            if (c instanceof THREE.Mesh) {
              c.material = z.type === 'brute' ? this.bruteMat : this.clothesMat;
            }
          });
        }
      }, 100);
    }

    if (z.health <= 0) {
      z.state = 'dead';
      z.deathTimer = 0;
      if (mesh) {
        mesh.rotation.z = Math.PI / 2.2;
      }
      const xp = z.type === 'brute' ? 80 : z.type === 'runner' ? 45 : 30;
      return { killed: true, xp };
    }

    return { killed: false, xp: 0 };
  }

  // --- Composite 6-part Zombie Mesh ---
  private createZombieMesh(z: ZombieEntity) {
    const group = new THREE.Group();
    const isBrute = z.type === 'brute';
    const isCrawler = z.type === 'crawler';
    const scale = isBrute ? 1.45 : z.type === 'runner' ? 0.95 : isCrawler ? 0.75 : 1.05;

    const bodyMat = isBrute ? this.bruteMat : this.clothesMat;
    const skin = this.skinMat;

    // 1. Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.75 * scale, 0.3 * scale), bodyMat);
    torso.position.y = 1.15 * scale;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // 2. Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.38 * scale, 0.38 * scale), skin);
    head.position.y = 1.7 * scale;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), this.eyeMat);
    eyeL.position.set(-0.1 * scale, 1.75 * scale, 0.2 * scale);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), this.eyeMat);
    eyeR.position.set(0.1 * scale, 1.75 * scale, 0.2 * scale);
    group.add(eyeL, eyeR);

    // 3. Left Arm (reaching forward)
    const armGeo = new THREE.BoxGeometry(0.16 * scale, 0.65 * scale, 0.16 * scale);
    armGeo.translate(0, -0.3 * scale, 0);

    const leftArm = new THREE.Mesh(armGeo, skin);
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.35 * scale, 1.45 * scale, 0);
    leftArm.rotation.x = -Math.PI / 2.8;
    leftArm.castShadow = true;
    group.add(leftArm);

    // 4. Right Arm
    const rightArm = new THREE.Mesh(armGeo, skin);
    rightArm.name = 'rightArm';
    rightArm.position.set(0.35 * scale, 1.45 * scale, 0);
    rightArm.rotation.x = -Math.PI / 2.6;
    rightArm.castShadow = true;
    group.add(rightArm);

    // 5. Left Leg
    const legGeo = new THREE.BoxGeometry(0.2 * scale, 0.75 * scale, 0.2 * scale);
    legGeo.translate(0, -0.37 * scale, 0);

    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.name = 'leftLeg';
    leftLeg.position.set(-0.16 * scale, 0.75 * scale, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // 6. Right Leg
    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.name = 'rightLeg';
    rightLeg.position.set(0.16 * scale, 0.75 * scale, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    group.position.set(z.position[0], z.position[1], z.position[2]);
    group.rotation.y = z.rotationY;

    this.scene.add(group);
    this.zombieMeshes.set(z.id, group);
  }

  public dispose() {
    this.clearAllZombies();
    this.skinMat.dispose();
    this.clothesMat.dispose();
    this.eyeMat.dispose();
    this.bruteMat.dispose();
  }
}
