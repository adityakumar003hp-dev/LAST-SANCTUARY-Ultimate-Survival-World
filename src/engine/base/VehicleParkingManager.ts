/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleState, VehicleType } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';

import type { MediaVehicleTelemetry } from '../media/MediaTypes';

export interface VehicleDefinition {
  id: string;
  name: string;
  type: VehicleType;
  defaultPos: [number, number, number];
  rotationY: number;
  maxSpeed: number;     // m/s
  accel: number;        // m/s^2
  drag: number;         // deceleration
  steerSpeed: number;   // rad/s
  fuelType: 'electric' | 'gasoline' | 'pedal';
  batteryOrFuel: number;
  fixedSpawnY?: number;
}

export interface DrivableVehicleInstance {
  def: VehicleDefinition;
  state: VehicleState;
  mesh: THREE.Group;
  currentSpeed: number;
  headlights: THREE.SpotLight[];
  strobeLight?: THREE.PointLight;
  strobeTimer: number;
  wheels: THREE.Object3D[];
  handlebarsOrSteer?: THREE.Object3D;
}

export class VehicleParkingManager {
  public scene: THREE.Scene;
  public vehicles: Map<string, DrivableVehicleInstance> = new Map();
  public activeVehicleId: string | null = null;

  // Backward-compatibility getters for single-vehicle references in GameEngine
  public get vehicleState(): VehicleState {
    if (this.activeVehicleId && this.vehicles.has(this.activeVehicleId)) {
      return this.vehicles.get(this.activeVehicleId)!.state;
    }
    // Return first vehicle by default
    const first = this.vehicles.values().next().value;
    if (first) return first.state;
    return {
      id: 'veh_enforce_01',
      name: 'Aegis Enforcer Tactical Armored SUV',
      type: 'enforce',
      position: [-40.6, 0.4, 31.0],
      rotationY: 0,
      batteryPercent: 100,
      headlightsOn: true,
      isOccupied: false,
      trunkInventory: new Array(8).fill(null),
      odometerKm: 14.8,
      isLocked: false,
      gear: 'P',
      rpm: 800,
      engineRunning: false,
      fuelType: 'gasoline',
    };
  }

  public set vehicleState(val: VehicleState) {
    if (this.activeVehicleId && this.vehicles.has(this.activeVehicleId)) {
      this.vehicles.get(this.activeVehicleId)!.state = { ...val };
      return;
    }
    const first = this.vehicles.values().next().value;
    if (first) {
      first.state = { ...val };
    }
  }

  public get currentSpeed(): number {
    if (this.activeVehicleId && this.vehicles.has(this.activeVehicleId)) {
      return this.vehicles.get(this.activeVehicleId)!.currentSpeed;
    }
    return 0;
  }

  public get mesh(): THREE.Group {
    if (this.activeVehicleId && this.vehicles.has(this.activeVehicleId)) {
      return this.vehicles.get(this.activeVehicleId)!.mesh;
    }
    const first = this.vehicles.values().next().value;
    return first ? first.mesh : new THREE.Group();
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initFleet();
  }

  private initFleet() {
    // 4-Bay Security Garage at World (-74, 0, 6) + Compound Parking Apron (-54, 0, -10)
    const definitions: VehicleDefinition[] = [
      // 1. Armored Tactical Enforcer SUV (Inside Garage Bay 1)
      {
        id: 'veh_enforce_01',
        name: 'Aegis Enforcer Tactical Armored SUV',
        type: 'enforce',
        defaultPos: [-81.35, 0.45, 6.0],
        rotationY: Math.PI,
        maxSpeed: 24.0,     // ~86 km/h
        accel: 11.5,
        drag: 3.8,
        steerSpeed: 1.6,
        fuelType: 'gasoline',
        batteryOrFuel: 98,
      },
      // 2. Modern Executive Sports Sedan (Compound Outdoor Parking Pad 1)
      {
        id: 'veh_sedan_01',
        name: 'Vanguard GT Executive Sports Sedan',
        type: 'car',
        defaultPos: [-56.0, 0.42, -10.0],
        rotationY: Math.PI,
        maxSpeed: 29.0,     // ~104 km/h
        accel: 13.5,
        drag: 3.2,
        steerSpeed: 1.85,
        fuelType: 'gasoline',
        batteryOrFuel: 92,
      },
      // 3. High-Torque Quad ATV (Compound Outdoor Parking Pad 2)
      {
        id: 'veh_atv_01',
        name: 'Predator 450 Off-Road Quad ATV',
        type: 'atv',
        defaultPos: [-51.0, 0.42, -10.0],
        rotationY: Math.PI,
        maxSpeed: 19.5,     // ~70 km/h
        accel: 15.0,
        drag: 4.2,
        steerSpeed: 2.2,
        fuelType: 'gasoline',
        batteryOrFuel: 88,
      },
      // 4. Enduro Dual-Sport Motorcycle (Inside Garage Bay 2)
      {
        id: 'veh_motorbike_01',
        name: 'Phantom 650cc Enduro Motorbike',
        type: 'motorbike',
        defaultPos: [-76.45, 0.42, 6.0],
        rotationY: Math.PI,
        maxSpeed: 32.0,     // ~115 km/h
        accel: 17.5,
        drag: 3.0,
        steerSpeed: 2.4,
        fuelType: 'gasoline',
        batteryOrFuel: 95,
      },
      // 5. Mountain Expedition Bicycle (Inside Garage Bay 3)
      {
        id: 'veh_bicycle_01',
        name: 'RidgeLine Mountain Expedition Bicycle',
        type: 'bicycle',
        defaultPos: [-71.55, 0.38, 6.0],
        rotationY: Math.PI,
        maxSpeed: 9.8,      // ~35 km/h
        accel: 6.5,
        drag: 2.5,
        steerSpeed: 2.6,
        fuelType: 'pedal',
        batteryOrFuel: 100, // infinite pedal power
      },
      // 6. Heavy Armored Hauler Truck (Inside Garage Bay 4)
      {
        id: 'veh_truck_01',
        name: 'Military Enforcement Vehicle — Armored Gun Carrier',
        type: 'armored_truck',
        defaultPos: [-66.65, 0.45, 6.0],
        rotationY: Math.PI,
        maxSpeed: 21.0,     // ~75 km/h high ramming mass
        accel: 9.5,
        drag: 4.5,
        steerSpeed: 1.35,
        fuelType: 'gasoline',
        batteryOrFuel: 94,
      },
      // 7. Tactical River Patrol Motorboat (Docked on River Bank East of Base)
      {
        id: 'veh_motorboat_01',
        name: 'Mariner 240 River Patrol Skiff',
        type: 'motorboat',
        defaultPos: [48.0, 0.15, 36.0],
        rotationY: Math.PI * 0.5,
        maxSpeed: 23.0,
        accel: 12.0,
        drag: 2.6,
        steerSpeed: 1.9,
        fuelType: 'gasoline',
        batteryOrFuel: 96,
      },
      // 8. Oakridge News 24 Live ENG Van (Media Tower Plaza West Bay)
      {
        id: 'veh_news_van_01',
        name: 'Oakridge News 24 Live ENG Van',
        type: 'news_van',
        defaultPos: [52.0, 0.38, -14.0],
        rotationY: Math.PI * 0.5,
        maxSpeed: 22.0,
        accel: 10.5,
        drag: 3.6,
        steerSpeed: 1.55,
        fuelType: 'gasoline',
        batteryOrFuel: 97,
      },
      // 9. WorldWatch Satellite Uplink Truck (Media Tower Plaza Bay 2)
      {
        id: 'veh_sat_truck_01',
        name: 'WorldWatch Satellite Uplink Truck',
        type: 'satellite_truck',
        defaultPos: [52.0, 0.42, -21.5],
        rotationY: Math.PI * 0.5,
        maxSpeed: 19.5,
        accel: 8.8,
        drag: 4.1,
        steerSpeed: 1.35,
        fuelType: 'gasoline',
        batteryOrFuel: 95,
      },
      // 10. Investigative Press 4x4 SUV (Media Tower Plaza Bay 3)
      {
        id: 'veh_reporter_suv_01',
        name: 'Press Corps 4x4 Investigative SUV',
        type: 'reporter_suv',
        defaultPos: [52.0, 0.42, -29.0],
        rotationY: Math.PI * 0.5,
        maxSpeed: 26.5,
        accel: 12.2,
        drag: 3.4,
        steerSpeed: 1.75,
        fuelType: 'gasoline',
        batteryOrFuel: 94,
      },
      // 11. Production Camera Crew Van (Media Tower East Bay)
      {
        id: 'veh_camera_van_01',
        name: 'Production Camera Crew Van',
        type: 'camera_crew_van',
        defaultPos: [80.0, 0.38, -14.5],
        rotationY: -Math.PI * 0.5,
        maxSpeed: 21.5,
        accel: 10.0,
        drag: 3.6,
        steerSpeed: 1.55,
        fuelType: 'gasoline',
        batteryOrFuel: 93,
      },
      // 12. Oakridge Radio FM 94.7 Mobile Broadcast Van (Town / Plaza Edge)
      {
        id: 'veh_radio_van_01',
        name: 'Oakridge Radio FM 94.7 Mobile Van',
        type: 'radio_van',
        defaultPos: [45.5, 0.38, -16.5],
        rotationY: Math.PI,
        maxSpeed: 22.0,
        accel: 10.2,
        drag: 3.5,
        steerSpeed: 1.6,
        fuelType: 'gasoline',
        batteryOrFuel: 98,
      },
      // 13. SkyEye 24 News Helicopter (Oakridge Media Tower Rooftop Helipad)
      {
        id: 'veh_news_heli_01',
        name: 'SkyEye 24 News Helicopter',
        type: 'news_helicopter',
        defaultPos: [63.5, 11.95, -27.0],
        rotationY: -Math.PI * 0.25,
        maxSpeed: 36.0,
        accel: 14.0,
        drag: 2.2,
        steerSpeed: 1.7,
        fuelType: 'gasoline',
        batteryOrFuel: 99,
        fixedSpawnY: 11.95,
      },
      // 14. Mobile Emergency Broadcast Command Truck (Military Outpost 7 Relay)
      {
        id: 'veh_eas_truck_01',
        name: 'Mobile Emergency Broadcast Truck',
        type: 'emergency_broadcast_truck',
        defaultPos: [936.0, 0.42, 16.0],
        rotationY: -Math.PI * 0.5,
        maxSpeed: 19.0,
        accel: 8.5,
        drag: 4.2,
        steerSpeed: 1.3,
        fuelType: 'gasoline',
        batteryOrFuel: 100,
      },
    ];

    for (const def of definitions) {
      const mesh = this.buildVehicleMesh(def);
      const groundY = TerrainGenerator.getHeight(def.defaultPos[0], def.defaultPos[2]) + 0.35;
      const spawnY = def.fixedSpawnY !== undefined ? def.fixedSpawnY : Math.max(0.35, groundY);
      mesh.position.set(def.defaultPos[0], spawnY, def.defaultPos[2]);
      mesh.rotation.y = def.rotationY;
      this.scene.add(mesh);

      const state: VehicleState = {
        id: def.id,
        name: def.name,
        type: def.type,
        position: [def.defaultPos[0], spawnY, def.defaultPos[2]],
        rotationY: def.rotationY,
        batteryPercent: def.batteryOrFuel,
        headlightsOn: true,
        isOccupied: false,
        trunkInventory: new Array(8).fill(null),
        odometerKm: Number((Math.random() * 8 + 12).toFixed(1)),
        isLocked: false,
        gear: 'P',
        rpm: 800,
        engineRunning: false,
        fuelType: def.fuelType,
      };

      const headlights: THREE.SpotLight[] = [];
      mesh.traverse((o) => {
        if (o instanceof THREE.SpotLight) {
          headlights.push(o);
        }
      });

      const wheels: THREE.Object3D[] = [];
      mesh.traverse((o) => {
        if (o.name && o.name.startsWith('wheel_')) {
          wheels.push(o);
        }
      });

      let strobeLight: THREE.PointLight | undefined;
      mesh.traverse((o) => {
        if (o.name === 'strobe_beacon' && o instanceof THREE.PointLight) {
          strobeLight = o;
        }
      });

      this.vehicles.set(def.id, {
        def,
        state,
        mesh,
        currentSpeed: 0,
        headlights,
        strobeLight,
        strobeTimer: 0,
        wheels,
      });
    }
  }

  // ==========================================
  // PROCEDURAL 3D VEHICLE MESH BUILDERS
  // ==========================================
  private buildVehicleMesh(def: VehicleDefinition): THREE.Group {
    switch (def.type) {
      case 'enforce':
        return this.createEnforcerMesh();
      case 'car':
        return this.createSedanMesh();
      case 'atv':
        return this.createATVMesh();
      case 'motorbike':
        return this.createMotorbikeMesh();
      case 'bicycle':
        return this.createBicycleMesh();
      case 'armored_truck': {
        const truck = this.createArmoredTruckMesh();
        const mount = new THREE.Group();
        mount.name = 'military_enforcement_remote_weapon_station';
        mount.position.set(0, 2.45, -0.9);
        const armor = new THREE.MeshStandardMaterial({ color: 0x202a31, metalness: 0.82, roughness: 0.38 });
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.22, 12), armor);
        ring.position.y = 0.12;
        const turretBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.95), armor);
        turretBody.position.y = 0.46;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.65, 10), armor);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.5, 1.05);
        mount.add(ring, turretBody, barrel);
        mount.userData = { weaponClass: 'game_only_stabilized_autocannon', playerOperated: true, enabled: true };
        truck.add(mount);
        return truck;
      }
      case 'motorboat':
        return this.createMotorboatMesh();
      case 'news_van':
        return this.createMediaVanMesh(0x0284c7, true, false);
      case 'satellite_truck':
        return this.createMediaVanMesh(0x1e293b, true, true);
      case 'reporter_suv':
        return this.createReporterSUVMesh();
      case 'camera_crew_van':
        return this.createMediaVanMesh(0x0f766e, false, false);
      case 'radio_van':
        return this.createMediaVanMesh(0xb45309, true, false);
      case 'emergency_broadcast_truck':
        return this.createMediaVanMesh(0x991b1b, true, true);
      case 'news_helicopter':
        return this.createNewsHelicopterMesh();
      default:
        return this.createSedanMesh();
    }
  }

  // 1. Aegis Enforcer Armored Tactical SUV
  private createEnforcerMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_enforce_group';

    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1b242e, roughness: 0.65, metalness: 0.8 }); // Matte slate armor
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f1419, roughness: 0.8, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.2, metalness: 0.9, transparent: true, opacity: 0.85 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161719, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });

    // Armored Lower Hull & Chassis
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.75, 4.8), armorMat);
    hull.position.y = 0.85;
    hull.castShadow = true;
    g.add(hull);

    // Armored Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 2.8), armorMat);
    cabin.position.set(0, 1.65, -0.2);
    cabin.castShadow = true;
    g.add(cabin);

    // Bulletproof Window Slits
    const windShield = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.45, 0.1), glassMat);
    windShield.position.set(0, 1.7, 1.22);
    windShield.rotation.x = -0.25;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.4, 0.1), glassMat);
    rearGlass.position.set(0, 1.7, -1.62);
    g.add(windShield, rearGlass);

    // Heavy Push Bumper & Winch
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.55, 0.35), darkMat);
    bumper.position.set(0, 0.75, 2.5);
    const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10), chromeMat);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 0.75, 2.7);
    g.add(bumper, winch);

    // Roof Police / Security Strobe Bar
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.28), darkMat);
    lightbar.position.set(0, 2.2, 0);
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.24), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLens.position.set(-0.35, 2.2, 0);
    const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.24), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    blueLens.position.set(0.35, 2.2, 0);
    const strobeBeacon = new THREE.PointLight(0x3b82f6, 1.5, 12, 1.8);
    strobeBeacon.name = 'strobe_beacon';
    strobeBeacon.position.set(0, 2.3, 0);
    g.add(lightbar, redLens, blueLens, strobeBeacon);

    // 4 Heavy All-Terrain Runflat Wheels
    const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 14);
    wGeo.rotateZ(Math.PI / 2);
    const addWheel = (x: number, z: number, name: string) => {
      const wg = new THREE.Group();
      wg.name = name;
      const t = new THREE.Mesh(wGeo, tireMat);
      t.castShadow = true;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.44, 10), rimMat);
      r.rotateZ(Math.PI / 2);
      wg.add(t, r);
      wg.position.set(x, 0.52, z);
      g.add(wg);
    };
    addWheel(-1.25, 1.5, 'wheel_fl');
    addWheel(1.25, 1.5, 'wheel_fr');
    addWheel(-1.25, -1.5, 'wheel_rl');
    addWheel(1.25, -1.5, 'wheel_rr');

    // Tactical Armor Plating (Side Skirts, Sloped Hood Louver, Headlight Brush Cage)
    const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 3.8), darkMat);
    skirtL.position.set(-1.21, 0.72, 0);
    const skirtR = skirtL.clone();
    skirtR.position.x = 1.21;
    const hoodArmor = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 1.05), darkMat);
    hoodArmor.position.set(0, 1.26, 1.78);
    const grilleCage = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.36, 0.08), chromeMat);
    grilleCage.position.set(0, 1.08, 2.52);
    g.add(skirtL, skirtR, hoodArmor, grilleCage);

    // Roof-Mounted Armed Tactical Turret Pod (Dual Barrel + Cyan Optical Sensor)
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 12), darkMat);
    turretBase.position.set(0, 2.2, -0.75);
    const turretHead = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.62), armorMat);
    turretHead.position.set(0, 2.42, -0.75);
    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.92, 8), darkMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.1, 2.44, -0.18);
    const barrelR = barrelL.clone();
    barrelR.position.x = 0.1;
    const sensorPod = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sensorPod.position.set(0.24, 2.45, -0.42);
    g.add(turretBase, turretHead, barrelL, barrelR, sensorPod);

    // Dual Projector Headlights
    for (const x of [-0.85, 0.85]) {
      const lightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lightMesh.position.set(x, 0.95, 2.42);
      const spot = new THREE.SpotLight(0xffffff, 3.2, 45, Math.PI / 5, 0.35);
      spot.position.set(x, 0.95, 2.5);
      spot.target.position.set(x, 0, 20);
      g.add(lightMesh, spot, spot.target);
    }

    return g;
  }

  // 2. Vanguard GT Executive Sports Sedan
  private createSedanMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_sedan_group';

    const paintMat = new THREE.MeshStandardMaterial({ color: 0x0f2942, metalness: 0.85, roughness: 0.22 }); // Metallic Sapphire
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.15, transparent: true, opacity: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.92 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.2 });

    // Aerodynamic Sculpted Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.58, 4.4), paintMat);
    body.position.y = 0.62;
    body.castShadow = true;
    g.add(body);

    // Tapered Cabin Greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.65, 2.3), glassMat);
    cabin.position.set(0, 1.2, -0.15);
    cabin.castShadow = true;
    g.add(cabin);

    // Front Sloped Hood & Rear Trunk Lip
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, 1.2), paintMat);
    hood.position.set(0, 0.75, 1.55);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.28), paintMat);
    spoiler.position.set(0, 0.98, -2.15);
    g.add(hood, spoiler);

    // 4 Low-Profile Sports Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14);
    wGeo.rotateZ(Math.PI / 2);
    const addWheel = (x: number, z: number, name: string) => {
      const wg = new THREE.Group();
      wg.name = name;
      const t = new THREE.Mesh(wGeo, tireMat);
      t.castShadow = true;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 12), rimMat);
      r.rotateZ(Math.PI / 2);
      wg.add(t, r);
      wg.position.set(x, 0.38, z);
      g.add(wg);
    };
    addWheel(-1.05, 1.35, 'wheel_fl');
    addWheel(1.05, 1.35, 'wheel_fr');
    addWheel(-1.05, -1.35, 'wheel_rl');
    addWheel(1.05, -1.35, 'wheel_rr');

    // Horizontal Matrix LED Headlights
    for (const x of [-0.75, 0.75]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0x93c5fd }));
      hl.position.set(x, 0.68, 2.21);
      const spot = new THREE.SpotLight(0xfffbeb, 3.0, 42, Math.PI / 5, 0.3);
      spot.position.set(x, 0.68, 2.25);
      spot.target.position.set(x, 0, 18);
      g.add(hl, spot, spot.target);
    }

    // Full-Width Rear Red LED Lightstrip
    const rearLight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    rearLight.position.set(0, 0.78, -2.21);
    g.add(rearLight);

    return g;
  }

  // 3. Predator 450 Off-Road Quad ATV
  private createATVMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_atv_group';

    const plasticMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.3 }); // Aggressive Orange
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.8, roughness: 0.3 });

    // Chassis & Engine Block
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 2.1), frameMat);
    chassis.position.y = 0.65;
    g.add(chassis);

    // Front & Rear Aggressive Fenders
    const fFender = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.25, 0.8), plasticMat);
    fFender.position.set(0, 0.95, 0.65);
    const rFender = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.25, 0.8), plasticMat);
    rFender.position.set(0, 0.95, -0.65);
    g.add(fFender, rFender);

    // Saddle Seat & Fuel Tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.6), plasticMat);
    tank.position.set(0, 1.05, 0.15);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.85), new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 }));
    seat.position.set(0, 1.05, -0.4);
    g.add(tank, seat);

    // Tubular Steel Cargo Racks (Front & Back)
    const fRack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.5), frameMat);
    fRack.position.set(0, 1.15, 0.95);
    const rRack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), frameMat);
    rRack.position.set(0, 1.15, -0.95);
    g.add(fRack, rRack);

    // Handlebars with Grips
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), frameMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.38, 0.45);
    g.add(bar);

    // 4 Wide Rugged Knobby Tires
    const wGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.38, 12);
    wGeo.rotateZ(Math.PI / 2);
    const addWheel = (x: number, z: number, name: string) => {
      const wg = new THREE.Group();
      wg.name = name;
      const t = new THREE.Mesh(wGeo, tireMat);
      t.castShadow = true;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8), rimMat);
      r.rotateZ(Math.PI / 2);
      wg.add(t, r);
      wg.position.set(x, 0.46, z);
      g.add(wg);
    };
    addWheel(-0.78, 0.72, 'wheel_fl');
    addWheel(0.78, 0.72, 'wheel_fr');
    addWheel(-0.78, -0.72, 'wheel_rl');
    addWheel(0.78, -0.72, 'wheel_rr');

    // Dual Pod Headlights
    for (const x of [-0.3, 0.3]) {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0xfff0aa }));
      hl.rotation.x = Math.PI / 2;
      hl.position.set(x, 1.05, 1.08);
      const spot = new THREE.SpotLight(0xfff0bb, 2.5, 35, Math.PI / 4, 0.35);
      spot.position.set(x, 1.05, 1.12);
      spot.target.position.set(x, 0, 15);
      g.add(hl, spot, spot.target);
    }

    return g;
  }

  // 4. Phantom 650cc Enduro Motorbike
  private createMotorbikeMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_motorbike_group';

    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.4 }); // Racing Red
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6, metalness: 0.85 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.95 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });

    // Perimeter Frame & Engine Block
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.4), frameMat);
    frame.position.set(0, 0.65, 0);
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.45), chromeMat);
    engine.position.set(0, 0.48, 0.05);
    g.add(frame, engine);

    // Upswept High Exhaust Pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), chromeMat);
    exhaust.rotation.x = 0.5;
    exhaust.position.set(0.24, 0.72, -0.45);
    g.add(exhaust);

    // Slim Motocross Fuel Tank & Seat
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.65), redMat);
    tank.position.set(0, 0.98, 0.2);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.8), new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 }));
    seat.position.set(0, 0.95, -0.35);
    g.add(tank, seat);

    // Front Fork Assembly & Handlebars
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), chromeMat);
    forkL.position.set(-0.14, 0.75, 0.75);
    forkL.rotation.x = -0.32;
    const forkR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), chromeMat);
    forkR.position.set(0.14, 0.75, 0.75);
    forkR.rotation.x = -0.32;
    const handlebars = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), frameMat);
    handlebars.rotation.z = Math.PI / 2;
    handlebars.position.set(0, 1.25, 0.55);
    g.add(forkL, forkR, handlebars);

    // High Front Fender & Headlight Cowl
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.5), redMat);
    fender.position.set(0, 0.9, 0.78);
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.12), redMat);
    cowl.position.set(0, 1.15, 0.68);
    g.add(fender, cowl);

    // 2 Spoked Enduro Wheels (Front & Rear)
    const wGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.16, 14);
    wGeo.rotateZ(Math.PI / 2);
    const addWheel = (z: number, name: string) => {
      const wg = new THREE.Group();
      wg.name = name;
      const t = new THREE.Mesh(wGeo, tireMat);
      t.castShadow = true;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 8), chromeMat);
      r.rotateZ(Math.PI / 2);
      wg.add(t, r);
      wg.position.set(0, 0.44, z);
      g.add(wg);
    };
    addWheel(0.95, 'wheel_fl');
    addWheel(-0.85, 'wheel_rl');

    // Central Headlight & Beam
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 1.15, 0.75);
    const spot = new THREE.SpotLight(0xffffff, 3.0, 38, Math.PI / 5, 0.35);
    spot.position.set(0, 1.15, 0.8);
    spot.target.position.set(0, 0, 16);
    g.add(hl, spot, spot.target);

    return g;
  }

  // 5. RidgeLine Mountain Expedition Bicycle
  private createBicycleMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_bicycle_group';

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35, metalness: 0.5 }); // Neon Lime Green
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.95 });

    // Diamond Triangular Frame Tubes
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), frameMat);
    topTube.rotation.x = 0.25;
    topTube.position.set(0, 0.88, 0);
    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), frameMat);
    downTube.rotation.x = -0.7;
    downTube.position.set(0, 0.65, 0.15);
    const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 6), frameMat);
    seatTube.rotation.x = -0.25;
    seatTube.position.set(0, 0.65, -0.22);
    g.add(topTube, downTube, seatTube);

    // Saddle & Handlebars
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.32), darkMat);
    saddle.position.set(0, 1.0, -0.28);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 6), darkMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.05, 0.38);
    g.add(saddle, bar);

    // 2 Spoked Bicycle Wheels (Front & Rear)
    const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 14);
    wGeo.rotateZ(Math.PI / 2);
    const addWheel = (z: number, name: string) => {
      const wg = new THREE.Group();
      wg.name = name;
      const t = new THREE.Mesh(wGeo, tireMat);
      t.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 10), darkMat);
      rim.rotateZ(Math.PI / 2);
      wg.add(t, rim);
      wg.position.set(0, 0.36, z);
      g.add(wg);
    };
    addWheel(0.65, 'wheel_fl');
    addWheel(-0.65, 'wheel_rl');

    // Handlebar LED Light
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(0, 1.05, 0.44);
    const spot = new THREE.SpotLight(0xffffff, 2.0, 24, Math.PI / 4, 0.4);
    spot.position.set(0, 1.05, 0.46);
    spot.target.position.set(0, 0, 12);
    g.add(hl, spot, spot.target);

    // Kickstand
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 6), darkMat);
    stand.position.set(-0.12, 0.22, -0.4);
    stand.rotation.z = 0.4;
    g.add(stand);

    return g;
  }

  private createArmoredTruckMesh(): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f4d3b, roughness: 0.72, metalness: 0.45 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.6 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.95 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 5.8), darkMat);
    chassis.position.y = 0.75;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.35, 2.0), bodyMat);
    cab.position.set(0, 1.65, 1.5);
    cab.castShadow = true;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.45, 3.4), bodyMat);
    bed.position.set(0, 1.7, -1.25);
    bed.castShadow = true;
    const plow = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 0.35), darkMat);
    plow.position.set(0, 0.65, 3.0);
    g.add(chassis, cab, bed, plow);

    // Heavy Composite Side Armor Plates & Cab Windshield Blast Visor
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.5, metalness: 0.85 });
    const glassSlitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
    for (const side of [-1, 1]) {
      const sideArmor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 4.9), steelMat);
      sideArmor.position.set(side * 1.28, 1.48, -0.35);
      sideArmor.castShadow = true;
      g.add(sideArmor);
      for (const pz of [-2.1, -1.15, -0.2]) {
        const gunPort = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.24), darkMat);
        gunPort.position.set(side * 1.3, 1.78, pz);
        g.add(gunPort);
      }
    }
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.42, 0.12), steelMat);
    visor.position.set(0, 1.98, 2.54);
    const slitL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.14), glassSlitMat);
    slitL.position.set(-0.55, 1.96, 2.55);
    const slitR = slitL.clone();
    slitR.position.x = 0.55;
    g.add(visor, slitL, slitR);

    // 360° Roof-Mounted Armored Heavy Autocannon Turret Station
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.76, 0.22, 16), steelMat);
    ring.position.set(0, 2.52, -0.8);
    const cupola = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 1.05), bodyMat);
    cupola.position.set(0, 2.84, -0.8);
    cupola.castShadow = true;
    const gunShield = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.12), steelMat);
    gunShield.position.set(0, 2.86, -0.22);
    const cannonL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.45, 10), darkMat);
    cannonL.rotation.x = Math.PI / 2;
    cannonL.position.set(-0.16, 2.86, 0.35);
    const cannonR = cannonL.clone();
    cannonR.position.x = 0.16;
    const optic = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    optic.position.set(0.32, 3.12, -0.5);
    g.add(ring, cupola, gunShield, cannonL, cannonR, optic);

    const wGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 14);
    wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-1.25, 1.85], [1.25, 1.85], [-1.25, -0.7], [1.25, -0.7], [-1.25, -2.1], [1.25, -2.1]]) {
      const w = new THREE.Mesh(wGeo, tireMat);
      w.name = `wheel_${wx}_${wz}`;
      w.position.set(wx, 0.48, wz);
      g.add(w);
    }
    const spotL = new THREE.SpotLight(0xfffbeb, 3.0, 38, Math.PI / 4, 0.4);
    spotL.position.set(-0.85, 1.1, 2.55);
    spotL.target.position.set(-0.85, 0, 18);
    const spotR = new THREE.SpotLight(0xfffbeb, 3.0, 38, Math.PI / 4, 0.4);
    spotR.position.set(0.85, 1.1, 2.55);
    spotR.target.position.set(0.85, 0, 18);
    g.add(spotL, spotL.target, spotR, spotR.target);
    return g;
  }

  private createMotorboatMesh(): THREE.Group {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.5 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.4), hullMat);
    hull.position.y = 0.25;
    hull.castShadow = true;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.35, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.28, 2.75);
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.65), trimMat);
    consoleBox.position.set(0, 0.85, 0.35);
    const outboard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.45), trimMat);
    outboard.position.set(0, 0.62, -2.35);
    const spot = new THREE.SpotLight(0xfef9c3, 2.6, 36, Math.PI / 4, 0.45);
    spot.position.set(0, 1.25, 0.7);
    spot.target.position.set(0, 0, 16);
    g.add(hull, bow, consoleBox, outboard, spot, spot.target);
    return g;
  }

  private createMediaVanMesh(accentColor: number, hasRoofDish: boolean, isHeavyTruck: boolean): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.38, metalness: 0.25 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.42, metalness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.78, metalness: 0.6 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.94 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.85 });

    const w = isHeavyTruck ? 2.3 : 2.05;
    const h = isHeavyTruck ? 1.85 : 1.55;
    const l = isHeavyTruck ? 5.2 : 4.6;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
    hull.position.set(0, 0.55 + h * 0.5, 0);
    hull.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.36, l * 0.88), stripeMat);
    stripe.position.set(0, 0.92, -0.1);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.56, 0.08), glassMat);
    wind.position.set(0, 1.32, l * 0.5 + 0.02);
    wind.rotation.x = -0.22;
    g.add(hull, stripe, wind);

    if (hasRoofDish) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), darkMat);
      mast.position.set(0, 0.55 + h + 0.42, -0.6);
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.18, 0.28, 14),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.4, roughness: 0.35 })
      );
      dish.position.set(0, 0.55 + h + 0.95, -0.6);
      dish.rotation.x = -Math.PI * 0.32;
      g.add(mast, dish);
    }

    const beacon = new THREE.PointLight(accentColor, 1.4, 10, 1.8);
    beacon.name = 'strobe_beacon';
    beacon.position.set(0, 0.55 + h + 0.25, 1.1);
    const beaconDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.16, 8),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    beaconDome.position.copy(beacon.position);
    g.add(beacon, beaconDome);

    const wGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-w * 0.52, l * 0.33], [w * 0.52, l * 0.33], [-w * 0.52, -l * 0.33], [w * 0.52, -l * 0.33]]) {
      const wheel = new THREE.Mesh(wGeo, tireMat);
      wheel.name = `wheel_${wx}_${wz}`;
      wheel.position.set(wx, 0.42, wz);
      g.add(wheel);
    }

    for (const x of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(x, 0.78, l * 0.5 + 0.03);
      const spot = new THREE.SpotLight(0xfffbeb, 2.8, 40, Math.PI / 5, 0.35);
      spot.position.set(x, 0.78, l * 0.5 + 0.08);
      spot.target.position.set(x, 0, 18);
      g.add(hl, spot, spot.target);
    }
    return g;
  }

  private createReporterSUVMesh(): THREE.Group {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.5 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161719, roughness: 0.94 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.82 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.72, 4.45), paint);
    body.position.y = 0.78;
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.78, 2.6), paint);
    cabin.position.set(0, 1.48, -0.25);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.48, 2.4), glassMat);
    glass.position.set(0, 1.5, -0.22);
    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.9), darkMat);
    roofRack.position.set(0, 1.92, -0.25);
    g.add(body, cabin, glass, roofRack);

    const wGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 12);
    wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-1.08, 1.38], [1.08, 1.38], [-1.08, -1.38], [1.08, -1.38]]) {
      const wheel = new THREE.Mesh(wGeo, tireMat);
      wheel.name = `wheel_${wx}_${wz}`;
      wheel.position.set(wx, 0.45, wz);
      g.add(wheel);
    }

    for (const x of [-0.72, 0.72]) {
      const spot = new THREE.SpotLight(0xfffbeb, 2.9, 42, Math.PI / 5, 0.35);
      spot.position.set(x, 0.85, 2.25);
      spot.target.position.set(x, 0, 18);
      g.add(spot, spot.target);
    }
    return g;
  }

  private createNewsHelicopterMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'veh_news_heli_group';
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.4 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.78 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.55 });

    // Fuselage & nose canopy
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 3.6), bodyMat);
    fuselage.position.set(0, 1.2, 0.15);
    fuselage.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 3.2), stripeMat);
    stripe.position.set(0, 1.0, 0.15);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), glassMat);
    canopy.scale.set(0.92, 0.75, 1.15);
    canopy.position.set(0, 1.22, 1.65);

    // Tail boom & vertical stabilizer
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 3.6, 8), bodyMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 1.35, -3.2);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.65), stripeMat);
    fin.position.set(0, 1.75, -4.85);

    // Camera gimbal under nose
    const camBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), darkMat);
    camBall.position.set(0, 0.52, 2.05);

    // Landing skids
    for (const sx of [-0.95, 0.95]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), darkMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, 0.1, 0.25);
      const strutF = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), darkMat);
      strutF.position.set(sx * 0.85, 0.42, 1.0);
      const strutR = strutF.clone();
      strutR.position.z = -0.6;
      g.add(skid, strutF, strutR);
    }

    // Spinning Main Rotor Hub + Blades
    const mainRotor = new THREE.Group();
    mainRotor.name = 'heli_main_rotor';
    mainRotor.position.set(0, 2.15, 0.1);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8), darkMat);
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.04, 0.26), darkMat);
    bladeA.position.y = 0.22;
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 6.8), darkMat);
    bladeB.position.y = 0.22;
    mainRotor.add(mast, bladeA, bladeB);

    // Tail Rotor
    const tailRotor = new THREE.Group();
    tailRotor.name = 'heli_tail_rotor';
    tailRotor.position.set(0.14, 1.65, -4.9);
    const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.25, 0.14), darkMat);
    tailRotor.add(tailBlade);

    // Searchlight
    const spot = new THREE.SpotLight(0xffffff, 3.2, 65, Math.PI / 4, 0.4);
    spot.position.set(0, 0.55, 2.1);
    spot.target.position.set(0, -10, 22);

    g.add(fuselage, stripe, canopy, boom, fin, camBall, mainRotor, tailRotor, spot, spot.target);
    return g;
  }

  public getMediaVehicleTelemetry(): MediaVehicleTelemetry[] {
    const channelMap: Partial<Record<VehicleType, MediaVehicleTelemetry['channelId']>> = {
      news_van: 'oakridge_news_24',
      satellite_truck: 'worldwatch_intl',
      reporter_suv: 'oakridge_news_24',
      camera_crew_van: 'oakridge_local',
      radio_van: 'oakridge_radio',
      news_helicopter: 'oakridge_news_24',
      emergency_broadcast_truck: 'oakridge_radio',
    };
    const crewMap: Partial<Record<VehicleType, string[]>> = {
      news_van: ['Marcus Reed', 'Devon Brooks'],
      satellite_truck: ['Hannah Kowalski', 'Nadia Lindqvist'],
      reporter_suv: ['Nadia Lindqvist', 'Luis Morales'],
      camera_crew_van: ['Kenji Sato', 'Devon Brooks'],
      radio_van: ['Samir Rao'],
      news_helicopter: ['Elena Vance', 'Luis Morales'],
      emergency_broadcast_truck: ['Sgt. Malik Carter'],
    };

    const result: MediaVehicleTelemetry[] = [];
    for (const v of this.vehicles.values()) {
      const ch = channelMap[v.def.type];
      if (!ch) continue;
      result.push({
        id: v.def.id,
        name: v.def.name,
        kind: v.def.type as MediaVehicleTelemetry['kind'],
        channelId: ch,
        position: [v.state.position[0], v.state.position[1], v.state.position[2]],
        uplinkActive: v.state.batteryPercent > 5,
        crewNames: crewMap[v.def.type] || ['Media Crew'],
        statusText: v.state.isOccupied
          ? `Player Operating (${Math.round(Math.abs(v.currentSpeed) * 3.6)} km/h)`
          : v.def.type === 'news_helicopter'
            ? 'Media Tower Helipad · Flight Ready'
            : 'Standby · Uplink Active',
      });
    }
    return result;
  }

  // ==========================================
  // SELECTION & INTERACTION
  // ==========================================
  public getNearestVehicle(playerPos: THREE.Vector3, maxDist: number = 4.2): DrivableVehicleInstance | null {
    let nearest: DrivableVehicleInstance | null = null;
    let minDist = maxDist;

    for (const v of this.vehicles.values()) {
      if (Math.abs(v.state.position[1] - playerPos.y) > 4.5) continue;
      const dist = Math.hypot(v.state.position[0] - playerPos.x, v.state.position[2] - playerPos.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = v;
      }
    }
    return nearest;
  }

  public enterVehicle(vehicleId?: string): { success: boolean; reason?: 'locked' | 'not_found'; vehicle?: DrivableVehicleInstance } {
    const v = vehicleId ? this.vehicles.get(vehicleId) : this.vehicles.values().next().value;
    if (!v) return { success: false, reason: 'not_found' };

    if (v.state.isLocked) {
      return { success: false, reason: 'locked', vehicle: v };
    }

    this.activeVehicleId = v.state.id;
    v.state.isOccupied = true;
    v.state.engineRunning = true;
    v.state.gear = 'D';
    return { success: true, vehicle: v };
  }

  public exitVehicle(): void {
    if (this.activeVehicleId && this.vehicles.has(this.activeVehicleId)) {
      const v = this.vehicles.get(this.activeVehicleId)!;
      v.state.isOccupied = false;
      v.state.engineRunning = false;
      v.state.gear = 'P';
      v.currentSpeed = 0;
      this.activeVehicleId = null;
    }
  }

  public setOccupied(occupied: boolean) {
    if (!occupied) {
      this.exitVehicle();
    } else {
      const first = this.vehicles.values().next().value;
      if (first) this.enterVehicle(first.state.id);
    }
  }

  public toggleLock(vehicleId?: string): boolean {
    const targetId = vehicleId || this.activeVehicleId || (this.vehicles.keys().next().value as string | undefined);
    if (!targetId) return false;
    const v = this.vehicles.get(targetId);
    if (!v) return false;

    v.state.isLocked = !v.state.isLocked;
    return v.state.isLocked;
  }

  public toggleHeadlights(): boolean {
    const v = this.activeVehicleId ? this.vehicles.get(this.activeVehicleId) : this.vehicles.values().next().value;
    if (!v) return false;

    v.state.headlightsOn = !v.state.headlightsOn;
    v.headlights.forEach((h) => (h.visible = v.state.headlightsOn));
    return v.state.headlightsOn;
  }

  // ==========================================
  // DRIVING PHYSICS & REAL-LIFE TELEMETRY LOOP
  // ==========================================
  public update(
    delta: number,
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump?: boolean; crouch?: boolean },
    worldSeed: number
  ) {
    // 1. Update strobe beacons & helicopter rotors
    for (const v of this.vehicles.values()) {
      if (v.strobeLight) {
        v.strobeTimer += delta * 8.0;
        v.strobeLight.intensity = Math.sin(v.strobeTimer) > 0 ? 2.5 : 0.2;
      }
      if (v.def.type === 'news_helicopter') {
        const rotorSpeed = v.state.isOccupied || v.state.engineRunning ? 22.0 : 1.2;
        const mainRotor = v.mesh.getObjectByName('heli_main_rotor');
        const tailRotor = v.mesh.getObjectByName('heli_tail_rotor');
        if (mainRotor) mainRotor.rotation.y += delta * rotorSpeed;
        if (tailRotor) tailRotor.rotation.x += delta * rotorSpeed * 1.6;
      }
    }

    if (!this.activeVehicleId) return;
    const v = this.vehicles.get(this.activeVehicleId);
    if (!v || !v.state.isOccupied) return;

    const def = v.def;

    // Acceleration & Braking with gear shifting
    if (input.forward && (def.fuelType === 'pedal' || v.state.batteryPercent > 0)) {
      v.currentSpeed = Math.min(def.maxSpeed, v.currentSpeed + def.accel * delta);
      v.state.gear = 'D';
      if (def.fuelType !== 'pedal') {
        v.state.batteryPercent = Math.max(0, v.state.batteryPercent - delta * 0.12);
      }
    } else if (input.backward && (def.fuelType === 'pedal' || v.state.batteryPercent > 0)) {
      v.currentSpeed = Math.max(-8.5, v.currentSpeed - def.accel * 0.75 * delta);
      v.state.gear = 'R';
    } else {
      // Natural rolling friction
      if (v.currentSpeed > 0) {
        v.currentSpeed = Math.max(0, v.currentSpeed - def.drag * delta);
      } else if (v.currentSpeed < 0) {
        v.currentSpeed = Math.min(0, v.currentSpeed + def.drag * delta);
      }
      if (Math.abs(v.currentSpeed) < 0.1) {
        v.state.gear = 'P';
      }
    }

    // Dynamic Engine RPM calculation
    const speedRatio = Math.abs(v.currentSpeed) / def.maxSpeed;
    if (def.fuelType === 'pedal') {
      v.state.rpm = Math.round(speedRatio * 90); // Pedal cadence RPM
    } else {
      v.state.rpm = Math.round(800 + speedRatio * 5200); // 800 idle - 6000 redline
    }

    // Steering (helicopter can yaw in place too)
    if (Math.abs(v.currentSpeed) > 0.15 || def.type === 'news_helicopter') {
      const dir = v.currentSpeed >= -0.05 ? 1 : -1;
      if (input.left) {
        v.state.rotationY += def.steerSpeed * delta * dir;
      }
      if (input.right) {
        v.state.rotationY -= def.steerSpeed * delta * dir;
      }
    }

    // Position integration along forward heading vector with solid collider check
    const moveDist = v.currentSpeed * delta;
    const prevX = v.state.position[0];
    const prevZ = v.state.position[2];
    const desiredX = prevX + Math.sin(v.state.rotationY) * moveDist;
    const desiredZ = prevZ + Math.cos(v.state.rotationY) * moveDist;

    const physMgr = UnifiedPhysicsManager.getInstance();
    if (physMgr && v.def.type !== 'motorboat' && v.def.type !== 'news_helicopter') {
      const radius = v.def.type === 'bicycle' || v.def.type === 'motorbike' ? 0.65 : 1.35;
      const curVec = new THREE.Vector3(prevX, 0.35, prevZ);
      const nextVec = new THREE.Vector3(desiredX, 0.35, desiredZ);
      const res = physMgr.resolveMovement(curVec, nextVec, radius, 1.9);
      v.state.position[0] = res.resolvedPos.x;
      v.state.position[2] = res.resolvedPos.z;
      if (res.collided) {
        v.currentSpeed *= 0.25;
      }
    } else {
      v.state.position[0] = desiredX;
      v.state.position[2] = desiredZ;
    }

    // Real-Life Odometer Accumulation (1 km = 1000m)
    if (!v.state.odometerKm) v.state.odometerKm = 0;
    v.state.odometerKm += Math.hypot(v.state.position[0] - prevX, v.state.position[2] - prevZ) / 1000;

    // Follow terrain, water, or helicopter altitude controls
    const groundY = TerrainGenerator.getHeight(v.state.position[0], v.state.position[2], worldSeed);
    if (v.def.type === 'motorboat') {
      v.state.position[1] = Math.max(0.08, groundY + 0.18);
    } else if (v.def.type === 'news_helicopter') {
      const inHelipad =
        Math.abs(v.state.position[0] - 66) <= 13 &&
        Math.abs(v.state.position[2] - (-28)) <= 10;
      const minHeliY = inHelipad ? 11.95 : Math.max(0.45, groundY + 0.35);
      let nextY = v.state.position[1];
      if (input.jump) nextY += 10.5 * delta;
      else if (input.crouch) nextY -= 9.5 * delta;
      else if (Math.abs(v.currentSpeed) > 2.5 && nextY < minHeliY + 1.8) nextY += 2.2 * delta;
      v.state.position[1] = Math.max(minHeliY, Math.min(110, nextY));
    } else {
      v.state.position[1] = Math.max(0.35, groundY + 0.35);
    }

    // Update 3D mesh position & orientation
    v.mesh.position.set(v.state.position[0], v.state.position[1], v.state.position[2]);
    v.mesh.rotation.y = v.state.rotationY;

    // Motorbike bank / helicopter pitch animation
    if (v.def.type === 'motorbike') {
      const leanTarget = input.left ? 0.35 : input.right ? -0.35 : 0;
      v.mesh.rotation.z = THREE.MathUtils.damp(v.mesh.rotation.z, leanTarget, 8.0, delta);
    } else if (v.def.type === 'news_helicopter') {
      const pitchTarget = THREE.MathUtils.clamp(v.currentSpeed / def.maxSpeed, -0.4, 1) * 0.16;
      v.mesh.rotation.x = THREE.MathUtils.damp(v.mesh.rotation.x, pitchTarget, 5.0, delta);
      v.mesh.rotation.z = 0;
    } else {
      v.mesh.rotation.x = 0;
      v.mesh.rotation.z = 0;
    }

    // Wheel spin animation
    const spinDelta = (v.currentSpeed * delta) / 0.45;
    for (const w of v.wheels) {
      w.rotation.x += spinDelta;
    }
  }

  public dispose() {
    for (const v of this.vehicles.values()) {
      this.scene.remove(v.mesh);
    }
    this.vehicles.clear();
  }
}
