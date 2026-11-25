import * as THREE from 'three';
import {
  GraphicsGovernorState,
  GraphicsManagerConfig,
  GraphicsManagerSnapshot,
  GraphicsQuality,
  GraphicsQualityMode,
  GraphicsTargetFps,
} from '../../types/game';

export const GRAPHICS_CONFIG_STORAGE_KEY = 'last_sanctuary_graphics_config_v1';
export const QUALITY_PRESET_STORAGE_KEY = 'last_sanctuary_quality_preset';

export interface GraphicsHardwareCapabilities {
  isMobile: boolean;
  isSoftwareGl: boolean;
  gpuRendererName: string;
  maxRenderBufferDim: number;
  maxTextureDim: number;
  maxAnisotropy: number;
  isWebGL2: boolean;
  deviceMemoryGb: number;
}

export interface GraphicsEffectiveTarget {
  desiredDpr: number;
  watchdogDprFactor: number;
  shadowsEnabled: boolean;
  shadowResolution: number;
  shadowFrustumExtent: number;
  shadowBias: number;
  shadowNormalBias: number;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  sunShaftIntensity: number;
  anisotropy: number;
  viewDistanceChunks: number;
  particleDensity: number;
  maxLocalLights: number;
  envIntensityMultiplier: number;
  sunIntensityMultiplier: number;
  fogDensityMultiplier: number;
  toneMappingExposure: number;
  chunkQuality: GraphicsQuality;
}

export function clampRenderScale(value: number): number {
  return Math.max(0.6, Math.min(2.0, Math.round(value * 20) / 20));
}

export function clampViewDistanceChunks(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function clampParticleDensity(value: number): number {
  return Math.max(0.25, Math.min(1.0, Math.round(value * 20) / 20));
}

export function getPresetGraphicsConfig(
  preset: GraphicsQualityMode,
  caps: Pick<GraphicsHardwareCapabilities, 'isMobile' | 'isSoftwareGl' | 'deviceMemoryGb'>
): GraphicsManagerConfig {
  // Unknown memory is treated conservatively. Several mobile browsers do not
  // expose deviceMemory, and assuming 8 GB caused high presets to OOM on phones.
  const lowMem = caps.deviceMemoryGb <= 4;
  const baseTargetFps: GraphicsTargetFps = caps.isSoftwareGl ? 30 : 60;

  if (caps.isSoftwareGl || preset === 'performance') {
    return {
      preset: caps.isSoftwareGl && (preset === 'ultra_5x' || preset === 'absolute_realism') ? 'performance' : preset,
      autoGovernor: true,
      targetFps: baseTargetFps,
      renderScale: null,
      shadowsEnabled: false,
      shadowResolution: 0,
      postProcessingEnabled: false,
      bloomEnabled: false,
      anisotropyLevel: 1,
      viewDistanceChunks: 1,
      particleDensity: 0.45,
      maxLocalLights: 2,
    };
  }

  if (preset === 'balanced') {
    return {
      preset: 'balanced',
      autoGovernor: true,
      targetFps: 60,
      renderScale: null,
      shadowsEnabled: !caps.isMobile && !lowMem,
      shadowResolution: caps.isMobile || lowMem ? 0 : 2048,
      postProcessingEnabled: !caps.isMobile && !lowMem,
      bloomEnabled: false,
      anisotropyLevel: 4,
      viewDistanceChunks: 2,
      particleDensity: 0.75,
      maxLocalLights: caps.isMobile ? 3 : 4,
    };
  }

  if (preset === 'quality') {
    return {
      preset: 'quality',
      autoGovernor: true,
      targetFps: 60,
      renderScale: null,
      shadowsEnabled: !caps.isMobile && !lowMem,
      shadowResolution: caps.isMobile || lowMem ? 0 : 2048,
      postProcessingEnabled: !caps.isMobile && !lowMem,
      bloomEnabled: !caps.isMobile && !lowMem,
      anisotropyLevel: caps.isMobile || lowMem ? 4 : 8,
      viewDistanceChunks: caps.isMobile || lowMem ? 2 : 3,
      particleDensity: 1.0,
      maxLocalLights: caps.isMobile || lowMem ? 3 : 4,
    };
  }

  // Highest current-engine fidelity. Mobile/low-memory devices receive a safe
  // adaptive variant; desktop-class devices unlock the full available pipeline.
  if (preset === 'absolute_realism') {
    const constrained = caps.isMobile || lowMem;
    return {
      preset: 'absolute_realism',
      autoGovernor: true,
      targetFps: 60,
      renderScale: null,
      shadowsEnabled: !constrained,
      shadowResolution: constrained ? 0 : 3072,
      postProcessingEnabled: !constrained,
      bloomEnabled: !constrained,
      anisotropyLevel: constrained ? 4 : 16,
      viewDistanceChunks: constrained ? 2 : 5,
      particleDensity: constrained ? 0.75 : 1.0,
      maxLocalLights: constrained ? 3 : 6,
    };
  }

  // ultra_5x
  return {
    preset: 'ultra_5x',
    autoGovernor: true,
    targetFps: 60,
    renderScale: null,
    shadowsEnabled: !caps.isMobile && !lowMem,
    shadowResolution: caps.isMobile || lowMem ? 0 : 2048,
    postProcessingEnabled: !caps.isMobile && !lowMem,
    bloomEnabled: !caps.isMobile && !lowMem,
    anisotropyLevel: caps.isMobile || lowMem ? 4 : 8,
    viewDistanceChunks: caps.isMobile || lowMem ? 2 : 3,
    particleDensity: 1.0,
    maxLocalLights: caps.isMobile || lowMem ? 3 : 4,
  };
}

export function loadStoredGraphicsConfig(
  caps: Pick<GraphicsHardwareCapabilities, 'isMobile' | 'isSoftwareGl' | 'deviceMemoryGb'>
): GraphicsManagerConfig {
  const defaultPreset: GraphicsQualityMode =
    caps.isSoftwareGl || caps.isMobile ? 'performance' : 'balanced';

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(GRAPHICS_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GraphicsManagerConfig>;
        const preset: GraphicsQualityMode =
          parsed.preset === 'performance' ||
          parsed.preset === 'balanced' ||
          parsed.preset === 'quality' ||
          parsed.preset === 'ultra_5x' ||
          parsed.preset === 'absolute_realism'
            ? parsed.preset
            : defaultPreset;
        const base = getPresetGraphicsConfig(preset, caps);
        const constrainedDevice = caps.isMobile || caps.isSoftwareGl || caps.deviceMemoryGb <= 4;
        return {
          ...base,
          preset,
          autoGovernor: typeof parsed.autoGovernor === 'boolean' ? parsed.autoGovernor : base.autoGovernor,
          targetFps: parsed.targetFps === 30 || parsed.targetFps === 60 ? parsed.targetFps : base.targetFps,
          renderScale:
            typeof parsed.renderScale === 'number' && Number.isFinite(parsed.renderScale)
              ? Math.min(clampRenderScale(parsed.renderScale), constrainedDevice ? 1.15 : 2.0)
              : null,
          shadowsEnabled:
            !constrainedDevice && typeof parsed.shadowsEnabled === 'boolean' ? parsed.shadowsEnabled : base.shadowsEnabled,
          shadowResolution:
            parsed.shadowResolution === 0 ||
            parsed.shadowResolution === 512 ||
            parsed.shadowResolution === 1024 ||
            parsed.shadowResolution === 2048 ||
            parsed.shadowResolution === 3072
              ? constrainedDevice && parsed.shadowResolution > 1024
                ? 1024
                : parsed.shadowResolution
              : base.shadowResolution,
          postProcessingEnabled:
            typeof parsed.postProcessingEnabled === 'boolean'
              ? parsed.postProcessingEnabled && !constrainedDevice
              : base.postProcessingEnabled,
          bloomEnabled:
            typeof parsed.bloomEnabled === 'boolean' ? parsed.bloomEnabled && !constrainedDevice : base.bloomEnabled,
          anisotropyLevel:
            parsed.anisotropyLevel === 1 ||
            parsed.anisotropyLevel === 4 ||
            parsed.anisotropyLevel === 8 ||
            parsed.anisotropyLevel === 16
              ? constrainedDevice && parsed.anisotropyLevel > 4
                ? 4
                : parsed.anisotropyLevel
              : base.anisotropyLevel,
          viewDistanceChunks:
            typeof parsed.viewDistanceChunks === 'number'
              ? Math.min(clampViewDistanceChunks(parsed.viewDistanceChunks), constrainedDevice ? 2 : 5)
              : base.viewDistanceChunks,
          particleDensity:
            typeof parsed.particleDensity === 'number'
              ? Math.min(clampParticleDensity(parsed.particleDensity), constrainedDevice ? 0.75 : 1.0)
              : base.particleDensity,
          maxLocalLights:
            typeof parsed.maxLocalLights === 'number'
              ? Math.max(2, Math.min(constrainedDevice ? 3 : 6, Math.round(parsed.maxLocalLights)))
              : base.maxLocalLights,
        };
      }

      const legacyPreset = localStorage.getItem(QUALITY_PRESET_STORAGE_KEY);
      if (
        legacyPreset === 'performance' ||
        legacyPreset === 'balanced' ||
        legacyPreset === 'quality' ||
        legacyPreset === 'ultra_5x' ||
        legacyPreset === 'absolute_realism'
      ) {
        return getPresetGraphicsConfig(legacyPreset, caps);
      }
    }
  } catch {
    // Ignore storage corruption and fall back cleanly
  }

  return getPresetGraphicsConfig(defaultPreset, caps);
}

export function saveStoredGraphicsConfig(config: GraphicsManagerConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GRAPHICS_CONFIG_STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(QUALITY_PRESET_STORAGE_KEY, config.preset);
    }
  } catch {
    // Ignore private-mode / quota errors
  }
}

export function probeGraphicsHardware(): GraphicsHardwareCapabilities {
  const isMobile =
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 840);
  const reportedMemory = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    : undefined;
  const deviceMemoryGb = typeof reportedMemory === 'number' && Number.isFinite(reportedMemory)
    ? reportedMemory
    : 4;

  if (typeof document === 'undefined') {
    return {
      isMobile: false,
      isSoftwareGl: false,
      gpuRendererName: 'Node Headless',
      maxRenderBufferDim: 4096,
      maxTextureDim: 4096,
      maxAnisotropy: 16,
      isWebGL2: true,
      deviceMemoryGb,
    };
  }

  try {
    const probeCanvas = document.createElement('canvas');
    const gl2 = probeCanvas.getContext('webgl2');
    const gl = gl2 || probeCanvas.getContext('webgl');
    if (!gl) {
      return {
        isMobile,
        isSoftwareGl: true,
        gpuRendererName: 'Fallback Software Renderer',
        maxRenderBufferDim: 2048,
        maxTextureDim: 2048,
        maxAnisotropy: 1,
        isWebGL2: false,
        deviceMemoryGb,
      };
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpuRendererName = String(gl.getParameter(param) || 'WebGL GPU');
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Microsoft Basic Render/i.test(gpuRendererName);
    const maxRenderBufferDim = Math.min(8192, Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 4096);
    const maxTextureDim = Math.min(8192, Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096);
    const anisoExt =
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    const maxAnisotropy = anisoExt
      ? Math.max(1, Number(gl.getParameter((anisoExt as any).MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 4)
      : 1;

    gl.getExtension('WEBGL_lose_context')?.loseContext();

    return {
      isMobile,
      isSoftwareGl,
      gpuRendererName,
      maxRenderBufferDim,
      maxTextureDim,
      maxAnisotropy,
      isWebGL2: Boolean(gl2),
      deviceMemoryGb,
    };
  } catch {
    return {
      isMobile,
      isSoftwareGl: false,
      gpuRendererName: 'WebGL GPU',
      maxRenderBufferDim: 4096,
      maxTextureDim: 4096,
      maxAnisotropy: 8,
      isWebGL2: true,
      deviceMemoryGb,
    };
  }
}

export class GraphicsManager {
  public caps: GraphicsHardwareCapabilities;
  public config: GraphicsManagerConfig;

  // Dynamic governor state
  public governorLevel: number = 0; // 0=optimal, 1=dpr trim, 2=post/particles trim, 3=shadow/view trim, 4=safe mode
  public governorState: GraphicsGovernorState = 'optimal';
  public governorActionLabel: string = 'Full Fidelity';
  public watchdogDprFactor: number = 1.0;

  // Frame pacing telemetry
  public rollingFps: number = 60;
  public avgFrameTimeMs: number = 16.6;
  public p95FrameTimeMs: number = 16.6;
  public lastFrameWorkMs: number = 8.0;
  public frameSpikeCount: number = 0;

  // WebGL context health
  public contextHealth: 'healthy' | 'recovering' | 'safe_mode' = 'healthy';
  public contextLossCount: number = 0;

  private frameTimeHistory: number[] = [];
  private lowFpsTimer: number = 0;
  private recoveryTimer: number = 0;
  private chunkCooldownFrames: number = 0;

  // Loop handle tracking (RAF / timer / fence)
  private activeRafId: number = 0;
  private activeTimeoutId: number = 0;
  private activeFenceTimerId: number = 0;
  private pendingSync: WebGLSync | null = null;
  private fencePollGl: WebGL2RenderingContext | null = null;

  constructor(caps?: GraphicsHardwareCapabilities, initialConfig?: GraphicsManagerConfig) {
    this.caps = caps ?? probeGraphicsHardware();
    this.config = initialConfig ?? loadStoredGraphicsConfig(this.caps);
    if (!this.config.autoGovernor) {
      this.governorState = 'manual';
      this.governorActionLabel = 'Manual Control';
    }
  }

  public setPreset(preset: GraphicsQualityMode, preserveCustomViewDistance = false): GraphicsManagerConfig {
    const next = getPresetGraphicsConfig(preset, this.caps);
    if (preserveCustomViewDistance) {
      next.viewDistanceChunks = this.config.viewDistanceChunks;
    }
    next.autoGovernor = this.config.autoGovernor;
    next.targetFps = this.caps.isSoftwareGl ? 30 : this.config.targetFps;
    this.config = next;
    this.resetGovernor();
    saveStoredGraphicsConfig(this.config);
    return this.config;
  }

  public updateConfig(patch: Partial<GraphicsManagerConfig>): GraphicsManagerConfig {
    const next: GraphicsManagerConfig = {
      ...this.config,
      ...patch,
    };

    if (patch.viewDistanceChunks !== undefined) {
      next.viewDistanceChunks = clampViewDistanceChunks(patch.viewDistanceChunks);
    }
    if (patch.particleDensity !== undefined) {
      next.particleDensity = clampParticleDensity(patch.particleDensity);
    }
    if (patch.renderScale !== undefined) {
      next.renderScale = patch.renderScale === null ? null : clampRenderScale(patch.renderScale);
    }
    if (patch.maxLocalLights !== undefined) {
      next.maxLocalLights = Math.max(2, Math.min(6, Math.round(patch.maxLocalLights)));
    }
    if (this.caps.isSoftwareGl) {
      next.shadowsEnabled = false;
      next.postProcessingEnabled = false;
      next.bloomEnabled = false;
      next.shadowResolution = 0;
      next.anisotropyLevel = 1;
      next.viewDistanceChunks = 1;
      next.particleDensity = Math.min(next.particleDensity, 0.45);
      next.maxLocalLights = 2;
      next.renderScale = next.renderScale === null ? null : Math.min(next.renderScale, 1.0);
    } else if (this.caps.isMobile || this.caps.deviceMemoryGb <= 4) {
      next.shadowsEnabled = false;
      next.shadowResolution = 0;
      next.postProcessingEnabled = false;
      next.bloomEnabled = false;
      next.anisotropyLevel = next.anisotropyLevel > 4 ? 4 : next.anisotropyLevel;
      next.viewDistanceChunks = Math.min(next.viewDistanceChunks, 2);
      next.particleDensity = Math.min(next.particleDensity, 0.75);
      next.maxLocalLights = Math.min(next.maxLocalLights, 3);
      next.renderScale = next.renderScale === null ? null : Math.min(next.renderScale, 1.15);
    }

    this.config = next;
    this.resetGovernor();
    saveStoredGraphicsConfig(this.config);
    return this.config;
  }

  public resetToSafeAuto(): GraphicsManagerConfig {
    const safePreset: GraphicsQualityMode =
      this.caps.isSoftwareGl || this.caps.isMobile ? 'performance' : 'balanced';
    this.config = getPresetGraphicsConfig(safePreset, this.caps);
    this.config.autoGovernor = true;
    this.contextHealth = 'healthy';
    this.resetGovernor();
    saveStoredGraphicsConfig(this.config);
    return this.config;
  }

  public resetGovernor() {
    this.governorLevel = 0;
    this.watchdogDprFactor = 1.0;
    this.lowFpsTimer = 0;
    this.recoveryTimer = 0;
    this.governorState = this.config.autoGovernor ? 'optimal' : 'manual';
    this.governorActionLabel = this.config.autoGovernor ? 'Full Fidelity' : 'Manual Control';
  }

  /**
   * Computes safe pixel ratio clamped to hardware renderbuffer & texture dimensions to prevent GPU OOM crashes.
   */
  public computeSafePixelRatio(desiredDpr: number, viewportWidth: number, viewportHeight: number): number {
    const w = Math.max(280, viewportWidth);
    const h = Math.max(240, viewportHeight);
    const safeMaxDim = Math.min(4096, Math.floor(Math.min(this.caps.maxRenderBufferDim, this.caps.maxTextureDim) * 0.92));
    const maxDprForCanvas = Math.min(safeMaxDim / w, safeMaxDim / h);
    const pixelBudget = this.caps.isMobile || this.caps.isSoftwareGl || this.caps.deviceMemoryGb <= 4
      ? 2_500_000
      : this.caps.deviceMemoryGb <= 8
        ? 4_500_000
        : 6_000_000;
    const maxDprForPixelBudget = Math.sqrt(pixelBudget / (w * h));
    const scaled = desiredDpr * this.watchdogDprFactor;
    // Never force a minimum DPR that exceeds the device's actual buffer limit.
    return Math.max(0.35, Math.min(scaled, maxDprForCanvas, maxDprForPixelBudget));
  }

  /**
   * Computes effective rendering parameters combining user preset/config + dynamic governor adaptation.
   */
  public getEffectiveTarget(rawDeviceDpr = 1.0, hasComposer = true): GraphicsEffectiveTarget {
    const rawDpr = Math.max(1, rawDeviceDpr || 1);
    let baseDpr = 1.0;
    if (this.config.renderScale !== null) {
      baseDpr = this.config.renderScale;
    } else if (this.caps.isSoftwareGl || this.config.preset === 'performance') {
      baseDpr = 1.0;
    } else if (this.config.preset === 'balanced') {
      baseDpr = Math.min(rawDpr, this.caps.isMobile ? 1.1 : 1.35);
    } else if (this.config.preset === 'quality') {
      baseDpr = Math.min(Math.max(rawDpr, 1.25), this.caps.isMobile ? 1.4 : 1.65);
    } else {
      baseDpr = Math.min(Math.max(rawDpr, 1.55), this.caps.isMobile ? 1.7 : 2.0);
    }

    let dprFactor = 1.0;
    let shadowsEnabled = this.config.shadowsEnabled && !this.caps.isSoftwareGl;
    let shadowRes: number = shadowsEnabled ? this.config.shadowResolution : 0;
    let postEnabled = this.config.postProcessingEnabled && !this.caps.isSoftwareGl && hasComposer;
    let bloomEnabled = this.config.bloomEnabled && postEnabled;
    let anisotropy = Math.min(this.caps.maxAnisotropy, this.config.anisotropyLevel);
    let viewDistanceChunks = this.caps.isSoftwareGl ? 1 : this.config.viewDistanceChunks;
    let particleDensity = this.caps.isSoftwareGl ? Math.min(0.45, this.config.particleDensity) : this.config.particleDensity;
    let maxLocalLights = this.caps.isSoftwareGl
      ? 2
      : this.caps.isMobile
        ? Math.min(3, this.config.maxLocalLights)
      : this.config.maxLocalLights;

    if (this.governorLevel >= 1) {
      dprFactor = 0.85;
      particleDensity = Math.max(0.3, particleDensity * 0.85);
    }
    if (this.governorLevel >= 2) {
      dprFactor = 0.72;
      bloomEnabled = false;
      postEnabled = false;
      particleDensity = Math.max(0.25, particleDensity * 0.65);
    }
    if (this.governorLevel >= 3) {
      dprFactor = 0.65;
      if (shadowRes > 1024) shadowRes = 1024;
      viewDistanceChunks = Math.max(1, viewDistanceChunks - 1);
      maxLocalLights = Math.max(2, maxLocalLights - 1);
    }
    if (this.governorLevel >= 4) {
      dprFactor = 0.6;
      shadowsEnabled = false;
      shadowRes = 0;
      anisotropy = 1;
      viewDistanceChunks = 1;
      particleDensity = 0.25;
      maxLocalLights = 2;
    }

    this.watchdogDprFactor = dprFactor;
    if (shadowRes > 0) {
      shadowRes = Math.min(this.caps.maxTextureDim, shadowRes);
    }

    const preset = this.config.preset;
    const chunkQuality: GraphicsQuality =
      this.governorLevel >= 4
        ? 'low'
        : preset === 'performance'
          ? 'low'
          : preset === 'balanced'
            ? 'medium'
            : preset === 'quality'
              ? 'high'
              : 'ultra';

    return {
      desiredDpr: baseDpr,
      watchdogDprFactor: dprFactor,
      shadowsEnabled,
      shadowResolution: shadowRes,
      shadowFrustumExtent: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 64 : preset === 'quality' ? 48 : 44,
      shadowBias: (preset === 'ultra_5x' || preset === 'absolute_realism') ? -0.00016 : preset === 'quality' ? -0.00022 : -0.00025,
      shadowNormalBias: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 0.022 : preset === 'quality' ? 0.028 : 0.03,
      postProcessingEnabled: postEnabled,
      bloomEnabled,
      bloomStrength: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 0.24 : 0.17,
      bloomRadius: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 0.45 : 0.36,
      bloomThreshold: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 0.86 : 0.91,
      sunShaftIntensity: (preset === 'ultra_5x' || preset === 'absolute_realism') ? 0.28 : preset === 'quality' ? 0.18 : 0.10,
      anisotropy,
      viewDistanceChunks,
      particleDensity,
      maxLocalLights,
      envIntensityMultiplier:
        preset === 'performance' ? 0.88 : preset === 'balanced' ? 0.98 : preset === 'quality' ? 1.05 : preset === 'absolute_realism' ? 1.22 : 1.18,
      sunIntensityMultiplier:
        preset === 'performance' ? 0.96 : preset === 'balanced' ? 1.0 : preset === 'quality' ? 1.04 : preset === 'absolute_realism' ? 1.15 : 1.12,
      fogDensityMultiplier:
        preset === 'performance' ? 1.12 : preset === 'balanced' ? 1.0 : preset === 'quality' ? 0.92 : preset === 'absolute_realism' ? 0.78 : 0.82,
      toneMappingExposure:
        preset === 'performance' ? 1.05 : preset === 'balanced' ? 1.08 : preset === 'quality' ? 1.10 : 1.13,
      chunkQuality,
    };
  }

  /**
   * Records frame timing and runs the smooth Anti-Lag Governor.
   * Returns true if effective visual configuration changed and needs re-application.
   */
  public recordFrameAndGovern(
    rawElapsedSec: number,
    frameWorkMs: number,
    isPaused: boolean
  ): { changed: boolean; emergencyTrimRequested: boolean } {
    const elapsedMs = Math.max(1, rawElapsedSec * 1000);
    this.lastFrameWorkMs = frameWorkMs;

    if (rawElapsedSec < 0.3) {
      const instFps = 1 / Math.max(0.004, rawElapsedSec);
      this.rollingFps = this.rollingFps * 0.9 + instFps * 0.1;
      this.avgFrameTimeMs = this.avgFrameTimeMs * 0.9 + elapsedMs * 0.1;

      this.frameTimeHistory.push(elapsedMs);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      if (this.frameTimeHistory.length >= 10) {
        const sorted = [...this.frameTimeHistory].sort((a, b) => a - b);
        this.p95FrameTimeMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
      }
      if (elapsedMs > 46 && !isPaused) {
        this.frameSpikeCount++;
        this.chunkCooldownFrames = Math.max(this.chunkCooldownFrames, 4);
      }
    }

    if (this.chunkCooldownFrames > 0) {
      this.chunkCooldownFrames--;
    }

    if (isPaused || this.caps.isSoftwareGl || !this.config.autoGovernor) {
      if (!this.config.autoGovernor) {
        this.governorState = 'manual';
        this.governorActionLabel = 'Manual Control';
      }
      return { changed: false, emergencyTrimRequested: false };
    }

    const targetFps = this.config.targetFps;
    const targetFrameMs = 1000 / targetFps;
    const minAcceptableFps = targetFps === 60 ? 40 : 22;
    const recoveryFps = targetFps === 60 ? 54 : 27;

    let changed = false;
    let emergencyTrimRequested = false;

    const isLagging = this.rollingFps < minAcceptableFps || this.p95FrameTimeMs > targetFrameMs * 2.15;
    if (isLagging) {
      this.recoveryTimer = 0;
      this.lowFpsTimer += rawElapsedSec;

      const stepThreshold = this.rollingFps < 18 ? 1.25 : 2.1;
      if (this.lowFpsTimer >= stepThreshold && this.governorLevel < 4) {
        this.lowFpsTimer = 0;
        this.governorLevel += 1;
        this.governorState = 'adapting_down';
        this.governorActionLabel = this.describeGovernorLevel(this.governorLevel);
        changed = true;
        if (this.governorLevel >= 3) {
          emergencyTrimRequested = true;
        }
      }
    } else {
      this.lowFpsTimer = Math.max(0, this.lowFpsTimer - rawElapsedSec * 0.6);

      if (this.governorLevel > 0) {
        const hasHeadroom = this.rollingFps >= recoveryFps && this.p95FrameTimeMs < targetFrameMs * 1.45;
        if (hasHeadroom) {
          this.recoveryTimer += rawElapsedSec;
          if (this.recoveryTimer >= 8.5) {
            this.recoveryTimer = 0;
            this.governorLevel = Math.max(0, this.governorLevel - 1);
            this.governorState = this.governorLevel === 0 ? 'optimal' : 'recovering';
            this.governorActionLabel = this.describeGovernorLevel(this.governorLevel);
            changed = true;
          }
        } else {
          this.recoveryTimer = Math.max(0, this.recoveryTimer - rawElapsedSec * 0.3);
          this.governorState = 'stabilized';
        }
      } else {
        this.governorState = 'optimal';
        this.governorActionLabel = 'Full Fidelity';
      }
    }

    return { changed, emergencyTrimRequested };
  }

  private describeGovernorLevel(level: number): string {
    switch (level) {
      case 0:
        return 'Full Fidelity';
      case 1:
        return 'Step 1 · Dynamic Scale 85%';
      case 2:
        return 'Step 2 · Post-FX & Particles Trimmed';
      case 3:
        return 'Step 3 · Shadows & Horizon Scaled';
      default:
        return 'Safe Mode · Anti-Crash Guard Active';
    }
  }

  /**
   * Prevents heavy synchronous terrain chunk generation during combat/frame-spike frames.
   */
  public shouldAllowChunkBuild(): boolean {
    if (this.chunkCooldownFrames > 0) return false;
    if (this.lastFrameWorkMs > 30) {
      this.chunkCooldownFrames = 2;
      return false;
    }
    return true;
  }

  /**
   * Recommends safe WebGLRenderTarget MSAA sample count to prevent GPU OOM crashes.
   */
  public getSafeComposerSamples(viewportWidth: number, viewportHeight: number, isWebGL2: boolean): number {
    if (!isWebGL2 || this.caps.isSoftwareGl || this.caps.isMobile) return 0;
    if (this.caps.deviceMemoryGb > 0 && this.caps.deviceMemoryGb <= 4) return 0;
    const maxPixels = viewportWidth * viewportHeight;
    if (maxPixels > 2560 * 1440) return 0;
    return 2;
  }

  /**
   * Schedules next frame using WebGL2 fenceSync (`afterDraw`) on software GL so CPU rendering never
   * starves the main thread, or requestAnimationFrame on hardware GPUs.
   */
  public scheduleNextFrame(
    tickFn: (timestamp?: number) => void,
    renderer: THREE.WebGLRenderer,
    isHidden: boolean
  ): void {
    this.cancelScheduledFrame();

    if (isHidden) {
      this.activeTimeoutId = window.setTimeout(() => tickFn(), 200);
      return;
    }

    if (!this.caps.isSoftwareGl) {
      this.activeRafId = requestAnimationFrame(tickFn);
      return;
    }

    // Software WebGL (SwiftShader / llvmpipe): fenceSync afterDraw pacing
    try {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          this.pendingSync = sync;
          this.fencePollGl = gl;
          const startedAt = performance.now();
          const pollFence = () => {
            if (this.pendingSync !== sync) return;
            let status: number = gl.UNSIGNALED;
            try {
              status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
            } catch {
              status = gl.SIGNALED;
            }
            const elapsed = performance.now() - startedAt;
            if (status === gl.SIGNALED || elapsed > 120) {
              try {
                gl.deleteSync(sync);
              } catch {}
              this.pendingSync = null;
              this.fencePollGl = null;
              this.activeRafId = requestAnimationFrame(tickFn);
            } else {
              this.activeFenceTimerId = window.setTimeout(pollFence, 12);
            }
          };
          this.activeFenceTimerId = window.setTimeout(pollFence, 16);
          return;
        }
      }
    } catch {
      // Fall back cleanly if fenceSync is unsupported
    }

    this.activeTimeoutId = window.setTimeout(() => tickFn(), 48);
  }

  public cancelScheduledFrame(): void {
    if (this.activeRafId) {
      cancelAnimationFrame(this.activeRafId);
      this.activeRafId = 0;
    }
    if (this.activeTimeoutId) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = 0;
    }
    if (this.activeFenceTimerId) {
      clearTimeout(this.activeFenceTimerId);
      this.activeFenceTimerId = 0;
    }
    if (this.pendingSync && this.fencePollGl) {
      try {
        this.fencePollGl.deleteSync(this.pendingSync);
      } catch {}
    }
    this.pendingSync = null;
    this.fencePollGl = null;
  }

  public handleContextLost(): void {
    this.contextLossCount += 1;
    this.contextHealth = 'recovering';
    this.cancelScheduledFrame();
    // Force emergency safe mode before restore so the context won't OOM again
    this.governorLevel = 4;
    this.governorState = 'adapting_down';
    this.governorActionLabel = 'Safe Mode · GPU Context Recovery';
    this.config = {
      ...this.config,
      preset: 'performance',
      shadowsEnabled: false,
      shadowResolution: 0,
      postProcessingEnabled: false,
      bloomEnabled: false,
      anisotropyLevel: 1,
      viewDistanceChunks: 1,
      renderScale: 0.75,
    };
    saveStoredGraphicsConfig(this.config);
  }

  public handleContextRestored(): void {
    this.contextHealth = 'safe_mode';
    this.lowFpsTimer = 0;
    this.recoveryTimer = 0;
  }

  /**
   * Flushes unused GPU caches, render lists, and over-provisioned chunks to eliminate lag & memory bloat.
   */
  public optimizeMemoryNow(
    renderer: THREE.WebGLRenderer,
    dirLight?: THREE.DirectionalLight
  ): { clearedGeometries: number; clearedTextures: number } {
    const beforeGeom = renderer.info.memory.geometries;
    const beforeTex = renderer.info.memory.textures;
    THREE.Cache.clear();
    renderer.renderLists.dispose();
    if (dirLight?.shadow?.map) {
      dirLight.shadow.map.dispose();
      dirLight.shadow.map = null as any;
    }
    return {
      clearedGeometries: beforeGeom,
      clearedTextures: beforeTex,
    };
  }

  public getSnapshot(
    renderer: THREE.WebGLRenderer,
    viewportWidth: number,
    viewportHeight: number,
    effective: GraphicsEffectiveTarget
  ): GraphicsManagerSnapshot {
    const dpr = renderer.getPixelRatio();
    const renderInfo = renderer.info.render;
    const memInfo = renderer.info.memory;
    return {
      preset: this.config.preset,
      autoGovernor: this.config.autoGovernor,
      targetFps: this.config.targetFps,
      fps: Math.round(this.rollingFps),
      frameTimeMs: Math.round(this.avgFrameTimeMs * 10) / 10,
      p95FrameTimeMs: Math.round(this.p95FrameTimeMs * 10) / 10,
      dpr,
      watchdogDprFactor: this.watchdogDprFactor,
      renderWidth: Math.round(viewportWidth * dpr),
      renderHeight: Math.round(viewportHeight * dpr),
      shadowMapRes: effective.shadowsEnabled ? effective.shadowResolution : 0,
      shadowsEnabled: effective.shadowsEnabled,
      postProcessingEnabled: effective.postProcessingEnabled,
      bloomEnabled: effective.bloomEnabled,
      anisotropy: effective.anisotropy,
      viewDistanceChunks: this.config.viewDistanceChunks,
      effectiveViewDistanceChunks: effective.viewDistanceChunks,
      particleDensity: effective.particleDensity,
      drawCalls: renderInfo.calls,
      triangles: renderInfo.triangles,
      geometries: memInfo.geometries,
      textures: memInfo.textures,
      isSoftwareGl: this.caps.isSoftwareGl,
      isMobile: this.caps.isMobile,
      gpuRendererName: this.caps.gpuRendererName,
      contextHealth: this.contextHealth,
      contextLossCount: this.contextLossCount,
      governorState: this.governorState,
      governorLevel: this.governorLevel,
      governorActionLabel: this.governorActionLabel,
      frameSpikeCount: this.frameSpikeCount,
      maxRenderBufferDim: this.caps.maxRenderBufferDim,
      maxTextureDim: this.caps.maxTextureDim,
    };
  }
}
