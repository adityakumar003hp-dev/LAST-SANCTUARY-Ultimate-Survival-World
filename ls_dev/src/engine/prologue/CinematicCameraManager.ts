import * as THREE from 'three';

export type CameraTrackMode =
  | 'none'
  | 'town_establishing'
  | 'apartment_approach'
  | 'sky_observation'
  | 'meteor_track'
  | 'impact_view'
  | 'open_world_reveal'
  | 'shelter_seal'
  | 'friends_meet'
  | 'highway_overlook';

export class CinematicCameraManager {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraTrackMode = 'none';
  public isCinematicActive: boolean = false;
  private trackTimer: number = 0;
  private duration: number = 5.0;

  private currentPos: THREE.Vector3 = new THREE.Vector3();
  private targetPos: THREE.Vector3 = new THREE.Vector3();
  private startLook: THREE.Vector3 = new THREE.Vector3();
  private lookTarget: THREE.Vector3 = new THREE.Vector3();
  private currentLook: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public playTrack(mode: CameraTrackMode, durationSeconds = 5.0) {
    this.mode = mode;
    this.isCinematicActive = true;
    this.trackTimer = 0;
    this.duration = Math.max(0.5, durationSeconds);

    if (mode === 'town_establishing') {
      this.currentPos.set(-20, 26, -42);
      this.targetPos.set(-26, 12, 14);
      this.startLook.set(0, 2, 0);
      this.lookTarget.set(-26, 2, 38);
    } else if (mode === 'apartment_approach') {
      this.currentPos.set(-26, 10, 20);
      this.targetPos.set(-26, 2.2, 34);
      this.startLook.set(-26, 2.0, 38);
      this.lookTarget.set(-26, 1.4, 38);
    } else if (mode === 'sky_observation') {
      this.currentPos.set(-10, 2.2, 16);
      this.targetPos.set(-10, 2.8, 16);
      this.startLook.set(-10, 30, -20);
      this.lookTarget.set(-40, 110, -90);
    } else if (mode === 'meteor_track') {
      this.currentPos.set(-15, 35, 10);
      this.targetPos.set(30, 28, 45);
      this.startLook.set(40, 60, 40);
      this.lookTarget.set(110, 15, 80);
    } else if (mode === 'impact_view') {
      this.currentPos.set(25, 18, 15);
      this.targetPos.set(32, 20, 22);
      this.startLook.set(110, 8, 80);
      this.lookTarget.set(110, 5, 80);
    } else if (mode === 'open_world_reveal') {
      this.currentPos.set(0, 4.0, 14.0);
      this.targetPos.set(0, 24.0, 36.0);
      this.startLook.set(0, 2.0, 0);
      this.lookTarget.set(0, 5.0, -35.0);
    } else if (mode === 'shelter_seal') {
      this.currentPos.set(-46, -2.5, 26);
      this.targetPos.set(-46, -3.2, 22);
      this.startLook.set(-46, -3.0, 20);
      this.lookTarget.set(-46, -2.0, 20);
    } else if (mode === 'friends_meet') {
      this.currentPos.set(-6, 2.4, 14);
      this.targetPos.set(-8, 2.2, 16);
      this.startLook.set(-10, 1.4, 17);
      this.lookTarget.set(-11, 1.4, 17);
    } else if (mode === 'highway_overlook') {
      this.currentPos.set(590, 8.0, 14);
      this.targetPos.set(600, 4.5, 20);
      this.startLook.set(300, 12, 10);
      this.lookTarget.set(0, 15, 0);
    }

    // Immediately snap camera to start of cutscene to prevent cross-map interpolation artifacts
    this.camera.position.copy(this.currentPos);
    this.currentLook.copy(this.startLook);
    this.camera.lookAt(this.currentLook);
  }

  public update(delta: number): boolean {
    if (!this.isCinematicActive || this.mode === 'none') return false;

    this.trackTimer += delta;
    const t = Math.min(1.0, this.trackTimer / this.duration);

    // Quintic smootherstep interpolation: 6t^5 - 15t^4 + 10t^3 for cinema-grade motion
    const ease = t * t * t * (t * (t * 6 - 15) + 10);

    const lerpPos = new THREE.Vector3().lerpVectors(this.currentPos, this.targetPos, ease);
    const lerpLook = new THREE.Vector3().lerpVectors(this.startLook, this.lookTarget, ease);

    // Subtle natural organic cinematic breathing (steadicam operator simulation)
    const breathY = Math.sin(this.trackTimer * 1.2) * 0.035;
    const breathX = Math.cos(this.trackTimer * 0.9) * 0.025;
    lerpPos.y += breathY;
    lerpPos.x += breathX;

    this.camera.position.copy(lerpPos);
    this.camera.lookAt(lerpLook);

    // A cinematic track is a finite camera override. Previously it stayed active
    // after reaching t=1, permanently preventing PlayerController from restoring
    // the follow camera (which looks like a frozen scene with a missing player).
    if (this.trackTimer >= this.duration) {
      this.camera.position.copy(this.targetPos);
      this.camera.lookAt(this.lookTarget);
      this.isCinematicActive = false;
      this.mode = 'none';
      return false;
    }

    return true;
  }

  public skipCurrentCinematic() {
    this.isCinematicActive = false;
    this.mode = 'none';
  }

  public endCinematic() {
    this.isCinematicActive = false;
    this.mode = 'none';
  }
}
