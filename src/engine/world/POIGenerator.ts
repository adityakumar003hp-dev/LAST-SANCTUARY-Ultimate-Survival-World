/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { POIStructure } from '../../types/game';
import { TerrainGenerator } from './TerrainGenerator';
import { WorldCoordinates } from './WorldCoordinates';
import { RealWorldCities } from '../geo/RealWorldCities';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';
import { RailwayNetworkGenerator } from './RailwayNetworkGenerator';
import {
  getWoodPBR,
  getStonePBR,
  getMetalPBR,
  getConcretePBR,
  getAsphaltPBR,
} from '../../utils/proceduralTextures';

export class POIGenerator {
  /**
   * Deterministically decides if a chunk has a POI structure,
   * aligning urban districts, seaports, airports, hospitals, schools, and landmarks
   * with RealWorldCities WGS-84 footprints.
   */
  public static getPOIsForChunk(
    cx: number,
    cz: number,
    worldSeed: number = 42
  ): POIStructure[] {
    // The fixed sanctuary/apartment area is authored by the story and is never procedurally duplicated.
    if (cx === 0 && cz === 0) return [];
    const hash = (x: number, z: number, salt: number) => {
      const n = Math.sin(x * 127.1 + z * 311.7 + worldSeed * 0.017 + salt * 74.7) * 43758.5453123;
      return n - Math.floor(n);
    };

    const offsetX = 34 + hash(cx, cz, 4) * 188;
    const offsetZ = 34 + hash(cx, cz, 5) * 188;
    const worldX = cx * 256 + offsetX;
    const worldZ = cz * 256 + offsetZ;

    // Story-authored apartment, military base, and railway station premises never receive random POIs.
    if (
      isProtectedSpawnZone(worldX, worldZ) ||
      RailwayNetworkGenerator.isProtectedRailwayZone(worldX, worldZ) ||
      RailwayNetworkGenerator.isProtectedRailwayZone(worldX - 32, worldZ - 32) ||
      RailwayNetworkGenerator.isProtectedRailwayZone(worldX + 32, worldZ + 32)
    ) {
      return [];
    }

    const { lat, lon } = WorldCoordinates.worldToLatLon(worldX, worldZ);
    const earth = TerrainGenerator.getEarthInfo(worldX, worldZ);
    const nearestCity = RealWorldCities.findNearestCity(lat, lon, 32);
    const inRealCity = nearestCity?.insideFootprint ?? false;

    const chance = hash(cx, cz, 1);
    // Dense urban footprints get much higher POI building coverage; open ocean gets none
    if (!earth.isLand && !inRealCity) return [];
    const spawnThreshold = inRealCity ? 0.88 : 0.65;
    if (chance > spawnThreshold) return [];

    const density = hash(cx, cz, 3);
    const y = TerrainGenerator.getHeight(worldX, worldZ, worldSeed);
    const roll = hash(cx, cz, 6);
    let type: POIStructure['type'] = 'cabin';
    let name = 'Abandoned Survivor Cabin';

    if (inRealCity && nearestCity) {
      const c = nearestCity.city;
      const distKm = nearestCity.distanceKm;
      if (distKm < 1.2 && c.landmarkName) {
        type = 'city_district';
        name = `${c.name} — ${c.landmarkName}`;
      } else if (c.hasAirport && roll > 0.86) {
        type = 'airport';
        name = `${c.name} International Airfield`;
      } else if (c.isSeaport && roll > 0.72 && roll <= 0.86) {
        type = 'freight_terminal';
        name = `${c.name} Seaport Container Terminal`;
      } else if (roll < 0.14) {
        type = 'hospital';
        name = `${c.name} Metropolitan Hospital`;
      } else if (roll < 0.28) {
        type = 'university';
        name = `${c.name} Municipal School & Campus`;
      } else if (roll < 0.42) {
        type = 'shopping_centre';
        name = `${c.name} Commercial Exchange`;
      } else if (roll < 0.56) {
        type = 'city_district';
        name = `${c.name} Residential Block`;
      } else if (roll < 0.64) {
        type = 'police_station';
        name = `${c.name} Civic Precinct`;
      } else if (roll < 0.72) {
        type = 'media_station';
        name = `${c.name} WorldWatch Broadcast Bureau`;
      } else if (roll < 0.77) {
        type = 'broadcast_center';
        name = `${c.name} Regional Media Center`;
      } else {
        type = 'industrial_complex';
        name = `${c.name} Logistics & Rail Yard`;
      }
    } else {
      if (density < 0.10) { type = 'city_district'; name = 'Greyhaven City District'; }
      else if (density < 0.20) { type = 'town'; name = 'Riverside Township'; }
      else if (density < 0.29) { type = 'village'; name = 'Pinewatch Village'; }
      else if (roll < 0.08) { type = 'hospital'; name = 'St. Anselm General Hospital'; }
      else if (roll < 0.15) { type = 'research_lab'; name = 'Apex Biomedical Research Complex — Containment Campus'; }
      else if (roll < 0.22) { type = 'fire_station'; name = 'Emergency Fire & Rescue Station'; }
      else if (roll < 0.29) { type = 'police_station'; name = 'County Police Headquarters'; }
      else if (roll < 0.36) { type = 'industrial_complex'; name = 'Northstar Industrial Complex'; }
      else if (roll < 0.43) { type = 'factory'; name = 'Greyhaven Manufacturing Works'; }
      else if (roll < 0.49) { type = 'airport'; name = 'Regional Airfield'; }
      else if (roll < 0.55) { type = 'power_station'; name = 'Gridline Power Substation'; }
      else if (roll < 0.61) { type = 'water_treatment'; name = 'Municipal Water Treatment Plant'; }
      else if (roll < 0.67) { type = 'university'; name = 'Westbridge University & School'; }
      else if (roll < 0.73) { type = 'shopping_centre'; name = 'Cedar Mall & Market'; }
      else if (roll < 0.79) { type = 'freight_terminal'; name = 'Interstate Freight Terminal'; }
      else if (roll < 0.84) { type = 'warehouse'; name = 'Overgrown Logistics Depot'; }
      else if (roll < 0.88) { type = 'gas_station'; name = 'Route 9 Auto Service Station'; }
      else if (roll < 0.92) { type = 'media_station'; name = 'Oakridge News Regional Relay Station'; }
      else if (roll < 0.95) { type = 'satellite_uplink'; name = 'Highland Satellite News Uplink'; }
      else if (roll < 0.98) { type = 'broadcast_center'; name = 'Continental Broadcast Center'; }
      else { type = 'radio_bunker'; name = 'Civil Defense Communications Bunker'; }
    }

    return [{
      id: `poi_${cx}_${cz}_1`, type, name,
      position: [worldX, y, worldZ],
      rotationY: hash(cx, cz, 7) * Math.PI * 2,
      hasLoot: true, isLooted: false,
    }];
  }

  private static sharedMaterials = new Map<string, THREE.Material>();

  private static getSharedMat(key: string, create: () => THREE.Material): THREE.Material {
    let mat = POIGenerator.sharedMaterials.get(key);
    if (!mat) {
      mat = create();
      mat.userData.__sharedResource = true;
      POIGenerator.sharedMaterials.set(key, mat);
    }
    return mat;
  }

  /**
   * Builds high-fidelity composite 3D meshes for procedural POIs & real-Earth landmarks
   */
  public static createPOIMesh(poi: POIStructure, apocalypticSeverity: number = 0): THREE.Group {
    const group = new THREE.Group();
    group.name = poi.id;

    const woodMat = POIGenerator.getSharedMat('poi_wood', () => {
      const woodPBR = getWoodPBR();
      return new THREE.MeshStandardMaterial({
        map: woodPBR.albedo,
        normalMap: woodPBR.normal,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: woodPBR.roughness,
        roughness: 0.86,
      });
    });
    const stoneMat = POIGenerator.getSharedMat('poi_stone', () => {
      const stonePBR = getStonePBR();
      return new THREE.MeshStandardMaterial({
        map: stonePBR.albedo,
        normalMap: stonePBR.normal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: stonePBR.roughness,
        roughness: 0.92,
      });
    });
    const metalMat = POIGenerator.getSharedMat('poi_metal', () => {
      const metalPBR = getMetalPBR();
      return new THREE.MeshStandardMaterial({
        map: metalPBR.albedo,
        normalMap: metalPBR.normal,
        normalScale: new THREE.Vector2(0.75, 0.75),
        roughnessMap: metalPBR.roughness,
        roughness: 0.56,
        metalness: 0.74,
      });
    });

    switch (poi.type) {
      case 'research_lab': {
        // High-tech modular prefab lab: concrete base, steel walls, tinted glass, radar dish, ventilation
        const foundation = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 10), stoneMat);
        foundation.position.y = 0.3;

        const mainHull = new THREE.Mesh(new THREE.BoxGeometry(13.6, 4.2, 9.6), metalMat);
        mainHull.position.y = 2.4;

        const glassMat = POIGenerator.getSharedMat('poi_lab_glass', () => new THREE.MeshStandardMaterial({
          color: 0x246275,
          roughness: 0.08,
          metalness: 0.2,
          envMapIntensity: 1.5,
          transparent: true,
          opacity: 0.72,
        }));
        const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(13.8, 1.2, 0.2), glassMat);
        windowStrip.position.set(0, 3.2, 4.8);

        // Roof AC vents
        const vent = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), metalMat);
        vent.position.set(-3, 5.0, 0);

        // Satellite comms mast
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), metalMat);
        pole.position.set(3.5, 6.0, 0);
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.3, 0.4, 12), metalMat);
        dish.rotation.x = Math.PI / 4;
        dish.position.set(3.5, 7.5, 0);

        // Research campus additions: two sealed laboratory wings and visible
        // containment vessels make this POI read as a major story destination.
        const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 7.2), metalMat);
        wingLeft.position.set(-9.4, 1.9, -0.8);
        const wingRight = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 7.2), metalMat);
        wingRight.position.set(9.4, 1.9, -0.8);
        const containmentMat = new THREE.MeshStandardMaterial({ color: 0x397d86, roughness: 0.24, metalness: 0.72, emissive: 0x082b31, emissiveIntensity: 0.35 });
        const containmentA = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.8, 12), containmentMat);
        containmentA.position.set(-7.8, 2.1, 5.1);
        const containmentB = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.8, 12), containmentMat);
        containmentB.position.set(7.8, 2.1, 5.1);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.35, 3.2), metalMat);
        canopy.position.set(0, 4.6, 6.4);

        group.add(foundation, mainHull, windowStrip, vent, pole, dish, wingLeft, wingRight, containmentA, containmentB, canopy);
        break;
      }

      case 'warehouse': {
        // Corrugated metal industrial depot
        const base = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 12), stoneMat);
        base.position.y = 0.2;

        const walls = new THREE.Mesh(new THREE.BoxGeometry(15.6, 5.5, 11.6), metalMat);
        walls.position.y = 2.95;

        // Large roll-up loading door
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x8a4b2a, roughness: 0.7 });
        const door = new THREE.Mesh(new THREE.BoxGeometry(5.0, 4.0, 0.3), doorMat);
        door.position.set(0, 2.0, 5.85);

        // Roof trusses
        const roof = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.4, 12.4), metalMat);
        roof.position.y = 5.8;

        group.add(base, walls, door, roof);
        break;
      }

      case 'gas_station': {
        // Roadside gas canopy and pump island
        const island = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), stoneMat);
        island.position.y = 0.2;

        const pylonL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), metalMat);
        pylonL.position.set(-3.5, 2.25, 0);
        const pylonR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), metalMat);
        pylonR.position.set(3.5, 2.25, 0);

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 6), metalMat);
        canopy.position.y = 4.8;

        // Dual gas dispensers
        const pumpGeo = new THREE.BoxGeometry(0.9, 1.8, 0.7);
        const pumpMat = new THREE.MeshStandardMaterial({ color: 0xb5352a, roughness: 0.5 });
        const pump1 = new THREE.Mesh(pumpGeo, pumpMat);
        pump1.position.set(-1.8, 1.1, 0);
        const pump2 = new THREE.Mesh(pumpGeo, pumpMat);
        pump2.position.set(1.8, 1.1, 0);

        group.add(island, pylonL, pylonR, canopy, pump1, pump2);
        break;
      }

      case 'watchtower': {
        // Timber observation pylon
        const pylonGeo = new THREE.CylinderGeometry(0.2, 0.25, 8.0, 6);
        for (const [px, pz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
          const leg = new THREE.Mesh(pylonGeo, woodMat);
          leg.position.set(px, 4.0, pz);
          group.add(leg);
        }

        const deck = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 4.5), woodMat);
        deck.position.y = 8.0;

        const rail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.0, 4.5), metalMat);
        rail.position.y = 8.7;

        const roofPillars = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), woodMat);
        roofPillars.position.set(0, 9.5, 0);

        const roofCap = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.5, 4), woodMat);
        roofCap.position.y = 11.2;
        roofCap.rotation.y = Math.PI / 4;

        group.add(deck, rail, roofPillars, roofCap);
        break;
      }

      case 'village':
      case 'town':
      case 'city_district':
      case 'hospital':
      case 'clinic':
      case 'fire_station':
      case 'police_station':
      case 'factory':
      case 'industrial_complex':
      case 'airport':
      case 'power_station':
      case 'water_treatment':
      case 'university':
      case 'shopping_centre':
      case 'freight_terminal': {
        const isSettlement = (['village', 'town', 'city_district'] as string[]).includes(poi.type);
        const scale = poi.type === 'city_district' ? 1.9 : poi.type === 'town' ? 1.45 : 1;
        const concrete = POIGenerator.getSharedMat('poi_concrete', () => {
          const concretePBR = getConcretePBR(0x909594);
          return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: concretePBR.albedo,
            normalMap: concretePBR.normal,
            normalScale: new THREE.Vector2(0.7, 0.7),
            roughnessMap: concretePBR.roughness,
            roughness: 0.9,
          });
        });
        const glass = POIGenerator.getSharedMat('poi_settlement_glass', () => new THREE.MeshStandardMaterial({
          color: 0x3b6c84,
          metalness: 0.2,
          roughness: 0.08,
          envMapIntensity: 1.55,
        }));
        const accentColor = poi.type === 'hospital' ? 0xe8e9e4 : poi.type === 'fire_station' ? 0x9d3028 : 0x45535a;
        const accent = POIGenerator.getSharedMat(`poi_accent_${accentColor}`, () => {
          const accentPBR = getConcretePBR(accentColor);
          return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: accentPBR.albedo,
            normalMap: accentPBR.normal,
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughnessMap: accentPBR.roughness,
            roughness: 0.68,
          });
        });
        const footprint = isSettlement ? 25 * scale : 19;
        const buildingCount = isSettlement ? (poi.type === 'city_district' ? 9 : poi.type === 'town' ? 6 : 4) : 1;
        for (let i = 0; i < buildingCount; i++) {
          const bx = isSettlement ? ((i % 3) - 1) * footprint * 0.72 : 0;
          const bz = isSettlement ? (Math.floor(i / 3) - 1) * footprint * 0.72 : 0;
          const h = isSettlement ? (5 + ((i * 7) % 5) * 1.8) * scale : (poi.type === 'hospital' || poi.type === 'university' ? 13 : 7);
          const w = isSettlement ? 10 * scale : 20;
          const d = isSettlement ? 9 * scale : 15;
          const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 ? concrete : metalMat);
          building.position.set(bx, h / 2, bz);
          group.add(building);
          const windowBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, Math.max(0.6, h * 0.12), d + 0.08), glass);
          windowBand.position.set(bx, h * 0.66, bz);
          group.add(windowBand);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.45, d + 0.5), accent);
          roof.position.set(bx, h + 0.2, bz);
          group.add(roof);
        }
        const base = new THREE.Mesh(new THREE.BoxGeometry(footprint * (isSettlement ? 1.8 : 1.3), 0.35, footprint * (isSettlement ? 1.8 : 1.1)), stoneMat);
        base.position.y = 0.1;
        group.add(base);
        if (poi.type === 'airport') {
          const runwayMat = POIGenerator.getSharedMat('poi_runway', () => {
            const runwayPBR = getAsphaltPBR();
            return new THREE.MeshStandardMaterial({
              color: 0xffffff,
              map: runwayPBR.albedo,
              normalMap: runwayPBR.normal,
              normalScale: new THREE.Vector2(0.8, 0.8),
              roughnessMap: runwayPBR.roughness,
              roughness: 0.9,
            });
          });
          const runway = new THREE.Mesh(new THREE.BoxGeometry(13, 0.12, 75), runwayMat);
          runway.position.set(0, 0.3, -48);
          // Air Traffic Control Tower
          const atcShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 16, 8), concrete);
          atcShaft.position.set(16, 8.0, -8);
          const atcCab = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.4, 2.8, 8), glass);
          atcCab.position.set(16, 17.2, -8);
          group.add(runway, atcShaft, atcCab);
        }
        if (poi.type === 'freight_terminal' && poi.name.includes('Seaport')) {
          const containerMatA = POIGenerator.getSharedMat('poi_cont_a', () => new THREE.MeshStandardMaterial({ color: 0xb9382c, roughness: 0.65, metalness: 0.4 }));
          const containerMatB = POIGenerator.getSharedMat('poi_cont_b', () => new THREE.MeshStandardMaterial({ color: 0x265c85, roughness: 0.65, metalness: 0.4 }));
          for (let c = 0; c < 4; c++) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 6.2), c % 2 === 0 ? containerMatA : containerMatB);
            box.position.set(-14 + c * 3.4, 1.5 + (c % 2) * 2.6, 14);
            group.add(box);
          }
          const craneMast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 18, 1.6), accent);
          craneMast.position.set(-14, 9, -6);
          const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 22), accent);
          craneBoom.position.set(-14, 17.8, 2);
          group.add(craneMast, craneBoom);
        }
        if (poi.name.includes('—')) {
          const n = poi.name;
          if (n.includes('Hawa Mahal')) {
            // Jaipur pink-terracotta tiered honeycomb facade + 3 chhatri domes
            const terracotta = POIGenerator.getSharedMat('lm_terracotta', () => new THREE.MeshStandardMaterial({ color: 0xd67c65, roughness: 0.78 }));
            const creamTrim = POIGenerator.getSharedMat('lm_cream', () => new THREE.MeshStandardMaterial({ color: 0xf4e8d8, roughness: 0.72 }));
            for (let tier = 0; tier < 4; tier++) {
              const tw = 16 - tier * 2.6;
              const th = 3.2;
              const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(tw, th, 4.2 - tier * 0.4), terracotta);
              tierMesh.position.set(22, 1.8 + tier * 3.1, 0);
              group.add(tierMesh);
              const cornice = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.5, 0.25, 4.6 - tier * 0.4), creamTrim);
              cornice.position.set(22, 3.4 + tier * 3.1, 0);
              group.add(cornice);
            }
            for (const dx of [-3.2, 0, 3.2]) {
              const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), creamTrim);
              dome.position.set(22 + dx, 14.3, 0);
              group.add(dome);
            }
          } else if (n.includes('Giza')) {
            // Giza Great Pyramids trio
            const sandstone = POIGenerator.getSharedMat('lm_giza', () => new THREE.MeshStandardMaterial({ color: 0xd8b882, roughness: 0.88 }));
            const pyr1 = new THREE.Mesh(new THREE.ConeGeometry(16, 22, 4), sandstone);
            pyr1.position.set(24, 11, -4);
            pyr1.rotation.y = Math.PI / 4;
            const pyr2 = new THREE.Mesh(new THREE.ConeGeometry(11, 16, 4), sandstone);
            pyr2.position.set(42, 8, 12);
            pyr2.rotation.y = Math.PI / 4;
            const pyr3 = new THREE.Mesh(new THREE.ConeGeometry(7, 10, 4), sandstone);
            pyr3.position.set(14, 5, 16);
            pyr3.rotation.y = Math.PI / 4;
            group.add(pyr1, pyr2, pyr3);
          } else if (n.includes('Iron Lattice Tower')) {
            // Paris Eiffel 4-leg tapered lattice tower + 3 observation decks
            const iron = POIGenerator.getSharedMat('lm_iron', () => new THREE.MeshStandardMaterial({ color: 0x4c433b, roughness: 0.55, metalness: 0.72 }));
            for (const [lx, lz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.35, 12, 6), iron);
              leg.position.set(24 + lx * 0.65, 6, lz * 0.65);
              leg.rotation.z = lx > 0 ? 0.22 : -0.22;
              leg.rotation.x = lz > 0 ? -0.22 : 0.22;
              group.add(leg);
            }
            const deck1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 7.5), iron);
            deck1.position.set(24, 11.5, 0);
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 2.8, 22, 4), iron);
            shaft.position.set(24, 22.5, 0);
            shaft.rotation.y = Math.PI / 4;
            const deck2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 4.2), iron);
            deck2.position.set(24, 21.0, 0);
            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.35, 7, 6), iron);
            antenna.position.set(24, 36.5, 0);
            group.add(deck1, shaft, deck2, antenna);
          } else if (n.includes('Kartavya Arch')) {
            // New Delhi Memorial Arch
            const sandstone = POIGenerator.getSharedMat('lm_delhi_arch', () => new THREE.MeshStandardMaterial({ color: 0xd4b68c, roughness: 0.82 }));
            const pillarL = new THREE.Mesh(new THREE.BoxGeometry(3.8, 18, 5.2), sandstone);
            pillarL.position.set(19.5, 9, 0);
            const pillarR = new THREE.Mesh(new THREE.BoxGeometry(3.8, 18, 5.2), sandstone);
            pillarR.position.set(28.5, 9, 0);
            const lintel = new THREE.Mesh(new THREE.BoxGeometry(14.5, 5.2, 5.8), sandstone);
            lintel.position.set(24, 19.5, 0);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.8, 4.5), sandstone);
            cap.position.set(24, 23.0, 0);
            group.add(pillarL, pillarR, lintel, cap);
          } else if (n.includes('Westminster Clock Tower')) {
            // London Elizabeth Tower (Big Ben)
            const masonry = POIGenerator.getSharedMat('lm_bigben', () => new THREE.MeshStandardMaterial({ color: 0xc9b38c, roughness: 0.75 }));
            const dialMat = POIGenerator.getSharedMat('lm_clock_face', () => new THREE.MeshStandardMaterial({ color: 0xfff3d1, emissive: 0xffd27d, emissiveIntensity: 0.65 }));
            const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 24, 5.2), masonry);
            body.position.set(22, 12, 0);
            const dialBox = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.2, 5.6), dialMat);
            dialBox.position.set(22, 22, 0);
            const spire = new THREE.Mesh(new THREE.ConeGeometry(3.9, 9, 4), metalMat);
            spire.position.set(22, 28.5, 0);
            spire.rotation.y = Math.PI / 4;
            group.add(body, dialBox, spire);
          } else if (n.includes('Flavian Amphitheatre')) {
            // Rome Colosseum stepped elliptical colonnade ring
            const travertine = POIGenerator.getSharedMat('lm_rome', () => new THREE.MeshStandardMaterial({ color: 0xd6c2a2, roughness: 0.85 }));
            const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(14, 14.5, 8.5, 18, 1, true), travertine);
            ring1.position.set(24, 4.25, 0);
            const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 12.6, 6.2, 16, 1, true), travertine);
            ring2.position.set(24, 3.1, 0);
            group.add(ring1, ring2);
          } else if (n.includes('Harbor Shells')) {
            // Sydney Harbor parabolic white sail shells
            const whiteSail = POIGenerator.getSharedMat('lm_sail', () => new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.12 }));
            for (let s = 0; s < 3; s++) {
              const shell = new THREE.Mesh(new THREE.ConeGeometry(5.5 - s * 0.6, 11 - s * 1.2, 8), whiteSail);
              shell.scale.set(0.75, 1.0, 1.35);
              shell.rotation.x = 0.26;
              shell.position.set(18 + s * 6.5, 5.0 - s * 0.5, 0);
              group.add(shell);
            }
          } else {
            // Modern Skyscraper / Empire / Skytree / Burj Landmark Spire
            const spireBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 14.0, 8.5), stoneMat);
            spireBase.position.set(22, 7.0, 0);
            const midTier = new THREE.Mesh(new THREE.BoxGeometry(5.8, 14.0, 5.8), metalMat);
            midTier.position.set(22, 21.0, 0);
            const spireMast = new THREE.Mesh(new THREE.ConeGeometry(2.2, 18, 6), glass);
            spireMast.position.set(22, 37.0, 0);
            group.add(spireBase, midTier, spireMast);
          }
        }
        if (poi.type === 'hospital' || poi.type === 'police_station' || poi.type === 'fire_station') {
          const sign = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 0.25), accent);
          sign.position.set(0, 5.2, 7.7);
          group.add(sign);
        }
        break;
      }
      case 'media_station':
      case 'broadcast_center':
      case 'satellite_uplink': {
        const concrete = POIGenerator.getSharedMat('poi_media_conc', () => new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 }));
        const glass = POIGenerator.getSharedMat('poi_media_glass', () => new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.12, metalness: 0.35, envMapIntensity: 1.5 }));
        const dishMat = POIGenerator.getSharedMat('poi_media_dish', () => new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.45 }));
        const beaconMat = POIGenerator.getSharedMat('poi_media_beacon', () => new THREE.MeshBasicMaterial({ color: 0xef4444 }));

        const isCenter = poi.type === 'broadcast_center';
        const isUplink = poi.type === 'satellite_uplink';
        const w = isUplink ? 12 : isCenter ? 19 : 15;
        const d = isUplink ? 10 : isCenter ? 15 : 12;
        const h = isUplink ? 5.2 : isCenter ? 12.5 : 8.2;

        const pad = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.35, d + 4), stoneMat);
        pad.position.y = 0.17;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), concrete);
        hull.position.y = h / 2 + 0.3;
        const glassBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h * 0.32, d + 0.12), glass);
        glassBand.position.y = h * 0.56 + 0.3;
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, isCenter ? 11 : 8, 8), metalMat);
        mast.position.set(w * 0.22, h + (isCenter ? 5.8 : 4.3), -d * 0.18);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), beaconMat);
        beacon.position.set(w * 0.22, h + (isCenter ? 11.4 : 8.4), -d * 0.18);
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.35, 0.75, 14), dishMat);
        dish.position.set(-w * 0.25, h + 1.4, d * 0.1);
        dish.rotation.x = -Math.PI * 0.32;
        const sign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6, w * 0.5), 0.75, 0.24), glass);
        sign.position.set(0, Math.min(4.6, h * 0.65), d / 2 + 0.22);

        group.add(pad, hull, glassBand, mast, beacon, dish, sign);
        break;
      }
      default: {
        // Rustic wooden cabin
        const foundation = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 6), stoneMat);
        foundation.position.y = 0.2;

        const walls = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.8, 5.6), woodMat);
        walls.position.y = 1.6;

        const roofPitched = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.8, 4), woodMat);
        roofPitched.rotation.y = Math.PI / 4;
        roofPitched.position.y = 3.9;

        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.2, 0.8), stoneMat);
        chimney.position.set(2.4, 2.4, -1.8);

        group.add(foundation, walls, roofPitched, chimney);
      }
    }

    // Persistent Apocalyptic Decay: boarded entrances, broken dark glass, overgrown vines
    if (apocalypticSeverity > 0.25) {
      const plankA = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 0.14), woodMat);
      plankA.position.set(0, 1.9, 5.2);
      plankA.rotation.z = 0.18;
      const plankB = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 0.14), woodMat);
      plankB.position.set(0, 1.35, 5.2);
      plankB.rotation.z = -0.14;
      group.add(plankA, plankB);

      if (apocalypticSeverity > 0.55) {
        const vineMat = POIGenerator.getSharedMat(
          'poi_overgrown_vine',
          () => new THREE.MeshStandardMaterial({ color: 0x264223, roughness: 0.92 })
        );
        const vinePatch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.6, 0.22), vineMat);
        vinePatch.position.set(2.8, 2.1, 4.9);
        group.add(vinePatch);
      }
    }

    // Supply crate loot container inside / near POI
    if (poi.hasLoot && !poi.isLooted) {
      const crateMat = POIGenerator.getSharedMat('poi_crate', () => new THREE.MeshStandardMaterial({ color: 0xb5893e, roughness: 0.8 }));
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), crateMat);
      crate.name = `loot_${poi.id}`;
      crate.position.set(0.5, 0.6, 1.2);
      group.add(crate);
    }

    group.position.set(poi.position[0], poi.position[1], poi.position[2]);
    group.rotation.y = poi.rotationY;

    return group;
  }
}
