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
  private laserCoreGeo: THREE.CylinderGeometry;
  private laserGlowGeo: THREE.CylinderGeometry;
  private laserFadeTex: THREE.CanvasTexture | null = null;
  private sharedMaterials: {
    armorMetal: THREE.MeshStandardMaterial;
    gunMetal: THREE.MeshStandardMaterial;
    stripe: THREE.MeshStandardMaterial;
    darkTrim: THREE.MeshStandardMaterial;
    flash: THREE.MeshBasicMaterial;
  };
  private sharedGeos: {
    baseOctagon: THREE.CylinderGeometry;
    stripeRing: THREE.CylinderGeometry;
    collar: THREE.CylinderGeometry;
    chassis: THREE.BoxGeometry;
    cheek: THREE.BoxGeometry;
    drum: THREE.CylinderGeometry;
    mantlet: THREE.BoxGeometry;
    barrel: THREE.CylinderGeometry;
    comp: THREE.CylinderGeometry;
    sensor: THREE.SphereGeometry;
    muzzle: THREE.ConeGeometry;
  };

  private turrets: Array<{
    state: SentryTurretState;
    baseMesh: THREE.Group;
    yawGroup: THREE.Group;
    pitchGroup: THREE.Group;
    sensorLed: THREE.Mesh;
    sensorMat: THREE.MeshBasicMaterial;
    laserPivot: THREE.Group;
    laserCoreMat: THREE.MeshBasicMaterial;
    laserGlowMat: THREE.MeshBasicMaterial;
    muzzleFlashL: THREE.Mesh;
    muzzleFlashR: THREE.Mesh;
    muzzleLight: THREE.PointLight;
    flashTimer: number;
    recoilTimer: number;
    homeYaw: number;
    cachedTargetX: number;
    cachedTargetY: number;
    cachedTargetZ: number;
    cachedTargetId: string | null;
    cachedFactionTarget: HostileFactionTurretTarget | null;
  }> = [];

  private parentOrigin: THREE.Vector3;
  private targetScanTimer: number = 0.2;
  private readonly _tmpTargetPos = new THREE.Vector3();
  private readonly _tmpMuzzlePos = new THREE.Vector3();
  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpStep = new THREE.Vector3();
  private readonly _tmpUnitZ = new THREE.Vector3(0, 0, 1);

  private static createLaserFadeTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.65)');
    grad.addColorStop(0.85, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

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

    // Unit-length (1m) additive dual-layer laser beam geometries anchored at z=0..1
    this.laserCoreGeo = new THREE.CylinderGeometry(0.008, 0.012, 1.0, 6, 1, true);
    this.laserCoreGeo.translate(0, 0.5, 0);
    this.laserCoreGeo.rotateX(Math.PI / 2);

    this.laserGlowGeo = new THREE.CylinderGeometry(0.022, 0.046, 1.0, 8, 1, true);
    this.laserGlowGeo.translate(0, 0.5, 0);
    this.laserGlowGeo.rotateX(Math.PI / 2);

    this.laserFadeTex = ApartmentTurrets.createLaserFadeTexture();

    this.sharedMaterials = {
      armorMetal: new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.42, metalness: 0.78 }),
      gunMetal: new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.32, metalness: 0.88 }),
      stripe: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }),
      darkTrim: new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.7 }),
      flash: new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.9 }),
    };

    const barrelGeo = new THREE.CylinderGeometry(0.055, 0.065, 1.45, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const compGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.18, 8);
    compGeo.rotateX(Math.PI / 2);
    const drumGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.28, 10);
    drumGeo.rotateZ(Math.PI / 2);
    const muzzleGeo = new THREE.ConeGeometry(0.16, 0.42, 6);
    muzzleGeo.rotateX(Math.PI / 2);

    this.sharedGeos = {
      baseOctagon: new THREE.CylinderGeometry(0.55, 0.68, 1.35, 8),
      stripeRing: new THREE.CylinderGeometry(0.57, 0.61, 0.22, 8),
      collar: new THREE.CylinderGeometry(0.48, 0.48, 0.16, 10),
      chassis: new THREE.BoxGeometry(0.65, 0.52, 0.85),
      cheek: new THREE.BoxGeometry(0.08, 0.44, 0.82),
      drum: drumGeo,
      mantlet: new THREE.BoxGeometry(0.48, 0.36, 0.35),
      barrel: barrelGeo,
      comp: compGeo,
      sensor: new THREE.SphereGeometry(0.075, 8, 8),
      muzzle: muzzleGeo,
    };

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

    const worldPos = new THREE.Vector3().addVectors(this.parentOrigin, localPos);
    const mats = this.sharedMaterials;
    const geos = this.sharedGeos;

    // 1. Fortified Pedestal Stand
    const pedestalGroup = new THREE.Group();
    const baseOctagon = new THREE.Mesh(geos.baseOctagon, mats.armorMetal);
    baseOctagon.position.y = 0.675;
    baseOctagon.receiveShadow = true;
    pedestalGroup.add(baseOctagon);

    const stripeRing = new THREE.Mesh(geos.stripeRing, mats.stripe);
    stripeRing.position.y = 0.85;
    pedestalGroup.add(stripeRing);

    const collar = new THREE.Mesh(geos.collar, mats.darkTrim);
    collar.position.y = 1.42;
    pedestalGroup.add(collar);
    turretRoot.add(pedestalGroup);

    // 2. Horizontal Swivel Yaw Assembly
    const yawGroup = new THREE.Group();
    yawGroup.position.set(0, 1.5, 0);
    yawGroup.rotation.y = defaultYaw;
    turretRoot.add(yawGroup);

    const chassis = new THREE.Mesh(geos.chassis, mats.armorMetal);
    chassis.position.set(0, 0.28, 0);
    yawGroup.add(chassis);

    for (const side of [-0.34, 0.34]) {
      const cheek = new THREE.Mesh(geos.cheek, mats.darkTrim);
      cheek.position.set(side, 0.28, 0);
      yawGroup.add(cheek);
    }

    for (const side of [-0.44, 0.44]) {
      const drum = new THREE.Mesh(geos.drum, mats.gunMetal);
      drum.position.set(side, 0.25, -0.05);
      yawGroup.add(drum);
    }

    // 3. Vertical Pitch Gimbal Assembly
    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(0, 0.32, 0.22);
    yawGroup.add(pitchGroup);

    const mantlet = new THREE.Mesh(geos.mantlet, mats.gunMetal);
    pitchGroup.add(mantlet);

    for (const bx of [-0.16, 0.16]) {
      const barrel = new THREE.Mesh(geos.barrel, mats.gunMetal);
      barrel.position.set(bx, 0, 0.85);
      pitchGroup.add(barrel);

      const comp = new THREE.Mesh(geos.comp, mats.darkTrim);
      comp.position.set(bx, 0, 1.58);
      pitchGroup.add(comp);
    }

    // 4. Optical Sensor Visor & Dual-Layer Additive Glow Targeting Laser
    const sensorMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const sensorLed = new THREE.Mesh(geos.sensor, sensorMat);
    sensorLed.position.set(0, 0.22, 0.2);
    pitchGroup.add(sensorLed);

    const laserPivot = new THREE.Group();
    laserPivot.position.set(0, 0.22, 0.25);
    laserPivot.scale.z = 18.0;

    const laserCoreMat = new THREE.MeshBasicMaterial({
      color: 0x22ff99,
      map: this.laserFadeTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const laserGlowMat = new THREE.MeshBasicMaterial({
      color: 0x10ff88,
      map: this.laserFadeTex,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const coreMesh = new THREE.Mesh(this.laserCoreGeo, laserCoreMat);
    const glowMesh = new THREE.Mesh(this.laserGlowGeo, laserGlowMat);
    laserPivot.add(coreMesh, glowMesh);
    pitchGroup.add(laserPivot);

    // 5. Dual Muzzle Flashes & Non-Shadow Muzzle Light
    const muzzleFlashL = new THREE.Mesh(geos.muzzle, mats.flash);
    muzzleFlashL.position.set(-0.16, 0, 1.78);
    muzzleFlashL.visible = false;
    pitchGroup.add(muzzleFlashL);

    const muzzleFlashR = new THREE.Mesh(geos.muzzle, mats.flash);
    muzzleFlashR.position.set(0.16, 0, 1.78);
    muzzleFlashR.visible = false;
    pitchGroup.add(muzzleFlashR);

    const muzzleLight = new THREE.PointLight(0xffaa22, 0, 18, 2.0);
    muzzleLight.castShadow = false;
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
      laserPivot,
      laserCoreMat,
      laserGlowMat,
      muzzleFlashL,
      muzzleFlashR,
      muzzleLight,
      flashTimer: 0,
      recoilTimer: 0,
      homeYaw: defaultYaw,
      cachedTargetX: 0,
      cachedTargetY: 0,
      cachedTargetZ: 0,
      cachedTargetId: null,
      cachedFactionTarget: null,
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

    // Throttle heavy perimeter target scans to 5 Hz (every 200ms)
    this.targetScanTimer += delta;
    const shouldScanTargets = this.targetScanTimer >= 0.2;
    if (shouldScanTargets) {
      this.targetScanTimer = 0;
    }

    const zombies = zombieMgr?.zombies ?? null;

    for (let ti = 0; ti < this.turrets.length; ti++) {
      const turret = this.turrets[ti];
      const st = turret.state;
      st.scanTime += delta;

      if (turret.recoilTimer > 0) {
        turret.recoilTimer -= delta;
        if (turret.recoilTimer <= 0) {
          turret.pitchGroup.position.z = 0.22;
        }
      }

      // Handle muzzle flash fade
      if (turret.flashTimer > 0) {
        turret.flashTimer -= delta;
        if (turret.flashTimer <= 0) {
          turret.muzzleFlashL.visible = false;
          turret.muzzleFlashR.visible = false;
          turret.muzzleLight.intensity = 0;
        }
      }

      const wx = st.worldPosition.x;
      const wy = st.worldPosition.y;
      const wz = st.worldPosition.z;

      if (shouldScanTargets) {
        let targetDistSq = Infinity;
        let foundZombieId: string | null = null;
        let foundFactionTarget: HostileFactionTurretTarget | null = null;
        let bestX = 0;
        let bestY = 0;
        let bestZ = 0;

        if (zombies) {
          for (let zi = 0; zi < zombies.length; zi++) {
            const z = zombies[zi];
            if (z.state === 'dead' || z.health <= 0) continue;
            const dx = z.position[0] - wx;
            const dy = z.position[1] + 1.2 - wy;
            const dz = z.position[2] - wz;
            const dSq = dx * dx + dy * dy + dz * dz;
            if (dSq < rangeSq && dSq < targetDistSq) {
              targetDistSq = dSq;
              bestX = z.position[0];
              bestY = z.position[1] + 1.2;
              bestZ = z.position[2];
              foundZombieId = z.id;
              foundFactionTarget = null;
            }
          }
        }

        for (const candidate of this.hostileFactionTargets.values()) {
          if (
            !candidate.id ||
            !candidate.factionId?.trim() ||
            candidate.id.toLowerCase() === 'player' ||
            candidate.id.toLowerCase().startsWith('player_') ||
            candidate.isPlayer ||
            candidate.allegiance !== 'hostile' ||
            !candidate.isAlive ||
            candidate.health <= 0
          ) {
            continue;
          }
          const dx = candidate.position.x - wx;
          const dy = candidate.position.y - wy;
          const dz = candidate.position.z - wz;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < rangeSq && dSq < targetDistSq) {
            targetDistSq = dSq;
            bestX = candidate.position.x;
            bestY = candidate.position.y;
            bestZ = candidate.position.z;
            foundZombieId = null;
            foundFactionTarget = candidate;
          }
        }

        turret.cachedTargetId = foundZombieId;
        turret.cachedFactionTarget = foundFactionTarget;
        turret.cachedTargetX = bestX;
        turret.cachedTargetY = bestY;
        turret.cachedTargetZ = bestZ;
      } else if (turret.cachedFactionTarget) {
        const f = turret.cachedFactionTarget;
        if (!f.isAlive || f.health <= 0 || f.allegiance !== 'hostile') {
          turret.cachedFactionTarget = null;
        } else {
          turret.cachedTargetX = f.position.x;
          turret.cachedTargetY = f.position.y;
          turret.cachedTargetZ = f.position.z;
        }
      }

      const foundZombieId = turret.cachedTargetId;
      const foundFactionTarget = turret.cachedFactionTarget;
      const hasTarget = Boolean(foundZombieId || foundFactionTarget);

      // Step 2: Aiming & Target Acquisition (smooth per-frame mechanical tracking)
      if (hasTarget) {
        const targetX = turret.cachedTargetX;
        const targetY = turret.cachedTargetY;
        const targetZ = turret.cachedTargetZ;

        st.targetId = foundZombieId || foundFactionTarget?.id || null;
        st.targetType = foundZombieId ? 'zombie' : 'faction';

        const ax = targetX - wx;
        const ay = targetY - (wy + 1.82);
        const az = targetZ - wz;
        const distToTarget = Math.hypot(ax, ay, az) || 1;
        const nx = ax / distToTarget;
        const ny = ay / distToTarget;
        const nz = az / distToTarget;

        const desiredYaw = Math.atan2(nx, nz);
        const horizDist = Math.hypot(nx, nz);
        const desiredPitch = -Math.atan2(ny, horizDist);

        st.currentYaw = THREE.MathUtils.damp(st.currentYaw, desiredYaw, 8.5, delta);
        st.currentPitch = THREE.MathUtils.damp(
          st.currentPitch,
          THREE.MathUtils.clamp(desiredPitch, -0.4, 0.7),
          8.5,
          delta
        );

        turret.yawGroup.rotation.y = st.currentYaw;
        turret.pitchGroup.rotation.x = st.currentPitch;

        const yawError = Math.abs(THREE.MathUtils.euclideanModulo(st.currentYaw - desiredYaw + Math.PI, Math.PI * 2) - Math.PI);
        const pitchError = Math.abs(st.currentPitch - desiredPitch);
        const isAimed = yawError < 0.28 && pitchError < 0.25;

        if (isAimed) {
          if (!st.isLockedOn) {
            st.isLockedOn = true;
            soundEngine.playTurretLock();
          }

          turret.sensorMat.color.setHex(0xff1a44);
          turret.laserCoreMat.color.setHex(0xff3355);
          turret.laserCoreMat.opacity = 0.92;
          turret.laserGlowMat.color.setHex(0xff0033);
          turret.laserGlowMat.opacity = 0.36;
          turret.laserPivot.scale.z = Math.min(28.0, Math.max(1.5, distToTarget));

          if (st.isReloading) {
            st.reloadTimer -= delta;
            turret.sensorMat.color.setHex(0xf59e0b);
            if (st.reloadTimer <= 0) {
              st.isReloading = false;
              st.ammo = st.maxAmmo;
              st.burstCooldown = 0.3;
            }
          } else if (st.ammo <= 0) {
            st.isReloading = true;
            st.reloadTimer = 3.2;
          } else {
            if (st.burstCooldown > 0) {
              st.burstCooldown -= delta;
            } else if (st.shotsRemainingInBurst <= 0) {
              st.shotsRemainingInBurst = Math.min(3, st.ammo);
              st.shotIntervalTimer = 0;
            }

            if (st.shotsRemainingInBurst > 0) {
              st.shotIntervalTimer -= delta;
              if (st.shotIntervalTimer <= 0) {
                st.shotIntervalTimer = 0.11;
                st.shotsRemainingInBurst--;
                st.ammo = Math.max(0, st.ammo - 1);

                this._tmpTargetPos.set(targetX, targetY, targetZ);
                this.fireTurretRound(turret, playerPos, this._tmpTargetPos, foundZombieId, foundFactionTarget?.id ?? null);

                if (foundZombieId && zombieMgr) {
                  const res = zombieMgr.damageZombie(foundZombieId, 42, 2.5);
                  if (res?.killed) {
                    st.killsCount++;
                    st.targetId = null;
                    turret.cachedTargetId = null;
                  }
                } else if (
                  foundFactionTarget &&
                  foundFactionTarget.allegiance === 'hostile' &&
                  foundFactionTarget.isAlive &&
                  !foundFactionTarget.isPlayer &&
                  foundFactionTarget.id.toLowerCase() !== 'player' &&
                  !foundFactionTarget.id.toLowerCase().startsWith('player_')
                ) {
                  foundFactionTarget.damage(42);
                  if (!foundFactionTarget.isAlive || foundFactionTarget.health <= 0) {
                    st.killsCount++;
                    st.targetId = null;
                    turret.cachedFactionTarget = null;
                    this.hostileFactionTargets.delete(foundFactionTarget.id);
                  }
                }

                if (st.shotsRemainingInBurst <= 0) {
                  st.burstCooldown = 0.42;
                }
              }
            }
          }
        } else {
          st.isLockedOn = false;
          turret.sensorMat.color.setHex(0xffaa00);
          turret.laserCoreMat.color.setHex(0xffbb22);
          turret.laserCoreMat.opacity = 0.68;
          turret.laserGlowMat.color.setHex(0xff8800);
          turret.laserGlowMat.opacity = 0.24;
          turret.laserPivot.scale.z = Math.min(24.0, Math.max(2.0, distToTarget));
        }
      } else {
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

        const pulse = 0.6 + Math.sin(st.scanTime * 3.5) * 0.4;
        turret.sensorMat.color.setRGB(0, pulse, 0.5 * pulse);
        turret.laserCoreMat.color.setHex(0x22ff99);
        turret.laserCoreMat.opacity = 0.42;
        turret.laserGlowMat.color.setHex(0x00dd77);
        turret.laserGlowMat.opacity = 0.16;
        turret.laserPivot.scale.z = 18.0;

        const baseYaw = turret.homeYaw;
        const sweepYaw = baseYaw + Math.sin(st.scanTime * 0.95) * 0.52;
        st.currentYaw = THREE.MathUtils.damp(st.currentYaw, sweepYaw, 4.0, delta);
        st.currentPitch = THREE.MathUtils.damp(st.currentPitch, 0.08, 4.0, delta);

        turret.yawGroup.rotation.y = st.currentYaw;
        turret.pitchGroup.rotation.x = st.currentPitch;
      }
    }

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
      this._tmpStep.copy(p.velocity).multiplyScalar(delta);
      const stepLen = this._tmpStep.length();
      p.position.add(this._tmpStep);
      p.distanceRemaining -= stepLen;
      p.mesh.position.copy(p.position);

      if (p.distanceRemaining <= 0 || p.life > 0.8) {
        this.projectileGroup.remove(p.mesh);
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
    turret.muzzleFlashL.visible = true;
    turret.muzzleFlashR.visible = true;
    turret.muzzleLight.intensity = 3.5;
    turret.flashTimer = 0.055;

    turret.pitchGroup.position.z = 0.16;
    turret.recoilTimer = 0.045;

    const distToPlayer = turret.state.worldPosition.distanceTo(playerPos);
    soundEngine.playTurretShot(distToPlayer);

    turret.pitchGroup.getWorldPosition(this._tmpMuzzlePos);
    this._tmpMuzzlePos.y += 0.05;

    this._tmpDir.subVectors(targetPos, this._tmpMuzzlePos);
    const totalDist = this._tmpDir.length();
    if (totalDist > 0.001) {
      this._tmpDir.divideScalar(totalDist);
    } else {
      this._tmpDir.set(0, 0, 1);
    }

    const tracerMesh = new THREE.Mesh(this.tracerGeo, this.tracerMat);
    tracerMesh.position.copy(this._tmpMuzzlePos);
    tracerMesh.quaternion.setFromUnitVectors(this._tmpUnitZ, this._tmpDir);
    this.projectileGroup.add(tracerMesh);

    const speed = 150.0;
    this.activeProjectiles.push({
      mesh: tracerMesh,
      position: this._tmpMuzzlePos.clone(),
      velocity: this._tmpDir.clone().multiplyScalar(speed),
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
    this.laserFadeTex?.dispose();
    this.laserFadeTex = null;
    this.laserCoreGeo.dispose();
    this.laserGlowGeo.dispose();
    this.tracerGeo.dispose();
    this.tracerMat.dispose();
    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    Object.values(this.sharedMaterials).forEach((m) => m.dispose());
    this.turrets.forEach((t) => {
      t.sensorMat.dispose();
      t.laserCoreMat.dispose();
      t.laserGlowMat.dispose();
    });
    this.activeProjectiles = [];
    this.hostileFactionTargets.clear();
    this.turrets = [];
  }
}
