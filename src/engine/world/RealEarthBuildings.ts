/**
 * Real Earth Urban Architecture, OpenStreetMap Geometry Builder & Enterable Building Catalog.
 *
 * Renders high-density Earth neighborhoods and real OSM building footprints + street networks
 * merged per material bucket (`mergeGeometries`) so chunks contain 15-40 buildings, streets,
 * streetlights, and parked/wrecked vehicles at 4-6 total draw calls per chunk.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BiomeType, GraphicsQuality, POIStructure } from '../../types/game';
import { CHUNK_SIZE, WorldCoordinates } from './WorldCoordinates';
import { TerrainGenerator } from './TerrainGenerator';
import { RoadGenerator } from './RoadGenerator';
import { RailwayNetworkGenerator } from './RailwayNetworkGenerator';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';
import { RealWorldCities, RegionalArchPalette } from '../geo/RealWorldCities';
import { OsmTileFetcher } from '../geo/OsmTileFetcher';
import { getConcretePBR, getAsphaltPBR } from '../../utils/proceduralTextures';

export type BuildingArchetype =
  | 'residential'
  | 'apartment'
  | 'shop'
  | 'cafe'
  | 'hospital'
  | 'police'
  | 'office'
  | 'warehouse'
  | 'school'
  | 'cabin'
  | 'media';

export interface EnterableBuildingDef {
  id: string;
  name: string;
  archetype: BuildingArchetype;
  worldX: number;
  baseY: number;
  worldZ: number;
  width: number;
  depth: number;
  height: number;
  floors: number;
  rotationY: number;
  doorWorldX: number;
  doorWorldZ: number;
  palette: RegionalArchPalette;
  hasLoot: boolean;
  isLooted: boolean;
  cityId?: string;
}

export interface RealEarthDistrictResult {
  group: THREE.Group;
  enterableBuildings: EnterableBuildingDef[];
  buildingCount: number;
  osmMatchedCount: number;
}

const ARCHETYPE_NAMES: Record<BuildingArchetype, string[]> = {
  residential: ['Townhouse Residence', 'Family Duplex', 'Terrace Home', 'Courtyard House'],
  apartment: ['Residential Apartments', 'Mid-Rise Flats', 'Horizon Suites', 'Metro Housing Block'],
  shop: ['General Provisions', 'Corner Market', 'Hardware & Supply', 'District Pharmacy'],
  cafe: ['Street Bistro & Cafe', 'Corner Bakery', 'Tea & Coffee House'],
  hospital: ['District Clinic', 'Emergency Medical Center', 'Urgent Care Annex'],
  police: ['Municipal Precinct', 'Civic Security Post', 'Transit Watch Station'],
  office: ['Commercial Offices', 'Regional Trade Center', 'Civic Administration'],
  warehouse: ['Logistics Warehouse', 'Freight Storage Depot', 'Distribution Shed'],
  school: ['Public Academy', 'Technical Institute', 'Community Library'],
  cabin: ['Outback Homestead', 'Timber Cabin', 'Roadside Shelter'],
  media: ['Regional Broadcast Studio', 'WorldWatch Bureau', 'Satellite Uplink Center'],
};

const SHARED_MATERIALS = new Map<string, THREE.Material>();

function getSharedMaterial(key: string, create: () => THREE.Material): THREE.Material {
  let mat = SHARED_MATERIALS.get(key);
  if (!mat) {
    mat = create();
    mat.userData.__sharedResource = true;
    SHARED_MATERIALS.set(key, mat);
  }
  return mat;
}

/**
 * Ensures geometry is non-indexed and has uniform position/normal/uv attributes for clean merging.
 */
function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  // Remove tangent or extra attributes if present so mergeGeometries never fails
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') {
      g.deleteAttribute(attr);
    }
  }
  return g;
}

function pushTransformedBox(
  target: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rotY: number = 0
): void {
  const geo = normalizeForMerge(new THREE.BoxGeometry(w, h, d));
  if (rotY !== 0) geo.rotateY(rotY);
  geo.translate(x, y, z);
  target.push(geo);
}

function pushTransformedCylinder(
  target: THREE.BufferGeometry[],
  rTop: number,
  rBot: number,
  h: number,
  radialSegs: number,
  x: number,
  y: number,
  z: number
): void {
  const geo = normalizeForMerge(new THREE.CylinderGeometry(rTop, rBot, h, radialSegs));
  geo.translate(x, y, z);
  target.push(geo);
}

function mergeBucket(geos: THREE.BufferGeometry[], mat: THREE.Material, castShadow: boolean, receiveShadow: boolean): THREE.Mesh | null {
  if (geos.length === 0) return null;
  const merged = mergeGeometries(geos, false);
  for (let i = 0; i < geos.length; i++) geos[i].dispose();
  if (!merged) return null;
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function mapOsmBuildingArchetype(kind: string, amenity?: string, shop?: string, levels: number = 2): BuildingArchetype {
  const a = (amenity || '').toLowerCase();
  const k = (kind || '').toLowerCase();
  if (a.includes('hospital') || a.includes('clinic') || k === 'hospital') return 'hospital';
  if (a.includes('police') || a.includes('fire_station')) return 'police';
  if (a.includes('school') || a.includes('university') || a.includes('library')) return 'school';
  if (a.includes('cafe') || a.includes('restaurant')) return 'cafe';
  if (shop || k === 'retail' || k === 'commercial') return 'shop';
  if (k === 'warehouse' || k === 'industrial') return 'warehouse';
  if (k === 'office') return 'office';
  if (k === 'apartments' || levels >= 3) return 'apartment';
  if (k === 'cabin' || k === 'hut') return 'cabin';
  return 'residential';
}

export class RealEarthBuildings {
  /**
   * Builds regional Earth city blocks, OSM-accurate building footprints & streets,
   * streetlights, sidewalks, and parked/wrecked street vehicles cleanly batched per chunk.
   */
  public static buildChunkDistrict(
    cx: number,
    cz: number,
    worldSeed: number,
    biomeId: BiomeType,
    quality: GraphicsQuality,
    lootedPoiIds: Set<string>,
    apocalypticSeverity: number,
    existingPois: POIStructure[]
  ): RealEarthDistrictResult {
    const group = new THREE.Group();
    group.name = `earth_district_${cx}_${cz}`;
    const enterableBuildings: EnterableBuildingDef[] = [];

    const [minX, minZ] = WorldCoordinates.chunkToWorldOrigin(cx, cz);
    const [centerX, centerZ] = WorldCoordinates.chunkToWorldCenter(cx, cz);

    // Keep starter sanctuary compound, Oakridge Town & main starter chunk clean
    if (cx === 0 && cz === 0) {
      return { group, enterableBuildings, buildingCount: 0, osmMatchedCount: 0 };
    }

    const centerGeo = WorldCoordinates.worldToLatLon(centerX, centerZ);
    const earthInfo = TerrainGenerator.getEarthInfo(centerX, centerZ);
    const nearestCity = RealWorldCities.findNearestCity(centerGeo.lat, centerGeo.lon, 35);
    const inRealCity = nearestCity?.insideFootprint ?? false;
    const palette = RealWorldCities.getRegionalArchitecturePalette(
      centerGeo.lat,
      centerGeo.lon,
      earthInfo.country,
      earthInfo.continent,
      nearestCity?.city.id
    );

    const osmGeom = OsmTileFetcher.getCachedGeometryNear(centerGeo.lat, centerGeo.lon);
    const isSettlementBiome =
      inRealCity ||
      biomeId === 'abandoned_city' ||
      biomeId === 'small_village' ||
      biomeId === 'industrial_zone';

    // Convert POI locations into EnterableBuildingDefs so every POI building is also enterable!
    for (const poi of existingPois) {
      const def = RealEarthBuildings.poiToEnterableDef(poi, palette, lootedPoiIds, nearestCity?.city.id);
      if (def) enterableBuildings.push(def);
    }

    if (!earthInfo.isLand && !inRealCity && osmGeom.buildings.length === 0) {
      return { group, enterableBuildings, buildingCount: 0, osmMatchedCount: 0 };
    }

    // Material buckets
    const wallPrimaryGeos: THREE.BufferGeometry[] = [];
    const wallSecondaryGeos: THREE.BufferGeometry[] = [];
    const trimGeos: THREE.BufferGeometry[] = [];
    const roofGeos: THREE.BufferGeometry[] = [];
    const glassGeos: THREE.BufferGeometry[] = [];
    const roadGeos: THREE.BufferGeometry[] = [];
    const sidewalkGeos: THREE.BufferGeometry[] = [];
    const vehicleGeos: THREE.BufferGeometry[] = [];
    const lampGlowGeos: THREE.BufferGeometry[] = [];
    const treeFoliageGeos: THREE.BufferGeometry[] = [];

    const maxX = minX + CHUNK_SIZE;
    const maxZ = minZ + CHUNK_SIZE;

    const isAreaBlocked = (wx: number, wz: number, radiusM: number): boolean => {
      if (
        isProtectedSpawnZone(wx, wz) ||
        isProtectedSpawnZone(wx - radiusM, wz - radiusM) ||
        isProtectedSpawnZone(wx + radiusM, wz + radiusM) ||
        RailwayNetworkGenerator.isProtectedRailwayZone(wx, wz) ||
        RailwayNetworkGenerator.isProtectedRailwayZone(wx, wz - radiusM) ||
        RailwayNetworkGenerator.isProtectedRailwayZone(wx, wz + radiusM)
      ) {
        return true;
      }
      if (RoadGenerator.isRoad(wx, wz).isRoad) return true;
      for (let i = 0; i < existingPois.length; i++) {
        const p = existingPois[i];
        const dx = p.position[0] - wx;
        const dz = p.position[2] - wz;
        if (dx * dx + dz * dz < (radiusM + 18) * (radiusM + 18)) return true;
      }
      return false;
    };

    const placedCenters: Array<{ x: number; z: number; r: number }> = [];
    let osmMatchedCount = 0;

    // ------------------------------------------------------------------------
    // 1. REAL OPENSTREETMAP STREETS & BUILDINGS (if downloaded/cached)
    // ------------------------------------------------------------------------
    for (let rIdx = 0; rIdx < osmGeom.roads.length; rIdx++) {
      const road = osmGeom.roads[rIdx];
      const worldPts: Array<[number, number, number]> = [];
      let touchesChunk = false;
      for (let p = 0; p < road.points.length; p++) {
        const [wx, wz] = WorldCoordinates.latLonToWorld(road.points[p][0], road.points[p][1]);
        if (wx >= minX - 16 && wx <= maxX + 16 && wz >= minZ - 16 && wz <= maxZ + 16) {
          touchesChunk = true;
        }
        const wy = Math.max(TerrainGenerator.getHeight(wx, wz, worldSeed), -0.15) + 0.09;
        worldPts.push([wx, wy, wz]);
      }
      if (!touchesChunk || worldPts.length < 2) continue;

      const hw = road.widthM * 0.5;
      for (let p = 0; p < worldPts.length - 1; p++) {
        const a = worldPts[p];
        const b = worldPts[p + 1];
        const midX = (a[0] + b[0]) * 0.5;
        const midZ = (a[2] + b[2]) * 0.5;
        if (midX < minX - 8 || midX > maxX + 8 || midZ < minZ - 8 || midZ > maxZ + 8) continue;
        if (isProtectedSpawnZone(midX, midZ) || RailwayNetworkGenerator.isProtectedRailwayZone(midX, midZ)) continue;

        const segLen = Math.hypot(b[0] - a[0], b[2] - a[2]);
        if (segLen < 1.0 || segLen > 240) continue;
        const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
        const midY = (a[1] + b[1]) * 0.5;
        pushTransformedBox(roadGeos, hw * 2, 0.14, segLen + 0.6, midX, midY, midZ, yaw);
      }
    }

    for (let bIdx = 0; bIdx < osmGeom.buildings.length; bIdx++) {
      if (enterableBuildings.length >= 28) break;
      const b = osmGeom.buildings[bIdx];
      const [wx, wz] = WorldCoordinates.latLonToWorld(b.centerLat, b.centerLon);
      if (wx < minX + 12 || wx > maxX - 12 || wz < minZ + 12 || wz > maxZ - 12) continue;
      const baseY = TerrainGenerator.getHeight(wx, wz, worldSeed);
      if (baseY < -0.25) continue;

      // Compute oriented footprint extents from real OSM polygon vertices
      let minPx = Infinity, maxPx = -Infinity, minPz = Infinity, maxPz = -Infinity;
      const localPoly: Array<[number, number]> = [];
      for (let p = 0; p < b.polygon.length; p++) {
        const [vx, vz] = WorldCoordinates.latLonToWorld(b.polygon[p][0], b.polygon[p][1]);
        const lx = vx - wx;
        const lz = vz - wz;
        localPoly.push([lx, lz]);
        if (lx < minPx) minPx = lx;
        if (lx > maxPx) maxPx = lx;
        if (lz < minPz) minPz = lz;
        if (lz > maxPz) maxPz = lz;
      }

      const w = THREE.MathUtils.clamp(maxPx - minPx, 6.5, 28);
      const d = THREE.MathUtils.clamp(maxPz - minPz, 6.5, 26);
      const rRadius = Math.hypot(w * 0.5, d * 0.5);
      if (isAreaBlocked(wx, wz, rRadius)) continue;
      if (placedCenters.some((pc) => Math.hypot(pc.x - wx, pc.z - wz) < pc.r + rRadius * 0.7)) continue;

      const floors = Math.max(1, Math.min(palette.maxStories, b.levels));
      const height = THREE.MathUtils.clamp(b.heightM, 3.8, palette.maxStories * 3.8);
      const rotY = localPoly.length >= 2
        ? Math.atan2(localPoly[1][0] - localPoly[0][0], localPoly[1][1] - localPoly[0][1])
        : 0;

      const archetype = mapOsmBuildingArchetype(b.kind, b.amenity, b.shop, floors);
      const id = `osm_${cx}_${cz}_${b.id}`;
      const label = b.name || `${ARCHETYPE_NAMES[archetype][bIdx % ARCHETYPE_NAMES[archetype].length]}`;

      RealEarthBuildings.appendBuildingGeometry(
        wx,
        baseY,
        wz,
        w,
        height,
        d,
        rotY,
        floors,
        bIdx,
        palette,
        wallPrimaryGeos,
        wallSecondaryGeos,
        trimGeos,
        roofGeos,
        glassGeos,
        lampGlowGeos
      );

      const doorOffset = d * 0.5 + 1.1;
      const doorWorldX = wx + Math.sin(rotY) * doorOffset;
      const doorWorldZ = wz + Math.cos(rotY) * doorOffset;

      enterableBuildings.push({
        id,
        name: label,
        archetype,
        worldX: wx,
        baseY,
        worldZ: wz,
        width: w,
        depth: d,
        height,
        floors,
        rotationY: rotY,
        doorWorldX,
        doorWorldZ,
        palette,
        hasLoot: true,
        isLooted: lootedPoiIds.has(id),
        cityId: nearestCity?.city.id,
      });

      placedCenters.push({ x: wx, z: wz, r: rRadius });
      osmMatchedCount++;
    }

    // ------------------------------------------------------------------------
    // 2. REGIONAL PROCEDURAL STREET GRID + MULTI-BUILDING NEIGHBORHOOD
    // ------------------------------------------------------------------------
    if (isSettlementBiome && osmMatchedCount < 5) {
      let s = ((cx * 73856093) ^ (cz * 19349663) ^ worldSeed) >>> 0;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };

      const isUrbanCore = inRealCity || biomeId === 'abandoned_city';
      const isIndustrial = biomeId === 'industrial_zone';
      const gridStep = isUrbanCore ? 64 : 84;
      const laneOffsets = isUrbanCore ? [48, 128, 208] : [64, 192];

      // Local city avenues + sidewalk curbs
      for (const lx of laneOffsets) {
        const roadX = minX + lx;
        for (let segZ = minZ + 8; segZ < maxZ; segZ += 32) {
          if (isProtectedSpawnZone(roadX, segZ) || RailwayNetworkGenerator.isProtectedRailwayZone(roadX, segZ)) continue;
          const ry = TerrainGenerator.getHeight(roadX, segZ, worldSeed);
          if (ry < -0.25) continue;
          pushTransformedBox(roadGeos, 7.0, 0.14, 32, roadX, ry + 0.06, segZ + 12);
          pushTransformedBox(sidewalkGeos, 9.6, 0.10, 32, roadX, ry + 0.03, segZ + 12);
        }
      }
      for (const lz of laneOffsets) {
        const roadZ = minZ + lz;
        for (let segX = minX + 8; segX < maxX; segX += 32) {
          if (isProtectedSpawnZone(segX, roadZ) || RailwayNetworkGenerator.isProtectedRailwayZone(segX, roadZ)) continue;
          const ry = TerrainGenerator.getHeight(segX, roadZ, worldSeed);
          if (ry < -0.25) continue;
          pushTransformedBox(roadGeos, 32, 0.15, 7.0, segX + 12, ry + 0.065, roadZ);
          pushTransformedBox(sidewalkGeos, 32, 0.10, 9.6, segX + 12, ry + 0.03, roadZ);
        }
      }

      // Streetlights & parked vehicles along avenues
      const maxStreetProps = quality === 'low' ? 4 : isUrbanCore ? 9 : 5;
      for (let i = 0; i < maxStreetProps; i++) {
        const px = minX + laneOffsets[i % laneOffsets.length] + (i % 2 === 0 ? 4.4 : -4.4);
        const pz = minZ + 22 + ((i * 29) % 210);
        if (isAreaBlocked(px, pz, 3.0)) continue;
        const py = TerrainGenerator.getHeight(px, pz, worldSeed);
        if (py < 0.0) continue;

        // Streetlamp post + emissive bulb
        pushTransformedCylinder(trimGeos, 0.10, 0.14, 5.2, 6, px, py + 2.6, pz);
        pushTransformedBox(lampGlowGeos, 0.45, 0.18, 0.45, px + (i % 2 === 0 ? -0.55 : 0.55), py + 5.15, pz);

        // Street tree or parked sedan/van
        if (i % 2 === 0 && isUrbanCore) {
          const vx = px + (i % 4 === 0 ? -1.4 : 1.4);
          const vz = pz + 5.0;
          if (!isAreaBlocked(vx, vz, 3.0)) {
            const vy = TerrainGenerator.getHeight(vx, vz, worldSeed);
            if (vy >= 0.05) {
              const yaw = rand() < 0.85 ? 0 : 0.25;
              pushTransformedBox(vehicleGeos, 1.9, 0.72, 4.2, vx, vy + 0.48, vz, yaw);
              pushTransformedBox(vehicleGeos, 1.65, 0.62, 2.0, vx, vy + 1.05, vz - 0.15, yaw);
              pushTransformedCylinder(trimGeos, 0.34, 0.34, 0.22, 8, vx - 0.88, vy + 0.34, vz + 1.25);
              pushTransformedCylinder(trimGeos, 0.34, 0.34, 0.22, 8, vx + 0.88, vy + 0.34, vz + 1.25);
              pushTransformedCylinder(trimGeos, 0.34, 0.34, 0.22, 8, vx - 0.88, vy + 0.34, vz - 1.25);
              pushTransformedCylinder(trimGeos, 0.34, 0.34, 0.22, 8, vx + 0.88, vy + 0.34, vz - 1.25);
            }
          }
        } else {
          const tx = px + (i % 2 === 0 ? 1.5 : -1.5);
          const tz = pz + 3.2;
          if (!isAreaBlocked(tx, tz, 2.5)) {
            const ty = TerrainGenerator.getHeight(tx, tz, worldSeed);
            if (ty >= 0.05) {
              pushTransformedCylinder(trimGeos, 0.16, 0.22, 2.4, 6, tx, ty + 1.2, tz);
              pushTransformedCylinder(treeFoliageGeos, 0.4, 1.65, 2.8, 7, tx, ty + 3.2, tz);
            }
          }
        }
      }

      // Building plots inside blocks
      const targetBuildings =
        quality === 'low'
          ? (isUrbanCore ? 8 : 4)
          : isUrbanCore
            ? 20
            : isIndustrial
              ? 10
              : 7;

      const gridCols = isUrbanCore ? 4 : 3;
      const cellSpan = (CHUNK_SIZE - 36) / gridCols;

      for (let gIdx = 0; gIdx < gridCols * gridCols && enterableBuildings.length < targetBuildings + existingPois.length; gIdx++) {
        const gx = gIdx % gridCols;
        const gz = Math.floor(gIdx / gridCols);
        // Place two buildings per larger block on urban cores if desired
        const subSlots = isUrbanCore && quality !== 'low' ? 2 : 1;
        for (let sub = 0; sub < subSlots; sub++) {
          const jitterX = (rand() - 0.5) * 8 + (sub === 1 ? cellSpan * 0.28 : -cellSpan * 0.18);
          const jitterZ = (rand() - 0.5) * 8 + (sub === 1 ? -cellSpan * 0.16 : cellSpan * 0.12);
          const wx = minX + 20 + (gx + 0.5) * cellSpan + jitterX;
          const wz = minZ + 20 + (gz + 0.5) * cellSpan + jitterZ;

          const w = isIndustrial ? 14 + rand() * 8 : isUrbanCore ? 9.5 + rand() * 7.5 : 8.0 + rand() * 4.5;
          const d = isIndustrial ? 12 + rand() * 6 : isUrbanCore ? 9.0 + rand() * 6.5 : 7.5 + rand() * 4.0;
          const rad = Math.hypot(w * 0.5, d * 0.5) + 1.5;

          if (isAreaBlocked(wx, wz, rad)) continue;
          if (placedCenters.some((pc) => Math.hypot(pc.x - wx, pc.z - wz) < pc.r + rad * 0.85)) continue;

          const baseY = TerrainGenerator.getHeight(wx, wz, worldSeed);
          if (baseY < 0.05) continue;
          // Ensure flat-ish pad check across corners
          const hA = TerrainGenerator.getHeight(wx - w * 0.4, wz - d * 0.4, worldSeed);
          const hB = TerrainGenerator.getHeight(wx + w * 0.4, wz + d * 0.4, worldSeed);
          if (Math.abs(hA - hB) > 5.5) continue;

          const floors = isIndustrial
            ? 1 + Math.floor(rand() * 2)
            : isUrbanCore
              ? 1 + Math.floor(rand() * Math.min(palette.maxStories, 6))
              : 1 + Math.floor(rand() * 2);
          const storyH = isIndustrial ? 4.4 : 3.45;
          const height = floors * storyH;
          const rotY = (Math.floor(rand() * 4) * Math.PI) / 2;

          const archetypeRoll = rand();
          const archetype: BuildingArchetype = isIndustrial
            ? (archetypeRoll < 0.65 ? 'warehouse' : 'office')
            : !isUrbanCore
              ? (archetypeRoll < 0.48 ? 'residential' : archetypeRoll < 0.72 ? 'shop' : archetypeRoll < 0.88 ? 'cafe' : 'cabin')
              : archetypeRoll < 0.28
                ? 'apartment'
                : archetypeRoll < 0.48
                  ? 'shop'
                  : archetypeRoll < 0.62
                    ? 'office'
                    : archetypeRoll < 0.74
                      ? 'cafe'
                      : archetypeRoll < 0.84
                        ? 'residential'
                        : archetypeRoll < 0.91
                          ? 'hospital'
                          : archetypeRoll < 0.96
                            ? 'police'
                            : 'school';

          const id = `bld_${cx}_${cz}_${gIdx}_${sub}`;
          const cityTag = nearestCity?.city.name ? `${nearestCity.city.name} ` : '';
          const namePool = ARCHETYPE_NAMES[archetype];
          const label = `${cityTag}${namePool[(gIdx + sub) % namePool.length]}`;

          RealEarthBuildings.appendBuildingGeometry(
            wx,
            baseY,
            wz,
            w,
            height,
            d,
            rotY,
            floors,
            gIdx + sub,
            palette,
            wallPrimaryGeos,
            wallSecondaryGeos,
            trimGeos,
            roofGeos,
            glassGeos,
            lampGlowGeos
          );

          const doorOffset = d * 0.5 + 1.05;
          const doorWorldX = wx + Math.sin(rotY) * doorOffset;
          const doorWorldZ = wz + Math.cos(rotY) * doorOffset;

          enterableBuildings.push({
            id,
            name: label,
            archetype,
            worldX: wx,
            baseY,
            worldZ: wz,
            width: w,
            depth: d,
            height,
            floors,
            rotationY: rotY,
            doorWorldX,
            doorWorldZ,
            palette,
            hasLoot: true,
            isLooted: lootedPoiIds.has(id),
            cityId: nearestCity?.city.id,
          });
          placedCenters.push({ x: wx, z: wz, r: rad });
          if (enterableBuildings.length >= targetBuildings + existingPois.length) break;
        }
        void gridStep;
      }
    }

    // ------------------------------------------------------------------------
    // 3. MERGE MATERIAL BUCKETS INTO LEAN CHUNK DRAW CALLS
    // ------------------------------------------------------------------------
    const concretePBR = getConcretePBR(palette.wallPrimary);
    const wallPrimaryMat = getSharedMaterial(`earth_wall_p_${palette.wallPrimary.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: palette.wallPrimary,
        map: concretePBR.albedo,
        normalMap: concretePBR.normal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.85,
        metalness: 0.06,
      })
    );
    const wallSecondaryMat = getSharedMaterial(`earth_wall_s_${palette.wallSecondary.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: palette.wallSecondary,
        roughness: 0.82,
        metalness: 0.08,
      })
    );
    const trimMat = getSharedMaterial(`earth_trim_${palette.trimHex.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: palette.trimHex,
        roughness: 0.55,
        metalness: 0.25,
      })
    );
    const roofMat = getSharedMaterial(`earth_roof_${palette.roofHex.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: palette.roofHex,
        roughness: 0.78,
        metalness: 0.14,
      })
    );
    const glassMat = getSharedMaterial(`earth_glass_${palette.glassHex.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: palette.glassHex,
        roughness: 0.12,
        metalness: 0.45,
        envMapIntensity: 1.4,
      })
    );
    const asphaltPBR = getAsphaltPBR();
    const roadMat = getSharedMaterial('earth_local_road', () =>
      new THREE.MeshStandardMaterial({
        color: 0x33363d,
        map: asphaltPBR.albedo,
        normalMap: asphaltPBR.normal,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const sidewalkMat = getSharedMaterial('earth_sidewalk', () =>
      new THREE.MeshStandardMaterial({
        color: 0x76797d,
        roughness: 0.92,
      })
    );
    const vehicleColor = apocalypticSeverity > 0.35 ? 0x563f33 : 0x455a64;
    const vehicleMat = getSharedMaterial(`earth_veh_${vehicleColor.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({
        color: vehicleColor,
        roughness: apocalypticSeverity > 0.35 ? 0.82 : 0.38,
        metalness: 0.55,
      })
    );
    const lampMat = getSharedMaterial('earth_street_lamp', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffe4a0,
        emissive: 0xffb84d,
        emissiveIntensity: apocalypticSeverity > 0.65 ? 0.2 : 0.95,
        roughness: 0.25,
      })
    );
    const foliageMat = getSharedMaterial('earth_urban_foliage', () =>
      new THREE.MeshStandardMaterial({
        color: 0x3a6436,
        roughness: 0.88,
      })
    );

    const castShadow = quality === 'high' || quality === 'ultra';
    const meshes = [
      mergeBucket(wallPrimaryGeos, wallPrimaryMat, castShadow, true),
      mergeBucket(wallSecondaryGeos, wallSecondaryMat, castShadow, true),
      mergeBucket(trimGeos, trimMat, false, true),
      mergeBucket(roofGeos, roofMat, castShadow, true),
      mergeBucket(glassGeos, glassMat, false, false),
      mergeBucket(roadGeos, roadMat, false, true),
      mergeBucket(sidewalkGeos, sidewalkMat, false, true),
      mergeBucket(vehicleGeos, vehicleMat, false, true),
      mergeBucket(lampGlowGeos, lampMat, false, false),
      mergeBucket(treeFoliageGeos, foliageMat, false, true),
    ];

    for (const m of meshes) {
      if (m) group.add(m);
    }

    return {
      group,
      enterableBuildings,
      buildingCount: placedCenters.length,
      osmMatchedCount,
    };
  }

  private static appendBuildingGeometry(
    wx: number,
    baseY: number,
    wz: number,
    w: number,
    h: number,
    d: number,
    rotY: number,
    floors: number,
    variantSeed: number,
    palette: RegionalArchPalette,
    wallPrimaryGeos: THREE.BufferGeometry[],
    wallSecondaryGeos: THREE.BufferGeometry[],
    trimGeos: THREE.BufferGeometry[],
    roofGeos: THREE.BufferGeometry[],
    glassGeos: THREE.BufferGeometry[],
    lampGlowGeos: THREE.BufferGeometry[]
  ) {
    // Foundation plinth anchored into terrain so slopes never float
    pushTransformedBox(trimGeos, w + 0.5, 1.4, d + 0.5, wx, baseY - 0.35, wz, rotY);

    // Primary shell
    const wallBucket = variantSeed % 3 === 0 ? wallSecondaryGeos : wallPrimaryGeos;
    pushTransformedBox(wallBucket, w, h, d, wx, baseY + h * 0.5, wz, rotY);

    // Per-floor glazed window strips
    const floorStep = h / floors;
    for (let f = 0; f < floors; f++) {
      const fy = baseY + f * floorStep + floorStep * 0.56;
      pushTransformedBox(glassGeos, w + 0.08, Math.min(1.25, floorStep * 0.42), d * 0.78, wx, fy, wz, rotY);
      pushTransformedBox(glassGeos, w * 0.78, Math.min(1.25, floorStep * 0.42), d + 0.08, wx, fy, wz, rotY);
    }

    // Entrance canopy + warm porch doorway indicator along +Z local face
    const frontOffset = d * 0.5 + 0.42;
    const fx = wx + Math.sin(rotY) * frontOffset;
    const fz = wz + Math.cos(rotY) * frontOffset;
    pushTransformedBox(trimGeos, Math.min(3.4, w * 0.42), 0.25, 1.1, fx, baseY + 2.75, fz, rotY);
    pushTransformedBox(glassGeos, 2.0, 2.35, 0.14, wx + Math.sin(rotY) * (d * 0.5 + 0.04), baseY + 1.2, wz + Math.cos(rotY) * (d * 0.5 + 0.04), rotY);
    pushTransformedBox(lampGlowGeos, 0.9, 0.14, 0.2, fx, baseY + 2.58, fz, rotY);

    // Regional roof / crown silhouette
    pushTransformedBox(roofGeos, w + 0.45, 0.42, d + 0.45, wx, baseY + h + 0.2, wz, rotY);
    if (palette.style === 'south_asian' && floors >= 2) {
      // Sandstone cornice parapet & rooftop chhatri pavilion
      pushTransformedBox(trimGeos, w * 0.34, 1.5, d * 0.34, wx, baseY + h + 1.1, wz, rotY);
      pushTransformedCylinder(roofGeos, 0.1, Math.min(w, d) * 0.19, 1.1, 8, wx, baseY + h + 2.3, wz);
    } else if (palette.style === 'european' && floors <= 4) {
      // Mansard sloped crown
      pushTransformedBox(roofGeos, w * 0.82, 1.2, d * 0.82, wx, baseY + h + 0.95, wz, rotY);
    } else if (floors >= 4) {
      // Rooftop HVAC & mechanical penthouse
      pushTransformedBox(trimGeos, w * 0.36, 1.6, d * 0.36, wx, baseY + h + 1.1, wz, rotY);
    }
  }

  public static poiToEnterableDef(
    poi: POIStructure,
    palette: RegionalArchPalette,
    lootedPoiIds: Set<string>,
    cityId?: string
  ): EnterableBuildingDef | null {
    const map: Partial<Record<POIStructure['type'], { archetype: BuildingArchetype; w: number; d: number; h: number; floors: number }>> = {
      hospital: { archetype: 'hospital', w: 20, d: 15, h: 12.5, floors: 3 },
      clinic: { archetype: 'hospital', w: 14, d: 11, h: 7.5, floors: 2 },
      police_station: { archetype: 'police', w: 18, d: 14, h: 7.5, floors: 2 },
      fire_station: { archetype: 'police', w: 18, d: 14, h: 7.5, floors: 2 },
      university: { archetype: 'school', w: 20, d: 15, h: 12.5, floors: 3 },
      shopping_centre: { archetype: 'shop', w: 20, d: 15, h: 7.5, floors: 2 },
      warehouse: { archetype: 'warehouse', w: 15.6, d: 11.6, h: 5.5, floors: 1 },
      research_lab: { archetype: 'office', w: 13.6, d: 9.6, h: 4.5, floors: 1 },
      cabin: { archetype: 'cabin', w: 6.8, d: 5.8, h: 3.4, floors: 1 },
      factory: { archetype: 'warehouse', w: 20, d: 15, h: 7.5, floors: 2 },
      industrial_complex: { archetype: 'warehouse', w: 20, d: 15, h: 7.5, floors: 2 },
      city_district: { archetype: 'apartment', w: 19, d: 17, h: 14, floors: 3 },
      town: { archetype: 'shop', w: 14, d: 12, h: 7.5, floors: 2 },
      village: { archetype: 'residential', w: 10, d: 9, h: 6.5, floors: 2 },
      airport: { archetype: 'office', w: 20, d: 15, h: 7.5, floors: 2 },
      freight_terminal: { archetype: 'warehouse', w: 20, d: 15, h: 7.5, floors: 2 },
      media_station: { archetype: 'media', w: 15, d: 12, h: 8.2, floors: 2 },
      broadcast_center: { archetype: 'media', w: 19, d: 15, h: 12.5, floors: 3 },
      satellite_uplink: { archetype: 'media', w: 12, d: 10, h: 5.2, floors: 1 },
    };

    const spec = map[poi.type];
    if (!spec) return null;

    const rotY = poi.rotationY || 0;
    const doorOffset = spec.d * 0.5 + 1.25;
    return {
      id: poi.id,
      name: poi.name,
      archetype: spec.archetype,
      worldX: poi.position[0],
      baseY: poi.position[1],
      worldZ: poi.position[2],
      width: spec.w,
      depth: spec.d,
      height: spec.h,
      floors: spec.floors,
      rotationY: rotY,
      doorWorldX: poi.position[0] + Math.sin(rotY) * doorOffset,
      doorWorldZ: poi.position[2] + Math.cos(rotY) * doorOffset,
      palette,
      hasLoot: poi.hasLoot,
      isLooted: poi.isLooted || lootedPoiIds.has(poi.id),
      cityId,
    };
  }
}
