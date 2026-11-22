/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, MapPin, Shield, Skull, Compass, Car, Plus, Trash2, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import { PlacedStructure, ZombieEntity, HarvestableResource, MapWaypoint } from '../types/game';
import { BiomeGenerator } from '../engine/world/BiomeGenerator';
import { soundEngine } from '../utils/audio';

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
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerYaw,
  safeZoneCenter,
  safeZoneRadius,
  structures,
  zombies,
  resources,
  discoveredChunks = new Set(['0_0']),
  waypoints = [],
  onAddWaypoint,
  onRemoveWaypoint,
  vehiclePos,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.5x to 2.5x
  const [panOffset, setPanOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [activeWaypointForm, setActiveWaypointForm] = useState(false);
  const [customWpName, setCustomWpName] = useState('');

  if (!isOpen) return null;

  const currentBiome = BiomeGenerator.getBiomeAt(playerPos[0], playerPos[2]);
  const viewSpan = 800 / zoomLevel; // meters shown across viewport
  const mapWidth = 560;
  const mapHeight = 520;

  // Center the view on player + pan offset
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none font-sans">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20 text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide">Topographical World Cartography</h2>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-mono text-emerald-400 border border-neutral-700">
                  {currentBiome.name}
                </span>
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-mono text-neutral-300">
                  {currentBiome.temperature}°C
                </span>
              </div>
              <p className="text-xs text-neutral-400">Dynamic Chunk Grid • Infinite Open World Radar</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-amber-400 font-bold bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
              X: {Math.round(playerPos[0])} • Z: {Math.round(playerPos[2])}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Map Center & Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-950">
          {/* Main Map Viewport */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            <div
              onClick={handleMapClick}
              className="relative rounded-2xl border-2 border-neutral-800 bg-[#141c14] overflow-hidden shadow-2xl cursor-crosshair"
              style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
            >
              {/* Grid Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:64px_64px]" />

              {/* Sanctuary Safe Zone Circle */}
              <div
                className="absolute rounded-full border-2 border-emerald-500/80 bg-emerald-500/15 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${safeSx}px`,
                  top: `${safeSz}px`,
                  width: `${Math.max(16, safeRadiusPx * 2)}px`,
                  height: `${Math.max(16, safeRadiusPx * 2)}px`,
                }}
              />

              {/* Sanctuary Home Marker */}
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

              {/* Waypoints */}
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

              {/* Electric Buggy Location Marker */}
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

              {/* Player Avatar Marker & Direction Cone */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center"
                style={{ left: `${playerSx}px`, top: `${playerSz}px` }}
              >
                {/* Vision heading arrow */}
                <div
                  className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[18px] border-b-rose-500 drop-shadow-lg"
                  style={{ transform: `rotate(${playerYaw + Math.PI}rad)` }}
                />
                <div className="absolute h-3.5 w-3.5 rounded-full bg-rose-600 border-2 border-white shadow-xl" />
              </div>

              {/* Bottom Instructions Badge */}
              <div className="absolute bottom-3 left-4 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 backdrop-blur-sm pointer-events-none">
                Click map to drop GPS Waypoint • Radar shows 100% active chunks
              </div>
            </div>

            {/* Map Controls */}
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

          {/* Sidebar Waypoint Directory */}
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
      </div>
    </div>
  );
};
