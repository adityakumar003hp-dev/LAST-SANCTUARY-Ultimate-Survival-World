/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PowerState } from '../../types/game';

export class PowerManager {
  public state: PowerState = {
    solarProductionKw: 0,
    generatorProductionKw: 0,
    totalProductionKw: 0,
    consumptionKw: 4.8,
    batteryCurrentKwh: 65,
    batteryCapacityKwh: 100,
    isGeneratorRunning: false,
    generatorFuel: 80,
    isPowered: true,
  };

  /**
   * Updates power simulation each tick based on game hour and active consumers
   */
  public update(delta: number, gameHour: number) {
    // 1. Solar generation curve (peaks between 10:00 and 15:00)
    let solarMultiplier = 0;
    if (gameHour >= 6.0 && gameHour <= 18.0) {
      // Sine curve daylight factor
      solarMultiplier = Math.sin(((gameHour - 6.0) / 12.0) * Math.PI);
    }
    this.state.solarProductionKw = Math.round(solarMultiplier * 14.5 * 10) / 10;

    // 2. Generator production
    if (this.state.isGeneratorRunning && this.state.generatorFuel > 0) {
      this.state.generatorProductionKw = 22.0;
      // Consume fuel (approx 1% per 20 seconds)
      this.state.generatorFuel = Math.max(0, this.state.generatorFuel - delta * 0.05);
      if (this.state.generatorFuel <= 0) {
        this.state.isGeneratorRunning = false;
        this.state.generatorProductionKw = 0;
      }
    } else {
      this.state.generatorProductionKw = 0;
    }

    this.state.totalProductionKw = this.state.solarProductionKw + this.state.generatorProductionKw;

    // 3. Battery net flow (delta is in real seconds; 1 sec = 2 game mins)
    const netKw = this.state.totalProductionKw - this.state.consumptionKw;
    const hoursElapsed = (delta * 2.0) / 60.0;
    const netKwh = netKw * hoursElapsed;

    this.state.batteryCurrentKwh = Math.max(
      0,
      Math.min(this.state.batteryCapacityKwh, this.state.batteryCurrentKwh + netKwh)
    );

    // 4. Power availability check
    this.state.isPowered = this.state.batteryCurrentKwh > 0.5 || this.state.totalProductionKw >= this.state.consumptionKw;
  }

  public toggleGenerator(): boolean {
    if (this.state.generatorFuel <= 0) return false;
    this.state.isGeneratorRunning = !this.state.isGeneratorRunning;
    return this.state.isGeneratorRunning;
  }

  public addFuel(amount: number) {
    this.state.generatorFuel = Math.min(100, this.state.generatorFuel + amount);
  }
}
