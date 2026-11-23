import { PlacedStructure } from '../types/game';

export interface BlueprintItem {
  typeId: string;
  dx: number;
  dy: number;
  dz: number;
  rotationY: number;
}

export interface BaseBlueprint {
  name: string;
  version: 1;
  structures: BlueprintItem[];
}

export interface LeaderboardEntry {
  id: string;
  survivorName: string;
  daysSurvived: number;
  kills: number;
  bosses: number;
  rebirths: number;
  difficulty: string;
  extracted: boolean;
  timestamp: number;
}

const LEADERBOARD_KEY = 'lsr_survival_hall_of_fame_v1';

export const BUILTIN_BLUEPRINTS: { id: string; name: string; summary: string; code: string }[] = [
  {
    id: 'bp_perimeter_bunker',
    name: 'Perimeter Killbox Bunker',
    summary: '4 fortified walls, sanctuary gate, defensive spikes & sentry turret.',
    code: encodeBlueprint('Perimeter Killbox Bunker', [
      { uid: '1', typeId: 'wooden_foundation', position: [0, 0, 0], rotationY: 0, currentHealth: 450, maxHealth: 450 },
      { uid: '2', typeId: 'wooden_foundation', position: [3, 0, 0], rotationY: 0, currentHealth: 450, maxHealth: 450 },
      { uid: '3', typeId: 'reinforced_barricade', position: [0, 0.3, -2.5], rotationY: 0, currentHealth: 1100, maxHealth: 1100 },
      { uid: '4', typeId: 'reinforced_barricade', position: [3, 0.3, -2.5], rotationY: 0, currentHealth: 1100, maxHealth: 1100 },
      { uid: '5', typeId: 'defense_spikes', position: [0, 0, -4.2], rotationY: 0, currentHealth: 350, maxHealth: 350 },
      { uid: '6', typeId: 'defense_spikes', position: [3, 0, -4.2], rotationY: 0, currentHealth: 350, maxHealth: 350 },
      { uid: '7', typeId: 'wooden_gate', position: [1.5, 0.3, 2.5], rotationY: 0, currentHealth: 450, maxHealth: 450 },
      { uid: '8', typeId: 'sentry_turret', position: [1.5, 0.3, 0], rotationY: Math.PI, currentHealth: 850, maxHealth: 850 },
    ], [1.5, 0, 0]),
  },
  {
    id: 'bp_solar_turret_bastion',
    name: 'Solar Turret & Shock Bastion',
    summary: 'Dual sentry turrets, solar battery, electric fence & floodlight.',
    code: encodeBlueprint('Solar Turret Bastion', [
      { uid: '1', typeId: 'solar_panel', position: [0, 0, 0], rotationY: 0, currentHealth: 500, maxHealth: 500 },
      { uid: '2', typeId: 'solar_battery', position: [2.2, 0, 0], rotationY: 0, currentHealth: 450, maxHealth: 450 },
      { uid: '3', typeId: 'solar_spotlight', position: [0, 0, -2.4], rotationY: 0, currentHealth: 500, maxHealth: 500 },
      { uid: '4', typeId: 'sentry_turret', position: [-2.4, 0, -2.4], rotationY: 0, currentHealth: 850, maxHealth: 850 },
      { uid: '5', typeId: 'sentry_turret', position: [2.4, 0, -2.4], rotationY: 0, currentHealth: 850, maxHealth: 850 },
      { uid: '6', typeId: 'electric_fence', position: [0, 0, -4.2], rotationY: 0, currentHealth: 650, maxHealth: 650 },
    ], [0, 0, 0]),
  },
  {
    id: 'bp_field_camp',
    name: 'Forward Recon Camp',
    summary: 'Campfire, workbench, survivor bed, salvage bench & stash chest.',
    code: encodeBlueprint('Forward Recon Camp', [
      { uid: '1', typeId: 'campfire', position: [0, 0, 0], rotationY: 0, currentHealth: 300, maxHealth: 300 },
      { uid: '2', typeId: 'workbench', position: [-2.6, 0, 0.5], rotationY: Math.PI / 4, currentHealth: 400, maxHealth: 400 },
      { uid: '3', typeId: 'salvage_bench', position: [2.6, 0, 0.5], rotationY: -Math.PI / 4, currentHealth: 420, maxHealth: 420 },
      { uid: '4', typeId: 'survivor_bed', position: [0, 0, 2.8], rotationY: 0, currentHealth: 350, maxHealth: 350 },
      { uid: '5', typeId: 'storage_chest', position: [-2.2, 0, 2.6], rotationY: 0, currentHealth: 400, maxHealth: 400 },
    ], [0, 0, 0]),
  },
];

export function encodeBlueprint(
  name: string,
  structures: PlacedStructure[],
  origin: [number, number, number],
  maxRadiusMeters = 35
): string {
  const nearby = structures.filter((s) => {
    const dx = s.position[0] - origin[0];
    const dz = s.position[2] - origin[2];
    return Math.hypot(dx, dz) <= maxRadiusMeters;
  });

  const payload: BaseBlueprint = {
    name: name.trim().slice(0, 40) || 'Sanctuary Blueprint',
    version: 1,
    structures: nearby.slice(0, 80).map((s) => ({
      typeId: s.typeId,
      dx: Number((s.position[0] - origin[0]).toFixed(2)),
      dy: Number((s.position[1] - origin[1]).toFixed(2)),
      dz: Number((s.position[2] - origin[2]).toFixed(2)),
      rotationY: Number((s.rotationY || 0).toFixed(3)),
    })),
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `LSR-BP1:${btoa(binary)}`;
}

export function decodeBlueprint(code: string): BaseBlueprint | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith('LSR-BP1:')) return null;
    const b64 = trimmed.slice('LSR-BP1:'.length);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as BaseBlueprint;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.structures)) return null;
    const valid = parsed.structures.filter(
      (s) =>
        typeof s.typeId === 'string' &&
        Number.isFinite(s.dx) &&
        Number.isFinite(s.dy) &&
        Number.isFinite(s.dz) &&
        Number.isFinite(s.rotationY)
    );
    return {
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 40) : 'Imported Blueprint',
      version: 1,
      structures: valid.slice(0, 80),
    };
  } catch {
    return null;
  }
}

export function getLeaderboardRuns(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.daysSurvived - a.daysSurvived || b.kills - a.kills).slice(0, 20);
  } catch {
    return [];
  }
}

export function recordRunScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): LeaderboardEntry[] {
  const existing = getLeaderboardRuns();
  const next: LeaderboardEntry = {
    ...entry,
    id: `run_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
  };
  const updated = [next, ...existing]
    .sort((a, b) => (b.extracted ? 1 : 0) - (a.extracted ? 1 : 0) || b.daysSurvived - a.daysSurvived || b.kills - a.kills)
    .slice(0, 20);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}
