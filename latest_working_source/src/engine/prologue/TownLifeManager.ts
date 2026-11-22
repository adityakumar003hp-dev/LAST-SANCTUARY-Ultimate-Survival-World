import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { TownCitizen } from '../../types/prologue';
import { soundEngine } from '../../utils/audio';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { ApartmentBuilding } from './ApartmentBuilding';

export class TownLifeManager {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public citizens: TownCitizen[] = [];
  public citizenMeshes: Map<string, THREE.Group> = new Map();
  public streetLights: THREE.PointLight[] = [];
  public apartmentBuilding: ApartmentBuilding;
  private walkTime: number = 0;

  // Shared Materials
  private roadMat: THREE.MeshStandardMaterial;
  private sidewalkMat: THREE.MeshStandardMaterial;
  private brickMat: THREE.MeshStandardMaterial;
  private whiteWallMat: THREE.MeshStandardMaterial;
  private glassMat: THREE.MeshStandardMaterial;
  private roofMat: THREE.MeshStandardMaterial;
  private woodTrimMat: THREE.MeshStandardMaterial;
  private carMat1: THREE.MeshStandardMaterial;
  private carMat2: THREE.MeshStandardMaterial;
  private tireMat: THREE.MeshStandardMaterial;
  public movingCars: Array<{
    mesh: THREE.Group;
    axis: 'x' | 'z';
    speed: number;
    min: number;
    max: number;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'town_environment';
    this.scene.add(this.group);

    // Initialize clean materials
    this.roadMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.88 });
    this.sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9fa4a6, roughness: 0.92 });
    this.brickMat = new THREE.MeshStandardMaterial({ color: 0x8a4536, roughness: 0.9 });
    this.whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.85 });
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x5b92b6, roughness: 0.15, metalness: 0.8 });
    this.roofMat = new THREE.MeshStandardMaterial({ color: 0x3d3532, roughness: 0.8 });
    this.woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.85 });
    this.carMat1 = new THREE.MeshStandardMaterial({ color: 0x2b578c, roughness: 0.35, metalness: 0.7 });
    this.carMat2 = new THREE.MeshStandardMaterial({ color: 0x992b2b, roughness: 0.35, metalness: 0.7 });
    this.tireMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.95 });

    // Instantiate five-floor apartment complex with cutaways & functional interiors
    this.apartmentBuilding = new ApartmentBuilding(this.group);

    this.buildTownInfrastructure();
    this.buildTownBuildings();
    this.spawnCivilianVehicles();
    this.spawnTownCitizens();
  }

  private buildTownInfrastructure() {
    // Main Avenue (North-South: Z from -50 to 40, Width 7m)
    const mainRoadGeo = new THREE.PlaneGeometry(7.2, 90);
    const mainRoad = new THREE.Mesh(mainRoadGeo, this.roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.05, -5);
    mainRoad.receiveShadow = true;
    this.group.add(mainRoad);

    // Cross Street (East-West: X from -50 to 50, Width 6.5m)
    const crossRoadGeo = new THREE.PlaneGeometry(100, 6.5);
    const crossRoad = new THREE.Mesh(crossRoadGeo, this.roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.06, 0);
    crossRoad.receiveShadow = true;
    this.group.add(crossRoad);

    // Road Yellow Center Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffd233 });
    for (let z = -46; z <= 36; z += 5) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.07, z);
      this.group.add(stripe);
    }

    // Sidewalks along Main Avenue
    const sideGeo = new THREE.BoxGeometry(2.4, 0.18, 90);
    const eastSidewalk = new THREE.Mesh(sideGeo, this.sidewalkMat);
    eastSidewalk.position.set(4.8, 0.09, -5);
    const westSidewalk = new THREE.Mesh(sideGeo, this.sidewalkMat);
    westSidewalk.position.set(-4.8, 0.09, -5);
    this.group.add(eastSidewalk, westSidewalk);

    // Street Lamps along Sidewalks
    const lampPositions: [number, number][] = [
      [5.6, -30], [-5.6, -30],
      [5.6, -12], [-5.6, -12],
      [5.6, 12],  [-5.6, 12],
      [5.6, 30],  [-5.6, 30],
    ];

    lampPositions.forEach(([lx, lz]) => {
      const lampGroup = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.8, roughness: 0.4 })
      );
      post.position.y = 2.1;
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x2f3431, metalness: 0.7 })
      );
      head.position.y = 4.3;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff0bb })
      );
      bulb.position.y = 4.15;

      lampGroup.add(post, head, bulb);
      lampGroup.position.set(lx, getTerrainHeight(lx, lz), lz);
      this.group.add(lampGroup);
    });

    // 1 single central avenue night light covering the street instead of 8 expensive lights
    const avenueLight = new THREE.PointLight(0xffea9f, 0, 45, 1.4);
    avenueLight.position.set(0, 7.5, 0);
    this.streetLights.push(avenueLight);
    this.group.add(avenueLight);

    // Central Town Square Park (X: 8 to 32, Z: 6 to 30)
    const parkGrass = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.15, 24),
      new THREE.MeshStandardMaterial({ color: 0x3d7036, roughness: 0.9 })
    );
    parkGrass.position.set(20, 0.08, 18);
    this.group.add(parkGrass);

    // Park Fountain
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.2, 0.6, 12),
      this.sidewalkMat
    );
    fountainBase.position.set(20, 0.4, 18);
    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x2288bb, roughness: 0.1, metalness: 0.5 })
    );
    fountainWater.position.set(20, 0.65, 18);
    const fountainCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.8, 1.8, 8),
      this.sidewalkMat
    );
    fountainCenter.position.set(20, 1.1, 18);
    this.group.add(fountainBase, fountainWater, fountainCenter);

    // Park Benches
    const benchPositions = [
      { x: 15, z: 18, r: Math.PI / 2 },
      { x: 25, z: 18, r: -Math.PI / 2 },
      { x: 20, z: 13, r: 0 },
      { x: 20, z: 23, r: Math.PI },
    ];
    benchPositions.forEach((bp) => {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), this.woodTrimMat);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), this.woodTrimMat);
      back.position.set(0, 0.7, -0.22);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), this.tireMat);
      leg1.position.set(0.65, 0.22, 0);
      const leg2 = leg1.clone();
      leg2.position.x = -0.65;
      bench.add(seat, back, leg1, leg2);
      bench.position.set(bp.x, 0.15, bp.z);
      bench.rotation.y = bp.r;
      this.group.add(bench);
    });
  }

  private buildTownBuildings() {
    // 1. Grocery Market ("OAKRIDGE FRESH MARKET")
    const grocery = this.createCommercialBuilding('OAKRIDGE FRESH MARKET', 0x9c3d2e, 11, 5, 8);
    grocery.position.set(-14, 0, 10);
    this.group.add(grocery);

    // 2. Town Corner Cafe ("CORNER ROAST CAFE")
    const cafe = this.createCommercialBuilding('CORNER CAFE', 0xc98c4b, 9, 4.5, 8);
    cafe.position.set(-14, 0, 22);
    this.group.add(cafe);

    // 3. Community Health Clinic / Hospital
    const hospital = this.createCivicBuilding('VALLEY COMMUNITY CLINIC', 0xdedede, 14, 7.5, 12, true);
    hospital.position.set(-18, 0, -18);
    this.group.add(hospital);

    // 4. Police Station
    const police = this.createCivicBuilding('POLICE STATION', 0x3d4e68, 12, 5.5, 9);
    police.position.set(16, 0, -16);
    this.group.add(police);

    // 5. Fire Station 1
    const fireStation = this.createFireStation();
    fireStation.position.set(16, 0, -32);
    this.group.add(fireStation);

    // 6. Elementary School
    const school = this.createCivicBuilding('PINE ELEMENTARY', 0x854330, 18, 6.5, 12);
    school.position.set(-20, 0, -36);
    this.group.add(school);

    // 7. Residential District
    const cottage1 = this.createHouse(0x8f7259);
    cottage1.position.set(16, 0, 38);
    const cottage2 = this.createHouse(0x566d7e);
    cottage2.position.set(28, 0, 38);
    const cottage3 = this.createHouse(0x8c8266);
    cottage3.position.set(-54, 0, 38); // outside the apartment compound west wall

    // Add residential cottages (apartment is handled by apartmentBuilding)
    this.group.add(cottage1, cottage2, cottage3);

    // 8. Petrol / Gas Station ("APEX FUEL")
    const gasStation = this.createGasStation();
    gasStation.position.set(38, 0, 0);
    this.group.add(gasStation);

    // 9. Town Hall / Municipal Office
    const townHall = this.createCivicBuilding('TOWN HALL', 0xe0d6c8, 14, 7, 10);
    townHall.position.set(38, 0, 18);
    this.group.add(townHall);

    // 10. Children's Playground
    const playground = this.createPlayground();
    playground.position.set(38, 0, 34);
    this.group.add(playground);
  }

  private createCommercialBuilding(name: string, facadeColor: number, w: number, h: number, d: number): THREE.Group {
    const b = new THREE.Group();
    b.name = name;

    const mainMat = new THREE.MeshStandardMaterial({ color: facadeColor, roughness: 0.85 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;

    // Roof parapet
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), this.roofMat);
    roof.position.y = h + 0.2;

    // Shopfront Glass Windows & Door
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.65, h * 0.45), this.glassMat);
    windowMesh.position.set(0, h * 0.35, d / 2 + 0.05);

    // Storefront Awning
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.75, 0.15, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1f4a75, roughness: 0.6 })
    );
    awning.position.set(0, h * 0.65, d / 2 + 0.9);
    awning.rotation.x = 0.2;

    // Signboard
    const signMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.7, 0.1), signMat);
    sign.position.set(0, h * 0.85, d / 2 + 0.1);

    b.add(wall, roof, windowMesh, awning, sign);
    return b;
  }

  private createCivicBuilding(name: string, wallColor: number, w: number, h: number, d: number, hasRedCross = false): THREE.Group {
    const b = new THREE.Group();
    b.name = name;

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mainBody.position.y = h / 2;
    mainBody.castShadow = true;

    // Second tier / pediment
    const pediment = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.4, d * 0.4), this.roofMat);
    pediment.position.set(0, h + 0.7, 0);

    // Columns at front entrance
    const colGeo = new THREE.CylinderGeometry(0.25, 0.3, h * 0.6, 8);
    const colMat = this.whiteWallMat;
    const col1 = new THREE.Mesh(colGeo, colMat);
    col1.position.set(-w * 0.25, h * 0.3, d / 2 + 0.8);
    const col2 = new THREE.Mesh(colGeo, colMat);
    col2.position.set(w * 0.25, h * 0.3, d / 2 + 0.8);

    // Red Cross emblem if clinic
    if (hasRedCross) {
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xdd2222 });
      const barH = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), crossMat);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.1), crossMat);
      barH.position.set(0, h * 0.8, d / 2 + 0.1);
      barV.position.set(0, h * 0.8, d / 2 + 0.1);
      b.add(barH, barV);
    }

    b.add(mainBody, pediment, col1, col2);
    return b;
  }

  private createFireStation(): THREE.Group {
    const b = new THREE.Group();
    b.name = 'FIRE STATION';

    const redMat = new THREE.MeshStandardMaterial({ color: 0x992424, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), redMat);
    body.position.y = 3;

    // Roll-up garage bay doors
    const rollMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 });
    const bay1 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.8), rollMat);
    bay1.position.set(-2.5, 1.9, 5.05);
    const bay2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.8), rollMat);
    bay2.position.set(2.5, 1.9, 5.05);

    b.add(body, bay1, bay2);
    return b;
  }

  private createHouse(color: number): THREE.Group {
    const h = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 7), wallMat);
    wall.position.y = 1.75;
    wall.castShadow = true;

    // Pitched roof
    const roofGeo = new THREE.ConeGeometry(6, 2.2, 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.y = 4.6;
    roof.rotation.y = Math.PI / 4;

    // Front door & porch
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.1), this.woodTrimMat);
    door.position.set(0, 1.0, 3.55);

    // Front porch step
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.2), this.sidewalkMat);
    step.position.set(0, 0.1, 4.0);

    // Windows
    const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), this.glassMat);
    win1.position.set(-2.2, 1.8, 3.55);
    const win2 = win1.clone();
    win2.position.x = 2.2;

    h.add(wall, roof, door, step, win1, win2);
    return h;
  }

  private createApartmentComplex(): THREE.Group {
    const complex = new THREE.Group();
    complex.name = 'player_apartment_complex';

    // 1. Exterior 5-Story Apartment Building (W: 16m, H: 12m, D: 14m)
    const brickFacadeMat = new THREE.MeshStandardMaterial({ color: 0x7a3a2e, roughness: 0.88 });
    const concreteTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.85 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x5c4228, roughness: 0.75 });
    const wallInteriorMat = new THREE.MeshStandardMaterial({ color: 0xedebe6, roughness: 0.9 });

    // Main multi-story shell
    const shell = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 14), brickFacadeMat);
    shell.position.y = 6.0;
    shell.castShadow = true;
    complex.add(shell);

    // Floor cornices & upper windows
    for (let f = 1; f <= 3; f++) {
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.35, 14.4), concreteTrimMat);
      cornice.position.y = f * 3.0;
      complex.add(cornice);

      for (let wx = -5; wx <= 5; wx += 5) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), this.glassMat);
        win.position.set(wx, f * 3.0 + 1.2, -7.05);
        complex.add(win);
      }
    }

    // Roof parapet
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.6, 14.5), this.roofMat);
    roof.position.y = 12.3;
    complex.add(roof);

    // Entrance Canopy & Foyer steps leading to street (facing street at Z: -7)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 2.8), concreteTrimMat);
    canopy.position.set(0, 3.2, -7.8);
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.25, 2.0), this.sidewalkMat);
    step1.position.set(0, 0.12, -7.5);
    complex.add(canopy, step1);

    // --- GROUND FLOOR EXPLORABLE APARTMENT INTERIOR ---
    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), woodFloorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.05, 0);
    floor.receiveShadow = true;
    complex.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), wallInteriorMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.9, 0);
    complex.add(ceiling);

    // Apartment Interior Warm Ceiling Lamp
    const lamp = new THREE.PointLight(0xffecd0, 2.0, 16, 1.4);
    lamp.position.set(0, 2.6, 0);
    complex.add(lamp);

    // --- 1. BEDROOM AREA (Left, X: -4.0, Z: 3.0) ---
    // Double Bed Frame
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.6), this.woodTrimMat);
    bedFrame.position.set(-4.0, 0.25, 3.0);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    mattress.position.set(-4.0, 0.55, 3.0);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.32, 1.5), new THREE.MeshStandardMaterial({ color: 0x1f3c5e, roughness: 0.85 }));
    blanket.position.set(-4.0, 0.56, 2.55);
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 }));
    pillow1.position.set(-4.5, 0.72, 3.8);
    const pillow2 = pillow1.clone();
    pillow2.position.x = -3.5;
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.woodTrimMat);
    nightstand.position.set(-5.5, 0.35, 3.8);
    const nightLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0xffeedd }));
    nightLamp.position.set(-5.5, 0.9, 3.8);

    complex.add(bedFrame, mattress, blanket, pillow1, pillow2, nightstand, nightLamp);

    // --- 2. KITCHENETTE (Right, X: 3.5, Z: 3.0) ---
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 1.0), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    counter.position.set(4.0, 0.45, 4.2);
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 1.1), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.5, roughness: 0.3 }));
    fridge.position.set(1.8, 1.05, 4.2);
    const coffeeMaker = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xb53525, roughness: 0.4 }));
    coffeeMaker.position.set(4.5, 1.1, 4.2);

    complex.add(counter, fridge, coffeeMaker);

    // --- 3. LIVING AREA (Center, X: 0, Z: 0) ---
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.1), new THREE.MeshStandardMaterial({ color: 0x3d4f41, roughness: 0.85 }));
    sofa.position.set(0, 0.4, 0.5);
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.9), this.woodTrimMat);
    coffeeTable.position.set(0, 0.22, -1.2);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.32), new THREE.MeshBasicMaterial({ color: 0x00e1d9 }));
    phone.position.set(0.2, 0.46, -1.2);
    const tv = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    tv.position.set(0, 1.6, 2.5);

    complex.add(sofa, coffeeTable, phone, tv);

    // --- 4. PANORAMIC WINDOW & FRONT ENTRANCE DOOR ---
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), this.glassMat);
    win.position.set(-3.5, 1.5, -6.95);

    const aptDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), this.woodTrimMat);
    aptDoor.position.set(0, 1.1, -6.95);
    const doorknob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.9 }));
    doorknob.position.set(0.5, 1.1, -6.85);

    complex.add(win, aptDoor, doorknob);

    return complex;
  }

  private createGasStation(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'APEX GAS';

    // Store building
    const shop = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 6), this.whiteWallMat);
    shop.position.set(0, 2, -5);

    // Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.6 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 7), canopyMat);
    canopy.position.set(0, 4.2, 2);

    // Canopy Pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.2, 6), this.whiteWallMat);
    p1.position.set(-4, 2.1, 2);
    const p2 = p1.clone();
    p2.position.x = 4;

    // Fuel Pumps
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
    const pump1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.6), pumpMat);
    pump1.position.set(-1.8, 0.8, 2);
    const pump2 = pump1.clone();
    pump2.position.x = 1.8;

    g.add(shop, canopy, p1, p2, pump1, pump2);
    return g;
  }

  private createPlayground(): THREE.Group {
    const p = new THREE.Group();
    p.name = 'PLAYGROUND';

    // Sand pit
    const sand = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xd4b572, roughness: 0.95 })
    );
    sand.position.y = 0.05;

    // Swing set
    const swingFrameMat = new THREE.MeshStandardMaterial({ color: 0x3388cc, metalness: 0.6 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 6), swingFrameMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 2.6, 0);

    const legA1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), swingFrameMat);
    legA1.position.set(-1.8, 1.3, 0.5);
    legA1.rotation.x = 0.2;
    const legA2 = legA1.clone();
    legA2.position.z = -0.5;
    legA2.rotation.x = -0.2;

    const legB1 = legA1.clone();
    legB1.position.x = 1.8;
    const legB2 = legA2.clone();
    legB2.position.x = 1.8;

    p.add(sand, beam, legA1, legA2, legB1, legB2);
    return p;
  }

  private spawnCivilianVehicles() {
    const carSpots = [
      { x: -7.5, z: 12, rot: Math.PI / 2, color: this.carMat1 },
      { x: -7.5, z: 20, rot: Math.PI / 2, color: this.carMat2 },
      { x: 7.5, z: -14, rot: -Math.PI / 2, color: this.carMat1 },
      { x: 7.5, z: -20, rot: -Math.PI / 2, color: this.carMat2 },
      { x: 38, z: 4, rot: 0, color: this.carMat1 },
    ];

    carSpots.forEach((s) => {
      const car = this.createCarMesh(s.color);
      car.position.set(s.x, 0, s.z);
      car.rotation.y = s.rot;
      this.group.add(car);
    });

    // 2 Dynamic Moving Civilian Cars. Both paths stay centred on the town's paved roads;
    // the protected apartment district is deliberately isolated from the railway corridor.
    const movingCar1 = this.createCarMesh(this.carMat1);
    movingCar1.position.set(-1.65, 0, -42);
    this.group.add(movingCar1);
    this.movingCars.push({
      mesh: movingCar1,
      axis: 'z',
      speed: 9.5,
      min: -46,
      max: 36,
    });

    const movingCar2 = this.createCarMesh(this.carMat2);
    movingCar2.rotation.y = Math.PI / 2;
    movingCar2.position.set(-48, 0, 1.65);
    this.group.add(movingCar2);
    this.movingCars.push({
      mesh: movingCar2,
      axis: 'x',
      speed: 8.0,
      min: -48,
      max: 48,
    });
  }

  private createCarMesh(bodyMat: THREE.Material): THREE.Group {
    const c = new THREE.Group();
    // Body chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;

    // Cabin roof
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.0), this.glassMat);
    cabin.position.set(0, 1.15, -0.2);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 8);
    wGeo.rotateZ(Math.PI / 2);
    const wheels = [
      [-0.9, 0.32, 1.1],
      [0.9, 0.32, 1.1],
      [-0.9, 0.32, -1.1],
      [0.9, 0.32, -1.1],
    ];
    wheels.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, this.tireMat);
      w.position.set(wx, wy, wz);
      c.add(w);
    });

    c.add(body, cabin);
    return c;
  }

  private spawnTownCitizens() {
    const citizenDefs: Array<{
      id: string;
      name: string;
      role: string;
      bType: string;
      pos: [number, number, number];
      rot: number;
      shirt: number;
      pants: number;
      lines: string[];
    }> = [
      {
        id: 'mr_henderson',
        name: 'Mr. Henderson',
        role: 'Market Shopkeeper',
        bType: 'market',
        pos: [-9, 0, 10],
        rot: Math.PI / 2,
        shirt: 0x3d6e52,
        pants: 0x3a3026,
        lines: [
          'Good morning! Fresh produce arrived from the valley farms this morning.',
          'Heard the radio weather report earlier—supposed to be clear skies all weekend.',
          'Take care out there, don’t forget to stay hydrated!',
        ],
      },
      {
        id: 'barista_sam',
        name: 'Sam',
        role: 'Corner Cafe Barista',
        bType: 'cafe',
        pos: [-10, 0, 22],
        rot: Math.PI / 2,
        shirt: 0xc49b45,
        pants: 0x222222,
        lines: [
          'Hey! Your usual brew is almost ready.',
          'Marcus and Chloe were here earlier chatting about Chloe’s new radio antenna.',
          'Nothing beats a quiet Saturday morning in Oakridge.',
        ],
      },
      {
        id: 'officer_davis',
        name: 'Officer Davis',
        role: 'Town Police Chief',
        bType: 'police',
        pos: [11, 0, -16],
        rot: -Math.PI / 2,
        shirt: 0x24395b,
        pants: 0x1b2029,
        lines: [
          'Quiet day on patrol, just the way we like it.',
          'The state highway dispatch reported some radar static up north, probably atmospheric.',
          'Enjoy your morning, stay safe out there.',
        ],
      },
      {
        id: 'nurse_sarah',
        name: 'Nurse Sarah',
        role: 'Clinic Head Nurse',
        bType: 'clinic',
        pos: [-13, 0, -18],
        rot: Math.PI / 2,
        shirt: 0x5a9ea8,
        pants: 0xffffff,
        lines: [
          'Good morning! Dr. Maya mentioned she was going to meet up with you all later.',
          'We just restocked the emergency supply closet for the quarterly drill.',
          'Make sure you get plenty of rest this weekend!',
        ],
      },
      {
        id: 'firefighter_ray',
        name: 'Ray',
        role: 'Fire Captain',
        bType: 'fire',
        pos: [12, 0, -32],
        rot: -Math.PI / 2,
        shirt: 0xa83434,
        pants: 0x282828,
        lines: [
          'Inspecting the engine trucks today. Routine maintenance.',
          'Dry season on the ridge means we keep the fire watch tower staffed 24/7.',
          'Have a peaceful weekend!',
        ],
      },
      {
        id: 'jogger_leo',
        name: 'Leo',
        role: 'Park Jogger',
        bType: 'park',
        pos: [14, 0, 8],
        rot: 0,
        shirt: 0x3388dd,
        pants: 0x222222,
        lines: [
          'Phew! Perfect running temperature today.',
          'The park fountain looks fantastic after the city cleaned it yesterday.',
          'Catch you on the next lap!',
        ],
      },
      {
        id: 'mrs_gable',
        name: 'Mrs. Gable',
        role: 'Town Resident',
        bType: 'park',
        pos: [15, 0, 18],
        rot: Math.PI / 2,
        shirt: 0x9c7aa8,
        pants: 0x483d4e,
        lines: [
          'Such lovely birdsong this morning. The valley is so peaceful.',
          'My grandson told me there’s a meteor shower predicted for next week.',
          'Give my regards to your friends, dear.',
        ],
      },
      {
        id: 'mechanic_dan',
        name: 'Dan',
        role: 'Gas Station Mechanic',
        bType: 'gas',
        pos: [35, 0, 2],
        rot: -Math.PI / 2,
        shirt: 0x6e5b42,
        pants: 0x3d352b,
        lines: [
          'Need fuel or tire pressure checked? Everything’s topped up.',
          'Chloe stopped by yesterday asking if I had spare transceiver relays.',
          'She’s a brilliant technician, that one.',
        ],
      },
      {
        id: 'mayor_wilson',
        name: 'Mayor Wilson',
        role: 'Town Mayor',
        bType: 'hall',
        pos: [34, 0, 18],
        rot: -Math.PI / 2,
        shirt: 0x2d3a4e,
        pants: 0x1f242e,
        lines: [
          'Welcome to the town square! Oakridge has been voted the safest community in the county.',
          'Community projects are running ahead of schedule this year.',
          'Have a wonderful day in our beautiful town!',
        ],
      },
    ];

    citizenDefs.forEach((d) => {
      const g = this.createCitizenMesh(d.shirt, d.pants);
      g.name = `citizen_${d.id}`;
      g.position.set(d.pos[0], getTerrainHeight(d.pos[0], d.pos[2]), d.pos[2]);
      g.rotation.y = d.rot;
      this.group.add(g);

      this.citizens.push({
        id: d.id,
        name: d.name,
        role: d.role,
        buildingType: d.bType,
        position: [d.pos[0], g.position.y, d.pos[2]],
        rotationY: d.rot,
        shirtColor: d.shirt,
        pantColor: d.pants,
        schedule: 'stand',
        dialogueLines: d.lines,
        infectionStage: 'normal',
      });
      this.citizenMeshes.set(d.id, g);
    });
  }

  private createCitizenMesh(shirtColor: number, pantColor: number): THREE.Group {
    const g = new THREE.Group();
    const clothMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.88 });
    const pantMat = new THREE.MeshStandardMaterial({ color: pantColor, roughness: 0.92 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xce9e78, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.9 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 4, 8), clothMat);
    torso.position.y = 1.05;
    torso.castShadow = true;

    // Head & Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
    head.position.y = 1.5;
    head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), hairMat);
    hair.position.set(0, 1.55, -0.02);
    hair.scale.set(1.02, 0.75, 1.05);

    // Legs
    const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.5, 4, 6), pantMat);
    lLeg.name = 'lLeg';
    lLeg.position.set(-0.12, 0.42, 0);
    const rLeg = lLeg.clone();
    rLeg.name = 'rLeg';
    rLeg.position.x = 0.12;

    // Arms
    const lArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 6), clothMat);
    lArm.name = 'lArm';
    lArm.position.set(-0.32, 1.0, 0);
    const rArm = lArm.clone();
    rArm.name = 'rArm';
    rArm.position.x = 0.32;

    g.add(torso, head, hair, lLeg, rLeg, lArm, rArm);
    return g;
  }

  public update(
    delta: number,
    isNight: boolean,
    isPanic: boolean,
    playerPos?: THREE.Vector3,
    cameraPos?: THREE.Vector3
  ) {
    this.walkTime += delta;

    // 1. Move Civilian Traffic Cars & Update Physics Colliders
    const physMgr = UnifiedPhysicsManager.getInstance();
    this.movingCars.forEach((c, idx) => {
      if (c.axis === 'z') {
        c.mesh.position.x = -1.65; // Main Avenue lane centre
        c.mesh.position.z += c.speed * delta;
        if (c.mesh.position.z > c.max) c.mesh.position.z = c.min;
      } else {
        c.mesh.position.z = 1.65; // Cross Street lane centre
        c.mesh.position.x += c.speed * delta;
        if (c.mesh.position.x > c.max) c.mesh.position.x = c.min;
      }
      if (physMgr) {
        physMgr.updateColliderPosition(`car_traffic_${idx}`, [c.mesh.position.x, c.mesh.position.y, c.mesh.position.z]);
      }
    });

    // 2. Update Streetlights: Turn on at night
    const targetLightIntensity = isNight ? 1.6 : 0;
    this.streetLights.forEach((light) => {
      light.intensity = THREE.MathUtils.damp(light.intensity, targetLightIntensity, 4, delta);
    });

    // 3. Update 5-floor Apartment Complex (appliances, ceiling fan, pool water, cutaway culling)
    if (this.apartmentBuilding) {
      const pPos = playerPos || this.apartmentBuilding.origin;
      const cPos = cameraPos || this.apartmentBuilding.origin;
      this.apartmentBuilding.update(delta, pPos, cPos);
    }

    // 4. Dynamic town panic reactions
    if (isPanic) {
      this.citizens.forEach((c) => {
        const mesh = this.citizenMeshes.get(c.id);
        if (mesh) {
          // Cower or run towards nearest building
          const lArm = mesh.getObjectByName('lArm');
          const rArm = mesh.getObjectByName('rArm');
          if (lArm && rArm) {
            lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, -2.2, 8, delta);
            rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, -2.2, 8, delta);
          }
        }
      });
    }
  }

  /** Check for interactive items inside or around the player's 5-floor apartment */
  public getApartmentInteraction(pos: THREE.Vector3): {
    id: 'bed' | 'phone' | 'fridge' | 'window' | 'door' | 'tv' | 'fan' | 'ac' | 'armory' | 'pool' | 'backyardPool' | 'compoundGate' | 'compoundDoorLeft' | 'compoundDoorRight';
    label: string;
    prompt: string;
  } | null {
    if (!this.apartmentBuilding) return null;
    return this.apartmentBuilding.getInteraction(pos);
  }

  public getNearestCitizen(pos: THREE.Vector3, maxDist = 3.5): TownCitizen | null {
    let nearest: TownCitizen | null = null;
    let minDist = maxDist;
    for (const c of this.citizens) {
      const d = Math.hypot(c.position[0] - pos.x, c.position[2] - pos.z);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    return nearest;
  }

  public registerColliders(physMgr: UnifiedPhysicsManager) {
    // 1. Major town buildings with accurate collision boxes
    physMgr.registerBoxCollider('bld_grocery', 'building', [-14, 2.5, 10], 11, 5, 8);
    physMgr.registerBoxCollider('bld_cafe', 'building', [-14, 2.25, 22], 9, 4.5, 8);
    physMgr.registerBoxCollider('bld_clinic', 'building', [-18, 3.75, -18], 14, 7.5, 12);
    physMgr.registerBoxCollider('bld_police', 'building', [16, 2.75, -16], 12, 5.5, 9);
    physMgr.registerBoxCollider('bld_fire', 'building', [16, 3.0, -32], 12, 6, 10);
    physMgr.registerBoxCollider('bld_school', 'building', [-20, 3.25, -36], 18, 6.5, 12);
    physMgr.registerBoxCollider('bld_cottage1', 'building', [16, 1.75, 38], 8, 3.5, 7);
    physMgr.registerBoxCollider('bld_cottage2', 'building', [28, 1.75, 38], 8, 3.5, 7);
    physMgr.registerBoxCollider('bld_cottage3', 'building', [-10, 1.75, 38], 8, 3.5, 7);
    physMgr.registerBoxCollider('bld_gas_store', 'building', [38, 2.0, -5], 9, 4, 6);
    physMgr.registerBoxCollider('bld_townhall', 'building', [38, 3.5, 18], 14, 7, 10);
    physMgr.registerCylinderCollider('bld_fountain', 'building', [20, 0.5, 18], 3.0, 2.0);

    // 2. Explorable 5-Story Apartment Complex & All 5 Floors Colliders
    if (this.apartmentBuilding) {
      this.apartmentBuilding.registerColliders(physMgr);
    }

    // 3. Living Town Citizens
    this.citizens.forEach((c) => {
      physMgr.registerCylinderCollider(`citizen_${c.id}`, 'npc', c.position, 0.45, 1.8);
    });

    // 4. Moving traffic cars
    this.movingCars.forEach((car, idx) => {
      physMgr.registerBoxCollider(`car_traffic_${idx}`, 'vehicle', [car.mesh.position.x, car.mesh.position.y, car.mesh.position.z], 2.0, 1.6, 4.0);
    });
  }

  public dispose() {
    if (this.apartmentBuilding) {
      this.apartmentBuilding.dispose();
    }
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
    this.streetLights = [];
    this.citizens = [];
    this.citizenMeshes.clear();
  }
}
