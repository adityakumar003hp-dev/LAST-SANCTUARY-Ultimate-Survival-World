/**
 * Outpost 7 — Military Research & Science Complex
 * Comprehensive 3D military-science campus inside the Outpost 7 protected perimeter.
 * Features 10 fully articulated facilities, campus security perimeter, generator station,
 * solar power grid, loading docks, guard posts, and physical collision boundaries.
 */

import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { RESEARCH_FACILITIES, ResearchFacilityDefinition } from '../../data/researchFacilities';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { soundEngine } from '../../utils/audio';

export interface FacilityInteractionPoint {
  id: string;
  facilityId: string;
  name: string;
  prompt: string;
  position: THREE.Vector3;
  radius: number;
  storyClue: string;
  missionLink?: number;
}

export class ResearchComplexManager {
  public readonly root: THREE.Group;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  public readonly facilityMeshes = new Map<string, THREE.Group>();
  public readonly interactionPoints: FacilityInteractionPoint[] = [];
  private animatedLightMesh: THREE.Mesh | null = null;
  private meteorMesh: THREE.Mesh | null = null;
  private animTimer = 0;

  constructor(
    private readonly scene: THREE.Scene,
    public readonly centerX: number = 974,
    public readonly centerZ: number = 1,
    seed: number = 42
  ) {
    this.root = new THREE.Group();
    this.root.name = 'Outpost7_Military_Research_Science_Complex';
    const groundY = getTerrainHeight(centerX, centerZ, seed);
    this.root.position.set(centerX, groundY, centerZ);
    this.scene.add(this.root);

    this.buildCampus();
    this.registerColliders();
  }

  private material(
    color: number,
    roughness = 0.75,
    metalness = 0.2,
    emissive = 0,
    transparent = false,
    opacity = 1.0
  ): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity: emissive ? 0.35 : 0,
      transparent,
      opacity,
      side: THREE.DoubleSide,
    });
    this.materials.push(m);
    return m;
  }

  private box(
    parent: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    this.geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private cylinder(
    parent: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    mat: THREE.Material,
    radialSegments = 12
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    this.geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildCampus(): void {
    // Architectural Palette
    const concrete = this.material(0x737b7d, 0.9, 0.1);
    const wallGrey = this.material(0x46545a, 0.72, 0.42);
    const roofDark = this.material(0x232e35, 0.58, 0.62);
    const glassCyan = this.material(0x174b5a, 0.15, 0.6, 0x06232b, true, 0.65);
    const trimSteel = this.material(0xb5c1c2, 0.4, 0.75);
    const hazardYellow = this.material(0xd69a32, 0.5, 0.2, 0x3d2703);
    const glowCyan = this.material(0x42c8d4, 0.25, 0.5, 0x167d8a);
    const glowViolet = this.material(0x9d4edd, 0.2, 0.4, 0x5a189a);
    const asphaltRoad = this.material(0x2b3033, 0.95, 0.05);
    const metalDark = this.material(0x1a2126, 0.6, 0.8);
    const labWhite = this.material(0xe6edf0, 0.6, 0.15);
    const grassGreen = this.material(0x3a4f32, 0.9, 0.05);

    // 1. Campus Foundation & Asphalt Roadways
    this.box(this.root, 'CampusFoundation', 0, 0.05, 0, 48, 0.22, 42, concrete);
    this.box(this.root, 'MainAccessRoad', 0, 0.18, 20.5, 48, 0.12, 3.2, asphaltRoad);
    this.box(this.root, 'CourtyardRoadway', 0, 0.18, 0, 8.5, 0.12, 36, asphaltRoad);
    this.box(this.root, 'CrossRoadwayNorth', 0, 0.18, -10.5, 44, 0.12, 3.0, asphaltRoad);

    // Decorative Courtyard Planters / Green Belts
    for (const [gx, gz] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
      this.box(this.root, 'CourtyardGreenery', gx, 0.22, gz, 2.8, 0.25, 5.0, grassGreen);
    }

    // 2. Heavy Military Perimeter Security Walls with barbed wire top
    this.box(this.root, 'NorthPerimeterWall', 0, 1.4, -20.5, 48, 2.8, 0.65, wallGrey);
    this.box(this.root, 'WestPerimeterWall', -23.8, 1.4, 0, 0.65, 2.8, 41, wallGrey);
    this.box(this.root, 'EastPerimeterWall', 23.8, 1.4, 0, 0.65, 2.8, 41, wallGrey);
    // South Wall has 8m vehicle gateway opening at center
    this.box(this.root, 'SouthPerimeterWest', -16.0, 1.4, 20.5, 15.5, 2.8, 0.65, wallGrey);
    this.box(this.root, 'SouthPerimeterEast', 16.0, 1.4, 20.5, 15.5, 2.8, 0.65, wallGrey);

    // Gate Portal Header & Illuminated Base Monument Sign
    this.box(this.root, 'GatePortalHeader', 0, 3.8, 20.5, 10.5, 0.65, 1.0, roofDark);
    this.box(this.root, 'GateSignIlluminated', 0, 4.35, 20.1, 9.2, 0.75, 0.15, glowCyan);
    const sign = this.box(this.root, 'CampusMonumentSign', 0, 1.2, 22.8, 11.5, 2.2, 0.4, roofDark);
    sign.userData.label = 'OUTPOST 7 — MILITARY RESEARCH & SCIENCE CAMPUS';

    // Guard Post & Boom Barrier at Gateway
    const guardPost = new THREE.Group();
    guardPost.name = 'GuardCheckpointBooth';
    guardPost.position.set(-5.6, 0, 19.5);
    this.root.add(guardPost);
    this.box(guardPost, 'BoothFloor', 0, 0.2, 0, 2.8, 0.4, 2.8, concrete);
    this.box(guardPost, 'BoothWalls', 0, 1.6, 0, 2.6, 2.4, 2.6, wallGrey);
    this.box(guardPost, 'BoothRoof', 0, 2.9, 0, 3.2, 0.3, 3.2, roofDark);
    this.box(guardPost, 'BoothWindow', 0, 1.6, 1.25, 2.0, 1.1, 0.1, glassCyan);
    // Barrier Arm
    this.cylinder(guardPost, 'BarrierPivot', 1.6, 1.0, 0, 0.2, 0.2, 1.2, metalDark);
    this.box(guardPost, 'BoomBarrierArm', 3.8, 1.05, 0, 4.4, 0.12, 0.12, hazardYellow);

    // 3. Ten Dedicated Research Facilities
    const facilitySpecs: Array<{
      id: string;
      x: number;
      z: number;
      w: number;
      d: number;
      name: string;
      accentMat: THREE.Material;
      interiorType: string;
    }> = [
      { id: 'biology_lab', x: -14.5, z: -14.5, w: 9.5, d: 7.2, name: 'Biology Laboratory', accentMat: glowCyan, interiorType: 'biology' },
      { id: 'medical_research', x: 0, z: -14.5, w: 9.0, d: 7.2, name: 'Medical Research Center', accentMat: glowCyan, interiorType: 'medical' },
      { id: 'meteor_lab', x: 14.5, z: -14.5, w: 9.5, d: 7.2, name: 'Meteor Research Lab', accentMat: glowViolet, interiorType: 'meteor' },
      { id: 'infection_testing', x: -14.5, z: -3.5, w: 9.5, d: 7.2, name: 'Infection Testing Chambers', accentMat: hazardYellow, interiorType: 'testing' },
      { id: 'genetics_lab', x: 14.5, z: -3.5, w: 9.5, d: 7.2, name: 'Genetics Laboratory', accentMat: glowCyan, interiorType: 'genetics' },
      { id: 'sample_storage', x: -14.5, z: 7.5, w: 9.5, d: 6.8, name: 'Underground Sample Storage', accentMat: hazardYellow, interiorType: 'storage' },
      { id: 'research_command', x: 0, z: -3.5, w: 9.0, d: 7.2, name: 'Research Command Center', accentMat: glowCyan, interiorType: 'command' },
      { id: 'scientist_quarters', x: 14.5, z: 7.5, w: 9.5, d: 6.8, name: 'Scientist Quarters', accentMat: trimSteel, interiorType: 'quarters' },
      { id: 'quarantine_ward', x: 0, z: 7.5, w: 9.0, d: 6.8, name: 'Quarantine Ward', accentMat: hazardYellow, interiorType: 'quarantine' },
      { id: 'secret_lab', x: 0, z: -20.2, w: 7.5, d: 5.5, name: 'Secret Underground Laboratory', accentMat: glowViolet, interiorType: 'secret' },
    ];

    for (const spec of facilitySpecs) {
      const def = RESEARCH_FACILITIES.find((f: ResearchFacilityDefinition) => f.id === spec.id);
      const bGroup = new THREE.Group();
      bGroup.name = `Facility_${spec.id}`;
      bGroup.position.set(spec.x, 0, spec.z);
      this.root.add(bGroup);

      // Building Core: Foundation, Walls, Overhang Roof
      this.box(bGroup, `${spec.id}_foundation`, 0, 0.25, 0, spec.w, 0.5, spec.d, concrete);
      this.box(bGroup, `${spec.id}_walls`, 0, 2.15, 0, spec.w - 0.4, 3.4, spec.d - 0.4, wallGrey);
      this.box(bGroup, `${spec.id}_roof`, 0, 3.95, 0, spec.w + 0.35, 0.4, spec.d + 0.35, roofDark);

      // Windows and Front Entrance Glazing
      this.box(bGroup, `${spec.id}_front_glazing`, 0, 2.1, spec.d / 2 - 0.18, spec.w * 0.55, 1.5, 0.08, glassCyan);
      // Entrance Nameplate and Hazard Indicator
      this.box(bGroup, `${spec.id}_nameplate`, 0, 3.25, spec.d / 2 + 0.05, spec.w * 0.72, 0.36, 0.14, spec.accentMat);
      this.box(bGroup, `${spec.id}_hazard`, -spec.w / 2 + 0.6, 3.25, spec.d / 2 + 0.08, 0.35, 0.45, 0.15, hazardYellow);

      // Rooftop HVAC, Air Scrubbers, Antenna & Beacon
      this.box(bGroup, `${spec.id}_hvac`, spec.w / 2 - 1.1, 4.35, -spec.d / 2 + 1.1, 1.4, 0.6, 1.4, trimSteel);
      this.cylinder(bGroup, `${spec.id}_antenna`, -spec.w / 2 + 0.8, 4.8, -spec.d / 2 + 0.8, 0.06, 0.08, 1.5, metalDark);
      this.cylinder(bGroup, `${spec.id}_beacon`, spec.w / 2 - 0.6, 4.5, spec.d / 2 - 0.6, 0.1, 0.1, 0.5, spec.accentMat);

      // Interior Articulated Stations & Props per Facility
      this.buildFacilityInterior(bGroup, spec.interiorType, spec.w, spec.d, labWhite, trimSteel, glowCyan, glowViolet, hazardYellow);

      bGroup.userData.facility = def;
      this.facilityMeshes.set(spec.id, bGroup);

      // Register Interactive Story Station inside or at threshold
      const worldPos = new THREE.Vector3(
        this.centerX + spec.x,
        this.root.position.y + 1.0,
        this.centerZ + spec.z + spec.d / 2 + 0.8
      );

      this.interactionPoints.push({
        id: `interact_${spec.id}`,
        facilityId: spec.id,
        name: spec.name,
        prompt: `[E] Access ${spec.name} Terminal & Records`,
        position: worldPos,
        radius: 3.5,
        storyClue: def?.purpose ?? 'Classified research operations.',
      });
    }

    // 4. Heavy Exterior Infrastructures: Backup Generator & Solar Grid
    this.buildCampusUtilities(concrete, metalDark, trimSteel, roofDark, hazardYellow, glowCyan);

    // 5. Logistics: Loading Docks, Storage Drums, Pallets & Parking
    this.buildLogisticsAndVehicles(concrete, asphaltRoad, trimSteel, hazardYellow);

    // 6. Perimeter Floodlight Towers with Security Cameras
    for (const [x, z] of [[-22, -18], [22, -18], [-22, 18], [22, 18]] as number[][]) {
      this.cylinder(this.root, 'PerimeterTowerPole', x, 3.2, z, 0.15, 0.22, 6.4, trimSteel);
      this.box(this.root, 'TowerFloodlightHead', x, 6.4, z, 1.2, 0.45, 0.8, roofDark);
      this.box(this.root, 'TowerCameraArm', x + (x > 0 ? -0.4 : 0.4), 5.8, z, 0.6, 0.12, 0.12, metalDark);
      this.box(this.root, 'TowerCameraHousing', x + (x > 0 ? -0.8 : 0.8), 5.75, z, 0.35, 0.2, 0.2, glowCyan);
    }
  }

  private buildFacilityInterior(
    parent: THREE.Group,
    type: string,
    w: number,
    d: number,
    labMat: THREE.Material,
    metalMat: THREE.Material,
    cyanMat: THREE.Material,
    violetMat: THREE.Material,
    hazardMat: THREE.Material
  ) {
    if (type === 'biology') {
      // Examination tables with bio-specimen trays and specimen containers
      this.box(parent, 'BioExamTable', 0, 0.85, 0, 3.2, 0.8, 1.4, labMat);
      this.box(parent, 'SpecimenTray', 0, 1.3, 0, 1.8, 0.1, 0.8, metalMat);
      // Specimen Cylinders with glowing liquid
      for (const cx of [-2.4, 2.4]) {
        this.cylinder(parent, 'SpecimenCylinderGlass', cx, 1.5, -1.8, 0.4, 0.4, 1.8, cyanMat);
        this.cylinder(parent, 'SpecimenBase', cx, 0.5, -1.8, 0.5, 0.5, 0.4, metalMat);
      }
      // Microscope Desk & Monitor
      this.box(parent, 'MicroscopeDesk', -2.8, 0.8, 1.5, 2.0, 0.75, 1.0, labMat);
      this.box(parent, 'BiologyMonitor', -2.8, 1.4, 1.7, 0.8, 0.5, 0.1, cyanMat);
    } else if (type === 'medical') {
      // Clinical Treatment Beds
      for (const bx of [-2.2, 2.2]) {
        this.box(parent, 'ClinicBed', bx, 0.6, 0, 1.6, 0.6, 2.4, labMat);
        this.cylinder(parent, 'IVDripPole', bx - 0.9, 1.3, -1.0, 0.03, 0.03, 1.8, metalMat);
      }
      // Vaccine Centrifuge & Pharmaceutical Cabinets
      this.box(parent, 'PharmaCabinet', 0, 1.5, -2.5, 3.6, 2.2, 0.6, metalMat);
      this.cylinder(parent, 'VaccineCentrifuge', 0, 1.0, 1.6, 0.55, 0.6, 0.9, labMat);
    } else if (type === 'meteor') {
      // Raised observation chamber with central glowing meteorite core
      this.cylinder(parent, 'MeteorPedestal', 0, 0.7, 0, 1.5, 1.7, 0.9, metalMat);
      const meteorCore = this.box(parent, 'ExtraterrestrialFragment', 0, 1.55, 0, 0.9, 0.85, 0.9, violetMat);
      this.meteorMesh = meteorCore;
      // Laser Spectrometer & Radiation Scanner Arm
      this.cylinder(parent, 'SpectrometerColumn', 1.8, 1.4, 0, 0.15, 0.15, 1.6, metalMat);
      this.box(parent, 'SpectrometerEmitter', 1.0, 2.0, 0, 1.4, 0.25, 0.25, cyanMat);
      this.box(parent, 'RadiationScannerTerminal', -2.8, 0.85, 1.4, 1.8, 0.8, 0.9, labMat);
    } else if (type === 'testing') {
      // Twin Isolated Containment Cells with heavy viewing glass
      for (const cx of [-2.2, 2.2]) {
        this.box(parent, 'ContainmentCellFloor', cx, 0.35, -0.8, 3.0, 0.2, 3.0, metalMat);
        this.box(parent, 'ContainmentCellGlass', cx, 1.6, 0.6, 2.8, 2.2, 0.12, cyanMat);
        this.cylinder(parent, 'BiohazardSiren', cx, 3.2, 0.6, 0.14, 0.14, 0.3, hazardMat);
      }
      this.box(parent, 'ContainmentConsole', 0, 0.85, 1.8, 2.6, 0.8, 0.9, labMat);
    } else if (type === 'genetics') {
      // DNA Sequencing Columns & Holographic Display
      this.cylinder(parent, 'DNASequencingPodA', -2.4, 1.5, -1.5, 0.6, 0.6, 2.2, metalMat);
      this.cylinder(parent, 'DNASequencingPodB', 2.4, 1.5, -1.5, 0.6, 0.6, 2.2, metalMat);
      this.box(parent, 'HoloGeneDisplay', 0, 1.5, 0, 1.8, 1.2, 0.15, cyanMat);
      this.box(parent, 'CryoSampleFreezer', 0, 1.2, -2.6, 3.2, 1.8, 0.7, labMat);
    } else if (type === 'storage') {
      // Specimen Vault Door & Cold Nitrogen Canisters
      this.box(parent, 'HeavyVaultDoor', 0, 1.5, -2.4, 2.6, 2.4, 0.35, metalMat);
      for (const nx of [-2.6, 2.6]) {
        this.cylinder(parent, 'LiquidNitrogenCanister', nx, 1.0, 0, 0.45, 0.45, 1.6, labMat);
      }
      this.box(parent, 'RestrictedSpecimenRack', 0, 1.1, 1.4, 3.4, 1.6, 0.8, metalMat);
    } else if (type === 'command') {
      // Main 3-Screen Wall Monitor & Operator Consoles
      this.box(parent, 'MainWallDisplay', 0, 2.1, -2.6, 5.2, 1.8, 0.15, cyanMat);
      this.box(parent, 'CommandConsolesRow', 0, 0.8, -0.6, 4.4, 0.75, 1.2, metalMat);
      this.box(parent, 'TacticalBriefingHoloTable', 0, 0.8, 1.6, 2.2, 0.75, 1.6, cyanMat);
    } else if (type === 'quarters') {
      // Scientist Bunk Beds, Kitchenette Counter & Lounge Table
      this.box(parent, 'BunkBedUnit', -2.8, 1.1, -1.5, 1.5, 2.0, 2.4, labMat);
      this.box(parent, 'KitchenetteCounter', 2.8, 0.8, -1.5, 1.2, 0.8, 2.6, metalMat);
      this.cylinder(parent, 'CommonLoungeTable', 0, 0.6, 1.0, 0.8, 0.8, 0.7, labMat);
    } else if (type === 'quarantine') {
      // Decon Shower Arch & Isolation Gurneys
      this.box(parent, 'DeconArchFrame', 0, 1.6, -2.2, 2.4, 2.5, 0.4, hazardMat);
      for (const qx of [-2.2, 2.2]) {
        this.box(parent, 'QuarantineGurney', qx, 0.6, 0.6, 1.4, 0.6, 2.4, labMat);
      }
      this.box(parent, 'TriageStationDesk', 0, 0.8, 1.8, 2.4, 0.75, 0.9, metalMat);
    } else if (type === 'secret') {
      // Hydraulic Blast Hatch & Deep Research Terminal
      this.box(parent, 'HydraulicBlastPlate', 0, 0.4, 0, 4.4, 0.3, 3.4, metalMat);
      this.box(parent, 'HazardStripesHatch', 0, 0.45, 0, 3.8, 0.05, 0.35, hazardMat);
      this.box(parent, 'DeepBlackSkyMainframe', 0, 1.8, -1.8, 3.6, 2.2, 0.8, cyanMat);
      this.cylinder(parent, 'OriginSpecimenPod', 0, 1.5, 1.0, 0.5, 0.5, 1.8, violetMat);
    }
  }

  private buildCampusUtilities(
    concrete: THREE.Material,
    metalDark: THREE.Material,
    trimSteel: THREE.Material,
    roofDark: THREE.Material,
    hazardYellow: THREE.Material,
    glowCyan: THREE.Material
  ) {
    // 1. Diesel Backup Generator Station at North-East Corner
    const genGroup = new THREE.Group();
    genGroup.name = 'GeneratorFacilityStation';
    genGroup.position.set(16.5, 0, -18.5);
    this.root.add(genGroup);
    this.box(genGroup, 'GenPad', 0, 0.2, 0, 6.5, 0.4, 4.5, concrete);
    this.box(genGroup, 'GenHousing', 0, 1.4, 0, 5.4, 2.0, 3.6, metalDark);
    this.box(genGroup, 'GenRadiatorGrille', -2.75, 1.4, 0, 0.15, 1.4, 2.6, hazardYellow);
    // Twin Exhaust Stacks
    for (const ex of [-0.8, 0.8]) {
      this.cylinder(genGroup, 'GenExhaustPipe', ex, 3.1, -0.8, 0.18, 0.18, 1.6, trimSteel);
    }
    // Diesel Fuel Drums
    for (let i = 0; i < 3; i++) {
      this.cylinder(genGroup, `FuelDrum_${i}`, 2.2, 0.8, -1.2 + i * 1.1, 0.35, 0.35, 1.1, hazardYellow);
    }

    // 2. Solar Photovoltaic Grid at North-West Corner
    const solarGroup = new THREE.Group();
    solarGroup.name = 'CampusSolarArray';
    solarGroup.position.set(-16.5, 0, -18.5);
    this.root.add(solarGroup);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const sx = -2.2 + c * 2.2;
        const sz = -1.2 + r * 2.2;
        this.cylinder(solarGroup, `SolarMount_${r}_${c}`, sx, 0.7, sz, 0.08, 0.08, 1.4, trimSteel);
        const panel = this.box(solarGroup, `SolarPanel_${r}_${c}`, sx, 1.35, sz, 1.9, 0.08, 1.3, glowCyan);
        panel.rotation.x = -0.22;
      }
    }
  }

  private buildLogisticsAndVehicles(
    concrete: THREE.Material,
    asphaltRoad: THREE.Material,
    trimSteel: THREE.Material,
    hazardYellow: THREE.Material
  ) {
    // Loading Dock at East Compound Edge
    const dock = new THREE.Group();
    dock.name = 'LoadingSupplyZone';
    dock.position.set(20.5, 0, 8.0);
    this.root.add(dock);
    this.box(dock, 'DockPlatform', 0, 0.6, 0, 5.0, 1.0, 8.0, concrete);
    // Cargo Crates & Wooden Pallets
    this.box(dock, 'SupplyCrateStack1', 0.8, 1.6, -1.8, 1.6, 1.2, 1.6, trimSteel);
    this.box(dock, 'SupplyCrateStack2', 0.8, 1.4, 1.6, 1.4, 0.9, 1.8, trimSteel);

    // Designated Parking Area at West Compound Edge
    const parking = new THREE.Group();
    parking.name = 'VehicleParkingZone';
    parking.position.set(-20.5, 0, 8.0);
    this.root.add(parking);
    for (const pz of [-2.5, 2.5]) {
      this.box(parking, 'ParkingBayStripe', 0, 0.2, pz, 4.8, 0.04, 0.2, hazardYellow);
    }

    // Parked Military Utility Rover
    const rover = new THREE.Group();
    rover.name = 'ParkedResearchExpeditionVehicle';
    rover.position.set(-20.5, 0, 0);
    this.root.add(rover);
    this.box(rover, 'RoverChassis', 0, 0.8, 0, 4.2, 1.0, 2.2, trimSteel);
    this.box(rover, 'RoverCabin', -0.3, 1.7, 0, 2.2, 0.9, 2.0, concrete);
    for (const [wx, wz] of [[-1.4, -1.15], [1.4, -1.15], [-1.4, 1.15], [1.4, 1.15]]) {
      this.cylinder(rover, 'RoverWheel', wx, 0.5, wz, 0.5, 0.5, 0.35, asphaltRoad);
    }
  }

  private registerColliders(): void {
    const phys = UnifiedPhysicsManager.getInstance();
    if (!phys) return;

    const ox = this.centerX;
    const oy = this.root.position.y;
    const oz = this.centerZ;

    // 1. Perimeter Walls (Solid Box Colliders)
    phys.registerBoxCollider('rc_perim_north', 'wall', [ox, oy + 1.4, oz - 20.5], 48, 2.8, 0.65);
    phys.registerBoxCollider('rc_perim_west', 'wall', [ox - 23.8, oy + 1.4, oz], 0.65, 2.8, 41);
    phys.registerBoxCollider('rc_perim_east', 'wall', [ox + 23.8, oy + 1.4, oz], 0.65, 2.8, 41);
    phys.registerBoxCollider('rc_perim_south_w', 'wall', [ox - 16.0, oy + 1.4, oz + 20.5], 15.5, 2.8, 0.65);
    phys.registerBoxCollider('rc_perim_south_e', 'wall', [ox + 16.0, oy + 1.4, oz + 20.5], 15.5, 2.8, 0.65);

    // 2. Guard Checkpoint Booth
    phys.registerBoxCollider('rc_guard_booth', 'building', [ox - 5.6, oy + 1.6, oz + 19.5], 2.8, 2.8, 2.8);

    // 3. Generator Station & Solar Facility
    phys.registerBoxCollider('rc_generator_station', 'building', [ox + 16.5, oy + 1.4, oz - 18.5], 6.5, 2.4, 4.5);
    phys.registerBoxCollider('rc_solar_array', 'prop', [ox - 16.5, oy + 1.2, oz - 18.5], 6.5, 2.0, 4.5);

    // 4. Ten Research Facilities (Walls Colliders)
    const buildingSpecs = [
      { id: 'biology_lab', x: -14.5, z: -14.5, w: 9.5, d: 7.2 },
      { id: 'medical_research', x: 0, z: -14.5, w: 9.0, d: 7.2 },
      { id: 'meteor_lab', x: 14.5, z: -14.5, w: 9.5, d: 7.2 },
      { id: 'infection_testing', x: -14.5, z: -3.5, w: 9.5, d: 7.2 },
      { id: 'genetics_lab', x: 14.5, z: -3.5, w: 9.5, d: 7.2 },
      { id: 'sample_storage', x: -14.5, z: 7.5, w: 9.5, d: 6.8 },
      { id: 'research_command', x: 0, z: -3.5, w: 9.0, d: 7.2 },
      { id: 'scientist_quarters', x: 14.5, z: 7.5, w: 9.5, d: 6.8 },
      { id: 'quarantine_ward', x: 0, z: 7.5, w: 9.0, d: 6.8 },
      { id: 'secret_lab', x: 0, z: -20.2, w: 7.5, d: 5.5 },
    ];

    for (const b of buildingSpecs) {
      phys.registerBoxCollider(`rc_fac_${b.id}`, 'building', [ox + b.x, oy + 2.0, oz + b.z], b.w, 3.8, b.d);
    }
  }

  public update(delta: number): void {
    this.animTimer += delta;
    if (this.meteorMesh) {
      // Eerie slow rotation and pulsing emission
      this.meteorMesh.rotation.y += delta * 0.45;
      this.meteorMesh.rotation.x = Math.sin(this.animTimer * 1.2) * 0.15;
    }
  }

  public getInteractionPrompt(playerPos: THREE.Vector3): string | null {
    for (const pt of this.interactionPoints) {
      const d = Math.hypot(playerPos.x - pt.position.x, playerPos.z - pt.position.z);
      if (d <= pt.radius && Math.abs(playerPos.y - pt.position.y) < 3.2) {
        return pt.prompt;
      }
    }
    return null;
  }

  public handleInteraction(playerPos: THREE.Vector3, engine: any): boolean {
    for (const pt of this.interactionPoints) {
      const d = Math.hypot(playerPos.x - pt.position.x, playerPos.z - pt.position.z);
      if (d <= pt.radius && Math.abs(playerPos.y - pt.position.y) < 3.2) {
        soundEngine.playUIClick();
        engine.addXP(40);

        engine.callbacks.onInteractionPrompt(
          `[LOGGED] ${pt.name}: ${pt.storyClue}`
        );

        engine.callbacks.onPrologueSubtitle?.({
          speaker: 'Research Terminal',
          text: `[${pt.name}] ${pt.storyClue}`,
          duration: 4.5,
        });

        // Advance corresponding campaign quest objectives if present
        if (pt.facilityId === 'biology_lab') {
          engine.updateQuestProgress('study_wildlife', 1);
          engine.updateQuestProgress('biology_lab_research', 1);
        } else if (pt.facilityId === 'meteor_lab') {
          engine.updateQuestProgress('meteor_fragment_analysis', 1);
        } else if (pt.facilityId === 'infection_testing') {
          engine.updateQuestProgress('containment_testing', 1);
        } else if (pt.facilityId === 'medical_research') {
          engine.updateQuestProgress('medical_division', 1);
        } else if (pt.facilityId === 'research_command') {
          engine.updateQuestProgress('restore_command', 1);
        } else if (pt.facilityId === 'secret_lab') {
          engine.updateQuestProgress('secret_lab_origin', 1);
        }

        return true;
      }
    }
    return false;
  }

  public getFacilityAt(worldPosition: THREE.Vector3, radius = 6): ResearchFacilityDefinition | null {
    const local = this.root.worldToLocal(worldPosition.clone());
    let nearest: { facility: ResearchFacilityDefinition; distance: number } | null = null;
    for (const group of this.facilityMeshes.values()) {
      const facility = group.userData.facility as ResearchFacilityDefinition | undefined;
      if (!facility) continue;
      const distance = Math.hypot(local.x - group.position.x, local.z - group.position.z);
      if (distance <= radius && (!nearest || distance < nearest.distance)) {
        nearest = { facility, distance };
      }
    }
    return nearest?.facility ?? null;
  }

  public dispose(): void {
    this.scene.remove(this.root);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.facilityMeshes.clear();
  }
}
