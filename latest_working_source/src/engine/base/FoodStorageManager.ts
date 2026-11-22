/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FoodState } from '../../types/game';

export class FoodStorageManager {
  public state: FoodState = {
    refrigeratorRations: 24,
    pantryRations: 16,
    isRefrigerated: true,
    daysOfFoodRemaining: 18,
  };

  public update(delta: number, isPowered: boolean, npcsCount: number) {
    this.state.isRefrigerated = isPowered;

    // Daily consumption by survivors and player
    const hoursElapsed = (delta * 2.0) / 60.0;
    const dailyRate = (1 + npcsCount) * 0.05; // Rations per hour
    const consumed = dailyRate * hoursElapsed;

    if (this.state.refrigeratorRations > 0) {
      this.state.refrigeratorRations = Math.max(0, this.state.refrigeratorRations - consumed);
    } else if (this.state.pantryRations > 0) {
      this.state.pantryRations = Math.max(0, this.state.pantryRations - consumed);
    }

    const total = this.state.refrigeratorRations + this.state.pantryRations;
    this.state.daysOfFoodRemaining = Math.round((total / (1 + npcsCount)) * 10) / 10;
  }

  public depositRations(count: number, isPerishable: boolean = false) {
    if (isPerishable) {
      this.state.refrigeratorRations += count;
    } else {
      this.state.pantryRations += count;
    }
  }

  public withdrawRation(): boolean {
    if (this.state.refrigeratorRations > 0) {
      this.state.refrigeratorRations -= 1;
      return true;
    }
    if (this.state.pantryRations > 0) {
      this.state.pantryRations -= 1;
      return true;
    }
    return false;
  }
}
