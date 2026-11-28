import * as THREE from 'three';
import { PlacedStructure, ZombieEntity } from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { getSoftParticleTexture, getSmokePuffTexture } from '../../utils/proceduralTextures';

interface ActiveProjectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  kind: 'bolt' | 'acid' | 'turret_round';
  damage: number;
}

interface ActiveHazardZone {
  mesh: THREE.Group;
  position: THREE.Vector3;
  life: number;
  kind: 'molotov_fire' | 'noise_flare' | 'pipe_bomb';
  tickCooldown: number;
  smokeTimer: number;
  radius: number;
  damage: number;
}

export type BurstKind = 'wood' | 'stone' | 'metal' | 'blood' | 'muzzle' | 'spark' | 'smoke';

interface PooledBurstParticle {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  gravity: number;
  active: boolean;
}

export class TacticalCombatEffects {
  private scene: THREE.Scene;
  private projectiles: ActiveProjectile[] = [];
  private hazards: ActiveHazardZone[] = [];
  private turretCooldowns = new Map<string, number>();
  private trapCooldowns = new Map<string, number>();

  private deathBagGroup: THREE.Group | null = null;
  private deathBagPosition: THREE.Vector3 | null = null;

  // Shared geometries & materials for zero-leak pooling
  private boltGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6);
  private acidGeom = new THREE.SphereGeometry(0.18, 8, 8);
  private boltMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private turretBoltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private acidMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });

  // Pooled soft-textured 3D particle bursts (zero runtime GC)
  private burstPool: PooledBurstParticle[] = [];
  private burstCursor: number = 0;
  private softTex: THREE.CanvasTexture;
  private smokeTex: THREE.CanvasTexture;
  private animClock: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.boltGeom.rotateX(Math.PI / 2);
    this.softTex = getSoftParticleTexture();
    this.smokeTex = getSmokePuffTexture();

    for (let i = 0; i < 96; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.softTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.burstPool.push({
        sprite,
        mat,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        startScale: 0.2,
        endScale: 0.5,
        gravity: 9.8,
        active: false,
      });
    }
  }

  public spawnImpactBurst(pos: THREE.Vector3, kind: BurstKind, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const p = this.burstPool[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % this.burstPool.length;

      p.active = true;
      p.sprite.visible = true;
      p.sprite.position.copy(pos);

      const angle = Math.random() * Math.PI * 2;
      const spread = kind === 'muzzle' ? 1.4 : kind === 'smoke' ? 2.4 : 3.2;
      const speed = (0.4 + Math.random() * 0.9) * spread;

      if (kind === 'blood') {
        p.mat.map = this.softTex;
        p.mat.blending = THREE.NormalBlending;
        p.mat.color.setHex(Math.random() > 0.35 ? 0x8f1116 : 0x5c080c);
        p.velocity.set(Math.cos(angle) * speed * 0.85, 1.5 + Math.random() * 2.2, Math.sin(angle) * speed * 0.85);
        p.gravity = 11.5;
        p.maxLife = 0.42 + Math.random() * 0.25;
        p.startScale = 0.16;
        p.endScale = 0.42;
      } else if (kind === 'wood') {
        p.mat.map = this.softTex;
        p.mat.blending = THREE.NormalBlending;
        p.mat.color.setHex(Math.random() > 0.4 ? 0x8a5e34 : 0x5c3c1e);
        p.velocity.set(Math.cos(angle) * speed, 1.8 + Math.random() * 2.5, Math.sin(angle) * speed);
        p.gravity = 12.0;
        p.maxLife = 0.45 + Math.random() * 0.25;
        p.startScale = 0.14;
        p.endScale = 0.24;
      } else if (kind === 'stone') {
        p.mat.map = this.smokeTex;
        p.mat.blending = THREE.NormalBlending;
        p.mat.color.setHex(Math.random() > 0.5 ? 0x94a3b8 : 0x64748b);
        p.velocity.set(Math.cos(angle) * speed * 0.8, 1.1 + Math.random() * 1.8, Math.sin(angle) * speed * 0.8);
        p.gravity = 6.5;
        p.maxLife = 0.5 + Math.random() * 0.3;
        p.startScale = 0.22;
        p.endScale = 0.65;
      } else if (kind === 'metal' || kind === 'spark') {
        p.mat.map = this.softTex;
        p.mat.blending = THREE.AdditiveBlending;
        p.mat.color.setHex(Math.random() > 0.35 ? 0xfbbf24 : 0xfffbeb);
        p.velocity.set(Math.cos(angle) * speed * 1.5, 1.8 + Math.random() * 3.4, Math.sin(angle) * speed * 1.5);
        p.gravity = 14.0;
        p.maxLife = 0.28 + Math.random() * 0.22;
        p.startScale = 0.14;
        p.endScale = 0.04;
      } else if (kind === 'muzzle') {
        p.mat.map = this.softTex;
        p.mat.blending = THREE.AdditiveBlending;
        p.mat.color.setHex(Math.random() > 0.4 ? 0x38bdf8 : 0xfef08a);
        p.velocity.set(Math.cos(angle) * 0.7, 0.3 + Math.random() * 0.7, Math.sin(angle) * 0.7);
        p.gravity = -0.6;
        p.maxLife = 0.22;
        p.startScale = 0.32;
        p.endScale = 0.55;
      } else {
        // smoke
        p.mat.map = this.smokeTex;
        p.mat.blending = THREE.NormalBlending;
        p.mat.color.setHex(0x475569);
        p.velocity.set(Math.cos(angle) * speed * 0.65, 1.4 + Math.random() * 2.0, Math.sin(angle) * speed * 0.65);
        p.gravity = -1.2;
        p.maxLife = 0.95 + Math.random() * 0.55;
        p.startScale = 0.45;
        p.endScale = 1.65;
      }

      p.life = p.maxLife;
      p.mat.opacity = 0.9;
      p.mat.needsUpdate = true;
      p.sprite.scale.setScalar(p.startScale);
    }
  }

  public spawnTracer(origin: THREE.Vector3, dir: THREE.Vector3, kind: 'bolt' | 'turret_round' = 'bolt', speed = 55) {
    const mat = kind === 'turret_round' ? this.turretBoltMat : this.boltMat;
    const mesh = new THREE.Mesh(this.boltGeom, mat);
    mesh.position.copy(origin);
    mesh.lookAt(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: dir.clone().normalize().multiplyScalar(speed),
      life: 1.4,
      maxLife: 1.4,
      kind,
      damage: 0, // visual tracer only when hitscan already applied, or acid handles damage
    });
  }

  public spawnAcidSpit(origin: THREE.Vector3, target: THREE.Vector3, damage = 14) {
    const dir = target.clone().sub(origin);
    const dist = Math.max(1, dir.length());
    dir.normalize();
    const mesh = new THREE.Mesh(this.acidGeom, this.acidMat);
    mesh.position.copy(origin).add(new THREE.Vector3(0, 1.45, 0));
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: dir.multiplyScalar(Math.min(28, 16 + dist * 0.4)),
      life: 2.2,
      maxLife: 2.2,
      kind: 'acid',
      damage,
    });
  }

  public spawnThrowableEffect(
    kind: 'molotov_cocktail' | 'noise_flare' | 'pipe_bomb',
    landPos: THREE.Vector3
  ) {
    const group = new THREE.Group();
    group.position.copy(landPos);

    if (kind === 'molotov_cocktail') {
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.55, depthWrite: false })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.06;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 1.8, 7),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.78 })
      );
      flame.name = 'hazardFlame';
      flame.position.y = 0.9;
      const light = new THREE.PointLight(0xf97316, 2.2, 12);
      light.name = 'hazardLight';
      light.position.y = 1.1;
      group.add(pool, flame, light);
      soundEngine.playStoveIgnite();
      this.spawnImpactBurst(landPos, 'spark', 12);
      this.hazards.push({
        mesh: group,
        position: landPos.clone(),
        life: 8.5,
        kind: 'molotov_fire',
        tickCooldown: 0.1,
        smokeTimer: 0,
        radius: 3.6,
        damage: 24,
      });
    } else if (kind === 'noise_flare') {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xf97316, emissiveIntensity: 1.5 })
      );
      stick.position.y = 0.22;
      const light = new THREE.PointLight(0xfbbf24, 2.6, 18);
      light.name = 'hazardLight';
      light.position.y = 0.6;
      group.add(stick, light);
      soundEngine.playRadarPing();
      this.hazards.push({
        mesh: group,
        position: landPos.clone(),
        life: 14.0,
        kind: 'noise_flare',
        tickCooldown: 0.5,
        smokeTimer: 0,
        radius: 24,
        damage: 0,
      });
    } else {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.42, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0xef4444, emissiveIntensity: 1.4 })
      );
      pipe.position.y = 0.21;
      group.add(pipe);
      soundEngine.playSecurityBeep();
      this.hazards.push({
        mesh: group,
        position: landPos.clone(),
        life: 2.4,
        kind: 'pipe_bomb',
        tickCooldown: 0.2,
        smokeTimer: 0,
        radius: 6.5,
        damage: 185,
      });
    }

    this.scene.add(group);
  }

  public setDeathBag(pos: [number, number, number] | null) {
    if (this.deathBagGroup) {
      this.scene.remove(this.deathBagGroup);
      this.deathBagGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      this.deathBagGroup = null;
      this.deathBagPosition = null;
    }

    if (!pos) return;
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);

    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.5, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 })
    );
    pack.position.y = 0.25;
    pack.castShadow = true;

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.14, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35, depthWrite: false })
    );
    beacon.position.y = 8;

    g.add(pack, beacon);
    this.scene.add(g);
    this.deathBagGroup = g;
    this.deathBagPosition = new THREE.Vector3(pos[0], pos[1], pos[2]);
  }

  public getDeathBagPosition(): THREE.Vector3 | null {
    return this.deathBagPosition;
  }

  public getActiveFlarePositions(): THREE.Vector3[] {
    return this.hazards.filter((h) => h.kind === 'noise_flare').map((h) => h.position);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    zombies: ZombieEntity[],
    structures: PlacedStructure[],
    structureMeshes: Map<string, THREE.Object3D>,
    isBasePowered: boolean,
    turretDamageMultiplier: number,
    onDamageZombie: (id: string, dmg: number, knockbackDir?: THREE.Vector3, isTurret?: boolean) => void,
    onDamagePlayer: (dmg: number, source: string) => void,
    onDestroyStructure: (uid: string) => void
  ) {
    this.animClock += delta;

    // 0. Update pooled soft 3D burst particles
    for (let i = 0; i < this.burstPool.length; i++) {
      const p = this.burstPool[i];
      if (!p.active) continue;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.velocity.y -= p.gravity * delta;
      p.sprite.position.addScaledVector(p.velocity, delta);
      const t = 1 - p.life / p.maxLife;
      const sc = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
      p.sprite.scale.setScalar(sc);
      p.mat.opacity = Math.max(0, (1 - t) * 0.88);
    }

    // 1. Update airborne projectiles & acid spits
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      let remove = p.life <= 0;
      if (p.kind === 'acid') {
        const distToPlayer = p.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 1.35) {
          onDamagePlayer(p.damage, 'Spitter Acid');
          remove = true;
        }
      }

      if (remove) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update active Molotov fires, Decoy Flares, Pipe Bombs
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.life -= delta;
      h.tickCooldown -= delta;
      h.smokeTimer += delta;

      if (h.kind === 'molotov_fire') {
        const flame = h.mesh.getObjectByName('hazardFlame');
        const light = h.mesh.getObjectByName('hazardLight') as THREE.PointLight | undefined;
        const flicker = 0.82 + Math.sin(this.animClock * 23 + i * 2.1) * 0.16 + Math.cos(this.animClock * 37) * 0.08;
        if (flame) {
          flame.scale.set(0.95 + flicker * 0.15, 0.85 + flicker * 0.35, 0.95 + flicker * 0.15);
          flame.rotation.y += delta * 2.2;
        }
        if (light) light.intensity = 2.0 * flicker;
        if (h.smokeTimer >= 0.22) {
          h.smokeTimer = 0;
          this.spawnImpactBurst(h.position, 'smoke', 1);
        }
        if (h.tickCooldown <= 0) {
          h.tickCooldown = 0.65;
          for (const z of zombies) {
            if (z.state === 'dead') continue;
            const dx = z.position[0] - h.position.x;
            const dz = z.position[2] - h.position.z;
            if (dx * dx + dz * dz <= h.radius * h.radius) {
              onDamageZombie(z.id, h.damage);
            }
          }
        }
      } else if (h.kind === 'noise_flare') {
        h.mesh.rotation.y += delta * 2.5;
        const light = h.mesh.getObjectByName('hazardLight') as THREE.PointLight | undefined;
        if (light) light.intensity = 2.2 + Math.sin(this.animClock * 28) * 0.55;
        if (h.smokeTimer >= 0.16) {
          h.smokeTimer = 0;
          this.spawnImpactBurst(h.position, 'spark', 1);
        }
        if (h.tickCooldown <= 0) {
          h.tickCooldown = 1.6;
          // Lure nearby idle/patrolling zombies toward flare
          for (const z of zombies) {
            if (z.state === 'dead') continue;
            const dx = h.position.x - z.position[0];
            const dz = h.position.z - z.position[2];
            if (dx * dx + dz * dz <= h.radius * h.radius && z.state !== 'attack_player') {
              z.rotationY = Math.atan2(dx, dz);
              z.position[0] += Math.sin(z.rotationY) * z.speed * 0.6;
              z.position[2] += Math.cos(z.rotationY) * z.speed * 0.6;
            }
          }
        }
      } else if (h.kind === 'pipe_bomb' && h.life <= 0) {
        soundEngine.playExplosion();
        this.spawnImpactBurst(h.position, 'spark', 14);
        this.spawnImpactBurst(h.position, 'smoke', 12);
        for (const z of zombies) {
          if (z.state === 'dead') continue;
          const dx = z.position[0] - h.position.x;
          const dz = z.position[2] - h.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq <= h.radius * h.radius) {
            const falloff = 1 - Math.sqrt(distSq) / (h.radius * 1.15);
            const kb = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(5.5);
            onDamageZombie(z.id, Math.max(40, Math.round(h.damage * falloff)), kb);
          }
        }
      }

      if (h.life <= 0) {
        this.scene.remove(h.mesh);
        h.mesh.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            m.geometry.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
            else m.material.dispose();
          }
        });
        this.hazards.splice(i, 1);
      }
    }

    // 3. Automated Sentry Turrets, Electric Fences & Landmines
    for (const st of structures) {
      if (st.typeId === 'sentry_turret') {
        const cd = (this.turretCooldowns.get(st.uid) ?? 0) - delta;
        this.turretCooldowns.set(st.uid, Math.max(0, cd));

        if (!isBasePowered) continue;

        // Find closest live zombie within 22m
        let bestZ: ZombieEntity | null = null;
        let bestDist = 22 * 22;
        for (const z of zombies) {
          if (z.state === 'dead') continue;
          const dx = z.position[0] - st.position[0];
          const dz = z.position[2] - st.position[2];
          const d2 = dx * dx + dz * dz;
          if (d2 < bestDist) {
            bestDist = d2;
            bestZ = z;
          }
        }

        if (bestZ) {
          const obj = structureMeshes.get(st.uid);
          const headGroup = obj?.getObjectByName('turretHead');
          const targetYaw = Math.atan2(bestZ.position[0] - st.position[0], bestZ.position[2] - st.position[2]);
          if (headGroup) {
            headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetYaw - st.rotationY, 14, delta);
          }

          if (cd <= 0) {
            this.turretCooldowns.set(st.uid, 0.55);
            const muzzlePos = new THREE.Vector3(st.position[0], st.position[1] + 1.45, st.position[2]);
            const aimDir = new THREE.Vector3(
              bestZ.position[0] - st.position[0],
              bestZ.position[1] + 1.1 - muzzlePos.y,
              bestZ.position[2] - st.position[2]
            ).normalize();
            this.spawnTracer(muzzlePos, aimDir, 'turret_round', 75);
            this.spawnImpactBurst(muzzlePos, 'muzzle', 3);
            const distToPlayer = muzzlePos.distanceTo(playerPos);
            soundEngine.playTurretShot(distToPlayer);
            onDamageZombie(bestZ.id, Math.round(28 * turretDamageMultiplier), undefined, true);
          }
        }
      } else if (st.typeId === 'electric_fence' && isBasePowered) {
        const cd = (this.trapCooldowns.get(st.uid) ?? 0) - delta;
        if (cd <= 0) {
          let zapped = false;
          for (const z of zombies) {
            if (z.state === 'dead') continue;
            const dx = z.position[0] - st.position[0];
            const dz = z.position[2] - st.position[2];
            if (dx * dx + dz * dz < 6.25) {
              const kb = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(2.6);
              onDamageZombie(z.id, 38, kb);
              this.spawnImpactBurst(new THREE.Vector3(z.position[0], z.position[1] + 1.0, z.position[2]), 'spark', 6);
              zapped = true;
            }
          }
          if (zapped) {
            soundEngine.playElectricArc();
            this.trapCooldowns.set(st.uid, 0.9);
          }
        } else {
          this.trapCooldowns.set(st.uid, cd);
        }
      } else if (st.typeId === 'landmine_trap') {
        let triggered = false;
        for (const z of zombies) {
          if (z.state === 'dead') continue;
          const dx = z.position[0] - st.position[0];
          const dz = z.position[2] - st.position[2];
          if (dx * dx + dz * dz < 2.25) {
            triggered = true;
            break;
          }
        }
        if (triggered) {
          soundEngine.playExplosion();
          const minePos = new THREE.Vector3(st.position[0], st.position[1] + 0.3, st.position[2]);
          this.spawnImpactBurst(minePos, 'spark', 14);
          this.spawnImpactBurst(minePos, 'smoke', 10);
          for (const z of zombies) {
            if (z.state === 'dead') continue;
            const dx = z.position[0] - st.position[0];
            const dz = z.position[2] - st.position[2];
            const d2 = dx * dx + dz * dz;
            if (d2 < 32) {
              const kb = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(5.0);
              onDamageZombie(z.id, 175, kb);
            }
          }
          onDestroyStructure(st.uid);
        }
      }
    }
  }

  public dispose() {
    for (const p of this.burstPool) {
      this.scene.remove(p.sprite);
      p.mat.dispose();
    }
    this.burstPool = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const h of this.hazards) {
      this.scene.remove(h.mesh);
      h.mesh.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material.dispose();
        }
      });
    }
    this.hazards = [];
    this.setDeathBag(null);
    this.boltGeom.dispose();
    this.acidGeom.dispose();
    this.boltMat.dispose();
    this.turretBoltMat.dispose();
    this.acidMat.dispose();
  }
}
