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

    // 1. Procedural Atmospheric Skydome (Rayleigh-Mie scatter, silver-lined multi-octave clouds, twilight belt & lunar mare)
    const domeGeo = new THREE.SphereGeometry(350, 40, 28);

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
        varying vec3 vLocalDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vLocalDir = normalize(position);
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
        varying vec3 vLocalDir;

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
          float a = 0.5;
          mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.04 + vec2(1.7, 9.2);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vLocalDir);
          float height = dir.y;
          vec3 sDir = normalize(sunPosition);
          float sunCos = dot(dir, sDir);

          // 1. Atmospheric Rayleigh + Horizon Haze Gradient
          vec3 sky;
          if (height > 0.0) {
            float hFactor = clamp(height * 1.9, 0.0, 1.0);
            sky = mix(horizonColor, topColor, pow(hFactor, 0.58));
          } else {
            sky = mix(horizonColor, bottomColor, clamp(-height * 3.8, 0.0, 1.0));
          }

          // Azimuthal horizon glow toward the sun during golden hour & dawn
          float sunAzimuthGlow = pow(max(0.0, sunCos), 3.0) * exp(-abs(height) * 5.2);
          sky += horizonColor * sunAzimuthGlow * (1.0 - isNight) * 0.35;

          // Subtle Milky Way star-dust band at night
          if (isNight > 0.05) {
            float mwCoord = dir.x * 0.68 + dir.y * 0.45 - dir.z * 0.58;
            float mwBand = exp(-mwCoord * mwCoord * 14.0) * clamp(height * 3.0, 0.0, 1.0);
            float mwNebula = fbm(dir.xz * 3.2 + dir.xy * 1.9);
            vec3 mwColor = mix(vec3(0.05, 0.08, 0.16), vec3(0.16, 0.04, 0.07), isBloodMoon);
            sky += mwColor * mwBand * (0.4 + mwNebula * 0.9) * isNight;
          }

          // 2. Solar & Lunar Discs + Mie Forward-Scattering Halo
          if (isNight < 0.5) {
            float mieWide = pow(max(0.0, sunCos), 8.0) * 0.22;
            float sunGlow = pow(max(0.0, sunCos), 42.0) * 0.72;
            float sunDisc = smoothstep(1.0 - sunSize * 0.013, 1.0 - sunSize * 0.0025, sunCos) * 4.5;
            sky += (sunColor * sunDisc) + (sunColor * sunGlow) + (horizonColor * mieWide);
          } else {
            vec3 mDir = -sDir;
            float moonCos = dot(dir, mDir);
            float moonGlow = pow(max(0.0, moonCos), 28.0) * 0.42;
            float moonRadius = sunSize * 0.017;
            float moonDisc = smoothstep(1.0 - moonRadius, 1.0 - sunSize * 0.004, moonCos) * 2.6;

            if (moonCos > 1.0 - moonRadius) {
              float mare = fbm(dir.xy * 55.0);
              float crater = noise(dir.xy * 120.0) * 0.18;
              moonDisc *= (0.72 + mare * 0.28 - crater);
            }

            vec3 activeMoonColor = mix(moonColor, vec3(1.0, 0.16, 0.16), isBloodMoon);
            sky += (activeMoonColor * moonDisc) + (activeMoonColor * moonGlow * 0.85);
          }

          // 3. Two-Layer Drifting Volumetric Clouds with Sunlit Silver Lining
          if (height > 0.03) {
            float horizonFade = smoothstep(0.03, 0.24, height);
            vec2 projUV = dir.xz / (height + 0.18);
            vec2 cloudUV1 = projUV * 0.62 + vec2(time * 0.0028, time * 0.0016);
            vec2 cloudUV2 = projUV * 1.35 + vec2(time * 0.0044, -time * 0.0012);

            float density1 = fbm(cloudUV1);
            float density2 = fbm(cloudUV2);
            float cloudShape = density1 * 0.72 + density2 * 0.28;
            float cloudMask = smoothstep(0.47, 0.74, cloudShape);

            // Sunward edge scattering for realistic cloud lighting
            float sunSilver = pow(max(0.0, sunCos), 6.0) * (1.0 - isNight);
            float cloudLight = clamp(0.45 + (density1 - density2) * 0.85 + sunSilver * 0.55, 0.25, 1.15);

            vec3 brightCloud = mix(vec3(1.0, 0.99, 0.97), sunColor, 0.25 + sunSilver * 0.45);
            vec3 shadowCloud = mix(horizonColor * 0.72, topColor * 0.88, 0.35);
            vec3 dayCloudColor = mix(shadowCloud, brightCloud, clamp(cloudLight, 0.0, 1.0));

            vec3 nightCloudColor = mix(vec3(0.05, 0.07, 0.12), vec3(0.24, 0.04, 0.06), isBloodMoon);
            vec3 cloudColor = mix(dayCloudColor, nightCloudColor, isNight);

            sky = mix(sky, cloudColor, cloudMask * horizonFade * 0.84);
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyMesh = new THREE.Mesh(domeGeo, this.skyMaterial);
    this.group.add(this.skyMesh);

    // 2. Realistic Chromatic Starfield Constellations
    const starCount = 2200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.06 + Math.random() * 0.94);
      const r = 340;

      starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Realistic stellar spectral temperatures (blue-white Rigel to warm amber Betelgeuse)
      const spec = Math.random();
      const bright = 0.45 + Math.pow(Math.random(), 2.2) * 0.55;
      if (spec < 0.25) tmpColor.setRGB(0.75 * bright, 0.85 * bright, 1.0 * bright);
      else if (spec < 0.8) tmpColor.setRGB(0.98 * bright, 0.98 * bright, 1.0 * bright);
      else tmpColor.setRGB(1.0 * bright, 0.84 * bright, 0.65 * bright);

      starColors[i * 3 + 0] = tmpColor.r;
      starColors[i * 3 + 1] = tmpColor.g;
      starColors[i * 3 + 2] = tmpColor.b;
    }

    this.starsGeometry = new THREE.BufferGeometry();
    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 1.65,
      vertexColors: true,
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
