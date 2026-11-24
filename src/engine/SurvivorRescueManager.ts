import * as THREE from 'three';
import { getTerrainHeight } from './Terrain';
import { buildRealisticHumanoid } from './rendering/RealisticHumanoidBuilder';

export interface SurvivorDialogue {
  id: string;
  name: string;
  role: string;
  rescued: boolean;
  lines: string[];
  choices: string[];
}

interface Survivor {
  id: string;
  name: string;
  role: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  rescued: boolean;
  following: boolean;
  walkPhase: number;
  infectionStage?: 'normal' | 'stunned' | 'zombie';
  infectionTimer?: number;
}

const PROFILES = [
  {
    name: 'Aarav',
    role: 'Medic',
    color: 0x4d9b78,
    skin: 0xb98262,
    gender: 'masculine' as const,
    hairStyle: 'short' as const,
    lines: [
      'I was treating the injured when the evacuation route collapsed.',
      'There are other survivors nearby. We need a safe place and medical supplies.',
    ],
  },
  {
    name: 'Mira',
    role: 'Field Researcher',
    color: 0x7796bd,
    skin: 0xd4a480,
    gender: 'feminine' as const,
    hairStyle: 'ponytail' as const,
    lines: [
      'I have been documenting the wildlife migration patterns.',
      'Some species only appear in certain biomes and at certain times.',
    ],
  },
  {
    name: 'Kabir',
    role: 'Mechanic',
    color: 0xc28b45,
    skin: 0xae7854,
    gender: 'masculine' as const,
    hairStyle: 'beanie' as const,
    lines: [
      'My radio is dead and the road is blocked.',
      'I can help repair vehicles and generators if you get me to the sanctuary.',
    ],
  },
  {
    name: 'Leah',
    role: 'Scout',
    color: 0xa36caa,
    skin: 0xdeb290,
    gender: 'feminine' as const,
    hairStyle: 'parted' as const,
    lines: [
      'I saw movement near the old research station.',
      'I can mark safe routes and points of interest on your map.',
    ],
  },
];

export class SurvivorRescueManager {
  private scene: THREE.Scene;
  private seed: number;
  private survivors: Survivor[] = [];
  private rescuedIds = new Set<string>();

  constructor(scene: THREE.Scene, seed: number) {
    this.scene = scene;
    this.seed = seed;
    this.spawnInitial();
  }

  private spawnInitial() {
    const points = [
      [34, -28],
      [-46, 38],
      [72, 54],
      [-82, -65],
    ];
    points.forEach((p, i) => {
      const profile = PROFILES[i];
      const rig = buildRealisticHumanoid({
        name: `survivor_${i}`,
        facing: '+Z',
        skinColor: profile.skin,
        jacketColor: profile.color,
        pantsColor: 0x262c36,
        hairColor: 0x1e1712,
        fabricStyle: i === 0 ? 'uniform' : 'tactical',
        genderPresentation: profile.gender,
        hairStyle: profile.hairStyle,
        hasBackpack: true,
        hasStethoscope: i === 0,
        hasMedicArmband: i === 0,
        hasBeard: i === 2,
        hasBelt: true,
        armAliasStyle: 'full',
        castShadow: true,
      });

      const g = rig.group;
      g.position.set(p[0], getTerrainHeight(p[0], p[1], this.seed), p[1]);
      this.scene.add(g);
      this.survivors.push({
        id: `survivor_${i}`,
        name: profile.name,
        role: profile.role,
        position: g.position.clone(),
        mesh: g,
        rescued: false,
        following: false,
        walkPhase: i * 1.3,
      });
    });
  }

  nearest(pos: THREE.Vector3, range = 4) {
    let found: Survivor | undefined;
    let dist = range;
    for (const s of this.survivors) {
      if (s.rescued || s.following) continue;
      const d = Math.hypot(s.position.x - pos.x, s.position.z - pos.z);
      if (d < dist) {
        found = s;
        dist = d;
      }
    }
    return found;
  }

  getDialogue(id: string): SurvivorDialogue | null {
    const s = this.survivors.find((x) => x.id === id);
    if (!s) return null;
    const p = PROFILES[this.survivors.indexOf(s)];
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      rescued: s.rescued,
      lines: [...p.lines],
      choices: s.rescued
        ? ['Ask about the area', 'End conversation']
        : ['Help me reach the sanctuary', 'Ask what happened', 'Ask about nearby resources'],
    };
  }

  beginEscort(id: string) {
    const s = this.survivors.find((x) => x.id === id);
    if (!s || s.rescued || s.following) return false;
    s.following = true;
    return true;
  }

  public infectSurvivor(id: string): boolean {
    const s = this.survivors.find((x) => x.id === id);
    if (!s || s.rescued || s.infectionStage === 'stunned' || s.infectionStage === 'zombie') return false;
    s.infectionStage = 'stunned';
    s.infectionTimer = 60.0;
    s.following = false;
    return true;
  }

  public getLivingTargets(): Array<{ id: string; kind: 'survivor'; position: [number, number, number] }> {
    const out: Array<{ id: string; kind: 'survivor'; position: [number, number, number] }> = [];
    for (const s of this.survivors) {
      if (s.rescued || s.infectionStage === 'stunned' || s.infectionStage === 'zombie') continue;
      out.push({ id: s.id, kind: 'survivor', position: [s.position.x, s.position.y, s.position.z] });
    }
    return out;
  }

  update(
    delta: number,
    player: THREE.Vector3,
    safeCenter: THREE.Vector3,
    safeRadius: number,
    onConverted?: (pos: [number, number, number]) => void
  ) {
    const completed: string[] = [];
    for (const s of this.survivors) {
      if (s.rescued || s.infectionStage === 'zombie') continue;
      const lLeg = s.mesh.getObjectByName('leftLeg');
      const rLeg = s.mesh.getObjectByName('rightLeg');
      const lArm = s.mesh.getObjectByName('leftArm');
      const rArm = s.mesh.getObjectByName('rightArm');

      if (s.infectionStage === 'stunned') {
        s.walkPhase += delta * 22;
        const shiver = Math.sin(s.walkPhase) * 0.08;
        s.mesh.rotation.x = THREE.MathUtils.damp(s.mesh.rotation.x, 0.22, 4, delta);
        s.mesh.rotation.z = shiver;
        if (lArm) lArm.rotation.x = -0.6 + shiver;
        if (rArm) rArm.rotation.x = -0.6 - shiver;
        s.infectionTimer = Math.max(0, (s.infectionTimer ?? 60) - delta);
        if (s.infectionTimer <= 0) {
          s.infectionStage = 'zombie';
          s.mesh.visible = false;
          onConverted?.([s.position.x, s.position.y, s.position.z]);
        }
        continue;
      }

      if (!s.following) {
        s.walkPhase += delta * 2.0;
        const breathe = Math.sin(s.walkPhase) * 0.03;
        if (lArm) lArm.rotation.x = breathe;
        if (rArm) rArm.rotation.x = -breathe;
        continue;
      }

      const target = new THREE.Vector3(player.x, 0, player.z + 3.2);
      const direction = new THREE.Vector3(target.x - s.position.x, 0, target.z - s.position.z);
      const distance = direction.length();
      if (distance > 0.8) {
        direction.normalize();
        s.position.addScaledVector(direction, Math.min(distance, delta * 3.2));
        s.mesh.position.copy(s.position);
        s.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        s.walkPhase += delta * 9.5;
        const swing = Math.sin(s.walkPhase) * 0.55;
        if (lLeg && rLeg) {
          lLeg.rotation.x = swing;
          rLeg.rotation.x = -swing;
        }
        if (lArm && rArm) {
          lArm.rotation.x = -swing * 0.7;
          rArm.rotation.x = swing * 0.7;
        }
      } else {
        if (lLeg && rLeg) {
          lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, 0, 8, delta);
          rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, 0, 8, delta);
        }
        if (lArm && rArm) {
          lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, 0, 8, delta);
          rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, 0, 8, delta);
        }
      }
      s.position.y = getTerrainHeight(s.position.x, s.position.z, this.seed);
      s.mesh.position.y = s.position.y;
      const safeDistance = Math.hypot(s.position.x - safeCenter.x, s.position.z - safeCenter.z);
      if (safeDistance < safeRadius * 0.78) {
        s.rescued = true;
        s.following = false;
        s.mesh.visible = false;
        this.rescuedIds.add(s.id);
        completed.push(s.id);
      }
    }
    return completed;
  }

  importRescued(ids: string[] | undefined) {
    if (!ids) return;
    ids.forEach((id) => {
      const s = this.survivors.find((x) => x.id === id);
      if (s) {
        s.rescued = true;
        s.following = false;
        s.mesh.visible = false;
        this.rescuedIds.add(id);
      }
    });
  }

  exportRescued() {
    return Array.from(this.rescuedIds);
  }

  get rescuedCount() {
    return this.rescuedIds.size;
  }

  get totalCount() {
    return this.survivors.length;
  }

  dispose() {
    for (const s of this.survivors) {
      this.scene.remove(s.mesh);
    }
    this.survivors = [];
  }
}
