/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WaterState } from '../../types/game';

export class WaterManager {
  public state: WaterState = {
    storageLiters: 450,
    maxCapacityLiters: 800,
    rainCatchmentRate: 15, // L/hr
    purificationRate: 25,  // L/hr
    cleanWaterLiters: 320,
  };

  public update(delta: number, isPowered: boolean) {
    const hoursElapsed = (delta * 2.0) / 60.0;

    // Passive rain catchment
    const caught = this.state.rainCatchmentRate * hoursElapsed;
    this.state.storageLiters = Math.min(this.state.maxCapacityLiters, this.state.storageLiters + caught);

    // Active UV filtration when powered
    if (isPowered && this.state.storageLiters > this.state.cleanWaterLiters) {
      const purified = Math.min(
        this.state.storageLiters - this.state.cleanWaterLiters,
        this.state.purificationRate * hoursElapsed
      );
      this.state.cleanWaterLiters = Math.min(this.state.maxCapacityLiters, this.state.cleanWaterLiters + purified);
    }
  }

  public drawCleanWater(amount: number = 1): boolean {
    if (this.state.cleanWaterLiters >= amount) {
      this.state.cleanWaterLiters -= amount;
      this.state.storageLiters -= amount;
      return true;
    }
    return false;
  }
}
