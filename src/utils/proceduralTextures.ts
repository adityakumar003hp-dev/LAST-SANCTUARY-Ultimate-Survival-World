import * as THREE from 'three';

const textureCache: Record<string, THREE.CanvasTexture> = {};
const lazyUpgradedKeys = new Set<string>();
const lazyTaskQueue: Array<() => void> = [];
let lazyTimerId: number | null = null;
let textureGeneration = 0;
let configuredMaxDim = 256;
let configuredAnisotropy = 4;

export interface PBRTextureSet {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

export function configureProceduralTextureQuality(opts: { maxDim?: number; maxAnisotropy?: number }) {
  if (typeof opts.maxDim === 'number' && opts.maxDim >= 64) {
    configuredMaxDim = Math.min(512, Math.max(64, Math.floor(opts.maxDim)));
  }
  if (typeof opts.maxAnisotropy === 'number' && opts.maxAnisotropy >= 1) {
    configuredAnisotropy = Math.min(16, Math.max(1, Math.floor(opts.maxAnisotropy)));
    for (const tex of Object.values(textureCache)) {
      if (tex && tex.anisotropy !== configuredAnisotropy) {
        tex.anisotropy = configuredAnisotropy;
        tex.needsUpdate = true;
      }
    }
  }
}

export function getProceduralTextureStats(): { cachedTextures: number; pendingLazyUpgrades: number; maxDim: number } {
  return {
    cachedTextures: Object.keys(textureCache).length,
    pendingLazyUpgrades: lazyTaskQueue.length,
    maxDim: configuredMaxDim,
  };
}

export function disposeProceduralTextures() {
  textureGeneration++;
  lazyTaskQueue.length = 0;
  lazyUpgradedKeys.clear();
  if (lazyTimerId !== null) {
    window.clearTimeout(lazyTimerId);
    lazyTimerId = null;
  }
  for (const key of Object.keys(textureCache)) {
    const tex = textureCache[key];
    if (tex) {
      const bmp = tex.userData?.__compressedBitmap as ImageBitmap | undefined;
      if (bmp && typeof bmp.close === 'function') {
        try {
          bmp.close();
        } catch {}
      }
      tex.dispose();
    }
    delete textureCache[key];
  }
}

function getTargetTexSize(requested: number): number {
  return Math.max(64, Math.min(requested, configuredMaxDim));
}

function getInitialTexSize(requested: number): number {
  return Math.max(64, Math.min(requested, configuredMaxDim, 128));
}

function pumpLazyQueue() {
  lazyTimerId = null;
  if (lazyTaskQueue.length === 0) return;
  const task = lazyTaskQueue.shift();
  if (task) {
    try {
      task();
    } catch {}
  }
  if (lazyTaskQueue.length > 0) {
    scheduleLazyPump();
  }
}

function scheduleLazyPump() {
  if (lazyTimerId !== null) return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === 'function') {
    lazyTimerId = window.setTimeout(() => {
      ric(() => pumpLazyQueue(), { timeout: 200 });
    }, 35);
  } else {
    lazyTimerId = window.setTimeout(pumpLazyQueue, 45);
  }
}

function enqueueLazyPBRUpgrade(
  key: string,
  initialSize: number,
  requestedMaxSize: number,
  upgradeFn: (targetSize: number) => void
) {
  const targetSize = getTargetTexSize(requestedMaxSize);
  if (targetSize <= initialSize || lazyUpgradedKeys.has(key)) return;
  lazyUpgradedKeys.add(key);
  const gen = textureGeneration;
  lazyTaskQueue.push(() => {
    if (gen !== textureGeneration) return;
    const latestTarget = getTargetTexSize(requestedMaxSize);
    if (latestTarget > initialSize && textureCache[key + '_a']) {
      upgradeFn(latestTarget);
    }
  });
  scheduleLazyPump();
}

function compressCanvasToTextureAsync(canvas: HTMLCanvasElement, texture: THREE.CanvasTexture, isColor: boolean, gen: number) {
  if (typeof canvas.toBlob !== 'function' || typeof createImageBitmap !== 'function') return;
  const mime = isColor ? 'image/webp' : 'image/png';
  const quality = isColor ? 0.85 : 0.92;
  try {
    canvas.toBlob(
      (blob) => {
        if (!blob || gen !== textureGeneration) {
          canvas.width = 0;
          canvas.height = 0;
          return;
        }
        createImageBitmap(blob)
          .then((bitmap) => {
            if (gen !== textureGeneration) {
              bitmap.close?.();
              return;
            }
            const prevBmp = texture.userData?.__compressedBitmap as ImageBitmap | undefined;
            texture.userData.__compressedBitmap = bitmap;
            texture.image = bitmap as unknown as HTMLCanvasElement;
            texture.needsUpdate = true;
            if (prevBmp && prevBmp !== bitmap && typeof prevBmp.close === 'function') {
              try {
                prevBmp.close();
              } catch {}
            }
            canvas.width = 0;
            canvas.height = 0;
          })
          .catch(() => {
            canvas.width = 0;
            canvas.height = 0;
          });
      },
      mime,
      quality
    );
  } catch {}
}

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Tileable periodic value noise on a toroidal integer grid of period `period`
 */
function tileNoise(u: number, v: number, period: number, seed: number): number {
  const gx = ((u % 1) + 1) % 1 * period;
  const gy = ((v % 1) + 1) % 1 * period;
  const x0 = Math.floor(gx) % period;
  const y0 = Math.floor(gy) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const fx = gx - Math.floor(gx);
  const fy = gy - Math.floor(gy);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function tileFBM(u: number, v: number, basePeriod: number, octaves: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let norm = 0;
  let p = basePeriod;
  for (let o = 0; o < octaves; o++) {
    val += amp * tileNoise(u, v, p, seed + o * 17.3);
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return val / norm;
}

function drawIntoCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, data: ImageData | null) => void,
  pixelMode: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  if (pixelMode) {
    const img = ctx.createImageData(width, height);
    draw(ctx, width, height, img);
    ctx.putImageData(img, 0, 0);
  } else {
    draw(ctx, width, height, null);
  }
  return canvas;
}

function makeCanvasTexture(
  width: number,
  height: number,
  isColor: boolean,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, data: ImageData | null) => void,
  pixelMode = false
): THREE.CanvasTexture {
  const canvas = drawIntoCanvas(width, height, draw, pixelMode);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = configuredAnisotropy;
  texture.needsUpdate = true;
  compressCanvasToTextureAsync(canvas, texture, isColor, textureGeneration);
  return texture;
}

function refreshExistingTexture(
  texture: THREE.CanvasTexture,
  width: number,
  height: number,
  isColor: boolean,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, data: ImageData | null) => void,
  pixelMode = false
) {
  const canvas = drawIntoCanvas(width, height, draw, pixelMode);
  texture.image = canvas;
  texture.needsUpdate = true;
  compressCanvasToTextureAsync(canvas, texture, isColor, textureGeneration);
}

/**
 * Generates an accurate seamlessly tiled Tangent-Space Normal Map via a 3x3 Sobel operator on a float heightfield.
 */
function drawSobelNormals(heights: Float32Array, w: number, strength: number, img: ImageData | null) {
  if (!img) return;
  const d = img.data;
  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % w) + w) % w;
    return heights[wy * w + wx];
  };

  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const invLen = 1.0 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      d[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
}

function heightFieldToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number
): THREE.CanvasTexture {
  return makeCanvasTexture(
    size,
    size,
    false,
    (_ctx, w, _h, img) => drawSobelNormals(heights, w, strength, img),
    true
  );
}

function drawRoughnessField(roughValues: Float32Array, w: number, img: ImageData | null) {
  if (!img) return;
  const d = img.data;
  for (let i = 0; i < w * w; i++) {
    const v = Math.max(0, Math.min(255, Math.round(roughValues[i] * 255)));
    const idx = i * 4;
    d[idx] = v;
    d[idx + 1] = v;
    d[idx + 2] = v;
    d[idx + 3] = 255;
  }
}

function heightFieldToRoughnessTexture(
  roughValues: Float32Array,
  size: number
): THREE.CanvasTexture {
  return makeCanvasTexture(
    size,
    size,
    false,
    (_ctx, w, _h, img) => drawRoughnessField(roughValues, w, img),
    true
  );
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

// ============================================================================
// 1. TERRAIN & GRASS PBR (With Real Soil Grit, Clumps, Sobel Normal)
// ============================================================================

export function getTerrainPBR(): PBRTextureSet {
  const key = 'terrain_pbr_v3_512';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const buildTerrainFields = (size: number, heights: Float32Array, roughs: Float32Array, img: ImageData | null) => {
    if (!img) return;
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const macro = tileFBM(u, v, 5, 4, 11);
        const micro = tileFBM(u, v, 28, 3, 29);
        const blade = tileNoise(u * 1.4, v * 0.6, 64, 41);
        const grit = hash2D(x, y, 53);
        const hVal = macro * 0.46 + micro * 0.32 + blade * 0.14 + grit * 0.08;
        heights[y * size + x] = hVal;

        const mossMix = Math.max(0, Math.min(1, (macro - 0.34) * 2.45));
        const aoCrevice = 0.84 + hVal * 0.24;
        const soilR = (58 + micro * 28 + grit * 11) * aoCrevice;
        const soilG = (48 + micro * 22 + grit * 8) * aoCrevice;
        const soilB = (32 + micro * 16 + grit * 6) * aoCrevice;

        const grassR = (48 + micro * 34 + blade * 16 + grit * 10) * aoCrevice;
        const grassG = (82 + micro * 48 + blade * 20 + grit * 12) * aoCrevice;
        const grassB = (34 + micro * 22 + blade * 10 + grit * 6) * aoCrevice;

        const idx = (y * size + x) * 4;
        d[idx] = clampByte(soilR + (grassR - soilR) * mossMix);
        d[idx + 1] = clampByte(soilG + (grassG - soilG) * mossMix);
        d[idx + 2] = clampByte(soilB + (grassB - soilB) * mossMix);
        d[idx + 3] = 255;

        roughs[y * size + x] = 0.74 + (1.0 - mossMix) * 0.18 - grit * 0.06;
      }
    }
  };

  const initSize = getInitialTexSize(512);
  const heights = new Float32Array(initSize * initSize);
  const roughs = new Float32Array(initSize * initSize);
  const albedo = makeCanvasTexture(initSize, initSize, true, (_ctx, w, _h, img) => buildTerrainFields(w, heights, roughs, img), true);
  const normal = heightFieldToNormalTexture(heights, initSize, 2.8);
  const roughness = heightFieldToRoughnessTexture(roughs, initSize);

  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;

  enqueueLazyPBRUpgrade(key, initSize, 512, (hiSize) => {
    const hiH = new Float32Array(hiSize * hiSize);
    const hiR = new Float32Array(hiSize * hiSize);
    refreshExistingTexture(albedo, hiSize, hiSize, true, (_c, w, _h, img) => buildTerrainFields(w, hiH, hiR, img), true);
    refreshExistingTexture(normal, hiSize, hiSize, false, (_c, w, _h, img) => drawSobelNormals(hiH, w, 2.8, img), true);
    refreshExistingTexture(roughness, hiSize, hiSize, false, (_c, w, _h, img) => drawRoughnessField(hiR, w, img), true);
  });

  return { albedo, normal, roughness };
}

export function getTerrainTexture(): THREE.CanvasTexture {
  return getTerrainPBR().albedo;
}

export function getGrassPBR(groundColor: number = 0x3d7036): PBRTextureSet {
  const key = `grass_v3_512_${groundColor}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const [br, bg, bb] = hexToRgb(groundColor);
  const buildGrassFields = (size: number, heights: Float32Array, roughs: Float32Array, img: ImageData | null) => {
    if (!img) return;
    const d = img.data;
    const mixR = br * 0.35 + 165 * 0.65;
    const mixG = bg * 0.35 + 165 * 0.65;
    const mixB = bb * 0.35 + 165 * 0.65;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const macro = tileFBM(u, v, 5, 4, 71);
        const fine = tileFBM(u, v, 32, 3, 97);
        const blade = tileNoise(u * 1.5, v * 0.55, 64, 113);
        const speckle = hash2D(x, y, 131);
        const hVal = macro * 0.40 + fine * 0.34 + blade * 0.16 + speckle * 0.10;
        heights[y * size + x] = hVal;

        const shade = 0.74 + hVal * 0.52;
        const idx = (y * size + x) * 4;
        d[idx] = clampByte(mixR * shade);
        d[idx + 1] = clampByte(mixG * shade);
        d[idx + 2] = clampByte(mixB * shade);
        d[idx + 3] = 255;

        roughs[y * size + x] = 0.74 + (1.0 - fine) * 0.22;
      }
    }
  };

  const initSize = getInitialTexSize(512);
  const heights = new Float32Array(initSize * initSize);
  const roughs = new Float32Array(initSize * initSize);
  const albedo = makeCanvasTexture(initSize, initSize, true, (_ctx, w, _h, img) => buildGrassFields(w, heights, roughs, img), true);
  const normal = heightFieldToNormalTexture(heights, initSize, 3.0);
  const roughness = heightFieldToRoughnessTexture(roughs, initSize);

  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;

  enqueueLazyPBRUpgrade(key, initSize, 512, (hiSize) => {
    const hiH = new Float32Array(hiSize * hiSize);
    const hiR = new Float32Array(hiSize * hiSize);
    refreshExistingTexture(albedo, hiSize, hiSize, true, (_c, w, _h, img) => buildGrassFields(w, hiH, hiR, img), true);
    refreshExistingTexture(normal, hiSize, hiSize, false, (_c, w, _h, img) => drawSobelNormals(hiH, w, 3.0, img), true);
    refreshExistingTexture(roughness, hiSize, hiSize, false, (_c, w, _h, img) => drawRoughnessField(hiR, w, img), true);
  });

  return { albedo, normal, roughness };
}

export function getGrassTuftAlphaTexture(): THREE.CanvasTexture {
  const key = 'grass_tuft_alpha_v2';
  if (textureCache[key]) return textureCache[key];
  const size = getTargetTexSize(256);
  const tex = makeCanvasTexture(size, size, true, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const scale = w / 256;
    // Draw 16 organic overlapping curved grass blades with warm sunlit tips & root shadow AO
    for (let i = 0; i < 16; i++) {
      const bx = (i / 15) * (w * 0.80) + w * 0.10 + (hash2D(i, 1, 7) - 0.5) * 12 * scale;
      const bh = h * (0.48 + hash2D(i, 2, 7) * 0.48);
      const lean = (hash2D(i, 3, 7) - 0.5) * 68 * scale;
      const bw = (9 + hash2D(i, 4, 7) * 7) * scale;
      const grad = ctx.createLinearGradient(bx, h, bx + lean, h - bh);
      grad.addColorStop(0, '#364f21');
      grad.addColorStop(0.35, '#598236');
      grad.addColorStop(0.75, '#86b54f');
      grad.addColorStop(1, '#b6dc75');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.5, h);
      ctx.quadraticCurveTo(bx + lean * 0.35 - bw * 0.22, h - bh * 0.55, bx + lean, h - bh);
      ctx.quadraticCurveTo(bx + lean * 0.4 + bw * 0.24, h - bh * 0.52, bx + bw * 0.5, h);
      ctx.closePath();
      ctx.fill();
    }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache[key] = tex;
  return tex;
}

export function getFoliageTexture(tintHex = 0x264d24): THREE.CanvasTexture {
  const key = `foliage_leaf_v2_${tintHex}`;
  if (textureCache[key]) return textureCache[key];
  const [r, g, b] = hexToRgb(tintHex);
  const size = getTargetTexSize(256);
  const tex = makeCanvasTexture(size, size, true, (ctx, w, h) => {
    const scale = w / 256;
    ctx.fillStyle = `rgb(${Math.round(r * 0.58)}, ${Math.round(g * 0.58)}, ${Math.round(b * 0.58)})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const lx = hash2D(i, 1, 91) * w;
      const ly = hash2D(i, 2, 91) * h;
      const ang = hash2D(i, 3, 91) * Math.PI * 2;
      const rx = (5 + hash2D(i, 4, 91) * 9) * scale;
      const ry = (2.4 + hash2D(i, 5, 91) * 4.5) * scale;
      const shade = 0.68 + hash2D(i, 6, 91) * 0.68;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.fillStyle = `rgb(${clampByte(r * shade)}, ${clampByte(g * shade)}, ${clampByte(b * shade)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  textureCache[key] = tex;
  return tex;
}

// ============================================================================
// 2. ARCHITECTURAL & MATERIAL PBR SETS (Wood, Brick, Concrete, Asphalt, Marble, Sandstone, Stone, Metal)
// ============================================================================

export function getWoodPBR(): PBRTextureSet {
  const key = 'wood_pbr_v3_512';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const buildWoodFields = (size: number, heights: Float32Array, roughs: Float32Array, img: ImageData | null) => {
    if (!img) return;
    const d = img.data;
    const planks = 6;
    const plankH = size / planks;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      const plankIdx = Math.floor(y / plankH);
      const plankLocal = (y % plankH) / plankH;
      const seamDist = Math.min(plankLocal, 1 - plankLocal) * plankH;
      const isSeam = seamDist < Math.max(1.2, size / 196);

      for (let x = 0; x < size; x++) {
        const u = x / size;
        const grain = Math.sin(
          (v * 34 + tileFBM(u * 0.5, v * 4, 4, 3, 21 + plankIdx * 5) * 4.8) * Math.PI
        ) * 0.5 + 0.5;
        const fibers = tileNoise(u, v * 0.25, 48, 33 + plankIdx);
        const plankTint = 0.86 + hash2D(plankIdx, 1, 7) * 0.24;

        let hVal = grain * 0.45 + fibers * 0.4 + 0.15;
        if (isSeam) hVal *= 0.15;
        heights[y * size + x] = hVal;

        const lum = isSeam ? 0.28 : (0.72 + grain * 0.24 + fibers * 0.12) * plankTint;
        const idx = (y * size + x) * 4;
        d[idx] = clampByte(118 * lum);
        d[idx + 1] = clampByte(82 * lum);
        d[idx + 2] = clampByte(49 * lum);
        d[idx + 3] = 255;

        roughs[y * size + x] = isSeam ? 0.96 : 0.65 + (1 - grain) * 0.24;
      }
    }
  };

  const initSize = getInitialTexSize(512);
  const heights = new Float32Array(initSize * initSize);
  const roughs = new Float32Array(initSize * initSize);
  const albedo = makeCanvasTexture(initSize, initSize, true, (_c, w, _h, img) => buildWoodFields(w, heights, roughs, img), true);
  const normal = heightFieldToNormalTexture(heights, initSize, 3.2);
  const roughness = heightFieldToRoughnessTexture(roughs, initSize);

  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;

  enqueueLazyPBRUpgrade(key, initSize, 512, (hiSize) => {
    const hiH = new Float32Array(hiSize * hiSize);
    const hiR = new Float32Array(hiSize * hiSize);
    refreshExistingTexture(albedo, hiSize, hiSize, true, (_c, w, _h, img) => buildWoodFields(w, hiH, hiR, img), true);
    refreshExistingTexture(normal, hiSize, hiSize, false, (_c, w, _h, img) => drawSobelNormals(hiH, w, 3.2, img), true);
    refreshExistingTexture(roughness, hiSize, hiSize, false, (_c, w, _h, img) => drawRoughnessField(hiR, w, img), true);
  });

  return { albedo, normal, roughness };
}

export function getWoodPlankTexture(): THREE.CanvasTexture {
  return getWoodPBR().albedo;
}

export function getStonePBR(): PBRTextureSet {
  const key = 'stone_pbr_v3_512';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const buildStoneFields = (size: number, heights: Float32Array, roughs: Float32Array, img: ImageData | null) => {
    if (!img) return;
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const broad = tileFBM(u, v, 6, 4, 101);
        const fine = tileFBM(u, v, 28, 3, 109);
        const grain = hash2D(x, y, 113);
        const crack = Math.abs(tileFBM(u, v, 5, 3, 127) - 0.5);
        const isCrack = crack < 0.022;
        let hVal = broad * 0.55 + fine * 0.35 + grain * 0.1;
        if (isCrack) hVal *= 0.22;
        heights[y * size + x] = hVal;

        const base = isCrack ? 48 : 94 + hVal * 64;
        const idx = (y * size + x) * 4;
        d[idx] = clampByte(base * 1.01);
        d[idx + 1] = clampByte(base * 1.0);
        d[idx + 2] = clampByte(base * 1.03);
        d[idx + 3] = 255;

        roughs[y * size + x] = isCrack ? 0.96 : 0.70 + (1 - hVal) * 0.24;
      }
    }
  };

  const initSize = getInitialTexSize(512);
  const heights = new Float32Array(initSize * initSize);
  const roughs = new Float32Array(initSize * initSize);
  const albedo = makeCanvasTexture(initSize, initSize, true, (_c, w, _h, img) => buildStoneFields(w, heights, roughs, img), true);
  const normal = heightFieldToNormalTexture(heights, initSize, 3.4);
  const roughness = heightFieldToRoughnessTexture(roughs, initSize);

  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;

  enqueueLazyPBRUpgrade(key, initSize, 512, (hiSize) => {
    const hiH = new Float32Array(hiSize * hiSize);
    const hiR = new Float32Array(hiSize * hiSize);
    refreshExistingTexture(albedo, hiSize, hiSize, true, (_c, w, _h, img) => buildStoneFields(w, hiH, hiR, img), true);
    refreshExistingTexture(normal, hiSize, hiSize, false, (_c, w, _h, img) => drawSobelNormals(hiH, w, 3.4, img), true);
    refreshExistingTexture(roughness, hiSize, hiSize, false, (_c, w, _h, img) => drawRoughnessField(hiR, w, img), true);
  });

  return { albedo, normal, roughness };
}

export function getStoneTexture(): THREE.CanvasTexture {
  return getStonePBR().albedo;
}

export function getMetalPBR(): PBRTextureSet {
  const key = 'metal_scrap_pbr_v2';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        const v = y / w;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const brush = tileFBM(u * 0.5, v * 4.0, 12, 3, 211);
          const rustMask = tileFBM(u, v, 5, 4, 223);
          const isRust = rustMask > 0.62;
          const rustAmt = isRust ? Math.min(1, (rustMask - 0.62) * 4.0) : 0;

          const hVal = brush * 0.4 + 0.5 - rustAmt * 0.25;
          heights[y * w + x] = hVal;

          const steelR = 88 + brush * 46;
          const steelG = 94 + brush * 48;
          const steelB = 102 + brush * 50;
          const rustR = 132 + brush * 26;
          const rustG = 66 + brush * 18;
          const rustB = 34 + brush * 12;

          const idx = (y * w + x) * 4;
          d[idx] = clampByte(steelR + (rustR - steelR) * rustAmt);
          d[idx + 1] = clampByte(steelG + (rustG - steelG) * rustAmt);
          d[idx + 2] = clampByte(steelB + (rustB - steelB) * rustAmt);
          d[idx + 3] = 255;

          roughs[y * w + x] = 0.34 + rustAmt * 0.58 + (1 - brush) * 0.14;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 2.2);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getMetalScrapTexture(): THREE.CanvasTexture {
  return getMetalPBR().albedo;
}

export function getBrushedMetalPBR(baseHex = 0x7a8594): PBRTextureSet {
  const key = `brushed_metal_${baseHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        const v = y / w;
        const streak = tileNoise(0.25, v, 64, 307);
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const micro = tileNoise(u, v * 3, 16, 311);
          const hVal = streak * 0.65 + micro * 0.35;
          heights[y * w + x] = hVal;
          const shade = 0.85 + hVal * 0.26;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.22 + (1 - hVal) * 0.16;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 1.4);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getBrickPBR(brickHex = 0x8a4234): PBRTextureSet {
  const key = `brick_v2_${brickHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(brickHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const rows = 8;
      const cols = 4;
      const rowH = w / rows;
      const colW = w / cols;
      const mortarW = Math.max(1.1, w / 116);
      for (let y = 0; y < w; y++) {
        const rIdx = Math.floor(y / rowH);
        const ry = y % rowH;
        const stagger = (rIdx % 2) * (colW * 0.5);
        for (let x = 0; x < w; x++) {
          const sx = (x + stagger) % w;
          const cIdx = Math.floor(sx / colW);
          const rx = sx % colW;
          const isMortar = ry < mortarW || rx < mortarW;
          const fine = tileFBM(x / w, y / w, 16, 3, 401);
          const brickTone = 0.84 + hash2D(cIdx, rIdx, 409) * 0.3;

          if (isMortar) {
            heights[y * w + x] = 0.18 + fine * 0.08;
            const m = 158 + fine * 28;
            const idx = (y * w + x) * 4;
            d[idx] = clampByte(m);
            d[idx + 1] = clampByte(m - 4);
            d[idx + 2] = clampByte(m - 10);
            d[idx + 3] = 255;
            roughs[y * w + x] = 0.94;
          } else {
            heights[y * w + x] = 0.65 + fine * 0.35;
            const shade = brickTone * (0.86 + fine * 0.24);
            const idx = (y * w + x) * 4;
            d[idx] = clampByte(br * shade);
            d[idx + 1] = clampByte(bg * shade);
            d[idx + 2] = clampByte(bb * shade);
            d[idx + 3] = 255;
            roughs[y * w + x] = 0.8 + (1 - fine) * 0.14;
          }
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 3.2);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getConcretePBR(baseHex = 0xc5ccd4): PBRTextureSet {
  const key = `concrete_v2_${baseHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const seamStep = Math.max(32, w >> 1);
      for (let y = 0; y < w; y++) {
        const seamY = y % seamStep < 2;
        for (let x = 0; x < w; x++) {
          const seamX = x % seamStep < 2;
          const fine = tileFBM(x / w, y / w, 12, 4, 503);
          const pore = hash2D(x, y, 509);
          let hVal = fine * 0.75 + pore * 0.25;
          if (seamX || seamY) hVal *= 0.35;
          heights[y * w + x] = hVal;

          const shade = seamX || seamY ? 0.72 : 0.88 + hVal * 0.2;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.72 + (1 - fine) * 0.22;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 1.8);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getAsphaltPBR(): PBRTextureSet {
  const key = 'asphalt_pbr_v2';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const grit = hash2D(x, y, 601);
          const wear = tileFBM(x / w, y / w, 6, 3, 607);
          const hVal = grit * 0.65 + wear * 0.35;
          heights[y * w + x] = hVal;

          const base = 34 + grit * 26 + wear * 12;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(base);
          d[idx + 1] = clampByte(base + 1);
          d[idx + 2] = clampByte(base + 4);
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.72 + grit * 0.22;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 2.5);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getSandstonePBR(baseHex = 0x9e382b): PBRTextureSet {
  const key = `sandstone_v2_${baseHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const rowUnit = w / 6;
      const colUnit = w / 3;
      for (let y = 0; y < w; y++) {
        const blockY = Math.floor(y / rowUnit);
        const isHJoint = y % Math.max(8, Math.round(rowUnit)) < 1.8;
        for (let x = 0; x < w; x++) {
          const offset = (blockY % 2) * Math.round(colUnit * 0.5);
          const sx = (x + offset) % w;
          const blockX = Math.floor(sx / colUnit);
          const isVJoint = sx % Math.max(12, Math.round(colUnit)) < 1.8;
          const strata = Math.sin((y / w) * 64.0 + tileFBM(x / w, y / w, 6, 3, 701) * 3.0) * 0.5 + 0.5;
          const grit = hash2D(x, y, 709);
          const blockShade = 0.91 + hash2D(blockX, blockY, 719) * 0.16;

          const joint = isHJoint || isVJoint;
          const hVal = joint ? 0.22 : 0.6 + strata * 0.25 + grit * 0.15;
          heights[y * w + x] = hVal;

          const shade = joint ? 0.65 : blockShade * (0.86 + strata * 0.16 + grit * 0.08);
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = joint ? 0.92 : 0.72 + (1 - strata) * 0.16;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 2.3);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getMarbleTilePBR(baseHex = 0xe8edf2): PBRTextureSet {
  const key = `marble_tile_${baseHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const tileStep = Math.max(16, w >> 2);
      for (let y = 0; y < w; y++) {
        const groutY = y % tileStep < 2;
        for (let x = 0; x < w; x++) {
          const groutX = x % tileStep < 2;
          const vein = Math.abs(tileFBM(x / w, y / w, 4, 4, 809) - 0.5) < 0.03 ? 0.85 : 1.0;
          const crystal = tileNoise(x / w, y / w, 16, 811);
          const grout = groutX || groutY;
          heights[y * w + x] = grout ? 0.2 : 0.92 + crystal * 0.08;

          const shade = grout ? 0.62 : vein * (0.93 + crystal * 0.1);
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = grout ? 0.85 : 0.22 + (1 - crystal) * 0.12;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 1.5);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getHazardStripeTexture(): THREE.CanvasTexture {
  if (textureCache['hazard']) return textureCache['hazard'];
  textureCache['hazard'] = makeCanvasTexture(128, 128, true, (ctx, w, h) => {
    ctx.fillStyle = '#e6ad12';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1b18';
    const stripeWidth = 24;
    for (let x = -w; x < w * 2; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + h, h);
      ctx.lineTo(x + h, h);
      ctx.closePath();
      ctx.fill();
    }
  });
  return textureCache['hazard'];
}

// ============================================================================
// 3. HUMAN SKIN, FABRIC & ZOMBIE FLESH PBR
// ============================================================================

export function getSkinPBR(skinHex: number = 0xdeb887): PBRTextureSet {
  const key = `skin_pbr_${skinHex}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(128);
  const [br, bg, bb] = hexToRgb(skinHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const pore = hash2D(x, y, 907);
          const warmth = tileFBM(x / w, y / w, 6, 3, 911);
          heights[y * w + x] = 0.5 + pore * 0.25 + warmth * 0.25;
          const idx = (y * w + x) * 4;
          const mod = 0.94 + warmth * 0.1 + pore * 0.04;
          d[idx] = clampByte(br * mod + 4);
          d[idx + 1] = clampByte(bg * (mod - 0.01));
          d[idx + 2] = clampByte(bb * (mod - 0.02));
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.52 + (1 - warmth) * 0.14;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 0.55);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getFabricPBR(
  clothHex: number,
  style: 'tactical' | 'denim' | 'wool' | 'leather' | 'uniform' = 'tactical'
): PBRTextureSet {
  const key = `fabric_${clothHex}_${style}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(128);
  const [br, bg, bb] = hexToRgb(clothHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          let weave = 0.5;
          if (style === 'tactical') {
            const warp = ((x % 4 === 0) ? 0.35 : 0) + ((y % 4 === 0) ? 0.35 : 0);
            const ripstop = (x % 16 === 0 || y % 16 === 0) ? 0.3 : 0;
            weave = warp * 0.6 + ripstop * 0.4 + 0.3;
          } else if (style === 'denim') {
            const twill = Math.sin((x + y) * 1.1) * 0.3 + 0.5;
            weave = twill * 0.7 + hash2D(x, y, 953) * 0.3;
          } else if (style === 'leather') {
            weave = tileFBM(x / w, y / w, 14, 3, 967);
          } else {
            weave = (Math.sin(x * 1.5) * Math.cos(y * 1.5)) * 0.22 + 0.6 + hash2D(x, y, 971) * 0.15;
          }

          heights[y * w + x] = weave;
          const shade = 0.86 + weave * 0.24;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;

          roughs[y * w + x] =
            style === 'leather'
              ? 0.42 + (1 - weave) * 0.2
              : style === 'uniform'
                ? 0.65 + (1 - weave) * 0.16
                : 0.78 + (1 - weave) * 0.16;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, style === 'leather' ? 1.4 : 1.1);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getZombieFleshPBR(isBrute = false): PBRTextureSet {
  const prefix = isBrute ? 'zombie_brute_v2' : 'zombie_normal_v2';
  if (textureCache[prefix + '_a']) {
    return {
      albedo: textureCache[prefix + '_a'],
      normal: textureCache[prefix + '_n'],
      roughness: textureCache[prefix + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const baseR = isBrute ? 74 : 96;
      const baseG = isBrute ? 82 : 110;
      const baseB = isBrute ? 68 : 88;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const rot = tileFBM(x / w, y / w, 6, 4, 1009);
          const vein = Math.abs(tileFBM(x / w, y / w, 10, 3, 1013) - 0.5);
          const isWound = rot > 0.66;
          const isVein = vein < 0.032;
          let hVal = 0.55 + tileFBM(x / w, y / w, 16, 3, 1019) * 0.35;
          if (isWound) hVal *= 0.45;
          heights[y * w + x] = hVal;

          let r = baseR * (0.85 + rot * 0.3);
          let g = baseG * (0.85 + rot * 0.3);
          let b = baseB * (0.85 + rot * 0.3);
          if (isWound) {
            r = 108;
            g = 26;
            b = 28;
          } else if (isVein) {
            r *= 0.62;
            g *= 0.72;
            b *= 0.75;
          }
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(r);
          d[idx + 1] = clampByte(g);
          d[idx + 2] = clampByte(b);
          d[idx + 3] = 255;

          roughs[y * w + x] = isWound ? 0.32 : 0.72;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 2.2);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[prefix + '_a'] = albedo;
  textureCache[prefix + '_n'] = normal;
  textureCache[prefix + '_r'] = roughness;
  return { albedo, normal, roughness };
}

// ============================================================================
// 4. NATURE: WATER RIPPLE NORMAL MAP, BARK, ROCK, WILDLIFE FUR/SCALES
// ============================================================================

export function getWaterRippleNormalMap(_time = 0): THREE.CanvasTexture {
  const key = 'water_ripple_v2';
  if (textureCache[key]) return textureCache[key];

  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Seamless multi-wave Gerstner ripple interference + micro capillary chop
      const w1 = Math.sin((u * 4 + v * 2) * Math.PI * 2);
      const w2 = Math.cos((u * 3 - v * 5) * Math.PI * 2) * 0.6;
      const w3 = tileFBM(u, v, 8, 3, 1103) * 1.4;
      heights[y * size + x] = (w1 + w2) * 0.25 + w3 * 0.5;
    }
  }
  const normal = heightFieldToNormalTexture(heights, size, 2.2);
  textureCache[key] = normal;
  return normal;
}

export function getBarkPBR(): PBRTextureSet {
  const key = 'nature_bark_pbr_v2';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        const v = y / w;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const ridge = tileFBM(u * 2.5, v * 0.35, 16, 4, 1201);
          const furrow = Math.sin(u * Math.PI * 2 * 14 + ridge * 5.0) * 0.5 + 0.5;
          const moss = tileFBM(u, v, 5, 3, 1213);
          const isMoss = moss > 0.68;
          const hVal = furrow * 0.65 + ridge * 0.35;
          heights[y * w + x] = hVal;

          let r = 54 + hVal * 52;
          let g = 38 + hVal * 38;
          let b = 26 + hVal * 26;
          if (isMoss) {
            r = r * 0.55 + 32;
            g = g * 0.55 + 62;
            b = b * 0.55 + 22;
          }
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(r);
          d[idx + 1] = clampByte(g);
          d[idx + 2] = clampByte(b);
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.88 + (1 - hVal) * 0.1;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 3.6);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getRockPBR(): PBRTextureSet {
  const key = 'granite_rock_pbr_v2';
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const macro = tileFBM(x / w, y / w, 5, 4, 1301);
          const mica = hash2D(x, y, 1307);
          const lichen = tileFBM(x / w, y / w, 6, 3, 1319) > 0.7;
          const hVal = macro * 0.72 + mica * 0.28;
          heights[y * w + x] = hVal;

          let r = 84 + hVal * 62;
          let g = 88 + hVal * 62;
          let b = 92 + hVal * 64;
          if (lichen) {
            r = r * 0.65 + 26;
            g = g * 0.65 + 48;
            b = b * 0.65 + 22;
          }
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(r);
          d[idx + 1] = clampByte(g);
          d[idx + 2] = clampByte(b);
          d[idx + 3] = 255;
          roughs[y * w + x] = mica > 0.92 ? 0.35 : 0.8 + (1 - macro) * 0.16;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 3.4);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getDinosaurSkinPBR(speciesId: string, baseHex: number): PBRTextureSet {
  const key = `dino_v2_${speciesId}_${baseHex.toString(16)}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(256);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const cell = Math.max(7, Math.round((w / 256) * 14));
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const cx = Math.floor(x / cell);
          const cy = Math.floor(y / cell);
          const jx = (hash2D(cx, cy, 1409) - 0.5) * 0.35;
          const jy = (hash2D(cx, cy, 1423) - 0.5) * 0.35;
          const lx = (x % cell) / cell - 0.5 + jx;
          const ly = (y % cell) / cell - 0.5 + jy;
          const dist = Math.hypot(lx, ly) * 2.0;
          const scaleBump = Math.max(0, 1.0 - dist * dist);

          const stripe = Math.sin(y * 0.11 + tileFBM(x / w, y / w, 4, 3, 1427) * 5.0) * 0.5 + 0.5;
          const hVal = scaleBump * 0.75 + tileFBM(x / w, y / w, 8, 3, 1433) * 0.25;
          heights[y * w + x] = hVal;

          const shade = (0.68 + scaleBump * 0.36) * (0.76 + stripe * 0.32);
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = 0.48 + (1 - scaleBump) * 0.36;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, 2.8);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

export function getFurPBR(
  baseHex: number,
  pattern: 'solid' | 'striped' | 'spotted' | 'wool' | 'feather' = 'solid'
): PBRTextureSet {
  const key = `fur_v1_${baseHex.toString(16)}_${pattern}`;
  if (textureCache[key + '_a']) {
    return {
      albedo: textureCache[key + '_a'],
      normal: textureCache[key + '_n'],
      roughness: textureCache[key + '_r'],
    };
  }
  const size = getTargetTexSize(128);
  const [br, bg, bb] = hexToRgb(baseHex);
  const heights = new Float32Array(size * size);
  const roughs = new Float32Array(size * size);

  const albedo = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const v = y / w;
          const strand =
            pattern === 'wool'
              ? tileFBM(u, v, 16, 3, 1511)
              : tileNoise(u * 2.5, v * 0.4, 32, 1523) * 0.7 + tileFBM(u, v, 8, 2, 1531) * 0.3;

          let patMod = 1.0;
          if (pattern === 'striped') {
            const band = Math.sin(u * Math.PI * 10 + tileFBM(u, v, 4, 2, 1543) * 3.0);
            if (band > 0.35) patMod = 0.25;
          } else if (pattern === 'spotted') {
            const sNoise = tileFBM(u, v, 8, 2, 1549);
            if (sNoise > 0.64) patMod = 0.22;
          }

          heights[y * w + x] = strand;
          const shade = (0.78 + strand * 0.35) * patMod;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(br * shade);
          d[idx + 1] = clampByte(bg * shade);
          d[idx + 2] = clampByte(bb * shade);
          d[idx + 3] = 255;
          roughs[y * w + x] = pattern === 'feather' ? 0.62 + (1 - strand) * 0.2 : 0.84 + (1 - strand) * 0.14;
        }
      }
    },
    true
  );

  const normal = heightFieldToNormalTexture(heights, size, pattern === 'wool' ? 2.4 : 1.6);
  const roughness = heightFieldToRoughnessTexture(roughs, size);
  textureCache[key + '_a'] = albedo;
  textureCache[key + '_n'] = normal;
  textureCache[key + '_r'] = roughness;
  return { albedo, normal, roughness };
}

// ============================================================================
// 5. VOLUMETRIC PARTICLE & WEATHER TEXTURES (100% Procedural Alpha Sprites)
// ============================================================================

export function getSoftParticleTexture(): THREE.CanvasTexture {
  const key = 'particle_soft_glow_v1';
  if (textureCache[key]) return textureCache[key];
  const tex = makeCanvasTexture(64, 64, true, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cx);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.32, 'rgba(255,255,255,0.72)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache[key] = tex;
  return tex;
}

export function getSmokePuffTexture(): THREE.CanvasTexture {
  const key = 'particle_smoke_puff_v1';
  if (textureCache[key]) return textureCache[key];
  const size = 128;
  const tex = makeCanvasTexture(
    size,
    size,
    true,
    (_ctx, w, _h, img) => {
      if (!img) return;
      const d = img.data;
      const half = w * 0.5;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x - half) / half;
          const dy = (y - half) / half;
          const dist = Math.hypot(dx, dy);
          const n = tileFBM(x / w, y / w, 4, 4, 1777);
          const edge = Math.max(0, 1.0 - dist * (1.05 - n * 0.25));
          const alpha = Math.pow(edge, 1.55);
          const shade = 215 + n * 40;
          const idx = (y * w + x) * 4;
          d[idx] = clampByte(shade);
          d[idx + 1] = clampByte(shade);
          d[idx + 2] = clampByte(shade);
          d[idx + 3] = clampByte(alpha * 255);
        }
      }
    },
    true
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache[key] = tex;
  return tex;
}

export function getSnowflakeTexture(): THREE.CanvasTexture {
  const key = 'particle_snowflake_v1';
  if (textureCache[key]) return textureCache[key];
  const tex = makeCanvasTexture(64, 64, true, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cx * 0.9);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.98)');
    grad.addColorStop(0.45, 'rgba(235,245,255,0.68)');
    grad.addColorStop(1.0, 'rgba(220,240,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * 20, cy + Math.sin(ang) * 20);
      ctx.stroke();
    }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache[key] = tex;
  return tex;
}

