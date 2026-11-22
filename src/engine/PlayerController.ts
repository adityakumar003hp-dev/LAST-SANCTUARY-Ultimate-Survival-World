import * as THREE from 'three';
import { CameraView, ItemDefinition } from '../types/game';
import { getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { soundEngine } from '../utils/audio';
import { STRUCTURES } from '../data/structures';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { buildRealisticHumanoid } from './rendering/RealisticHumanoidBuilder';
import { getWoodPBR, getMetalPBR } from '../utils/proceduralTextures';

export class PlayerController {
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

  // Visual avatar (Composite 7-part model)
  public avatarGroup: THREE.Group;
  public heldToolGroup: THREE.Group;
  public flashlight: THREE.SpotLight;
  public isFlashlightOn: boolean = false;

  // Swing and synchronized friend-social animation
  private socialAction = '';
  private socialActionTimer = 0;
  private swingProgress: number = 1.0;
  private swingDuration: number = 0.25;
  public worldSeed: number = 42;
  public aiTrainManager?: any;

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

    // Held item group (attached to right arm)
    this.heldToolGroup = new THREE.Group();
    const rightArm = this.avatarGroup.getObjectByName('rightArm');
    if (rightArm) {
      rightArm.add(this.heldToolGroup);
      this.heldToolGroup.position.set(0, -0.4, 0.2);
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
      ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(name => {
        const part = this.avatarGroup.getObjectByName(name);
        if (part) part.rotation.set(0, 0, 0);
      });
    }
  }

  public setView(view: CameraView) {
    this.cameraView = view;
    this.avatarGroup.visible = this.cameraView !== 'first';
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
    // Clear existing held tool meshes
    while (this.heldToolGroup.children.length > 0) {
      this.heldToolGroup.remove(this.heldToolGroup.children[0]);
    }

    if (!item) return;

    // Realistic multi-part PBR held item (oriented facing forward -Z)
    const metalPBR = getMetalPBR();
    const woodPBR = getWoodPBR();
    const toolMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b0,
      map: metalPBR.albedo,
      normalMap: metalPBR.normal,
      roughnessMap: metalPBR.roughness,
      metalness: 0.85,
      roughness: 0.32,
    });
    const darkGripMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x9e744e,
      map: woodPBR.albedo,
      normalMap: woodPBR.normal,
      roughnessMap: woodPBR.roughness,
      roughness: 0.78,
    });

    if (item.toolType === 'axe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.74, 10), woodMat);
      handle.rotation.x = Math.PI / 2;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), darkGripMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0, 0, 0.25);
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.12), toolMat);
      collar.position.set(0, 0.02, -0.32);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 4), toolMat);
      blade.rotation.z = Math.PI / 2;
      blade.scale.set(0.32, 1.0, 1.4);
      blade.position.set(0, -0.05, -0.32);
      this.heldToolGroup.add(handle, grip, collar, blade);
    } else if (item.toolType === 'pickaxe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.78, 10), woodMat);
      handle.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 10), toolMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(0, 0, -0.34);
      const pickF = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 6), toolMat);
      pickF.rotation.x = -Math.PI / 2;
      pickF.position.set(0, -0.08, -0.34);
      const pickB = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), toolMat);
      pickB.rotation.x = Math.PI / 2;
      pickB.position.set(0, 0.08, -0.34);
      this.heldToolGroup.add(handle, hub, pickF, pickB);
    } else if (item.toolType === 'hammer') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.64, 10), woodMat);
      handle.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 10), toolMat);
      head.position.set(0, 0, -0.28);
      this.heldToolGroup.add(handle, head);
    } else if (item.id === 'stun_baton') {
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.82, 12), darkGripMat);
      baton.rotation.x = Math.PI / 2;
      const coil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.28, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.6, roughness: 0.2 })
      );
      coil.rotation.x = Math.PI / 2;
      coil.position.set(0, 0, -0.27);
      const emitter = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), toolMat);
      emitter.position.set(0, 0, -0.4);
      this.heldToolGroup.add(baton, coil, emitter);
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
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.18, 10), toolMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.1, -0.05);
      this.heldToolGroup.add(stock, rail, limbL, limbR, scope);
    }
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

    // Five-floor apartment compound with retained basement (-26, 0, 38)
    let inApartmentPool = false;
    let waterSurfaceY = 0.0;
    const isInsideApartmentFootprint =
      this.position.x >= -34.8 &&
      this.position.x <= -17.2 &&
      this.position.z >= 30.2 &&
      this.position.z <= 45.8;

    if (isInsideApartmentFootprint) {
      // Rooftop basin occupies the south-west portion of the roof.
      // Only the basin volume is water; all surrounding terrace tiles stay dry.
      inApartmentPool =
        this.position.x >= -31.5 && this.position.x <= -25.5 &&
        this.position.z >= 35.0 && this.position.z <= 41.0 &&
        this.position.y >= 11.2 && this.position.y <= 14.0;
      if (inApartmentPool) {
        waterSurfaceY = 12.82;
        const atPoolExitSteps =
          this.position.x >= -28.2 && this.position.x <= -26.4 &&
          this.position.z >= 38.0 && this.position.z <= 41.0;
        // Jumping at the built-in exit steps lets the survivor climb back onto the deck.
        if (input.jump && atPoolExitSteps && this.position.y >= 11.5) {
          inApartmentPool = false;
          effectiveGroundY = 13.1;
        }
      }

      const isInStairwell =
        this.position.x >= -22.2 && this.position.x <= -17.8 &&
        this.position.z >= 33.4 && this.position.z <= 39.8;

      if (isInStairwell) {
        // Switchback staircase:
        // West lane (X < -20.0): Flight 0 (F1 -> F2, rises forward Z: 34.5 -> 38.7, Y: 0.245 -> 3.445)
        //                        Flight 2 (F3 -> F4, rises forward Z: 34.5 -> 38.7, Y: 6.645 -> 9.845)
        // East lane (X >= -20.0): Flight 1 (F2 -> F3, rises reverse Z: 38.7 -> 34.5, Y: 3.445 -> 6.645)
        //                         Flight 3 (F4 -> F5 roof, rises reverse Z: 38.7 -> 34.5, Y: 9.845 -> 13.045)
        //                         Basement flight (F1 -> B, descends forward Z: 34.5 -> 38.7, Y: 0.245 -> -2.955)
        const progressForward = Math.max(0, Math.min(1, (this.position.z - 34.5) / 4.2));
        const progressReverse = 1.0 - progressForward;
        const onRearLanding = this.position.z >= 38.2;
        const onFrontLanding = this.position.z <= 34.8;
        const isWestLane = this.position.x < -20.0;

        if (onRearLanding) {
          // Rear landing joins Flight 0 and Flight 1 at F2 (3.445), Flight 2 and Flight 3 at F4 (9.845), or basement
          if (this.position.y < -1.0) {
            effectiveGroundY = -2.955;
          } else if (this.position.y >= 8.2) {
            effectiveGroundY = 9.845;
          } else if (this.position.y >= 2.0) {
            effectiveGroundY = 3.445;
          } else {
            effectiveGroundY = 0.245;
          }
        } else if (onFrontLanding) {
          // Front landing joins F1 (0.245), F3 (6.645), and F5 Roof (13.045 / 13.1)
          if (this.position.y >= 11.2) {
            effectiveGroundY = 13.1;
          } else if (this.position.y >= 5.0) {
            effectiveGroundY = 6.645;
          } else {
            effectiveGroundY = 0.245;
          }
        } else {
          // On the stair flight itself
          if (isWestLane) {
            if (this.position.y >= 5.0) {
              // Flight 2: F3 -> F4
              effectiveGroundY = 6.645 + progressForward * 3.2;
            } else {
              // Flight 0: F1 -> F2
              effectiveGroundY = 0.245 + progressForward * 3.2;
            }
          } else {
            // East Lane
            if (this.position.y < 1.0) {
              // Basement flight descending forward
              effectiveGroundY = 0.245 - progressForward * 3.2;
            } else if (this.position.y >= 8.2) {
              // Flight 3: F4 -> Roof
              effectiveGroundY = 9.845 + progressReverse * 3.2;
            } else {
              // Flight 1: F2 -> F3
              effectiveGroundY = 3.445 + progressReverse * 3.2;
            }
          }
        }
      } else {
        // The rooftop is a dry terrace, not a swimming pool.
        if (inApartmentPool) {
          effectiveGroundY = 11.55; // rooftop pool basin floor
        } else if (this.position.y >= 11.8) {
          effectiveGroundY = 13.1; // Floor 5 rooftop terrace
        } else if (this.position.y >= 9.2) {
          effectiveGroundY = 9.845; // Floor 4 survival farm
        } else if (this.position.y >= 6.0) {
          effectiveGroundY = 6.645; // Floor 3 armory
        } else if (this.position.y >= 3.0) {
          effectiveGroundY = 3.445; // Floor 2 medical centre
        } else {
          effectiveGroundY = 0.245;
        }
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

    // Backyard paved stone patio and garage driveway (-45.0 to -15.0, Z: 44.8 to 60.0)
    const isInBackyardPatio =
      this.position.x >= -45.0 &&
      this.position.x <= -15.0 &&
      this.position.z >= 44.8 &&
      this.position.z <= 60.0;
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

    // Water level check: natural water and the bounded rooftop swimming pool.
    const naturalWaterDepth = 0.0 - terrainY;
    const inNaturalWater = naturalWaterDepth > 1.6 && this.position.y < 0.2 && effectiveGroundY >= terrainY;
    const inWaterZone = inApartmentPool || inNaturalWater;
    if (!inApartmentPool) waterSurfaceY = 0.0;

    this.isSwimming = inWaterZone;
    this.isSubmerged = inWaterZone && (this.position.y + this.eyeHeight < waterSurfaceY);

    // Sprint check
    this.isSprinting = input.sprint && isMoving && stamina > 5;
    const baseSpeed = this.isSwimming
      ? (this.isSprinting ? 5.2 : 3.4)
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

      const desiredPos = new THREE.Vector3(newPosX, this.position.y, newPosZ);
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
        this.footstepTimer += delta * (this.isSprinting ? 1.6 : 1.0) * (surface?.dragFactor || 1.0);
        if (this.footstepTimer > 0.42) {
          this.footstepTimer = 0;
          soundEngine.playFootstep();
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

    // Avatar position & rotation (faces player yaw)
    this.avatarGroup.position.copy(this.position);
    if (!this.isHouseInteracting) {
      this.avatarGroup.rotation.y = this.yaw;
    }

    // Swimming posture & limb animation (skip if house interaction controller is authoritatively animating limbs)
    if (!this.isHouseInteracting) {
    const leftLeg = this.avatarGroup.getObjectByName('leftLeg');
    const rightLeg = this.avatarGroup.getObjectByName('rightLeg');
    const leftArm = this.avatarGroup.getObjectByName('leftArm');
    const rightArm = this.avatarGroup.getObjectByName('rightArm');

    if (this.isSleeping) {
      // Side-lying posture with relaxed arms and legs; root stays fixed for the sleep cycle.
      this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, 0, 8, delta);
      this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, Math.PI / 2, 8, delta);
      if (leftArm) leftArm.rotation.x = -0.12;
      if (rightArm) rightArm.rotation.x = -0.12;
      if (leftLeg) leftLeg.rotation.x = 0.08;
      if (rightLeg) rightLeg.rotation.x = 0.08;
    } else if (this.isSwimming) {
      this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, 0, 10, delta);
      // Horizontal swimming tilt
      this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, 0.75, 8, delta);
      const swimCycle = Math.sin(performance.now() * 0.014);
      if (leftLeg && rightLeg) {
        leftLeg.rotation.x = swimCycle * 0.7;
        rightLeg.rotation.x = -swimCycle * 0.7;
      }
      if (leftArm) {
        leftArm.rotation.x = -Math.PI / 3 + Math.cos(performance.now() * 0.01) * 0.5;
      }
    } else {
      this.avatarGroup.rotation.z = THREE.MathUtils.damp(this.avatarGroup.rotation.z, 0, 10, delta);
      this.avatarGroup.rotation.x = THREE.MathUtils.damp(this.avatarGroup.rotation.x, 0, 10, delta);
      if (leftLeg && rightLeg) {
        if (isMoving) {
          const cycle = Math.sin(Date.now() * 0.012 * (currentSpeed / 4));
          leftLeg.rotation.x = cycle * 0.55;
          rightLeg.rotation.x = -cycle * 0.55;
        } else {
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
        }
      }
      if (leftArm) {
        leftArm.rotation.x = 0;
      }
    }

    // Action tool swing
    if (rightArm) {
      if (this.swingProgress < 1.0) {
        this.swingProgress += delta / this.swingDuration;
        const swingFactor = Math.sin(this.swingProgress * Math.PI);
        rightArm.rotation.x = -Math.PI / 4 - swingFactor * 1.2;
      } else {
        rightArm.rotation.x = -Math.PI / 4;
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

    // Camera Positioning (SKIP if cinematic cutscene is authoritatively controlling the camera)
    if (!isCinematicActive) {
      if (this.cameraView === 'first') {
      let targetX = this.position.x;
      let targetY = this.position.y + this.eyeHeight;
      let targetZ = this.position.z;

      // First-person subtle camera shake
      if (this.shakeIntensity > 0 && this.enableCameraShake) {
        targetX += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
        targetY += (Math.random() - 0.5) * this.shakeIntensity * 0.4;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 4.0);
      }

      this.camera.position.set(targetX, targetY, targetZ);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
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

        // Ground terrain check
        const groundHeight = getTerrainHeight(testX, testZ) + 0.4;
        if (testY <= groundHeight) {
          safeDistance = Math.max(1.2, testDist - 0.3);
          break;
        }

        // Placed structure collision check
        if (hasStructures) {
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

      // Smooth camera distance pull-in
      this.currentCamDistance = THREE.MathUtils.damp(this.currentCamDistance, safeDistance, 18, delta);

      let targetX = headX + dirX * this.currentCamDistance;
      let targetY = headY + dirY * this.currentCamDistance;
      let targetZ = headZ + dirZ * this.currentCamDistance;

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
