import * as THREE from 'three';
import {
  getBrushedMetalPBR,
  getConcretePBR,
  getMarbleTilePBR,
  getSandstonePBR,
  getStonePBR,
  getWaterRippleNormalMap,
  getWoodPBR,
} from '../rendering/ProceduralTextures';

export class AurelionMaterials {
  public readonly graphiteStone: THREE.MeshStandardMaterial;
  public readonly honedTravertine: THREE.MeshStandardMaterial;
  public readonly warmLimestone: THREE.MeshStandardMaterial;
  public readonly whiteMarble: THREE.MeshStandardMaterial;
  public readonly charcoalTitanium: THREE.MeshStandardMaterial;
  public readonly silverTitanium: THREE.MeshStandardMaterial;
  public readonly champagneGold: THREE.MeshStandardMaterial;
  public readonly walnutWood: THREE.MeshStandardMaterial;
  public readonly oakWood: THREE.MeshStandardMaterial;
  public readonly bronzeSmartGlass: THREE.MeshPhysicalMaterial;
  public readonly exteriorPrivacyGlass: THREE.MeshPhysicalMaterial;
  public readonly clearBalustradeGlass: THREE.MeshPhysicalMaterial;
  public readonly aquariumGlass: THREE.MeshPhysicalMaterial;
  public readonly poolWater: THREE.MeshStandardMaterial;
  public readonly warmSconce: THREE.MeshStandardMaterial;
  public readonly cyanTelemetry: THREE.MeshStandardMaterial;
  public readonly creamBoucle: THREE.MeshStandardMaterial;
  public readonly charcoalVelvet: THREE.MeshStandardMaterial;
  public readonly porcelain: THREE.MeshStandardMaterial;
  public readonly industrialSteel: THREE.MeshStandardMaterial;
  public readonly medicalWhite: THREE.MeshStandardMaterial;
  public readonly medicalAccent: THREE.MeshStandardMaterial;
  public readonly lushFoliage: THREE.MeshStandardMaterial;
  public readonly hydroGrowStrip: THREE.MeshStandardMaterial;
  public readonly solarCellMat: THREE.MeshStandardMaterial;
  public readonly cinemaVelvet: THREE.MeshStandardMaterial;

  private readonly ownedTextures: THREE.Texture[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];

  constructor() {
    const stoneDark = getStonePBR();
    const travertine = getSandstonePBR(0xd8ccb8);
    const limestone = getConcretePBR(0xeee9df);
    const marble = getMarbleTilePBR(0xf4f0e8);
    const metalDark = getBrushedMetalPBR(0x282d35);
    const metalSilver = getBrushedMetalPBR(0xaec0cc);
    const wood = getWoodPBR();
    const waterNormal = getWaterRippleNormalMap();

    this.graphiteStone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x282d35,
        map: stoneDark.albedo,
        normalMap: stoneDark.normal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: stoneDark.roughness,
        roughness: 0.68,
        metalness: 0.18,
        side: THREE.DoubleSide,
      })
    );

    this.honedTravertine = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xe3d8c4,
        map: travertine.albedo,
        normalMap: travertine.normal,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughnessMap: travertine.roughness,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
    );

    this.warmLimestone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf5f1e8,
        map: limestone.albedo,
        normalMap: limestone.normal,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughnessMap: limestone.roughness,
        roughness: 0.72,
        side: THREE.DoubleSide,
      })
    );

    this.whiteMarble = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf8f6f0,
        map: marble.albedo,
        normalMap: marble.normal,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughnessMap: marble.roughness,
        roughness: 0.24,
        metalness: 0.08,
        side: THREE.DoubleSide,
      })
    );

    this.charcoalTitanium = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x20252c,
        map: metalDark.albedo,
        normalMap: metalDark.normal,
        roughnessMap: metalDark.roughness,
        metalness: 0.84,
        roughness: 0.32,
      })
    );

    this.silverTitanium = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc2ccd4,
        map: metalSilver.albedo,
        normalMap: metalSilver.normal,
        roughnessMap: metalSilver.roughness,
        metalness: 0.88,
        roughness: 0.22,
      })
    );

    this.champagneGold = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd4b26a,
        metalness: 0.9,
        roughness: 0.22,
      })
    );

    this.walnutWood = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x6b452b,
        map: wood.albedo,
        normalMap: wood.normal,
        roughnessMap: wood.roughness,
        roughness: 0.54,
      })
    );

    this.oakWood = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xb78b5e,
        map: wood.albedo,
        normalMap: wood.normal,
        roughnessMap: wood.roughness,
        roughness: 0.62,
      })
    );

    this.bronzeSmartGlass = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0x687e8c,
        roughness: 0.08,
        metalness: 0.28,
        transparent: true,
        opacity: 0.44,
        ior: 1.5,
        reflectivity: 0.88,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    // Opaque, depth-written luxury architectural privacy glass for exterior windows:
    // completely prevents seeing apartment interiors from outside and avoids double-pass transmission overhead.
    this.exteriorPrivacyGlass = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0x162430,
        roughness: 0.07,
        metalness: 0.84,
        ior: 1.52,
        reflectivity: 0.96,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.45,
        transparent: false,
        depthWrite: true,
        side: THREE.DoubleSide,
      })
    );

    this.clearBalustradeGlass = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0xc4e6f2,
        roughness: 0.05,
        metalness: 0.08,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    this.aquariumGlass = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0x45c4e6,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    this.poolWater = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0ea5cc,
        roughness: 0.08,
        metalness: 0.16,
        normalMap: waterNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        transparent: true,
        opacity: 0.8,
      })
    );

    this.warmSconce = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffebd1,
        emissive: 0xffbe6b,
        emissiveIntensity: 1.05,
        roughness: 0.25,
      })
    );

    this.cyanTelemetry = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x6ce8ff,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.1,
        roughness: 0.25,
      })
    );

    this.creamBoucle = this.track(
      new THREE.MeshStandardMaterial({ color: 0xeae3d7, roughness: 0.88 })
    );

    this.charcoalVelvet = this.track(
      new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.85 })
    );

    this.porcelain = this.track(
      new THREE.MeshStandardMaterial({ color: 0xf9f9f6, roughness: 0.16, metalness: 0.08 })
    );

    this.industrialSteel = this.track(
      new THREE.MeshStandardMaterial({ color: 0x3a434e, metalness: 0.78, roughness: 0.36 })
    );

    this.medicalWhite = this.track(
      new THREE.MeshStandardMaterial({ color: 0xf2f7fb, roughness: 0.28, metalness: 0.06, side: THREE.DoubleSide })
    );

    this.medicalAccent = this.track(
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.65, roughness: 0.35 })
    );

    this.lushFoliage = this.track(
      new THREE.MeshStandardMaterial({ color: 0x2f8545, roughness: 0.82 })
    );

    this.hydroGrowStrip = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf8d8ff,
        emissive: 0xd946ef,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      })
    );

    this.solarCellMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0c1c38,
        metalness: 0.65,
        roughness: 0.18,
      })
    );

    this.cinemaVelvet = this.track(
      new THREE.MeshStandardMaterial({ color: 0x5c1824, roughness: 0.82 })
    );
  }

  private track<T extends THREE.Material>(mat: T): T {
    this.ownedMaterials.push(mat);
    return mat;
  }

  public createRoomPlaqueMaterial(code: string, title: string, accent = '#d4b26a'): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#11161f';
      ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 148);
      ctx.fillStyle = accent;
      ctx.font = 'bold 26px monospace';
      ctx.fillText(code, 24, 48);
      ctx.fillStyle = '#f5f1e8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(title.slice(0, 30), 24, 102);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px monospace';
      ctx.fillText('THE AURELION · PRIVATE MEGA ESTATE', 24, 136);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.push(tex);
    return this.track(new THREE.MeshBasicMaterial({ map: tex }));
  }

  public createSignboardMaterial(headline: string, subline: string, bg = '#0e141d', fg = '#e9c77b'): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 1004, 236);
      ctx.fillStyle = fg;
      ctx.font = 'bold 62px serif';
      ctx.textAlign = 'center';
      ctx.fillText(headline, 512, 122);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '28px monospace';
      ctx.fillText(subline, 512, 188);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.push(tex);
    return this.track(new THREE.MeshBasicMaterial({ map: tex }));
  }

  public trackCustomTexture<T extends THREE.Texture>(tex: T): T {
    this.ownedTextures.push(tex);
    return tex;
  }

  public trackCustomMaterial<T extends THREE.Material>(mat: T): T {
    return this.track(mat);
  }

  public dispose() {
    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    for (const mat of this.ownedMaterials) {
      mat.dispose();
    }
    this.ownedTextures.length = 0;
    this.ownedMaterials.length = 0;
  }
}
