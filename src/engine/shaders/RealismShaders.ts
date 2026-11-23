import * as THREE from 'three';
import { getWaterRippleNormalMap } from '../../utils/proceduralTextures';

/**
 * Shared global shader uniforms updated once per frame with zero allocations.
 * Drives synchronized wind gusts, rain wetness & puddles, solar scattering, and lightning flashes
 * across terrain, water, vegetation, and cinematic post-processing.
 */
export const RealismShaderGlobals = {
  uTime: { value: 0 },
  uWindStrength: { value: 0.75 },
  uWetness: { value: 0.0 },
  uRainIntensity: { value: 0.0 },
  uLightningFlash: { value: 0.0 },
  uSunDir: { value: new THREE.Vector3(0.45, 0.72, 0.52).normalize() },
  uSunColor: { value: new THREE.Color(0xfff6e5) },
  uHorizonColor: { value: new THREE.Color(0xb8d9f0) },
};

const GLSL_NOISE_HELPERS = /* glsl */ `
float rHash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float rVNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(rHash21(i + vec2(0.0, 0.0)), rHash21(i + vec2(1.0, 0.0)), u.x),
    mix(rHash21(i + vec2(0.0, 1.0)), rHash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float rFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * rVNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

/**
 * Upgrades any terrain MeshStandardMaterial with:
 * 1) Multi-scale world-space noise breakup (kills tiling across 260m+ expanses)
 * 2) Steep cliff strata & micro-gravel shading
 * 3) Dynamic Rain Wetness & Specular Puddle Pools driven by uWetness
 */
export function enhanceTerrainMaterialWithRealism(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.customProgramCacheKey = () => 'terrain_realism_v2';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = RealismShaderGlobals.uTime;
    shader.uniforms.uWetness = RealismShaderGlobals.uWetness;
    shader.uniforms.uRainIntensity = RealismShaderGlobals.uRainIntensity;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRealWorldPos;
        varying vec3 vRealWorldNorm;`
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 rWorldPos = modelMatrix * vec4(transformed, 1.0);
        vRealWorldPos = rWorldPos.xyz;
        vRealWorldNorm = normalize(mat3(modelMatrix) * objectNormal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWetness;
        uniform float uRainIntensity;
        varying vec3 vRealWorldPos;
        varying vec3 vRealWorldNorm;
        ${GLSL_NOISE_HELPERS}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float rMacro = rFbm(vRealWorldPos.xz * 0.045);
        float rMid = rFbm(vRealWorldPos.xz * 0.38);
        float rMicro = rVNoise(vRealWorldPos.xz * 3.8);
        float rDetail = 0.80 + rMacro * 0.24 + rMid * 0.14 + (rMicro - 0.5) * 0.12;
        diffuseColor.rgb *= rDetail;

        // Horizontal geological strata bands on steep rock faces
        float slopeAmt = clamp((0.86 - vRealWorldNorm.y) * 3.5, 0.0, 1.0);
        if (slopeAmt > 0.02) {
          float strata = 0.84 + 0.28 * sin(vRealWorldPos.y * 5.2 + rMid * 4.5);
          diffuseColor.rgb *= mix(1.0, strata, slopeAmt);
        }

        // Rain wetness absorption & organic puddle darkening on level ground
        float flatMask = smoothstep(0.86, 0.96, vRealWorldNorm.y) * smoothstep(-0.2, 0.35, vRealWorldPos.y);
        float puddleNoise = rFbm(vRealWorldPos.xz * 0.16);
        float puddleMask = smoothstep(0.56 - uWetness * 0.18, 0.70 - uWetness * 0.12, puddleNoise) * flatMask * uWetness;
        diffuseColor.rgb *= mix(1.0, 0.62, uWetness * 0.85);
        diffuseColor.rgb *= mix(1.0, 0.72, puddleMask);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float rFlat = smoothstep(0.86, 0.96, vRealWorldNorm.y) * smoothstep(-0.2, 0.35, vRealWorldPos.y);
        float rPuddle = smoothstep(0.56 - uWetness * 0.18, 0.70 - uWetness * 0.12, rFbm(vRealWorldPos.xz * 0.16)) * rFlat * uWetness;
        roughnessFactor = mix(roughnessFactor, 0.38, uWetness * 0.55);
        roughnessFactor = mix(roughnessFactor, 0.05, rPuddle);`
      );
  };
  return mat;
}

/**
 * Photorealistic Gerstner Wave + Fresnel Sky Reflection + Sun Specular Glitter + Rain Ripple Water Material
 */
export function createRealisticWaterMaterial(
  waterColorHex: number = 0x154d69,
  isPool: boolean = false
): THREE.MeshPhysicalMaterial {
  const rippleNormal = getWaterRippleNormalMap();
  rippleNormal.wrapS = THREE.RepeatWrapping;
  rippleNormal.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshPhysicalMaterial({
    color: waterColorHex,
    roughness: isPool ? 0.05 : 0.07,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    ior: 1.333,
    reflectivity: 0.94,
    envMapIntensity: 1.65,
    normalMap: rippleNormal,
    normalScale: new THREE.Vector2(isPool ? 0.45 : 1.05, isPool ? 0.45 : 1.05),
    transparent: true,
    opacity: isPool ? 0.82 : 0.88,
  });

  const ampScale = isPool ? 0.16 : 1.0;
  mat.customProgramCacheKey = () => (isPool ? 'realistic_pool_water_v2' : 'realistic_river_water_v2');
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = RealismShaderGlobals.uTime;
    shader.uniforms.uWindStrength = RealismShaderGlobals.uWindStrength;
    shader.uniforms.uRainIntensity = RealismShaderGlobals.uRainIntensity;
    shader.uniforms.uSunDir = RealismShaderGlobals.uSunDir;
    shader.uniforms.uSunColor = RealismShaderGlobals.uSunColor;
    shader.uniforms.uHorizonColor = RealismShaderGlobals.uHorizonColor;
    shader.uniforms.uAmpScale = { value: ampScale };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uAmpScale;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterWorldNormal;
        varying float vWaveCrest;`
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vec4 wBasePos = modelMatrix * vec4(position, 1.0);
        float wt = uTime * (0.9 + uWindStrength * 0.35);
        float a1 = 0.065 * uAmpScale * (0.8 + uWindStrength * 0.35);
        float a2 = 0.038 * uAmpScale * (0.8 + uWindStrength * 0.35);
        float p1 = dot(wBasePos.xz, vec2(0.42, 0.26)) + wt * 1.65;
        float p2 = dot(wBasePos.xz, vec2(-0.31, 0.58)) - wt * 1.25;
        float p3 = dot(wBasePos.xz, vec2(0.85, -0.45)) + wt * 2.2;
        float dx = cos(p1) * 0.42 * a1 - cos(p2) * 0.31 * a2 + cos(p3) * 0.85 * a2 * 0.5;
        float dz = cos(p1) * 0.26 * a1 + cos(p2) * 0.58 * a2 - cos(p3) * 0.45 * a2 * 0.5;
        objectNormal = normalize(vec3(-dx, 1.0, -dz));
        vWaterWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wh = sin(p1) * a1 + sin(p2) * a2 + sin(p3) * a2 * 0.5;
        transformed.y += wh;
        vWaveCrest = clamp((wh / max(0.001, a1 + a2)) * 0.5 + 0.5, 0.0, 1.0);`
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uRainIntensity;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uHorizonColor;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterWorldNormal;
        varying float vWaveCrest;
        ${GLSL_NOISE_HELPERS}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Animated caustic shimmer + deep absorption tint
        float c1 = rVNoise(vWaterWorldPos.xz * 1.35 + vec2(uTime * 0.45, -uTime * 0.32));
        float c2 = rVNoise(vWaterWorldPos.xz * 2.4 - vec2(uTime * 0.38, uTime * 0.52));
        float caustic = pow(clamp(c1 * c2 * 2.1, 0.0, 1.0), 2.2);
        diffuseColor.rgb += vec3(0.08, 0.22, 0.24) * caustic;

        // Subtle wind chop foam on high wave crests
        float crestFoam = smoothstep(0.76, 0.96, vWaveCrest) * smoothstep(0.45, 0.78, c1);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.88, 0.93), crestFoam * 0.35);

        // Expanding concentric raindrop rings during rain / thunderstorms
        if (uRainIntensity > 0.02) {
          vec2 rg = vWaterWorldPos.xz * 1.65;
          vec2 cell = floor(rg);
          vec2 local = fract(rg) - 0.5;
          float rnd = rHash21(cell);
          float phase = fract(uTime * 1.85 + rnd * 6.283);
          float dist = length(local);
          float ring = smoothstep(0.045, 0.0, abs(dist - phase * 0.48)) * (1.0 - phase);
          diffuseColor.rgb += vec3(0.35, 0.45, 0.52) * ring * uRainIntensity * 0.75;
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 wViewDir = normalize(cameraPosition - vWaterWorldPos);
        vec3 wNormal = normalize(vWaterWorldNormal);
        float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(wViewDir, wNormal), 0.0), 4.0);
        // Atmospheric sky Fresnel bounce
        totalEmissiveRadiance += uHorizonColor * fresnel * 0.32;
        // Crisp solar specular glitter across micro-waves
        vec3 sunDirN = normalize(uSunDir);
        vec3 halfVec = normalize(sunDirN + wViewDir);
        float sparkle = pow(max(dot(wNormal, halfVec), 0.0), 140.0);
        totalEmissiveRadiance += uSunColor * sparkle * 0.95;`
      );
  };

  return mat;
}

/**
 * Adds natural GPU wind sway & sunlit leaf translucency to tree canopies and instanced grass.
 */
export function applyFoliageWindShader(
  mat: THREE.MeshStandardMaterial,
  swayAmplitude: number = 0.14,
  isGrassBlade: boolean = false
): THREE.MeshStandardMaterial {
  mat.customProgramCacheKey = () => `foliage_wind_${isGrassBlade ? 'grass' : 'tree'}_${swayAmplitude.toFixed(2)}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = RealismShaderGlobals.uTime;
    shader.uniforms.uWindStrength = RealismShaderGlobals.uWindStrength;
    shader.uniforms.uSunDir = RealismShaderGlobals.uSunDir;
    shader.uniforms.uSunColor = RealismShaderGlobals.uSunColor;
    shader.uniforms.uSwayAmp = { value: swayAmplitude };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uSwayAmp;
        varying vec3 vFoliageWorldPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 fBase = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fBase = instanceMatrix * fBase;
        #endif
        vec4 fWorld = modelMatrix * fBase;
        float hFactor = ${isGrassBlade ? 'clamp(uv.y, 0.0, 1.0)' : 'clamp(transformed.y * 0.35, 0.0, 1.5)'};
        float gust = sin(uTime * 1.45 + fWorld.x * 0.18 + fWorld.z * 0.14) * 0.65
                   + sin(uTime * 3.1 + fWorld.x * 0.7 - fWorld.z * 0.6) * 0.35;
        float flutter = sin(uTime * 5.2 + position.x * 4.0 + position.z * 4.0) * 0.18;
        float swayAmt = (gust + flutter) * uSwayAmp * uWindStrength * hFactor * hFactor;
        transformed.x += swayAmt;
        transformed.z += swayAmt * 0.65;
        vFoliageWorldPos = fWorld.xyz + vec3(swayAmt, 0.0, swayAmt * 0.65);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vFoliageWorldPos;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Subtle subsurface backlit sun glow through leaves & grass tips
        vec3 fViewDir = normalize(vFoliageWorldPos - cameraPosition);
        float sss = pow(clamp(dot(fViewDir, normalize(uSunDir)), 0.0, 1.0), 4.0);
        totalEmissiveRadiance += diffuseColor.rgb * uSunColor * sss * 0.28;`
      );
  };
  return mat;
}

/**
 * Photorealistic Post-Processing Lens & Atmospheric Scattering Pass:
 * - Volumetric radial solar shafts (god rays) when looking toward the sun
 * - Subtle optical vignette & micro-contrast grading
 * - Dynamic sprint / damage / underwater chromatic dispersion
 * - Anti-banding sky dither
 */
export const CinematicPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    uSunShaftIntensity: { value: 0.18 },
    uSunColor: { value: new THREE.Color(0xffdfa8) },
    uChromatic: { value: 0.0006 },
    uVignette: { value: 0.22 },
    uContrast: { value: 1.055 },
    uSaturation: { value: 1.07 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uSunScreenPos;
    uniform float uSunShaftIntensity;
    uniform vec3 uSunColor;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 toCenter = vUv - 0.5;
      float radialDist = length(toCenter);

      // Subtle edge-weighted optical chromatic dispersion
      vec2 caOffset = toCenter * radialDist * uChromatic;
      float r = texture2D(tDiffuse, vUv + caOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - caOffset).b;
      vec3 col = vec3(r, g, b);

      // Volumetric radial sun-shaft scattering (8 fast samples)
      if (uSunShaftIntensity > 0.005) {
        vec2 deltaUv = (vUv - uSunScreenPos) * (1.0 / 8.0) * 0.72;
        vec2 sampleUv = vUv;
        float decay = 1.0;
        vec3 godRay = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          sampleUv -= deltaUv;
          vec3 sCol = texture2D(tDiffuse, clamp(sampleUv, 0.002, 0.998)).rgb;
          float lum = dot(sCol, vec3(0.299, 0.587, 0.114));
          // Only bright sky/sun pixels cast atmospheric shafts
          float skyMask = smoothstep(0.72, 1.25, lum);
          godRay += sCol * skyMask * decay;
          decay *= 0.84;
        }
        col += godRay * uSunColor * (uSunShaftIntensity * 0.13);
      }

      // Micro-contrast & crisp color saturation
      col = (col - 0.5) * uContrast + 0.5;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Natural optical lens vignette
      float vig = smoothstep(0.95, 0.25, radialDist);
      col *= mix(1.0 - uVignette, 1.0, vig);

      // Ultra-subtle film dither eliminates sky/fog gradient banding
      float grain = fract(sin(dot(vUv * 800.0 + uTime * 7.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      col += grain * 0.008;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};
