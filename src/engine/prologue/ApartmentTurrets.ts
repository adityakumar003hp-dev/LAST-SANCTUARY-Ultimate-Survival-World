import * as THREE from 'three';
import { ZombieManager } from '../ZombieManager';
import { WildlifeManager } from '../WildlifeManager';
import { soundEngine } from '../../utils/audio';

export interface SentryTurretState {
  id: 'turret_left' | 'turret_right';
  name: string;
  worldPosition: THREE.Vector3;
  targetId: string | null;
  targetType: 'zombie' | 'creature' | null;
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
  targetType: 'zombie' | 'creature' | null;
  life: number;
}

export class ApartmentTurrets {
  public group: THREE.Group;
  private projectileGroup: THREE.Group;
  private activeProjectiles: TurretProjectile[] = [];
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
  }> = [];

  private parentOrigin: THREE.Vector3;

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

    // Two AI Turrets flanking the main compound double gate at local z = -22.0
    // Left turret at x = -3.85, Right turret at x = +3.85
    this.createTurret('turret_left', new THREE.Vector3(-3.85, 0, -22.0), Math.PI);
    this.createTurret('turret_right', new THREE.Vector3(3.85, 0, -22.0), Math.PI);
  }

  private createTurret(id: 'turret_left' | 'turret_right', localPos: THREE.Vector3, defaultYaw: number) {
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
        name: id === 'turret_left' ? 'West Flank Sentry Alpha' : 'East Flank Sentry Bravo',
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
    });
  }

  public update(
    delta: number,
    zombieMgr: ZombieManager | null,
    wildlifeMgr: WildlifeManager | null,
    playerPos: THREE.Vector3
  ) {
    const range = 32.0;

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

      // Step 1: Scan for Nearest Hostile Threat (Zombies & Dangerous Carnivores)
      let nearestTargetPos: THREE.Vector3 | null = null;
      let targetDist = Infinity;
      let foundZombieId: string | null = null;
      let foundCreatureId: string | null = null;

      // A. Check Zombies
      if (zombieMgr && zombieMgr.zombies) {
        for (const z of zombieMgr.zombies) {
          if (z.state === 'dead') continue;
          const zPos = new THREE.Vector3(z.position[0], z.position[1] + 1.2, z.position[2]);
          const d = st.worldPosition.distanceTo(zPos);
          if (d < range && d < targetDist) {
            targetDist = d;
            nearestTargetPos = zPos;
            foundZombieId = z.id;
            foundCreatureId = null;
          }
        }
      }

      // B. Check Aggressive Wildlife Predators (rex, raptor, lion, tiger, wolf, bear)
      if (wildlifeMgr) {
        const beast = wildlifeMgr.getNearestHostileThreat(st.worldPosition, range);
        if (beast && beast.state !== 'dead') {
          const bPos = beast.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          const d = st.worldPosition.distanceTo(bPos);
          if (d < targetDist) {
            targetDist = d;
            nearestTargetPos = bPos;
            foundZombieId = null;
            foundCreatureId = beast.id;
          }
        }
      }

      // Step 2: Aiming & Target Acquisition
      if (nearestTargetPos) {
        st.targetId = foundZombieId || foundCreatureId;
        st.targetType = foundZombieId ? 'zombie' : 'creature';

        // Calculate world aim vector from turret head to target
        const turretHeadPos = new THREE.Vector3(
          st.worldPosition.x,
          st.worldPosition.y + 1.82,
          st.worldPosition.z
        );
        const aimDir = new THREE.Vector3().subVectors(nearestTargetPos, turretHeadPos);
        const distToTarget = aimDir.length();
        aimDir.normalize();

        // Calculate desired yaw and pitch in local turret coordinate frame
        const desiredYaw = Math.atan2(aimDir.x, aimDir.z);
        const horizDist = Math.hypot(aimDir.x, aimDir.z);
        const desiredPitch = -Math.atan2(aimDir.y, horizDist);

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
                this.fireTurretRound(turret, playerPos, nearestTargetPos, foundZombieId, foundCreatureId);

                // Direct authoritative hit
                if (foundZombieId && zombieMgr) {
                  const res = zombieMgr.damageZombie(foundZombieId, 42, 2.5);
                  if (res?.killed) {
                    st.killsCount++;
                    st.targetId = null;
                  }
                } else if (foundCreatureId && wildlifeMgr) {
                  const killed = wildlifeMgr.damageCreature(foundCreatureId, 42);
                  if (killed) {
                    st.killsCount++;
                    st.targetId = null;
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
        const baseYaw = turret.state.id === 'turret_left' ? Math.PI + 0.18 : Math.PI - 0.18;
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
    this.updateProjectiles(delta, zombieMgr, wildlifeMgr);
  }

  private updateProjectiles(
    delta: number,
    zombieMgr: ZombieManager | null,
    wildlifeMgr: WildlifeManager | null
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
        // Projectile reached target or expired
        if (p.targetId && p.distanceRemaining <= 0) {
          if (p.targetType === 'zombie' && zombieMgr) {
            zombieMgr.damageZombie(p.targetId, p.damage, 1.5);
          } else if (p.targetType === 'creature' && wildlifeMgr) {
            wildlifeMgr.damageCreature(p.targetId, p.damage);
          }
        }

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
    targetCreatureId: string | null = null
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
      targetId: targetZombieId || targetCreatureId,
      targetType: targetZombieId ? 'zombie' : 'creature',
      life: 0,
    });
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
    this.turrets = [];
  }
}
