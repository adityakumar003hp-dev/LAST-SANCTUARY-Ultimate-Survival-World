/**
 * Authoritative no-procedural-spawn zones for story-authored safe compounds.
 * Coordinates are world X/Z. Intentional authored props, crops, vehicles,
 * furniture, equipment, NPCs and mission objects are not blocked by this utility.
 * Every procedural spawn system (hostile, wildlife, resource, loot, POI, vehicle,
 * ambient prop) must consult this same predicate before creating an object.
 */
export type ProtectedSpawnZone = { id: string; minX: number; maxX: number; minZ: number; maxZ: number };

export const PROTECTED_SPAWN_ZONES: readonly ProtectedSpawnZone[] = [
  // Expanded 5x Player Mansion Compound (100 x 126.5 m: X in [-108, -8], Z in [-37.5, 89.0])
  // plus a 4 m perimeter clearing buffer (stops cleanly south of Railway Station at Z = 94).
  { id: 'player-mansion-compound', minX: -112, maxX: -4, minZ: -41, maxZ: 93 },
  // Oakridge Town District (Main Avenue, Cross Street, Civic & Commercial buildings)
  { id: 'oakridge-town-district', minX: -52, maxX: 50, minZ: -70, maxZ: 62 },
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
