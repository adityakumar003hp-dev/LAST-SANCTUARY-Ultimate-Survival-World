import { TerrainGenerator } from './TerrainGenerator';

const STATION_SPACING = 1200;
const GRADE_SAMPLE_SPACING = 64;

/**
 * Shared surveyed rail elevation used by track meshes and moving trains.
 * The terrain is sampled on a world-aligned grid and smoothly interpolated,
 * preventing the track mesh and train from following different height curves.
 */
export function getRailwayGradeY(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x / GRADE_SAMPLE_SPACING) * GRADE_SAMPLE_SPACING;
  const x1 = x0 + GRADE_SAMPLE_SPACING;
  const t0 = (x - x0) / GRADE_SAMPLE_SPACING;
  const t = t0 * t0 * (3 - 2 * t0);
  const terrainY = TerrainGenerator.getHeight(x0, z, seed) * (1 - t)
    + TerrainGenerator.getHeight(x1, z, seed) * t;

  const stationX = Math.round(x / STATION_SPACING) * STATION_SPACING;
  const stationDistance = Math.abs(x - stationX);
  if (stationDistance >= 180) return terrainY;

  const stationY = TerrainGenerator.getHeight(stationX, z, seed);
  if (stationDistance <= 84) return stationY;
  const blendRaw = (stationDistance - 84) / 96;
  const blend = blendRaw * blendRaw * (3 - 2 * blendRaw);
  return stationY * (1 - blend) + terrainY * blend;
}
