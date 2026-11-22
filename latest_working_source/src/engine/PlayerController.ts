import * as THREE from 'three';
import { CameraView, ItemDefinition } from '../types/game';
import { getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { soundEngine } from '../utils/audio';
import { STRUCTURES } from '../data/structures';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';

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
  private sleepTimer: number = 0;
  private sleepReturnPosition: THREE.Vector3 | null = null;
  private footstepTimer: number = 0;

  // Visual avatar (Composite 7-part model)
  public avatarGroup: THREE.Group;
  public heldToolGroup: THREE.Group;
  public flashlight: THREE.SpotLight;
  public isFlashlightOn: boolean = false;

  // Swing animation
  private swingProgress: number = 1.0;
  private swingDuration: number = 0.25;
  public worldSeed: number = 42;

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

    // Create mini representation of held item (oriented facing forward -Z)
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.7, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });

    if (item.toolType === 'axe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), woodMat);
      handle.rotation.x = Math.PI / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.2), toolMat);
      blade.position.set(0, 0, -0.3);
      this.heldToolGroup.add(handle, blade);
    } else if (item.toolType === 'pickaxe') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), woodMat);
      handle.rotation.x = Math.PI / 2;
      const pick = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), toolMat);
      pick.rotation.z = Math.PI / 2;
      pick.position.set(0, 0, -0.32);
      this.heldToolGroup.add(handle, pick);
    } else if (item.toolType === 'hammer') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6), woodMat);
      handle.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), toolMat);
      head.position.set(0, 0, -0.3);
      this.heldToolGroup.add(handle, head);
    } else if (item.id === 'stun_baton') {
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), toolMat);
      baton.rotation.x = Math.PI / 2;
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      glow.rotation.x = Math.PI / 2;
      glow.position.set(0, 0, -0.25);
      this.heldToolGroup.add(baton, glow);
    } else if (item.id === 'pulse_crossbow') {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.7), woodMat);
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), toolMat);
      bow.position.set(0, 0.05, -0.3);
      this.heldToolGroup.add(stock, bow);
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

    if (this.isSleeping) { moveX = 0; moveZ = 0; this.velocity.set(0, 0, 0); }
    const inputLen = Math.hypot(moveX, moveZ);
    const isMoving = !this.isSleeping && inputLen > 0.08;

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
      this.position.x >= -33.8 &&
      this.position.x <= -18.2 &&
      this.position.z >= 31.2 &&
      this.position.z <= 44.8;

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
        this.position.x >= -21.5 && this.position.x <= -18.5 &&
        this.position.z >= 34.2 && this.position.z <= 39.0;

      if (isInStairwell) {
        // Switchback staircase: flight 1 rises rearward, flight 2 returns
        // frontward in the adjacent lane, and flight 3 rises rearward again.
        const progressForward = Math.max(0, Math.min(1, (this.position.z - 34.5) / 4.2));
        const progressReverse = 1 - progressForward;
        const onRearLanding = this.position.z >= 38.15 && this.position.z <= 39.0;
        const onFrontLanding = this.position.z >= 34.2 && this.position.z <= 35.05;
        if (this.position.y < -0.2) {
          effectiveGroundY = 0.245 - progressForward * 3.2;
        } else {
          const flight = Math.max(0, Math.min(3, Math.floor(Math.max(0, this.position.y) / 3.2)));
          const forward = flight % 2 === 0;
          const progress = forward ? progressForward : progressReverse;
          effectiveGroundY = 0.245 + flight * 3.2 + progress * 3.2;
        }
        if (onRearLanding && this.position.y >= 2.65 && this.position.y < 3.9) effectiveGroundY = 3.445;
        if (onFrontLanding && this.position.y >= 5.85 && this.position.y < 7.1) effectiveGroundY = 6.645;
        if (this.position.y >= 9.2 && this.position.y < 10.8) effectiveGroundY = 9.845;
        if (this.position.y >= 12.4) effectiveGroundY = 13.045;
      } else {
        // The rooftop is a dry terrace, not a swimming pool.
        if (inApartmentPool) {
          effectiveGroundY = 8.5; // deep basin bottom, below the dry terrace deck
        } else if (this.position.y >= 8.5) {
          effectiveGroundY = 13.1;
        } else if (this.position.y >= 5.0) {
          effectiveGroundY = 6.645;
        } else if (this.position.y >= 1.8) {
          effectiveGroundY = 3.445;
        } else {
          effectiveGroundY = 0.245;
        }
      }
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

    // Vertical physics: sleeping locks the survivor safely in the bed pose.
    if (this.isSleeping) {
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
    if (this.position.y < effectiveGroundY) {
      this.position.y = effectiveGroundY;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.isGrounded = true;
    }

    // Avatar position & rotation (faces player yaw)
    this.avatarGroup.position.copy(this.position);
    this.avatarGroup.rotation.y = this.yaw;

    // Swimming posture & limb animation
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

  // --- Procedural Survivor Character (Composite 8-parts) ---
  private createPlayerAvatar(): THREE.Group {
    const group = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x3b443b, roughness: 0.85 }); // Military olive jacket
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x232b38, roughness: 0.9 }); // Dark denim
    const bootsMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 });
    const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.8 }); // Red survivor bandana
    const packMat = new THREE.MeshStandardMaterial({ color: 0x2b3126, roughness: 0.9 }); // Field pack

    // 1. Torso & Tactical Vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), jacketMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Tactical Backpack on player back (+Z)
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), packMat);
    pack.position.set(0, 1.2, 0.22);
    pack.castShadow = true;
    group.add(pack);

    // 2. Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    // Bandana
    const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.1, 0.37), bandanaMat);
    bandana.position.y = 1.8;
    group.add(bandana);

    // 3. Left Arm
    const armGeo = new THREE.BoxGeometry(0.15, 0.65, 0.15);
    armGeo.translate(0, -0.28, 0);

    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.35, 1.45, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    // 4. Right Arm (wielding arm)
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.name = 'rightArm';
    rightArm.position.set(0.35, 1.45, 0);
    rightArm.rotation.x = -Math.PI / 4;
    rightArm.castShadow = true;
    group.add(rightArm);

    // 5. Left Leg
    const legGeo = new THREE.BoxGeometry(0.18, 0.75, 0.18);
    legGeo.translate(0, -0.37, 0);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.name = 'leftLeg';
    leftLeg.position.set(-0.15, 0.75, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // Left Boot (toes facing forward -Z)
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.26), bootsMat);
    bootL.position.set(0, -0.68, -0.04);
    leftLeg.add(bootL);

    // 6. Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.name = 'rightLeg';
    rightLeg.position.set(0.15, 0.75, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Right Boot (toes facing forward -Z)
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.26), bootsMat);
    bootR.position.set(0, -0.68, -0.04);
    rightLeg.add(bootR);

    return group;
  }
}
