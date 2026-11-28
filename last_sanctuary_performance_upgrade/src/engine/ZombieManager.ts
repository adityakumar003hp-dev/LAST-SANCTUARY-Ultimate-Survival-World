import * as THREE from 'three';
import { ZombieEntity, ZombieType } from '../types/game';
import { getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { soundEngine } from '../utils/audio';
import { getZombieFleshPBR } from './rendering/ProceduralTextures';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { PROTECTED_SPAWN_ZONES, isProtectedSpawnZone } from './world/ProtectedSpawnZones';
import { RailwayNetworkGenerator } from './world/RailwayNetworkGenerator';
import { buildRealisticZombie } from './rendering/RealisticHumanoidBuilder';

export class ZombieManager {
  private static readonly _tmpCur = new THREE.Vector3();
  private static readonly _tmpDes = new THREE.Vector3();
  private static readonly _cullSphere = new THREE.Sphere();

  public scene: THREE.Scene;
  public zombies: ZombieEntity[] = [];
  public zombieMeshes: Map<string, THREE.Group> = new Map();
  private animPhaseMap: Map<string, number> = new Map();
  private staggerMap: Map<string, number> = new Map();
  private deathBaseRotMap: Map<string, number> = new Map();
  private animClock: number = 0;
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
    position: [number, number, number],
    bypassSafeZone: boolean = false,
    victimMeta?: { name?: string; role?: string; clothHex?: number; pantsHex?: number; victimScale?: number }
  ): ZombieEntity | null {
    // Strict requirement: No zombies should appear before the meteorite impact.
    // Zombies begin spawning only after the impact and outbreak storyline.
    if (!this.isOutbreakActive) {
      return null;
    }

    // Authored encounters and random spawns must never instantiate a zombie inside
    // any protected compound or railway station premises. Move unsafe points outside,
    // unless converting an already-present infected NPC/organism in-world.
    if (!bypassSafeZone && (isProtectedSpawnZone(position[0], position[2]) || RailwayNetworkGenerator.isProtectedRailwayZone(position[0], position[2]))) {
      const origin = { x: position[0], z: position[2] };
      const candidates: Array<{ x: number; z: number; distance: number }> = [];
      for (const zone of PROTECTED_SPAWN_ZONES) {
        if (origin.x < zone.minX || origin.x > zone.maxX || origin.z < zone.minZ || origin.z > zone.maxZ) continue;
        const margin = 8;
        candidates.push(
          { x: zone.minX - margin, z: origin.z, distance: Math.abs(zone.minX - margin - origin.x) },
          { x: zone.maxX + margin, z: origin.z, distance: Math.abs(zone.maxX + margin - origin.x) },
          { x: origin.x, z: zone.minZ - margin, distance: Math.abs(zone.minZ - margin - origin.z) },
          { x: origin.x, z: zone.maxZ + margin, distance: Math.abs(zone.maxZ + margin - origin.z) },
        );
      }
      if (RailwayNetworkGenerator.isProtectedRailwayZone(origin.x, origin.z)) {
        const nearestStationX = Math.round(origin.x / 1200) * 1200;
        candidates.push(
          { x: origin.x, z: 84, distance: Math.abs(84 - origin.z) },
          { x: origin.x, z: 376, distance: Math.abs(376 - origin.z) },
          { x: nearestStationX - 156, z: origin.z, distance: Math.abs(nearestStationX - 156 - origin.x) },
          { x: nearestStationX + 156, z: origin.z, distance: Math.abs(nearestStationX + 156 - origin.x) },
        );
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const safe = candidates.find(
        (candidate) =>
          Number.isFinite(candidate.x) &&
          Number.isFinite(candidate.z) &&
          !isProtectedSpawnZone(candidate.x, candidate.z) &&
          !RailwayNetworkGenerator.isProtectedRailwayZone(candidate.x, candidate.z)
      );
      if (!safe) { console.warn('[ZombieSpawn] rejected: no safe exterior point', origin); return null; }
      position = [safe.x, position[1], safe.z];
    }
    const id = `zombie_${this.nextId++}`;
    let maxHealth = 80;
    let speed = 2.2;
    let damage = 14;
    let detectionRadius = 26;
    let isBoss = false;
    let bossTitle: string | undefined;

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
    } else if (type === 'spitter') {
      maxHealth = 75;
      speed = 2.3;
      damage = 15;
      detectionRadius = 34;
    } else if (type === 'juggernaut') {
      maxHealth = 480;
      speed = 1.25;
      damage = 46;
      detectionRadius = 24;
    } else if (type === 'stalker') {
      maxHealth = 95;
      speed = 5.4;
      damage = 24;
      detectionRadius = 38;
    } else if (type === 'alpha_boss') {
      maxHealth = 1250;
      speed = 2.15;
      damage = 54;
      detectionRadius = 45;
      isBoss = true;
      bossTitle = 'APEX BIO-MUTANT ALPHA';
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
      rangedCooldown: 1.5,
      detectionRadius,
      isBoss,
      bossTitle,
      victimName: victimMeta?.name,
      victimRole: victimMeta?.role,
      victimScale: victimMeta?.victimScale,
      victimAppearance:
        victimMeta && (victimMeta.clothHex !== undefined || victimMeta.pantsHex !== undefined)
          ? { clothHex: victimMeta.clothHex, pantsHex: victimMeta.pantsHex }
          : undefined,
    };

    this.zombies.push(entity);
    this.animPhaseMap.set(entity.id, ((this.nextId * 1.6180339) % 1) * Math.PI * 2);
    this.createZombieMesh(entity);

    const physMgr = UnifiedPhysicsManager.getInstance();
    if (physMgr) {
      const victimScale = entity.victimScale ?? 1;
      const colR = (entity.type === 'alpha_boss' ? 1.05 : entity.type === 'brute' || entity.type === 'juggernaut' ? 0.8 : 0.45) * victimScale;
      physMgr.registerCylinderCollider(entity.id, 'zombie', entity.position, colR, (entity.type === 'alpha_boss' ? 2.8 : 1.9) * victimScale);
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
      if (roll > 0.92) type = 'juggernaut';
      else if (roll > 0.82) type = 'brute';
      else if (roll > 0.70) type = 'spitter';
      else if (roll > 0.60) type = 'stalker';
      else if (roll > 0.45) type = 'runner';
      else if (roll > 0.36) type = 'screamer';

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
    this.animPhaseMap.clear();
    this.staggerMap.clear();
    this.deathBaseRotMap.clear();
  }

  private moveZombieWithCollision(z: ZombieEntity, nextX: number, nextZ: number) {
    const phys = UnifiedPhysicsManager.getInstance();
    const radius = (z.type === 'brute' ? 0.72 : 0.42) * (z.victimScale ?? 1);
    const current = ZombieManager._tmpCur.set(z.position[0], z.position[1], z.position[2]);
    const totalDistance = Math.hypot(nextX - current.x, nextZ - current.z);
    // Subdivide long knockback steps so fast movement cannot tunnel through a wall.
    const steps = Math.max(1, Math.ceil(totalDistance / 0.2));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const desired = ZombieManager._tmpDes.set(
        THREE.MathUtils.lerp(z.position[0], nextX, t),
        current.y,
        THREE.MathUtils.lerp(z.position[2], nextZ, t)
      );
      if (phys) {
        current.copy(phys.resolveMovement(current, desired, radius, 1.9, z.id).resolvedPos);
      } else {
        current.copy(desired);
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
    onPlayerDamage: (dmg: number) => void,
    detectionMultiplier = 1.0,
    onSpitterAcid?: (origin: THREE.Vector3, target: THREE.Vector3, dmg: number) => void,
    livingTargets: Array<{ id: string; kind?: 'citizen' | 'survivor' | 'settlement' | 'wildlife'; position: [number, number, number] }> = [],
    onLivingTargetAttacked?: (targetId: string, kind: 'citizen' | 'survivor' | 'settlement' | 'wildlife', zombieId: string) => void
  ) {
    this.animClock += delta;
    const toRemove: string[] = [];

    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];
      const mesh = this.zombieMeshes.get(z.id);
      if (!mesh) continue;

      if (z.state === 'dead') {
        z.deathTimer = (z.deathTimer || 0) + delta;
        // Smooth physical collapse onto ground during first 0.55s, then sink cleanly after 2.2s
        const collapseT = Math.min(1, z.deathTimer / 0.55);
        const easedCollapse = 1 - Math.pow(1 - collapseT, 3);
        const fallDir = (this.deathBaseRotMap.get(z.id) ?? 1) >= 0 ? 1 : -1;
        mesh.rotation.z = easedCollapse * (Math.PI / 2.1) * fallDir;
        mesh.rotation.x = easedCollapse * 0.28;
        const sinkY = z.deathTimer > 2.2 ? (z.deathTimer - 2.2) * 0.55 : 0;
        mesh.position.y = z.position[1] + easedCollapse * 0.14 - sinkY;
        if (z.deathTimer > 3.4) {
          toRemove.push(z.id);
        }
        continue;
      }

      z.attackCooldown = Math.max(0, z.attackCooldown - delta);
      z.rangedCooldown = Math.max(0, (z.rangedCooldown || 0) - delta);
      const stagger = Math.max(0, (this.staggerMap.get(z.id) ?? 0) - delta);
      if (stagger > 0) this.staggerMap.set(z.id, stagger);
      else this.staggerMap.delete(z.id);

      // Zombies select the closest living simulation target: player, town citizens,
      // rescued/field survivors, settlement staff, or wildlife organisms.
      let targetX = playerPos.x;
      let targetZ = playerPos.z;
      let targetIsPlayer = true;
      let chosenTargetId: string | null = null;
      let chosenTargetKind: 'citizen' | 'survivor' | 'settlement' | 'wildlife' = 'citizen';
      let distSqToTarget = (targetX - z.position[0]) ** 2 + (targetZ - z.position[2]) ** 2;
      const npcDetectSq = (z.detectionRadius * 1.45) ** 2;
      for (let tIdx = 0; tIdx < livingTargets.length; tIdx++) {
        const lt = livingTargets[tIdx];
        const ndx = lt.position[0] - z.position[0];
        const ndz = lt.position[2] - z.position[2];
        const ltDistSq = ndx * ndx + ndz * ndz;
        if (ltDistSq < distSqToTarget && ltDistSq < npcDetectSq) {
          targetX = lt.position[0];
          targetZ = lt.position[2];
          distSqToTarget = ltDistSq;
          targetIsPlayer = false;
          chosenTargetId = lt.id;
          chosenTargetKind = lt.kind ?? 'citizen';
        }
      }
      const distSqToPlayer = distSqToTarget;
      const dx = targetX - z.position[0];
      const dz = targetZ - z.position[2];

      // Multi-joint undead gait, stagger & attack lunge kinematics (within 75m and visible)
      if (mesh.visible && distSqToPlayer < 75 * 75) {
        const phaseOffset = this.animPhaseMap.get(z.id) ?? 0;
        const isFast = z.type === 'runner' || z.type === 'stalker';
        const isHeavy = z.type === 'brute' || z.type === 'juggernaut' || z.type === 'alpha_boss';
        const cadence = z.state === 'idle' ? 3.2 : isFast ? 11.5 : isHeavy ? 5.2 : 7.4;
        const walkPhase = this.animClock * cadence + phaseOffset;
        const walkCycle = Math.sin(walkPhase);
        const walkCos = Math.cos(walkPhase);
        const isAttacking = (z.state === 'attack_player' || z.state === 'attack_structure') && z.attackCooldown > 0.7;
        const attackLunge = isAttacking ? Math.sin(((z.attackCooldown - 0.7) / 0.5) * Math.PI) : 0;
        const staggerLean = stagger > 0 ? -(stagger / 0.35) * 0.45 : 0;

        const leftLeg = mesh.getObjectByName('leftLeg');
        const rightLeg = mesh.getObjectByName('rightLeg');
        const leftShin = mesh.getObjectByName('leftShin');
        const rightShin = mesh.getObjectByName('rightShin');
        const leftArm = mesh.getObjectByName('leftArm');
        const rightArm = mesh.getObjectByName('rightArm');
        const leftForearm = mesh.getObjectByName('leftForearm');
        const rightForearm = mesh.getObjectByName('rightForearm');
        const head = mesh.getObjectByName('head');

        if (leftLeg && rightLeg) {
          const legAmp = z.state === 'idle' ? 0.14 : isFast ? 0.68 : isHeavy ? 0.38 : 0.5;
          // Walkers have an asymmetric dragging limp on the left leg
          const leftMod = z.type === 'walker' ? 0.72 : 1.0;
          leftLeg.rotation.x = walkCycle * legAmp * leftMod;
          rightLeg.rotation.x = -walkCycle * legAmp;
          if (leftShin) leftShin.rotation.x = Math.max(0.08, -walkCos * 0.48 + 0.18);
          if (rightShin) rightShin.rotation.x = Math.max(0.08, walkCos * 0.48 + 0.18);
        }
        if (leftArm && rightArm) {
          const baseReach = isFast ? -Math.PI / 2.2 : z.type === 'crawler' ? -Math.PI / 1.8 : -Math.PI / 2.8;
          const swipe = attackLunge * 0.95;
          leftArm.rotation.x = baseReach + walkCycle * 0.25 - swipe;
          rightArm.rotation.x = baseReach - walkCycle * 0.25 - swipe * 1.15;
          if (leftForearm) leftForearm.rotation.x = -0.35 - Math.max(0, walkCycle) * 0.28;
          if (rightForearm) rightForearm.rotation.x = -0.35 - Math.max(0, -walkCycle) * 0.28;
        }
        if (head) {
          const twitch = Math.sin(this.animClock * 4.5 + phaseOffset * 3.0) * 0.12;
          head.rotation.z = (z.type === 'screamer' ? -0.22 : 0.08) + twitch;
          head.rotation.x = 0.14 + staggerLean * 0.6 - attackLunge * 0.25;
        }
        // Subtle hunch / limp rock + impact flinch lean
        mesh.rotation.x = (isFast ? 0.2 : z.type === 'crawler' ? 0.45 : 0.06) + staggerLean + attackLunge * 0.22;
        mesh.rotation.z = z.state === 'idle' ? Math.sin(walkPhase * 0.5) * 0.04 : walkCycle * (isHeavy ? 0.09 : 0.055);
      }

      // State handling (using stealth-scaled squared threshold)
      const effectiveDetect = z.detectionRadius * detectionMultiplier;
      const detectSq = effectiveDetect * effectiveDetect;
      const shouldChase = distSqToPlayer < detectSq || z.state === 'chase';

      // Single pass over player-built structures for defense spikes & blocking obstacles
      let nearestStructure: string | null = null;
      const minStructDistSq = 5.76;
      const structs = buildingMgr.structures;
      for (let sIdx = 0; sIdx < structs.length; sIdx++) {
        const s = structs[sIdx];
        const sdx = s.position[0] - z.position[0];
        const sdz = s.position[2] - z.position[2];
        const sDistSq = sdx * sdx + sdz * sdz;
        if (s.typeId === 'defense_spikes' && sDistSq < 3.24) {
          this.damageZombie(z.id, 25 * delta, 0);
        }
        if (
          shouldChase &&
          !nearestStructure &&
          !s.isOpen &&
          s.typeId !== 'wooden_foundation' &&
          s.typeId !== 'perimeter_torch' &&
          s.typeId !== 'modern_lamp' &&
          s.typeId !== 'landmine_trap' &&
          sDistSq < minStructDistSq
        ) {
          nearestStructure = s.uid;
        }
      }

      if (shouldChase) {
        z.state = 'chase';

        // Spitter ranged acid attack at 6m - 18m range
        if (z.type === 'spitter' && onSpitterAcid && distSqToPlayer > 36 && distSqToPlayer < 324 && (z.rangedCooldown || 0) <= 0) {
          z.rangedCooldown = 3.4;
          z.rotationY = Math.atan2(dx, dz);
          onSpitterAcid(new THREE.Vector3(z.position[0], z.position[1], z.position[2]), new THREE.Vector3(targetX, getTerrainHeight(targetX, targetZ) + 1.1, targetZ), z.damage);
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
        } else if (distSqToPlayer < 4.84) { // 2.2^2 = 4.84 melee bite range
          // Attack player or infect living target (starts 60s stunned conversion)
          z.state = 'attack_player';
          if (z.attackCooldown <= 0) {
            z.attackCooldown = 1.2;
            soundEngine.playZombieGrowl();
            if (targetIsPlayer) {
              onPlayerDamage(z.damage);
            } else if (chosenTargetId && onLivingTargetAttacked) {
              onLivingTargetAttacked(chosenTargetId, chosenTargetKind, z.id);
            }
          }
        } else {
          // Pursue the selected player/NPC target with collision-aware movement.
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
      this.animPhaseMap.delete(id);
      this.staggerMap.delete(id);
      this.deathBaseRotMap.delete(id);
      this.zombies = this.zombies.filter((z) => z.id !== id);
      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        physMgr.unregisterCollider(id);
      }
    });
  }

  public updateFrustumCulling(frustum: THREE.Frustum, camPos: THREE.Vector3) {
    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];
      const mesh = this.zombieMeshes.get(z.id);
      if (!mesh) continue;
      const dx = z.position[0] - camPos.x;
      const dz = z.position[2] - camPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 16 * 16) {
        mesh.visible = true;
      } else if (distSq > 165 * 165) {
        mesh.visible = false;
      } else {
        ZombieManager._cullSphere.center.set(z.position[0], z.position[1] + 1.0, z.position[2]);
        ZombieManager._cullSphere.radius = z.type === 'alpha_boss' ? 2.6 : 1.8;
        mesh.visible = frustum.intersectsSphere(ZombieManager._cullSphere);
      }
    }
  }

  public damageZombie(
    zombieId: string,
    amount: number,
    knockbackStrength: number = 2.0
  ): { killed: boolean; xp: number } | null {
    const z = this.zombies.find((e) => e.id === zombieId);
    if (!z || z.state === 'dead') return null;

    z.health = Math.max(0, z.health - amount);
    this.staggerMap.set(zombieId, 0.32);
    const mesh = this.zombieMeshes.get(zombieId);

    if (mesh) {
      // Knockback
      this.moveZombieWithCollision(z, z.position[0] - Math.sin(z.rotationY) * knockbackStrength, z.position[2] - Math.cos(z.rotationY) * knockbackStrength);

      // Brief impact flash pulse while keeping organic silhouettes intact
      mesh.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          if (!c.userData.origMaterial) {
            c.userData.origMaterial = c.material;
          }
          c.material = this.eyeMat;
        }
      });
      setTimeout(() => {
        if (mesh) {
          mesh.traverse((c) => {
            if (c instanceof THREE.Mesh && c.userData.origMaterial) {
              c.material = c.userData.origMaterial;
            }
          });
        }
      }, 75);
    }

    if (z.health <= 0) {
      z.state = 'dead';
      z.deathTimer = 0;
      this.deathBaseRotMap.set(zombieId, Math.random() > 0.5 ? 1 : -1);
      const xp =
        z.type === 'alpha_boss'
          ? 380
          : z.type === 'juggernaut'
            ? 140
            : z.type === 'brute'
              ? 80
              : z.type === 'spitter' || z.type === 'stalker'
                ? 55
                : z.type === 'runner'
                  ? 45
                  : 30;
      return { killed: true, xp };
    }

    return { killed: false, xp: 0 };
  }

  // --- Sculpted Anatomical Zombie Rig ---
  private createZombieMesh(z: ZombieEntity) {
    const scale =
      z.type === 'alpha_boss'
        ? 1.95
        : z.type === 'juggernaut'
          ? 1.55
          : z.type === 'brute'
            ? 1.45
            : z.type === 'runner' || z.type === 'stalker'
              ? 0.96
              : z.type === 'crawler'
                ? 0.75
                : 1.05;

    const group = buildRealisticZombie(z.type, scale * (z.victimScale ?? 1), z.victimAppearance);
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
