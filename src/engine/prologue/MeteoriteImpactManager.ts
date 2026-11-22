import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';
import { DynamicPropPhysicsManager } from '../physics/DynamicPropPhysicsManager';

export class MeteoriteImpactManager {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public craterCenter: THREE.Vector3 = new THREE.Vector3(110, 0, 80);
  public isImpacted: boolean = false;
  public isMeteorInFlight: boolean = false;

  // Meteor bolide mesh during flight
  private meteorGroup: THREE.Group | null = null;
  private meteorProgress: number = 0;
  private startSkyPos: THREE.Vector3 = new THREE.Vector3(-120, 220, -180);
  private endImpactPos: THREE.Vector3 = new THREE.Vector3(110, 0, 80);

  // Crater Core Mesh
  private coreCrystal: THREE.Mesh | null = null;
  private smokeParticles: THREE.Points | null = null;
  private particleTime: number = 0;
  private emergencyResponseGroup: THREE.Group | null = null;
  private responseTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'meteorite_site';
    this.scene.add(this.group);

    this.craterCenter.y = getTerrainHeight(this.craterCenter.x, this.craterCenter.z);
    this.endImpactPos.copy(this.craterCenter);
  }

  public launchMeteorFlight() {
    if (this.meteorGroup) return;

    this.isMeteorInFlight = true;
    this.meteorProgress = 0;

    this.meteorGroup = new THREE.Group();
    this.meteorGroup.name = 'incoming_meteorite';

    // Fiery molten rock core
    const rockGeo = new THREE.DodecahedronGeometry(2.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff4400,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);

    // Glowing plasma corona
    const coronaGeo = new THREE.SphereGeometry(4.2, 12, 12);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffbb22,
      transparent: true,
      opacity: 0.65,
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);

    // Fiery smoke tail
    const tailGeo = new THREE.ConeGeometry(3.5, 30, 8);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xff5511,
      transparent: true,
      opacity: 0.55,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.z = -15;
    tail.rotation.x = Math.PI / 2;

    this.meteorGroup.add(rock, corona, tail);
    this.meteorGroup.position.copy(this.startSkyPos);
    this.scene.add(this.meteorGroup);

    soundEngine.playMeteorRumble(5.0);
  }

  public update(delta: number): { impactJustOccurred: boolean; screenShake: number } {
    let impactJustOccurred = false;
    let screenShake = 0;

    // Flight animation
    if (this.isMeteorInFlight && this.meteorGroup) {
      this.meteorProgress += delta * 0.28; // takes ~3.5 seconds
      if (this.meteorProgress < 1.0) {
        // Curve downward
        const t = this.meteorProgress;
        this.meteorGroup.position.lerpVectors(this.startSkyPos, this.endImpactPos, t);
        this.meteorGroup.rotation.x += delta * 4;
        this.meteorGroup.rotation.y += delta * 6;
      } else {
        // Impact Moment!
        this.isMeteorInFlight = false;
        if (this.meteorGroup) {
          this.scene.remove(this.meteorGroup);
          this.meteorGroup = null;
        }
        this.spawnPhysicalCrater();
        this.spawnEmergencyResponse();
        soundEngine.playMeteorExplosion();
        impactJustOccurred = true;
        screenShake = 1.0;
      }
    }

    // Crater crystal pulsation
    if (this.isImpacted && this.coreCrystal) {
      this.particleTime += delta;
      const pulse = 1.8 + Math.sin(this.particleTime * 3) * 0.8;
      (this.coreCrystal.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }

    return { impactJustOccurred, screenShake };
  }


  /** Spawn a visible, non-combat emergency response at the meteorite impact site. */
  private spawnEmergencyResponse(): void {
    if (this.emergencyResponseGroup) return;
    const response = new THREE.Group();
    response.name = 'meteorite_emergency_response';
    const cx = this.craterCenter.x;
    const cz = this.craterCenter.z;
    const ground = getTerrainHeight(cx, cz);
    const vehicleBody = new THREE.MeshStandardMaterial({ color: 0xd62828, metalness: 0.35, roughness: 0.55 });
    const policeBody = new THREE.MeshStandardMaterial({ color: 0x172b4d, metalness: 0.35, roughness: 0.5 });
    const militaryBody = new THREE.MeshStandardMaterial({ color: 0x59634a, metalness: 0.25, roughness: 0.75 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x8fc9df, roughness: 0.16, metalness: 0.14, transparent: true, opacity: 0.7 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9 });
    const makeVehicle = (name: string, x: number, z: number, material: THREE.Material, kind: 'police' | 'fire' | 'military') => {
      const vehicle = new THREE.Group(); vehicle.name = name;
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(kind === 'fire' ? 5.8 : 4.8, 1.05, kind === 'fire' ? 2.35 : 2.1), material);
      chassis.position.y = 1.0; chassis.castShadow = true; vehicle.add(chassis);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(kind === 'fire' ? 2.5 : 2.2, 1.05, 1.85), material);
      cabin.position.set(-0.25, 2.0, 0); cabin.castShadow = true; vehicle.add(cabin);
      const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.62), glass);
      windscreen.position.set(0.88, 2.02, 0); vehicle.add(windscreen);
      for (const wx of [-1.55, 1.55]) for (const wz of [-1.02, 1.02]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 12), tire);
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.48, wz); vehicle.add(wheel);
      }
      if (kind !== 'military') {
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: kind === 'police' ? 0x164bff : 0xff2020, emissiveIntensity: 2 }));
        light.position.set(-0.2, 2.62, 0); vehicle.add(light);
      }
      vehicle.position.set(x, getTerrainHeight(x, z), z);
      vehicle.rotation.y = Math.atan2(cx - x, cz - z);
      response.add(vehicle);
      return vehicle;
    };
    // Vehicles are staged around the crater perimeter with safe clearance from the core.
    makeVehicle('emergency_police_car_01', cx - 24, cz - 17, policeBody, 'police');
    makeVehicle('emergency_police_car_02', cx + 25, cz - 13, policeBody, 'police');
    makeVehicle('fire_rescue_engine_01', cx - 27, cz + 15, vehicleBody, 'fire');
    makeVehicle('military_response_vehicle_01', cx + 29, cz + 16, militaryBody, 'military');

    // Responder teams: high-visibility rescue/fire personnel and military perimeter staff.
    const responderMats = [
      new THREE.MeshStandardMaterial({ color: 0xff8c24, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xe7e7e7, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x536348, roughness: 0.85 }),
    ];
    const responderPositions: Array<[number, number, number]> = [
      [cx - 17, cz - 6, 0], [cx - 15, cz - 3, 0], [cx - 20, cz + 3, 0],
      [cx + 17, cz - 5, 2], [cx + 19, cz - 1, 2], [cx + 16, cz + 5, 2],
      [cx - 7, cz + 20, 1], [cx - 3, cz + 22, 1], [cx + 4, cz + 21, 1],
      [cx + 9, cz - 21, 2], [cx + 13, cz - 19, 2],
    ];
    responderPositions.forEach(([x, z, team], index) => {
      const person = new THREE.Group(); person.name = `emergency_responder_${index + 1}`;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 4, 8), responderMats[team]);
      body.position.y = 1.0; body.castShadow = true; person.add(body);
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), team === 0 ? responderMats[0] : responderMats[team]);
      helmet.position.y = 1.72; person.add(helmet);
      person.position.set(x, getTerrainHeight(x, z), z);
      person.rotation.y = Math.atan2(cx - x, cz - z);
      response.add(person);
    });

    // Fire crews work the hot perimeter with visible water/foam streams; no combat logic.
    const sprayMat = new THREE.MeshBasicMaterial({ color: 0x9bdcf7, transparent: true, opacity: 0.48 });
    for (const [x, z, targetX, targetZ] of [[cx - 20, cz + 15, cx - 5, cz + 3], [cx - 22, cz + 17, cx + 2, cz - 1]] as number[][]) {
      const start = new THREE.Vector3(x, getTerrainHeight(x, z) + 1.4, z);
      const end = new THREE.Vector3(targetX, getTerrainHeight(targetX, targetZ) + 1.0, targetZ);
      const direction = end.clone().sub(start);
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, direction.length(), 6), sprayMat);
      stream.position.copy(start).add(end).multiplyScalar(0.5);
      stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      response.add(stream);
    }
    this.scene.add(response);
    this.emergencyResponseGroup = response;
  }

  public spawnPhysicalCrater() {
    if (this.isImpacted) return;
    this.isImpacted = true;

    // Apply seismic shockwave to all movable dynamic props within blast range
    DynamicPropPhysicsManager.getInstance()?.applyRadialImpulse(this.craterCenter, 120, 24.0);

    const cx = this.craterCenter.x;
    const cy = getTerrainHeight(cx, this.craterCenter.z);
    const cz = this.craterCenter.z;

    // 1. Crater Scorched Earth Basin (Rim & Depressed Rim)
    const basinGeo = new THREE.RingGeometry(0.5, 14, 24, 6);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x181512,
      roughness: 0.95,
      metalness: 0.1,
    });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.rotation.x = -Math.PI / 2;
    basin.position.set(cx, cy + 0.1, cz);
    basin.receiveShadow = true;
    this.group.add(basin);

    // 2. Bioluminescent Alien Crystal Cluster in Crater Center
    const crystalGeo = new THREE.OctahedronGeometry(2.4, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ccaa,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.9,
    });
    this.coreCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.coreCrystal.position.set(cx, cy + 1.2, cz);
    this.coreCrystal.castShadow = true;
    this.group.add(this.coreCrystal);

    // Alien Glow Point Light
    const alienLight = new THREE.PointLight(0x00ffcc, 3.5, 28, 1.5);
    alienLight.position.set(cx, cy + 2.0, cz);
    this.group.add(alienLight);

    // 3. Scattered Meteorite Shards (Harvestable Extraterrestrial Ore)
    const shardGeo = new THREE.DodecahedronGeometry(0.7, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x2e1d38,
      emissive: 0x6e22aa,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.8,
    });

    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const r = 4 + (i % 3) * 2.5;
      const sx = cx + Math.cos(angle) * r;
      const sz = cz + Math.sin(angle) * r;
      const sy = getTerrainHeight(sx, sz);

      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.name = `meteorite_ore_${i}`;
      shard.position.set(sx, sy + 0.35, sz);
      shard.rotation.set(Math.random(), Math.random(), Math.random());
      shard.castShadow = true;
      this.group.add(shard);
    }

    // 4. Smoke Plume Particle Column
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = cx + (Math.random() - 0.5) * 5;
      positions[i * 3 + 1] = cy + Math.random() * 18;
      positions[i * 3 + 2] = cz + (Math.random() - 0.5) * 5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x444444,
      size: 2.2,
      transparent: true,
      opacity: 0.4,
    });
    this.smokeParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.smokeParticles);
  }

  public dispose() {
    this.scene.remove(this.group);
    if (this.emergencyResponseGroup) this.scene.remove(this.emergencyResponseGroup);
    if (this.meteorGroup) this.scene.remove(this.meteorGroup);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
  }
}
