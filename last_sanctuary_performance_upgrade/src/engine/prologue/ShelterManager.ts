import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';

export class ShelterManager {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public entrancePos: THREE.Vector3 = new THREE.Vector3(-46, 0, 22);
  public interiorCenter: THREE.Vector3 = new THREE.Vector3(-46, -4.5, 22);
  public isDoorClosed: boolean = false;
  public doorMesh: THREE.Mesh | null = null;
  public isGeneratorRunning: boolean = true;
  public isRadioTuned: boolean = false;
  public suppliesLooted: boolean = false;

  // Interactive station meshes
  public radioMesh: THREE.Group | null = null;
  public generatorMesh: THREE.Group | null = null;
  public bedMesh: THREE.Group | null = null;
  public medicalMesh: THREE.Group | null = null;
  public storageCrateMesh: THREE.Group | null = null;
  public exitLadderMesh: THREE.Group | null = null;

  // Lighting
  private emergencyLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'underground_shelter';
    this.scene.add(this.group);

    this.entrancePos.y = getTerrainHeight(this.entrancePos.x, this.entrancePos.z);
    this.buildExteriorBunkerPortal();
    this.buildInteriorUndergroundBunker();
  }

  private buildExteriorBunkerPortal() {
    const ex = this.entrancePos.x;
    const ey = this.entrancePos.y;
    const ez = this.entrancePos.z;

    // Heavy concrete hillside archway
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x5a5e62, roughness: 0.95 });
    const archLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.8, 2.5), concreteMat);
    archLeft.position.set(ex - 1.8, ey + 1.9, ez);
    const archRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.8, 2.5), concreteMat);
    archRight.position.set(ex + 1.8, ey + 1.9, ez);
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 2.5), concreteMat);
    archTop.position.set(ex, ey + 4.0, ez);

    // Hazard Stripes & Signboard
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffd233 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.1), signMat);
    sign.position.set(ex, ey + 3.8, ez + 1.3);

    // Flashing Yellow Warning Strobe
    const strobeLight = new THREE.PointLight(0xffcc00, 2.2, 16, 2.0);
    strobeLight.position.set(ex, ey + 3.2, ez + 1.4);
    this.emergencyLights.push(strobeLight);

    // Hydraulic Blast Vault Door
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x333b42,
      metalness: 0.85,
      roughness: 0.35,
    });
    this.doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.4), doorMat);
    this.doorMesh.position.set(ex, ey + 1.6, ez);
    this.doorMesh.castShadow = true;

    // Heavy wheel lock on blast door
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd9534f, metalness: 0.7, roughness: 0.4 });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), wheelMat);
    wheel.position.set(0, 0, 0.25);
    this.doorMesh.add(wheel);

    // Start with door slightly open or ready to slam shut
    this.doorMesh.rotation.y = 0; // closed state default, opens when approaching

    this.group.add(archLeft, archRight, archTop, sign, strobeLight, this.doorMesh);
  }

  private buildInteriorUndergroundBunker() {
    const ix = this.interiorCenter.x;
    const iy = this.interiorCenter.y;
    const iz = this.interiorCenter.z;

    const bunkerWallMat = new THREE.MeshStandardMaterial({
      color: 0x3e4247,
      roughness: 0.9,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x272a2e,
      roughness: 0.85,
    });

    // Main Bunker Room (16m wide x 12m deep x 4m high)
    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ix, iy, iz);
    floor.receiveShadow = true;

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), bunkerWallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(ix, iy + 3.8, iz);

    // Walls
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 0.4), bunkerWallMat);
    wallN.position.set(ix, iy + 2, iz - 7);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 0.4), bunkerWallMat);
    wallS.position.set(ix, iy + 2, iz + 7);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 14), bunkerWallMat);
    wallW.position.set(ix - 8, iy + 2, iz);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 14), bunkerWallMat);
    wallE.position.set(ix + 8, iy + 2, iz);

    this.group.add(floor, ceiling, wallN, wallS, wallW, wallE);

    // Emergency Halogen Strip Fixtures & Single Central Bunker Light
    const lightPositions: [number, number, number][] = [
      [ix - 4, iy + 3.4, iz - 3],
      [ix + 4, iy + 3.4, iz - 3],
      [ix - 4, iy + 3.4, iz + 3],
      [ix + 4, iy + 3.4, iz + 3],
    ];
    lightPositions.forEach(([lx, ly, lz]) => {
      // Light fixture mesh with glowing emissive look
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffe0a0 })
      );
      fixture.position.set(lx, ly + 0.2, lz);
      this.group.add(fixture);
    });

    const bunkerLight = new THREE.PointLight(0xffbe76, 2.2, 22, 1.2);
    bunkerLight.position.set(ix, iy + 3.2, iz);
    this.emergencyLights.push(bunkerLight);
    this.group.add(bunkerLight);

    // 1. Radio Communication Desk (Chloe's Station)
    this.radioMesh = new THREE.Group();
    this.radioMesh.name = 'shelter_radio';
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.85 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.2), deskMat);
    desk.position.y = 0.4;
    const radioConsole = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.8 })
    );
    radioConsole.position.set(0, 1.05, 0);
    const mic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    mic.position.set(0.4, 1.1, 0.2);
    this.radioMesh.add(desk, radioConsole, mic);
    this.radioMesh.position.set(ix - 5.5, iy, iz - 5);
    this.group.add(this.radioMesh);

    // 2. Backup Diesel Generator
    this.generatorMesh = new THREE.Group();
    this.generatorMesh.name = 'shelter_generator';
    const genBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.6, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x274e13, roughness: 0.6, metalness: 0.7 })
    );
    genBody.position.y = 0.8;
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    exhaust.position.set(0.8, 1.8, 0);
    const fuelTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a1c14 })
    );
    fuelTank.rotation.z = Math.PI / 2;
    fuelTank.position.set(0, 1.4, 0.6);
    this.generatorMesh.add(genBody, exhaust, fuelTank);
    this.generatorMesh.position.set(ix + 5.5, iy, iz - 5);
    this.group.add(this.generatorMesh);

    // 3. Medical Corner & Triage Bed (Maya's Station)
    this.medicalMesh = new THREE.Group();
    this.medicalMesh.name = 'shelter_medical';
    const medBed = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.6, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x3d7068, roughness: 0.7 })
    );
    medBed.position.y = 0.3;
    const medCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.0, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.8 })
    );
    medCabinet.position.set(-1.4, 1.0, 0);
    const redCross = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xdd2222 })
    );
    redCross.position.set(-1.4, 1.5, 0.32);
    this.medicalMesh.add(medBed, medCabinet, redCross);
    this.medicalMesh.position.set(ix - 5.5, iy, iz + 4.5);
    this.group.add(this.medicalMesh);

    // 4. Bunk Sleeping Quarters
    this.bedMesh = new THREE.Group();
    this.bedMesh.name = 'shelter_bunk_beds';
    const bunkFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.2, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
    );
    bunkFrame.position.y = 1.1;
    const lowerMattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.25, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x335577 })
    );
    lowerMattress.position.y = 0.45;
    const upperMattress = lowerMattress.clone();
    upperMattress.position.y = 1.55;
    this.bedMesh.add(bunkFrame, lowerMattress, upperMattress);
    this.bedMesh.position.set(ix + 5.5, iy, iz + 4.5);
    this.group.add(this.bedMesh);

    // 5. Supply Crates & Weapon Rack
    this.storageCrateMesh = new THREE.Group();
    this.storageCrateMesh.name = 'shelter_storage';
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a583a, roughness: 0.9 });
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), crateMat);
    crate1.position.set(0, 0.45, 0);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), crateMat);
    crate2.position.set(1.3, 0.4, 0);
    const crate3 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), crateMat);
    crate3.position.set(0.6, 1.15, 0);
    this.storageCrateMesh.add(crate1, crate2, crate3);
    this.storageCrateMesh.position.set(ix, iy, iz - 5.5);
    this.group.add(this.storageCrateMesh);

    // 6. Surface Exit Hatch & Ladder
    this.exitLadderMesh = new THREE.Group();
    this.exitLadderMesh.name = 'shelter_exit_ladder';
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0xffd233, metalness: 0.8 });
    for (let r = 0; r < 9; r++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), ladderMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.5 + r * 0.45, 0);
      this.exitLadderMesh.add(rung);
    }
    this.exitLadderMesh.position.set(ix, iy, iz + 6.2);
    this.group.add(this.exitLadderMesh);
  }

  public closeAndLockBlastDoor() {
    this.isDoorClosed = true;
    if (this.doorMesh) {
      this.doorMesh.rotation.y = 0;
    }
    soundEngine.playVaultDoorThud();
  }

  public openBlastDoor() {
    this.isDoorClosed = false;
    if (this.doorMesh) {
      this.doorMesh.rotation.y = Math.PI / 2.2;
    }
    soundEngine.playBuildSnap();
  }

  public update(delta: number) {
    // Pulse warning light
    const strobe = this.emergencyLights[0];
    if (strobe) {
      strobe.intensity = 1.0 + Math.sin(performance.now() * 0.008) * 1.0;
    }
  }

  public dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
    this.emergencyLights = [];
  }
}
