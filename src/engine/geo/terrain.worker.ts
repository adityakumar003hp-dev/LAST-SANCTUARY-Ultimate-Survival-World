/// <reference lib="webworker" />
/**
 * Background Web Worker for off-thread Earth-scale chunk elevation sampling.
 * Keeps main Three.js render loop smooth while streaming terrain vertices.
 */

import { EarthProjection, DEFAULT_EARTH_ORIGIN } from './EarthProjection';
import { RealEarthDataset } from './RealEarthDataset';

export interface TerrainWorkerRequest {
  requestId: number;
  minX: number;
  minZ: number;
  chunkSize: number;
  segments: number;
  worldSeed: number;
  originLat: number;
  originLon: number;
}

export interface TerrainWorkerResponse {
  requestId: number;
  heights: Float32Array;
  minElevation: number;
  maxElevation: number;
}

function computeHeightAt(
  wx: number,
  wz: number,
  worldSeed: number,
  originLat: number,
  originLon: number
): number {
  const distFromOrigin = Math.hypot(wx, wz);
  const clearingFactor = Math.min(1.0, Math.max(0.0, (distFromOrigin - 80) / 40));

  const geoPos = EarthProjection.worldToLatLon(wx, wz, { lat: originLat, lon: originLon });
  const earth = RealEarthDataset.sampleEarthGeography(geoPos.lat, geoPos.lon);

  const o1 = Math.sin((wx + worldSeed * 13.7) * 0.0025) * Math.cos((wz + worldSeed * 7.1) * 0.0025) * 6.5;
  const o2 = Math.sin(wx * 0.012 + wz * 0.008 + worldSeed) * 3.5;
  const o3 = Math.sin(wx * 0.035 - wz * 0.028) * 1.4;
  const o4 = Math.sin(wx * 0.09 + wz * 0.075) * 0.45;

  const macroBlend = Math.min(1.0, Math.max(0.0, (distFromOrigin - 130) / 140));
  let height = (o1 + o2 + o3 + o4) * clearingFactor + earth.gameTerrainY * macroBlend;

  const riverWave = Math.sin(wz * 0.004) * 45;
  const riverDist = Math.abs(wx - 50 - riverWave);
  if (riverDist < 18) {
    const riverDepth = Math.cos((riverDist / 18) * Math.PI * 0.5) * 4.2;
    height -= riverDepth * clearingFactor;
  }

  return height;
}

self.onmessage = (event: MessageEvent<TerrainWorkerRequest>) => {
  const req = event.data;
  const cols = req.segments + 1;
  const heights = new Float32Array(cols * cols);
  let minElevation = 99999;
  let maxElevation = -99999;

  const step = req.chunkSize / req.segments;
  const originLat = req.originLat ?? DEFAULT_EARTH_ORIGIN.lat;
  const originLon = req.originLon ?? DEFAULT_EARTH_ORIGIN.lon;

  let idx = 0;
  for (let r = 0; r < cols; r++) {
    const wz = req.minZ + r * step;
    for (let c = 0; c < cols; c++) {
      const wx = req.minX + c * step;
      const h = computeHeightAt(wx, wz, req.worldSeed, originLat, originLon);
      heights[idx++] = h;
      if (h < minElevation) minElevation = h;
      if (h > maxElevation) maxElevation = h;
    }
  }

  const response: TerrainWorkerResponse = {
    requestId: req.requestId,
    heights,
    minElevation,
    maxElevation,
  };
  (self as unknown as { postMessage: (msg: TerrainWorkerResponse, transfer: Transferable[]) => void }).postMessage(
    response,
    [heights.buffer]
  );
};
