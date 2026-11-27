import * as THREE from 'three';
import { ZombieManager } from '../ZombieManager';
import { WildlifeManager } from '../WildlifeManager';
import { soundEngine } from '../../utils/audio';

export interface SentryTurretState {
  id: string;
  name: string;
  worldPosition: THREE.Vector3;
  targetId: string | null;
  targetType: 'zombie' | 'faction' | null;
  currentYaw: number;
  currentPitch: number;
  burstCooldown: number;
  shotsRemainingInBurst: number;
  shotIntervalTimer: number;
  killsCount: number;
  isLockedOn: boolean;
  scanTime: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  health: number;
  maxHealth: number;
}

export interface TurretProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  distanceRemaining: number;
  damage: number;
  targetId: string | null;
  targetType: 'zombie' | 'faction' | null;
  life: number;
}

/**
 * External NPC/faction adapter. A turret will engage this target only when its
 * allegiance is explicitly 'hostile'. Unknown, neutral and friendly entities
 * are rejected by default; the player can never be registered as a target.
 */
export interface HostileFactionTurretTarget {
  id: string;
  factionId: string;
  allegiance: 'hostile' | 'friendly' | 'neutral' | 'unknown';
  position: THREE.Vector3;
  health: number;
  isAlive: boolean;
  isPlayer: boolean;
  damage: (amount: number) => void;
}

export interface TurretSaveRecord {
  id: string;
  ammo: number;
  health: number;
  killsCount: number;
}

export class ApartmentTurrets {
  public group: THREE.Group;
  private projectileGroup: THREE.Group;
  private activeProjectiles: TurretProjectile[] = [];
  private hostileFactionTargets = new Map<string, HostileFactionTurretTarget>();
  private tracerGeo: THREE.CylinderGeometry;
  private tracerMat: THREE.MeshBasicMaterial;

  private turrets: Array<{
    state: SentryTurretState;
    baseMesh: THREE.Group;
    yawGroup: THREE.Group;
    pitchGroup: THREE.Group;
    sensorLed: THREE.Mesh;
    sensorMat: THREE.MeshBasicMaterial;
    laserLine: THREE.Line;
    laserMat: THREE.LineBasicMaterial;
    muzzleFlashL: THREE.Mesh;
    muzzleFlashR: THREE.Mesh;
    muzzleLight: THREE.PointLight;
    flashTimer: number;
    homeYaw: number;
  }> = [];

  private parentOrigin: THREE.Vector3;
  private readonly _tmpTargetPos = new THREE.Vector3();

  constructor(parent: THREE.Group, origin: THREE.Vector3) {
    this.parentOrigin = origin;
    this.group = new THREE.Group();
    this.group.name = 'apartment_ai_defense_turrets';
    parent.add(this.group);

    this.projectileGroup = new THREE.Group();
    this.projectileGroup.name = 'turret_high_velocity_tracers';
    this.group.add(this.projectileGroup);

    this.tracerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6);
    this.tracerGeo.rotateX(Math.PI / 2);
    this.tracerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.95,
    });

    // Exactly 20 armed AI sentries mounted across the expanded 100 x 126.5 m perimeter:
    // two flanking each of the five gates (10) plus ten along the 20 perimeter towers/walls.
    const perimeter = [
      // Gate 1: main 12 m vehicle entrance (south wall, local X=0, Z=-75.5).
      [-7.0, 8.0, -74.5, Math.PI], [7.0, 8.0, -74.5, Math.PI],
      // Gate 2: west pedestrian entrance (west wall, local X=-82, Z=0).
      [-82.0, 8.0, -3.0, Math.PI / 2], [-82.0, 8.0, 3.0, Math.PI / 2],
      // Gate 3: east emergency pedestrian entrance (east wall, local X=+18, Z=-24).
      [18.0, 8.0, -27.0, -Math.PI / 2], [18.0, 8.0, -21.0, -Math.PI / 2],
      // Gate 4: south vehicle entrance straight to Garage (south wall, local X=-48, Z=-75.5).
      [-53.0, 8.0, -74.5, Math.PI], [-43.0, 8.0, -74.5, Math.PI],
      // Gate 5: north vehicle entrance (north wall, local X=-24, Z=+51.0).
      [-29.0, 8.0, 50.0, 0], [-19.0, 8.0, 50.0, 0],
      // Remaining ten sentries distributed on perimeter towers and walls.
      [-68.0, 6.0, 50.0, 0], [8.0, 6.0, 50.0, 0],
      [-70.0, 6.0, -74.5, Math.PI], [-25.0, 6.0, -74.5, Math.PI], [14.0, 6.0, -74.5, Math.PI],
      [-82.0, 8.8, -43.0, Math.PI / 2], [-82.0, 8.8, 34.0, Math.PI / 2],
      [18.0, 8.8, -43.0, -Math.PI / 2], [18.0, 8.8, 6.0, -Math.PI / 2], [18.0, 8.8, 34.0, -Math.PI / 2],
    ] as const;
    perimeter.forEach(([x, y, z, yaw], index) => {
      this.createTurret(`turret_compound_${String(index + 1).padStart(2, '0')}`, new THREE.Vector3(x, y, z), yaw);
    });
  }

  private createTurret(id: string, localPos: THREE.Vector3, defaultYaw: number) {
    const turretRoot = new THREE.Group();
    turretRoot.name = id;
    turretRoot.position.copy(localPos);
    this.group.add(turretRoot);

    // World position of the turret
    const worldPos = new THREE.Vector3().addVectors(this.parentOrigin, localPos);

    // Materials
    const armorMetalMat = new THREE.MeshStandardMaterial({
      color: 0x22272e,
      roughness: 0.42,
      metalness: 0.78,
    });
    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x14171a,
      roughness: 0.32,
      metalness: 0.88,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.7,
    });
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.9,
    });

    // 1. Fortified Pedestal Stand
    const pedestalGroup = new THREE.Group();
    const baseOctagon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.68, 1.35, 8),
      armorMetalMat
    );
    baseOctagon.position.y = 0.675;
    baseOctagon.castShadow = true;
    baseOctagon.receiveShadow = true;
    pedestalGroup.add(baseOctagon);

    // Warning hazard stripe band
    const stripeRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.57, 0.61, 0.22, 8),
      stripeMat
    );
    stripeRing.position.y = 0.85;
    pedestalGroup.add(stripeRing);

    // Heavy mounting collar & bolt flange
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.16, 12),
      darkTrimMat
    );
    collar.position.y = 1.42;
    pedestalGroup.add(collar);
    turretRoot.add(pedestalGroup);

    // 2. Horizontal Swivel Yaw Assembly
    const yawGroup = new THREE.Group();
    yawGroup.position.set(0, 1.5, 0);
    yawGroup.rotation.y = defaultYaw;
    turretRoot.add(yawGroup);

    // Turret main armored chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.52, 0.85),
      armorMetalMat
    );
    chassis.position.set(0, 0.28, 0);
    chassis.castShadow = true;
    yawGroup.add(chassis);

    // Armored angled cheek plates
    for (const side of [-0.34, 0.34]) {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.44, 0.82),
        darkTrimMat
      );
      cheek.position.set(side, 0.28, 0);
      yawGroup.add(cheek);
    }

    // Ammo drum canisters on sides
    for (const side of [-0.44, 0.44]) {
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.28, 12),
        gunMetalMat
      );
      drum.rotation.z = Math.PI / 2;
      drum.position.set(side, 0.25, -0.05);
      drum.castShadow = true;
      yawGroup.add(drum);
    }

    // 3. Vertical Pitch Gimbal Assembly (dual autocannon barrels & sensor)
    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(0, 0.32, 0.22);
    yawGroup.add(pitchGroup);

    // Mantlet / barrel housing
    const mantlet = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.36, 0.35),
      gunMetalMat
    );
    mantlet.castShadow = true;
    pitchGroup.add(mantlet);

    // Twin heavy autocannon barrels
    for (const bx of [-0.16, 0.16]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.065, 1.45, 8),
        gunMetalMat
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, 0, 0.85);
      barrel.castShadow = true;
      pitchGroup.add(barrel);

      // Flared muzzle compensator
      const comp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.06, 0.18, 8),
        darkTrimMat
      );
      comp.rotation.x = Math.PI / 2;
      comp.position.set(bx, 0, 1.58);
      pitchGroup.add(comp);
    }

    // 4. Optical Sensor Visor & Targeting Laser
    const sensorMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const sensorLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 8),
      sensorMat
    );
    sensorLed.position.set(0, 0.22, 0.2);
    pitchGroup.add(sensorLed);

    // Targeting Laser Beam
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.22, 0.25),
      new THREE.Vector3(0, 0.22, 28.0),
    ]);
    const laserLine = new THREE.Line(laserGeo, laserMat);
    pitchGroup.add(laserLine);

    // 5. Dual Muzzle Flashes & Dynamic Lighting
    const muzzleGeo = new THREE.ConeGeometry(0.16, 0.42, 6);
    muzzleGeo.rotateX(Math.PI / 2);

    const muzzleFlashL = new THREE.Mesh(muzzleGeo, flashMat);
    muzzleFlashL.position.set(-0.16, 0, 1.78);
    muzzleFlashL.visible = false;
    pitchGroup.add(muzzleFlashL);

    const muzzleFlashR = new THREE.Mesh(muzzleGeo, flashMat);
    muzzleFlashR.position.set(0.16, 0, 1.78);
    muzzleFlashR.visible = false;
    pitchGroup.add(muzzleFlashR);

    const muzzleLight = new THREE.PointLight(0xffaa22, 0, 18, 2.0);
    muzzleLight.position.set(0, 0, 1.8);
    pitchGroup.add(muzzleLight);

    this.turrets.push({
      state: {
        id,
        name: `Perimeter Sentry ${id.slice(-2)}`, 
        worldPosition: worldPos,
        targetId: null,
        targetType: null,
        currentYaw: defaultYaw,
        currentPitch: 0,
        burstCooldown: Math.random() * 0.4,
        shotsRemainingInBurst: 0,
        shotIntervalTimer: 0,
        killsCount: 0,
        isLockedOn: false,
        scanTime: Math.random() * 10,
        ammo: 485,
        maxAmmo: 500,
        isReloading: false,
        reloadTimer: 0,
        health: 1000,
        maxHealth: 1000,
      },
      baseMesh: pedestalGroup,
      yawGroup,
      pitchGroup,
      sensorLed,
      sensorMat,
      laserLine,
      laserMat,
      muzzleFlashL,
      muzzleFlashR,
      muzzleLight,
      flashTimer: 0,
      homeYaw: defaultYaw,
    });
  }

  public update(
    delta: number,
    zombieMgr: ZombieManager | null,
    _wildlifeMgr: WildlifeManager | null,
    playerPos: THREE.Vector3
  ) {
    const range = 32.0;
    const rangeSq = range * range;

    for (const turret of this.turrets) {
      const st = turret.state;
      st.scanTime += delta;

      // Handle muzzle flash fade
      if (turret.flashTimer > 0) {
        turret.flashTimer -= delta;
        if (turret.flashTimer <= 0) {
          turret.muzzleFlashL.visible = false;
          turret.muzzleFlashR.visible = false;
          turret.muzzleLight.intensity = 0;
        }
      }

      // Step 1: Acquire only explicitly hostile NPCs and hostile factions without per-entity Vector3 allocations.
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;
      let hasTarget = false;
      let targetDistSq = Infinity;
      let foundZombieId: string | null = null;
      let foundFactionTarget: HostileFactionTurretTarget | null = null;

      const wx = st.worldPosition.x;
      const wy = st.worldPosition.y;
      const wz = st.worldPosition.z;

      if (zombieMgr?.zombies) {
        const zombies = zombieMgr.zombies;
        for (let zi = 0; zi < zombies.length; zi++) {
          const z = zombies[zi];
          if (z.state === 'dead' || z.health <= 0) continue;
          const dx = z.position[0] - wx;
          const dy = z.position[1] + 1.2 - wy;
          const dz = z.position[2] - wz;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < rangeSq && dSq < targetDistSq) {
            targetDistSq = dSq;
            targetX = z.position[0];
            targetY = z.position[1] + 1.2;
            targetZ = z.position[2];
            hasTarget = true;
            foundZombieId = z.id;
            foundFactionTarget = null;
          }
        }
      }

      for (const candidate of this.hostileFactionTargets.values()) {
        if (!candidate.id || !candidate.factionId?.trim() || (candidate.id.toLowerCase() === 'player' || candidate.id.toLowerCase().startsWith('player_')) || candidate.isPlayer ||
            candidate.allegiance !== 'hostile' || !candidate.isAlive || candidate.health <= 0) continue;
        const dx = candidate.position.x - wx;
        const dy = candidate.position.y - wy;
        const dz = candidate.position.z - wz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < rangeSq && dSq < targetDistSq) {
          targetDistSq = dSq;
          targetX = candidate.position.x;
          targetY = candidate.position.y;
          targetZ = candidate.position.z;
          hasTarget = true;
          foundZombieId = null;
          foundFactionTarget = candidate;
        }
      }

      // Step 2: Aiming & Target Acquisition
      if (hasTarget) {
        st.targetId = foundZombieId || foundFactionTarget?.id || null;
        st.targetType = foundZombieId ? 'zombie' : 'faction';

        const ax = targetX - wx;
        const ay = targetY - (wy + 1.82);
        const az = targetZ - wz;
        const distToTarget = Math.hypot(ax, ay, az) || 1;
        const nx = ax / distToTarget;
        const ny = ay / distToTarget;
        const nz = az / distToTarget;

        // Calculate desired yaw and pitch in local turret coordinate frame
        const desiredYaw = Math.atan2(nx, nz);
        const horizDist = Math.hypot(nx, nz);
        const desiredPitch = -Math.atan2(ny, horizDist);

        // Smooth heavy mechanical rotation
        st.currentYaw = THREE.MathUtils.damp(st.currentYaw, desiredYaw, 8.5, delta);
        st.currentPitch = THREE.MathUtils.damp(
          st.currentPitch,
          THREE.MathUtils.clamp(desiredPitch, -0.4, 0.7),
          8.5,
          delta
        );

        turret.yawGroup.rotation.y = st.currentYaw;
        turret.pitchGroup.rotation.x = st.currentPitch;

        // Check if aimed close enough to target
        const yawError = Math.abs(THREE.MathUtils.euclideanModulo(st.currentYaw - desiredYaw + Math.PI, Math.PI * 2) - Math.PI);
        const pitchError = Math.abs(st.currentPitch - desiredPitch);
        const isAimed = yawError < 0.28 && pitchError < 0.25;

        if (isAimed) {
          if (!st.isLockedOn) {
            st.isLockedOn = true;
            soundEngine.playTurretLock();
          }

          // Target lock: red laser and sensor
          turret.sensorMat.color.setHex(0xff0044);
          turret.laserMat.color.setHex(0xff0044);
          turret.laserMat.opacity = 0.95;

          // Align laser endpoint precisely with target
          const posAttr = turret.laserLine.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.setXYZ(1, 0, 0.22, Math.min(28.0, distToTarget));
          posAttr.needsUpdate = true;

          // Handle reloading
          if (st.isReloading) {
            st.reloadTimer -= delta;
            turret.sensorMat.color.setHex(0xf59e0b); // Amber during reload
            if (st.reloadTimer <= 0) {
              st.isReloading = false;
              st.ammo = st.maxAmmo;
              st.burstCooldown = 0.3;
            }
          } else if (st.ammo <= 0) {
            st.isReloading = true;
            st.reloadTimer = 3.2; // 3.2 second drum magazine reload
          } else {
            // Step 3: Firing Cycles & Burst Control
            if (st.burstCooldown > 0) {
              st.burstCooldown -= delta;
            } else {
              // Ready for burst
              if (st.shotsRemainingInBurst <= 0) {
                st.shotsRemainingInBurst = Math.min(3, st.ammo);
                st.shotIntervalTimer = 0;
              }
            }

            if (st.shotsRemainingInBurst > 0) {
              st.shotIntervalTimer -= delta;
              if (st.shotIntervalTimer <= 0) {
                st.shotIntervalTimer = 0.11;
                st.shotsRemainingInBurst--;
                st.ammo = Math.max(0, st.ammo - 1);

                // Execute Shot & spawn 3D projectile tracer
                this._tmpTargetPos.set(targetX, targetY, targetZ);
                this.fireTurretRound(turret, playerPos, this._tmpTargetPos, foundZombieId, foundFactionTarget?.id ?? null);

                // Direct authoritative hit
                if (foundZombieId && zombieMgr) {
                  const res = zombieMgr.damageZombie(foundZombieId, 42, 2.5);
                  if (res?.killed) {
                    st.killsCount++;
                    st.targetId = null;
                  }
                } else if (foundFactionTarget &&
                    foundFactionTarget.allegiance === 'hostile' &&
                    foundFactionTarget.isAlive && !foundFactionTarget.isPlayer &&
                    foundFactionTarget.id.toLowerCase() !== 'player' && !foundFactionTarget.id.toLowerCase().startsWith('player_')) {
                  // Re-check allegiance immediately before damage to prevent stale locks
                  // from hurting a survivor whose faction changed during the firing cycle.
                  foundFactionTarget.damage(42);
                  if (!foundFactionTarget.isAlive || foundFactionTarget.health <= 0) {
                    st.killsCount++;
                    st.targetId = null;
                    this.hostileFactionTargets.delete(foundFactionTarget.id);
                  }
                }

                if (st.shotsRemainingInBurst <= 0) {
                  st.burstCooldown = 0.42; // Cooldown before next 3-round burst
                }
              }
            }
          }
        } else {
          st.isLockedOn = false;
          turret.sensorMat.color.setHex(0xffaa00); // Amber acquiring
          turret.laserMat.color.setHex(0xffaa00);
        }
      } else {
        // Step 4: Ambient Security Patrol Sweep (No hostiles in range)
        st.targetId = null;
        st.isLockedOn = false;
        st.burstCooldown = 0.2;
        st.shotsRemainingInBurst = 0;

        if (st.isReloading) {
          st.reloadTimer -= delta;
          if (st.reloadTimer <= 0) {
            st.isReloading = false;
            st.ammo = st.maxAmmo;
          }
        }

        // Calm green security sensor
        const pulse = 0.6 + Math.sin(st.scanTime * 3.5) * 0.4;
        turret.sensorMat.color.setRGB(0, pulse, 0.5 * pulse);
        turret.laserMat.color.setHex(0x00ff88);
        turret.laserMat.opacity = 0.35;

        // Smooth 60-degree back-and-forth sweep overlooking street approach
        const baseYaw = turret.homeYaw;
        const sweepYaw = baseYaw + Math.sin(st.scanTime * 0.95) * 0.52;
        st.currentYaw = THREE.MathUtils.damp(st.currentYaw, sweepYaw, 4.0, delta);
        st.currentPitch = THREE.MathUtils.damp(st.currentPitch, 0.08, 4.0, delta);

        turret.yawGroup.rotation.y = st.currentYaw;
        turret.pitchGroup.rotation.x = st.currentPitch;

        const posAttr = turret.laserLine.geometry.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(1, 0, 0.22, 18.0);
        posAttr.needsUpdate = true;
      }
    }

    // Update active 3D projectile tracers
    this.updateProjectiles(delta, zombieMgr, _wildlifeMgr);
  }

  private updateProjectiles(
    delta: number,
    _zombieMgr: ZombieManager | null,
    _wildlifeMgr: WildlifeManager | null
  ) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.life += delta;
      const step = p.velocity.clone().multiplyScalar(delta);
      const stepLen = step.length();
      p.position.add(step);
      p.distanceRemaining -= stepLen;
      p.mesh.position.copy(p.position);

      if (p.distanceRemaining <= 0 || p.life > 0.8) {
        // Damage is applied once by the authoritative target check at firing time;
        // this tracer is visual-only and must never double-apply damage.
        this.projectileGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  private fireTurretRound(
    turret: (typeof this.turrets)[0],
    playerPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    targetZombieId: string | null = null,
    targetFactionId: string | null = null
  ) {
    // Visual muzzle flash
    turret.muzzleFlashL.visible = true;
    turret.muzzleFlashR.visible = true;
    turret.muzzleLight.intensity = 3.5;
    turret.flashTimer = 0.055;

    // Recoil kickback on barrels
    turret.pitchGroup.position.z = 0.16;
    setTimeout(() => {
      turret.pitchGroup.position.z = 0.22;
    }, 45);

    // Audio discharge
    const distToPlayer = turret.state.worldPosition.distanceTo(playerPos);
    soundEngine.playTurretShot(distToPlayer);

    // Spawn 3D high-velocity projectile tracer mesh
    const muzzleWorldPos = new THREE.Vector3();
    turret.pitchGroup.getWorldPosition(muzzleWorldPos);
    muzzleWorldPos.y += 0.05;

    const dir = new THREE.Vector3().subVectors(targetPos, muzzleWorldPos);
    const totalDist = dir.length();
    dir.normalize();

    const tracerMesh = new THREE.Mesh(this.tracerGeo.clone(), this.tracerMat);
    tracerMesh.position.copy(muzzleWorldPos);
    tracerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.projectileGroup.add(tracerMesh);

    const speed = 150.0; // 150 m/s tracer velocity
    this.activeProjectiles.push({
      mesh: tracerMesh,
      position: muzzleWorldPos.clone(),
      velocity: dir.multiplyScalar(speed),
      targetPos: targetPos.clone(),
      distanceRemaining: totalDist,
      damage: 42,
      targetId: targetZombieId || targetFactionId,
      targetType: targetZombieId ? 'zombie' : targetFactionId ? 'faction' : null,
      life: 0,
    });
  }

  /** Register or refresh an NPC from an explicitly hostile faction. */
  public registerHostileFactionTarget(target: HostileFactionTurretTarget): boolean {
    if (!target || !target.id || !target.factionId?.trim() || (target.id.toLowerCase() === 'player' || target.id.toLowerCase().startsWith('player_')) || target.isPlayer ||
        target.allegiance !== 'hostile' || !target.isAlive || target.health <= 0) return false;
    this.hostileFactionTargets.set(target.id, target);
    return true;
  }

  public unregisterFactionTarget(id: string): void {
    this.hostileFactionTargets.delete(id);
    for (const turret of this.turrets) {
      if (turret.state.targetId === id) {
        turret.state.targetId = null;
        turret.state.targetType = null;
        turret.state.isLockedOn = false;
        turret.state.shotsRemainingInBurst = 0;
      }
    }
  }

  public exportSaveData(): TurretSaveRecord[] {
    return this.turrets.map(({ state }) => ({
      id: state.id, ammo: state.ammo, health: state.health, killsCount: state.killsCount,
    }));
  }

  public importSaveData(records: TurretSaveRecord[] | undefined): void {
    if (!Array.isArray(records)) return;
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const turret of this.turrets) {
      const saved = byId.get(turret.state.id);
      if (!saved) continue;
      turret.state.ammo = THREE.MathUtils.clamp(Number(saved.ammo) || 0, 0, turret.state.maxAmmo);
      turret.state.health = THREE.MathUtils.clamp(Number(saved.health) || 0, 0, turret.state.maxHealth);
      turret.state.killsCount = Math.max(0, Math.floor(Number(saved.killsCount) || 0));
    }
  }

  public getInteraction(pos: THREE.Vector3): {
    id: 'turret';
    label: string;
    prompt: string;
  } | null {
    for (const t of this.turrets) {
      if (pos.distanceTo(t.state.worldPosition) < 2.8) {
        return {
          id: 'turret',
          label: 'AI Perimeter Defense Turret',
          prompt: `Press [E] to Inspect AI Defense Sentry [ONLINE · Ammo: ${t.state.ammo}/${t.state.maxAmmo} · ${t.state.killsCount} THREATS NEUTRALIZED]`,
        };
      }
    }
    return null;
  }

  public getTotalNeutralizedCount(): number {
    return this.turrets.reduce((acc, t) => acc + t.state.killsCount, 0);
  }

  public getTurretsTelemetry(): SentryTurretState[] {
    return this.turrets.map((t) => ({ ...t.state }));
  }

  public dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.activeProjectiles.forEach((p) => {
      p.mesh.geometry.dispose();
    });
    this.activeProjectiles = [];
    this.hostileFactionTargets.clear();
    this.turrets = [];
  }
}
