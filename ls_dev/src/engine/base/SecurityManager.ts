/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityState } from '../../types/game';

export class SecurityManager {
  public state: SecurityState = {
    isAlarmArmed: true,
    isAlarmTriggered: false,
    activeGateLocked: false,
    nearbyZombiesDetected: 0,
    cctvChannels: [
      {
        id: 1,
        name: 'Gate 01 - Main Entrance',
        cameraPosition: [0, 6.5, 18],
        lookAt: [0, 1.5, 12],
        status: 'online',
      },
      {
        id: 2,
        name: 'Courtyard - Luxury Pool & Patio',
        cameraPosition: [12, 5.5, 6],
        lookAt: [7.5, 0.5, -2.5],
        status: 'online',
      },
      {
        id: 3,
        name: 'North Bastion - Palisade Wall',
        cameraPosition: [-10, 6.0, -8],
        lookAt: [-13.5, 1.5, 0],
        status: 'online',
      },
      {
        id: 4,
        name: 'Villa Rooftop - Solar Grid',
        cameraPosition: [2, 9.0, -4],
        lookAt: [0, 4.0, -6],
        status: 'online',
      },
    ],
  };

  public update(zombiesNearbyCount: number, isNight: boolean, isPowered: boolean) {
    this.state.nearbyZombiesDetected = zombiesNearbyCount;

    // Trigger alarm if armed and zombies are near perimeter at night
    if (this.state.isAlarmArmed && (zombiesNearbyCount > 0 || isNight)) {
      this.state.isAlarmTriggered = true;
    } else {
      this.state.isAlarmTriggered = false;
    }

    // Update camera status based on power
    this.state.cctvChannels.forEach((cam) => {
      cam.status = isPowered
        ? (this.state.isAlarmTriggered ? 'alert' : 'online')
        : 'offline';
    });
  }

  public toggleGateLock(): boolean {
    this.state.activeGateLocked = !this.state.activeGateLocked;
    return this.state.activeGateLocked;
  }

  public toggleAlarmArm(): boolean {
    this.state.isAlarmArmed = !this.state.isAlarmArmed;
    if (!this.state.isAlarmArmed) this.state.isAlarmTriggered = false;
    return this.state.isAlarmArmed;
  }
}
