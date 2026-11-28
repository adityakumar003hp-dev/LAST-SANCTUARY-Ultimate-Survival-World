import * as THREE from 'three';
import { SurvivorDialogue } from '../SurvivorRescueManager';
import { AITrain, STATION_NAMES } from './AITrainManager';
import { getTerrainHeight } from '../Terrain';
import { RailwayNPCSaveRecord } from '../../types/game';
import { NPCSocialAI } from './NPCSocialAI';
import { buildRealisticHumanoid, HumanoidHairStyle } from '../rendering/RealisticHumanoidBuilder';
import { getBrushedMetalPBR, getFabricPBR } from '../../utils/proceduralTextures';

const NPC_WHEEL_GEOMETRY = new THREE.TorusGeometry(0.34, 0.045, 8, 18);

export type RailwayNPCState =
  | 'station_roaming'
  | 'station_sitting'
  | 'station_seating'
  | 'station_kiosk'
  | 'boarding_queue'
  | 'train_boarding'
  | 'train_seated'
  | 'train_walking'
  | 'train_exiting';

export interface RailwayNPCProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  personality: string;
  homeStation: string;
  destinationStation: string;
  travelPurpose: string;
  jacketColor: number;
  pantsColor: number;
  skinTone: number;
  hairType: 'short' | 'ponytail' | 'beanie' | 'conductor_cap' | 'station_master_cap' | 'beret' | 'fedora';
  hairColor: number;
  hasLuggage: boolean;
  luggageColor: number;
  walkSpeed: number;
  dialogueLines: string[];
  choices: string[];
  populationCategory?: string;
  isWheelchairUser?: boolean;
  isChild?: boolean;
  travelGroupId?: string;
  genderPresentation?: 'masculine' | 'feminine' | 'neutral';
}

export const RAILWAY_NPC_CAST: RailwayNPCProfile[] = [
  {
    id: 'elena_vance',
    name: 'Elena Vance',
    age: 34,
    role: 'Station Master · Senior Rail Operations',
    personality: 'Vigilant, professional, authoritative, and welcoming.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Northern Apex Research Stop',
    travelPurpose: 'Supervising six-line network signals, passenger dispatch, and track safety.',
    jacketColor: 0x1e3a5f, // Deep transit navy
    pantsColor: 0x0f172a, // Midnight slacks
    skinTone: 0xd4a373, // Warm tan
    hairType: 'station_master_cap',
    hairColor: 0x221811,
    hasLuggage: false,
    luggageColor: 0x3e2723,
    walkSpeed: 2.2,
    dialogueLines: [
      'Welcome to Sanctuary Railway Network! All six express and commuter lines are operating under 100% autonomous AI scheduling.',
      'Lines F1 through F3 head eastbound (+X) towards Pine Valley and Northern Apex, while B1 through B3 run westbound (-X).',
      'The automated fare turnstiles and ticket kiosks in the concourse are online. Feel free to explore our 5-compartment passenger trains!',
      'Make sure to visit the Observation Lounge at the rear of any train for a panoramic view of the mountain valleys.',
    ],
    choices: ['Ask about train schedules', 'Ask about station facilities', 'Ask about safety & security', 'Farewell'],
  },
  {
    id: 'marcus_sterling',
    name: 'Marcus Sterling',
    age: 42,
    role: 'Chief Conductor · Transit Inspector',
    personality: 'Calm, experienced, disciplined rail veteran.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Riverbend Depot',
    travelPurpose: 'Conducting onboard inspections across passenger, dining, and sleeper compartments.',
    jacketColor: 0x111827, // Formal black conductor uniform
    pantsColor: 0x1f2937,
    skinTone: 0xdeb887,
    hairType: 'conductor_cap',
    hairColor: 0x3d271d,
    hasLuggage: false,
    luggageColor: 0x2b1d0c,
    walkSpeed: 2.0,
    dialogueLines: [
      'Good day, traveler. Doors are synchronized to close automatically 6 seconds before departure chime.',
      'Our trains feature full dining lounges in Car 3 and sleeper berths in Car 4. If you need hot rations, Chef Tobias is by the counter.',
      'Every train is fitted with local pneumatic suspension and regenerative dynamic braking.',
    ],
    choices: ['Inquire about ticket inspection', 'Ask for travel recommendations', 'End conversation'],
  },
  {
    id: 'dr_david_chen',
    name: 'Dr. David Chen',
    age: 38,
    role: 'Field Epidemiologist · Medical Officer',
    personality: 'Intellectual, focused, observant scientist.',
    homeStation: 'Pine Valley Junction',
    destinationStation: 'Northern Apex Research Stop',
    travelPurpose: 'Transporting cryo-preserved vaccine cultures to the Apex Research Complex.',
    jacketColor: 0xf1f5f9, // Sterile white lab coat
    pantsColor: 0x334155,
    skinTone: 0xe0ac69,
    hairType: 'short',
    hairColor: 0x111111,
    hasLuggage: true,
    luggageColor: 0x475569,
    walkSpeed: 2.4,
    dialogueLines: [
      'I am en route to Northern Apex. The railway network has been our vital lifeline for moving medical supplies across sectors.',
      'The ventilation systems inside these trains have HEPA filtration, making them the safest transport in the valley.',
      'Stay safe out there. If you need supplies, check the emergency kiosks at Highland Ridge.',
    ],
    choices: ['Ask about research at Northern Apex', 'Ask about valley conditions', 'Farewell'],
  },
  {
    id: 'aria_lin',
    name: 'Aria Lin',
    age: 29,
    role: 'Structural Rail Architect',
    personality: 'Energetic, detail-oriented, passionate designer.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Sunset Coastway Station',
    travelPurpose: 'Inspecting seismic expansion joints and catenary bridge pylons.',
    jacketColor: 0xb45309, // Amber field jacket
    pantsColor: 0x1e293b,
    skinTone: 0xd4a373,
    hairType: 'ponytail',
    hairColor: 0x1c1917,
    hasLuggage: true,
    luggageColor: 0x78350f,
    walkSpeed: 2.5,
    dialogueLines: [
      'Notice the arched trusses of the station canopy? We designed them to withstand heavy highland snowfalls and seismic tremors.',
      'The flexible gangways between train cars use double-bellows accordion seals so you can walk between coaches without feeling draft or track vibration.',
      'I am surveying the Sunset Coastway bridge piers today. The view from the Observation Lounge is breathtaking.',
    ],
    choices: ['Compliment station architecture', 'Ask about the gangway engineering', 'Goodbye'],
  },
  {
    id: 'kenji_sato',
    name: 'Kenji Sato',
    age: 45,
    role: 'Traction Power Engineer',
    personality: 'Methodical, pragmatic, technical expert.',
    homeStation: 'Highland Ridge Station',
    destinationStation: 'Sanctuary Central Terminal',
    travelPurpose: 'Monitoring the 25kV catenary overhead power grid.',
    jacketColor: 0x15803d, // Utility green coat
    pantsColor: 0x1e293b,
    skinTone: 0xc68642,
    hairType: 'beanie',
    hairColor: 0x1f2937,
    hasLuggage: false,
    luggageColor: 0x1e293b,
    walkSpeed: 2.1,
    dialogueLines: [
      'The pantographs on the roof draw clean 25,000 Volts from our geothermal substation up north.',
      'If you look at the dashboard dials in the Locomotive Cab, you will see the pantograph voltage stays rock steady at 25.0 kV.',
      'All automated signals are fail-safe. If power drops, interlocks instantly default to red signals.',
    ],
    choices: ['Ask about the overhead electrical grid', 'Inquire about train motors', 'Farewell'],
  },
  {
    id: 'sofia_perez',
    name: 'Sofia Perez',
    age: 26,
    role: 'Botanical Researcher · Field Collector',
    personality: 'Curious, cheerful, observant naturalist.',
    homeStation: 'Riverbend Depot',
    destinationStation: 'Redwood Foothills Station',
    travelPurpose: 'Gathering seed specimens from the Redwood pine preserves.',
    jacketColor: 0x0284c7, // Sky blue expedition parka
    pantsColor: 0x374151,
    skinTone: 0x8d5524,
    hairType: 'short',
    hairColor: 0x1c1917,
    hasLuggage: true,
    luggageColor: 0x065f46,
    walkSpeed: 2.3,
    dialogueLines: [
      'I travel between Riverbend and Redwood Foothills every couple of days. The trains are so smooth you can examine botanical slides under a microscope in the dining car.',
      'Have you tried sitting in the observation lounge armchairs? Watching the pine forests roll by is so peaceful.',
      'There are rare alpine herbs blooming near Highland Ridge if you enjoy foraging!',
    ],
    choices: ['Ask about native flora', 'Ask about dining lounge amenities', 'Goodbye'],
  },
  {
    id: 'tobias_wright',
    name: 'Tobias Wright',
    age: 51,
    role: 'Executive Dining Chef · Car 3 Host',
    personality: 'Generous, hearty, culinary enthusiast.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Canyon Pass Freight Depot',
    travelPurpose: 'Managing the culinary galleys and passenger dining services.',
    jacketColor: 0xd97706, // Warm amber chef jacket
    pantsColor: 0x111827,
    skinTone: 0xdeb887,
    hairType: 'short',
    hairColor: 0x6b7280,
    hasLuggage: false,
    luggageColor: 0x451a03,
    walkSpeed: 2.0,
    dialogueLines: [
      'Step right into Car 3! We serve hot roasted barley tea, dried fruit preserves, and fresh survivor stew.',
      'Every dining table has its own ambient shaded lamp. Perfect for a quiet meal while the AI pilot cruises at 65 km/h.',
      'I make sure all six trains are stocked with rations each morning at Central Terminal.',
    ],
    choices: ['Ask for today menu', 'Compliment the dining carriage', 'Farewell'],
  },
  {
    id: 'chloe_ross',
    name: 'Chloe Ross',
    age: 24,
    role: 'Daily Commuter · Data Archivist',
    personality: 'Friendly, tech-savvy, relaxed commuter.',
    homeStation: 'Pine Valley Junction',
    destinationStation: 'Sanctuary Central Terminal',
    travelPurpose: 'Commuting to the Central Archives for digital preservation.',
    jacketColor: 0x9333ea, // Vibrant purple bomber jacket
    pantsColor: 0x1e1b4b,
    skinTone: 0xf1c27d,
    hairType: 'ponytail',
    hairColor: 0xb45309,
    hasLuggage: true,
    luggageColor: 0x581c87,
    walkSpeed: 2.6,
    dialogueLines: [
      'I take Train 02 or Train 04 every single morning! The departure countdowns on the FIDS boards never miss a beat.',
      'The seats have plush velvet fabric and overhead luggage racks for my data drives.',
      'Sometimes I take a nap in the Sleeping Carriage bunks in Car 4 when working late shifts.',
    ],
    choices: ['Ask about daily commuting', 'Ask about sleeper berths', 'Farewell'],
  },
  {
    id: 'sergeant_miller',
    name: 'Sergeant Miller',
    age: 37,
    role: 'Railway Marshal · Security Specialist',
    personality: 'Sharp, watchful, respectful security officer.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Northern Apex Research Stop',
    travelPurpose: 'Patrolling stations and train carriages to ensure passenger safety.',
    jacketColor: 0x1e293b, // Tactical security uniform
    pantsColor: 0x0f172a,
    skinTone: 0xc68642,
    hairType: 'beret',
    hairColor: 0x111111,
    hasLuggage: false,
    luggageColor: 0x1e293b,
    walkSpeed: 2.2,
    dialogueLines: [
      'Station security is fully operational. We have automated perimeter gates and CCTV interlocks on every platform.',
      'Keep your travel pass handy and stay behind the yellow safety stripe when trains are arriving.',
      'All six passenger trains are monitored directly from the Apartment Basement Command Console.',
    ],
    choices: ['Ask about perimeter security', 'Ask about basement console integration', 'At ease'],
  },
  {
    id: 'maya_almansoor',
    name: 'Maya Al-Mansoor',
    age: 31,
    role: 'Radio Communications Specialist',
    personality: 'Analytical, calm, articulate communicator.',
    homeStation: 'Sunset Coastway Station',
    destinationStation: 'Sanctuary Central Terminal',
    travelPurpose: 'Relaying transit telemetry and station PA audio announcements.',
    jacketColor: 0x0d9488, // Teal field jacket
    pantsColor: 0x1e293b,
    skinTone: 0x8d5524,
    hairType: 'short',
    hairColor: 0x18181b,
    hasLuggage: true,
    luggageColor: 0x134e4a,
    walkSpeed: 2.3,
    dialogueLines: [
      'I synchronize the station PA announcement speakers and train arrival chimes.',
      'Whenever a train is approaching, our automated radio beacons alert passengers 120 meters out.',
      'The communication repeaters along the rail line also carry weather and emergency broadcast telemetry.',
    ],
    choices: ['Ask about automated PA system', 'Inquire about radio beacons', 'Farewell'],
  },
  {
    id: 'lucas_bennett',
    name: 'Lucas Bennett',
    age: 22,
    role: 'Trade Courier & Merchant',
    personality: 'Outgoing, ambitious, cheerful trader.',
    homeStation: 'Redwood Foothills Station',
    destinationStation: 'Sanctuary Central Terminal',
    travelPurpose: 'Transporting manufactured tools and handcrafted survivor goods.',
    jacketColor: 0xca8a04, // Mustard adventurer coat
    pantsColor: 0x1f2937,
    skinTone: 0xd4a373,
    hairType: 'fedora',
    hairColor: 0x451a03,
    hasLuggage: true,
    luggageColor: 0x713f12,
    walkSpeed: 2.4,
    dialogueLines: [
      'Need anything traded? I carry rare scrap parts, compass needles, and insulated copper wire.',
      'The freight depot at Canyon Pass connects directly to our secondary rail sidings.',
      'Riding the train saves me weeks of trekking on foot through zombie-infested wilderness!',
    ],
    choices: ['Ask about trade goods', 'Ask about travel routes', 'Farewell'],
  },
  {
    id: 'clara_dupont',
    name: 'Clara Dupont',
    age: 48,
    role: 'Sanctuary Council Representative',
    personality: 'Diplomatic, gracious, community leader.',
    homeStation: 'Sanctuary Central Terminal',
    destinationStation: 'Highland Ridge Station',
    travelPurpose: 'Visiting regional survivor settlements and coordinating municipal resources.',
    jacketColor: 0x4f46e5, // Royal indigo formal coat
    pantsColor: 0x18181b,
    skinTone: 0xf1c27d,
    hairType: 'ponytail',
    hairColor: 0x52525b,
    hasLuggage: true,
    luggageColor: 0x312e81,
    walkSpeed: 2.1,
    dialogueLines: [
      'The Council is proud of our revived railway system. It connects our separated survivor communities into one united sanctuary.',
      'Our citizens can safely commute, study, trade, and visit loved ones across the valley.',
      'Thank you for helping defend and rebuild our world. You are always welcome aboard.',
    ],
    choices: ['Discuss council initiatives', 'Compliment regional transport', 'Farewell'],
  },
];

/**
 * Player-Quality 3D Humanoid NPC Model & Controller.
 * Built with the exact same anatomical scale, modular limb hierarchy,
 * procedural animation engine, and realistic PBR materials as the player avatar!
 */
export class RailwayNPC {
  public profile: RailwayNPCProfile;
  public group: THREE.Group;
  public state: RailwayNPCState = 'station_roaming';
  public currentTrain: AITrain | null = null;
  public currentStationIndex = 0;
  public assignedTrackZ = 150;
  public assignedSeatId: string | null = null;
  public assignedStationSeatId: string | null = null;

  // Spatial coordinates
  public worldPos = new THREE.Vector3();
  public targetPos = new THREE.Vector3();
  public localTrainPos = new THREE.Vector3();
  public targetTrainSeatPos: THREE.Vector3 | null = null;
  public targetTrainExitPos: THREE.Vector3 | null = null;

  // Animation states
  public walkPhase = Math.random() * Math.PI * 2;
  public breatheTimer = Math.random() * Math.PI * 2;
  public stateTimer = 5 + Math.random() * 15;
  public speed = 0;
  public targetSpeed = 0;
  public yaw = 0;
  public targetYaw = 0;

  // 3D Limb references for animation
  public torsoMesh: THREE.Object3D;
  public headMesh: THREE.Object3D;
  public leftArm: THREE.Object3D;
  public rightArm: THREE.Object3D;
  public leftLeg: THREE.Object3D;
  public rightLeg: THREE.Object3D;
  public luggageMesh?: THREE.Object3D;

  constructor(profile: RailwayNPCProfile, initialPos: THREE.Vector3, initialStationIdx = 0) {
    this.profile = profile;
    this.currentStationIndex = initialStationIdx;
    this.worldPos.copy(initialPos);
    this.targetPos.copy(initialPos);

    // Build Player-Quality Composite Humanoid Avatar
    const { group, torsoMesh, headMesh, leftArm, rightArm, leftLeg, rightLeg, luggageMesh } =
      this.createPlayerQualityAvatar(profile);
    this.group = group;
    const identitySeed = profile.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const ageScale = profile.age < 13 ? 0.72 : profile.age < 18 ? 0.87 : profile.age >= 70 ? 0.96 : 1.0;
    this.group.scale.set((0.96 + (identitySeed % 7) * 0.012) * ageScale, (0.94 + (identitySeed % 11) * 0.012) * ageScale, (0.96 + (identitySeed % 5) * 0.014) * ageScale);
    this.torsoMesh = torsoMesh;
    this.headMesh = headMesh;
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.luggageMesh = luggageMesh;

    this.group.position.copy(initialPos);
    this.yaw = Math.random() * Math.PI * 2;
    this.targetYaw = this.yaw;
    this.group.rotation.y = this.yaw;
  }

  // Procedural sculpted PBR humanoid avatar matching player proportions and pivot conventions.
  private createPlayerQualityAvatar(profile: RailwayNPCProfile): {
    group: THREE.Group;
    torsoMesh: THREE.Object3D;
    headMesh: THREE.Object3D;
    leftArm: THREE.Object3D;
    rightArm: THREE.Object3D;
    leftLeg: THREE.Object3D;
    rightLeg: THREE.Object3D;
    luggageMesh?: THREE.Object3D;
  } {
    const roleLower = (profile.role || '').toLowerCase();
    const isRailStaff =
      roleLower.includes('station master') ||
      roleLower.includes('conductor') ||
      roleLower.includes('inspector') ||
      roleLower.includes('marshal') ||
      roleLower.includes('police') ||
      roleLower.includes('guard') ||
      roleLower.includes('clerk') ||
      roleLower.includes('driver');
    const isMedic = roleLower.includes('doctor') || roleLower.includes('medical') || roleLower.includes('nurse');
    const isSecurity = roleLower.includes('marshal') || roleLower.includes('security') || roleLower.includes('police');

    let mappedHair: HumanoidHairStyle = profile.hairType as HumanoidHairStyle;
    if (profile.age >= 60 && mappedHair === 'short') mappedHair = 'parted';
    if (roleLower.includes('porter') && mappedHair === 'short') mappedHair = 'turban';

    const rig = buildRealisticHumanoid({
      facing: '-Z',
      skinColor: profile.skinTone,
      jacketColor: profile.jacketColor,
      pantsColor: profile.pantsColor,
      hairColor: profile.hairColor,
      fabricStyle: isRailStaff ? 'uniform' : isSecurity ? 'tactical' : 'wool',
      genderPresentation: profile.genderPresentation ?? 'neutral',
      hairStyle: mappedHair,
      hasBackpack: !profile.hasLuggage && !isRailStaff && !profile.isWheelchairUser,
      hasStethoscope: isMedic,
      hasHolster: isSecurity,
      hasMedicArmband: isMedic,
      hasHeadset: roleLower.includes('radio') || roleLower.includes('controller'),
      hasBeard: profile.genderPresentation === 'masculine' && profile.age >= 32 && (profile.id.charCodeAt(0) % 3 === 0),
      accentColor: isRailStaff ? 0xd9a74a : 0xb0b8c4,
      name: `NPC_${profile.id}`,
    });

    const { group: root, torsoMesh, headMesh, leftArm, rightArm, leftLeg, rightLeg } = rig;
    const metalPBR = getBrushedMetalPBR();
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd6dce2,
      map: metalPBR.albedo,
      normalMap: metalPBR.normal,
      metalness: 0.78,
      roughness: 0.28,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1f25, roughness: 0.8 });

    let luggageMesh: THREE.Group | undefined;
    if (profile.hasLuggage) {
      const casePBR = getFabricPBR(profile.luggageColor, 'leather');
      const caseMat = new THREE.MeshStandardMaterial({
        map: casePBR.albedo,
        normalMap: casePBR.normal,
        roughness: 0.52,
        metalness: 0.14,
      });
      luggageMesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.36), caseMat);
      body.castShadow = true;
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.37), darkMat);
      strap.position.y = -0.05;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.013, 6, 12, Math.PI), trimMat);
      handle.position.set(0, 0.23, 0);
      luggageMesh.add(body, strap, handle);
      luggageMesh.position.set(0.06, -0.76, -0.02);
      rightArm.add(luggageMesh);
    }

    // Indian Railways Coolie (Porter) Brass Armband & Head Parcel
    if (roleLower.includes('porter')) {
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.22 });
      const armband = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.08, 12), brassMat);
      armband.position.set(0, -0.26, 0);
      leftArm.add(armband);

      const casePBR = getFabricPBR(0x78350f, 'tactical');
      const headCaseMat = new THREE.MeshStandardMaterial({ map: casePBR.albedo, normalMap: casePBR.normal, roughness: 0.85 });
      const headLuggage = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.34), headCaseMat);
      headLuggage.position.set(0, 0.31, 0);
      headLuggage.castShadow = true;
      headMesh.add(headLuggage);
    }

    // Tea & Refreshment Vendor Brushed Steel Chai Kettle
    if (roleLower.includes('tea') || roleLower.includes('vendor')) {
      const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.27, 12), trimMat);
      kettle.position.set(0.07, -0.68, -0.06);
      kettle.castShadow = true;
      const lid = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.06, 10), trimMat);
      lid.position.y = 0.16;
      kettle.add(lid);
      rightArm.add(kettle);
    }

    // Accessible Wheelchair Rig
    if (profile.isWheelchairUser) {
      leftLeg.visible = false;
      rightLeg.visible = false;
      torsoMesh.position.y = 0.98;
      headMesh.position.y = 1.55;
      const chairFrameMat = new THREE.MeshStandardMaterial({ color: 0x39444d, metalness: 0.84, roughness: 0.28 });
      const seatFab = getFabricPBR(0x1f3546, 'tactical');
      const chairSeatMat = new THREE.MeshStandardMaterial({ map: seatFab.albedo, normalMap: seatFab.normal, roughness: 0.82 });
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.11, 0.60), chairSeatMat);
      chairSeat.position.set(0, 0.68, 0.14);
      root.add(chairSeat);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.66, 0.10), chairFrameMat);
      chairBack.position.set(0, 1.02, 0.41);
      root.add(chairBack);
      const footrest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.26), chairFrameMat);
      footrest.position.set(0, 0.22, -0.45);
      root.add(footrest);
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(NPC_WHEEL_GEOMETRY, darkMat);
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(side * 0.42, 0.56, 0.16);
        wheel.castShadow = true;
        root.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 10), trimMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        root.add(hub);
        const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.54), chairFrameMat);
        armrest.position.set(side * 0.37, 0.96, 0.05);
        root.add(armrest);
      }
    }

    return { group: root, torsoMesh, headMesh, leftArm, rightArm, leftLeg, rightLeg, luggageMesh };
  }

  // --- Frame Loop: AI State Machine, Locomotion, and Natural Animation ---
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    trains: AITrain[],
    stationX: number,
    stationZ: number,
    worldSeed: number
  ): void {
    const clampedDelta = Math.min(delta, 0.1);
    this.breatheTimer += clampedDelta * 2.2;
    this.stateTimer -= clampedDelta;

    const distToPlayer = this.worldPos.distanceTo(playerPos);

    // 1. Natural Head Tracking (Looks toward player when close, maintaining eye contact)
    if (distToPlayer < 4.8) {
      const dirX = playerPos.x - this.worldPos.x;
      const dirZ = playerPos.z - this.worldPos.z;
      const angleToPlayer = Math.atan2(dirX, dirZ);
      const relativeYaw = angleToPlayer - this.group.rotation.y;
      this.headMesh.rotation.y = THREE.MathUtils.damp(
        this.headMesh.rotation.y,
        THREE.MathUtils.clamp(relativeYaw, -1.1, 1.1),
        8,
        clampedDelta
      );
      const dy = playerPos.y + 1.6 - (this.worldPos.y + 1.7);
      this.headMesh.rotation.x = THREE.MathUtils.damp(
        this.headMesh.rotation.x,
        THREE.MathUtils.clamp(-dy * 0.35, -0.4, 0.4),
        8,
        clampedDelta
      );
    } else {
      this.headMesh.rotation.y = THREE.MathUtils.damp(this.headMesh.rotation.y, 0, 4, clampedDelta);
      this.headMesh.rotation.x = THREE.MathUtils.damp(this.headMesh.rotation.x, 0, 4, clampedDelta);
    }

    // 2. Personal Space / Collision Avoidance with Player
    if (distToPlayer < 1.4 && this.state !== 'train_seated' && this.state !== 'station_sitting') {
      const pushDir = this.worldPos.clone().sub(playerPos).setY(0).normalize();
      this.worldPos.addScaledVector(pushDir, clampedDelta * 1.8);
      this.group.position.copy(this.worldPos);
    }

    // 3. AI State Machine
    if (this.currentTrain) {
      this.updateInTrainBehavior(clampedDelta, this.currentTrain);
    } else {
      this.updateStationBehavior(clampedDelta, stationX, stationZ, trains, worldSeed);
    }

    // 4. Locomotion & Limb Animation Synthesis
    const isMoving = this.speed > 0.1;
    if (isMoving) {
      this.walkPhase += clampedDelta * (this.speed / this.profile.walkSpeed) * 8.0;

      // Leg swing (synchronized opposite phases)
      this.leftLeg.rotation.x = Math.sin(this.walkPhase) * 0.58;
      this.rightLeg.rotation.x = -Math.sin(this.walkPhase) * 0.58;

      // Arm swing
      this.leftArm.rotation.x = -Math.sin(this.walkPhase) * 0.45;
      if (this.profile.hasLuggage) {
        // Firm grip on luggage handle
        this.rightArm.rotation.x = 0.18;
      } else {
        this.rightArm.rotation.x = Math.sin(this.walkPhase) * 0.45;
      }

      // Natural vertical body bounce
      this.torsoMesh.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.04;
    } else if (this.state === 'station_sitting' || this.state === 'train_seated') {
      // Natural Seated Posture (bent 90 degrees at hips, arms resting)
      this.leftLeg.rotation.x = -Math.PI / 2;
      this.rightLeg.rotation.x = -Math.PI / 2;
      this.leftArm.rotation.x = -0.32;
      this.rightArm.rotation.x = -0.32;
      this.torsoMesh.position.y = 0.88;
    } else if (this.state === 'station_kiosk') {
      // Ticketing and information staff perform small, continuous terminal interactions.
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, -0.18, 5, clampedDelta);
      this.rightArm.rotation.x = -0.35 + Math.sin(this.breatheTimer * 2.4) * 0.12;
      this.torsoMesh.position.y = 1.15 + Math.sin(this.breatheTimer) * 0.012;
    } else {
      // Idle standing posture with gentle rhythmic breathing
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, clampedDelta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, clampedDelta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 8, clampedDelta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(
        this.rightArm.rotation.x,
        this.profile.hasLuggage ? 0.18 : 0,
        8,
        clampedDelta
      );
      this.torsoMesh.position.y = 1.15 + Math.sin(this.breatheTimer) * 0.018;
    }

    // Smooth heading rotation
    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 6, clampedDelta);
    if (!this.currentTrain) this.group.rotation.y = this.yaw;
  }

  // --- Station Navigation, Kiosks, Benches, and Boarding System ---
  private updateStationBehavior(
    delta: number,
    stationX: number,
    stationZ: number,
    trains: AITrain[],
    worldSeed: number
  ): void {
    // Find a service on this exact platform that can reach this passenger's destination.
    const destinationSlot = STATION_NAMES.indexOf(this.profile.destinationStation);
    const serviceForPassenger = trains.find((candidate) => {
      if (Math.abs(candidate.z - this.assignedTrackZ) > 0.75 || Math.abs(candidate.x - stationX) > 90) return false;
      if (destinationSlot < 0) return true;
      for (let step = 1; step <= STATION_NAMES.length; step++) {
        const slot = ((Math.round(candidate.x / 1200) + candidate.direction * step) % STATION_NAMES.length + STATION_NAMES.length) % STATION_NAMES.length;
        if (slot === destinationSlot) return true;
      }
      return false;
    });

    if (this.state === 'boarding_queue' && !serviceForPassenger) {
      this.state = 'station_roaming';
      this.stateTimer = 3 + Math.random() * 4;
      this.pickNewStationTarget(stationX, stationZ);
    }
    if (serviceForPassenger && (this.state === 'boarding_queue' || this.state === 'station_roaming' || this.state === 'station_sitting')) {
      this.state = 'boarding_queue';
      const platformSide = serviceForPassenger.direction === 1 ? 1 : -1;
      const doorWorld = serviceForPassenger.group.localToWorld(new THREE.Vector3(-10.0, 0.38, platformSide * 2.65));
      this.targetPos.copy(doorWorld);
      const doorDistance = Math.hypot(this.worldPos.x - doorWorld.x, this.worldPos.z - doorWorld.z);
      if (serviceForPassenger.doorsOpen && serviceForPassenger.dwellRemaining > 4 && doorDistance < 2.0) {
        this.boardTrain(serviceForPassenger);
        return;
      }
    }

    if (this.state === 'station_sitting') {
      this.speed = 0;
      if (this.stateTimer <= 0) {
        // Stand up and roam
        this.state = 'station_roaming';
        this.stateTimer = 12 + Math.random() * 20;
        this.pickNewStationTarget(stationX, stationZ);
      }
      return;
    }

    // Walk toward target
    const distToTarget = Math.hypot(this.targetPos.x - this.worldPos.x, this.targetPos.z - this.worldPos.z);
    if (distToTarget > 0.6) {
      this.targetSpeed = this.profile.walkSpeed;
      this.speed = THREE.MathUtils.damp(this.speed, this.targetSpeed, 5, delta);

      const dx = this.targetPos.x - this.worldPos.x;
      const dz = this.targetPos.z - this.worldPos.z;
      this.targetYaw = Math.atan2(dx, dz);

      const moveStep = this.speed * delta;
      this.worldPos.x += Math.sin(this.targetYaw) * moveStep;
      this.worldPos.z += Math.cos(this.targetYaw) * moveStep;

      // Platform floor height
      const ground = getTerrainHeight(this.worldPos.x, this.worldPos.z, worldSeed);
      this.worldPos.y = ground + 0.38;
      this.group.position.copy(this.worldPos);
    } else {
      this.speed = 0;
      if (this.state === 'station_seating') {
        this.state = 'station_sitting';
        this.stateTimer = 18 + Math.random() * 30;
        this.targetYaw = 0;
        this.leftLeg.rotation.x = -Math.PI / 2;
        this.rightLeg.rotation.x = -Math.PI / 2;
        return;
      }
      // Wait at the actual platform door marker until the assigned train opens its doors.
      if (this.state === 'boarding_queue') return;
      if (this.stateTimer <= 0) {
        // Random transition: sit on bench, visit ticket kiosk, or roam
        const roll = Math.random();
        if (roll < 0.4) {
          this.state = 'station_seating';
          this.stateTimer = 999;
        } else if (roll < 0.7) {
          this.state = 'station_kiosk';
          this.stateTimer = 8 + Math.random() * 10;
          this.targetPos.set(stationX + (Math.random() - 0.5) * 8, this.worldPos.y, stationZ + 12.0);
        } else {
          this.state = 'station_roaming';
          this.stateTimer = 10 + Math.random() * 15;
          this.pickNewStationTarget(stationX, stationZ);
        }
      }
    }
  }

  private pickNewStationTarget(stationX: number, stationZ: number): void {
    // Platform bounds: X from stationX - 55 to stationX + 55, Z from stationZ + 4.5 to stationZ + 9.5
    const rx = stationX + (Math.random() - 0.5) * 90;
    const rz = stationZ + 5.2 + Math.random() * 4.2;
    this.targetPos.set(rx, this.worldPos.y, rz);
  }

  private snapToStationBench(stationX: number, stationZ: number): void {
    const benchOffsets = [-30, -10, 10, 30];
    const pickedDx = benchOffsets[Math.floor(Math.random() * benchOffsets.length)];
    this.worldPos.set(stationX + pickedDx, this.worldPos.y, stationZ + 7.5);
    this.targetPos.copy(this.worldPos);
    this.targetYaw = 0; // facing track
    this.yaw = 0;
    this.group.position.copy(this.worldPos);
  }

  // --- In-Train Travel, Inter-Carriage Walking & Disembarkation ---
  private updateInTrainBehavior(delta: number, train: AITrain): void {
    if (this.state === 'train_boarding') {
      const seatTarget = this.targetTrainSeatPos ?? new THREE.Vector3(-14.0, 1.52, 0);
      const step = this.profile.walkSpeed * delta;
      if (Math.abs(this.localTrainPos.z) > 0.55) {
        this.localTrainPos.z -= Math.sign(this.localTrainPos.z) * Math.min(step, Math.abs(this.localTrainPos.z) - 0.55);
      } else if (Math.abs(this.localTrainPos.x - seatTarget.x) > 0.45) {
        this.localTrainPos.x += Math.sign(seatTarget.x - this.localTrainPos.x) * Math.min(step, Math.abs(seatTarget.x - this.localTrainPos.x));
      } else if (Math.abs(this.localTrainPos.z - seatTarget.z) > 0.25) {
        this.localTrainPos.z += Math.sign(seatTarget.z - this.localTrainPos.z) * Math.min(step, Math.abs(seatTarget.z - this.localTrainPos.z));
      } else {
        this.localTrainPos.copy(seatTarget);
        this.state = 'train_seated';
        this.stateTimer = 30 + Math.random() * 60;
        this.targetTrainSeatPos = null;
      }
      this.speed = this.profile.walkSpeed;
      const worldPos = train.group.localToWorld(this.localTrainPos.clone());
      this.worldPos.copy(worldPos);
      this.group.position.copy(worldPos);
      this.group.rotation.y = train.group.rotation.y;
      return;
    }

    // Walk from the carriage aisle to the open door, then step onto the platform.
    if (this.state === 'train_exiting') {
      const exitTarget = this.targetTrainExitPos ?? new THREE.Vector3(-10.0, 1.52, train.direction === 1 ? 2.55 : -2.55);
      const step = this.profile.walkSpeed * delta;
      if (Math.abs(this.localTrainPos.z) > 0.55 && Math.abs(this.localTrainPos.x - exitTarget.x) > 0.45) {
        this.localTrainPos.z -= Math.sign(this.localTrainPos.z) * Math.min(step, Math.abs(this.localTrainPos.z) - 0.55);
      } else if (Math.abs(this.localTrainPos.x - exitTarget.x) > 0.45) {
        this.localTrainPos.x += Math.sign(exitTarget.x - this.localTrainPos.x) * Math.min(step, Math.abs(exitTarget.x - this.localTrainPos.x));
      } else if (Math.abs(this.localTrainPos.z - exitTarget.z) > 0.22) {
        this.localTrainPos.z += Math.sign(exitTarget.z - this.localTrainPos.z) * Math.min(step, Math.abs(exitTarget.z - this.localTrainPos.z));
      } else {
        this.localTrainPos.copy(exitTarget);
        this.exitTrain(train);
        return;
      }
      this.speed = this.profile.walkSpeed;
      const worldPos = train.group.localToWorld(this.localTrainPos.clone());
      this.worldPos.copy(worldPos);
      this.group.position.copy(worldPos);
      this.group.rotation.y = train.group.rotation.y;
      return;
    }

    // Disembark only at the passenger's actual destination; no random mid-route exits.
    if (train.dwellRemaining > 4 && train.doorsOpen) {
      const stationIndex = train.currentStationIndex ?? Math.round(train.x / 1200);
      const stationSlot = ((stationIndex % STATION_NAMES.length) + STATION_NAMES.length) % STATION_NAMES.length;
      if (STATION_NAMES[stationSlot] === this.profile.destinationStation) {
        if (this.assignedSeatId) {
          const seat = train.seats.find((candidate) => candidate.seatId === this.assignedSeatId);
          if (seat) seat.isOccupied = false;
          this.assignedSeatId = null;
        }
        const platformSide = train.direction === 1 ? 1 : -1;
        this.targetTrainExitPos = new THREE.Vector3(-10.0, 1.52, platformSide * 2.55);
        this.state = 'train_exiting';
      }
    }

    if (this.state === 'train_seated') {
      this.speed = 0;
      // Sync world position to moving train local seat coordinate
      const worldPos = train.group.localToWorld(this.localTrainPos.clone());
      this.worldPos.copy(worldPos);
      this.group.position.copy(worldPos);
      this.group.rotation.y = train.group.rotation.y + (this.localTrainPos.z > 0 ? 0 : Math.PI);

      // Periodically get up to visit the Dining Lounge, Observation Car, or stretch legs
      if (this.stateTimer <= 0) {
        if (this.assignedSeatId) {
          const occupied = train.seats.find((seat) => seat.seatId === this.assignedSeatId);
          if (occupied) occupied.isOccupied = false;
          this.assignedSeatId = null;
        }
        this.state = 'train_walking';
        this.stateTimer = 15 + Math.random() * 25;
        // Target an exciting compartment: Dining Car (X = -35) or Observation Lounge (X = -92)
        const destinations = [-14.0, -38.0, -65.0, -90.0];
        const nextX = destinations[Math.floor(Math.random() * destinations.length)];
        this.targetPos.set(nextX, 1.52, 0); // Walk down central aisle
      }
      return;
    }

    if (this.state === 'train_walking') {
      // Move in train local space along the aisle
      const dx = this.targetPos.x - this.localTrainPos.x;
      if (Math.abs(dx) > 0.4) {
        const step = Math.sign(dx) * this.profile.walkSpeed * delta;
        this.localTrainPos.x += step;
        this.localTrainPos.z = THREE.MathUtils.clamp(this.localTrainPos.z, -0.6, 0.6);
        this.speed = this.profile.walkSpeed;
        this.targetYaw = dx > 0 ? 0 : Math.PI;
      } else {
        this.speed = 0;
        if (this.stateTimer <= 0) {
          // Take an empty seat in this compartment!
          this.state = 'train_seated';
          this.stateTimer = 30 + Math.random() * 60;
          this.findSeatInCarriage(train, this.localTrainPos.x);
        }
      }

      const worldPos = train.group.localToWorld(this.localTrainPos.clone());
      this.worldPos.copy(worldPos);
      this.group.position.copy(worldPos);
      this.group.rotation.y = train.group.rotation.y + this.targetYaw;
    }
  }

  private findSeatInCarriage(train: AITrain, localX: number): void {
    // Find nearby empty seat in train
    const candidateSeats = train.seats.filter(
      (s) => !s.isOccupied && s.seatId !== 'pilot_observer_seat' && Math.abs(s.localPos.x - localX) < 16.0
    );
    if (candidateSeats.length > 0) {
      const seat = candidateSeats[Math.floor(Math.random() * candidateSeats.length)];
      seat.isOccupied = true;
      this.assignedSeatId = seat.seatId;
      this.localTrainPos.copy(seat.localPos);
    }
  }

  public boardTrain(train: AITrain): void {
    this.currentTrain = train;
    this.assignedTrackZ = train.z;
    this.currentStationIndex = Math.round(train.x / 1200);
    this.state = 'train_boarding';
    this.stateTimer = 0;
    const emptySeats = train.seats.filter((seat) => !seat.isOccupied && seat.seatId !== 'pilot_observer_seat');
    if (emptySeats.length > 0) {
      const seat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
      seat.isOccupied = true;
      this.assignedSeatId = seat.seatId;
      this.targetTrainSeatPos = seat.localPos.clone();
    } else {
      this.assignedSeatId = null;
      this.targetTrainSeatPos = new THREE.Vector3(-14.0, 1.52, 0);
    }
    // Begin at the real open side-door threshold and walk into the aisle before sitting.
    const platformSide = train.direction === 1 ? 1 : -1;
    this.localTrainPos.set(-10.0, 1.52, platformSide * 2.55);
    const worldPos = train.group.localToWorld(this.localTrainPos.clone());
    this.worldPos.copy(worldPos);
    this.group.position.copy(worldPos);
  }

  public exitTrain(train: AITrain): void {
    if (this.assignedSeatId) {
      const seat = train.seats.find((s) => s.seatId === this.assignedSeatId);
      if (seat) seat.isOccupied = false;
      this.assignedSeatId = null;
    }

    this.currentTrain = null;
    this.targetTrainSeatPos = null;
    this.assignedTrackZ = train.z;
    this.currentStationIndex = Math.round(train.x / 1200);
    const stationSlot = ((this.currentStationIndex % STATION_NAMES.length) + STATION_NAMES.length) % STATION_NAMES.length;
    this.profile.homeStation = STATION_NAMES[stationSlot];
    const nextSlot = (stationSlot + 1 + Math.floor(Math.random() * 3)) % STATION_NAMES.length;
    this.profile.destinationStation = STATION_NAMES[nextSlot];
    this.state = 'station_roaming';
    this.stateTimer = 15 + Math.random() * 25;

    // Step just outside the same open carriage door; no platform teleport across the station.
    const platformSide = train.direction === 1 ? 1 : -1;
    const platformExit = train.group.localToWorld(new THREE.Vector3(-10.0, 0.38, platformSide * 4.2));
    this.worldPos.copy(platformExit);
    this.targetPos.set(this.worldPos.x + train.direction * 5.0, this.worldPos.y, train.z + 7.5);
    this.group.position.copy(this.worldPos);
    this.targetTrainExitPos = null;
  }

  public getDialogue(): SurvivorDialogue {
    return {
      id: `railway_npc_${this.profile.id}`,
      name: this.profile.name,
      role: this.profile.role,
      rescued: true,
      lines: this.profile.dialogueLines,
      choices: this.profile.choices,
    };
  }
}

/**
 * Global Railway NPC & Passenger Simulation Manager.
 * Orchestrates player-quality human NPCs across all 6 trains,
 * station platforms, concourse facilities, and ticketing areas.
 */
interface RailwayStationSeatRecord {
  id: string;
  position: THREE.Vector3;
  occupantId: string | null;
}

export interface RailwayStationOperationsSnapshot {
  passengerCount: number;
  stationPassengers: number;
  onboardPassengers: number;
  seatedPassengers: number;
  boardingQueues: number;
  employeeCount: number;
  activeTrains: number;
  trainsAtPlatforms: number;
  activeIncidents: number;
  announcement: string;
  facilities: { ticketing: string; security: string; cctv: string; cleaning: string; lifts: string; lighting: string; signals: string; publicAddress: string };
}

/** Autonomous passenger population, station services and command-centre status feed. */
export class RailwayNPCManager {
  private scene: THREE.Scene;
  private worldSeed: number;
  public npcs: RailwayNPC[] = [];
  public socialAI: NPCSocialAI = new NPCSocialAI();
  private simulationTimer = 0;
  private announcement = 'Sanctuary Railway Network is operating normally.';
  private lastArrivalKey = '';
  private stationSeatRegistry = new Map<string, RailwayStationSeatRecord[]>();
  private readonly facilities = {
    ticketing: 'ONLINE', security: 'ONLINE', cctv: 'ONLINE', cleaning: 'SCHEDULED',
    lifts: 'ONLINE', lighting: 'AUTO', signals: 'INTERLOCKED', publicAddress: 'READY',
  };

  constructor(scene: THREE.Scene, worldSeed = 42) {
    this.scene = scene;
    this.worldSeed = worldSeed;
    this.spawnInitialPopulation();
  }

  private makeAmbientProfile(index: number): RailwayNPCProfile {
    const templates = RAILWAY_NPC_CAST;
    const template = templates[index % templates.length];
    const firstNames = ['Aarav','Mira','Kabir','Anaya','Ishaan','Tara','Reyansh','Meera','Arjun','Nisha','Dev','Kiara','Rohan','Sana','Vihaan','Ira','Neil','Aditi','Zayn','Riya'];
    const lastNames = ['Sharma','Mehta','Rao','Kapoor','Iyer','Patel','Malhotra','Sen','Das','Khan','Joshi','Verma','Nair','Singh','Bose','Gill'];
    const stationIndex = index % STATION_NAMES.length;
    const destinationIndex = (stationIndex + 1 + (index % 3)) % STATION_NAMES.length;
    const hash = (index * 9301 + 49297) % 233280;
    const color = (base: number, offset: number) => {
      const r = Math.max(25, Math.min(245, ((base >> 16) & 255) + ((hash + offset) % 65) - 32));
      const g = Math.max(25, Math.min(245, ((base >> 8) & 255) + ((hash + offset * 3) % 65) - 32));
      const b = Math.max(25, Math.min(245, (base & 255) + ((hash + offset * 7) % 65) - 32));
      return (r << 16) | (g << 8) | b;
    };
    const categories = [
      { category: 'child', age: 9, role: 'Passenger · Child', purpose: 'Travelling with family', employee: false },
      { category: 'lost_child', age: 8, role: 'Passenger · Lost Child', purpose: 'Needs help reconnecting with family and station assistance', employee: false },
      { category: 'teenager', age: 16, role: 'Passenger · Student', purpose: 'Travelling for school or college', employee: false },
      { category: 'senior', age: 73, role: 'Passenger · Senior Citizen', purpose: 'Visiting relatives and travelling at a relaxed pace', employee: false },
      { category: 'family', age: 36, role: 'Passenger · Parent', purpose: 'Family journey with children', employee: false },
      { category: 'couple', age: 29, role: 'Passenger · Couple Traveller', purpose: 'Travelling with a companion', employee: false },
      { category: 'solo', age: 32, role: 'Passenger · Solo Traveller', purpose: 'Independent intercity journey', employee: false },
      { category: 'tourist', age: 30, role: 'Passenger · Tourist', purpose: 'Sightseeing and exploration', employee: false },
      { category: 'foreign_traveller', age: 34, role: 'Passenger · International Visitor', purpose: 'Long-distance tourism', employee: false },
      { category: 'wheelchair_user', age: 55, role: 'Passenger · Wheelchair User', purpose: 'Accessible travel with station assistance', employee: false },
      { category: 'security', age: 38, role: 'Railway Security Officer', purpose: 'Patrolling platforms and passenger areas', employee: true },
      { category: 'vendor', age: 45, role: 'Tea & Refreshment Vendor', purpose: 'Serving passengers at authorized station points', employee: true },
      { category: 'medical', age: 34, role: 'First-Aid Nurse', purpose: 'Providing station medical assistance', employee: true },
      { category: 'ticket_clerk', age: 35, role: 'Ticket Clerk', purpose: 'Issuing and validating passenger tickets', employee: true },
      { category: 'ticket_examiner', age: 42, role: 'TTE · Ticket Examiner', purpose: 'Checking tickets and assigned seats aboard trains', employee: true },
      { category: 'porter', age: 40, role: 'Luggage Porter', purpose: 'Assisting passengers with baggage', employee: true },
      { category: 'cleaner', age: 36, role: 'Station Cleaner', purpose: 'Cleaning platforms and public areas', employee: true },
      { category: 'maintenance', age: 39, role: 'Maintenance Technician', purpose: 'Maintaining station equipment and facilities', employee: true },
      { category: 'police', age: 41, role: 'Railway Police Officer', purpose: 'Responding to safety incidents', employee: true },
      { category: 'doctor', age: 44, role: 'Station Doctor', purpose: 'Providing medical response and first aid', employee: true },
      { category: 'station_master', age: 49, role: 'Station Master', purpose: 'Coordinating platform assignments and dispatch', employee: true },
      { category: 'guard', age: 43, role: 'Train Guard', purpose: 'Checking train readiness and departure safety', employee: true },
      { category: 'driver', age: 38, role: 'Railway Driver', purpose: 'Operating assigned autonomous train service', employee: true },
      { category: 'platform_staff', age: 28, role: 'Platform Attendant', purpose: 'Helping passengers board and alight safely', employee: true },
      { category: 'ambulance', age: 34, role: 'Emergency Medical Responder', purpose: 'Responding to medical emergencies', employee: true },
      { category: 'cctv', age: 31, role: 'CCTV Control Operator', purpose: 'Monitoring camera coverage and incident alerts', employee: true },
    ] as const;
    const kind = categories[index % categories.length];
    const age = kind.age + ((index % 3) - 1) * (kind.category === 'child' ? 2 : 3);
    const uniformColors: Record<string, number> = {
      security: 0x17365d, police: 0x926c45, station_master: 0xf8fafc, ticket_examiner: 0x111827,
      driver: 0x24364a, guard: 0x263d55, vendor: 0xb45309, medical: 0x2f7860,
      doctor: 0xf0f2f4, ambulance: 0xe9ecef, cleaner: 0x84cc16, maintenance: 0x555d64,
      porter: 0xb91c1c, platform_staff: 0x1c5870, cctv: 0x34465b,
    };
    const employee = kind.employee;
    const familyLinked = kind.category === 'child' || kind.category === 'family' || kind.category === 'couple';
    const hairType = employee && ['security', 'police', 'station_master', 'driver', 'guard'].includes(kind.category)
      ? (kind.category === 'station_master' ? 'station_master_cap' : 'conductor_cap')
      : (['short','ponytail','beanie','beret','fedora'] as RailwayNPCProfile['hairType'][])[index % 5];
    return {
      ...template,
      id: `commuter_${index.toString().padStart(4, '0')}`,
      name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`,
      age,
      role: kind.role,
      personality: ['Patient and observant','Friendly and curious','Quiet and focused','Energetic and helpful'][index % 4],
      homeStation: STATION_NAMES[stationIndex],
      destinationStation: STATION_NAMES[destinationIndex],
      travelPurpose: kind.purpose,
      jacketColor: employee ? (uniformColors[kind.category] ?? 0x27364b) : color(template.jacketColor, 1),
      pantsColor: color(template.pantsColor, 2),
      skinTone: [0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0xd4a373,0xdeb887][index % 6],
      hairType,
      hairColor: [0x17120f,0x3b2418,0x6b4423,0x252525,0x8b5a2b][index % 5],
      hasLuggage: !['child','wheelchair_user','security','medical','doctor','cleaner','maintenance','cctv'].includes(kind.category) && index % 3 !== 0,
      luggageColor: color(template.luggageColor, 5),
      walkSpeed: kind.category === 'wheelchair_user' ? 1.25 : kind.category === 'senior' ? 1.35 : kind.category === 'child' ? 2.05 : 1.9 + (index % 7) * 0.12,
      dialogueLines: [`I am travelling from ${STATION_NAMES[stationIndex]} to ${STATION_NAMES[destinationIndex]}.`, `${kind.purpose}.`, 'The station information boards keep me updated on the service.'],
      choices: kind.category === 'child' ? ['Help me find my family','Ask where I am travelling','Say goodbye'] : ['Ask about their journey','Ask about station services','Offer assistance','Say goodbye'],
      populationCategory: kind.category,
      isWheelchairUser: kind.category === 'wheelchair_user',
      isChild: kind.category === 'child' || kind.category === 'lost_child',
      travelGroupId: familyLinked ? `travel_group_${stationIndex}_${Math.floor(index / 3)}` : undefined,
      genderPresentation: index % 7 === 0 ? 'neutral' : index % 2 === 0 ? 'feminine' : 'masculine',
    };
  }

  public static readonly WORLD_POPULATION_COUNT = 1000;
  public static worldPopulationRegistry: RailwayNPCProfile[] = [];

  private spawnInitialPopulation(): void {
    // Generate persistent 1,000-citizen railway population registry deterministically
    if (RailwayNPCManager.worldPopulationRegistry.length === 0) {
      RailwayNPCManager.worldPopulationRegistry = [...RAILWAY_NPC_CAST];
      for (let i = 0; i < RailwayNPCManager.WORLD_POPULATION_COUNT - RAILWAY_NPC_CAST.length; i++) {
        RailwayNPCManager.worldPopulationRegistry.push(this.makeAmbientProfile(i));
      }
    }

    // Spawn 72 active high-fidelity humanoid avatars across the station and trains
    const activeProfiles = RailwayNPCManager.worldPopulationRegistry.slice(0, 72);
    const spawnSlots = new Map<string, number>();
    activeProfiles.forEach((profile, idx) => {
      const stationIndex = idx < RAILWAY_NPC_CAST.length ? Math.max(0, STATION_NAMES.indexOf(profile.homeStation)) : Number(profile.id.split('_').pop()) % STATION_NAMES.length;
      const trackIndex = idx % 6;
      const trackZ = 150 + trackIndex * 12;
      const stationX = stationIndex * 1200;
      const slotKey = `${stationIndex}:${trackIndex}`;
      const slot = spawnSlots.get(slotKey) ?? 0;
      spawnSlots.set(slotKey, slot + 1);
      // Deterministic, collision-safe spawn bays inside the station hall. Each
      // station/track pair owns a grid; no random or modulo-wrapped spawn pileups.
      const column = slot % 5;
      const row = Math.floor(slot / 5);
      // Spawn on each NPC's assigned platform so they never walk across live tracks.
      // The hall, waiting rooms and footbridge remain explorable by the player.
      const spawnX = stationX - 42 + column * 18;
      const spawnZ = trackZ + 7.5 + row * 0.9;
      const groundY = getTerrainHeight(spawnX, spawnZ, this.worldSeed) + 0.42;
      const npc = new RailwayNPC(profile, new THREE.Vector3(spawnX, groundY, spawnZ), stationIndex);
      npc.assignedTrackZ = trackZ;
      npc.state = idx % 4 === 0 ? 'station_seating' : 'station_roaming';
      npc.stateTimer = 8 + (idx % 9) * 2;
      // Stagger initial destinations as well as spawn coordinates so nearby NPCs
      // do not all attempt the same bench/doorway on the first simulation tick.
      npc.targetPos.set(spawnX + ((slot % 3) - 1) * 2.2, groundY, spawnZ + 2.0 + (slot % 2) * 1.6);
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });
  }

  private getStationSeats(stationIndex: number, trackZ: number): RailwayStationSeatRecord[] {
    const key = `${stationIndex}:${trackZ}`;
    let seats = this.stationSeatRegistry.get(key);
    if (seats) return seats;
    seats = [];
    const stationX = stationIndex * 1200;
    const benchOffsets = [-39, -13, 13, 39];
    benchOffsets.forEach((offset, benchIndex) => {
      for (let side = 0; side < 2; side++) {
        const x = stationX + offset + (side === 0 ? -0.72 : 0.72);
        const z = trackZ + 9.5;
        seats!.push({
          id: `ST-${stationIndex}-${trackZ}-BENCH-${benchIndex + 1}-SEAT-${side + 1}`,
          position: new THREE.Vector3(x, getTerrainHeight(x, z, this.worldSeed) + 0.38, z),
          occupantId: null,
        });
      }
    });
    this.stationSeatRegistry.set(key, seats);
    return seats;
  }

  private releaseStationSeat(npc: RailwayNPC): void {
    if (!npc.assignedStationSeatId) return;
    for (const seats of this.stationSeatRegistry.values()) {
      const seat = seats.find((candidate) => candidate.id === npc.assignedStationSeatId);
      if (seat && seat.occupantId === npc.profile.id) seat.occupantId = null;
    }
    npc.assignedStationSeatId = null;
  }

  public update(delta: number, playerPos: THREE.Vector3, trains: AITrain[], _stationX: number, _stationZ: number): void {
    const dt = Math.min(delta, 0.1);
    this.simulationTimer += dt;

    // Station PA responds to actual train arrival, dispatch holds and system incidents.
    const heldTrain = trains.find((train) => train.holdOrdered);
    const arrivingTrain = trains.find((train) => train.doorsOpen && train.dwellRemaining > 4);
    if (heldTrain) this.announcement = `Dispatch alert: ${heldTrain.trainNumber} is held. Platform staff and security have been notified.`;
    else if (arrivingTrain) {
      const stationIndex = arrivingTrain.currentStationIndex ?? Math.round(arrivingTrain.x / 1200);
      const stationName = STATION_NAMES[((stationIndex % STATION_NAMES.length) + STATION_NAMES.length) % STATION_NAMES.length];
      const key = `${arrivingTrain.id}:${stationIndex}`;
      if (key !== this.lastArrivalKey) {
        this.lastArrivalKey = key;
        this.announcement = `Attention passengers: ${arrivingTrain.trainNumber}, ${arrivingTrain.serviceName}, has arrived at ${stationName}. Please stand behind the safety line.`;
      }
    } else if (this.simulationTimer > 20) {
      this.simulationTimer = 0;
      this.announcement = 'Sanctuary Railway Network: all platforms, ticketing and passenger services are operating normally.';
    }

    // Local simulation near the player is full fidelity; distant station crowds retain state.
    // Passengers already aboard a nearby train remain attached to its moving carriage hierarchy.
    for (const npc of this.npcs) {
      const distance = npc.worldPos.distanceTo(playerPos);
      npc.group.visible = distance < 260;
      const stationX = npc.currentStationIndex * 1200;
      if (distance > 260) {
        // Trains keep moving across the world; onboard passengers must stay attached and
        // complete destination stops even while the player is exploring elsewhere.
        if (npc.currentTrain) {
          npc.update(dt, playerPos, trains, stationX, npc.assignedTrackZ, this.worldSeed);
          if (npc.state !== 'station_seating' && npc.state !== 'station_sitting') this.releaseStationSeat(npc);
        }
        continue;
      }

      // Reserve one unique bench seat and walk to it; never snap/teleport onto a bench.
      if (npc.state === 'station_seating' && !npc.assignedStationSeatId) {
        const available = this.getStationSeats(npc.currentStationIndex, npc.assignedTrackZ).find((seat) => !seat.occupantId);
        if (available) {
          available.occupantId = npc.profile.id;
          npc.assignedStationSeatId = available.id;
          npc.targetPos.copy(available.position);
          npc.stateTimer = 999;
        } else {
          npc.state = 'station_roaming';
          npc.stateTimer = 5;
        }
      }

      // Staff receive role-specific duty posts instead of sharing passenger idle behaviour.
      const role = npc.profile.role.toLowerCase();
      const hasStationDuty = [
        'station master', 'ticketing assistant', 'ticket clerk', 'passenger assistance', 'security officer',
        'police officer', 'refreshment vendor', 'porter', 'station cleaner', 'maintenance technician',
        'first-aid nurse', 'station doctor', 'platform attendant', 'cctv control operator',
      ].some((duty) => role.includes(duty));
      if (!npc.currentTrain && hasStationDuty) {
        const dutyX = role.includes('station master') ? stationX + 38
          : (role.includes('ticketing') || role.includes('ticket clerk')) ? stationX - 18
          : role.includes('security') || role.includes('police') ? stationX - 52
          : role.includes('vendor') ? stationX
          : role.includes('porter') ? stationX + 22
          : role.includes('cleaner') ? stationX + 45
          : role.includes('maintenance') ? stationX - 42
          : role.includes('medical') || role.includes('doctor') ? stationX + 30
          : role.includes('cctv') ? stationX + 48 : stationX - 28;
        const dutyZ = role.includes('station master') ? npc.assignedTrackZ + 13
          : (role.includes('ticketing') || role.includes('ticket clerk')) ? npc.assignedTrackZ + 15.5
          : role.includes('security') || role.includes('police') ? npc.assignedTrackZ + 6.2
          : role.includes('vendor') ? npc.assignedTrackZ + 9.5
          : role.includes('porter') ? npc.assignedTrackZ + 8.8
          : role.includes('cleaner') ? npc.assignedTrackZ + 7.0
          : role.includes('maintenance') ? npc.assignedTrackZ + 10.5
          : role.includes('medical') || role.includes('doctor') ? npc.assignedTrackZ + 11.0
          : role.includes('cctv') ? npc.assignedTrackZ + 13.5 : npc.assignedTrackZ + 12.8;
        if (npc.state !== 'station_kiosk') {
          npc.state = 'station_kiosk';
          npc.targetPos.set(dutyX, npc.worldPos.y, dutyZ);
          npc.stateTimer = 999;
        }
      }

      npc.update(dt, playerPos, trains, stationX, npc.assignedTrackZ, this.worldSeed);
      if (npc.state !== 'station_seating' && npc.state !== 'station_sitting') this.releaseStationSeat(npc);
    }

    // Local crowd steering prevents nearby walkers from occupying the same space.
    const activeWalkers = this.npcs.filter((npc) => npc.group.visible && !npc.currentTrain && npc.state !== 'station_sitting');
    for (let i = 0; i < activeWalkers.length; i++) {
      for (let j = i + 1; j < activeWalkers.length; j++) {
        const a = activeWalkers[i];
        const b = activeWalkers[j];
        const dx = a.worldPos.x - b.worldPos.x;
        const dz = a.worldPos.z - b.worldPos.z;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq < 0.64) {
          // Even exact-coordinate overlaps receive a stable separating direction.
          const distance = Math.sqrt(Math.max(distanceSq, 0.0001));
          const angle = ((a.profile.id.length * 31 + b.profile.id.length * 17 + i * 13 + j * 7) % 360) * Math.PI / 180;
          const nx = distanceSq > 0.0001 ? dx / distance : Math.cos(angle);
          const nz = distanceSq > 0.0001 ? dz / distance : Math.sin(angle);
          const push = Math.max(0.04, (0.8 - distance) * 0.5);
          a.worldPos.x += nx * push;
          a.worldPos.z += nz * push;
          b.worldPos.x -= nx * push;
          b.worldPos.z -= nz * push;
          a.group.position.copy(a.worldPos);
          b.group.position.copy(b.worldPos);
        }
      }
    }

    // Update autonomous NPC social behaviors (greeting, sharing seats, waiting together)
    this.socialAI.update(dt, this.npcs);
  }

  public getSaveState(): RailwayNPCSaveRecord[] {
    return this.npcs.map((npc) => ({
      id: npc.profile.id,
      position: [npc.worldPos.x, npc.worldPos.y, npc.worldPos.z],
      currentStationIndex: npc.currentStationIndex,
      assignedTrackZ: npc.assignedTrackZ,
      state: npc.state,
      destinationStation: npc.profile.destinationStation,
      currentTrainId: npc.currentTrain?.id,
      localTrainPos: [npc.localTrainPos.x, npc.localTrainPos.y, npc.localTrainPos.z],
      assignedSeatId: npc.assignedSeatId,
      assignedStationSeatId: npc.assignedStationSeatId,
      stateTimer: npc.stateTimer,
      walkPhase: npc.walkPhase,
      yaw: npc.yaw,
      targetYaw: npc.targetYaw,
    }));
  }

  public restoreSaveState(records: RailwayNPCSaveRecord[] | undefined, trains: AITrain[]): void {
    if (!records?.length) return;
    for (const train of trains) for (const seat of train.seats) seat.isOccupied = false;
    this.stationSeatRegistry.clear();
    const byId = new Map(this.npcs.map((npc) => [npc.profile.id, npc]));
    for (const record of records) {
      const npc = byId.get(record.id);
      if (!npc) continue;
      npc.worldPos.set(...record.position);
      npc.group.position.copy(npc.worldPos);
      npc.currentStationIndex = record.currentStationIndex;
      npc.assignedTrackZ = record.assignedTrackZ;
      npc.profile.destinationStation = record.destinationStation;
      npc.state = record.state as RailwayNPCState;
      npc.stateTimer = record.stateTimer;
      npc.walkPhase = record.walkPhase;
      npc.yaw = record.yaw;
      npc.targetYaw = record.targetYaw;
      npc.group.rotation.y = npc.yaw;
      npc.assignedSeatId = record.assignedSeatId ?? null;
      npc.assignedStationSeatId = record.assignedStationSeatId ?? null;
      if (record.localTrainPos) npc.localTrainPos.set(...record.localTrainPos);
      npc.currentTrain = record.currentTrainId ? trains.find((train) => train.id === record.currentTrainId) ?? null : null;
      if (npc.currentTrain && npc.assignedSeatId) {
        const seat = npc.currentTrain.seats.find((candidate) => candidate.seatId === npc.assignedSeatId);
        if (seat) {
          seat.isOccupied = true;
          if (npc.state === 'train_boarding') npc.targetTrainSeatPos = seat.localPos.clone();
        }
      }
      if (npc.currentTrain && npc.state === 'train_exiting') {
        npc.targetTrainExitPos = new THREE.Vector3(-10.0, 1.52, npc.currentTrain.direction === 1 ? 2.55 : -2.55);
      }
      if (npc.assignedStationSeatId && !npc.currentTrain) {
        const seats = this.getStationSeats(npc.currentStationIndex, npc.assignedTrackZ);
        const stationSeat = seats.find((seat) => seat.id === npc.assignedStationSeatId);
        if (stationSeat) stationSeat.occupantId = npc.profile.id;
      }
      if (npc.currentTrain) {
        const worldPos = npc.currentTrain.group.localToWorld(npc.localTrainPos.clone());
        npc.worldPos.copy(worldPos);
        npc.group.position.copy(worldPos);
      }
    }
  }

  public getOperationsSnapshot(trains: AITrain[]): RailwayStationOperationsSnapshot {
    const onboard = this.npcs.filter((npc) => !!npc.currentTrain);
    const employeeCount = this.npcs.filter((npc) => !npc.profile.role.toLowerCase().includes('passenger') && !npc.profile.role.toLowerCase().includes('commuter')).length;
    return {
      passengerCount: this.npcs.length,
      stationPassengers: this.npcs.length - onboard.length,
      onboardPassengers: onboard.length,
      seatedPassengers: onboard.filter((npc) => npc.state === 'train_seated').length,
      boardingQueues: this.npcs.filter((npc) => npc.state === 'boarding_queue').length,
      employeeCount,
      activeTrains: trains.filter((train) => train.conditionPct > 0).length,
      trainsAtPlatforms: trains.filter((train) => train.doorsOpen && train.dwellRemaining > 0).length,
      activeIncidents: trains.filter((train) => train.holdOrdered || train.conditionPct < 70).length,
      announcement: this.announcement,
      facilities: { ...this.facilities },
    };
  }

  public getNearestNPC(playerPos: THREE.Vector3, maxDist = 3.8): RailwayNPC | null {
    let nearest: RailwayNPC | null = null;
    let minDist = maxDist;
    for (const npc of this.npcs) {
      if (!npc.group.visible) continue;
      const d = npc.worldPos.distanceTo(playerPos);
      if (d < minDist) { minDist = d; nearest = npc; }
    }
    return nearest;
  }

  public dispose(): void {
    for (const npc of this.npcs) {
      this.scene.remove(npc.group);
      npc.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry && !mesh.geometry.userData?.__sharedResource) {
            mesh.geometry.dispose();
          }
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (m && !m.userData?.__sharedResource) m.dispose();
          });
        }
      });
    }
    this.npcs = [];
    this.stationSeatRegistry.clear();
  }
}
