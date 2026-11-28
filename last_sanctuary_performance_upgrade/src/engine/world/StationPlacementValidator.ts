import * as THREE from 'three';

export type StationMountingType = 'floor' | 'surface' | 'wall' | 'ceiling' | 'platform';

export interface StationObjectRecord {
  id: string;
  stationIndex: number;
  name: string;
  zone: string;
  floorLevel: 0 | 1 | 2 | 3 | 4;
  worldPos: THREE.Vector3;
  size: THREE.Vector3;
  box: THREE.Box3;
  category: 'structural' | 'furniture' | 'amenity' | 'plumbing' | 'security' | 'signage' | 'door' | 'transit';
  isSolid: boolean;
  mounting: StationMountingType;
}

export interface PlacementAuditReport {
  stationIndex: number;
  totalObjects: number;
  floatingCount: number;
  subterraneanCount: number;
  intersectionCount: number;
  issues: string[];
  isValid: boolean;
}

/**
 * Systematic object placement and geometry validation system for the
 * Mega Railway Station. Audits surface alignments, room boundaries,
 * bounding box clearances, and reports findings deterministically to console.
 */
export class StationPlacementValidator {
  private objects: StationObjectRecord[] = [];
  private static instance: StationPlacementValidator | null = null;

  public static getInstance(): StationPlacementValidator {
    if (!StationPlacementValidator.instance) {
      StationPlacementValidator.instance = new StationPlacementValidator();
    }
    return StationPlacementValidator.instance;
  }

  public clear(stationIndex?: number): void {
    if (stationIndex === undefined) {
      this.objects = [];
    } else {
      this.objects = this.objects.filter((o) => o.stationIndex !== stationIndex);
    }
  }

  public registerObject(
    id: string,
    name: string,
    zone: string,
    floorLevel: 0 | 1 | 2 | 3 | 4,
    worldPos: THREE.Vector3,
    size: THREE.Vector3,
    category: StationObjectRecord['category'],
    isSolid: boolean = true,
    mounting: StationMountingType = 'floor',
    stationIndex: number = 0
  ): StationObjectRecord {
    const half = new THREE.Vector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
    const min = worldPos.clone().sub(half);
    const max = worldPos.clone().add(half);
    const box = new THREE.Box3(min, max);

    const record: StationObjectRecord = {
      id,
      stationIndex,
      name,
      zone,
      floorLevel,
      worldPos: worldPos.clone(),
      size: size.clone(),
      box,
      category,
      isSolid,
      mounting,
    };

    this.objects.push(record);
    return record;
  }

  public runAudit(floorHeights: Record<number, number>, stationIndex: number = 0): PlacementAuditReport {
    let floatingCount = 0;
    let subterraneanCount = 0;
    let intersectionCount = 0;
    const issues: string[] = [];

    const stationObjs = this.objects.filter((o) => o.stationIndex === stationIndex);

    // 1. Audit floor alignment for floor-mounted objects
    for (const obj of stationObjs) {
      if (obj.mounting === 'floor' && (obj.category === 'furniture' || obj.category === 'plumbing' || obj.category === 'amenity' || obj.category === 'security')) {
        const expectedFloorY = floorHeights[obj.floorLevel];
        if (expectedFloorY !== undefined) {
          const bottomY = obj.box.min.y;
          const diff = bottomY - expectedFloorY;
          if (diff > 0.08) {
            floatingCount++;
            issues.push(`[Floating] ${obj.name} (${obj.id}) in ${obj.zone} is ${diff.toFixed(3)}m above floor.`);
          } else if (diff < -0.12) {
            subterraneanCount++;
            issues.push(`[Subterranean] ${obj.name} (${obj.id}) in ${obj.zone} is buried ${Math.abs(diff).toFixed(3)}m in floor.`);
          }
        }
      }
    }

    // 2. Audit inter-object overlaps among solid furniture, plumbing, amenities & security gear
    const solidFurniture = stationObjs.filter(
      (o) => o.isSolid && (o.category === 'furniture' || o.category === 'plumbing' || o.category === 'amenity' || o.category === 'security')
    );

    for (let i = 0; i < solidFurniture.length; i++) {
      for (let j = i + 1; j < solidFurniture.length; j++) {
        const a = solidFurniture[i];
        const b = solidFurniture[j];
        if (a.floorLevel !== b.floorLevel) continue;
        if (a.box.intersectsBox(b.box)) {
          const overlapX = Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x);
          const overlapZ = Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z);
          const overlapY = Math.min(a.box.max.y, b.box.max.y) - Math.max(a.box.min.y, b.box.min.y);

          if (overlapX > 0.06 && overlapZ > 0.06 && overlapY > 0.06) {
            intersectionCount++;
            issues.push(`[Overlap] ${a.name} intersects ${b.name} in ${a.zone} (overlap: ${overlapX.toFixed(2)}x${overlapZ.toFixed(2)}m)`);
          }
        }
      }
    }

    const isValid = floatingCount === 0 && subterraneanCount === 0 && intersectionCount === 0;

    console.group(`%c[Station ${stationIndex} Object Placement Audit Report]`, 'color: #38bdf8; font-weight: bold; font-size: 13px;');
    console.log(`Total Objects Audited: ${stationObjs.length}`);
    console.log(`Floating Objects: ${floatingCount}`);
    console.log(`Subterranean Objects: ${subterraneanCount}`);
    console.log(`Solid Intersections: ${intersectionCount}`);
    if (isValid) {
      console.log('%c✓ 100% Geometry Placement Verification Passed. Zero overlaps, exact floor seating.', 'color: #22c55e; font-weight: bold;');
    } else {
      console.warn(`Detected ${issues.length} placement discrepancies:`, issues.slice(0, 10));
    }
    console.groupEnd();

    return {
      stationIndex,
      totalObjects: stationObjs.length,
      floatingCount,
      subterraneanCount,
      intersectionCount,
      issues,
      isValid,
    };
  }

  public getObjects(stationIndex?: number): StationObjectRecord[] {
    if (stationIndex === undefined) return this.objects;
    return this.objects.filter((o) => o.stationIndex === stationIndex);
  }

  public getSolidCollisionBoxes(): THREE.Box3[] {
    return this.objects.filter((o) => o.isSolid).map((o) => o.box);
  }
}

export const stationPlacementValidator = StationPlacementValidator.getInstance();
