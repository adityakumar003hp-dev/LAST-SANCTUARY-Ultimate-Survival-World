/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { POIStructure } from '../../types/game';
import { TerrainGenerator } from './TerrainGenerator';
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
   * Deterministically decides if a chunk has a POI structure
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
    const chance = hash(cx, cz, 1);
    // Approximately 35% of chunks contain one deterministic destination.
    if (chance > 0.65) return [];
    const density = hash(cx, cz, 3);
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
    const y = TerrainGenerator.getHeight(worldX, worldZ, worldSeed);
    const roll = hash(cx, cz, 6);
    let type: POIStructure['type'] = 'cabin';
    let name = 'Abandoned Survivor Cabin';
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
    else if (roll < 0.67) { type = 'university'; name = 'Westbridge University Campus'; }
    else if (roll < 0.73) { type = 'shopping_centre'; name = 'Cedar Mall & Market'; }
    else if (roll < 0.79) { type = 'freight_terminal'; name = 'Interstate Freight Terminal'; }
    else if (roll < 0.85) { type = 'warehouse'; name = 'Overgrown Logistics Depot'; }
    else if (roll < 0.90) { type = 'gas_station'; name = 'Route 9 Auto Service Station'; }
    else if (roll < 0.95) { type = 'watchtower'; name = 'Forestry Fire Lookout'; }
    else { type = 'radio_bunker'; name = 'Civil Defense Communications Bunker'; }
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
   * Builds high-fidelity composite 3D meshes (3-10 parts) for procedural POIs
   */
  public static createPOIMesh(poi: POIStructure): THREE.Group {
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
          group.add(runway);
        }
        if (poi.type === 'hospital' || poi.type === 'police_station' || poi.type === 'fire_station') {
          const sign = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 0.25), accent);
          sign.position.set(0, 5.2, 7.7);
          group.add(sign);
        }
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
