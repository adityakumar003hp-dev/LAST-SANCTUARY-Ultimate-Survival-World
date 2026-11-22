/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleState } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';

export class VehicleParkingManager {
  public scene: THREE.Scene;
  public vehicleState: VehicleState = {
    id: 'veh_garage_atv_01',
    name: 'Trail ATV',
    position: [-47.0, 0, 62.0],
    rotationY: 0,
    batteryPercent: 95,
    headlightsOn: true,
    isOccupied: false,
    trunkInventory: new Array(8).fill(null),
  };

  public mesh: THREE.Group;
  public currentSpeed: number = 0;
  public maxSpeed: number = 18.0; // ~65 km/h
  public headlights: THREE.SpotLight[] = [];
  /** Authored garage collection: four additional parked display vehicles. */
  public garageDisplayGroup: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mesh = this.createBuggyMesh();
    this.mesh.position.set(
      this.vehicleState.position[0],
      TerrainGenerator.getHeight(this.vehicleState.position[0], this.vehicleState.position[2]) + 0.35,
      this.vehicleState.position[2]
    );
    this.createGarageCollection();
  }


  private createGarageCollection() {
    this.garageDisplayGroup.name = 'mansion_garage_vehicle_collection';
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
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.16,12), rubber); w.rotation.z = Math.PI/2; w.position.set(x,r,z); w.castShadow = true; g.add(w);
    };
    const parked: Array<{ name: string; x: number; z: number; build: (g: THREE.Group) => void }> = [
      { name: 'Street Motorcycle', x: -37, z: 62, build: g => {
        addBox(g,0.42,0.34,1.25,red,0,0.72,0); addBox(g,0.32,0.28,0.5,dark,0,0.98,-0.1);
        addWheel(g,0,-0.65,0.28); addWheel(g,0,0.65,0.28);
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.62,8),dark); fork.position.set(0,0.95,0.48); fork.rotation.x=-0.35; g.add(fork);
      }},
      { name: 'Mountain Bicycle', x: -29, z: 62, build: g => {
        const wheel=(z:number)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.035,8,20),rubber);t.position.set(0,0.38,z);g.add(t);}; wheel(-0.65);wheel(0.65);
        const tube=(a:THREE.Vector3,b:THREE.Vector3)=>{const d=new THREE.Vector3().subVectors(b,a);const m=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,d.length(),6),blue);m.position.copy(a).add(b).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);};
        tube(new THREE.Vector3(0,0.38,-0.65),new THREE.Vector3(0,0.72,0));tube(new THREE.Vector3(0,0.72,0),new THREE.Vector3(0,0.38,0.65));tube(new THREE.Vector3(0,0.38,0.65),new THREE.Vector3(0,0.38,-0.65));
        addBox(g,0.12,0.06,0.22,dark,0,0.83,-0.08);
      }},
      { name: 'Road Car', x: -20, z: 62, build: g => {
        addBox(g,1.85,0.58,3.65,blue,0,0.68,0); addBox(g,1.48,0.62,1.72,glass,0,1.22,-0.18);
        for(const x of [-0.94,0.94]) for(const z of [-1.12,1.12]) addWheel(g,x,z,0.36);
        addBox(g,0.36,0.18,0.08,white,-0.58,0.72,1.86);addBox(g,0.36,0.18,0.08,white,0.58,0.72,1.86);
      }},
      { name: 'Enforcement SUV', x: -10, z: 62, build: g => {
        addBox(g,2.0,0.78,4.05,white,0,0.78,0); addBox(g,1.58,0.7,2.0,glass,0,1.48,-0.15);
        for(const x of [-1.02,1.02]) for(const z of [-1.25,1.25]) addWheel(g,x,z,0.4);
        addBox(g,1.2,0.12,0.38,red,0,1.94,-0.2); addBox(g,0.32,0.12,0.12,blue,-0.42,2.02,-0.2);addBox(g,0.32,0.12,0.12,red,0.42,2.02,-0.2);
        addBox(g,0.28,0.16,0.08,blue,-0.65,0.9,2.06);addBox(g,0.28,0.16,0.08,blue,0.65,0.9,2.06);
      }}
    ];
    for (const item of parked) {
      const g = new THREE.Group(); g.name = `garage_${item.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}`; item.build(g);
      g.position.set(item.x, TerrainGenerator.getHeight(item.x,item.z), item.z); this.garageDisplayGroup.add(g);
    }
    // Place the playable ATV alongside the four authored garage displays.
    this.mesh.position.set(this.vehicleState.position[0], TerrainGenerator.getHeight(this.vehicleState.position[0],this.vehicleState.position[2])+0.35, this.vehicleState.position[2]);
    this.garageDisplayGroup.add(this.mesh);
    this.scene.add(this.garageDisplayGroup);
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
    const accel = 14.0;
    const drag = 3.5;
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

    // Position integration along forward heading
    const moveDist = this.currentSpeed * delta;
    this.vehicleState.position[0] += Math.sin(this.vehicleState.rotationY) * moveDist;
    this.vehicleState.position[2] += Math.cos(this.vehicleState.rotationY) * moveDist;

    // Follow terrain height smoothly
    const groundY = TerrainGenerator.getHeight(
      this.vehicleState.position[0],
      this.vehicleState.position[2],
      worldSeed
    );
    this.vehicleState.position[1] = groundY + 0.35;

    // Update 3D mesh
    this.mesh.position.set(
      this.vehicleState.position[0],
      this.vehicleState.position[1],
      this.vehicleState.position[2]
    );
    this.mesh.rotation.y = this.vehicleState.rotationY;

    // Wheel spin animation
    const spinDelta = (this.currentSpeed * delta) / 0.45;
    for (const name of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
      const wheel = this.mesh.getObjectByName(name);
      if (wheel) wheel.rotation.x += spinDelta;
    }
  }

  public toggleHeadlights(): boolean {
    this.vehicleState.headlightsOn = !this.vehicleState.headlightsOn;
    this.headlights.forEach((h) => (h.visible = this.vehicleState.headlightsOn));
    return this.vehicleState.headlightsOn;
  }

  public setOccupied(occupied: boolean) {
    this.vehicleState.isOccupied = occupied;
    if (!occupied) {
      this.currentSpeed = 0;
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
