import * as THREE from 'three';
import { BiomeType, WeatherType } from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { getSmokePuffTexture, getSnowflakeTexture } from '../../utils/proceduralTextures';

const PARTICLE_COUNT = 1350;
const RAIN_STREAK_COUNT = 1600;
const BOX_EXTENT = 40;
const BOX_HEIGHT = 25;

export interface WeatherTelemetry {
  weather: WeatherType;
  intensity: number; // 0.0 - 1.5 normalized intensity
  visibilityPercent: number; // 25 - 100% atmospheric visibility
  temperatureDelta: number;
  fogDensityMultiplier: number;
  rainCatchmentBonus: number;
  isHazardousToxic: boolean;
  lightningFlash: number;
  overcast: number;
  windStrength: number;
  rainIntensity: number;
}

export class WeatherManager {
  private scene: THREE.Scene;

  // 1. Textured Snow / Sand / Toxic Spore Particles
  private particles: THREE.Points;
  private particleGeom: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;

  // 2. Motion-Blurred Diagonal Raindrop Streak Lines (Zero-Allocation LineSegments)
  private rainLines: THREE.LineSegments;
  private rainGeom: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainSeeds: Float32Array; // [x, y, z, speed]

  // 3. 3D Jagged Sky Lightning Bolt Mesh + Flash Illumination
  private lightningLight: THREE.PointLight;
  private lightningBoltLine: THREE.Line;
  private lightningBoltGeom: THREE.BufferGeometry;
  private lightningBoltMat: THREE.LineBasicMaterial;
  private lightningIntensity = 0;
  private nextLightningTimer = 10;

  private currentWeather: WeatherType = 'clear';
  private forcedWeather: WeatherType | null = null;
  private weatherTimer = 180;
  private intensityMultiplier = 1.0;
  private particleBudgetScale = 1.0;
  private animPhase = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * BOX_EXTENT * 2;
      this.positions[i * 3 + 1] = Math.random() * BOX_HEIGHT;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * BOX_EXTENT * 2;
      this.velocities[i * 3] = (Math.random() - 0.5) * 2;
      this.velocities[i * 3 + 1] = -(7 + Math.random() * 6);
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    this.particleGeom = new THREE.BufferGeometry();
    this.particleGeom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.particleMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      map: getSnowflakeTexture(),
      size: 0.42,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      alphaTest: 0.02,
      blending: THREE.NormalBlending,
    });

    this.particles = new THREE.Points(this.particleGeom, this.particleMat);
    this.particles.frustumCulled = false;
    this.particles.visible = false;
    this.scene.add(this.particles);

    // Motion-Blurred Rain Streaks (each drop has 2 vertices: top & slanted motion-tail)
    this.rainSeeds = new Float32Array(RAIN_STREAK_COUNT * 4);
    const rainVerts = new Float32Array(RAIN_STREAK_COUNT * 6);
    for (let i = 0; i < RAIN_STREAK_COUNT; i++) {
      const rx = (Math.random() - 0.5) * BOX_EXTENT * 2;
      const ry = Math.random() * BOX_HEIGHT;
      const rz = (Math.random() - 0.5) * BOX_EXTENT * 2;
      const spd = 19 + Math.random() * 11;
      this.rainSeeds[i * 4] = rx;
      this.rainSeeds[i * 4 + 1] = ry;
      this.rainSeeds[i * 4 + 2] = rz;
      this.rainSeeds[i * 4 + 3] = spd;

      rainVerts[i * 6] = rx;
      rainVerts[i * 6 + 1] = ry;
      rainVerts[i * 6 + 2] = rz;
      rainVerts[i * 6 + 3] = rx - 0.14;
      rainVerts[i * 6 + 4] = ry - 0.95;
      rainVerts[i * 6 + 5] = rz - 0.06;
    }

    this.rainGeom = new THREE.BufferGeometry();
    this.rainGeom.setAttribute('position', new THREE.BufferAttribute(rainVerts, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xc8e4ff,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeom, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // 3D Jagged Branching Lightning Bolt + Flash Light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 260, 1.2);
    this.scene.add(this.lightningLight);

    const boltPoints = new Float32Array(14 * 3);
    this.lightningBoltGeom = new THREE.BufferGeometry();
    this.lightningBoltGeom.setAttribute('position', new THREE.BufferAttribute(boltPoints, 3));
    this.lightningBoltMat = new THREE.LineBasicMaterial({
      color: 0xeff6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.lightningBoltLine = new THREE.Line(this.lightningBoltGeom, this.lightningBoltMat);
    this.lightningBoltLine.frustumCulled = false;
    this.lightningBoltLine.visible = false;
    this.scene.add(this.lightningBoltLine);
  }

  public setWeather(weather: WeatherType, manualOverride = false) {
    if (manualOverride) {
      this.forcedWeather = weather === 'clear' ? null : weather;
    }
    this.currentWeather = weather;
    this.weatherTimer = 140 + Math.random() * 140;
    this.applyWeatherStyle();
  }

  public clearManualOverride() {
    this.forcedWeather = null;
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  public setIntensityMultiplier(mult: number) {
    this.intensityMultiplier = Math.max(0, Math.min(2, mult));
  }

  public setParticleBudgetScale(scale: number) {
    this.particleBudgetScale = Math.max(0.2, Math.min(1.0, scale));
    const activeParticles = Math.max(80, Math.round(PARTICLE_COUNT * this.particleBudgetScale));
    const activeRainVerts = Math.max(120, Math.round(RAIN_STREAK_COUNT * this.particleBudgetScale)) * 2;
    this.particleGeom.setDrawRange(0, activeParticles);
    this.rainGeom.setDrawRange(0, activeRainVerts);
  }

  private applyWeatherStyle() {
    if (this.currentWeather === 'clear' || this.intensityMultiplier <= 0.05) {
      this.particles.visible = false;
      this.rainLines.visible = false;
      return;
    }

    if (this.currentWeather === 'rain' || this.currentWeather === 'thunderstorm') {
      this.rainLines.visible = true;
      this.particles.visible = false;
      const isStorm = this.currentWeather === 'thunderstorm';
      this.rainMat.color.setHex(isStorm ? 0xdbeafe : 0xb4daff);
      this.rainMat.opacity = isStorm ? 0.58 : 0.42;
      return;
    }

    this.rainLines.visible = false;
    this.particles.visible = true;

    switch (this.currentWeather) {
      case 'blizzard':
        this.particleMat.map = getSnowflakeTexture();
        this.particleMat.color.setHex(0xf8fafc);
        this.particleMat.size = 0.48;
        this.particleMat.opacity = 0.88;
        this.particleMat.blending = THREE.NormalBlending;
        break;
      case 'sandstorm':
        this.particleMat.map = getSmokePuffTexture();
        this.particleMat.color.setHex(0xd99b38);
        this.particleMat.size = 1.65;
        this.particleMat.opacity = 0.34;
        this.particleMat.blending = THREE.NormalBlending;
        break;
      case 'toxic_fog':
        this.particleMat.map = getSmokePuffTexture();
        this.particleMat.color.setHex(0x84cc16);
        this.particleMat.size = 1.85;
        this.particleMat.opacity = 0.28;
        this.particleMat.blending = THREE.AdditiveBlending;
        break;
    }
    this.particleMat.needsUpdate = true;
  }

  private spawnLightningBolt(playerPos: THREE.Vector3) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 65;
    const startX = playerPos.x + Math.cos(angle) * dist;
    const startZ = playerPos.z + Math.sin(angle) * dist;
    const topY = playerPos.y + 85;
    const botY = playerPos.y - 4;

    const attr = this.lightningBoltGeom.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const segs = 13;
    let cx = startX;
    let cz = startZ;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = THREE.MathUtils.lerp(topY, botY, t);
      if (i > 0 && i < segs) {
        cx += (Math.random() - 0.5) * 9.5;
        cz += (Math.random() - 0.5) * 9.5;
      }
      arr[i * 3] = cx;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = cz;
    }
    attr.needsUpdate = true;
    this.lightningBoltLine.visible = true;
    this.lightningLight.position.set(startX * 0.4 + playerPos.x * 0.6, playerPos.y + 42, startZ * 0.4 + playerPos.z * 0.6);
  }

  public update(delta: number, playerPos: THREE.Vector3, biomeId: BiomeType, isSubmerged = false): WeatherTelemetry {
    this.animPhase += delta;

    if (this.forcedWeather) {
      if (this.currentWeather !== this.forcedWeather) {
        this.currentWeather = this.forcedWeather;
        this.applyWeatherStyle();
      }
    } else {
      this.weatherTimer -= delta;
      if (this.weatherTimer <= 0) {
        this.weatherTimer = 140 + Math.random() * 160;
        this.rollWeatherForBiome(biomeId);
      }
    }

    // Lightning updates
    if (this.lightningIntensity > 0) {
      this.lightningIntensity = Math.max(0, this.lightningIntensity - delta * 6.2);
      this.lightningLight.intensity = this.lightningIntensity;
      this.lightningBoltMat.opacity = Math.min(1, this.lightningIntensity * 0.45);
      if (this.lightningIntensity <= 0.05) {
        this.lightningBoltLine.visible = false;
      }
    }

    if (this.currentWeather === 'thunderstorm' && this.intensityMultiplier > 0.1) {
      this.nextLightningTimer -= delta;
      if (this.nextLightningTimer <= 0) {
        this.nextLightningTimer = 6 + Math.random() * 13;
        this.lightningIntensity = 4.0;
        this.lightningLight.intensity = 4.0;
        this.spawnLightningBolt(playerPos);
        if (!isSubmerged) {
          soundEngine.playThunder();
        }
      }
    }

    const isRainType = this.currentWeather === 'rain' || this.currentWeather === 'thunderstorm';

    // Update Rain Streak Lines
    if (isRainType && !isSubmerged && this.intensityMultiplier > 0.05) {
      this.rainLines.visible = true;
      this.rainLines.position.set(playerPos.x, playerPos.y, playerPos.z);

      const isStorm = this.currentWeather === 'thunderstorm';
      const windX = isStorm ? -7.2 : -2.1;
      const windZ = isStorm ? -3.2 : -0.9;
      const speedMult = isStorm ? 1.38 : 1.0;
      const streakScale = isStorm ? 0.056 : 0.044;

      const attr = this.rainGeom.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const activeRainCount = Math.max(60, Math.round(RAIN_STREAK_COUNT * this.particleBudgetScale));

      for (let i = 0; i < activeRainCount; i++) {
        const si = i * 4;
        const fall = this.rainSeeds[si + 3] * speedMult;
        let x = this.rainSeeds[si] + windX * delta;
        let y = this.rainSeeds[si + 1] - fall * delta;
        let z = this.rainSeeds[si + 2] + windZ * delta;

        if (y < -2) y += BOX_HEIGHT + 2;
        if (x < -BOX_EXTENT) x += BOX_EXTENT * 2;
        else if (x > BOX_EXTENT) x -= BOX_EXTENT * 2;
        if (z < -BOX_EXTENT) z += BOX_EXTENT * 2;
        else if (z > BOX_EXTENT) z -= BOX_EXTENT * 2;

        this.rainSeeds[si] = x;
        this.rainSeeds[si + 1] = y;
        this.rainSeeds[si + 2] = z;

        const vi = i * 6;
        arr[vi] = x;
        arr[vi + 1] = y;
        arr[vi + 2] = z;
        arr[vi + 3] = x + windX * streakScale;
        arr[vi + 4] = y - fall * streakScale;
        arr[vi + 5] = z + windZ * streakScale;
      }
      attr.needsUpdate = true;
    } else {
      this.rainLines.visible = false;
    }

    // Update Textured Snow / Sand / Spore Clouds
    if (!isRainType && this.currentWeather !== 'clear' && !isSubmerged && this.intensityMultiplier > 0.05) {
      this.particles.visible = true;
      this.particles.position.set(playerPos.x, playerPos.y, playerPos.z);

      let fallSpeedY = -6.5;
      let windX = -8.5;
      let windZ = 3.5;

      if (this.currentWeather === 'sandstorm') {
        fallSpeedY = -1.6;
        windX = -15.5;
        windZ = 3.8;
      } else if (this.currentWeather === 'toxic_fog') {
        fallSpeedY = 0.65;
        windX = 1.9;
        windZ = -1.2;
      }

      const attr = this.particleGeom.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const activeParticleCount = Math.max(80, Math.round(PARTICLE_COUNT * this.particleBudgetScale));
      for (let i = 0; i < activeParticleCount; i++) {
        const idx = i * 3;
        const swirl = Math.sin(this.animPhase * 2.2 + i * 0.37) * 1.4;
        arr[idx] += (windX + this.velocities[idx] * 0.55 + swirl) * delta;
        arr[idx + 1] += fallSpeedY * delta;
        arr[idx + 2] += (windZ + this.velocities[idx + 2] * 0.55) * delta;

        if (arr[idx + 1] < -2) arr[idx + 1] = BOX_HEIGHT;
        if (arr[idx + 1] > BOX_HEIGHT + 1) arr[idx + 1] = 0;
        if (arr[idx] < -BOX_EXTENT) arr[idx] += BOX_EXTENT * 2;
        if (arr[idx] > BOX_EXTENT) arr[idx] -= BOX_EXTENT * 2;
        if (arr[idx + 2] < -BOX_EXTENT) arr[idx + 2] += BOX_EXTENT * 2;
        if (arr[idx + 2] > BOX_EXTENT) arr[idx + 2] -= BOX_EXTENT * 2;
      }
      attr.needsUpdate = true;
    } else {
      this.particles.visible = false;
    }

    let temperatureDelta = 0;
    let fogDensityMultiplier = 1.0;
    let rainCatchmentBonus = 0;
    let overcast = 0.0;
    let windStrength = 0.72;
    let rainIntensity = 0.0;
    let baseIntensity = 0.25;

    switch (this.currentWeather) {
      case 'rain':
        temperatureDelta = -3.0;
        fogDensityMultiplier = 1.38;
        rainCatchmentBonus = 2.5;
        overcast = 0.74;
        windStrength = 1.45;
        rainIntensity = 0.72;
        baseIntensity = 0.72;
        break;
      case 'thunderstorm':
        temperatureDelta = -5.5;
        fogDensityMultiplier = 1.78;
        rainCatchmentBonus = 5.0;
        overcast = 0.96;
        windStrength = 2.35;
        rainIntensity = 1.0;
        baseIntensity = 1.0;
        break;
      case 'blizzard':
        temperatureDelta = -14.0;
        fogDensityMultiplier = 2.15;
        overcast = 0.88;
        windStrength = 2.45;
        baseIntensity = 0.95;
        break;
      case 'sandstorm':
        temperatureDelta = 7.0;
        fogDensityMultiplier = 2.25;
        overcast = 0.76;
        windStrength = 2.65;
        baseIntensity = 0.9;
        break;
      case 'toxic_fog':
        temperatureDelta = -1.5;
        fogDensityMultiplier = 2.45;
        overcast = 0.82;
        windStrength = 0.92;
        baseIntensity = 0.85;
        break;
    }

    const effectiveFogMult = 1 + (fogDensityMultiplier - 1) * this.intensityMultiplier;
    const effectiveIntensity = this.currentWeather === 'clear'
      ? Math.max(0.25, Math.min(0.45, 0.25 + 0.1 * this.intensityMultiplier))
      : Math.max(0.15, Math.min(1.5, baseIntensity * this.intensityMultiplier));
    const visibilityPercent = Math.round(
      THREE.MathUtils.clamp(100 / Math.pow(effectiveFogMult, 0.78), 32, 100)
    );

    return {
      weather: this.currentWeather,
      intensity: effectiveIntensity,
      visibilityPercent,
      temperatureDelta: temperatureDelta * this.intensityMultiplier,
      fogDensityMultiplier: effectiveFogMult,
      rainCatchmentBonus,
      isHazardousToxic: this.currentWeather === 'toxic_fog',
      lightningFlash: this.lightningIntensity,
      overcast: Math.min(1, overcast * this.intensityMultiplier),
      windStrength: 0.7 + (windStrength - 0.7) * this.intensityMultiplier,
      rainIntensity: Math.min(1.5, rainIntensity * this.intensityMultiplier),
    };
  }

  private rollWeatherForBiome(biomeId: BiomeType) {
    const r = Math.random();
    if (biomeId === 'snow_peaks' || biomeId === 'glacier_field' || biomeId === 'tundra' || biomeId === 'taiga') {
      this.currentWeather = r < 0.45 ? 'clear' : r < 0.85 ? 'blizzard' : 'toxic_fog';
    } else if (biomeId === 'desert' || biomeId === 'sand_dunes' || biomeId === 'badlands' || biomeId === 'volcanic_wastes') {
      this.currentWeather = r < 0.55 ? 'clear' : r < 0.9 ? 'sandstorm' : 'toxic_fog';
    } else if (biomeId === 'deep_swamp' || biomeId === 'industrial_zone' || biomeId === 'research_facility') {
      this.currentWeather = r < 0.4 ? 'clear' : r < 0.65 ? 'rain' : r < 0.82 ? 'thunderstorm' : 'toxic_fog';
    } else {
      this.currentWeather = r < 0.55 ? 'clear' : r < 0.8 ? 'rain' : r < 0.93 ? 'thunderstorm' : 'toxic_fog';
    }
    this.applyWeatherStyle();
  }

  public dispose() {
    this.scene.remove(this.particles);
    this.scene.remove(this.rainLines);
    this.scene.remove(this.lightningLight);
    this.scene.remove(this.lightningBoltLine);
    this.particleGeom.dispose();
    this.particleMat.dispose();
    this.rainGeom.dispose();
    this.rainMat.dispose();
    this.lightningBoltGeom.dispose();
    this.lightningBoltMat.dispose();
  }
}
