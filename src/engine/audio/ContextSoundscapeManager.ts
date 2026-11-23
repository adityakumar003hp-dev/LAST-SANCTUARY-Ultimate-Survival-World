/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { soundEngine } from '../../utils/audio';
import { WeatherType } from '../../types/game';

export type TimeOfDayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface SoundscapeMetrics {
  phase: TimeOfDayPhase;
  windIntensity: number;
  riverProximity: number;
  cicadaActivity: number;
  cricketActivity: number;
  isUnderground: boolean;
}

export class ContextSoundscapeManager {
  private isInitialized = false;
  private isDisposed = false;

  // Web Audio Context & Continuous Sound Bed Nodes
  private ctx: AudioContext | null = null;
  private masterAmbientGain: GainNode | null = null;
  private bunkerFilter: BiquadFilterNode | null = null;

  // 1. Wind & Atmospheric Bed
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // 2. Nocturnal Sub-bass Drone
  private nightSubOsc: OscillatorNode | null = null;
  private nightSubFilter: BiquadFilterNode | null = null;
  private nightSubGain: GainNode | null = null;

  // 3. Daytime Cicada Ambient Bed
  private cicadaBedSource: AudioBufferSourceNode | null = null;
  private cicadaBedFilter: BiquadFilterNode | null = null;
  private cicadaBedGain: GainNode | null = null;

  // 4. Dusk/Night Cricket Ambient Bed
  private cricketOsc1: OscillatorNode | null = null;
  private cricketOsc2: OscillatorNode | null = null;
  private cricketGain: GainNode | null = null;

  // 5. River Flowing Water Bed
  private riverSource: AudioBufferSourceNode | null = null;
  private riverFilter: BiquadFilterNode | null = null;
  private riverGain: GainNode | null = null;

  // 6. Underground Bunker Hum
  private bunkerHumOsc: OscillatorNode | null = null;
  private bunkerHumGain: GainNode | null = null;

  // Stochastic Micro-Event Timers
  private birdTimer = 3.0;
  private insectTimer = 4.0;
  private owlTimer = 18.0;
  private predatorHowlTimer = 35.0;
  private frogTimer = 10.0;
  private windGustTimer = 14.0;
  private foliageTimer = 12.0;
  private distantDinoTimer = 25.0;

  // Current Metrics
  public metrics: SoundscapeMetrics = {
    phase: 'day',
    windIntensity: 0.1,
    riverProximity: 0,
    cicadaActivity: 0,
    cricketActivity: 0,
    isUnderground: false,
  };

  constructor() {
    // Lazily initialized on first user interaction or engine update
  }

  private initAudioNodes() {
    if (this.isInitialized || this.isDisposed) return;
    const ctx = soundEngine.getContext();
    const parentAmbientGain = soundEngine.getAmbientGain();
    if (!ctx || !parentAmbientGain) return;

    this.ctx = ctx;

    try {
      // Intermediate master gain for soundscape
      this.masterAmbientGain = ctx.createGain();
      this.masterAmbientGain.gain.setValueAtTime(1.0, ctx.currentTime);

      // Bunker occlusion lowpass filter (open at 18000Hz when above ground, drops to 220Hz underground)
      this.bunkerFilter = ctx.createBiquadFilter();
      this.bunkerFilter.type = 'lowpass';
      this.bunkerFilter.frequency.setValueAtTime(18000, ctx.currentTime);
      this.bunkerFilter.Q.setValueAtTime(0.7, ctx.currentTime);

      this.masterAmbientGain.connect(this.bunkerFilter);
      this.bunkerFilter.connect(parentAmbientGain);

      // --- A. Continuous Wind Bed ---
      const windBuffer = this.createPinkNoiseBuffer(ctx, 4.0);
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = windBuffer;
      this.windSource.loop = true;

      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(700, ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.2, ctx.currentTime);

      this.windGain = ctx.createGain();
      this.windGain.gain.setValueAtTime(0.08, ctx.currentTime);

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterAmbientGain);
      this.windSource.start();

      // --- B. Nocturnal Sub-bass Drone ---
      this.nightSubOsc = ctx.createOscillator();
      this.nightSubOsc.type = 'sawtooth';
      this.nightSubOsc.frequency.setValueAtTime(54, ctx.currentTime);

      this.nightSubFilter = ctx.createBiquadFilter();
      this.nightSubFilter.type = 'lowpass';
      this.nightSubFilter.frequency.setValueAtTime(125, ctx.currentTime);

      this.nightSubGain = ctx.createGain();
      this.nightSubGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.nightSubOsc.connect(this.nightSubFilter);
      this.nightSubFilter.connect(this.nightSubGain);
      this.nightSubGain.connect(this.masterAmbientGain);
      this.nightSubOsc.start();

      // --- C. Daytime Cicada Bed ---
      const cicadaBuffer = this.createCicadaLoopBuffer(ctx, 3.0);
      this.cicadaBedSource = ctx.createBufferSource();
      this.cicadaBedSource.buffer = cicadaBuffer;
      this.cicadaBedSource.loop = true;

      this.cicadaBedFilter = ctx.createBiquadFilter();
      this.cicadaBedFilter.type = 'bandpass';
      this.cicadaBedFilter.frequency.setValueAtTime(4300, ctx.currentTime);
      this.cicadaBedFilter.Q.setValueAtTime(4.0, ctx.currentTime);

      this.cicadaBedGain = ctx.createGain();
      this.cicadaBedGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.cicadaBedSource.connect(this.cicadaBedFilter);
      this.cicadaBedFilter.connect(this.cicadaBedGain);
      this.cicadaBedGain.connect(this.masterAmbientGain);
      this.cicadaBedSource.start();

      // --- D. Night Cricket Bed ---
      this.cricketOsc1 = ctx.createOscillator();
      this.cricketOsc2 = ctx.createOscillator();
      this.cricketOsc1.type = 'sine';
      this.cricketOsc2.type = 'sine';
      this.cricketOsc1.frequency.setValueAtTime(4850, ctx.currentTime);
      this.cricketOsc2.frequency.setValueAtTime(5200, ctx.currentTime);

      this.cricketGain = ctx.createGain();
      this.cricketGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.cricketOsc1.connect(this.cricketGain);
      this.cricketOsc2.connect(this.cricketGain);
      this.cricketGain.connect(this.masterAmbientGain);
      this.cricketOsc1.start();
      this.cricketOsc2.start();

      // --- E. River Flowing Water Bed ---
      const riverBuffer = this.createPinkNoiseBuffer(ctx, 3.5);
      this.riverSource = ctx.createBufferSource();
      this.riverSource.buffer = riverBuffer;
      this.riverSource.loop = true;

      this.riverFilter = ctx.createBiquadFilter();
      this.riverFilter.type = 'bandpass';
      this.riverFilter.frequency.setValueAtTime(950, ctx.currentTime);
      this.riverFilter.Q.setValueAtTime(1.4, ctx.currentTime);

      this.riverGain = ctx.createGain();
      this.riverGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.riverSource.connect(this.riverFilter);
      this.riverFilter.connect(this.riverGain);
      this.riverGain.connect(this.masterAmbientGain);
      this.riverSource.start();

      // --- F. Underground Bunker Hum ---
      this.bunkerHumOsc = ctx.createOscillator();
      this.bunkerHumOsc.type = 'triangle';
      this.bunkerHumOsc.frequency.setValueAtTime(60, ctx.currentTime);

      this.bunkerHumGain = ctx.createGain();
      this.bunkerHumGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.bunkerHumOsc.connect(this.bunkerHumGain);
      this.bunkerHumGain.connect(parentAmbientGain); // bypass outdoor bunkerFilter
      this.bunkerHumOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Could not initialize ContextSoundscapeManager nodes yet:', e);
    }
  }

  // --- Buffer Generators ---
  private createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createCicadaLoopBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 13.5);
      output[i] = (Math.random() * 2 - 1) * pulse * 0.35;
    }
    return buffer;
  }

  // --- Main Per-Frame Update ---
  public update(
    delta: number,
    gameTimeMinutes: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    biomeId = 'green_plains',
    weatherType: WeatherType = 'clear'
  ) {
    if (this.isDisposed) return;
    if (!this.isInitialized) {
      this.initAudioNodes();
      if (!this.isInitialized) return;
    }

    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const hour = (gameTimeMinutes / 60) % 24;
    const isUnderground = playerPos.y < -2.0;

    // 1. Determine Time-of-Day Phase
    let phase: TimeOfDayPhase = 'day';
    if (hour >= 5.0 && hour < 8.0) phase = 'dawn';
    else if (hour >= 8.0 && hour < 17.5) phase = 'day';
    else if (hour >= 17.5 && hour < 21.0) phase = 'dusk';
    else phase = 'night';

    this.metrics.phase = phase;
    this.metrics.isUnderground = isUnderground;

    const now = ctx.currentTime;
    const rampTime = now + 0.3;

    // 2. Underground Occlusion Filter
    if (this.bunkerFilter) {
      const targetCutoff = isUnderground ? 220 : 18000;
      this.bunkerFilter.frequency.setTargetAtTime(targetCutoff, now, 0.4);
    }

    if (this.bunkerHumGain) {
      const targetHum = isUnderground ? 0.08 : 0.0;
      this.bunkerHumGain.gain.setTargetAtTime(targetHum, now, 0.3);
    }

    // 3. Modulate Continuous Wind Bed
    if (this.windFilter && this.windGain) {
      let targetWindFreq = 700;
      let targetWindVol = 0.08;

      if (phase === 'dawn') {
        targetWindFreq = 850;
        targetWindVol = 0.06;
      } else if (phase === 'day') {
        targetWindFreq = biomeId === 'green_plains' ? 750 : 620;
        targetWindVol = 0.09;
      } else if (phase === 'dusk') {
        targetWindFreq = 420;
        targetWindVol = 0.11;
      } else {
        // Night: deep rumble + higher tension
        targetWindFreq = 180;
        targetWindVol = 0.13;
      }

      if (weatherType === 'thunderstorm' || weatherType === 'blizzard' || weatherType === 'sandstorm') {
        targetWindFreq = 1150;
        targetWindVol = 0.22;
      } else if (weatherType === 'rain') {
        targetWindFreq = 980;
        targetWindVol = 0.15;
      } else if (weatherType === 'toxic_fog') {
        targetWindFreq = 260;
        targetWindVol = 0.11;
      }

      this.windFilter.frequency.setTargetAtTime(targetWindFreq, now, 0.5);
      this.windGain.gain.setTargetAtTime(targetWindVol, now, 0.5);
      this.metrics.windIntensity = targetWindVol;
    }

    // 4. Modulate Nocturnal Sub-bass Drone
    if (this.nightSubGain) {
      let targetNightDrone = 0.0;
      if (phase === 'night') {
        targetNightDrone = 0.075;
      } else if (phase === 'dusk') {
        targetNightDrone = 0.025;
      }
      this.nightSubGain.gain.setTargetAtTime(targetNightDrone, now, 0.8);
    }

    // 5. Modulate Cicadas (Daytime warm-weather insects; suppressed in heavy storms)
    if (this.cicadaBedGain) {
      let cicadaVol = 0.0;
      const calmWeather = weatherType === 'clear' || weatherType === 'rain';
      if (hour >= 10.0 && hour <= 17.0 && !isUnderground && calmWeather) {
        // Peak during afternoon sun
        const peakT = 1.0 - Math.abs(hour - 13.5) / 3.5;
        cicadaVol = Math.max(0, peakT) * (biomeId === 'green_plains' ? 0.065 : 0.045) * (weatherType === 'rain' ? 0.35 : 1);
      }
      this.cicadaBedGain.gain.setTargetAtTime(cicadaVol, now, 0.6);
      this.metrics.cicadaActivity = cicadaVol;
    }

    // 6. Modulate Crickets (Dusk & Night insects)
    if (this.cricketGain) {
      let cricketVol = 0.0;
      if ((phase === 'dusk' || phase === 'night') && !isUnderground) {
        if (phase === 'dusk') {
          cricketVol = 0.035;
        } else {
          cricketVol = biomeId === 'abandoned_city' ? 0.02 : 0.065;
        }
      }
      this.cricketGain.gain.setTargetAtTime(cricketVol, now, 0.6);
      this.metrics.cricketActivity = cricketVol;
    }

    // 7. Modulate River Water Stream Bed by Player Proximity
    if (this.riverGain) {
      // River centerline is x = 50 + sin(z * 0.004) * 45
      const riverCenter = 50 + Math.sin(playerPos.z * 0.004) * 45;
      const distToRiver = Math.abs(playerPos.x - riverCenter);
      let riverVol = 0.0;

      if (distToRiver < 55.0 && !isUnderground) {
        const proximity = 1.0 - distToRiver / 55.0;
        riverVol = proximity * proximity * 0.16;
        this.metrics.riverProximity = proximity;
      } else {
        this.metrics.riverProximity = 0;
      }

      this.riverGain.gain.setTargetAtTime(riverVol, now, 0.3);
    }

    // 8. Stochastic Natural Micro-Events
    if (!isUnderground) {
      this.updateStochasticEvents(delta, hour, phase, playerPos, playerYaw, biomeId);
    }
  }

  // --- Stochastic Ecological Audio Events Dispatcher ---
  private updateStochasticEvents(
    delta: number,
    hour: number,
    phase: TimeOfDayPhase,
    playerPos: THREE.Vector3,
    playerYaw: number,
    biomeId: string
  ) {
    // A. Dawn Chorus Songbirds & Daytime Canopy Birds
    this.birdTimer -= delta;
    if (this.birdTimer <= 0) {
      if (phase === 'dawn') {
        // High frequency melodious dawn chorus
        const pan = (Math.random() * 2 - 1) * 0.8;
        const pitchMod = 0.85 + Math.random() * 0.35;
        soundEngine.playSongbirdWarble(pan, pitchMod);
        this.birdTimer = 2.5 + Math.random() * 3.5;
      } else if (phase === 'day') {
        const pan = (Math.random() * 2 - 1) * 0.8;
        soundEngine.playSongbirdWarble(pan, 0.95 + Math.random() * 0.2);
        this.birdTimer = 6.0 + Math.random() * 8.0;
      } else {
        this.birdTimer = 15.0; // Birds rest at dusk & night
      }
    }

    // B. Cicada Bursts & Grasshopper Surges
    this.insectTimer -= delta;
    if (this.insectTimer <= 0) {
      if (phase === 'day' && hour >= 10.5 && hour <= 16.5) {
        const pan = (Math.random() * 2 - 1) * 0.7;
        soundEngine.playCicadaBuzz(1.8 + Math.random() * 1.5, pan);
        this.insectTimer = 4.0 + Math.random() * 6.0;
      } else if (phase === 'dusk' || phase === 'night') {
        const pan = (Math.random() * 2 - 1) * 0.8;
        soundEngine.playCricketChirp(pan);
        this.insectTimer = 3.5 + Math.random() * 5.0;
      } else {
        this.insectTimer = 8.0;
      }
    }

    // C. Nocturnal Owl Hoots
    this.owlTimer -= delta;
    if (this.owlTimer <= 0) {
      if (phase === 'night') {
        const pan = (Math.random() * 2 - 1) * 0.75;
        soundEngine.playOwlHoot(pan);
        this.owlTimer = 16.0 + Math.random() * 20.0;
      } else {
        this.owlTimer = 25.0;
      }
    }

    // D. Distant Wolf Pack & Nocturnal Predator Echoes
    this.predatorHowlTimer -= delta;
    if (this.predatorHowlTimer <= 0) {
      if (phase === 'night' || phase === 'dusk') {
        const pan = (Math.random() * 2 - 1) * 0.85;
        soundEngine.playWolfHowl(pan, true);
        this.predatorHowlTimer = 28.0 + Math.random() * 35.0;
      } else {
        this.predatorHowlTimer = 45.0;
      }
    }

    // E. Wetland / Riverbank Bullfrog Croaks
    this.frogTimer -= delta;
    if (this.frogTimer <= 0) {
      if ((phase === 'dusk' || phase === 'night') && this.metrics.riverProximity > 0.15) {
        const pan = (Math.random() * 2 - 1) * 0.6;
        soundEngine.playFrogCroak(pan);
        this.frogTimer = 7.0 + Math.random() * 12.0;
      } else {
        this.frogTimer = 14.0;
      }
    }

    // F. Gentle Wind Gusts & Tree Foliage Rustle
    this.windGustTimer -= delta;
    if (this.windGustTimer <= 0) {
      const pan = (Math.random() * 2 - 1) * 0.6;
      const intensity = 0.4 + Math.random() * 0.5;
      soundEngine.playWindGust(pan, intensity);
      this.windGustTimer = 12.0 + Math.random() * 16.0;
    }

    this.foliageTimer -= delta;
    if (this.foliageTimer <= 0) {
      if (biomeId === 'dense_forest' || biomeId === 'green_plains') {
        const pan = (Math.random() * 2 - 1) * 0.7;
        soundEngine.playFoliageRustle(pan);
      }
      this.foliageTimer = 10.0 + Math.random() * 15.0;
    }

    // G. Distant Territorial Dinosaur Trumpets / Calls Across Valley
    this.distantDinoTimer -= delta;
    if (this.distantDinoTimer <= 0) {
      const pan = (Math.random() * 2 - 1) * 0.9;
      // Echoing distant herbivore or carnosaur vocalization
      const isCarnivore = Math.random() > 0.6;
      if (isCarnivore) {
        soundEngine.playSpatialCreatureRoar(
          { x: playerPos.x + pan * 80, y: playerPos.y + 10, z: playerPos.z + (Math.random() > 0.5 ? 75 : -75) },
          playerPos,
          playerYaw,
          phase === 'night' ? 52 : 72,
          1.8,
          phase === 'night',
          phase === 'dusk',
          true
        );
      } else {
        soundEngine.playSpatialCreatureCall(
          { x: playerPos.x + pan * 70, y: playerPos.y + 5, z: playerPos.z + (Math.random() > 0.5 ? 65 : -65) },
          playerPos,
          playerYaw,
          false,
          phase === 'dawn' ? 380 : 260,
          phase === 'night'
        );
      }
      this.distantDinoTimer = 22.0 + Math.random() * 32.0;
    }
  }

  public dispose() {
    this.isDisposed = true;
    try {
      this.windSource?.stop();
      this.cicadaBedSource?.stop();
      this.riverSource?.stop();
      this.nightSubOsc?.stop();
      this.cricketOsc1?.stop();
      this.cricketOsc2?.stop();
      this.bunkerHumOsc?.stop();
    } catch {}

    try {
      this.windSource?.disconnect();
      this.windFilter?.disconnect();
      this.windGain?.disconnect();

      this.nightSubOsc?.disconnect();
      this.nightSubFilter?.disconnect();
      this.nightSubGain?.disconnect();

      this.cicadaBedSource?.disconnect();
      this.cicadaBedFilter?.disconnect();
      this.cicadaBedGain?.disconnect();

      this.cricketOsc1?.disconnect();
      this.cricketOsc2?.disconnect();
      this.cricketGain?.disconnect();

      this.riverSource?.disconnect();
      this.riverFilter?.disconnect();
      this.riverGain?.disconnect();

      this.bunkerHumOsc?.disconnect();
      this.bunkerHumGain?.disconnect();

      this.bunkerFilter?.disconnect();
      this.masterAmbientGain?.disconnect();
    } catch {}
  }
}
