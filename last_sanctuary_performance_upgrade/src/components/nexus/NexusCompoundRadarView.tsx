import React, { useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Shield, DoorOpen, Lock } from 'lucide-react';
import { NEXUS_COMPOUND_RADAR_LAYERS } from '../../engine/nexus/NexusConfig';
import type { NexusDashboardSnapshot } from '../../engine/nexus/NexusSystems';
import type { SentryTurretState } from '../../engine/prologue/ApartmentTurrets';

interface NexusCompoundRadarViewProps {
  snapshot: NexusDashboardSnapshot;
  onToggleLayer: (layerId: string) => void;
  onToggleGate: (gateKey: 'main' | 'westPed' | 'eastPed' | 'veh1' | 'veh2' | 'garage') => void;
  onPrefsChange?: (rotationDeg: number, zoom: number) => void;
  focusLayerId?: string;
}

type InspectTarget =
  | { kind: 'building'; name: string; detail: string; stats: Array<[string, string]> }
  | { kind: 'turret'; turret: SentryTurretState }
  | { kind: 'gate'; key: 'main' | 'westPed' | 'eastPed' | 'veh1' | 'veh2' | 'garage'; name: string; open: boolean }
  | { kind: 'vehicle'; id: string }
  | { kind: 'player' }
  | null;

// Compound local coordinates relative to ApartmentBuilding.origin (-26, 0, 38):
// X spans -82..+18 (center -32, W=100), Z spans -75.5..+51.0 (center -12.25, D=126.5)
const CX = -32;
const CZ = -12.25;

export const NexusCompoundRadarView: React.FC<NexusCompoundRadarViewProps> = ({
  snapshot,
  onToggleLayer,
  onToggleGate,
  onPrefsChange,
  focusLayerId,
}) => {
  const [rotationDeg, setRotationDeg] = useState(snapshot.systems.radarPreferences.compoundRotationDeg);
  const [zoom, setZoom] = useState(snapshot.systems.radarPreferences.compoundZoom);
  const [dragging, setDragging] = useState(false);
  const [dragLastX, setDragLastX] = useState(0);
  const [selected, setSelected] = useState<InspectTarget>(null);

  const updateView = (nextRot: number, nextZoom: number) => {
    setRotationDeg(nextRot);
    setZoom(nextZoom);
    onPrefsChange?.(nextRot, nextZoom);
  };

  const layers = snapshot.systems.compoundLayers;
  const cmp = snapshot.live.compound;
  const player = snapshot.live.player;

  // Convert world position -> compound local (ApartmentBuilding.origin = -26, 0, 38)
  const worldToLocal = (wx: number, wz: number): [number, number] => [wx + 26, wz - 38];

  // Rotate & project compound local X/Z onto 560x560 SVG viewBox centered at (280, 280)
  const project = (lx: number, lz: number): [number, number] => {
    const dx = lx - CX;
    const dz = lz - CZ;
    const rad = (rotationDeg * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dz * Math.sin(rad);
    const rz = dx * Math.sin(rad) + dz * Math.cos(rad);
    const scale = 3.45 * zoom;
    return [280 + rx * scale, 280 - rz * scale];
  };

  const projectPolygon = (minX: number, maxX: number, minZ: number, maxZ: number): string => {
    const pts = [
      project(minX, minZ),
      project(maxX, minZ),
      project(maxX, maxZ),
      project(minX, maxZ),
    ];
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  };

  const gates = [
    { key: 'main' as const, name: 'Gate 1 · Main 12m South Portal', x: 0, z: -75.5, open: cmp.mainGateOpen },
    { key: 'westPed' as const, name: 'Gate 2 · West Pedestrian Portal', x: -82, z: -20, open: cmp.westPedOpen },
    { key: 'eastPed' as const, name: 'Gate 3 · East Emergency Portal', x: 18, z: -15, open: cmp.eastPedOpen },
    { key: 'veh1' as const, name: 'Gate 4 · South Garage Vehicle Gate', x: -24, z: -75.5, open: cmp.vehicleGate1Open },
    { key: 'veh2' as const, name: 'Gate 5 · North Railway Vehicle Gate', x: -20, z: 51.0, open: cmp.vehicleGate2Open },
    { key: 'garage' as const, name: 'Garage Roller Shutter Door', x: -50, z: -38.5, open: cmp.garageShutterOpen },
  ];

  const [playerLx, playerLz] = worldToLocal(player.position[0], player.position[2]);
  const [playerSvgX, playerSvgY] = project(playerLx, playerLz);

  const sweepDeg = ((snapshot.systems.radarSweepAngle * 180) / Math.PI) % 360;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: 12 Layer Controls */}
      <div className="lg:col-span-3 space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-3 max-h-[540px] overflow-y-auto">
        <div className="text-xs font-semibold text-cyan-300">12 Toggleable Compound Layers</div>
        <div className="space-y-1">
          {NEXUS_COMPOUND_RADAR_LAYERS.map((layer) => {
            const on = !!layers[layer.id];
            const highlighted = focusLayerId === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => onToggleLayer(layer.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md border text-[11px] transition-colors cursor-pointer ${
                  highlighted
                    ? 'border-cyan-400 bg-cyan-500/20 text-white'
                    : on
                      ? 'border-cyan-800/70 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/40'
                      : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{layer.label}</span>
                  <span className="font-mono text-[10px] shrink-0">{on ? 'ON' : 'OFF'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Interactive Rotatable Zoomable Radar Canvas */}
      <div className="lg:col-span-6 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 font-mono tabular-nums text-neutral-300">
            <span>Rot: {Math.round(rotationDeg)}°</span>
            <span className="text-neutral-600">·</span>
            <span>Zoom: {zoom.toFixed(1)}×</span>
            <span className="text-neutral-600">·</span>
            <span>100×126.5m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateView((rotationDeg + 45) % 360, zoom)}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Rotate radar +45 degrees"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateView(rotationDeg, Math.min(2.6, Number((zoom + 0.25).toFixed(2))))}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateView(rotationDeg, Math.max(0.65, Number((zoom - 0.25).toFixed(2))))}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateView(0, 1.0)}
              className="px-2 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div
          className="rounded-lg border border-cyan-500/35 bg-[#040a14] overflow-hidden cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            setDragging(true);
            setDragLastX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            const dx = e.clientX - dragLastX;
            setDragLastX(e.clientX);
            updateView((rotationDeg + dx * 0.45 + 360) % 360, zoom);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <svg viewBox="0 0 560 560" className="w-full h-[460px] block">
            <defs>
              <radialGradient id="compoundSweep" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(6,182,212,0.18)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.0)" />
              </radialGradient>
            </defs>

            {/* Range Rings */}
            {layers.radar_sweeps && (
              <g opacity={0.55}>
                {[80, 155, 230].map((r) => (
                  <circle key={r} cx={280} cy={280} r={r} fill="none" stroke="#0e7490" strokeDasharray="4 4" strokeWidth={1} />
                ))}
                <line
                  x1={280}
                  y1={280}
                  x2={280 + Math.sin((sweepDeg * Math.PI) / 180) * 245}
                  y2={280 - Math.cos((sweepDeg * Math.PI) / 180) * 245}
                  stroke="#22d3ee"
                  strokeWidth={1.6}
                  opacity={0.7}
                />
              </g>
            )}

            {/* Layer 1: Terrain & 100x126.5m Plot */}
            {layers.terrain_footprint && (
              <polygon
                points={projectPolygon(-82, 18, -75.5, 51.0)}
                fill="rgba(14,116,144,0.1)"
                stroke="#155e75"
                strokeWidth={1}
              />
            )}

            {/* Layer 8: North 6-Track Railway Corridor */}
            {layers.railway_corridor && (
              <g>
                {[150, 162, 174, 186, 198, 210].map((worldZ, i) => {
                  const localZ = worldZ - 38;
                  const p1 = project(-130, localZ);
                  const p2 = project(75, localZ);
                  return (
                    <line
                      key={i}
                      x1={p1[0]}
                      y1={p1[1]}
                      x2={p2[0]}
                      y2={p2[1]}
                      stroke="#38bdf8"
                      strokeWidth={1}
                      opacity={0.45}
                    />
                  );
                })}
              </g>
            )}

            {/* Layer 6: Courtyard Roads */}
            {layers.roads_paths && (
              <g opacity={0.65}>
                <polygon points={projectPolygon(-6, 6, -75.5, 51)} fill="rgba(71,85,105,0.35)" />
                <polygon points={projectPolygon(-78, 16, -24, -14)} fill="rgba(71,85,105,0.3)" />
              </g>
            )}

            {/* Layer 3: Perimeter Blast Walls */}
            {layers.security_walls && (
              <polygon
                points={projectPolygon(-82, 18, -75.5, 51.0)}
                fill="none"
                stroke="#64748b"
                strokeWidth={3}
              />
            )}

            {/* Layer 2: 3 Hero Compound Buildings */}
            {layers.buildings_3 && (
              <g>
                {/* Structure 1: THE AURELION */}
                <polygon
                  points={projectPolygon(-13, 13, -12, 12)}
                  fill="rgba(217,119,6,0.35)"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelected({
                      kind: 'building',
                      name: 'Structure 1 · THE AURELION Mansion',
                      detail: '9-Level Luxury Survival Estate (B2–F7) · Solar, Hydroponics, Medical & Bunker',
                      stats: [
                        ['Solar Output', `${cmp.aurelionSnapshot?.power.solarKw.toFixed(1) ?? '0.0'} kW`],
                        ['Battery Bank', `${Math.round(cmp.aurelionSnapshot?.power.batteryPercent ?? 0)}%`],
                        ['Treated Water', `${Math.round(cmp.aurelionSnapshot?.water.treatedLiters ?? 0)} L`],
                        ['Diesel Reserve', `${Math.round(cmp.aurelionSnapshot?.power.fuelLiters ?? 0)} L`],
                      ],
                    })
                  }
                />
                {/* Structure 2: THE NEXUS */}
                <polygon
                  points={projectPolygon(-59.2, -36.8, 14.8, 33.2)}
                  fill="rgba(6,182,212,0.42)"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelected({
                      kind: 'building',
                      name: 'Structure 2 · THE NEXUS (Current Tower)',
                      detail: '8-Floor Grand Railway Intelligence, Compound Surveillance & Outbreak HQ',
                      stats: [
                        ['Lift A Pos', `F${snapshot.systems.elevators.liftA.currentFloor}`],
                        ['Lift B Pos', `F${snapshot.systems.elevators.liftB.currentFloor}`],
                        ['Clearance', snapshot.systems.clearanceLevel.toUpperCase()],
                        ['Live Screens', '189 Displays'],
                      ],
                    })
                  }
                />
                {/* Structure 3: Vertical Security Garage */}
                <polygon
                  points={projectPolygon(-60, -39, -48, -28)}
                  fill="rgba(16,185,129,0.3)"
                  stroke="#34d399"
                  strokeWidth={1.6}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelected({
                      kind: 'building',
                      name: 'Structure 3 · Vertical Security Garage',
                      detail: '4-Bay Armored Vehicle Facility housing Armed SUV, Bike, Cycle & Military Carrier',
                      stats: [
                        ['Fleet Count', `${cmp.vehicles.length} Vehicles`],
                        ['Shutter Door', cmp.garageShutterOpen ? 'OPEN' : 'CLOSED'],
                        ['Active Driver', cmp.vehicles.some((v) => v.isOccupied) ? 'YES' : 'PARKED'],
                        ['Grid Tie', 'Live'],
                      ],
                    })
                  }
                />
              </g>
            )}

            {/* Layer 4: 5 Perimeter Gates + Garage Shutter */}
            {layers.gates_5 &&
              gates.map((g) => {
                const [gx, gy] = project(g.x, g.z);
                return (
                  <g
                    key={g.key}
                    className="cursor-pointer"
                    onClick={() => setSelected({ kind: 'gate', key: g.key, name: g.name, open: g.open })}
                  >
                    <rect
                      x={gx - 6}
                      y={gy - 6}
                      width={12}
                      height={12}
                      rx={2}
                      fill={g.open ? '#10b981' : '#f59e0b'}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}

            {/* Layer 5: All 20 Perimeter Sentry Towers */}
            {layers.towers_20 &&
              cmp.turrets.map((t) => {
                const [lx, lz] = worldToLocal(t.worldPosition.x, t.worldPosition.z);
                const [tx, ty] = project(lx, lz);
                return (
                  <g
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setSelected({ kind: 'turret', turret: t })}
                  >
                    <circle
                      cx={tx}
                      cy={ty}
                      r={t.isLockedOn ? 6.5 : 4.8}
                      fill={t.isLockedOn ? '#f43f5e' : t.isReloading ? '#eab308' : '#38bdf8'}
                      stroke="#020617"
                      strokeWidth={1.2}
                    />
                  </g>
                );
              })}

            {/* Layer 7: Vehicles Fleet */}
            {layers.vehicles_fleet &&
              cmp.vehicles.map((v) => {
                const [lx, lz] = worldToLocal(v.position[0], v.position[2]);
                const [vx, vy] = project(lx, lz);
                return (
                  <polygon
                    key={v.id}
                    points={`${vx},${vy - 6} ${vx + 5},${vy + 4} ${vx - 5},${vy + 4}`}
                    fill="#34d399"
                    stroke="#020617"
                    strokeWidth={1}
                    className="cursor-pointer"
                    onClick={() => setSelected({ kind: 'vehicle', id: v.id })}
                  />
                );
              })}

            {/* Layer 11: Companions & Settlement NPCs */}
            {layers.npc_companions &&
              snapshot.live.npcs.map((n) => {
                const [lx, lz] = worldToLocal(n.position[0], n.position[2]);
                const [nx, ny] = project(lx, lz);
                return <circle key={n.id} cx={nx} cy={ny} r={3.5} fill="#a78bfa" stroke="#020617" strokeWidth={1} />;
              })}

            {/* Layer 10: Player Live Marker */}
            {layers.player_marker && (
              <g className="cursor-pointer" onClick={() => setSelected({ kind: 'player' })}>
                <circle cx={playerSvgX} cy={playerSvgY} r={8} fill="none" stroke="#facc15" strokeWidth={1.5} />
                <circle cx={playerSvgX} cy={playerSvgY} r={4} fill="#facc15" />
              </g>
            )}
          </svg>
        </div>
        <div className="text-[11px] text-neutral-400">
          Drag horizontally inside the radar viewport to rotate orientation; click any building, sentry tower, gate,
          vehicle, or player marker to inspect live properties.
        </div>
      </div>

      {/* Right: Object Inspector + Live Summary */}
      <div className="lg:col-span-3 space-y-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-2.5 text-xs">
          <div className="font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>Selected Contact Inspector</span>
          </div>

          {!selected && (
            <div className="text-neutral-400 text-[11px] leading-relaxed">
              Select any of the 20 towers, 5 gates, 3 hero structures, vehicles, or the player beacon on the radar map to
              inspect telemetry and issue gate commands.
            </div>
          )}

          {selected?.kind === 'building' && (
            <div className="space-y-2">
              <div className="font-semibold text-amber-300">{selected.name}</div>
              <div className="text-[11px] text-neutral-300">{selected.detail}</div>
              <div className="space-y-1 pt-1 border-t border-neutral-800 font-mono tabular-nums">
                {selected.stats.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">{k}</span>
                    <span className="text-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected?.kind === 'turret' && (
            <div className="space-y-2 font-mono tabular-nums text-[11px]">
              <div className="font-sans text-xs font-semibold text-cyan-300">{selected.turret.name}</div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Status</span>
                <span className={selected.turret.isLockedOn ? 'text-rose-400' : 'text-emerald-400'}>
                  {selected.turret.isLockedOn ? 'ENGAGED' : selected.turret.isReloading ? 'RELOADING' : 'GUARDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Ammo</span>
                <span className="text-white">
                  {selected.turret.ammo} / {selected.turret.maxAmmo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Integrity</span>
                <span className="text-white">
                  {Math.round(selected.turret.health)} / {selected.turret.maxHealth}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Neutralized</span>
                <span className="text-amber-300">{selected.turret.killsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Target</span>
                <span className="text-neutral-200">{selected.turret.targetId ?? 'None'}</span>
              </div>
            </div>
          )}

          {selected?.kind === 'gate' && (
            <div className="space-y-2.5">
              <div className="font-semibold text-white">{selected.name}</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Current State</span>
                <span className={selected.open ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  {selected.open ? 'OPEN' : 'SEALED'}
                </span>
              </div>
              <button
                onClick={() => {
                  onToggleGate(selected.key);
                  setSelected({ ...selected, open: !selected.open });
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 cursor-pointer"
              >
                {selected.open ? <Lock className="h-3.5 w-3.5" /> : <DoorOpen className="h-3.5 w-3.5" />}
                {selected.open ? 'Seal Gate' : 'Open Gate'}
              </button>
            </div>
          )}

          {selected?.kind === 'vehicle' && (() => {
            const v = cmp.vehicles.find((item) => item.id === selected.id);
            if (!v) return null;
            return (
              <div className="space-y-1.5 font-mono tabular-nums text-[11px]">
                <div className="font-sans text-xs font-semibold text-emerald-300">{v.name}</div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Battery</span>
                  <span className="text-white">{Math.round(v.batteryPercent)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Speed</span>
                  <span className="text-white">{Math.round(v.speedKmh)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Odometer</span>
                  <span className="text-white">{v.odometerKm.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Security</span>
                  <span className="text-white">{v.isLocked ? 'Locked' : 'Unlocked'}</span>
                </div>
              </div>
            );
          })()}

          {selected?.kind === 'player' && (
            <div className="space-y-1.5 font-mono tabular-nums text-[11px]">
              <div className="font-sans text-xs font-semibold text-amber-300">Player Transponder</div>
              <div className="flex justify-between">
                <span className="text-neutral-400">World XYZ</span>
                <span className="text-white">
                  {player.position.map((n) => n.toFixed(1)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Health</span>
                <span className="text-white">
                  {Math.round(player.health)} / {player.maxHealth}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Infection</span>
                <span className="text-white">{Math.round(player.infection)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Defense Quick KPIs */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-1.5 text-[11px] font-mono tabular-nums">
          <div className="font-sans text-xs font-semibold text-white mb-1">Compound Defense Grid</div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Active Towers</span>
            <span className="text-cyan-300">{cmp.turrets.length} / 20</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Towers Locked On</span>
            <span className="text-rose-400">{cmp.turrets.filter((t) => t.isLockedOn).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Total Neutralized</span>
            <span className="text-amber-300">{cmp.turrets.reduce((s, t) => s + t.killsCount, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Friendly NPCs</span>
            <span className="text-violet-300">{snapshot.live.npcs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
