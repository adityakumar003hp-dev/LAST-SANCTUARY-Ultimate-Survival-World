import {
  AURELION_ELEVATOR_CONFIGS,
  AURELION_LEVELS,
  AurelionLevelId,
} from './AurelionConfig';

export type ElevatorId = 'main' | 'service' | 'private';
export type PowerPriorityMode = 'balanced' | 'critical' | 'luxury';
export type HvacMode = 'eco' | 'comfort' | 'off';
export type HydroCropType = 'vegetables' | 'herbs' | 'berries';

export interface ElevatorState {
  id: ElevatorId;
  name: string;
  stops: AurelionLevelId[];
  currentFloor: AurelionLevelId;
  targetFloor: AurelionLevelId;
  currentY: number;
  targetY: number;
  doorOpenFactor: number; // 0 = closed, 1 = open
  moving: boolean;
  lockedByLoadShedding: boolean;
}

export interface HydroponicBedState {
  id: number;
  label: string;
  cropType: HydroCropType;
  stage: 0 | 1 | 2 | 3; // 0 = Empty, 1 = Seeded, 2 = Growing, 3 = Ripe
  growthProgress: number; // 0..1
}

export interface AurelionRoomLightsState {
  b2: boolean;
  b1: boolean;
  f1: boolean;
  f2: boolean;
  f3: boolean;
  f4: boolean;
  f5: boolean;
  f6: boolean;
  f7: boolean;
}

export interface AurelionSaveState {
  version: 1;
  generatorRunning: boolean;
  fuelLiters: number;
  batteryKwh: number;
  rawWaterLiters: number;
  treatedWaterLiters: number;
  purifierActive: boolean;
  powerPriorityMode: PowerPriorityMode;
  hvacMode: HvacMode;
  cinemaOn: boolean;
  aquariumLightsOn: boolean;
  maintenanceIntegrity: number;
  roomLights: AurelionRoomLightsState;
  elevators: Record<ElevatorId, { currentFloor: AurelionLevelId; targetFloor: AurelionLevelId }>;
  hydroBeds: HydroponicBedState[];
  totalHarvestedCrops: number;
}

export interface AurelionDashboardSnapshot {
  power: {
    solarKw: number;
    generatorKw: number;
    totalGenerationKw: number;
    totalDemandKw: number;
    netKw: number;
    batteryKwh: number;
    batteryCapacityKwh: number;
    batteryPercent: number;
    fuelLiters: number;
    fuelCapacityLiters: number;
    generatorRunning: boolean;
    priorityMode: PowerPriorityMode;
    tier1CriticalPowered: boolean;
    tier2StandardPowered: boolean;
    tier3LuxuryPowered: boolean;
  };
  water: {
    rawLiters: number;
    treatedLiters: number;
    maxCapacityLiters: number;
    purifierActive: boolean;
    purificationLitersPerHour: number;
    aquaponicsDrawLitersPerHour: number;
  };
  agriculture: {
    beds: HydroponicBedState[];
    emptyCount: number;
    growingCount: number;
    ripeCount: number;
    totalHarvestedCrops: number;
    growLightsPowered: boolean;
  };
  elevators: Record<ElevatorId, ElevatorState>;
  climate: {
    hvacMode: HvacMode;
    indoorTempC: number;
    airQualityPercent: number;
    cinemaOn: boolean;
    aquariumLightsOn: boolean;
    maintenanceIntegrity: number;
    roomLights: AurelionRoomLightsState;
  };
  security: {
    turretsOnline: number;
    turretKills: number;
    gatesOpenCount: number;
    doorsSecured: boolean;
  };
}

export class AurelionMansionSystems {
  // Power Generation & Storage
  public generatorRunning = false;
  public fuelLiters = 840;
  public readonly maxFuelLiters = 1200;
  public batteryKwh = 185;
  public readonly batteryCapacityKwh = 250;
  public solarKw = 0;
  public generatorKw = 0;
  public totalDemandKw = 0;
  public powerPriorityMode: PowerPriorityMode = 'balanced';

  public tier1CriticalPowered = true;
  public tier2StandardPowered = true;
  public tier3LuxuryPowered = true;

  // Water Reserves & RO/UV Filtration
  public rawWaterLiters = 11200;
  public treatedWaterLiters = 9600;
  public readonly maxWaterCapacityLiters = 15000;
  public purifierActive = true;

  // Hydroponics (12 Beds on Floor 5)
  public hydroBeds: HydroponicBedState[] = [];
  public totalHarvestedCrops = 0;

  // Climate, Lighting & Resort Controls
  public hvacMode: 'eco' | 'comfort' | 'off' = 'comfort';
  public cinemaOn = false;
  public aquariumLightsOn = true;
  public maintenanceIntegrity = 100;
  public roomLights: AurelionRoomLightsState = {
    b2: true,
    b1: true,
    f1: true,
    f2: true,
    f3: true,
    f4: true,
    f5: true,
    f6: true,
    f7: true,
  };

  // Three Working Elevators
  public elevators: Record<ElevatorId, ElevatorState>;

  constructor() {
    for (let i = 0; i < 12; i++) {
      const cropType: HydroCropType = i % 3 === 0 ? 'vegetables' : i % 3 === 1 ? 'herbs' : 'berries';
      // Start with a healthy mix of growing & ready beds so Floor 5 looks alive immediately
      const stage: 0 | 1 | 2 | 3 = i < 4 ? 3 : i < 8 ? 2 : 1;
      const growthProgress = stage === 3 ? 1 : stage === 2 ? 0.62 : 0.22;
      this.hydroBeds.push({
        id: i,
        label: `Hydro Rack ${String(i + 1).padStart(2, '0')} (${cropType.toUpperCase()})`,
        cropType,
        stage,
        growthProgress,
      });
    }

    const createElev = (id: ElevatorId, start: AurelionLevelId): ElevatorState => ({
      id,
      name: AURELION_ELEVATOR_CONFIGS[id].name,
      stops: [...AURELION_ELEVATOR_CONFIGS[id].stops],
      currentFloor: start,
      targetFloor: start,
      currentY: AURELION_LEVELS[start].floorY,
      targetY: AURELION_LEVELS[start].floorY,
      doorOpenFactor: 1,
      moving: false,
      lockedByLoadShedding: false,
    });

    this.elevators = {
      main: createElev('main', 'F1'),
      service: createElev('service', 'F1'),
      private: createElev('private', 'F1'),
    };
  }

  public update(
    delta: number,
    gameTimeMinutes: number,
    weatherType: string = 'clear',
    extraUsage = { tapsActive: 0, showerActive: false, stoveOn: false, acOn: true }
  ) {
    // 1. Solar Generation (F7 Crown Photovoltaic Canopy)
    const hour = (gameTimeMinutes % 1440) / 60;
    const sunElev = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const weatherFactor =
      weatherType === 'storm' || weatherType === 'blizzard'
        ? 0.25
        : weatherType === 'rain' || weatherType === 'fog' || weatherType === 'toxic_fog'
          ? 0.45
          : 1.0;
    this.solarKw = Number((18.0 * sunElev * weatherFactor).toFixed(2));

    // 2. Generator Power (B2 Main Power Hall)
    const gameHoursDelta = delta / 36.0; // Matches Day/Night scale (~1 game hour per 36 real sec)
    if (this.generatorRunning) {
      if (this.fuelLiters > 0.05) {
        this.generatorKw = 35.0;
        this.fuelLiters = Math.max(0, this.fuelLiters - 7.5 * gameHoursDelta);
      } else {
        this.fuelLiters = 0;
        this.generatorRunning = false;
        this.generatorKw = 0;
      }
    } else {
      this.generatorKw = 0;
    }

    const totalGenerationKw = this.solarKw + this.generatorKw;

    // 3. Demand Calculation by Priority Tier
    const litFloorsCount = Object.values(this.roomLights).filter(Boolean).length;
    const tier1Kw = 2.4; // Medical life-support + B1 Railway/Security + Private Lift standby
    const tier2Kw =
      1.2 + // Main & Service lift standby
      litFloorsCount * 0.22 +
      (this.purifierActive ? 1.8 : 0) +
      (this.hydroBeds.some((b) => b.stage > 0 && b.stage < 3) ? 2.1 : 0.4) +
      (extraUsage.stoveOn ? 1.4 : 0);
    const tier3Kw =
      (this.hvacMode === 'comfort' ? 2.4 : this.hvacMode === 'eco' ? 1.1 : 0) +
      (extraUsage.acOn ? 0.9 : 0) +
      (this.cinemaOn ? 1.4 : 0) +
      (this.aquariumLightsOn ? 0.6 : 0) +
      1.6; // Infinity Pool + Indoor Pool pumps & heaters

    // Evaluate Load Shedding based on battery % and priority mode
    const battPct = (this.batteryKwh / this.batteryCapacityKwh) * 100;
    if (this.powerPriorityMode === 'critical') {
      this.tier1CriticalPowered = this.batteryKwh > 0.5 || totalGenerationKw >= tier1Kw;
      this.tier2StandardPowered = false;
      this.tier3LuxuryPowered = false;
    } else if (this.powerPriorityMode === 'balanced') {
      this.tier1CriticalPowered = this.batteryKwh > 0.5 || totalGenerationKw >= tier1Kw;
      this.tier2StandardPowered = battPct > 12 || totalGenerationKw >= tier1Kw + tier2Kw;
      this.tier3LuxuryPowered = battPct > 28 || totalGenerationKw >= tier1Kw + tier2Kw + tier3Kw;
    } else {
      // luxury mode runs everything until battery hits 5%
      this.tier1CriticalPowered = this.batteryKwh > 0.5 || totalGenerationKw >= tier1Kw;
      this.tier2StandardPowered = battPct > 5 || totalGenerationKw >= tier1Kw + tier2Kw;
      this.tier3LuxuryPowered = battPct > 8 || totalGenerationKw >= tier1Kw + tier2Kw + tier3Kw;
    }

    this.totalDemandKw = Number(
      (
        (this.tier1CriticalPowered ? tier1Kw : 0) +
        (this.tier2StandardPowered ? tier2Kw : 0) +
        (this.tier3LuxuryPowered ? tier3Kw : 0)
      ).toFixed(2)
    );

    const netKw = totalGenerationKw - this.totalDemandKw;
    this.batteryKwh = Math.max(0, Math.min(this.batteryCapacityKwh, this.batteryKwh + netKw * gameHoursDelta));

    // 4. Water Collection & Filtration (B2 Reserve -> RO/UV Plant -> Potable)
    if (weatherType === 'rain' || weatherType === 'storm') {
      this.rawWaterLiters = Math.min(this.maxWaterCapacityLiters, this.rawWaterLiters + 320 * gameHoursDelta);
    }
    if (this.purifierActive && this.tier2StandardPowered && this.rawWaterLiters > 1 && this.treatedWaterLiters < this.maxWaterCapacityLiters) {
      const purified = Math.min(280 * gameHoursDelta, this.rawWaterLiters, this.maxWaterCapacityLiters - this.treatedWaterLiters);
      this.rawWaterLiters -= purified;
      this.treatedWaterLiters += purified;
    }
    const fixtureDraw = (extraUsage.tapsActive * 45 + (extraUsage.showerActive ? 140 : 0)) * gameHoursDelta;
    const hydroDraw = this.hydroBeds.filter((b) => b.stage > 0 && b.stage < 3).length * 4.5 * gameHoursDelta;
    this.treatedWaterLiters = Math.max(0, this.treatedWaterLiters - fixtureDraw - hydroDraw);

    // 5. Floor 5 Hydroponic Crop Growth
    const hasGrowthResources = this.tier2StandardPowered && this.treatedWaterLiters > 15;
    if (hasGrowthResources) {
      for (const bed of this.hydroBeds) {
        if (bed.stage === 1 || bed.stage === 2) {
          bed.growthProgress = Math.min(1, bed.growthProgress + delta * 0.012);
          if (bed.growthProgress >= 1) {
            bed.stage = 3;
          } else if (bed.growthProgress >= 0.45) {
            bed.stage = 2;
          }
        }
      }
    }

    // 6. Maintenance slight gradual wear
    if (this.generatorRunning) {
      this.maintenanceIntegrity = Math.max(35, this.maintenanceIntegrity - delta * 0.008);
    }

    // 7. Three-Elevator State Machine
    (['main', 'service', 'private'] as ElevatorId[]).forEach((id) => {
      const elev = this.elevators[id];
      const reqTier = AURELION_ELEVATOR_CONFIGS[id].tierRequirement;
      elev.lockedByLoadShedding = reqTier === 1 ? !this.tier1CriticalPowered : !this.tier2StandardPowered;

      const dist = Math.abs(elev.targetY - elev.currentY);
      if (dist > 0.02 && !elev.lockedByLoadShedding) {
        elev.moving = true;
        // Close doors before moving
        if (elev.doorOpenFactor > 0.04) {
          elev.doorOpenFactor = Math.max(0, elev.doorOpenFactor - delta * 2.8);
        } else {
          elev.doorOpenFactor = 0;
          const speed = id === 'private' ? 7.2 : id === 'main' ? 5.8 : 4.4;
          const step = Math.sign(elev.targetY - elev.currentY) * Math.min(dist, speed * delta);
          elev.currentY += step;
        }
      } else {
        if (dist <= 0.02) {
          elev.currentY = elev.targetY;
          elev.currentFloor = elev.targetFloor;
        }
        elev.moving = false;
        elev.doorOpenFactor = Math.min(1, elev.doorOpenFactor + delta * 2.4);
      }
    });
  }

  public sendElevator(id: ElevatorId, floor: AurelionLevelId): { accepted: boolean; reason?: string } {
    const elev = this.elevators[id];
    if (!elev.stops.includes(floor)) {
      return { accepted: false, reason: `${elev.name} does not serve ${floor}.` };
    }
    const reqTier = AURELION_ELEVATOR_CONFIGS[id].tierRequirement;
    const powered = reqTier === 1 ? this.tier1CriticalPowered : this.tier2StandardPowered;
    if (!powered) {
      return { accepted: false, reason: `${elev.name} locked — restore power or switch Priority Mode to Critical.` };
    }
    elev.targetFloor = floor;
    elev.targetY = AURELION_LEVELS[floor].floorY;
    return { accepted: true };
  }

  public cycleElevatorNextFloor(id: ElevatorId): AurelionLevelId {
    const elev = this.elevators[id];
    const idx = elev.stops.indexOf(elev.targetFloor);
    const nextFloor = elev.stops[(idx + 1) % elev.stops.length];
    this.sendElevator(id, nextFloor);
    return nextFloor;
  }

  public toggleGenerator(): boolean {
    if (!this.generatorRunning && this.fuelLiters <= 0.1) {
      return false;
    }
    this.generatorRunning = !this.generatorRunning;
    return this.generatorRunning;
  }

  public refuelGenerator(liters = 120): number {
    const added = Math.min(liters, this.maxFuelLiters - this.fuelLiters);
    this.fuelLiters += added;
    return added;
  }

  public togglePurifier(): boolean {
    this.purifierActive = !this.purifierActive;
    return this.purifierActive;
  }

  public drawPurifiedWaterBottle(): boolean {
    if (this.treatedWaterLiters < 2.0) return false;
    this.treatedWaterLiters -= 2.0;
    return true;
  }

  public plantHydroBed(bedId: number, cropType?: HydroCropType): boolean {
    const bed = this.hydroBeds.find((b) => b.id === bedId);
    if (!bed || bed.stage !== 0) return false;
    if (cropType) bed.cropType = cropType;
    bed.stage = 1;
    bed.growthProgress = 0.05;
    bed.label = `Hydro Rack ${String(bed.id + 1).padStart(2, '0')} (${bed.cropType.toUpperCase()})`;
    return true;
  }

  public harvestHydroBed(bedId: number): { harvested: boolean; cropType: HydroCropType; itemId: string; count: number } {
    const bed = this.hydroBeds.find((b) => b.id === bedId);
    if (!bed || bed.stage !== 3) {
      return { harvested: false, cropType: 'vegetables', itemId: 'wild_berries', count: 0 };
    }
    const cropType = bed.cropType;
    bed.stage = 0;
    bed.growthProgress = 0;
    this.totalHarvestedCrops += 1;
    const itemId = cropType === 'berries' ? 'wild_berries' : cropType === 'herbs' ? 'herb_stew' : 'canned_beans';
    const count = cropType === 'berries' ? 3 : 2;
    return { harvested: true, cropType, itemId, count };
  }

  public repairMaintenance(): number {
    this.maintenanceIntegrity = 100;
    return this.maintenanceIntegrity;
  }

  public setPowerPriority(mode: PowerPriorityMode): PowerPriorityMode {
    this.powerPriorityMode = mode;
    return this.powerPriorityMode;
  }

  public cyclePowerPriority(): PowerPriorityMode {
    const order: PowerPriorityMode[] = ['balanced', 'critical', 'luxury'];
    this.powerPriorityMode = order[(order.indexOf(this.powerPriorityMode) + 1) % order.length];
    return this.powerPriorityMode;
  }

  public cycleHvacMode(): HvacMode {
    const order: HvacMode[] = ['comfort', 'eco', 'off'];
    this.hvacMode = order[(order.indexOf(this.hvacMode) + 1) % order.length];
    return this.hvacMode;
  }

  public toggleFloorLight(floorKey: keyof AurelionRoomLightsState): boolean {
    this.roomLights[floorKey] = !this.roomLights[floorKey];
    return this.roomLights[floorKey];
  }

  public getSnapshot(security: { turretsOnline: number; turretKills: number; gatesOpenCount: number; doorsSecured: boolean }): AurelionDashboardSnapshot {
    const totalGenerationKw = Number((this.solarKw + this.generatorKw).toFixed(2));
    const emptyCount = this.hydroBeds.filter((b) => b.stage === 0).length;
    const ripeCount = this.hydroBeds.filter((b) => b.stage === 3).length;
    const growingCount = this.hydroBeds.length - emptyCount - ripeCount;

    return {
      power: {
        solarKw: this.solarKw,
        generatorKw: this.generatorKw,
        totalGenerationKw,
        totalDemandKw: this.totalDemandKw,
        netKw: Number((totalGenerationKw - this.totalDemandKw).toFixed(2)),
        batteryKwh: Number(this.batteryKwh.toFixed(1)),
        batteryCapacityKwh: this.batteryCapacityKwh,
        batteryPercent: Math.round((this.batteryKwh / this.batteryCapacityKwh) * 100),
        fuelLiters: Math.round(this.fuelLiters),
        fuelCapacityLiters: this.maxFuelLiters,
        generatorRunning: this.generatorRunning,
        priorityMode: this.powerPriorityMode,
        tier1CriticalPowered: this.tier1CriticalPowered,
        tier2StandardPowered: this.tier2StandardPowered,
        tier3LuxuryPowered: this.tier3LuxuryPowered,
      },
      water: {
        rawLiters: Math.round(this.rawWaterLiters),
        treatedLiters: Math.round(this.treatedWaterLiters),
        maxCapacityLiters: this.maxWaterCapacityLiters,
        purifierActive: this.purifierActive && this.tier2StandardPowered,
        purificationLitersPerHour: this.purifierActive && this.tier2StandardPowered ? 280 : 0,
        aquaponicsDrawLitersPerHour: Math.round(growingCount * 4.5),
      },
      agriculture: {
        beds: this.hydroBeds.map((b) => ({ ...b })),
        emptyCount,
        growingCount,
        ripeCount,
        totalHarvestedCrops: this.totalHarvestedCrops,
        growLightsPowered: this.tier2StandardPowered,
      },
      elevators: {
        main: { ...this.elevators.main, stops: [...this.elevators.main.stops] },
        service: { ...this.elevators.service, stops: [...this.elevators.service.stops] },
        private: { ...this.elevators.private, stops: [...this.elevators.private.stops] },
      },
      climate: {
        hvacMode: this.hvacMode,
        indoorTempC: this.hvacMode === 'comfort' && this.tier3LuxuryPowered ? 21.5 : this.hvacMode === 'eco' && this.tier3LuxuryPowered ? 23.0 : 18.5,
        airQualityPercent: this.tier2StandardPowered ? 99 : 82,
        cinemaOn: this.cinemaOn && this.tier3LuxuryPowered,
        aquariumLightsOn: this.aquariumLightsOn && this.tier3LuxuryPowered,
        maintenanceIntegrity: Math.round(this.maintenanceIntegrity),
        roomLights: { ...this.roomLights },
      },
      security,
    };
  }

  public exportState(): AurelionSaveState {
    return {
      version: 1,
      generatorRunning: this.generatorRunning,
      fuelLiters: this.fuelLiters,
      batteryKwh: this.batteryKwh,
      rawWaterLiters: this.rawWaterLiters,
      treatedWaterLiters: this.treatedWaterLiters,
      purifierActive: this.purifierActive,
      powerPriorityMode: this.powerPriorityMode,
      hvacMode: this.hvacMode,
      cinemaOn: this.cinemaOn,
      aquariumLightsOn: this.aquariumLightsOn,
      maintenanceIntegrity: this.maintenanceIntegrity,
      roomLights: { ...this.roomLights },
      elevators: {
        main: { currentFloor: this.elevators.main.currentFloor, targetFloor: this.elevators.main.targetFloor },
        service: { currentFloor: this.elevators.service.currentFloor, targetFloor: this.elevators.service.targetFloor },
        private: { currentFloor: this.elevators.private.currentFloor, targetFloor: this.elevators.private.targetFloor },
      },
      hydroBeds: this.hydroBeds.map((b) => ({ ...b })),
      totalHarvestedCrops: this.totalHarvestedCrops,
    };
  }

  public restoreState(saved?: AurelionSaveState | null): void {
    if (!saved || saved.version !== 1) return;
    this.generatorRunning = Boolean(saved.generatorRunning);
    if (typeof saved.fuelLiters === 'number') this.fuelLiters = Math.max(0, Math.min(this.maxFuelLiters, saved.fuelLiters));
    if (typeof saved.batteryKwh === 'number') this.batteryKwh = Math.max(0, Math.min(this.batteryCapacityKwh, saved.batteryKwh));
    if (typeof saved.rawWaterLiters === 'number') this.rawWaterLiters = Math.max(0, Math.min(this.maxWaterCapacityLiters, saved.rawWaterLiters));
    if (typeof saved.treatedWaterLiters === 'number') this.treatedWaterLiters = Math.max(0, Math.min(this.maxWaterCapacityLiters, saved.treatedWaterLiters));
    this.purifierActive = saved.purifierActive !== false;
    if (saved.powerPriorityMode) this.powerPriorityMode = saved.powerPriorityMode;
    if (saved.hvacMode) this.hvacMode = saved.hvacMode;
    this.cinemaOn = Boolean(saved.cinemaOn);
    this.aquariumLightsOn = saved.aquariumLightsOn !== false;
    if (typeof saved.maintenanceIntegrity === 'number') this.maintenanceIntegrity = Math.max(10, Math.min(100, saved.maintenanceIntegrity));
    if (saved.roomLights) this.roomLights = { ...this.roomLights, ...saved.roomLights };
    if (typeof saved.totalHarvestedCrops === 'number') this.totalHarvestedCrops = saved.totalHarvestedCrops;
    if (Array.isArray(saved.hydroBeds) && saved.hydroBeds.length === 12) {
      this.hydroBeds = saved.hydroBeds.map((b) => ({ ...b }));
    }
    if (saved.elevators) {
      (['main', 'service', 'private'] as ElevatorId[]).forEach((id) => {
        const rec = saved.elevators[id];
        if (rec && AURELION_LEVELS[rec.currentFloor]) {
          this.elevators[id].currentFloor = rec.currentFloor;
          this.elevators[id].targetFloor = AURELION_LEVELS[rec.targetFloor] ? rec.targetFloor : rec.currentFloor;
          this.elevators[id].currentY = AURELION_LEVELS[rec.currentFloor].floorY;
          this.elevators[id].targetY = AURELION_LEVELS[this.elevators[id].targetFloor].floorY;
        }
      });
    }
  }
}
