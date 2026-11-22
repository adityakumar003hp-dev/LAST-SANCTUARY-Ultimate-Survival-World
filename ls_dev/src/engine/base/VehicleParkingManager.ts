/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import type { VehicleState } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';

export class VehicleParkingManager {
  public scene: THREE.Scene;
  public vehicleState: VehicleState;
  public mesh: THREE.Group;
  public currentSpeed = 0;
  public maxSpeed = 18.0;
  public headlights: THREE.SpotLight[] = [];
  public garageDisplayGroup: THREE.Group = new THREE.Group();
  /** Five independently selectable and drivable vehicles; vehicleState/mesh always alias the selected one. */
  private fleet: Array<{ state: VehicleState; mesh: THREE.Group; maxSpeed: number; headlights: THREE.SpotLight[] }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.vehicleState = this.createState('veh_garage_atv_01', 'Trail ATV', [-40.0, 0, 60.0]);
    this.vehicleState.position[1] = TerrainGenerator.getHeight(this.vehicleState.position[0], this.vehicleState.position[2]) + 0.1;
    this.mesh = this.createBuggyMesh();
    this.mesh.position.set(...this.vehicleState.position);
    this.fleet.push({ state: this.vehicleState, mesh: this.mesh, maxSpeed: 18, headlights: this.headlights });
    this.createGarageCollection();
  }


  private createState(id: string, name: string, position: [number, number, number]): VehicleState {
    return { id, name, position: [...position], rotationY: 0, batteryPercent: 100, headlightsOn: true, isOccupied: false, trunkInventory: new Array(8).fill(null) };
  }

  private getVehicleDimensions(id: string): { width: number; height: number; depth: number } {
    if (id.includes('bicycle')) return { width:0.85, height:1.15, depth:1.55 };
    if (id.includes('motorcycle')) return { width:1.0, height:1.45, depth:1.9 };
    if (id.includes('enforcement')) return { width:2.2, height:2.1, depth:4.4 };
    if (id.includes('car')) return { width:2.0, height:1.85, depth:4.0 };
    return { width:2.2, height:2.15, depth:3.3 };
  }

  private registerVehicleCollider(item: { state: VehicleState; mesh: THREE.Group }): void {
    const physics = UnifiedPhysicsManager.getInstance();
    if (!physics || item.state.isOccupied) return;
    const size = this.getVehicleDimensions(item.state.id);
    physics.registerBoxCollider(
      `garage_vehicle_${item.state.id}`,
      'prop',
      [item.state.position[0], item.state.position[1] + size.height * 0.5, item.state.position[2]],
      size.width, size.height, size.depth, item.state.rotationY
    );
  }

  private createVehicleHeadlights(group: THREE.Group): THREE.SpotLight[] {
    const lights: THREE.SpotLight[] = [];
    for (const x of [-0.55, 0.55]) {
      const lamp = new THREE.SpotLight(0xfff1c2, 1.6, 34, Math.PI / 5, 0.45);
      lamp.position.set(x, 0.95, 1.85);
      lamp.target.position.set(x, 0.15, 14);
      group.add(lamp, lamp.target);
      lights.push(lamp);
    }
    return lights;
  }

  private createGarageCollection() {
    this.garageDisplayGroup.name = 'mansion_garage_vehicle_collection';
    // Physical five-bay garage inside the protected mansion compound.
    const garage = new THREE.Group(); garage.name = 'mansion_five_bay_garage';
    const concrete = new THREE.MeshStandardMaterial({ color:0x777e83,roughness:0.9 });
    const steel = new THREE.MeshStandardMaterial({ color:0x303840,metalness:0.72,roughness:0.36 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(36,0.1,8),concrete); floor.position.set(-26,0.05,59.5); floor.receiveShadow=true; garage.add(floor);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36,4.2,0.35),concrete); backWall.position.set(-26,2.2,63.35); backWall.castShadow=true; garage.add(backWall);
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.35,4.2,8),concrete); westWall.position.set(-43.85,2.2,59.5); westWall.castShadow=true; garage.add(westWall);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.35,4.2,8),concrete); eastWall.position.set(-8.15,2.2,59.5); eastWall.castShadow=true; garage.add(eastWall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(36.4,0.28,8.4),steel); roof.position.set(-26,4.35,59.5); roof.castShadow=true; garage.add(roof);
    // Five open-front bays, separated by solid structural columns.
    for (const x of [-43.7,-36.5,-29.3,-22.1,-14.9,-8.3]) { const post=new THREE.Mesh(new THREE.BoxGeometry(0.28,4.2,0.3),steel); post.position.set(x,2.2,55.55); post.castShadow=true; garage.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(36,0.32,0.38),steel); beam.position.set(-26,4.0,55.55); garage.add(beam);
    const lineMat = new THREE.MeshBasicMaterial({color:0xe6c45a});
    for (const x of [-40.1,-32.9,-25.7,-18.5,-11.3]) { const line=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.015,6.8),lineMat); line.position.set(x,0.11,59.5); garage.add(line); }
    for (let x=-40;x<=-12;x+=7) { const lamp=new THREE.PointLight(0xffe8bd,1.1,10,1.5); lamp.position.set(x,3.85,59.5); garage.add(lamp); }
    this.garageDisplayGroup.add(garage);
    const physics = UnifiedPhysicsManager.getInstance();
    physics?.registerBoxCollider('mansion_garage_back_wall','wall',[-26,2.2,63.35],36,4.2,0.35);
    physics?.registerBoxCollider('mansion_garage_west_wall','wall',[-43.85,2.2,59.5],0.35,4.2,8);
    physics?.registerBoxCollider('mansion_garage_east_wall','wall',[-8.15,2.2,59.5],0.35,4.2,8);
    physics?.registerBoxCollider('mansion_garage_roof','wall',[-26,4.35,59.5],36,0.28,8.4);
    for (let i=0;i<6;i++) physics?.registerBoxCollider(`mansion_garage_front_pillar_${i+1}`,'wall',[-43.7+i*7.08,2.2,55.55],0.28,4.2,0.3);
    const dark = new THREE.MeshStandardMaterial({ color: 0x171c22, metalness: 0.55, roughness: 0.55 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.95 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x243b4c, metalness: 0.35, roughness: 0.2 });
    const red = new THREE.MeshStandardMaterial({ color: 0x8f2024, metalness: 0.45, roughness: 0.48 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x244c7a, metalness: 0.5, roughness: 0.45 });
    const white = new THREE.MeshStandardMaterial({ color: 0xd9dfe5, metalness: 0.35, roughness: 0.45 });
    const addBox = (g: THREE.Group, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    const addWheel = (g: THREE.Group, x: number, z: number, r = 0.34) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.16,12), rubber); w.name = `wheel_${x < 0 ? 'left' : 'right'}_${z < 0 ? 'front' : 'rear'}`; w.rotation.z = Math.PI/2; w.position.set(x,r,z); w.castShadow = true; g.add(w);
    };
    const parked: Array<{ name: string; x: number; z: number; build: (g: THREE.Group) => void }> = [
      { name: 'Street Motorcycle', x: -33, z: 60, build: g => {
        addBox(g,0.42,0.34,1.25,red,0,0.72,0); addBox(g,0.32,0.28,0.5,dark,0,0.98,-0.1);
        addWheel(g,0,-0.65,0.28); addWheel(g,0,0.65,0.28);
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.62,8),dark); fork.position.set(0,0.95,0.48); fork.rotation.x=-0.35; g.add(fork);
      }},
      { name: 'Mountain Bicycle', x: -26, z: 60, build: g => {
        const wheel=(z:number)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.035,8,20),rubber);t.name=`wheel_bicycle_${z<0?'front':'rear'}`;t.position.set(0,0.38,z);g.add(t);}; wheel(-0.65);wheel(0.65);
        const tube=(a:THREE.Vector3,b:THREE.Vector3)=>{const d=new THREE.Vector3().subVectors(b,a);const m=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,d.length(),6),blue);m.position.copy(a).add(b).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);};
        tube(new THREE.Vector3(0,0.38,-0.65),new THREE.Vector3(0,0.72,0));tube(new THREE.Vector3(0,0.72,0),new THREE.Vector3(0,0.38,0.65));tube(new THREE.Vector3(0,0.38,0.65),new THREE.Vector3(0,0.38,-0.65));
        addBox(g,0.12,0.06,0.22,dark,0,0.83,-0.08);
      }},
      { name: 'Road Car', x: -19, z: 60, build: g => {
        addBox(g,1.85,0.58,3.65,blue,0,0.68,0); addBox(g,1.48,0.62,1.72,glass,0,1.22,-0.18);
        for(const x of [-0.94,0.94]) for(const z of [-1.12,1.12]) addWheel(g,x,z,0.36);
        addBox(g,0.36,0.18,0.08,white,-0.58,0.72,1.86);addBox(g,0.36,0.18,0.08,white,0.58,0.72,1.86);
      }},
      { name: 'Enforcement SUV', x: -12, z: 60, build: g => {
        addBox(g,2.0,0.78,4.05,white,0,0.78,0); addBox(g,1.58,0.7,2.0,glass,0,1.48,-0.15);
        for(const x of [-1.02,1.02]) for(const z of [-1.25,1.25]) addWheel(g,x,z,0.4);
        addBox(g,1.2,0.12,0.38,red,0,1.94,-0.2); addBox(g,0.32,0.12,0.12,blue,-0.42,2.02,-0.2);addBox(g,0.32,0.12,0.12,red,0.42,2.02,-0.2);
        addBox(g,0.28,0.16,0.08,blue,-0.65,0.9,2.06);addBox(g,0.28,0.16,0.08,blue,0.65,0.9,2.06);
      }}
    ];
    const vehicleIds = ['veh_garage_motorcycle_01', 'veh_garage_bicycle_01', 'veh_garage_car_01', 'veh_garage_enforcement_01'];
    const speeds = [32, 9, 42, 36];
    parked.forEach((item, index) => {
      const g = new THREE.Group(); g.name = `garage_${item.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}`; item.build(g);
      const y = TerrainGenerator.getHeight(item.x, item.z) + 0.1;
      g.position.set(item.x, y, item.z);
      g.rotation.y = Math.PI;
      const lights = this.createVehicleHeadlights(g);
      const state = this.createState(vehicleIds[index], item.name, [item.x, y, item.z]); state.rotationY = Math.PI;
      this.fleet.push({ state, mesh: g, maxSpeed: speeds[index], headlights: lights });
      this.garageDisplayGroup.add(g);
    });
    // Place the playable ATV alongside the four authored garage vehicles.
    this.mesh.position.set(...this.vehicleState.position);
    this.mesh.rotation.y = this.vehicleState.rotationY = Math.PI;
    this.garageDisplayGroup.add(this.mesh);
    this.scene.add(this.garageDisplayGroup);
    for (const item of this.fleet) this.registerVehicleCollider(item);
  }

  private createBuggyMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3830, roughness: 0.5, metalness: 0.8 }); // Military olive steel
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.9 }); // Roll cage tubular steel
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.9 }); // Heavy tread rubber
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.8 }); // Amber rims
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });

    // 1. Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 3.2), bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Tubular Roll Cage
    const cageGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8);
    for (const [cx, cz] of [[-0.8, -0.9], [0.8, -0.9], [-0.8, 0.7], [0.8, 0.7]]) {
      const pylon = new THREE.Mesh(cageGeo, frameMat);
      pylon.position.set(cx, 1.3, cz);
      group.add(pylon);
    }
    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.8), frameMat);
    roofRack.position.set(0, 2.0, -0.1);
    group.add(roofRack);

    // 3. Bucket Seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.5), seatMat);
    seatL.position.set(-0.4, 0.95, -0.1);
    const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.5), seatMat);
    seatR.position.set(0.4, 0.95, -0.1);
    group.add(seatL, seatR);

    // 4. Wheels (4 all-terrain wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const makeWheel = (x: number, z: number, name: string) => {
      const wGroup = new THREE.Group();
      wGroup.name = name;
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.36, 10), rimMat);
      rim.rotateZ(Math.PI / 2);
      wGroup.add(tire, rim);
      wGroup.position.set(x, 0.45, z);
      return wGroup;
    };

    group.add(makeWheel(-1.05, -1.1, 'wheel_fl'));
    group.add(makeWheel(1.05, -1.1, 'wheel_fr'));
    group.add(makeWheel(-1.05, 1.1, 'wheel_rl'));
    group.add(makeWheel(1.05, 1.1, 'wheel_rr'));

    // 5. Dual LED Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.1), lightMat);
    hlL.position.set(-0.6, 0.85, 1.6);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.1), lightMat);
    hlR.position.set(0.6, 0.85, 1.6);
    group.add(hlL, hlR);

    const spotL = new THREE.SpotLight(0xfff0bb, 2.5, 35, Math.PI / 5, 0.4);
    spotL.position.set(-0.6, 0.85, 1.7);
    spotL.target.position.set(-0.6, 0, 15);
    group.add(spotL);
    group.add(spotL.target);

    const spotR = new THREE.SpotLight(0xfff0bb, 2.5, 35, Math.PI / 5, 0.4);
    spotR.position.set(0.6, 0.85, 1.7);
    spotR.target.position.set(0.6, 0, 15);
    group.add(spotR);
    group.add(spotR.target);

    this.headlights = [spotL, spotR];

    return group;
  }

  public update(
    delta: number,
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean },
    worldSeed: number
  ) {
    if (!this.vehicleState.isOccupied) return;

    // Acceleration & Braking
    const accel = this.vehicleState.id.includes('bicycle') ? 4.5 : this.vehicleState.id.includes('motorcycle') ? 10.0 : 14.0;
    const drag = this.vehicleState.id.includes('bicycle') ? 2.0 : 3.5;
    if (input.forward && this.vehicleState.batteryPercent > 0) {
      this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + accel * delta);
      this.vehicleState.batteryPercent = Math.max(0, this.vehicleState.batteryPercent - delta * 0.15);
    } else if (input.backward && this.vehicleState.batteryPercent > 0) {
      this.currentSpeed = Math.max(-8.0, this.currentSpeed - accel * 0.6 * delta);
    } else {
      if (this.currentSpeed > 0) {
        this.currentSpeed = Math.max(0, this.currentSpeed - drag * delta);
      } else if (this.currentSpeed < 0) {
        this.currentSpeed = Math.min(0, this.currentSpeed + drag * delta);
      }
    }

    // Steering
    const steerSpeed = 1.8;
    if (Math.abs(this.currentSpeed) > 0.2) {
      const dir = this.currentSpeed >= 0 ? 1 : -1;
      if (input.left) {
        this.vehicleState.rotationY += steerSpeed * delta * dir;
      }
      if (input.right) {
        this.vehicleState.rotationY -= steerSpeed * delta * dir;
      }
    }

    // Position integration uses the shared solid-world collision resolver so
    // cars and bikes cannot drive through compound walls, closed gates or buildings.
    const moveDist = this.currentSpeed * delta;
    const currentPosition = new THREE.Vector3(...this.vehicleState.position);
    const desiredPosition = currentPosition.clone().add(new THREE.Vector3(
      Math.sin(this.vehicleState.rotationY) * moveDist,
      0,
      Math.cos(this.vehicleState.rotationY) * moveDist
    ));
    const physics = UnifiedPhysicsManager.getInstance();
    const isCycle = this.vehicleState.id.includes('bicycle') || this.vehicleState.id.includes('motorcycle');
    const collision = physics?.resolveMovement(
      currentPosition,
      desiredPosition,
      isCycle ? 0.42 : this.vehicleState.id.includes('atv') ? 0.9 : 1.05,
      isCycle ? 1.5 : 2.0
    );
    if (collision?.collided) this.currentSpeed = 0;
    const resolved = collision?.resolvedPos ?? desiredPosition;
    this.vehicleState.position[0] = resolved.x;
    this.vehicleState.position[2] = resolved.z;

    // Follow terrain height smoothly
    const groundY = TerrainGenerator.getHeight(
      this.vehicleState.position[0],
      this.vehicleState.position[2],
      worldSeed
    );
    this.vehicleState.position[1] = groundY + 0.1;

    // Update 3D mesh
    this.mesh.position.set(
      this.vehicleState.position[0],
      this.vehicleState.position[1],
      this.vehicleState.position[2]
    );
    this.mesh.rotation.y = this.vehicleState.rotationY;

    // Wheel spin animation
    const spinDelta = (this.currentSpeed * delta) / 0.45;
    this.mesh.traverse((object) => {
      if (object.name.startsWith('wheel_')) object.rotation.x += spinDelta;
    });
  }

  public getNearestVehicle(position: THREE.Vector3, maxDistance = 4.2): { id: string; name: string; distance: number } | null {
    if (this.vehicleState.isOccupied) return null;
    let best: { id: string; name: string; distance: number } | null = null;
    for (const item of this.fleet) {
      const d = Math.hypot(item.state.position[0] - position.x, item.state.position[2] - position.z);
      if (d <= maxDistance && (!best || d < best.distance)) best = { id: item.state.id, name: item.state.name, distance: d };
    }
    return best;
  }

  public selectVehicle(id: string): boolean {
    if (this.vehicleState.isOccupied) return false;
    const item = this.fleet.find((entry) => entry.state.id === id);
    if (!item) return false;
    this.vehicleState = item.state;
    this.mesh = item.mesh;
    this.maxSpeed = item.maxSpeed;
    this.headlights = item.headlights;
    this.currentSpeed = 0;
    return true;
  }

  public exportFleet(): VehicleState[] {
    return this.fleet.map((item) => ({ ...item.state, position: [...item.state.position], trunkInventory: [...item.state.trunkInventory] }));
  }

  public importFleet(states: VehicleState[]): void {
    for (const saved of states) {
      const item = this.fleet.find((entry) => entry.state.id === saved.id);
      if (!item) continue;
      item.state.position = [...saved.position];
      item.state.rotationY = saved.rotationY;
      item.state.batteryPercent = saved.batteryPercent;
      item.state.headlightsOn = saved.headlightsOn;
      item.state.trunkInventory = [...saved.trunkInventory];
      item.state.isOccupied = false;
      item.mesh.position.set(...saved.position);
      item.mesh.rotation.y = saved.rotationY;
      const size = this.getVehicleDimensions(item.state.id);
      UnifiedPhysicsManager.getInstance()?.updateColliderPosition(`garage_vehicle_${item.state.id}`, [saved.position[0], saved.position[1] + size.height * 0.5, saved.position[2]], saved.rotationY);
      item.headlights.forEach((light) => { light.visible = saved.headlightsOn; });
    }
    const active = this.fleet.find((item) => item.state.id === this.vehicleState.id) || this.fleet[0];
    this.selectVehicle(active.state.id);
  }

  public toggleHeadlights(): boolean {
    this.vehicleState.headlightsOn = !this.vehicleState.headlightsOn;
    this.headlights.forEach((h) => (h.visible = this.vehicleState.headlightsOn));
    return this.vehicleState.headlightsOn;
  }

  public getExitPosition(): THREE.Vector3 {
    const sideOffset = this.vehicleState.id.includes('bicycle') || this.vehicleState.id.includes('motorcycle') ? 1.05 : 1.8;
    const offset = new THREE.Vector3(sideOffset, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.vehicleState.rotationY);
    const x = this.vehicleState.position[0] + offset.x;
    const z = this.vehicleState.position[2] + offset.z;
    return new THREE.Vector3(x, TerrainGenerator.getHeight(x,z), z);
  }

  public setOccupied(occupied: boolean) {
    this.vehicleState.isOccupied = occupied;
    const colliderId = `garage_vehicle_${this.vehicleState.id}`;
    const physics = UnifiedPhysicsManager.getInstance();
    if (occupied) {
      physics?.unregisterCollider(colliderId);
    } else {
      this.currentSpeed = 0;
      const item = this.fleet.find((entry) => entry.state.id === this.vehicleState.id);
      if (item) this.registerVehicleCollider(item);
    }
  }

  public chargeBattery(amount: number) {
    this.vehicleState.batteryPercent = Math.min(100, this.vehicleState.batteryPercent + amount);
  }

  public dispose() {
    this.scene.remove(this.garageDisplayGroup);
    this.garageDisplayGroup.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m=o.material; if (Array.isArray(m)) m.forEach(x=>x.dispose()); else m.dispose(); } });
  }
}
