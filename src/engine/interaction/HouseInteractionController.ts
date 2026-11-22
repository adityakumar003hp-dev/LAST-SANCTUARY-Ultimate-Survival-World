import * as THREE from 'three';
import { PlayerController } from '../PlayerController';
import { soundEngine } from '../../utils/audio';

export type InteractionState = 'IDLE' | 'APPROACH' | 'ALIGN' | 'ANIMATE' | 'COMPLETE' | 'EXITING';

export type HouseInteractionType =
  | 'bed_sleep'
  | 'wash_sink'
  | 'mirror_look'
  | 'shower'
  | 'toilet'
  | 'bathtub'
  | 'towel'
  | 'bath_cabinet'
  | 'bath_tap'
  | 'bath_light'
  | 'bath_door'
  | 'sofa_sit'
  | 'chair_sit'
  | 'kitchen_stove'
  | 'kitchen_sink'
  | 'wardrobe'
  | 'computer'
  | 'bedside_lamp'
  | 'clock';

export interface HouseInteractionConfig {
  id: HouseInteractionType;
  label: string;
  targetObjectPos: THREE.Vector3;
  targetObjectRotY: number;
  approachPos: THREE.Vector3;
  targetYaw: number;
  duration: number; // Duration of ANIMATE state in seconds (or -1 for persistent until input like sitting)
  privacyCamera?: boolean;
}

export class HouseInteractionController {
  private player: PlayerController;
  public state: InteractionState = 'IDLE';
  public currentType: HouseInteractionType | null = null;
  public config: HouseInteractionConfig | null = null;

  // Timers and phase progress
  private stateTimer = 0;
  private stateDuration = 0;
  private approachStartPos = new THREE.Vector3();
  private approachStartYaw = 0;

  // Persistent seated / resting state
  public isSeated = false;
  public seatedPos = new THREE.Vector3();
  public seatedYaw = 0;

  // Bed Sleep multi-phase tracking
  public sleepPhase: 'approach' | 'sit_edge' | 'recline' | 'sleeping' | 'wake_sit' | 'stand_up' = 'approach';
  public sleepTimer = 0;
  public sleepTotalDuration = 4.5;
  public bedMattressWorldPos = new THREE.Vector3();
  public bedStandWorldPos = new THREE.Vector3();

  // Callbacks
  public onPrompt?: (message: string) => void;
  public onSubtitle?: (data: { speaker: string; text: string; duration: number }) => void;
  public onCompleteAction?: (type: HouseInteractionType) => void;

  constructor(player: PlayerController) {
    this.player = player;
  }

  public get isInteracting(): boolean {
    return this.state !== 'IDLE';
  }

  public canInteract(): boolean {
    return this.state === 'IDLE';
  }

  /**
   * Starts a house interaction with full approach, alignment, animation, and exit.
   */
  public startInteraction(config: HouseInteractionConfig): boolean {
    if (this.state !== 'IDLE') return false;

    // Distance sanity check: cannot start interaction from excessive distance (> 4.5m)
    const distToTarget = this.player.position.distanceTo(config.approachPos);
    if (distToTarget > 4.5) {
      this.onPrompt?.('Too far away to interact.');
      return false;
    }

    this.config = config;
    this.currentType = config.id;
    this.state = 'APPROACH';
    this.stateTimer = 0;
    // Dynamic approach duration based on distance, minimum 0.35s
    this.stateDuration = Math.max(0.35, Math.min(1.2, distToTarget * 0.45));
    this.approachStartPos.copy(this.player.position);
    this.approachStartYaw = this.player.yaw;

    // Special setup for bed sleep
    if (config.id === 'bed_sleep') {
      this.sleepPhase = 'approach';
      this.sleepTimer = 0;
      this.bedMattressWorldPos.copy(config.targetObjectPos);
      this.bedStandWorldPos.copy(config.approachPos);
    }

    return true;
  }

  /**
   * Cancels any active interaction gracefully and restores normal avatar controls.
   */
  public cancelInteraction(): void {
    if (this.state === 'IDLE') return;
    this.state = 'IDLE';
    this.currentType = null;
    this.config = null;
    this.isSeated = false;
    this.resetAvatarPostures();
    this.onPrompt?.('Interaction ended.');
  }

  /**
   * Called every frame from GameEngine.update()
   */
  public update(delta: number, hasMovementInput: boolean): void {
    if (this.state === 'IDLE') return;

    // If seated and player pressed movement or jump, smoothly stand up
    if (this.isSeated && hasMovementInput) {
      this.isSeated = false;
      this.state = 'EXITING';
      this.stateTimer = 0;
      this.stateDuration = 0.4;
      this.onPrompt?.('Stood up.');
      return;
    }

    this.stateTimer += delta;

    switch (this.state) {
      case 'APPROACH': {
        const t = Math.min(1.0, this.stateTimer / Math.max(0.01, this.stateDuration));
        const smoothT = t * t * (3 - 2 * t); // Smoothstep

        // Interpolate position toward required approach position
        this.player.position.lerpVectors(this.approachStartPos, this.config!.approachPos, smoothT);
        this.player.velocity.set(0, 0, 0);

        // Smoothly rotate yaw
        this.player.yaw = THREE.MathUtils.lerp(this.approachStartYaw, this.config!.targetYaw, smoothT);

        // Walking limb motion during approach
        const leftLeg = this.player.avatarGroup.getObjectByName('leftLeg') as THREE.Mesh | null;
        const rightLeg = this.player.avatarGroup.getObjectByName('rightLeg') as THREE.Mesh | null;
        if (leftLeg && rightLeg && t < 0.98) {
          const walkCycle = Math.sin(this.stateTimer * 14.0);
          leftLeg.rotation.x = walkCycle * 0.45;
          rightLeg.rotation.x = -walkCycle * 0.45;
        }

        if (t >= 1.0) {
          this.player.position.copy(this.config!.approachPos);
          this.player.yaw = this.config!.targetYaw;
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
          }
          this.state = 'ALIGN';
          this.stateTimer = 0;
          this.stateDuration = 0.25;
        }
        break;
      }

      case 'ALIGN': {
        const t = Math.min(1.0, this.stateTimer / this.stateDuration);
        this.player.yaw = THREE.MathUtils.lerp(this.player.yaw, this.config!.targetYaw, t);
        this.player.velocity.set(0, 0, 0);

        if (t >= 1.0) {
          this.state = 'ANIMATE';
          this.stateTimer = 0;
          this.stateDuration = this.config!.duration;
          this.setupAnimatePhase();
        }
        break;
      }

      case 'ANIMATE': {
        this.player.velocity.set(0, 0, 0);
        this.updateAnimatePhase(delta);

        // If animation has a timed duration and elapsed
        if (this.config!.duration > 0 && this.stateTimer >= this.config!.duration) {
          this.state = 'COMPLETE';
          this.stateTimer = 0;
          this.stateDuration = 0.4;
          this.onCompleteAction?.(this.currentType!);
        }
        break;
      }

      case 'COMPLETE': {
        this.state = 'EXITING';
        this.stateTimer = 0;
        this.stateDuration = 0.45;
        break;
      }

      case 'EXITING': {
        const t = Math.min(1.0, this.stateTimer / this.stateDuration);
        this.restoreAvatarPostures(t);

        if (t >= 1.0) {
          this.state = 'IDLE';
          this.currentType = null;
          this.config = null;
          this.isSeated = false;
          this.resetAvatarPostures();
        }
        break;
      }
    }
  }

  private setupAnimatePhase(): void {
    if (!this.config) return;
    const type = this.config.id;

    if (type === 'sofa_sit' || type === 'chair_sit') {
      this.isSeated = true;
      this.seatedPos.copy(this.config.approachPos);
      this.seatedYaw = this.config.targetYaw;
    } else if (type === 'toilet') {
      this.isSeated = true;
      this.seatedPos.copy(this.config.approachPos);
      this.seatedYaw = this.config.targetYaw;
    }
  }

  private updateAnimatePhase(delta: number): void {
    if (!this.config) return;
    const type = this.config.id;
    const elapsed = this.stateTimer;

    const leftArm = this.player.avatarGroup.getObjectByName('leftArm') as THREE.Mesh | null;
    const rightArm = this.player.avatarGroup.getObjectByName('rightArm') as THREE.Mesh | null;
    const leftLeg = this.player.avatarGroup.getObjectByName('leftLeg') as THREE.Mesh | null;
    const rightLeg = this.player.avatarGroup.getObjectByName('rightLeg') as THREE.Mesh | null;

    // -------------------------------------------------------------
    // BED SLEEP: Multi-phase realistic lie-down & wake-up
    // -------------------------------------------------------------
    if (type === 'bed_sleep') {
      this.updateBedSleepAnimation(delta, elapsed);
      return;
    }

    // -------------------------------------------------------------
    // WASH SINK: Wash Hands & Face with flowing water
    // -------------------------------------------------------------
    if (type === 'wash_sink') {
      // Leans forward slightly towards mirror / sink
      this.player.avatarGroup.rotation.x = THREE.MathUtils.damp(this.player.avatarGroup.rotation.x, 0.22, 6, delta);
      // Both arms reach towards tap and rub together in washing motion
      const washRub = Math.sin(elapsed * 12.0) * 0.25;
      if (leftArm) {
        leftArm.rotation.x = -Math.PI / 3 + washRub;
        leftArm.rotation.z = 0.2;
      }
      if (rightArm) {
        rightArm.rotation.x = -Math.PI / 3 - washRub;
        rightArm.rotation.z = -0.2;
      }
      return;
    }

    // -------------------------------------------------------------
    // BATHROOM MIRROR: Look at reflection & inspect
    // -------------------------------------------------------------
    if (type === 'mirror_look') {
      // Upright posture facing mirror, subtle head tilt and hand check
      this.player.avatarGroup.rotation.x = THREE.MathUtils.damp(this.player.avatarGroup.rotation.x, 0, 6, delta);
      const headCheck = Math.sin(elapsed * 2.5) * 0.12;
      this.player.avatarGroup.rotation.y = this.config.targetYaw + headCheck;
      if (rightArm) {
        // Hand touches chin/hair briefly
        rightArm.rotation.x = -Math.PI / 2.5 + Math.sin(elapsed * 3.0) * 0.15;
        rightArm.rotation.z = -0.3;
      }
      return;
    }

    // -------------------------------------------------------------
    // SHOWER: Standing wash with falling spray & steam
    // -------------------------------------------------------------
    if (type === 'shower') {
      this.player.avatarGroup.rotation.x = 0;
      this.player.avatarGroup.rotation.z = 0;
      // Scrubbing hair and shoulders
      const scrub = Math.sin(elapsed * 10.0) * 0.35;
      if (leftArm) {
        leftArm.rotation.x = -Math.PI / 1.8 + scrub;
        leftArm.rotation.z = 0.35;
      }
      if (rightArm) {
        rightArm.rotation.x = -Math.PI / 1.8 - scrub;
        rightArm.rotation.z = -0.35;
      }
      return;
    }

    // -------------------------------------------------------------
    // TOILET: Realistic seated posture
    // -------------------------------------------------------------
    if (type === 'toilet') {
      this.player.avatarGroup.rotation.x = 0;
      this.player.avatarGroup.rotation.z = 0;
      // Lower body onto seat: Y lowered to seat height ~0.55
      this.player.position.y = THREE.MathUtils.damp(this.player.position.y, this.config.approachPos.y - 0.22, 8, delta);
      // Legs bent 90 degrees horizontal
      if (leftLeg) leftLeg.rotation.x = -Math.PI / 2;
      if (rightLeg) rightLeg.rotation.x = -Math.PI / 2;
      // Arms resting on knees
      if (leftArm) leftArm.rotation.x = -Math.PI / 3;
      if (rightArm) rightArm.rotation.x = -Math.PI / 3;
      return;
    }

    // -------------------------------------------------------------
    // BATHTUB: Seated inside warm water
    // -------------------------------------------------------------
    if (type === 'bathtub') {
      // Sitting inside tub: position lowered into tub basin
      this.player.position.y = THREE.MathUtils.damp(this.player.position.y, this.config.approachPos.y - 0.28, 6, delta);
      if (leftLeg) leftLeg.rotation.x = -Math.PI / 2.2;
      if (rightLeg) rightLeg.rotation.x = -Math.PI / 2.2;
      if (leftArm) leftArm.rotation.x = -Math.PI / 3.5;
      if (rightArm) rightArm.rotation.x = -Math.PI / 3.5;
      return;
    }

    // -------------------------------------------------------------
    // TOWEL: Grab towel & drying gesture
    // -------------------------------------------------------------
    if (type === 'towel') {
      const dryMotion = Math.sin(elapsed * 9.0) * 0.3;
      if (leftArm) {
        leftArm.rotation.x = -Math.PI / 2.4 + dryMotion;
        leftArm.rotation.z = 0.25;
      }
      if (rightArm) {
        rightArm.rotation.x = -Math.PI / 2.4 - dryMotion;
        rightArm.rotation.z = -0.25;
      }
      return;
    }

    // -------------------------------------------------------------
    // SOFA & DINING CHAIR: Clean seated posture
    // -------------------------------------------------------------
    if (type === 'sofa_sit' || type === 'chair_sit') {
      const targetSeatY = this.config.approachPos.y - 0.25;
      this.player.position.y = THREE.MathUtils.damp(this.player.position.y, targetSeatY, 8, delta);
      if (leftLeg) leftLeg.rotation.x = -Math.PI / 2;
      if (rightLeg) rightLeg.rotation.x = -Math.PI / 2;
      if (leftArm) leftArm.rotation.x = -Math.PI / 3.8;
      if (rightArm) rightArm.rotation.x = -Math.PI / 3.8;
      return;
    }

    // -------------------------------------------------------------
    // KITCHEN SINK / STOVE / WARDROBE / COMPUTER / CLOCK / LAMP
    // -------------------------------------------------------------
    if (type === 'kitchen_sink') {
      const scrub = Math.sin(elapsed * 10.0) * 0.2;
      if (leftArm) leftArm.rotation.x = -Math.PI / 2.8 + scrub;
      if (rightArm) rightArm.rotation.x = -Math.PI / 2.8 - scrub;
      return;
    }

    if (type === 'kitchen_stove' || type === 'bath_tap' || type === 'bath_light' || type === 'bedside_lamp') {
      // Reaches right hand to switch/knob/tap
      if (rightArm) {
        rightArm.rotation.x = -Math.PI / 2.2;
        rightArm.rotation.z = -0.15;
      }
      return;
    }

    if (type === 'computer') {
      // Seated typing motion
      this.player.position.y = THREE.MathUtils.damp(this.player.position.y, this.config.approachPos.y - 0.22, 8, delta);
      if (leftLeg) leftLeg.rotation.x = -Math.PI / 2;
      if (rightLeg) rightLeg.rotation.x = -Math.PI / 2;
      const typeL = Math.sin(elapsed * 16.0) * 0.08;
      const typeR = Math.cos(elapsed * 16.0) * 0.08;
      if (leftArm) leftArm.rotation.x = -Math.PI / 2.5 + typeL;
      if (rightArm) rightArm.rotation.x = -Math.PI / 2.5 + typeR;
      return;
    }

    if (type === 'bath_cabinet' || type === 'wardrobe') {
      // Reaching forward to open door
      if (rightArm) {
        rightArm.rotation.x = -Math.PI / 2.2;
      }
      return;
    }

    if (type === 'clock') {
      // Look up slightly towards clock
      this.player.avatarGroup.rotation.x = -0.25;
      return;
    }
  }

  /**
   * Bed sleep sequence:
   * 1. Sits on mattress edge
   * 2. Reclines smoothly onto mattress surface (Y = mattressTop = 0.88)
   * 3. Rests head on pillow, subtle breathing
   * 4. Sits up and stands beside bed on floor
   */
  private updateBedSleepAnimation(delta: number, elapsed: number): void {
    const leftArm = this.player.avatarGroup.getObjectByName('leftArm') as THREE.Mesh | null;
    const rightArm = this.player.avatarGroup.getObjectByName('rightArm') as THREE.Mesh | null;
    const leftLeg = this.player.avatarGroup.getObjectByName('leftLeg') as THREE.Mesh | null;
    const rightLeg = this.player.avatarGroup.getObjectByName('rightLeg') as THREE.Mesh | null;

    const mattressY = this.bedMattressWorldPos.y; // 0.88
    const sleepTotal = this.config!.duration; // e.g. 4.0s

    // Phase 1: 0.0s to 0.7s: Sits on mattress edge
    if (elapsed < 0.7) {
      this.sleepPhase = 'sit_edge';
      const t = elapsed / 0.7;
      // Smoothly move from edge of bed to sitting on mattress rim
      const rimPos = new THREE.Vector3(
        this.bedStandWorldPos.x * 0.4 + this.bedMattressWorldPos.x * 0.6,
        mattressY - 0.25,
        this.bedMattressWorldPos.z
      );
      this.player.position.lerp(rimPos, t);
      // Legs bend down over edge
      if (leftLeg) leftLeg.rotation.x = -Math.PI / 2.5;
      if (rightLeg) rightLeg.rotation.x = -Math.PI / 2.5;
      if (leftArm) leftArm.rotation.x = -Math.PI / 4;
      if (rightArm) rightArm.rotation.x = -Math.PI / 4;
    }
    // Phase 2: 0.7s to 1.4s: Reclines smoothly onto mattress surface
    else if (elapsed < 1.4) {
      this.sleepPhase = 'recline';
      const t = (elapsed - 0.7) / 0.7;
      // Player center moves to center of mattress ON TOP of bed
      const targetBedCenter = new THREE.Vector3(
        this.bedMattressWorldPos.x,
        mattressY + 0.04, // Resiliently ON TOP of mattress
        this.bedMattressWorldPos.z
      );
      this.player.position.lerp(targetBedCenter, t);

      // Smoothly rotate body from sitting to lying flat on back
      this.player.avatarGroup.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, t);
      // Align head towards headboard (+Z) and feet towards (-Z)
      this.player.yaw = THREE.MathUtils.lerp(this.player.yaw, Math.PI, t);

      // Legs straighten onto mattress
      if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2.5, 0, t);
      if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2.5, 0, t);
      // Arms relax beside body
      if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(-Math.PI / 4, 0.05, t);
      if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(-Math.PI / 4, 0.05, t);
    }
    // Phase 3: 1.4s to (total - 0.8s): Peaceful sleeping with breathing on mattress
    else if (elapsed < sleepTotal - 0.8) {
      this.sleepPhase = 'sleeping';
      // Firmly keep player on top of mattress
      this.player.position.x = this.bedMattressWorldPos.x;
      this.player.position.z = this.bedMattressWorldPos.z;

      // Subtle breathing motion: chest/torso rises and falls gently
      const breathe = Math.sin(elapsed * 2.2) * 0.014;
      this.player.position.y = mattressY + 0.04 + breathe;

      this.player.avatarGroup.rotation.x = -Math.PI / 2;
      this.player.yaw = Math.PI;

      if (leftLeg) leftLeg.rotation.x = 0.02;
      if (rightLeg) rightLeg.rotation.x = 0.02;
      if (leftArm) leftArm.rotation.x = 0.08;
      if (rightArm) rightArm.rotation.x = 0.08;
    }
    // Phase 4: Wake up: upper body rises to sitting position
    else if (elapsed < sleepTotal - 0.2) {
      this.sleepPhase = 'wake_sit';
      const t = (elapsed - (sleepTotal - 0.8)) / 0.6;
      // Rises from lying to sitting up on mattress
      this.player.avatarGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, 0, t);
      this.player.position.x = THREE.MathUtils.lerp(this.bedMattressWorldPos.x, this.bedStandWorldPos.x * 0.4 + this.bedMattressWorldPos.x * 0.6, t);
      this.player.position.y = THREE.MathUtils.lerp(mattressY + 0.04, mattressY - 0.25, t);

      if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2.5, t);
      if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2.5, t);
    }
    // Phase 5: Stands up beside bed on the floor
    else {
      this.sleepPhase = 'stand_up';
      const t = (elapsed - (sleepTotal - 0.2)) / 0.2;
      this.player.position.lerp(this.bedStandWorldPos, t);
      this.player.avatarGroup.rotation.x = 0;
      this.player.yaw = this.config!.targetYaw;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftArm) leftArm.rotation.x = 0;
      if (rightArm) rightArm.rotation.x = 0;
    }
  }

  private restoreAvatarPostures(t: number): void {
    const leftArm = this.player.avatarGroup.getObjectByName('leftArm') as THREE.Mesh | null;
    const rightArm = this.player.avatarGroup.getObjectByName('rightArm') as THREE.Mesh | null;
    const leftLeg = this.player.avatarGroup.getObjectByName('leftLeg') as THREE.Mesh | null;
    const rightLeg = this.player.avatarGroup.getObjectByName('rightLeg') as THREE.Mesh | null;

    this.player.avatarGroup.rotation.x = THREE.MathUtils.lerp(this.player.avatarGroup.rotation.x, 0, t);
    this.player.avatarGroup.rotation.z = THREE.MathUtils.lerp(this.player.avatarGroup.rotation.z, 0, t);

    // Return to approach position on floor if standing up from seat/bed
    if (this.config) {
      this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, this.config.approachPos.y, t);
    }

    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, t);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, t);
    if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, t);
    if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -Math.PI / 4, t);
  }

  private resetAvatarPostures(): void {
    this.player.avatarGroup.rotation.x = 0;
    this.player.avatarGroup.rotation.z = 0;
    const leftArm = this.player.avatarGroup.getObjectByName('leftArm') as THREE.Mesh | null;
    const rightArm = this.player.avatarGroup.getObjectByName('rightArm') as THREE.Mesh | null;
    const leftLeg = this.player.avatarGroup.getObjectByName('leftLeg') as THREE.Mesh | null;
    const rightLeg = this.player.avatarGroup.getObjectByName('rightLeg') as THREE.Mesh | null;

    if (leftLeg) leftLeg.rotation.x = 0;
    if (rightLeg) rightLeg.rotation.x = 0;
    if (leftArm) leftArm.rotation.x = 0;
    if (rightArm) rightArm.rotation.x = -Math.PI / 4;
  }
}
