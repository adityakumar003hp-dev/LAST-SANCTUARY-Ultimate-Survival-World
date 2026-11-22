/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BaseLevel, BaseState } from '../../types/game';
import { PowerManager } from './PowerManager';
import { WaterManager } from './WaterManager';
import { FoodStorageManager } from './FoodStorageManager';
import { SecurityManager } from './SecurityManager';
import { NPCSettlementManager } from './NPCSettlementManager';
import { VehicleParkingManager } from './VehicleParkingManager';
import { ResearchManager } from './ResearchManager';

export class BaseManager {
  public scene: THREE.Scene;
  public level: BaseLevel = 2; // Starts at Modern Sanctuary

  public power: PowerManager;
  public water: WaterManager;
  public food: FoodStorageManager;
  public security: SecurityManager;
  public npcs: NPCSettlementManager;
  public vehicle: VehicleParkingManager;
  public research: ResearchManager;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.power = new PowerManager();
    this.water = new WaterManager();
    this.food = new FoodStorageManager();
    this.security = new SecurityManager();
    this.npcs = new NPCSettlementManager(scene);
    this.vehicle = new VehicleParkingManager(scene);
    this.research = new ResearchManager();
  }

  public update(
    delta: number,
    gameHour: number,
    isNight: boolean,
    zombiesNearPerimeter: number
  ) {
    this.power.update(delta, gameHour);
    this.water.update(delta, this.power.state.isPowered);
    this.food.update(delta, this.power.state.isPowered, this.npcs.npcs.length);
    this.security.update(zombiesNearPerimeter, isNight, this.power.state.isPowered);
    this.npcs.update(delta, isNight, this.power.state.isPowered);
  }

  public getBaseState(): BaseState {
    return {
      level: this.level,
      power: { ...this.power.state },
      water: { ...this.water.state },
      food: { ...this.food.state },
      security: { ...this.security.state },
      npcs: [...this.npcs.npcs],
      research: [...this.research.technologies],
      vehicle: { ...this.vehicle.vehicleState },
      overallHealth: 100,
    };
  }

  public upgradeBaseLevel(): boolean {
    if (this.level >= 4) return false;
    this.level = (this.level + 1) as BaseLevel;
    // Upgrade bonuses
    if (this.level === 3) {
      this.power.state.batteryCapacityKwh += 50;
      this.water.state.maxCapacityLiters += 400;
    } else if (this.level === 4) {
      this.power.state.batteryCapacityKwh += 100;
      this.water.state.maxCapacityLiters += 800;
    }
    return true;
  }

  public dispose() {
    this.npcs.dispose();
    this.vehicle.dispose();
  }
}
