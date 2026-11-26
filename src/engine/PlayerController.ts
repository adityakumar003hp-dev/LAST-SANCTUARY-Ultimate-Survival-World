import * as THREE from 'three';
import { CameraView, ItemDefinition } from '../types/game';
import { getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { soundEngine } from '../utils/audio';
import { STRUCTURES } from '../data/structures';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { buildRealisticHumanoid } from './rendering/RealisticHumanoidBuilder';
import { getWoodPBR, getMetalPBR, getFabricPBR, getSkinPBR } from '../utils/proceduralTextures';
import type { InteriorStreamingManager } from './world/InteriorStreamingManager';
import {
  AURELION_ATRIUM_VOID,
  AURELION_ELEVATOR_CONFIGS,
  AURELION_F6_INDOOR_POOL,
  AURELION_LEVEL_ORDER,
  AURELION_LEVELS,
  AURELION_ROOFTOP_INFINITY_POOL,
  AURELION_STAIR_VOID,
} from './aurelion/AurelionConfig';
import {
  NEXUS_ELEVATORS,
  NEXUS_FLOOR_ORDER,
  NEXUS_FLOORS,
  NEXUS_STAIRWELL,
  NexusElevatorId,
} from './nexus/NexusConfig';

export class PlayerController {
  private static readonly _tmpDesiredPos = new THREE.Vector3();

  public camera: THREE.PerspectiveCamera;
  public scene: THREE.Scene;
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Rotation angles (radians)
  public yaw: number = 0;
  public pitch: number = 0;

  // Camera settings
  public cameraView: CameraView = 'third';
  public observerDistance: number = 5.2;
  public thirdPersonDistance: number = 4.2;
  public currentCamDistance: number = 4.2;
  public eyeHeight: number = 1.7;
  public shakeIntensity: number = 0;
  public enableCameraShake: boolean = true;

  // Movement parameters
  public walkSpeed: number = 4.5;
  public runSpeed: number = 7.5;
  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public isSwimming: boolean = false;
  public isSubmerged: boolean = false;
  public isSleeping: boolean = false;
  public isHouseInteracting: boolean = false;
  private sleepTimer: number = 0;
  private sleepReturnPosition: THREE.Vector3 | null = null;
  private footstepTimer: number = 0;

  // Continuous kinematics & first-person viewmodel state
  private stridePhase: number = 0;
  private idlePhase: number = 0;
  private wasGrounded: boolean = true;
  private landCompression: number = 0;
  private recoilKick: number = 0;
  private viewmodelOverrideHidden: boolean = false;
  private activeHeldItem: ItemDefinition | null = null;

  // Visual avatar & first-person tactical arms/weapon rig
  public avatarGroup: THREE.Group;
  public heldToolGroup: THREE.Group;
  public fpViewmodelGroup: THREE.Group;
  public fpHeldToolGroup: THREE.Group;
  public flashlight: THREE.SpotLight;
  public isFlashlightOn: boolean = false;

  // Swing and synchronized friend-social animation
  private socialAction = '';
  private socialActionTimer = 0;
  private swingProgress: number = 1.0;
  private swingDuration: number = 0.28;
  public worldSeed: number = 42;
  public aiTrainManager?: any;
  public interiorStreamingManager?: InteriorStreamingManager;
  public aurelionElevatorsSnapshot?: Record<'main' | 'service' | 'private', { currentY: number; stops: readonly string[] }>;
  public nexusElevatorsSnapshot?: Record<NexusElevatorId, { currentY: number }>;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, worldSeed: number = 42) {
    this.scene = scene;
    this.camera = camera;
    this.worldSeed = worldSeed;

    // Build procedural survivor avatar
    this.avatarGroup = this.createPlayerAvatar();
    this.scene.add(this.avatarGroup);

    // Initial position flush with terrain
    const startY = getTerrainHeight(this.position.x, this.position.z, this.worldSeed);
    this.position.y = Math.max(0, startY);
    this.avatarGroup.position.copy(this.position);

    // Held item group attached to right forearm so elbow flex tracks the weapon
    this.heldToolGroup = new THREE.Group();
    const rightForearm = this.avatarGroup.getObjectByName('rightForearm') || this.avatarGroup.getObjectByName('rightArm');
    if (rightForearm) {
      rightForearm.add(this.heldToolGroup);
      if (rightForearm.name === 'rightForearm') {
        this.heldToolGroup.position.set(0, -0.27, 0.14);
      } else {
        this.heldToolGroup.position.set(0, -0.4, 0.2);
      }
    }

    // First-person tactical viewmodel attached directly to camera
    this.fpHeldToolGroup = new THREE.Group();
    this.fpViewmodelGroup = this.createFirstPersonViewmodel();
    this.fpViewmodelGroup.visible = this.cameraView === 'first';
    this.camera.add(this.fpViewmodelGroup);
    if (!this.camera.parent) {
      this.scene.add(this.camera);
    }

    // Flashlight (pointing forward in character direction -Z)
    this.flashlight = new THREE.SpotLight(0xfffaea, 3.5, 30, Math.PI / 5, 0.35, 1.2);
    this.flashlight.position.set(0, 1.5, 0);
    this.flashlight.visible = false;
    this.avatarGroup.add(this.flashlight);
    this.avatarGroup.add(this.flashlight.target);
    this.flashlight.target.position.set(0, 1.2, -10);
  }

  public triggerSocialAction(action: 'Handshake' | 'Clap' | 'Dance' | 'Stop Dance') {
    this.socialAction = action === 'Stop Dance' ? '' : action;
    this.socialActionTimer = action === 'Dance' ? 60 : action === 'Stop Dance' ? 0 : 1.8;
    if (action === 'Stop Dance') {
      ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftForearm', 'rightForearm', 'leftShin', 'rightShin'].forEach(name => {
        const part = this.avatarGroup.getObjectByName(name);
        if (part) part.rotation.set(0, 0, 0);
      });
    }
  }

  public setViewmodelOverrideHidden(hidden: boolean) {
    this.viewmodelOverrideHidden = hidden;
    if (hidden) {
      this.fpViewmodelGroup.visible = false;
    }
  }

  public setView(view: CameraView) {
    this.cameraView = view;
    this.avatarGroup.visible = this.cameraView !== 'first';
    this.fpViewmodelGroup.visible =
      this.cameraView === 'first' &&
      !this.viewmodelOverrideHidden &&
      !this.isSleeping &&
      !this.isRestingOnMedicalBed &&
      !this.isHouseInteracting;
  }

  public toggleView() {
    const next: CameraView = this.cameraView === 'first'
      ? 'third'
      : this.cameraView === 'third'
        ? 'second'
        : 'first';
    this.setView(next);
  }

  public toggleFlashlight(): boolean {
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.visible = this.isFlashlightOn;
    return this.isFlashlightOn;
  }

  public triggerActionSwing() {
    if (this.swingProgress >= 1.0) {
      this.swingProgress = 0.0;
    }
  }

  public triggerRecoilKick(strength: number = 1.0) {
    this.recoilKick = Math.min(1.5, this.recoilKick + strength);
  }

  /** Play a short visible lie-down / wake-up sequence when using a bed. */
  public startSleeping(duration: number = 3.2, returnPos?: THREE.Vector3): void {
    if (this.isSleeping) return;
    this.sleepReturnPosition = returnPos ? returnPos.clone() : this.position.clone();
    this.isSleeping = true;
    this.sleepTimer = Math.max(1.5, duration);
    this.velocity.set(0, 0, 0);
    this.isSwimming = false;
    this.isSubmerged = false;
  }

  public isRestingOnMedicalBed = false;
  private medicalRestBedPos: THREE.Vector3 | null = null;

  public startMedicalRest(bedPos: THREE.Vector3): void {
    if (this.isRestingOnMedicalBed) return;
    this.isRestingOnMedicalBed = true;
    this.medicalRestBedPos = bedPos.clone();
    this.position.copy(bedPos);
    this.position.y += 0.35;
    this.velocity.set(0, 0, 0);
  }

  public stopMedicalRest(): void {
    if (!this.isRestingOnMedicalBed) return;
    this.isRestingOnMedicalBed = false;
    this.medicalRestBedPos = null;
    this.avatarGroup.rotation.x = 0;
    this.avatarGroup.rotation.z = 0;
  }

  public adjustCameraDistance(deltaZoom: number) {
    this.thirdPersonDistance = Math.max(1.8, Math.min(8.0, this.thirdPersonDistance + deltaZoom));
  }

  public triggerCameraShake(intensity: number = 0.3) {
    if (this.enableCameraShake) {
      this.shakeIntensity = Math.min(0.8, this.shakeIntensity + intensity);
    }
  }

  public shakeCamera(intensity: number = 0.5) {
    this.triggerCameraShake(intensity);
  }

  public setHeldItem(item: ItemDefinition | null) {
    this.activeHeldItem = item;
    while (this.heldToolGroup.children.length > 0) {
      this.heldToolGroup.remove(this.heldToolGroup.children[0]);
    }
    while (this.fpHeldToolGroup.children.length > 0) {
      this.fpHeldToolGroup.remove(this.fpHeldToolGroup.children[0]);
    }

    if (!item) return;

    const tpMesh = this.buildToolMesh(item);
    if (tpMesh) this.heldToolGroup.add(tpMesh);

    const fpMesh = this.buildToolMesh(item);
    if (fpMesh) {
      fpMesh.scale.setScalar(0.86);
      this.fpHeldToolGroup.add(fpMesh);
    }
  }

  private buildToolMesh(item: ItemDefinition): THREE.Group | null {
    const root = new THREE.Group();
    const metalPBR = getMetalPBR();
    const woodPBR = getWoodPBR();
    const toolMat = new THREE.MeshStandardMaterial({
      color: 0xa2acb8,
      map: metalPBR.albedo,
      normalMap: metalPBR.normal,
      roughnessMap: metalPBR.roughness,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 1.35,
    });
    const darkGripMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.88, metalness: 0.12 });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x9e744e,
      map: woodPBR.albedo,
      normalMap: woodPBR.normal,
      roughnessMap: woodPBR.roughness,
      roughness: 0.76,
    });

    if (item.toolType === 'axe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.031, 0.76, 12), woodMat);
      handle.rotation.x = Math.PI / 2;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.20, 12), darkGripMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0, 0, 0.25);
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.11, 0.13), toolMat);
      collar.position.set(0, 0.02, -0.32);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.24, 4), toolMat);
      blade.rotation.z = Math.PI / 2;
      blade.scale.set(0.32, 1.0, 1.45);
      blade.position.set(0, -0.05, -0.32);
      root.add(handle, grip, collar, blade);
    } else if (item.toolType === 'pickaxe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.78, 12), woodMat);
      handle.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 12), toolMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(0, 0, -0.34);
      const pickF = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.27, 6), toolMat);
      pickF.rotation.x = -Math.PI / 2;
      pickF.position.set(0, -0.08, -0.34);
      const pickB = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), toolMat);
      pickB.rotation.x = Math.PI / 2;
      pickB.position.set(0, 0.08, -0.34);
      root.add(handle, hub, pickF, pickB);
    } else if (item.toolType === 'hammer') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.64, 12), woodMat);
      handle.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 12), toolMat);
      head.position.set(0, 0, -0.28);
      root.add(handle, head);
    } else if (item.id === 'stun_baton') {
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.032, 0.82, 12), darkGripMat);
      baton.rotation.x = Math.PI / 2;
      const coil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.28, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.8, roughness: 0.2 })
      );
      coil.rotation.x = Math.PI / 2;
      coil.position.set(0, 0, -0.27);
      const emitter = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), toolMat);
      emitter.position.set(0, 0, -0.4);
      root.add(baton, coil, emitter);
    } else if (item.id === 'pulse_crossbow') {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.095, 0.72), darkGripMat);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.78), toolMat);
      rail.position.set(0, 0.055, -0.08);
      const limbL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.032, 0.05), toolMat);
      limbL.position.set(-0.18, 0.05, -0.34);
      limbL.rotation.y = 0.28;
      const limbR = limbL.clone();
      limbR.position.x = 0.18;
      limbR.rotation.y = -0.28;
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.18, 12), toolMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.105, -0.05);
      const stringMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.1 });
      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 6), stringMat);
      bowString.rotation.z = Math.PI / 2;
      bowString.position.set(0, 0.055, -0.26);
      const loadedBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), toolMat);
      loadedBolt.rotation.x = Math.PI / 2;
      loadedBolt.position.set(0, 0.075, -0.32);
      root.add(stock, rail, limbL, limbR, scope, bowString, loadedBolt);
    } else {
      return null;
    }

    return root;
  }

  private createFirstPersonViewmodel(): THREE.Group {
    const vm = new THREE.Group();
    const skinPBR = getSkinPBR(0xdeb088);
    const sleevePBR = getFabricPBR(0x3b483b, 'tactical');
    const glovePBR = getFabricPBR(0x1c1e22, 'leather');

    const sleeveMat = new THREE.MeshStandardMaterial({
      map: sleevePBR.albedo,
      normalMap: sleevePBR.normal,
      roughnessMap: sleevePBR.roughness,
      roughness: 0.85,
      metalness: 0.04,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      map: glovePBR.albedo,
      normalMap: glovePBR.normal,
      roughnessMap: glovePBR.roughness,
      roughness: 0.52,
      metalness: 0.12,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      map: skinPBR.albedo,
      normalMap: skinPBR.normal,
      roughnessMap: skinPBR.roughness,
      roughness: 0.62,
    });

    // Right tactical sleeve + forearm + gloved hand
    const rightArmFP = new THREE.Group();
    rightArmFP.name = 'fpRightArm';
    rightArmFP.position.set(0.24, -0.24, -0.32);
    const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.42, 12), sleeveMat);
    rSleeve.rotation.x = Math.PI / 2;
    rSleeve.position.set(0, 0, 0.14);
    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.085, 0.11), gloveMat);
    rGlove.position.set(0, 0.01, -0.09);
    const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.045, 0.05), skinMat);
    rFingers.position.set(0, 0.025, -0.13);
    rightArmFP.add(rSleeve, rGlove, rFingers);

    // Attach FP held tool right in front of gloved right hand
    this.fpHeldToolGroup.position.set(-0.02, 0.03, -0.14);
    rightArmFP.add(this.fpHeldToolGroup);

    // Subtle left support hand / guard arm
    const leftArmFP = new THREE.Group();
    leftArmFP.name = 'fpLeftArm';
    leftArmFP.position.set(-0.24, -0.27, -0.34);
    const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.064, 0.40, 12), sleeveMat);
    lSleeve.rotation.x = Math.PI / 2;
    lSleeve.rotation.z = -0.22;
    lSleeve.position.set(-0.04, 0, 0.15);
    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.08, 0.10), gloveMat);
    lGlove.position.set(0.02, 0.01, -0.08);
    leftArmFP.add(lSleeve, lGlove);

    vm.add(rightArmFP, leftArmFP);
    return vm;
  }

  public update(
    delta: number,
    input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      jump: boolean;
      sprint: boolean;
      crouch?: boolean;
      dive?: boolean;
      analogX?: number;
      analogZ?: number;
      isAnalog?: boolean;
    },
    stamina: number,
    buildingMgr: BuildingManager,
    isCinematicActive: boolean = false
  ): { staminaDelta: number; isMoving: boolean; isSwimming: boolean; isSubmerged: boolean } {
    let staminaDelta = 0;
    if (this.isSleeping) {
      this.sleepTimer -= delta;
      if (this.sleepTimer <= 0) {
        this.isSleeping = false;
        if (this.sleepReturnPosition) this.position.copy(this.sleepReturnPosition);
        this.sleepReturnPosition = null;
        this.avatarGroup.rotation.z = 0;
        this.avatarGroup.rotation.x = 0;
      }
    }

    // Medical Bed Resting & Gradual Healing
    if (this.isRestingOnMedicalBed) {
      const hasMovementInput =
        input.forward ||
        input.backward ||
        input.left ||
        input.right ||
        input.jump ||
        (input.isAnalog && (Math.abs(input.analogX || 0) > 0.15 || Math.abs(input.analogZ || 0) > 0.15));

      if (hasMovementInput) {
        this.stopMedicalRest();
      } else {
        this.velocity.set(0, 0, 0);
        this.avatarGroup.rotation.x = -Math.PI / 2; // Lie down on bed
        return {
          staminaDelta: 25 * delta,
          isMoving: false,
          isSwimming: false,
          isSubmerged: false,
        };
      }
    }

    // Movement direction in player local space
    let moveX = 0;
    let moveZ = 0;

    if (input.isAnalog) {
      moveX = input.analogX || 0;
      moveZ = input.analogZ || 0;
    } else {
      if (input.forward) moveZ += 1;
      if (input.backward) moveZ -= 1;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;
    }

    if (this.isSleeping || this.isHouseInteracting) { moveX = 0; moveZ = 0; this.velocity.set(0, 0, 0); }
    const inputLen = Math.hypot(moveX, moveZ);
    const isMoving = !this.isSleeping && !this.isHouseInteracting && inputLen > 0.08;

    // 1. Calculate solid surface elevation (terrain + bunker floor + constructed floors + apartment floors)
    const terrainY = getTerrainHeight(this.position.x, this.position.z, this.worldSeed);
    let effectiveGroundY = terrainY;

    // Underground shelter bunker floor (Room is centered at -46, -4.5, 22)
    if (
      this.position.x >= -54 &&
      this.position.x <= -38 &&
      this.position.z >= 15 &&
      this.position.z <= 29 &&
      this.position.y < -1.0
    ) {
      effectiveGroundY = -4.5;
    }

    // Building 1: THE AURELION 9-Level Private Mega Estate (B2, B1, F1-F7) at (-26, 0, 38)
    let inApartmentPool = false;
    let waterSurfaceY = 0.0;
    const aurRelX = this.position.x - (-26);
    const aurRelZ = this.position.z - 38;
    const isInsideAurelionCore = Math.abs(aurRelX) <= 15.2 && Math.abs(aurRelZ) <= 12.2;
    const isOnAurelionF2Balcony =
      Math.abs(aurRelX) <= 5.05 &&
      Math.abs(aurRelZ) > 12.2 &&
      Math.abs(aurRelZ) <= 13.35 &&
      this.position.y >= 3.0 &&
      this.position.y <= 7.0;

    if (isOnAurelionF2Balcony) {
      effectiveGroundY = AURELION_LEVELS.F2.floorY;
    } else if (isInsideAurelionCore) {
      // 1. Check 3 Working Elevators (Main, Service, Private Basement VIP)
      let ridingElevator = false;
      if (this.aurelionElevatorsSnapshot) {
        for (const elevId of ['main', 'service', 'private'] as const) {
          const cfg = AURELION_ELEVATOR_CONFIGS[elevId];
          if (Math.abs(aurRelX - cfg.localX) <= cfg.cabW * 0.5 && Math.abs(aurRelZ - cfg.localZ) <= cfg.cabD * 0.5) {
            const cabY = this.aurelionElevatorsSnapshot[elevId].currentY;
            if (this.position.y >= cabY - 1.2 && this.position.y <= cabY + 2.4) {
              effectiveGroundY = cabY;
              ridingElevator = true;
              if (Math.abs(this.position.y - cabY) < 0.35 && this.velocity.y <= 0.5) {
                this.position.y = cabY;
              }
              break;
            }
          }
        }
      }

      if (!ridingElevator) {
        // 2. Check F6 Indoor Leisure Pool
        const inF6Pool =
          aurRelX >= AURELION_F6_INDOOR_POOL.localMinX &&
          aurRelX <= AURELION_F6_INDOOR_POOL.localMaxX &&
          aurRelZ >= AURELION_F6_INDOOR_POOL.localMinZ &&
          aurRelZ <= AURELION_F6_INDOOR_POOL.localMaxZ &&
          this.position.y >= 18.1 &&
          this.position.y <= 20.8;

        // 3. Check F7 Crown Infinity Swimming Pool
        const inF7Pool =
          aurRelX >= AURELION_ROOFTOP_INFINITY_POOL.localMinX &&
          aurRelX <= AURELION_ROOFTOP_INFINITY_POOL.localMaxX &&
          aurRelZ >= AURELION_ROOFTOP_INFINITY_POOL.localMinZ &&
          aurRelZ <= AURELION_ROOFTOP_INFINITY_POOL.localMaxZ &&
          this.position.y >= 21.6 &&
          this.position.y <= 24.8;

        if (inF6Pool) {
          inApartmentPool = true;
          waterSurfaceY = AURELION_F6_INDOOR_POOL.waterSurfaceY;
          effectiveGroundY = AURELION_F6_INDOOR_POOL.basinBottomY;
          const atExitF6 = aurRelX >= -4.9 && aurRelX <= -3.5 && aurRelZ >= -2.6 && aurRelZ <= 2.6;
          if (input.jump && atExitF6 && this.position.y >= 18.4) {
            inApartmentPool = false;
            effectiveGroundY = AURELION_F6_INDOOR_POOL.deckY;
          }
        } else if (inF7Pool) {
          inApartmentPool = true;
          waterSurfaceY = AURELION_ROOFTOP_INFINITY_POOL.waterSurfaceY;
          effectiveGroundY = AURELION_ROOFTOP_INFINITY_POOL.basinBottomY;
          const atExitF7 = aurRelX >= -3.8 && aurRelX <= -2.3 && aurRelZ >= 1.5 && aurRelZ <= 3.5;
          if (input.jump && atExitF7 && this.position.y >= 22.0) {
            inApartmentPool = false;
            effectiveGroundY = AURELION_ROOFTOP_INFINITY_POOL.deckY;
          }
        } else {
          // 4. Check Continuous 9-Level Switchback Grand Stairwell
          const isInStairwell =
            aurRelX >= AURELION_STAIR_VOID.minX - 0.08 &&
            aurRelX <= AURELION_STAIR_VOID.maxX + 0.08 &&
            aurRelZ >= AURELION_STAIR_VOID.minZ - 0.65 &&
            aurRelZ <= AURELION_STAIR_VOID.maxZ + 0.85;

          if (isInStairwell) {
            const pNorth = THREE.MathUtils.clamp((aurRelZ - AURELION_STAIR_VOID.zStart) / (AURELION_STAIR_VOID.zEnd - AURELION_STAIR_VOID.zStart), 0, 1);
            const pSouth = 1.0 - pNorth;
            const isWestLane = aurRelX < 6.0;

            if (aurRelZ >= AURELION_STAIR_VOID.zEnd + 0.05) {
              // North landings (including B1<->F1 midway landing at y=-1.90)
              if (this.position.y >= -2.9 && this.position.y <= -0.9) {
                effectiveGroundY = -1.90;
              } else {
                let nearestY = AURELION_LEVELS.F1.floorY;
                let bestD = Infinity;
                for (const id of AURELION_LEVEL_ORDER) {
                  const fy = AURELION_LEVELS[id].floorY;
                  const d = Math.abs(this.position.y - fy);
                  if (d < bestD) {
                    bestD = d;
                    nearestY = fy;
                  }
                }
                effectiveGroundY = nearestY;
              }
            } else if (aurRelZ <= AURELION_STAIR_VOID.zStart - 0.05) {
              // South landings
              let nearestY = AURELION_LEVELS.F1.floorY;
              let bestD = Infinity;
              for (const id of AURELION_LEVEL_ORDER) {
                const fy = AURELION_LEVELS[id].floorY;
                const d = Math.abs(this.position.y - fy);
                if (d < bestD) {
                  bestD = d;
                  nearestY = fy;
                }
              }
              effectiveGroundY = nearestY;
            } else if (isWestLane) {
              // West Lane: B1->Mid (-4.0..-1.9), F1->F2 (0.245..4.0), F3->F4 (7.6..11.2), F5->F6 (14.8..18.4)
              if (this.position.y < -1.1) {
                effectiveGroundY = -4.0 + pNorth * 2.10;
              } else if (this.position.y < 5.8) {
                effectiveGroundY = 0.245 + pNorth * 3.755;
              } else if (this.position.y < 13.0) {
                effectiveGroundY = 7.6 + pNorth * 3.6;
              } else {
                effectiveGroundY = 14.8 + pNorth * 3.6;
              }
            } else {
              // East Lane: B2->B1 (-7.6..-4.0), Mid->F1 (-1.9..0.245), F2->F3 (4.0..7.6), F4->F5 (11.2..14.8), F6->F7 (18.4..22.0)
              if (this.position.y < -2.95) {
                effectiveGroundY = -7.6 + pNorth * 3.6;
              } else if (this.position.y < 2.2) {
                effectiveGroundY = 0.245 - pNorth * 2.145;
              } else if (this.position.y < 9.4) {
                effectiveGroundY = 4.0 + pSouth * 3.6;
              } else if (this.position.y < 16.6) {
                effectiveGroundY = 11.2 + pSouth * 3.6;
              } else {
                effectiveGroundY = 18.4 + pSouth * 3.6;
              }
            }
          } else {
            // 5. Walkable Level Slabs (checking from top F7 down to B2, respecting Atrium Void on F2-F4 & F6-F7 setback)
            const overAtriumVoid =
              aurRelX > AURELION_ATRIUM_VOID.minX &&
              aurRelX < AURELION_ATRIUM_VOID.maxX &&
              aurRelZ > AURELION_ATRIUM_VOID.minZ &&
              aurRelZ < AURELION_ATRIUM_VOID.maxZ;

            let matchedSlabY: number | null = null;
            for (let li = AURELION_LEVEL_ORDER.length - 1; li >= 0; li--) {
              const id = AURELION_LEVEL_ORDER[li];
              const spec = AURELION_LEVELS[id];
              const walkableHalfW = id === 'F5' ? 15.1 : spec.halfWidth + 0.2;
              const walkableHalfD = id === 'F5' ? 12.1 : spec.halfDepth + 0.2;
              if (Math.abs(aurRelX) > walkableHalfW || Math.abs(aurRelZ) > walkableHalfD) continue;
              if (spec.hasAtriumVoid && overAtriumVoid) continue;
              if (this.position.y >= spec.floorY - 0.95) {
                matchedSlabY = spec.floorY;
                break;
              }
            }
            effectiveGroundY = matchedSlabY !== null ? matchedSlabY : AURELION_LEVELS.B2.floorY;
          }
        }
      }
    }

    // Building 2: THE NEXUS — 8-Floor Grand Railway Intelligence Headquarters (World center (-74, 0, 62), X: [-85.2, -62.8], Z: [52.8, 71.2])
    const inCommandCentre =
      this.position.x >= -85.2 &&
      this.position.x <= -62.8 &&
      this.position.z >= 52.8 &&
      this.position.z <= 71.2;
    if (inCommandCentre) {
      const cmdLocalX = this.position.x - (-74);
      const cmdLocalZ = this.position.z - 62;

      // 1. Check Lift A & Lift B animated passenger elevator cabs first
      let ridingNexusLift = false;
      if (this.nexusElevatorsSnapshot) {
        for (const elevId of ['liftA', 'liftB'] as NexusElevatorId[]) {
          const cfg = NEXUS_ELEVATORS[elevId];
          if (Math.abs(cmdLocalX - cfg.localX) <= cfg.cabW * 0.55 && Math.abs(cmdLocalZ - cfg.localZ) <= cfg.cabD * 0.55) {
            const cabY = this.nexusElevatorsSnapshot[elevId].currentY;
            if (this.position.y >= cabY - 1.2 && this.position.y <= cabY + 2.5) {
              effectiveGroundY = cabY;
              ridingNexusLift = true;
              if (Math.abs(this.position.y - cabY) < 0.35 && this.velocity.y <= 0.5) {
                this.position.y = cabY;
              }
              break;
            }
          }
        }
      }

      if (!ridingNexusLift) {
        const onCmdStairs =
          cmdLocalX >= NEXUS_STAIRWELL.minX && cmdLocalX <= NEXUS_STAIRWELL.maxX &&
          cmdLocalZ >= NEXUS_STAIRWELL.minZ && cmdLocalZ <= NEXUS_STAIRWELL.maxZ;

        if (onCmdStairs) {
          // Determine which flight (F1->F2 .. F7->F8) matches player's vertical zone
          let activeFloorIdx = 0;
          for (let i = 0; i < 7; i++) {
            const flY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[i]].floorY;
            const nextY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[i + 1]].floorY;
            if (this.position.y >= flY - 0.6 && this.position.y < nextY - 0.35) {
              activeFloorIdx = i;
              break;
            }
            if (i === 6 && this.position.y >= nextY - 0.35) {
              activeFloorIdx = 7;
            }
          }
          if (activeFloorIdx >= 7) {
            effectiveGroundY = NEXUS_FLOORS[8].floorY;
          } else if (cmdLocalZ >= NEXUS_STAIRWELL.zEnd + 0.15) {
            effectiveGroundY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[activeFloorIdx + 1]].floorY;
          } else if (cmdLocalZ <= NEXUS_STAIRWELL.zStart - 0.15) {
            effectiveGroundY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[activeFloorIdx]].floorY;
          } else {
            const flY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[activeFloorIdx]].floorY;
            const nextY = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[activeFloorIdx + 1]].floorY;
            const p = THREE.MathUtils.clamp(
              (cmdLocalZ - NEXUS_STAIRWELL.zStart) / (NEXUS_STAIRWELL.zEnd - NEXUS_STAIRWELL.zStart),
              0,
              1
            );
            effectiveGroundY = flY + p * (nextY - flY);
          }
        } else if (this.position.y >= 30.6) {
          effectiveGroundY = 31.43; // Crown Roof Deck above Floor 8
        } else {
          let matchedY = NEXUS_FLOORS[1].floorY;
          for (let i = NEXUS_FLOOR_ORDER.length - 1; i >= 0; i--) {
            const fy = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[i]].floorY;
            if (this.position.y >= fy - 0.85) {
              matchedY = fy;
              break;
            }
          }
          effectiveGroundY = matchedY;
        }
      }
    }

    // Building 3: 3-Level Vertical Security Garage (World center (-74, 0, 6), X: [-84.3, -63.7], Z: [-1.3, 13.3])
    const inSecurityGarage =
      this.position.x >= -84.3 &&
      this.position.x <= -63.7 &&
      this.position.z >= -1.3 &&
      this.position.z <= 13.3;
    if (inSecurityGarage) {
      const gLocalX = this.position.x - (-74);
      const gLocalZ = this.position.z - 6;
      const inRearStairCorridor = gLocalZ >= 4.4 && gLocalZ <= 6.4;

      if (inRearStairCorridor && gLocalX >= -8.7 && gLocalX <= -0.8 && this.position.y < 4.9) {
        const p1 = THREE.MathUtils.clamp((gLocalX + 8.4) / 7.2, 0, 1);
        effectiveGroundY = 0.36 + p1 * 4.31;
      } else if (inRearStairCorridor && gLocalX >= -0.7 && gLocalX <= 7.1 && this.position.y >= 4.1) {
        const p2 = THREE.MathUtils.clamp((gLocalX + 0.4) / 7.2, 0, 1);
        effectiveGroundY = 4.67 + p2 * 4.48;
      } else if (this.position.y >= 8.2) {
        effectiveGroundY = 9.15; // Level 3 Roof Drone Pad
      } else if (this.position.y >= 4.1) {
        effectiveGroundY = 4.67; // Level 2 Mezzanine Workshop
      } else {
        effectiveGroundY = Math.max(effectiveGroundY, 0.36); // Level 1 4-Bay Hangar
      }
    }

    // Sanctuary railway terminal: solid ground, mezzanine, dual skywalks, central
    // over-track air concourse, rooftop helipad terrace, 8 island platforms,
    // escalators, lifts, and platform descent stairs aligned to MegaStationArchitecture.
    const railwayStationIndex = Math.round(this.position.x / 1200);
    const railwayStationX = railwayStationIndex * 1200;
    const railwayHallZ = 265;
    if (Math.abs(this.position.x - railwayStationX) <= 90) {
      const stationGroundAt = (z: number): number => {
        const sampleSpacing = 128;
        const x0 = Math.floor(railwayStationX / sampleSpacing) * sampleSpacing;
        const x1 = x0 + sampleSpacing;
        const blend = THREE.MathUtils.smoothstep((railwayStationX - x0) / sampleSpacing, 0, 1);
        return THREE.MathUtils.lerp(
          getTerrainHeight(x0, z, this.worldSeed),
          getTerrainHeight(x1, z, this.worldSeed),
          blend
        );
      };
      const stationBaseY = this.aiTrainManager
        ? this.aiTrainManager.trackSurfaceY(railwayStationX, railwayHallZ) - 0.37
        : stationGroundAt(railwayHallZ);
      const localX = this.position.x - railwayStationX;
      const localZ = this.position.z;
      const platformTrackZs = [138, 150, 162, 174, 186, 198, 210, 222];
      let onStationSurface = false;

      // 1. Platform descent stairs connecting BOTH West (X=-64) & East (X=+64) Skywalks to all 8 Island Platforms
      for (const trackZ of platformTrackZs) {
        const platformZ = trackZ + 6.0;
        const platformSurfaceY = this.aiTrainManager
          ? this.aiTrainManager.trackSurfaceY(railwayStationX, trackZ) + 0.95
          : stationGroundAt(trackZ) + 1.32;
        if (Math.abs(localZ - (platformZ - 1.4)) <= 1.3 && localX >= -83 && localX <= -63) {
          const progress = THREE.MathUtils.clamp((localX + 82) / 18, 0, 1);
          effectiveGroundY = platformSurfaceY + progress * (stationBaseY + 9.80 - platformSurfaceY);
          onStationSurface = true;
          break;
        }
        if (Math.abs(localZ - (platformZ + 1.4)) <= 1.3 && localX >= 63 && localX <= 83) {
          const progress = THREE.MathUtils.clamp((82 - localX) / 18, 0, 1);
          effectiveGroundY = platformSurfaceY + progress * (stationBaseY + 9.80 - platformSurfaceY);
          onStationSurface = true;
          break;
        }
      }

      // 2. Rooftop access staircase / escalator: Level 3 West Terrace (9.80) -> Level 4 Helipad & Solar Terrace (14.50)
      if (
        !onStationSurface &&
        this.position.y >= stationBaseY + 7.4 &&
        localX >= -43.0 &&
        localX <= -29.0 &&
        Math.abs(localZ - (railwayHallZ + 17)) <= 1.5
      ) {
        const progress = THREE.MathUtils.clamp((localX + 42) / 12.0, 0, 1);
        effectiveGroundY = stationBaseY + 9.80 + progress * 4.70;
        onStationSurface = true;
        if (!input.forward && !input.backward && !input.left && !input.right && localX >= -41.8 && localX <= -30.2) {
          this.position.x += 1.6 * delta;
        }
      }

      // 3. Level 3 Dual Skywalks (West X=-64, East X=+64), Connectors, Central Air Concourse & Cross-Bridge
      if (!onStationSurface && this.position.y >= stationBaseY + 7.4) {
        const onWestSkywalk = localX >= -68.9 && localX <= -59.1 && localZ >= 108 && localZ <= 268;
        const onEastSkywalk = localX >= 59.1 && localX <= 68.9 && localZ >= 108 && localZ <= 268;
        const onSkywalkConnector = Math.abs(localX) >= 46 && Math.abs(localX) <= 64.5 && localZ >= 260 && localZ <= 270;
        const onCentralAirConcourse = Math.abs(localX) <= 10.2 && localZ >= 136 && localZ <= 246;
        const onCrossBridge = Math.abs(localZ - 186) <= 4.7 && Math.abs(localX) <= 64.5;
        if (onWestSkywalk || onEastSkywalk || onSkywalkConnector || onCentralAirConcourse || onCrossBridge) {
          effectiveGroundY = stationBaseY + 9.80;
          onStationSurface = true;
        }
      }

      // 4. Animated Escalator Cores (West & East): L0 (0.27) <-> L1 (4.70) <-> L3 (9.80)
      if (!onStationSurface && this.position.y < stationBaseY + 12.2) {
        const isIdleOnTread = !input.forward && !input.backward && !input.left && !input.right;
        if (localX >= -25.0 && localX <= -13.5) {
          const progress = THREE.MathUtils.clamp((localX + 24) / 10.0, 0, 1);
          if (Math.abs(localZ - (railwayHallZ + 9)) <= 1.5 && this.position.y < stationBaseY + 7.0) {
            effectiveGroundY = stationBaseY + 0.27 + progress * 4.43;
            onStationSurface = true;
            if (isIdleOnTread && localX >= -23.8 && localX <= -14.2) {
              this.position.x += 1.6 * delta;
            }
          } else if (Math.abs(localZ - (railwayHallZ + 17)) <= 1.5 && this.position.y >= stationBaseY + 2.5) {
            effectiveGroundY = stationBaseY + 4.70 + progress * 5.10;
            onStationSurface = true;
            if (isIdleOnTread && localX >= -23.8 && localX <= -14.2) {
              this.position.x += 1.6 * delta;
            }
          }
        } else if (localX >= 13.5 && localX <= 25.0) {
          const progress = THREE.MathUtils.clamp((24 - localX) / 10.0, 0, 1);
          if (Math.abs(localZ - (railwayHallZ + 9)) <= 1.5 && this.position.y < stationBaseY + 7.0) {
            effectiveGroundY = stationBaseY + 0.27 + progress * 4.43;
            onStationSurface = true;
            if (isIdleOnTread && localX >= 14.2 && localX <= 23.8) {
              this.position.x -= 1.6 * delta;
            }
          } else if (Math.abs(localZ - (railwayHallZ + 17)) <= 1.5 && this.position.y >= stationBaseY + 2.5) {
            effectiveGroundY = stationBaseY + 4.70 + progress * 5.10;
            onStationSurface = true;
            if (isIdleOnTread && localX >= 14.2 && localX <= 23.8) {
              this.position.x -= 1.6 * delta;
            }
          }
        }
      }

      // 5. Four primary glass elevators: vertical travel with moving cabin floor
      if (!onStationSurface && this.aiTrainManager) {
        const stationIdx = Math.round(this.position.x / 1200);
        const liftShafts = [
          { lx: -48, lz: railwayHallZ - 14, liftIdx: 1 },
          { lx: -48, lz: railwayHallZ + 14, liftIdx: 2 },
          { lx: 48, lz: railwayHallZ - 14, liftIdx: 3 },
          { lx: 48, lz: railwayHallZ + 14, liftIdx: 4 },
        ];
        for (const shaft of liftShafts) {
          if (Math.abs(localX - shaft.lx) <= 1.25 && Math.abs(localZ - shaft.lz) <= 1.25) {
            const cabinY = this.aiTrainManager.getStationLiftCabinY(stationIdx, shaft.liftIdx);
            if (cabinY !== null && cabinY !== undefined) {
              effectiveGroundY = cabinY + 0.16;
              onStationSurface = true;
              break;
            }
          }
        }
      }

      // 6. Four walkable terminal levels inside main terminal footprint (X ∈ [-60, +60], Z ∈ [239, 291])
      if (!onStationSurface && Math.abs(localX) <= 60 && localZ >= 239 && localZ <= 291) {
        const inLevel4Rooftop =
          (Math.abs(localX) >= 6 && Math.abs(localX) <= 52 && localZ >= 242 && localZ <= 288) ||
          (Math.abs(localX) <= 6 && localZ >= 242 && localZ <= 256);
        const inUpperGallery =
          !(Math.abs(localX) < 14 && Math.abs(localZ - railwayHallZ) < 12);

        if (inLevel4Rooftop && this.position.y >= stationBaseY + 12.2) {
          effectiveGroundY = stationBaseY + 14.50;
        } else if (inUpperGallery && this.position.y >= stationBaseY + 7.4) {
          effectiveGroundY = stationBaseY + 9.80;
        } else if (inUpperGallery && this.position.y >= stationBaseY + 3.0 && this.position.y < stationBaseY + 7.4) {
          effectiveGroundY = stationBaseY + 4.70;
        } else {
          effectiveGroundY = stationBaseY + 0.27;
        }
        onStationSurface = true;
      }

      // 7. Forecourt multi-modal transport plaza apron (Fountain, Autos, Buses, Checkpoint)
      if (!onStationSurface && Math.abs(localX) <= 66 && localZ >= railwayHallZ + 28 && localZ <= railwayHallZ + 80) {
        const forecourtBaseY = this.aiTrainManager
          ? this.aiTrainManager.trackSurfaceY(railwayStationX, railwayHallZ + 55) - 0.37
          : stationGroundAt(railwayHallZ + 55);
        effectiveGroundY = forecourtBaseY + 0.25;
        onStationSurface = true;
      }

      // 8. Eight solid island platform decks (X ∈ [-88, +88], Z = trackZ + 6.0 ± 3.25)
      if (!onStationSurface && Math.abs(localX) <= 88) {
        for (const trackZ of platformTrackZs) {
          const platformZ = trackZ + 6.0;
          if (Math.abs(localZ - platformZ) <= 3.25) {
            effectiveGroundY = this.aiTrainManager
              ? this.aiTrainManager.trackSurfaceY(railwayStationX, trackZ) + 0.95
              : stationGroundAt(trackZ) + 1.32;
            onStationSurface = true;
            break;
          }
        }
      }
    }

    // Rear mansion patio terrace (-35 to -17, Z: 44.8 to 51.0)
    const isInBackyardPatio =
      this.position.x >= -35.0 &&
      this.position.x <= -17.0 &&
      this.position.z >= 44.8 &&
      this.position.z <= 51.0;
    if (isInBackyardPatio && this.position.y <= 0.8) {
      effectiveGroundY = Math.max(effectiveGroundY, 0.245);
    }

    // Constructed structures support (wooden foundations, cabins, floors)
    for (const struct of buildingMgr.structures) {
      const def = STRUCTURES[struct.typeId];
      if (!def) continue;
      const structTopY = struct.position[1] + (def.height || 0.2);
      const halfW = (def.width || 2) * 0.5 + 0.2;
      const halfD = (def.depth || 2) * 0.5 + 0.2;
      if (
        Math.abs(this.position.x - struct.position[0]) <= halfW &&
        Math.abs(this.position.z - struct.position[2]) <= halfD
      ) {
        if (this.position.y >= structTopY - 0.5 && structTopY > effectiveGroundY) {
          effectiveGroundY = structTopY;
        }
      }
    }

    // Streamed Earth building interiors (Y <= -35)
    let inStreamedInterior = false;
    if (this.interiorStreamingManager && this.interiorStreamingManager.isInsideInterior(this.position.y)) {
      const intFloor = this.interiorStreamingManager.getFloorElevationAt(
        this.position.x,
        this.position.y,
        this.position.z
      );
      if (intFloor !== null) {
        effectiveGroundY = intFloor;
        inStreamedInterior = true;
      }
    }

    // Water level check: natural water and the bounded rooftop swimming pool.
    const naturalWaterDepth = 0.0 - terrainY;
    const inNaturalWater = !inStreamedInterior && naturalWaterDepth > 1.6 && this.position.y < 0.2 && effectiveGroundY >= terrainY;
    const inWaterZone = inApartmentPool || inNaturalWater;
    if (!inApartmentPool) waterSurfaceY = 0.0;

    this.isSwimming = inWaterZone;
    this.isSubmerged = inWaterZone && (this.position.y + this.eyeHeight < waterSurfaceY);

    // Crouch & Sprint check
    this.isCrouching = Boolean(input.crouch && !this.isSwimming && !this.isSleeping && !this.isHouseInteracting);
    const targetEyeHeight = this.isCrouching ? 1.15 : 1.7;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEyeHeight, 12, delta);

    this.isSprinting = input.sprint && !this.isCrouching && isMoving && stamina > 5;
    const baseSpeed = this.isSwimming
      ? (this.isSprinting ? 5.2 : 3.4)
      : this.isCrouching
        ? this.walkSpeed * 0.58
        : (this.isSprinting ? this.runSpeed : this.walkSpeed);
    const currentSpeed = input.isAnalog ? baseSpeed * Math.min(1.0, inputLen) : baseSpeed;

    if (this.isSprinting) {
      staminaDelta = -18 * delta;
    } else if (!isMoving) {
      staminaDelta = +14 * delta;
    } else {
      staminaDelta = +4 * delta;
    }

    // World direction relative to camera yaw
    if (isMoving) {
      const normX = input.isAnalog ? (moveX / inputLen) : (moveX / Math.max(0.001, inputLen));
      const normZ = input.isAnalog ? (moveZ / inputLen) : (moveZ / Math.max(0.001, inputLen));

      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);

      const worldMoveX = (-sin * normZ + cos * normX) * currentSpeed;
      const worldMoveZ = (-cos * normZ - sin * normX) * currentSpeed;

      const newPosX = this.position.x + worldMoveX * delta;
      const newPosZ = this.position.z + worldMoveZ * delta;

      // Collision helper with placed structures
      const checkBlocked = (checkX: number, checkZ: number): boolean => {
        for (const struct of buildingMgr.structures) {
          if (struct.isOpen) continue;
          const def = STRUCTURES[struct.typeId];
          if (!def) continue;
          if (def.category === 'structure' && def.height < 0.5) continue;

          if (struct.typeId === 'perimeter_torch' || struct.typeId === 'modern_lamp') {
            const tdx = struct.position[0] - checkX;
            const tdz = struct.position[2] - checkZ;
            if (Math.hypot(tdx, tdz) < 0.35) return true;
            continue;
          }

          const cosR = Math.cos(-struct.rotationY);
          const sinR = Math.sin(-struct.rotationY);
          const worldDx = checkX - struct.position[0];
          const worldDz = checkZ - struct.position[2];
          const localX = worldDx * cosR - worldDz * sinR;
          const localZ = worldDx * sinR + worldDz * cosR;

          const playerR = 0.35;
          const halfW = (def.width / 2) + playerR;
          const halfD = (def.depth / 2) + playerR;

          if (Math.abs(localX) < halfW && Math.abs(localZ) < halfD) {
            return true;
          }
        }
        return false;
      };

      const desiredPos = PlayerController._tmpDesiredPos.set(newPosX, this.position.y, newPosZ);
      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        const resolved = physMgr.resolveMovement(this.position, desiredPos, 0.38, 1.85);
        this.position.x = resolved.resolvedPos.x;
        this.position.z = resolved.resolvedPos.z;
      } else {
        if (!checkBlocked(newPosX, newPosZ)) {
          this.position.x = newPosX;
          this.position.z = newPosZ;
        } else if (!checkBlocked(newPosX, this.position.z)) {
          this.position.x = newPosX;
        } else if (!checkBlocked(this.position.x, newPosZ)) {
          this.position.z = newPosZ;
        }
      }

      if (!this.isSwimming) {
        const surface = physMgr ? physMgr.getSurfaceProfileAt(this.position.x, this.position.z) : null;
        this.footstepTimer += delta * (this.isSprinting ? 1.6 : this.isCrouching ? 0.65 : 1.0) * (surface?.dragFactor || 1.0);
        if (this.footstepTimer > 0.42) {
          this.footstepTimer = 0;
          if (this.position.y < 0.25 && terrainY < 0.05) {
            soundEngine.playSurfaceFootstep('water');
          } else if (this.position.y > effectiveGroundY + 0.1 || Math.abs(this.position.x + 26) < 16 && Math.abs(this.position.z - 38) < 14) {
            soundEngine.playSurfaceFootstep('wood');
          } else if (this.position.y > 26) {
            soundEngine.playSurfaceFootstep('snow');
          } else {
            soundEngine.playSurfaceFootstep('dirt');
          }
        }
      }
    }

    // Step-up assistance for curbs, road borders, and slight slopes (up to 0.45m)
    if (this.isGrounded && effectiveGroundY > this.position.y && effectiveGroundY - this.position.y <= 0.45) {
      this.position.y = effectiveGroundY;
    }

    // Vertical physics: sleeping or house interactions lock the survivor safely in pose.
    if (this.isSleeping || this.isHouseInteracting) {
      this.velocity.set(0, 0, 0);
      this.isGrounded = true;
    } else if (this.isSwimming) {
      // Water buoyancy and vertical control
      if (input.jump) {
        // Swim upwards towards surface
        this.velocity.y = Math.min(3.8, this.velocity.y + 12.0 * delta);
      } else if (input.crouch || input.dive) {
        // Dive downwards underwater
        this.velocity.y = Math.max(-3.5, this.velocity.y - 12.0 * delta);
      } else {
        // Natural surface buoyancy: gently push toward water line
        const targetWaterY = waterSurfaceY - 0.3;
        const diff = targetWaterY - this.position.y;
        this.velocity.y = THREE.MathUtils.damp(this.velocity.y, diff * 3.5, 6, delta);
      }
      this.position.y += this.velocity.y * delta;
      // Cap at water surface (cannot fly out of water unless jumping)
      if (!input.jump && this.position.y > waterSurfaceY - 0.2) {
        this.position.y = waterSurfaceY - 0.2;
        this.velocity.y = Math.min(0, this.velocity.y);
      }

      // Solid seabed / riverbed collision while swimming
      if (this.position.y <= effectiveGroundY) {
        this.position.y = effectiveGroundY;
        this.velocity.y = Math.max(0, this.velocity.y);
        this.isGrounded = true;
      }
    } else {
      // Land gravity & jump
      if (input.jump && this.isGrounded && stamina > 12) {
        this.velocity.y = 6.2;
        this.isGrounded = false;
        staminaDelta -= 12;
      }

      this.velocity.y -= 19.8 * delta;
      this.position.y += this.velocity.y * delta;

      if (this.position.y <= effectiveGroundY) {
        this.position.y = effectiveGroundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Absolute safety clamp: Player is NEVER allowed beneath solid ground
    if (this.position.y < effectiveGroundY && !this.isHouseInteracting) {
      this.position.y = effectiveGroundY;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.isGrounded = true;
    }

    // Track landing compression impulse for grounded weight & camera shock
    const landedNow = this.isGrounded && !this.wasGrounded && !this.isSwimming;
    if (landedNow) {
      this.landCompression = 0.22;
    }
    this.wasGrounded = this.isGrounded;
    this.landCompression = THREE.MathUtils.damp(this.landCompression, 0, 12, delta);
    this.recoilKick = THREE.MathUtils.damp(this.recoilKick, 0, 14, delta);

    // Advance smooth gait & idle breathing clocks
    this.idlePhase += delta * 2.1;
    if (isMoving) {
      this.stridePhase += delta * (currentSpeed / 4.2) * 8.5;
    }

    // Avatar position & rotation (faces player yaw)
    this.avatarGroup.position.set(this.position.x, this.position.y - this.landCompression * 0.25, this.position.z);
    if (!this.isHouseInteracting) {
      this.avatarGroup.rotation.y = this.yaw;
    }

    // Articulated multi-joint posture & limb animation (skip if house interaction controller is authoritatively animating limbs)
    if (!this.isHouseInteracting) {
      const leftLeg = this.avatarGroup.getObjectByName('leftLeg');
      const rightLeg = this.avatarGroup.getObjectByName('rightLeg');
      const leftShin = this.avatarGroup.getObjectByName('leftShin');
      const rightShin = this.avatarGroup.getObjectByName('rightShin');
      const leftArm = this.avatarGroup.getObjectByName('leftArm');
      const rightArm = this.avatarGroup.getObjectByName('rightArm');
      const leftForearm = this.avatarGroup.getObjectByName('leftForearm');
      const rightForearm = this.avatarGroup.getObjectByName('rightForearm');
      const torso = this.avatarGroup.getObjectByName('torso');
      const head = this.avatarGroup.getObjectByName('head');

      if (this.isSleeping) {
        this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, 0, 8, delta);
        this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, Math.PI / 2, 8, delta);
        if (leftArm) leftArm.rotation.x = -0.12;
        if (rightArm) rightArm.rotation.x = -0.12;
        if (leftLeg) leftLeg.rotation.x = 0.08;
        if (rightLeg) rightLeg.rotation.x = 0.08;
        if (leftForearm) leftForearm.rotation.x = -0.2;
        if (rightForearm) rightForearm.rotation.x = -0.2;
        if (leftShin) leftShin.rotation.x = 0.12;
        if (rightShin) rightShin.rotation.x = 0.12;
      } else if (this.isSwimming) {
        this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, 0, 10, delta);
        this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, 0.78, 8, delta);
        const swimCycle = Math.sin(this.idlePhase * 3.8);
        if (leftLeg && rightLeg) {
          leftLeg.rotation.x = swimCycle * 0.68;
          rightLeg.rotation.x = -swimCycle * 0.68;
        }
        if (leftShin && rightShin) {
          leftShin.rotation.x = Math.max(0.08, -swimCycle * 0.45);
          rightShin.rotation.x = Math.max(0.08, swimCycle * 0.45);
        }
        if (leftArm) {
          leftArm.rotation.x = -Math.PI / 3 + Math.cos(this.idlePhase * 2.8) * 0.55;
        }
        if (leftForearm) leftForearm.rotation.x = -0.55;
      } else {
        this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, 0, 10, delta);
        const targetPitch = this.isCrouching ? 0.24 : (isMoving && this.isSprinting ? -0.11 : 0);
        this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, targetPitch, 10, delta);
        this.avatarGroup.scale.y = THREE.MathUtils.damp(this.avatarGroup.scale.y, this.isCrouching ? 0.82 : 1.0, 10, delta);

        const swingAmp = this.isSprinting ? 0.72 : this.isCrouching ? 0.42 : 0.55;
        const cycle = Math.sin(this.stridePhase);
        const cycleCos = Math.cos(this.stridePhase);

        if (leftLeg && rightLeg) {
          if (!this.isGrounded) {
            // Mid-air tuck pose
            leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.35, 10, delta);
            rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.22, 10, delta);
            if (leftShin) leftShin.rotation.x = THREE.MathUtils.damp(leftShin.rotation.x, 0.65, 10, delta);
            if (rightShin) rightShin.rotation.x = THREE.MathUtils.damp(rightShin.rotation.x, 0.35, 10, delta);
          } else if (isMoving) {
            leftLeg.rotation.x = cycle * swingAmp;
            rightLeg.rotation.x = -cycle * swingAmp;
            // Realistic knee bend on rear push-off and forward lift
            if (leftShin) leftShin.rotation.x = Math.max(0.05, -cycleCos * 0.55 + (cycle < 0 ? 0.35 : 0.1));
            if (rightShin) rightShin.rotation.x = Math.max(0.05, cycleCos * 0.55 + (cycle > 0 ? 0.35 : 0.1));
          } else {
            leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 12, delta);
            rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 12, delta);
            if (leftShin) leftShin.rotation.x = THREE.MathUtils.damp(leftShin.rotation.x, 0.04, 12, delta);
            if (rightShin) rightShin.rotation.x = THREE.MathUtils.damp(rightShin.rotation.x, 0.04, 12, delta);
          }
        }

        if (leftArm) {
          if (isMoving) {
            leftArm.rotation.x = -cycle * (swingAmp * 0.85);
            if (leftForearm) leftForearm.rotation.x = -0.38 - Math.max(0, -cycle) * 0.35;
          } else {
            leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, Math.sin(this.idlePhase) * 0.03, 10, delta);
            if (leftForearm) leftForearm.rotation.x = THREE.MathUtils.damp(leftForearm.rotation.x, -0.22, 10, delta);
          }
        }

        // Subtle torso breathing expansion & stride counter-twist
        if (torso) {
          const breath = 1.0 + Math.sin(this.idlePhase) * 0.018;
          torso.scale.set(breath, 1.0, breath);
          torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, isMoving ? cycle * 0.08 : 0, 10, delta);
        }
        if (head) {
          head.rotation.x = THREE.MathUtils.damp(head.rotation.x, Math.sin(this.idlePhase * 0.7) * 0.025, 8, delta);
          head.rotation.y = THREE.MathUtils.damp(head.rotation.y, isMoving ? -cycle * 0.05 : Math.sin(this.idlePhase * 0.45) * 0.04, 8, delta);
        }
      }

      // Action tool swing + articulated forearm snap
      if (rightArm) {
        if (this.swingProgress < 1.0) {
          this.swingProgress += delta / this.swingDuration;
          const tSwing = Math.min(1.0, this.swingProgress);
          const swingFactor = Math.sin(tSwing * Math.PI);
          rightArm.rotation.x = -Math.PI / 4 - swingFactor * 1.15;
          rightArm.rotation.y = -swingFactor * 0.25;
          if (rightForearm) rightForearm.rotation.x = -0.35 - swingFactor * 0.55;
        } else {
          const aimPitch = this.activeHeldItem?.id === 'pulse_crossbow' ? -Math.PI / 2.25 : -Math.PI / 4;
          const runArmMod = isMoving && !this.isSwimming ? Math.sin(this.stridePhase) * 0.16 : Math.sin(this.idlePhase) * 0.02;
          rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, aimPitch + runArmMod - this.recoilKick * 0.35, 16, delta);
          rightArm.rotation.y = THREE.MathUtils.damp(rightArm.rotation.y, 0, 16, delta);
          if (rightForearm) {
            const targetElbow = this.activeHeldItem?.id === 'pulse_crossbow' ? -0.25 : -0.38;
            rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, targetElbow, 14, delta);
          }
        }
      }
    }

    // Player-side social animation is timed with the selected friend gesture.
    if (!this.isHouseInteracting && this.socialActionTimer > 0 && this.socialAction) {
      this.socialActionTimer = Math.max(0, this.socialActionTimer - delta);
      const leftArm = this.avatarGroup.getObjectByName('leftArm');
      const rightArm = this.avatarGroup.getObjectByName('rightArm');
      const leftLeg = this.avatarGroup.getObjectByName('leftLeg');
      const rightLeg = this.avatarGroup.getObjectByName('rightLeg');
      const wave = Math.sin(performance.now() * 0.012);
      const lift = this.socialAction === 'Dance' ? 1.05 + wave * 0.18 : this.socialAction === 'Clap' ? 0.95 : 0.72;
      if (leftArm) leftArm.rotation.z = lift;
      if (rightArm) rightArm.rotation.z = -lift;
      if (this.socialAction === 'Clap') {
        if (leftArm) leftArm.rotation.x = -0.3;
        if (rightArm) rightArm.rotation.x = -0.3;
      }
      if (this.socialAction === 'Dance') {
        if (leftLeg) leftLeg.rotation.x = wave * 0.5;
        if (rightLeg) rightLeg.rotation.x = -wave * 0.5;
      }
      if (this.socialActionTimer <= 0 && this.socialAction !== 'Dance') {
        this.socialAction = '';
        if (leftArm) leftArm.rotation.z = 0;
        if (rightArm) rightArm.rotation.z = 0;
      }
    }

    // First-person Viewmodel Visibility & Tactile Kinematics
    const showFP =
      this.cameraView === 'first' &&
      !this.viewmodelOverrideHidden &&
      !this.isSleeping &&
      !this.isRestingOnMedicalBed &&
      !this.isHouseInteracting;
    this.fpViewmodelGroup.visible = showFP;
    if (showFP) {
      const fpRight = this.fpViewmodelGroup.getObjectByName('fpRightArm');
      const fpLeft = this.fpViewmodelGroup.getObjectByName('fpLeftArm');
      const breathX = Math.cos(this.idlePhase * 0.5) * 0.004;
      const breathY = Math.sin(this.idlePhase) * 0.006;
      const walkBobX = isMoving ? Math.cos(this.stridePhase) * (this.isSprinting ? 0.022 : 0.012) : 0;
      const walkBobY = isMoving ? Math.abs(Math.sin(this.stridePhase)) * (this.isSprinting ? -0.024 : -0.012) : 0;
      const crouchOffset = this.isCrouching ? -0.035 : 0;

      let swingPitch = 0;
      let swingYaw = 0;
      let swingPush = 0;
      if (this.swingProgress < 1.0) {
        const s = Math.sin(Math.min(1.0, this.swingProgress) * Math.PI);
        swingPitch = -s * 0.72;
        swingYaw = s * 0.42;
        swingPush = -s * 0.14;
      }

      if (fpRight) {
        fpRight.position.set(
          0.24 + breathX + walkBobX,
          -0.24 + breathY + walkBobY + crouchOffset - this.landCompression * 0.18,
          -0.32 + swingPush + this.recoilKick * 0.09
        );
        fpRight.rotation.set(
          swingPitch + this.recoilKick * 0.22 + (this.isSprinting && !this.activeHeldItem ? -0.22 : 0),
          swingYaw,
          this.isSwimming ? Math.sin(this.idlePhase * 3.0) * 0.16 : 0
        );
      }
      if (fpLeft) {
        fpLeft.visible = Boolean(this.activeHeldItem?.id === 'pulse_crossbow' || !this.activeHeldItem);
        fpLeft.position.set(
          -0.24 - breathX - walkBobX * 0.7,
          -0.27 + breathY + walkBobY * 0.8 + crouchOffset - this.landCompression * 0.15,
          -0.34 + this.recoilKick * 0.06
        );
        fpLeft.rotation.set(
          this.isSwimming ? -Math.cos(this.idlePhase * 3.0) * 0.25 : 0,
          this.activeHeldItem?.id === 'pulse_crossbow' ? -0.35 : 0,
          0
        );
      }
    }

    // Camera Positioning (SKIP if cinematic cutscene is authoritatively controlling the camera)
    if (!isCinematicActive) {
      if (this.cameraView === 'first') {
        const strideBobY =
          isMoving && this.isGrounded && !this.isSwimming
            ? Math.abs(Math.sin(this.stridePhase)) * (this.isSprinting ? 0.052 : 0.028)
            : 0;
        const strideBobX =
          isMoving && this.isGrounded && !this.isSwimming
            ? Math.cos(this.stridePhase) * (this.isSprinting ? 0.026 : 0.012)
            : 0;

        let targetX = this.position.x + Math.cos(this.yaw) * strideBobX;
        let targetY = this.position.y + this.eyeHeight + strideBobY - this.landCompression * 0.35;
        let targetZ = this.position.z - Math.sin(this.yaw) * strideBobX;

        // First-person subtle camera shake
        if (this.shakeIntensity > 0 && this.enableCameraShake) {
          targetX += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
          targetY += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
          this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 4.0);
        }

        this.camera.position.set(targetX, targetY, targetZ);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch + this.recoilKick * 0.045;
      } else if (this.cameraView === 'second') {
      // Cinematic front-facing observer view: in front of player
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const targetX = this.position.x;
      const targetY = this.position.y + 1.15;
      const targetZ = this.position.z;
      const camX = this.position.x + forwardX * this.observerDistance;
      const camY = this.position.y + 1.9 + Math.max(-0.5, Math.min(1.2, this.pitch * 0.35));
      const camZ = this.position.z + forwardZ * this.observerDistance;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 12, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 12, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 12, delta);
      this.camera.lookAt(targetX, targetY, targetZ);
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 3.5);
    } else {
      // Third-person follow camera: positioned BEHIND player's back
      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);

      const headX = this.position.x;
      const headY = this.position.y + this.eyeHeight;
      const headZ = this.position.z;

      // Vector from head to camera (behind player in +Z when yaw=0)
      const dirX = sinY * cosP;
      const dirY = sinP + 0.15;
      const dirZ = cosY * cosP;

      let safeDistance = this.thirdPersonDistance;

      // Sample along line of sight to detect wall/roof/ground clipping
      const stepCount = 5;
      const hasStructures = buildingMgr.structures.length > 0;
      for (let i = 1; i <= stepCount; i++) {
        const testDist = (i / stepCount) * this.thirdPersonDistance;
        const testX = headX + dirX * testDist;
        const testY = headY + dirY * testDist;
        const testZ = headZ + dirZ * testDist;

        // Ground terrain check (skipped inside streamed building interiors below ground level)
        if (!inStreamedInterior) {
          const groundHeight = getTerrainHeight(testX, testZ) + 0.4;
          if (testY <= groundHeight) {
            safeDistance = Math.max(1.2, testDist - 0.3);
            break;
          }
        } else if (this.interiorStreamingManager) {
          const ceilY = this.interiorStreamingManager.getInteriorCeilingY();
          if (testY >= ceilY - 0.35 || testY <= effectiveGroundY + 0.3) {
            safeDistance = Math.max(1.2, testDist - 0.3);
            break;
          }
        }

        // Placed structure collision check
        if (hasStructures && !inStreamedInterior) {
          let hitStructure = false;
          for (const s of buildingMgr.structures) {
            const sdx = Math.abs(s.position[0] - testX);
            const sdz = Math.abs(s.position[2] - testZ);
            const sdy = testY - s.position[1];
            const halfWidth = s.typeId === 'starter_cabin' ? 3.4 : 1.8;
            const halfDepth = s.typeId === 'starter_cabin' ? 3.0 : 1.8;
            const height = s.typeId === 'starter_cabin' ? 4.0 : 3.0;

            if (sdx < halfWidth && sdz < halfDepth && sdy > 0 && sdy < height) {
              hitStructure = true;
              break;
            }
          }

          if (hitStructure) {
            safeDistance = Math.max(0.9, testDist - 0.35);
            break;
          }
        }
      }

      if (inStreamedInterior) {
        safeDistance = Math.min(safeDistance, 2.85);
      }

      // Smooth camera distance pull-in
      this.currentCamDistance = THREE.MathUtils.damp(this.currentCamDistance, safeDistance, 18, delta);

      let targetX = headX + dirX * this.currentCamDistance;
      let targetY = headY + dirY * this.currentCamDistance;
      let targetZ = headZ + dirZ * this.currentCamDistance;
      if (inStreamedInterior && this.interiorStreamingManager) {
        const ceilY = this.interiorStreamingManager.getInteriorCeilingY();
        targetY = Math.min(targetY, ceilY - 0.35);
      }

      // Camera Shake decay and offset
      if (this.shakeIntensity > 0) {
        if (this.enableCameraShake) {
          targetX += (Math.random() - 0.5) * this.shakeIntensity;
          targetY += (Math.random() - 0.5) * this.shakeIntensity;
          targetZ += (Math.random() - 0.5) * this.shakeIntensity;
        }
        this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 3.5);
      }

      // Smooth camera movement interpolation
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetX, 22, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetY, 22, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetZ, 22, delta);

      this.camera.lookAt(headX, headY - 0.1, headZ);
    }
  }

    return { staminaDelta, isMoving, isSwimming: this.isSwimming, isSubmerged: this.isSubmerged };
  }

  // --- High-Realism Procedural Survivor Character ---
  private createPlayerAvatar(): THREE.Group {
    const rig = buildRealisticHumanoid({
      name: 'player_survivor',
      facing: '-Z',
      skinColor: 0xdeb088,
      jacketColor: 0x3b483b,
      shirtColor: 0x1e242b,
      pantsColor: 0x242e3c,
      bootColor: 0x1d1714,
      hairColor: 0x221914,
      accentColor: 0xc29b45,
      eyeColor: 0x38667a,
      fabricStyle: 'tactical',
      genderPresentation: 'masculine',
      hairStyle: 'parted',
      hasBandana: true,
      bandanaColor: 0xa83232,
      hasBackpack: true,
      packColor: 0x2b3326,
      hasHolster: true,
      hasBelt: true,
      armAliasStyle: 'full',
      initialRightArmPitch: -Math.PI / 4,
      castShadow: true,
    });
    return rig.group;
  }
}
