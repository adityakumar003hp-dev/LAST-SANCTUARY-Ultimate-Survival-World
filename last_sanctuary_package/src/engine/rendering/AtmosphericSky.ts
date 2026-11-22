/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Realistic Atmospheric Sky Dome with Rayleigh-Mie Scattering,
 * dynamic Sun/Moon discs, star constellations, and drifting volumetric clouds.
 */
export class AtmosphericSky {
  public group: THREE.Group;
  private skyMesh: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private sunLight: THREE.DirectionalLight;
  private starsGeometry: THREE.BufferGeometry;
  private starsPoints: THREE.Points;

  constructor(scene: THREE.Scene, sunLight: THREE.DirectionalLight) {
    this.sunLight = sunLight;
    this.group = new THREE.Group();
    this.group.name = 'atmospheric_sky';

    // 1. Procedural Atmospheric Skydome
    const domeGeo = new THREE.SphereGeometry(350, 32, 24);

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a508b) },
        bottomColor: { value: new THREE.Color(0x87ceeb) },
        horizonColor: { value: new THREE.Color(0xd6eaf8) },
        sunPosition: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color(0xfff6dd) },
        moonColor: { value: new THREE.Color(0xdde8f5) },
        sunSize: { value: 0.035 },
        isNight: { value: 0.0 },
        isBloodMoon: { value: 0.0 },
        time: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vNormal = normal;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform vec3 sunPosition;
        uniform vec3 sunColor;
        uniform vec3 moonColor;
        uniform float sunSize;
        uniform float isNight;
        uniform float isBloodMoon;
        uniform float time;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        // Hash function for procedural clouds & stars
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.5000 * noise(p); p = p * 2.02;
          v += 0.2500 * noise(p); p = p * 2.03;
          v += 0.1250 * noise(p); p = p * 2.01;
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float height = dir.y;

          // 1. Atmospheric Gradient
          vec3 sky;
          if (height > 0.0) {
            float hFactor = clamp(height * 2.2, 0.0, 1.0);
            sky = mix(horizonColor, topColor, pow(hFactor, 0.65));
          } else {
            sky = mix(horizonColor, bottomColor, clamp(-height * 4.0, 0.0, 1.0));
          }

          // 2. Solar & Lunar Discs + Atmospheric Glow
          vec3 sDir = normalize(sunPosition);
          float sunCos = dot(dir, sDir);

          // Sunlight Mie Halo & Core Disc
          if (isNight < 0.5) {
            float sunGlow = pow(max(0.0, sunCos), 32.0) * 0.6;
            float sunDisc = smoothstep(1.0 - sunSize * 0.012, 1.0 - sunSize * 0.003, sunCos) * 4.0;
            sky += (sunColor * sunDisc) + (horizonColor * sunGlow);
          } else {
            // Moon Disc & Moon Glow
            vec3 mDir = -sDir; // Moon is opposite to the sun
            float moonCos = dot(dir, mDir);
            float moonGlow = pow(max(0.0, moonCos), 24.0) * 0.45;
            float moonDisc = smoothstep(1.0 - sunSize * 0.015, 1.0 - sunSize * 0.005, moonCos) * 2.5;

            // Moon surface detail variation
            if (moonCos > 1.0 - sunSize * 0.015) {
              float crater = noise(dir.xy * 80.0) * 0.25;
              moonDisc *= (1.0 - crater);
            }

            vec3 activeMoonColor = mix(moonColor, vec3(1.0, 0.15, 0.15), isBloodMoon);
            sky += (activeMoonColor * moonDisc) + (activeMoonColor * moonGlow);
          }

          // 3. Drifting Volumetric Cloud Tufts (day & twilight)
          if (height > 0.08) {
            vec2 cloudUV = (dir.xz / (height + 0.15)) * 0.65 + vec2(time * 0.003, time * 0.002);
            float cloudDense = fbm(cloudUV);
            float cloudMask = smoothstep(0.48, 0.72, cloudDense);

            vec3 cloudTint = mix(vec3(1.0, 0.98, 0.95), horizonColor * 1.2, 0.4);
            if (isNight > 0.5) {
              cloudTint = mix(vec3(0.08, 0.1, 0.16), vec3(0.3, 0.05, 0.08), isBloodMoon);
            }
            sky = mix(sky, cloudTint, cloudMask * clamp(height * 2.0, 0.0, 0.75));
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyMesh = new THREE.Mesh(domeGeo, this.skyMaterial);
    this.group.add(this.skyMesh);

    // 2. Realistic Starfield Constellations
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Hemisphere distribution above ground
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.08 + Math.random() * 0.92);
      const r = 340;

      starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSizes[i] = 1.0 + Math.random() * 2.0;
    }

    this.starsGeometry = new THREE.BufferGeometry();
    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starsGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: false,
    });

    this.starsPoints = new THREE.Points(this.starsGeometry, starsMaterial);
    this.group.add(this.starsPoints);

    scene.add(this.group);
  }

  /**
   * Updates sky colors, sun disc angle, and star brightness according to real-time day/night simulation.
   */
  public update(
    timeMinutes: number,
    isNight: boolean,
    isDusk: boolean,
    isBloodMoon: boolean,
    delta: number,
    playerPosition: THREE.Vector3
  ) {
    // Keep skydome centered around player
    this.group.position.copy(playerPosition);

    const uniforms = this.skyMaterial.uniforms;
    uniforms.time.value += delta;
    uniforms.sunPosition.value.copy(this.sunLight.position);

    const hour = (timeMinutes % 1440) / 60;

    // Atmospheric Rayleigh/Mie transitions
    if (hour >= 5.5 && hour < 8.0) {
      // Dawn / Sunrise: Soft golden pink to fresh morning azure
      const t = (hour - 5.5) / 2.5;
      uniforms.topColor.value.setRGB(0.12 + t * 0.08, 0.28 + t * 0.28, 0.62 + t * 0.25);
      uniforms.bottomColor.value.setRGB(0.9, 0.55, 0.35);
      uniforms.horizonColor.value.setRGB(1.0, 0.72 - t * 0.15, 0.48 - t * 0.2);
      uniforms.sunColor.value.setRGB(1.0, 0.88, 0.6);
      uniforms.isNight.value = 0.0;
      uniforms.isBloodMoon.value = 0.0;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = Math.max(0, 1.0 - t * 1.5);
    } else if (hour >= 8.0 && hour < 17.0) {
      // Crisp Daylight: Rich cobalt blue zenith, soft pale horizon
      uniforms.topColor.value.setRGB(0.12, 0.44, 0.88);
      uniforms.bottomColor.value.setRGB(0.72, 0.84, 0.94);
      uniforms.horizonColor.value.setRGB(0.82, 0.91, 0.98);
      uniforms.sunColor.value.setRGB(1.0, 0.98, 0.92);
      uniforms.isNight.value = 0.0;
      uniforms.isBloodMoon.value = 0.0;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = 0.0;
    } else if (hour >= 17.0 && hour < 20.5) {
      // Sunset / Golden Hour: Amber, fiery crimson, deep twilight gradient
      const t = (hour - 17.0) / 3.5;
      uniforms.topColor.value.setRGB(0.25 - t * 0.2, 0.22 - t * 0.18, 0.48 - t * 0.36);
      uniforms.bottomColor.value.setRGB(0.4 - t * 0.3, 0.2 - t * 0.15, 0.15);
      uniforms.horizonColor.value.setRGB(0.95 - t * 0.5, 0.45 - t * 0.35, 0.2 - t * 0.12);
      uniforms.sunColor.value.setRGB(1.0, 0.45, 0.15);
      uniforms.isNight.value = t > 0.6 ? 1.0 : 0.0;
      uniforms.isBloodMoon.value = isBloodMoon ? 1.0 : 0.0;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = Math.max(0, (t - 0.5) * 2.0);
    } else {
      // Night / Midnight / Blood Moon
      if (isBloodMoon) {
        uniforms.topColor.value.setRGB(0.08, 0.02, 0.04);
        uniforms.bottomColor.value.setRGB(0.18, 0.04, 0.06);
        uniforms.horizonColor.value.setRGB(0.35, 0.08, 0.1);
        uniforms.isBloodMoon.value = 1.0;
      } else {
        uniforms.topColor.value.setRGB(0.02, 0.04, 0.08);
        uniforms.bottomColor.value.setRGB(0.04, 0.06, 0.12);
        uniforms.horizonColor.value.setRGB(0.07, 0.1, 0.16);
        uniforms.isBloodMoon.value = 0.0;
      }
      uniforms.isNight.value = 1.0;
      uniforms.moonColor.value.setRGB(0.85, 0.92, 1.0);
      (this.starsPoints.material as THREE.PointsMaterial).opacity = 0.95;
    }
  }

  public getHorizonColor(): THREE.Color {
    return (this.skyMaterial.uniforms.horizonColor.value as THREE.Color).clone();
  }

  public dispose() {
    this.skyMesh.geometry.dispose();
    this.skyMaterial.dispose();
    this.starsGeometry.dispose();
    (this.starsPoints.material as THREE.Material).dispose();
  }
}
