import * as THREE from 'three';

const textureCache: Record<string, THREE.CanvasTexture> = {};

function createProceduralCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function getTerrainTexture(): THREE.CanvasTexture {
  if (textureCache['terrain']) return textureCache['terrain'];

  textureCache['terrain'] = createProceduralCanvas(512, 512, (ctx, w, h) => {
    // Rich forest floor / mossy soil
    ctx.fillStyle = '#3a4f29';
    ctx.fillRect(0, 0, w, h);

    // Soil and pebble specks
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2.5 + 0.5;
      const shade = Math.random();
      if (shade > 0.6) {
        ctx.fillStyle = '#485e33';
      } else if (shade > 0.3) {
        ctx.fillStyle = '#2d3a20';
      } else {
        ctx.fillStyle = '#5c4b32'; // mud patch
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faint grass blades
    ctx.strokeStyle = '#547537';
    ctx.lineWidth = 1;
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y - Math.random() * 8);
      ctx.stroke();
    }
  });

  return textureCache['terrain'];
}

export function getWoodPlankTexture(): THREE.CanvasTexture {
  if (textureCache['wood']) return textureCache['wood'];

  textureCache['wood'] = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#61432a';
    ctx.fillRect(0, 0, w, h);

    // Plank lines
    const plankHeight = h / 4;
    for (let p = 0; p < 4; p++) {
      const y = p * plankHeight;
      ctx.fillStyle = p % 2 === 0 ? '#6c4a30' : '#573b24';
      ctx.fillRect(0, y, w, plankHeight - 2);

      // Wood grain lines
      ctx.strokeStyle = '#432d1c';
      ctx.lineWidth = 1;
      for (let g = 0; g < 15; g++) {
        const gy = y + Math.random() * plankHeight;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(
          w * 0.3, gy + (Math.random() - 0.5) * 4,
          w * 0.7, gy + (Math.random() - 0.5) * 4,
          w, gy
        );
        ctx.stroke();
      }

      // Nails
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(12, y + plankHeight / 2, 2.5, 0, Math.PI * 2);
      ctx.arc(w - 12, y + plankHeight / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return textureCache['wood'];
}

export function getStoneTexture(): THREE.CanvasTexture {
  if (textureCache['stone']) return textureCache['stone'];

  textureCache['stone'] = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#686b6e';
    ctx.fillRect(0, 0, w, h);

    // Granite speckling
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2 + 0.5;
      const val = Math.random();
      ctx.fillStyle = val > 0.5 ? '#808488' : '#4d5053';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle fracture lines
    ctx.strokeStyle = '#393b3d';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let cx = Math.random() * w;
      let cy = Math.random() * h;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (Math.random() - 0.5) * 35;
        cy += (Math.random() - 0.5) * 35;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  });

  return textureCache['stone'];
}

export function getMetalScrapTexture(): THREE.CanvasTexture {
  if (textureCache['metal']) return textureCache['metal'];

  textureCache['metal'] = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#555b61';
    ctx.fillRect(0, 0, w, h);

    // Rust oxidation spots
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 25 + 6;
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, '#8c4826');
      grad.addColorStop(0.7, '#643820');
      grad.addColorStop(1, 'rgba(85, 91, 97, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scratches and rivets
    ctx.strokeStyle = '#858d94';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 20, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
  });

  return textureCache['metal'];
}

export function getHazardStripeTexture(): THREE.CanvasTexture {
  if (textureCache['hazard']) return textureCache['hazard'];

  textureCache['hazard'] = createProceduralCanvas(128, 128, (ctx, w, h) => {
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

export interface PBRTextureSet {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

export function getZombieFleshPBR(isBrute = false): PBRTextureSet {
  const prefix = isBrute ? 'zombie_brute' : 'zombie_normal';
  if (textureCache[prefix + '_albedo']) {
    return {
      albedo: textureCache[prefix + '_albedo'],
      normal: textureCache[prefix + '_normal'],
      roughness: textureCache[prefix + '_roughness'],
    };
  }

  const albedo = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = isBrute ? '#3d4438' : '#5a6855';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 15 + 4;
      ctx.fillStyle = Math.random() > 0.5 ? '#2f3b2a' : '#4d2828';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const normal = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = '#7878ee';
      ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    }
  });

  const roughness = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = isBrute ? '#cccccc' : '#bbbbbb';
    ctx.fillRect(0, 0, w, h);
  });

  textureCache[prefix + '_albedo'] = albedo;
  textureCache[prefix + '_normal'] = normal;
  textureCache[prefix + '_roughness'] = roughness;

  return { albedo, normal, roughness };
}

export function getGrassPBR(groundColor: number = 0x3d7036): PBRTextureSet {
  const key = `grass_${groundColor}`;
  if (textureCache[key + '_albedo']) {
    return {
      albedo: textureCache[key + '_albedo'],
      normal: textureCache[key + '_normal'],
      roughness: textureCache[key + '_roughness'],
    };
  }

  const hex = '#' + groundColor.toString(16).padStart(6, '0');
  const albedo = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
    // Micro soil specks
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 600; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });

  const normal = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = '#7a7aee';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });

  const roughness = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, w, h);
  });

  textureCache[key + '_albedo'] = albedo;
  textureCache[key + '_normal'] = normal;
  textureCache[key + '_roughness'] = roughness;

  return { albedo, normal, roughness };
}

export function getWaterRippleNormalMap(_time = 0): THREE.CanvasTexture {
  if (textureCache['water_ripple']) return textureCache['water_ripple'];

  textureCache['water_ripple'] = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    // Procedural ripple rings and waves
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = Math.random() * 20 + 8;
      ctx.strokeStyle = Math.random() > 0.5 ? '#9090ff' : '#7070ef';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  return textureCache['water_ripple'];
}

export function getDinosaurSkinPBR(speciesId: string, baseHex: number): PBRTextureSet {
  const key = `dino_${speciesId}_${baseHex.toString(16)}`;
  if (textureCache[key + '_albedo']) {
    return {
      albedo: textureCache[key + '_albedo'],
      normal: textureCache[key + '_normal'],
      roughness: textureCache[key + '_roughness'],
    };
  }

  const baseCol = '#' + baseHex.toString(16).padStart(6, '0');
  const albedo = createProceduralCanvas(512, 512, (ctx, w, h) => {
    // Primary epidermal tone
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, w, h);

    // Reptilian scutes / polygonal scales
    const cellSize = 16;
    for (let py = 0; py < h; py += cellSize) {
      for (let px = 0; px < w; px += cellSize) {
        const jitterX = (Math.random() - 0.5) * 6;
        const jitterY = (Math.random() - 0.5) * 6;
        const scaleRadius = cellSize * 0.45 + (Math.random() - 0.5) * 3;
        
        // Scale shadow rim
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(px + cellSize/2 + jitterX + 1, py + cellSize/2 + jitterY + 1, scaleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Scale center highlight
        const grad = ctx.createRadialGradient(
          px + cellSize/2 + jitterX - 2, py + cellSize/2 + jitterY - 2, 1,
          px + cellSize/2 + jitterX, py + cellSize/2 + jitterY, scaleRadius
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.18)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px + cellSize/2 + jitterX, py + cellSize/2 + jitterY, scaleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dorsal camouflage stripes & counter-shading
    for (let s = 0; s < 6; s++) {
      const sy = s * (h / 6) + (Math.random() - 0.5) * 30;
      ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.bezierCurveTo(w * 0.35, sy - 25, w * 0.65, sy + 35, w, sy);
      ctx.lineTo(w, sy + 35);
      ctx.bezierCurveTo(w * 0.65, sy + 65, w * 0.35, sy + 10, 0, sy + 35);
      ctx.closePath();
      ctx.fill();
    }
  });

  const normal = createProceduralCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    // Beveled normal edges for each scale
    const cellSize = 16;
    for (let py = 0; py < h; py += cellSize) {
      for (let px = 0; px < w; px += cellSize) {
        ctx.fillStyle = '#9999ff';
        ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#6a6aee';
        ctx.fillRect(px + 4, py + cellSize - 3, cellSize - 4, 2);
        ctx.fillRect(px + cellSize - 3, py + 4, 2, cellSize - 4);
      }
    }
  });

  const roughness = createProceduralCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#777777' : '#c8c8c8';
      ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    }
  });

  textureCache[key + '_albedo'] = albedo;
  textureCache[key + '_normal'] = normal;
  textureCache[key + '_roughness'] = roughness;

  return { albedo, normal, roughness };
}

export function getBarkPBR(): PBRTextureSet {
  const key = 'nature_bark_pbr';
  if (textureCache[key + '_albedo']) {
    return {
      albedo: textureCache[key + '_albedo'],
      normal: textureCache[key + '_normal'],
      roughness: textureCache[key + '_roughness'],
    };
  }

  const albedo = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3f2d1e';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) {
      ctx.fillStyle = (x % 24 === 0) ? '#281a10' : '#4d3928';
      ctx.fillRect(x, 0, 8, h);
      ctx.strokeStyle = '#1a1008';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, h);
      ctx.stroke();
    }
    for (let m = 0; m < 8; m++) {
      ctx.fillStyle = 'rgba(56, 82, 34, 0.45)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 14 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const normal = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) {
      ctx.fillStyle = '#9090ff';
      ctx.fillRect(x, 0, 5, h);
      ctx.fillStyle = '#6e6eee';
      ctx.fillRect(x + 5, 0, 5, h);
    }
  });

  const roughness = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, w, h);
  });

  textureCache[key + '_albedo'] = albedo;
  textureCache[key + '_normal'] = normal;
  textureCache[key + '_roughness'] = roughness;

  return { albedo, normal, roughness };
}

export function getRockPBR(): PBRTextureSet {
  const key = 'granite_rock_pbr';
  if (textureCache[key + '_albedo']) {
    return {
      albedo: textureCache[key + '_albedo'],
      normal: textureCache[key + '_normal'],
      roughness: textureCache[key + '_roughness'],
    };
  }

  const albedo = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5c6063';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const val = Math.random();
      ctx.fillStyle = val > 0.7 ? '#8e9398' : val > 0.3 ? '#424548' : '#2b2c2e';
      ctx.fillRect(rx, ry, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    ctx.strokeStyle = '#c4c8cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.3);
    ctx.lineTo(w * 0.5, h * 0.45);
    ctx.lineTo(w, h * 0.2);
    ctx.stroke();
  });

  const normal = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#9696ff' : '#6868ee';
      ctx.fillRect(Math.random() * w, Math.random() * h, 6, 6);
    }
  });

  const roughness = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, w, h);
  });

  textureCache[key + '_albedo'] = albedo;
  textureCache[key + '_normal'] = normal;
  textureCache[key + '_roughness'] = roughness;

  return { albedo, normal, roughness };
}


