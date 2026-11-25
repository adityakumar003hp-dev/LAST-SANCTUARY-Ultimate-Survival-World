/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  MapPin,
  Shield,
  Compass,
  Car,
  Trash2,
  Navigation,
  ZoomIn,
  ZoomOut,
  Globe,
  Plane,
  Search,
  Activity,
} from 'lucide-react';
import { PlacedStructure, ZombieEntity, HarvestableResource, MapWaypoint } from '../types/game';
import { BiomeGenerator } from '../engine/world/BiomeGenerator';
import { getContinentDisplayPolygons, REAL_EARTH_DATA_SOURCES } from '../engine/geo/RealEarthDataset';
import { REAL_WORLD_CITIES } from '../engine/geo/RealWorldCities';
import { EarthProjection } from '../engine/geo/EarthProjection';
import {
  CityOutbreakTelemetry,
  GlobalOutbreakMetrics,
  OutbreakDangerLevel,
} from '../engine/world/GlobalOutbreakSimulator';
import { soundEngine } from '../utils/audio';
import { BiomeOutbreakTrackerD3 } from './BiomeOutbreakTrackerD3';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  playerYaw: number;
  safeZoneCenter: [number, number, number];
  safeZoneRadius: number;
  structures: PlacedStructure[];
  zombies: ZombieEntity[];
  resources: HarvestableResource[];
  discoveredChunks?: Set<string>;
  waypoints?: MapWaypoint[];
  onAddWaypoint?: (wp: MapWaypoint) => void;
  onRemoveWaypoint?: (id: string) => void;
  vehiclePos?: [number, number, number];
  earthLat?: number;
  earthLon?: number;
  realElevationMeters?: number;
  countryName?: string;
  continentOrOcean?: string;
  nearestCityName?: string;
  globalCities?: CityOutbreakTelemetry[];
  globalMetrics?: GlobalOutbreakMetrics;
  onTravelToGeoCoordinate?: (lat: number, lon: number, label?: string) => void;
}

const DANGER_COLOR: Record<OutbreakDangerLevel, string> = {
  Safe: '#10b981',
  Alert: '#f59e0b',
  Containment: '#f97316',
  Overrun: '#f43f5e',
  Critical: '#dc2626',
};

const DANGER_BADGE: Record<OutbreakDangerLevel, string> = {
  Safe: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  Alert: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  Containment: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  Overrun: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  Critical: 'border-red-500/50 bg-red-600/20 text-red-300',
};

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerYaw,
  safeZoneCenter,
  safeZoneRadius,
  zombies = [],
  waypoints = [],
  onAddWaypoint,
  onRemoveWaypoint,
  vehiclePos,
  earthLat = 45.5152,
  earthLon = -122.6784,
  realElevationMeters = 120,
  countryName = 'United States',
  continentOrOcean = 'North America',
  nearestCityName,
  globalCities,
  globalMetrics,
  onTravelToGeoCoordinate,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'atlas' | 'biomes'>('local');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [cityFilter, setCityFilter] = useState('');
  const [continentFilter, setContinentFilter] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>(REAL_WORLD_CITIES[0].id);

  const continentPaths = useMemo(() => {
    return getContinentDisplayPolygons().map((p) => {
      const d =
        p.poly
          .map(([lat, lon], idx) => `${idx === 0 ? 'M' : 'L'} ${lon.toFixed(2)} ${(-lat).toFixed(2)}`)
          .join(' ') + ' Z';
      return { id: p.id, continent: p.continent, isIsland: p.isIsland, d };
    });
  }, []);

  const fallbackCities: CityOutbreakTelemetry[] = useMemo(
    () =>
      REAL_WORLD_CITIES.map((c) => ({
        city: c,
        healthyCount: c.population,
        transformingCount: 0,
        infectedCount: 0,
        evacuatedCount: 0,
        powerGridRatio: 1.0,
        dangerLevel: 'Safe' as OutbreakDangerLevel,
      })),
    []
  );

  const citiesList = globalCities && globalCities.length > 0 ? globalCities : fallbackCities;

  const filteredCities = useMemo(() => {
    const q = cityFilter.trim().toLowerCase();
    return citiesList.filter((entry) => {
      if (continentFilter !== 'ALL' && entry.city.continent !== continentFilter) return false;
      if (!q) return true;
      return (
        entry.city.name.toLowerCase().includes(q) ||
        entry.city.country.toLowerCase().includes(q)
      );
    });
  }, [citiesList, cityFilter, continentFilter]);

  const selectedCityEntry = useMemo(
    () => citiesList.find((c) => c.city.id === selectedCityId) || citiesList[0],
    [citiesList, selectedCityId]
  );

  if (!isOpen) return null;

  const currentBiome = BiomeGenerator.getBiomeAt(playerPos[0], playerPos[2]);
  const viewSpan = 800 / zoomLevel;
  const mapWidth = 560;
  const mapHeight = 520;
  const centerWorldX = playerPos[0] + panOffset.x;
  const centerWorldZ = playerPos[2] + panOffset.z;

  const toScreenCoord = (wx: number, wz: number): [number, number] => {
    const relX = wx - centerWorldX;
    const relZ = wz - centerWorldZ;
    const sx = (relX / viewSpan + 0.5) * mapWidth;
    const sz = (relZ / viewSpan + 0.5) * mapHeight;
    return [sx, sz];
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickSx = e.clientX - rect.left;
    const clickSz = e.clientY - rect.top;

    const relX = (clickSx / mapWidth - 0.5) * viewSpan;
    const relZ = (clickSz / mapHeight - 0.5) * viewSpan;
    const worldX = Math.round(centerWorldX + relX);
    const worldZ = Math.round(centerWorldZ + relZ);

    if (onAddWaypoint) {
      soundEngine.playBuildSnap();
      onAddWaypoint({
        id: `wp_${Date.now()}`,
        name: `Waypoint (${worldX}, ${worldZ})`,
        position: [worldX, 0, worldZ],
        icon: 'MapPin',
        color: '#f59e0b',
        isCustom: true,
      });
    }
  };

  const [playerSx, playerSz] = toScreenCoord(playerPos[0], playerPos[2]);
  const [safeSx, safeSz] = toScreenCoord(safeZoneCenter[0], safeZoneCenter[2]);
  const safeRadiusPx = (safeZoneRadius / viewSpan) * mapWidth;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 select-none font-sans">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-5 py-3.5 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20 text-amber-400">
              {activeTab === 'atlas' ? (
                <Globe className="h-5 w-5 text-sky-400" />
              ) : activeTab === 'biomes' ? (
                <Activity className="h-5 w-5 text-rose-400" />
              ) : (
                <Compass className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-wide">
                  {activeTab === 'atlas'
                    ? 'Real Earth Global Atlas & Outbreak Telemetry'
                    : activeTab === 'biomes'
                      ? 'Global Outbreak Tracker — 37 Biomes (D3 Live Telemetry)'
                      : 'Topographical World Cartography'}
                </h2>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-mono text-emerald-400 border border-neutral-700">
                  {currentBiome.name}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                {EarthProjection.formatLatLon(earthLat, earthLon)} · {nearestCityName ? `${nearestCityName} · ` : ''}
                {countryName} ({continentOrOcean}) · {realElevationMeters}m ASL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Triple Tab Toggle */}
            <div className="flex rounded-xl border border-neutral-800 bg-neutral-900 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${
                  activeTab === 'local' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Local Radar</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('atlas')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${
                  activeTab === 'atlas' ? 'bg-sky-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Earth Atlas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('biomes')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${
                  activeTab === 'biomes' ? 'bg-rose-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Global Outbreak Tracker</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === 'local' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-950">
            {/* Main Map Viewport */}
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
              <div
                onClick={handleMapClick}
                className="relative rounded-2xl border-2 border-neutral-800 bg-[#141c14] overflow-hidden shadow-2xl cursor-crosshair"
                style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:64px_64px]" />

                <div
                  className="absolute rounded-full border-2 border-emerald-500/80 bg-emerald-500/15 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${safeSx}px`,
                    top: `${safeSz}px`,
                    width: `${Math.max(16, safeRadiusPx * 2)}px`,
                    height: `${Math.max(16, safeRadiusPx * 2)}px`,
                  }}
                />

                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
                  style={{ left: `${safeSx}px`, top: `${safeSz}px` }}
                >
                  <div className="rounded-full bg-emerald-500 p-1 shadow-lg text-black">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono mt-0.5 drop-shadow">
                    SANCTUARY
                  </span>
                </div>

                {waypoints.map((wp) => {
                  const [sx, sz] = toScreenCoord(wp.position[0], wp.position[2]);
                  if (sx < -20 || sx > mapWidth + 20 || sz < -20 || sz > mapHeight + 20) return null;
                  return (
                    <div
                      key={wp.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-15"
                      style={{ left: `${sx}px`, top: `${sz}px` }}
                    >
                      <MapPin className="h-5 w-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                      <span className="text-[9px] font-bold text-amber-300 font-mono drop-shadow">
                        {wp.name}
                      </span>
                    </div>
                  );
                })}

                {vehiclePos && (() => {
                  const [vx, vz] = toScreenCoord(vehiclePos[0], vehiclePos[2]);
                  return (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20"
                      style={{ left: `${vx}px`, top: `${vz}px` }}
                    >
                      <div className="rounded-full bg-sky-500 p-1 shadow-md text-black">
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[9px] font-bold text-sky-300 font-mono mt-0.5">NOMAD EV</span>
                    </div>
                  );
                })()}

                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center"
                  style={{ left: `${playerSx}px`, top: `${playerSz}px` }}
                >
                  <div
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[18px] border-b-rose-500 drop-shadow-lg"
                    style={{ transform: `rotate(${playerYaw + Math.PI}rad)` }}
                  />
                  <div className="absolute h-3.5 w-3.5 rounded-full bg-rose-600 border-2 border-white shadow-xl" />
                </div>

                <div className="absolute bottom-3 left-4 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 pointer-events-none">
                  Click map to drop GPS Waypoint • World X: {Math.round(playerPos[0])}m, Z: {Math.round(playerPos[2])}m
                </div>
              </div>

              <div className="absolute top-6 right-6 flex flex-col gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
                  className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.3))}
                  className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPanOffset({ x: 0, z: 0 })}
                  className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                  title="Center on Survivor"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-neutral-800 p-4 bg-neutral-900/20 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Active Waypoints ({waypoints.length})
              </h4>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                {waypoints.map((wp) => {
                  const dist = Math.round(Math.hypot(wp.position[0] - playerPos[0], wp.position[2] - playerPos[2]));
                  return (
                    <div key={wp.id} className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-200">{wp.name}</div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {dist}m away • [X: {wp.position[0]}, Z: {wp.position[2]}]
                        </div>
                      </div>
                      {wp.isCustom && onRemoveWaypoint && (
                        <button
                          onClick={() => onRemoveWaypoint(wp.id)}
                          className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'biomes' ? (
          <div className="flex-1 flex overflow-hidden bg-neutral-950">
            <BiomeOutbreakTrackerD3
              currentBiomeId={currentBiome.id}
              zombies={zombies}
              globalMetrics={globalMetrics}
              globalCities={citiesList}
            />
          </div>
        ) : (
          /* Real Earth Global Atlas Tab */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-neutral-950">
            <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
              {/* Global Outbreak Telemetry Strip */}
              {globalMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                    <div className="text-[10px] text-neutral-400 uppercase">Global Severity</div>
                    <div className="font-bold text-amber-400">
                      {Math.round(globalMetrics.apocalypticSeverity * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                    <div className="text-[10px] text-neutral-400 uppercase">Infected / Stunned</div>
                    <div className="font-bold text-rose-400 truncate">
                      {(globalMetrics.totalInfected / 1_000_000).toFixed(2)}M / {(globalMetrics.totalTransforming / 1000).toFixed(1)}k
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                    <div className="text-[10px] text-neutral-400 uppercase">Power Grid</div>
                    <div className="font-bold text-sky-400">
                      {Math.round(globalMetrics.powerGridStability * 100)}% Online
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                    <div className="text-[10px] text-neutral-400 uppercase">Overrun Hubs</div>
                    <div className="font-bold text-orange-300">
                      {globalMetrics.overrunCitiesCount} / {citiesList.length}
                    </div>
                  </div>
                </div>
              )}

              {/* SVG WGS-84 Equirectangular Earth Map */}
              <div className="relative flex-1 rounded-2xl border border-neutral-800 bg-[#061322] overflow-hidden shadow-inner flex items-center justify-center">
                <svg viewBox="-180 -90 360 180" className="w-full h-full">
                  {/* Ocean Graticule */}
                  {[-120, -60, 0, 60, 120].map((lon) => (
                    <line key={`lon_${lon}`} x1={lon} y1={-90} x2={lon} y2={90} stroke="#16304d" strokeWidth="0.35" />
                  ))}
                  {[-60, -30, 0, 30, 60].map((lat) => (
                    <line
                      key={`lat_${lat}`}
                      x1={-180}
                      y1={-lat}
                      x2={180}
                      y2={-lat}
                      stroke={lat === 0 ? '#1e446b' : '#16304d'}
                      strokeWidth={lat === 0 ? '0.5' : '0.35'}
                    />
                  ))}

                  {/* Continents & Major Islands from RealEarthDataset */}
                  {continentPaths.map((cp) => (
                    <path
                      key={cp.id}
                      d={cp.d}
                      fill={cp.continent === 'Antarctica' ? '#cbd5e1' : '#263a2a'}
                      stroke="#4b6b50"
                      strokeWidth="0.45"
                    />
                  ))}

                  {/* Real World Cities Colored by Outbreak Danger */}
                  {citiesList.map((entry) => {
                    const isSelected = entry.city.id === selectedCityEntry?.city.id;
                    const color = DANGER_COLOR[entry.dangerLevel];
                    return (
                      <g
                        key={entry.city.id}
                        className="cursor-pointer"
                        onClick={() => {
                          soundEngine.playUIClick();
                          setSelectedCityId(entry.city.id);
                        }}
                      >
                        {isSelected && (
                          <circle
                            cx={entry.city.lon}
                            cy={-entry.city.lat}
                            r="4.2"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="0.7"
                          />
                        )}
                        <circle
                          cx={entry.city.lon}
                          cy={-entry.city.lat}
                          r={entry.city.tier === 'megacity' ? '2.1' : '1.5'}
                          fill={color}
                          stroke="#09090b"
                          strokeWidth="0.35"
                        />
                      </g>
                    );
                  })}

                  {/* Player Live WGS-84 Position Pin */}
                  <circle cx={earthLon} cy={-earthLat} r="3.4" fill="none" stroke="#ffffff" strokeWidth="0.7" />
                  <circle cx={earthLon} cy={-earthLat} r="1.7" fill="#38bdf8" />
                </svg>

                <div className="absolute bottom-2.5 left-3 flex flex-wrap gap-2 rounded-lg bg-neutral-950/85 border border-neutral-800 px-2.5 py-1 text-[10px] font-mono">
                  <span className="text-sky-400 font-bold">● YOU ({earthLat.toFixed(2)}°, {earthLon.toFixed(2)}°)</span>
                  <span className="text-emerald-400">● Safe</span>
                  <span className="text-amber-400">● Alert</span>
                  <span className="text-rose-400">● Overrun</span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 px-3 py-1.5 text-[10px] font-mono text-neutral-400 flex flex-wrap items-center justify-between gap-2">
                <span className="text-neutral-300 font-semibold">
                  GIS Sources: {REAL_EARTH_DATA_SOURCES.map((s) => s.layer).join(' · ')}
                </span>
                <span className="text-neutral-500">
                  Embedded Natural Earth + SRTM/HydroSHEDS offline model · Optional OpenStreetMap Overpass cache
                </span>
              </div>
            </div>

            {/* Right Sidebar: City Directory + Selected City Expedition Airlift */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-800 p-4 bg-neutral-900/20 flex flex-col gap-3 overflow-hidden">
              {selectedCityEntry && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-neutral-100">{selectedCityEntry.city.name}</div>
                      <div className="text-[11px] text-neutral-400">
                        {selectedCityEntry.city.country} · {selectedCityEntry.city.continent}
                      </div>
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${DANGER_BADGE[selectedCityEntry.dangerLevel]}`}>
                      {selectedCityEntry.dangerLevel}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-300 grid grid-cols-2 gap-1 pt-1 border-t border-neutral-800">
                    <span>Coords: {selectedCityEntry.city.lat.toFixed(2)}, {selectedCityEntry.city.lon.toFixed(2)}</span>
                    <span>Grid: {Math.round(selectedCityEntry.powerGridRatio * 100)}%</span>
                    <span className="text-emerald-400">Healthy: {selectedCityEntry.healthyCount.toLocaleString()}</span>
                    <span className="text-rose-400">Infected: {selectedCityEntry.infectedCount.toLocaleString()}</span>
                  </div>
                  {selectedCityEntry.city.landmarkName && (
                    <div className="text-[10px] text-amber-300/90 flex items-center gap-1">
                      <Activity className="h-3 w-3 shrink-0" />
                      <span className="truncate">{selectedCityEntry.city.landmarkName}</span>
                    </div>
                  )}
                  {onTravelToGeoCoordinate && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playBuildSnap();
                        onTravelToGeoCoordinate(
                          selectedCityEntry.city.lat,
                          selectedCityEntry.city.lon,
                          selectedCityEntry.city.name
                        );
                        onClose();
                      }}
                      className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs py-2 px-3 transition-colors cursor-pointer"
                    >
                      <Plane className="h-3.5 w-3.5" />
                      <span>Deploy / Airlift to {selectedCityEntry.city.name}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Search & Continent Filter */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="Search real Earth cities..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <select
                  value={continentFilter}
                  onChange={(e) => setContinentFilter(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="ALL">All Continents ({citiesList.length} hubs)</option>
                  <option value="Asia">Asia</option>
                  <option value="Europe">Europe</option>
                  <option value="North America">North America</option>
                  <option value="South America">South America</option>
                  <option value="Africa">Africa</option>
                  <option value="Australia & Oceania">Australia & Oceania</option>
                  <option value="Antarctica">Antarctica</option>
                </select>
              </div>

              {/* Scrollable City List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {filteredCities.map((entry) => {
                  const selected = entry.city.id === selectedCityEntry?.city.id;
                  return (
                    <button
                      key={entry.city.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUIClick();
                        setSelectedCityId(entry.city.id);
                      }}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-sky-500/70 bg-sky-500/15'
                          : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-200 truncate">{entry.city.name}</div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {entry.city.country} · {entry.city.tier}
                        </div>
                      </div>
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DANGER_COLOR[entry.dangerLevel] }}
                        title={entry.dangerLevel}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
