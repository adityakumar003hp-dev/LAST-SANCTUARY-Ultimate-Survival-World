/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResearchTech } from '../../types/game';

export class ResearchManager {
  public technologies: ResearchTech[] = [
    {
      id: 'solar_efficiency',
      name: 'Photovoltaic Monocrystalline Arrays',
      description: 'Increases solar panel power output by +35% during daylight hours.',
      costComponents: 8,
      costMetal: 12,
      unlocked: true,
      icon: 'Sun',
      category: 'power',
    },
    {
      id: 'reinforced_alloys',
      name: 'Titanium-Reinforced Concrete Framing',
      description: 'Increases maximum structural durability of all base walls and gates by +50%.',
      costComponents: 12,
      costMetal: 24,
      unlocked: false,
      icon: 'Shield',
      category: 'defense',
    },
    {
      id: 'uv_water_filtration',
      name: 'Advanced Reverse Osmosis Filtration',
      description: 'Doubles clean water purification speed and eliminates waterborne infection risks.',
      costComponents: 10,
      costMetal: 16,
      unlocked: false,
      icon: 'Droplet',
      category: 'farming',
    },
    {
      id: 'ev_overclocking',
      name: 'Electric Recon Buggy High-Torque Inverter',
      description: 'Increases top speed of the Electric Buggy to 85 km/h and extends battery capacity +40%.',
      costComponents: 16,
      costMetal: 20,
      unlocked: false,
      icon: 'Zap',
      category: 'vehicle',
    },
    {
      id: 'automated_turret',
      name: 'Motion-Tracking Sentry Turret',
      description: 'Unlocks constructible automated ballistics turret to defend gates against night hordes.',
      costComponents: 24,
      costMetal: 35,
      unlocked: false,
      icon: 'Crosshair',
      category: 'defense',
    },
    {
      id: 'antibiotic_synthesis',
      name: 'Pharmaceutical Synthesis Lab',
      description: 'Allows compounding of broad-spectrum antibiotics to reverse zombie infection stages.',
      costComponents: 14,
      costMetal: 10,
      unlocked: false,
      icon: 'Activity',
      category: 'medical',
    },
  ];

  public unlockTech(techId: string): boolean {
    const tech = this.technologies.find((t) => t.id === techId);
    if (!tech || tech.unlocked) return false;
    tech.unlocked = true;
    return true;
  }

  public isUnlocked(techId: string): boolean {
    const tech = this.technologies.find((t) => t.id === techId);
    return !!tech?.unlocked;
  }
}
