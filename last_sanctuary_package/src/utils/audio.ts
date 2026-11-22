/**
 * Procedural Web Audio API Sound Synthesizer
 * Zero external audio files, zero 404s, ultra-responsive audio cues.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isNightDronePlaying: boolean = false;
  private ambientOsc: OscillatorNode | null = null;

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.initContext();
    if (!this.masterGain || !this.sfxGain || !this.musicGain || !this.ctx) return;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : Math.max(0, Math.min(1, master)), this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, music)), this.ctx.currentTime);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolumes(0.7, 0.8, 0.4);
    return this.isMuted;
  }

  // --- Sound Effects ---

  public playFootstep(isWood: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const t = this.ctx.currentTime;
    osc.type = isWood ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isWood ? 140 : 80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playChopWood() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playMineRock() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playBuildSnap() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(320, t);
    osc1.frequency.exponentialRampToValueAtTime(560, t + 0.14);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(160, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.15);
    osc2.stop(t + 0.15);
  }

  public playGateToggle(isOpen: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isOpen ? 120 : 180, t);
    osc.frequency.exponentialRampToValueAtTime(isOpen ? 220 : 80, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  public playZombieGrowl() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, t);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  public playHurt() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playPropPush(isHeavy: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = isHeavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 90 : 130, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playPropImpact() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playShockDischarge() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playCrossbowShot() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playTurretShot(distToPlayer = 0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const falloff = Math.max(0.12, Math.min(1.0, 1.0 - distToPlayer / 65));

    // 1. Sharp supersonic crack (punchy noise burst)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45 * falloff, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    whiteNoise.start(t);

    // 2. Heavy ballistic thud (low oscillator dive)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    oscGain.gain.setValueAtTime(0.4 * falloff, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playTurretLock() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.setValueAtTime(1650, t + 0.04);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playDuskWarningHorn() {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    const t = this.ctx.currentTime;
    // Low ominous brass warhorn
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(82.4, t); // E2
    osc1.frequency.linearRampToValueAtTime(73.4, t + 2.5); // D2

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(123.5, t); // B2

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.9);
    osc2.stop(t + 2.9);
  }

  public playDawnVictoryChime() {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(startTime);
      osc.stop(startTime + 1.2);
    });
  }

  public playVehicleHorn() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(370, t);
    osc2.frequency.setValueAtTime(440, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  public playUIClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public updateNightAmbience(isNight: boolean) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;

    if (isNight && !this.isNightDronePlaying) {
      this.isNightDronePlaying = true;
      try {
        this.ambientOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        this.ambientOsc.type = 'sawtooth';
        this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 3);

        this.ambientOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientGain);

        this.ambientOsc.start();
      } catch {
        // Safe fallback
      }
    } else if (!isNight && this.isNightDronePlaying) {
      this.isNightDronePlaying = false;
      if (this.ambientOsc) {
        try {
          this.ambientOsc.stop(this.ctx.currentTime + 1);
        } catch {
          // ignore
        }
        this.ambientOsc = null;
      }
    }
  }

  // --- Cinematic Prologue Procedural Audio ---

  public playMeteorRumble(durationSeconds = 4.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + durationSeconds * 0.7);
    osc.frequency.exponentialRampToValueAtTime(30, t + durationSeconds);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, t);
    filter.frequency.linearRampToValueAtTime(220, t + durationSeconds * 0.5);
    filter.frequency.exponentialRampToValueAtTime(60, t + durationSeconds);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + durationSeconds * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSeconds);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + durationSeconds);
  }

  public playMeteorExplosion() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Sub-bass detonation thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 1.2);
    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 1.5);

    // Shockwave noise burst
    const bufferSize = this.ctx.sampleRate * 2.0;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 2.0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    whiteNoise.start(t);
  }

  public playEmergencySiren() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    // Oscillate between 650Hz and 950Hz
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(950, t + 1.0);
    osc.frequency.linearRampToValueAtTime(650, t + 2.0);
    osc.frequency.linearRampToValueAtTime(950, t + 3.0);
    osc.frequency.linearRampToValueAtTime(650, t + 4.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 4.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 4.2);
  }

  public playRadioStatic(duration = 1.8) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (0.4 + 0.6 * Math.sin(i * 0.05));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(t);
  }

  public playVaultDoorThud() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Heavy iron impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);

    // Mechanical latch click
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t2 = this.ctx.currentTime;
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(450, t2);
      clickOsc.frequency.exponentialRampToValueAtTime(120, t2 + 0.08);
      clickGain.gain.setValueAtTime(0.25, t2);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.09);
      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(t2);
      clickOsc.stop(t2 + 0.09);
    }, 180);
  }

  public playPeacefulChirp() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.linearRampToValueAtTime(3200, t + 0.08);
    osc.frequency.linearRampToValueAtTime(2600, t + 0.15);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playDialogueBeep() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620 + Math.random() * 80, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- Dynamic Ecosystem & Living Creature Synthesizer ---
  public playCreatureRoar(baseFreq = 65, duration = 1.4) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + duration * 0.3);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 2.5, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playCreatureCall(isBird = false, freq = 350) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isBird ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(freq * 1.35, t + 0.08);
    osc.frequency.linearRampToValueAtTime(freq * 0.9, t + 0.22);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playMatingTrill() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);
      gain.gain.setValueAtTime(0.01, st);
      gain.gain.linearRampToValueAtTime(0.12, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.35);
    });
  }

  public playBiteImpact() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playAnimalGrazing() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.08);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playCinematicSwell(duration = 3.5) {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const chords = [130.81, 164.81, 196.00, 261.63]; // C3 Major warm cinematic pad
    chords.forEach((freq) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.linearRampToValueAtTime(900, t + duration * 0.6);
      filter.frequency.linearRampToValueAtTime(300, t + duration);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // --- Context & Gain Getters for Soundscape Systems ---
  public getContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    this.initContext();
    return this.masterGain;
  }

  public getAmbientGain(): GainNode | null {
    this.initContext();
    return this.ambientGain;
  }

  public getSfxGain(): GainNode | null {
    this.initContext();
    return this.sfxGain;
  }

  // --- Spatial Positioning & Pan Calculation ---
  public calculateSpatial(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number
  ): { distance: number; attenuation: number; pan: number } {
    const dx = sourcePos.x - listenerPos.x;
    const dz = sourcePos.z - listenerPos.z;
    const distance = Math.hypot(dx, dz);
    const attenuation = Math.max(0, Math.min(1, 1.0 / (1.0 + distance * 0.045)));

    const worldAngle = Math.atan2(dx, dz);
    const relAngle = worldAngle - listenerYaw;
    const pan = Math.max(-1, Math.min(1, Math.sin(relAngle)));

    return { distance, attenuation, pan };
  }

  public connectSpatialNode(node: AudioNode, pan: number, targetGain: GainNode) {
    if (!this.ctx) return;
    if (typeof this.ctx.createStereoPanner === 'function') {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, this.ctx.currentTime);
        node.connect(panner);
        panner.connect(targetGain);
        return;
      } catch {
        // Fallback to direct connection
      }
    }
    node.connect(targetGain);
  }

  // --- Context-Aware Spatial Wildlife Audio ---
  public playSpatialCreatureRoar(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number,
    baseFreq = 65,
    duration = 1.4,
    isNight = false,
    isDusk = false,
    isApex = false
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const { distance, attenuation, pan } = this.calculateSpatial(sourcePos, listenerPos, listenerYaw);
    if (distance > 90 || attenuation < 0.01) return;

    let effectivePitch = baseFreq;
    let effectiveDuration = duration;
    if (isNight) {
      effectivePitch = baseFreq * (isApex ? 0.72 : 0.82);
      effectiveDuration = duration * 1.35;
    } else if (isDusk) {
      effectivePitch = baseFreq * 0.90;
      effectiveDuration = duration * 1.15;
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isApex ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(effectivePitch, t);
    osc.frequency.exponentialRampToValueAtTime(effectivePitch * 1.5, t + effectiveDuration * 0.25);
    osc.frequency.exponentialRampToValueAtTime(effectivePitch * 0.7, t + effectiveDuration);

    filter.type = isNight ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(effectivePitch * (isNight ? 2.2 : 2.8), t);
    filter.Q.setValueAtTime(isNight ? 4.0 : 3.0, t);

    const maxVol = (isApex ? 0.45 : 0.32) * attenuation;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(maxVol, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + effectiveDuration);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.sfxGain);

    osc.start(t);
    osc.stop(t + effectiveDuration);

    // Deep sub-bass chest rumble for nocturnal/apex hunters
    if (isNight || isApex) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(effectivePitch * 0.55, t);
      subOsc.frequency.exponentialRampToValueAtTime(35, t + effectiveDuration * 0.8);
      subGain.gain.setValueAtTime(0.01, t);
      subGain.gain.linearRampToValueAtTime(maxVol * 0.7, t + 0.18);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + effectiveDuration * 0.9);
      subOsc.connect(subGain);
      this.connectSpatialNode(subGain, pan, this.sfxGain);
      subOsc.start(t);
      subOsc.stop(t + effectiveDuration);
    }
  }

  public playSpatialCreatureCall(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number,
    isBird = false,
    freq = 350,
    isNight = false
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const { distance, attenuation, pan } = this.calculateSpatial(sourcePos, listenerPos, listenerYaw);
    if (distance > 75 || attenuation < 0.01) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const effectivePitch = isNight ? freq * 1.35 : freq;
    const duration = isNight ? 0.16 : 0.28;

    osc.type = isBird ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(effectivePitch, t);
    osc.frequency.linearRampToValueAtTime(effectivePitch * 1.35, t + duration * 0.35);
    osc.frequency.linearRampToValueAtTime(effectivePitch * 0.9, t + duration * 0.85);

    const maxVol = 0.2 * attenuation;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(maxVol, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    this.connectSpatialNode(gain, pan, this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playSpatialAnimalGrazing(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const { distance, attenuation, pan } = this.calculateSpatial(sourcePos, listenerPos, listenerYaw);
    if (distance > 32 || attenuation < 0.01) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);

    gain.gain.setValueAtTime(0.06 * attenuation, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playSpatialMatingTrill(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number,
    isNight = false
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const { distance, attenuation, pan } = this.calculateSpatial(sourcePos, listenerPos, listenerYaw);
    if (distance > 48 || attenuation < 0.01) return;

    const t = this.ctx.currentTime;
    const freqs = isNight ? [392, 493.88, 587.33, 783.99] : [440, 554.37, 659.25, 880];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);
      gain.gain.setValueAtTime(0.01, st);
      gain.gain.linearRampToValueAtTime(0.12 * attenuation, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      osc.connect(gain);
      this.connectSpatialNode(gain, pan, this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.35);
    });
  }

  public playSpatialBiteImpact(
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    listenerYaw: number
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const { distance, attenuation, pan } = this.calculateSpatial(sourcePos, listenerPos, listenerYaw);
    if (distance > 45 || attenuation < 0.01) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(0.35 * attenuation, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    this.connectSpatialNode(gain, pan, this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // --- Procedural Environmental Natural Audio Synthesizers ---
  public playSongbirdWarble(pan = 0, pitchMod = 1.0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const baseFreqs = [2200, 2900, 2450, 3300].map(f => f * pitchMod * (0.95 + Math.random() * 0.1));
    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      osc.frequency.linearRampToValueAtTime(freq * 1.15, st + 0.04);
      osc.frequency.linearRampToValueAtTime(freq * 0.95, st + 0.08);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.06, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.09);

      osc.connect(gain);
      this.connectSpatialNode(gain, pan, this.ambientGain);
      osc.start(st);
      osc.stop(st + 0.1);
    });
  }

  public playCicadaBuzz(duration = 2.4, pan = 0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      const pulse = 0.5 + 0.5 * Math.sin((i / this.ctx.sampleRate) * 2 * Math.PI * 14);
      data[i] = (Math.random() * 2 - 1) * env * pulse;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200, t);
    filter.Q.setValueAtTime(4.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.ambientGain);
    source.start(t);
  }

  public playCricketChirp(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    [0, 0.08, 0.16].forEach((offset) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + offset;

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(4750, st);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(5150, st);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.045, st + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.055);

      osc1.connect(gain);
      osc2.connect(gain);
      this.connectSpatialNode(gain, pan, this.ambientGain);
      osc1.start(st);
      osc1.stop(st + 0.06);
      osc2.start(st);
      osc2.stop(st + 0.06);
    });
  }

  public playOwlHoot(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const notes = [
      { freq: 320, start: 0, dur: 0.45 },
      { freq: 285, start: 0.65, dur: 0.75 },
    ];
    notes.forEach((n) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const st = t + n.start;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, st);
      osc.frequency.exponentialRampToValueAtTime(n.freq * 0.92, st + n.dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, st);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.08, st + n.dur * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      this.connectSpatialNode(gain, pan, this.ambientGain);
      osc.start(st);
      osc.stop(st + n.dur);
    });
  }

  public playWolfHowl(pan = 0, isDistant = true) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const dur = 3.6;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.linearRampToValueAtTime(480, t + 1.2);
    osc.frequency.linearRampToValueAtTime(510, t + 2.2);
    osc.frequency.exponentialRampToValueAtTime(210, t + dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.Q.setValueAtTime(2.0, t);

    const maxVol = isDistant ? 0.07 : 0.14;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(maxVol, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.ambientGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  public playFrogCroak(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const st = t + offset;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(175, st);
      osc.frequency.exponentialRampToValueAtTime(95, st + 0.1);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, st);
      filter.Q.setValueAtTime(4.0, st);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.05, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      this.connectSpatialNode(gain, pan, this.ambientGain);
      osc.start(st);
      osc.stop(st + 0.11);
    });
  }

  public playFoliageRustle(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const dur = 1.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(1200, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(600, t + dur);
    filter.Q.setValueAtTime(1.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.04, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    source.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.ambientGain);
    source.start(t);
  }

  public playWindGust(pan = 0, intensity = 0.5) {
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const dur = 2.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.linearRampToValueAtTime(600 * intensity + 200, t + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(180, t + dur);

    const gain = this.ctx.createGain();
    const maxVol = 0.08 * intensity;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(maxVol, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    source.connect(filter);
    filter.connect(gain);
    this.connectSpatialNode(gain, pan, this.ambientGain);
    source.start(t);
  }

  // --- Train Audio Simulation ---
  public playTrainHorn(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const dur = 2.2;

    // Classic dual-tone locomotive diesel air horn (Eb4 311Hz + F#4 370Hz + Bb4 466Hz)
    const freqs = [311.1, 369.9, 466.1];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      // Slight pitch droop characteristic of air horns
      osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + dur);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);

      const vol = 0.14 / (idx + 1);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.08);
      gain.gain.setValueAtTime(vol * 0.9, t + dur - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      this.connectSpatialNode(gain, pan, this.sfxGain!);
      osc.start(t);
      osc.stop(t + dur);
    });

    // Air blast rush
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 1.5));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(800, t);
    nFilter.Q.setValueAtTime(1.5, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.05, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    this.connectSpatialNode(nGain, pan, this.sfxGain);
    noise.start(t);
  }

  public playTrainBrakes(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const dur = 1.4;

    // High metal friction squeal
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, t);
    osc.frequency.linearRampToValueAtTime(1900, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    this.connectSpatialNode(gain, pan, this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);

    // Pneumatic air hiss release
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const hiss = this.ctx.createBufferSource();
    hiss.buffer = noiseBuffer;
    const hFilter = this.ctx.createBiquadFilter();
    hFilter.type = 'highpass';
    hFilter.frequency.setValueAtTime(2400, t);
    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.08, t);
    hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    hiss.connect(hFilter);
    hFilter.connect(hGain);
    this.connectSpatialNode(hGain, pan, this.sfxGain);
    hiss.start(t);
  }

  public playStationChime(pan = 0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Ascending major chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.22);
      gain.gain.setValueAtTime(0.001, t + idx * 0.22);
      gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.22 + 0.8);
      osc.connect(gain);
      this.connectSpatialNode(gain, pan, this.sfxGain!);
      osc.start(t + idx * 0.22);
      osc.stop(t + idx * 0.22 + 0.8);
    });
  }
}

export const soundEngine = new SoundEngine();
