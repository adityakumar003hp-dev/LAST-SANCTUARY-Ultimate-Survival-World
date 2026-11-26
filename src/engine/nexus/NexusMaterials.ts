import * as THREE from 'three';

function createTileGridTexture(
  bgHex: string,
  lineHex: string,
  accentHex: string,
  cells: number,
  repeat = 4
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, size, size);
    const step = size / cells;
    ctx.strokeStyle = lineHex;
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.fillStyle = accentHex;
    for (let ix = 0; ix < cells; ix++) {
      for (let iz = 0; iz < cells; iz++) {
        if ((ix + iz) % 2 === 0) {
          ctx.fillRect(ix * step + 3, iz * step + 3, 4, 4);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

export class NexusMaterials {
  private readonly textures: THREE.Texture[] = [];
  private readonly materials: THREE.Material[] = [];

  // Core Architectural Signature (Dark Graphite + Champagne Gold + Silver Titanium + Bronze Glass)
  public readonly darkGraphite: THREE.MeshStandardMaterial;
  public readonly charcoalCore: THREE.MeshStandardMaterial;
  public readonly champagneGold: THREE.MeshStandardMaterial;
  public readonly silverTitanium: THREE.MeshStandardMaterial;
  public readonly bronzeSmartGlass: THREE.MeshPhysicalMaterial;
  public readonly clearPanoramaGlass: THREE.MeshPhysicalMaterial;

  // Floor-Distinct Surfaces (F1..F8)
  public readonly f1TravertineMarble: THREE.MeshStandardMaterial;
  public readonly f2SlateObservatory: THREE.MeshStandardMaterial;
  public readonly f3ArenaObsidian: THREE.MeshStandardMaterial;
  public readonly f4EpoxyLabGrid: THREE.MeshStandardMaterial;
  public readonly f5CleanroomPolymer: THREE.MeshStandardMaterial;
  public readonly f6SmokedWalnut: THREE.MeshStandardMaterial;
  public readonly f7CyberCyanFloor: THREE.MeshStandardMaterial;
  public readonly f8OutbreakObsidianFloor: THREE.MeshStandardMaterial;

  // Accents & Emissives
  public readonly goldLed: THREE.MeshBasicMaterial;
  public readonly cyanLed: THREE.MeshBasicMaterial;
  public readonly indigoLed: THREE.MeshBasicMaterial;
  public readonly amberLed: THREE.MeshBasicMaterial;
  public readonly crimsonLed: THREE.MeshBasicMaterial;
  public readonly crownGlowMat: THREE.MeshBasicMaterial;
  public readonly holoCyanGlass: THREE.MeshPhysicalMaterial;
  public readonly holoCrimsonGlass: THREE.MeshPhysicalMaterial;
  public readonly darkLeather: THREE.MeshStandardMaterial;
  public readonly titaniumCabInterior: THREE.MeshStandardMaterial;

  constructor() {
    this.darkGraphite = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.36, metalness: 0.72 })
    );
    this.charcoalCore = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.45, metalness: 0.55 })
    );
    this.champagneGold = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd4b36a,
        roughness: 0.24,
        metalness: 0.9,
        emissive: 0x3b2d12,
        emissiveIntensity: 0.14,
      })
    );
    this.silverTitanium = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xbac4cf, roughness: 0.26, metalness: 0.88 })
    );
    this.bronzeSmartGlass = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x4b3b2c,
        roughness: 0.08,
        metalness: 0.15,
        transmission: 0.52,
        transparent: true,
        opacity: 0.56,
        ior: 1.5,
      })
    );
    this.clearPanoramaGlass = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        roughness: 0.06,
        metalness: 0.08,
        transmission: 0.62,
        transparent: true,
        opacity: 0.42,
      })
    );

    const f1Tex = this.trackTex(createTileGridTexture('#e7e1d5', '#c9bc9c', '#d4b36a', 6, 4));
    this.f1TravertineMarble = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f1Tex, roughness: 0.22, metalness: 0.12 })
    );

    const f2Tex = this.trackTex(createTileGridTexture('#1b2432', '#2f455f', '#38bdf8', 8, 4));
    this.f2SlateObservatory = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f2Tex, roughness: 0.35, metalness: 0.42 })
    );

    const f3Tex = this.trackTex(createTileGridTexture('#12161e', '#1f2c3d', '#22d3ee', 10, 4));
    this.f3ArenaObsidian = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f3Tex, roughness: 0.38, metalness: 0.58 })
    );

    const f4Tex = this.trackTex(createTileGridTexture('#232930', '#404a56', '#f59e0b', 8, 5));
    this.f4EpoxyLabGrid = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f4Tex, roughness: 0.3, metalness: 0.48 })
    );

    const f5Tex = this.trackTex(createTileGridTexture('#171a26', '#2c334a', '#818cf8', 12, 4));
    this.f5CleanroomPolymer = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f5Tex, roughness: 0.25, metalness: 0.35 })
    );

    const f6Tex = this.trackTex(createTileGridTexture('#362519', '#573c29', '#d4b36a', 6, 4));
    this.f6SmokedWalnut = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f6Tex, roughness: 0.32, metalness: 0.15 })
    );

    const f7Tex = this.trackTex(createTileGridTexture('#0d1b26', '#164e63', '#06b6d4', 10, 4));
    this.f7CyberCyanFloor = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f7Tex, roughness: 0.26, metalness: 0.52 })
    );

    const f8Tex = this.trackTex(createTileGridTexture('#181116', '#4c1d24', '#f43f5e', 10, 4));
    this.f8OutbreakObsidianFloor = this.trackMat(
      new THREE.MeshStandardMaterial({ map: f8Tex, roughness: 0.28, metalness: 0.52 })
    );

    this.goldLed = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf4cf76 }));
    this.cyanLed = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    this.indigoLed = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x818cf8 }));
    this.amberLed = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    this.crimsonLed = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    this.crownGlowMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xfde68a }));

    this.holoCyanGlass = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        roughness: 0.12,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.holoCrimsonGlass = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf43f5e,
        emissive: 0xbe123c,
        emissiveIntensity: 0.42,
        roughness: 0.14,
        transparent: true,
        opacity: 0.52,
      })
    );
    this.darkLeather = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x211d1b, roughness: 0.65, metalness: 0.1 })
    );
    this.titaniumCabInterior = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.34, metalness: 0.78 })
    );
  }

  private trackTex<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  public getFloorSurfaceMaterial(floor: number): THREE.MeshStandardMaterial {
    switch (floor) {
      case 1: return this.f1TravertineMarble;
      case 2: return this.f2SlateObservatory;
      case 3: return this.f3ArenaObsidian;
      case 4: return this.f4EpoxyLabGrid;
      case 5: return this.f5CleanroomPolymer;
      case 6: return this.f6SmokedWalnut;
      case 7: return this.f7CyberCyanFloor;
      case 8: return this.f8OutbreakObsidianFloor;
      default: return this.charcoalCore;
    }
  }

  public getFloorAccentLed(floor: number): THREE.MeshBasicMaterial {
    switch (floor) {
      case 1:
      case 6:
        return this.goldLed;
      case 4:
        return this.amberLed;
      case 5:
        return this.indigoLed;
      case 8:
        return this.crimsonLed;
      default:
        return this.cyanLed;
    }
  }

  public dispose(): void {
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
