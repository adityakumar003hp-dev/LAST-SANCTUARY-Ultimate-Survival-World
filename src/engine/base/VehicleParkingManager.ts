/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleState, VehicleType } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';

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
    // Backyard Garage & Driveway coordinates (Apartment origin: -26, 0, 38)
    // Garage is located in backyard at local (-12.5, 0, 14.5) -> World (-38.5, 0, 52.5)
    const definitions: VehicleDefinition[] = [
      // 1. Armored Tactical Enforcer SUV (Inside Garage Bay 1 - Left)
      {
        id: 'veh_enforce_01',
        name: 'Aegis Enforcer Tactical Armored SUV',
        type: 'enforce',
        defaultPos: [-40.2, 0.45, 52.8],
        rotationY: 0,
        maxSpeed: 24.0,     // ~86 km/h
        accel: 11.5,
        drag: 3.8,
        steerSpeed: 1.6,
        fuelType: 'gasoline',
        batteryOrFuel: 98,
      },
      // 2. Modern Executive Sports Sedan (Inside Garage Bay 2 - Right)
      {
        id: 'veh_sedan_01',
        name: 'Vanguard GT Executive Sports Sedan',
        type: 'car',
        defaultPos: [-36.8, 0.42, 52.8],
        rotationY: 0,
        maxSpeed: 29.0,     // ~104 km/h
        accel: 13.5,
        drag: 3.2,
        steerSpeed: 1.85,
        fuelType: 'gasoline',
        batteryOrFuel: 92,
      },
      // 3. High-Torque Quad ATV (Garage Driveway Bay 3 - Left Front)
      {
        id: 'veh_atv_01',
        name: 'Predator 450 Off-Road Quad ATV',
        type: 'atv',
        defaultPos: [-40.2, 0.42, 46.5],
        rotationY: 0,
        maxSpeed: 19.5,     // ~70 km/h
        accel: 15.0,
        drag: 4.2,
        steerSpeed: 2.2,
        fuelType: 'gasoline',
        batteryOrFuel: 88,
      },
      // 4. Enduro Dual-Sport Motorcycle (Garage Driveway Bay 4 - Right Front)
      {
        id: 'veh_motorbike_01',
        name: 'Phantom 650cc Enduro Motorbike',
        type: 'motorbike',
        defaultPos: [-36.8, 0.42, 46.5],
        rotationY: 0,
        maxSpeed: 32.0,     // ~115 km/h
        accel: 17.5,
        drag: 3.0,
        steerSpeed: 2.4,
        fuelType: 'gasoline',
        batteryOrFuel: 95,
      },
      // 5. Mountain Expedition Bicycle (Patio Walkway Stand)
      {
        id: 'veh_bicycle_01',
        name: 'RidgeLine Mountain Expedition Bicycle',
        type: 'bicycle',
        defaultPos: [-33.2, 0.38, 45.2],
        rotationY: 0.15,
        maxSpeed: 9.8,      // ~35 km/h
        accel: 6.5,
        drag: 2.5,
        steerSpeed: 2.6,
        fuelType: 'pedal',
        batteryOrFuel: 100, // infinite pedal power
      },
    ];

    for (const def of definitions) {
      const mesh = this.buildVehicleMesh(def);
      const groundY = TerrainGenerator.getHeight(def.defaultPos[0], def.defaultPos[2]) + 0.35;
      mesh.position.set(def.defaultPos[0], Math.max(0.35, groundY), def.defaultPos[2]);
      mesh.rotation.y = def.rotationY;
      this.scene.add(mesh);

      const state: VehicleState = {
        id: def.id,
        name: def.name,
        type: def.type,
        position: [def.defaultPos[0], Math.max(0.35, groundY), def.defaultPos[2]],
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

  // ==========================================
  // SELECTION & INTERACTION
  // ==========================================
  public getNearestVehicle(playerPos: THREE.Vector3, maxDist: number = 4.2): DrivableVehicleInstance | null {
    let nearest: DrivableVehicleInstance | null = null;
    let minDist = maxDist;

    for (const v of this.vehicles.values()) {
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
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean },
    worldSeed: number
  ) {
    // 1. Update strobe beacons for Enforcer vehicle even when idling
    for (const v of this.vehicles.values()) {
      if (v.strobeLight) {
        v.strobeTimer += delta * 8.0;
        v.strobeLight.intensity = Math.sin(v.strobeTimer) > 0 ? 2.5 : 0.2;
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

    // Steering
    if (Math.abs(v.currentSpeed) > 0.15) {
      const dir = v.currentSpeed >= 0 ? 1 : -1;
      if (input.left) {
        v.state.rotationY += def.steerSpeed * delta * dir;
      }
      if (input.right) {
        v.state.rotationY -= def.steerSpeed * delta * dir;
      }
    }

    // Position integration along forward heading vector
    const moveDist = v.currentSpeed * delta;
    v.state.position[0] += Math.sin(v.state.rotationY) * moveDist;
    v.state.position[2] += Math.cos(v.state.rotationY) * moveDist;

    // Real-Life Odometer Accumulation (1 km = 1000m)
    if (!v.state.odometerKm) v.state.odometerKm = 0;
    v.state.odometerKm += Math.abs(moveDist) / 1000;

    // Follow terrain height smoothly
    const groundY = TerrainGenerator.getHeight(v.state.position[0], v.state.position[2], worldSeed);
    v.state.position[1] = Math.max(0.35, groundY + 0.35);

    // Update 3D mesh position & orientation
    v.mesh.position.set(v.state.position[0], v.state.position[1], v.state.position[2]);
    v.mesh.rotation.y = v.state.rotationY;

    // Motorbike bank / lean angle animation when cornering
    if (v.def.type === 'motorbike') {
      const leanTarget = input.left ? 0.35 : input.right ? -0.35 : 0;
      v.mesh.rotation.z = THREE.MathUtils.damp(v.mesh.rotation.z, leanTarget, 8.0, delta);
    } else {
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
