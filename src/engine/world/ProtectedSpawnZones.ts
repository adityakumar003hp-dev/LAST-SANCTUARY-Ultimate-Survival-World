/**
 * Authoritative no-procedural-spawn zones for story-authored safe compounds.
 * Coordinates are world X/Z. Intentional authored props, crops, vehicles,
 * furniture, equipment, NPCs and mission objects are not blocked by this utility.
 * Every procedural spawn system (hostile, wildlife, resource, loot, POI, vehicle,
 * ambient prop) must consult this same predicate before creating an object.
 */
export type ProtectedSpawnZone = { id: string; minX: number; maxX: number; minZ: number; maxZ: number };

export const PROTECTED_SPAWN_ZONES: readonly ProtectedSpawnZone[] = [
  // Player residence / future mansion compound, including building, courtyard,
  // garden and garage. Keep a clear perimeter buffer for all procedural objects.
  { id: 'player-mansion-compound', minX: -56, maxX: 4, minZ: 4, maxZ: 76 },
  // Military Starter Base at (954, 22) with reinforced perimeter clearing.
  // Nothing unrelated (trees, stone, scrap) can spawn inside or within boundary.
  { id: 'military-starter-base', minX: 915, maxX: 995, minZ: -18, maxZ: 62 },
  // Legacy central clearing around origin
  { id: 'legacy-sanctuary', minX: -40, maxX: 40, minZ: -40, maxZ: 40 },
];

export function isProtectedSpawnZone(x: number, z: number): boolean {
  return PROTECTED_SPAWN_ZONES.some(zone =>
    x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ
  );
}

// Shared explicit name for systems that need to enforce the no-spawn rule.
export const isInsideProtectedPremises = isProtectedSpawnZone;
