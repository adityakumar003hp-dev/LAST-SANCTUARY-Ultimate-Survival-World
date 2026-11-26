import React, { useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, AlertTriangle, Pin } from 'lucide-react';
import { NEXUS_OUTBREAK_RADAR_LAYERS } from '../../engine/nexus/NexusConfig';
import type { NexusDashboardSnapshot } from '../../engine/nexus/NexusSystems';
import type { CityOutbreakTelemetry } from '../../engine/world/GlobalOutbreakSimulator';

interface NexusOutbreakRadarViewProps {
  snapshot: NexusDashboardSnapshot;
  onToggleLayer: (layerId: string) => void;
  onPinBrief: (note: string) => void;
  onPrefsChange?: (lonOffset: number, zoom: number, continentFilter: string) => void;
  focusLayerId?: string;
  initialContinentFilter?: string;
}

const CONTINENTS = [
  'All',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Australia & Oceania',
];

export const NexusOutbreakRadarView: React.FC<NexusOutbreakRadarViewProps> = ({
  snapshot,
  onToggleLayer,
  onPinBrief,
  onPrefsChange,
  focusLayerId,
  initialContinentFilter,
}) => {
  const [lonOffset, setLonOffset] = useState(snapshot.systems.radarPreferences.outbreakLonOffset);
  const [zoom, setZoom] = useState(snapshot.systems.radarPreferences.outbreakZoom);
  const [continentFilter, setContinentFilter] = useState<string>(
    initialContinentFilter || snapshot.systems.radarPreferences.outbreakContinentFilter || 'All'
  );
  const [selectedCity, setSelectedCity] = useState<CityOutbreakTelemetry | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragLastX, setDragLastX] = useState(0);

  const updateView = (nextLon: number, nextZoom: number, nextCont: string) => {
    setLonOffset(nextLon);
    setZoom(nextZoom);
    setContinentFilter(nextCont);
    onPrefsChange?.(nextLon, nextZoom, nextCont);
  };

  const layers = snapshot.systems.outbreakLayers;
  const ob = snapshot.live.outbreak;
  const gm = ob.globalMetrics;
  const player = snapshot.live.player;

  const filteredCities = ob.cities.filter((c) => {
    if (continentFilter === 'All') return true;
    if (continentFilter === 'Americas') {
      return c.city.continent === 'North America' || c.city.continent === 'South America';
    }
    return c.city.continent === continentFilter;
  });

  // Equirectangular interactive globe-pan & zoom projection on 600x320 SVG
  const projectLonLat = (lon: number, lat: number): [number, number] => {
    let wrappedLon = ((lon + lonOffset + 540) % 360) - 180;
    const x = 300 + (wrappedLon / 180) * 280 * zoom;
    const y = 160 - (lat / 90) * 140 * zoom;
    return [x, y];
  };

  const dangerColor = (lvl: CityOutbreakTelemetry['dangerLevel']): string => {
    if (lvl === 'Critical') return '#f43f5e';
    if (lvl === 'Overrun') return '#fb923c';
    if (lvl === 'Containment') return '#facc15';
    if (lvl === 'Alert') return '#38bdf8';
    return '#10b981';
  };

  const undiscoveredWarning = ob.discoveredChunksCount <= 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: 10 Outbreak Radar Layers */}
      <div className="lg:col-span-3 space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-3 max-h-[540px] overflow-y-auto">
        <div className="text-xs font-semibold text-rose-300">10 Toggleable Outbreak Layers</div>
        <div className="space-y-1">
          {NEXUS_OUTBREAK_RADAR_LAYERS.map((layer) => {
            const on = !!layers[layer.id];
            const highlighted = focusLayerId === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => onToggleLayer(layer.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md border text-[11px] transition-colors cursor-pointer ${
                  highlighted
                    ? 'border-rose-400 bg-rose-500/20 text-white'
                    : on
                      ? 'border-rose-900/80 bg-rose-950/35 text-rose-100 hover:bg-rose-900/35'
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

      {/* Center: Interactive Planetary Outbreak Map + Continent Filter */}
      <div className="lg:col-span-6 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            {CONTINENTS.map((cont) => (
              <button
                key={cont}
                onClick={() => updateView(lonOffset, zoom, cont)}
                className={`px-2 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer ${
                  continentFilter === cont
                    ? 'bg-rose-500 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {cont}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => updateView(((lonOffset + 45 + 180) % 360) - 180, zoom, continentFilter)}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Rotate longitude +45°"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateView(lonOffset, Math.min(2.4, Number((zoom + 0.25).toFixed(2))), continentFilter)}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => updateView(lonOffset, Math.max(0.8, Number((zoom - 0.25).toFixed(2))), continentFilter)}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          className="rounded-lg border border-rose-500/35 bg-[#09040a] overflow-hidden cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            setDragging(true);
            setDragLastX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            const dx = e.clientX - dragLastX;
            setDragLastX(e.clientX);
            updateView(((lonOffset + dx * 0.45 + 540) % 360) - 180, zoom, continentFilter);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <svg viewBox="0 0 600 320" className="w-full h-[350px] block">
            {/* Layer 1: Graticule Grid */}
            {layers.earth_grid && (
              <g opacity={0.35}>
                {[-120, -60, 0, 60, 120].map((lon) => {
                  const [x] = projectLonLat(lon, 0);
                  return <line key={lon} x1={x} y1={10} x2={x} y2={310} stroke="#475569" strokeWidth={0.8} />;
                })}
                {[-60, -30, 0, 30, 60].map((lat) => {
                  const [, y] = projectLonLat(0, lat);
                  return <line key={lat} x1={15} y1={y} x2={585} y2={y} stroke="#475569" strokeWidth={0.8} />;
                })}
              </g>
            )}

            {/* Layer 10: Honest Explored vs Undiscovered Terrain Banner */}
            {layers.explored_chunks && undiscoveredWarning && (
              <rect
                x={20}
                y={20}
                width={560}
                height={280}
                fill="none"
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1}
                opacity={0.45}
              />
            )}

            {/* Layer 2 & 3: Monitored Global Cities */}
            {(layers.cities_network || layers.infection_density) &&
              filteredCities.map((c) => {
                const [cx, cy] = projectLonLat(c.city.lon, c.city.lat);
                if (cx < 5 || cx > 595 || cy < 5 || cy > 315) return null;
                const total = Math.max(1, c.healthyCount + c.infectedCount + c.transformingCount);
                const infRatio = c.infectedCount / total;
                const r = layers.infection_density ? 3.5 + infRatio * 5.5 : 4.2;
                const isSelected = selectedCity?.city.id === c.city.id;
                return (
                  <g
                    key={c.city.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCity(c)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={dangerColor(c.dangerLevel)}
                      fillOpacity={0.82}
                      stroke={isSelected ? '#ffffff' : '#09090b'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    {layers.power_stability && c.powerGridRatio < 0.5 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 3}
                        fill="none"
                        stroke="#facc15"
                        strokeDasharray="2 2"
                        strokeWidth={1}
                      />
                    )}
                  </g>
                );
              })}

            {/* Current Player Anchor */}
            {player.longitude !== undefined && player.latitude !== undefined && (() => {
              const [px, py] = projectLonLat(player.longitude, player.latitude);
              return (
                <g>
                  <circle cx={px} cy={py} r={7.5} fill="none" stroke="#22d3ee" strokeWidth={1.6} />
                  <circle cx={px} cy={py} r={3} fill="#22d3ee" />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Honest Telemetry Banner */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-[11px] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-neutral-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              Explored Surface Chunks: <strong className="font-mono tabular-nums text-white">{ob.discoveredChunksCount}</strong>
              {ob.discoveredChunksCount === 0
                ? ' — Local recon limited to active compound & streamed corridor; remote chunks unverified.'
                : ` · Local Hostiles Tracked: ${ob.activeZombies.length}`}
            </span>
          </div>

          <button
            onClick={() => {
              const summary = `Outbreak Brief (Day ${snapshot.live.dayCount}): Severity ${Math.round(
                gm.apocalypticSeverity * 100
              )}%, Overrun Cities ${gm.overrunCitiesCount}/${ob.cities.length}, Active Sector Hostiles ${
                ob.activeZombies.length
              }.`;
              onPinBrief(summary);
            }}
            className="inline-flex items-center gap-1.5 rounded bg-rose-500 hover:bg-rose-400 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
          >
            <Pin className="h-3 w-3" />
            Compile & Pin Brief
          </button>
        </div>
      </div>

      {/* Right: City & Global Scientific Metrics */}
      <div className="lg:col-span-3 space-y-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-2 text-xs font-mono tabular-nums">
          <div className="font-sans text-xs font-semibold text-white">Planetary Telemetry</div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Apocalyptic Severity</span>
            <span className="text-rose-400">{Math.round(gm.apocalypticSeverity * 100)}%</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Global Power Grid</span>
            <span className="text-amber-300">{Math.round(gm.powerGridStability * 100)}%</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Overrun Hubs</span>
            <span className="text-white">
              {gm.overrunCitiesCount} / {ob.cities.length}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Healthy Tracked</span>
            <span className="text-emerald-400">{gm.totalHealthy.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Transforming (60s)</span>
            <span className="text-amber-400">{gm.totalTransforming.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Infected Tracked</span>
            <span className="text-rose-400">{gm.totalInfected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400 font-sans">Evacuated</span>
            <span className="text-sky-300">{gm.totalEvacuated.toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-2 text-xs">
          <div className="font-semibold text-white">City / Local Sensor Readout</div>
          {selectedCity ? (
            <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
              <div className="font-sans text-xs font-semibold text-rose-300">
                {selectedCity.city.name}, {selectedCity.city.country}
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-sans">Danger Tier</span>
                <span style={{ color: dangerColor(selectedCity.dangerLevel) }}>{selectedCity.dangerLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-sans">Healthy</span>
                <span className="text-emerald-400">{selectedCity.healthyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-sans">Infected</span>
                <span className="text-rose-400">{selectedCity.infectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-sans">Power Grid</span>
                <span className="text-amber-300">{Math.round(selectedCity.powerGridRatio * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-sans">Coordinates</span>
                <span className="text-neutral-300">
                  {selectedCity.city.lat.toFixed(1)}°, {selectedCity.city.lon.toFixed(1)}°
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-400 space-y-1">
              <p>Click any monitored metropolitan node on the map to inspect city containment metrics.</p>
              <div className="pt-1 border-t border-neutral-800 font-mono tabular-nums text-neutral-300">
                Weather: {ob.weather.weather} · Δ{ob.weather.temperatureDelta >= 0 ? '+' : ''}
                {Math.round(ob.weather.temperatureDelta)}°C · Vis {Math.round(ob.weather.visibilityPercent)}%
              </div>
              <div className="font-mono tabular-nums text-neutral-300">
                Supply Drop: {ob.supplyDrop ? `${ob.supplyDrop.position.map((v) => Math.round(v)).join(', ')}` : 'None Active'}
              </div>
              {snapshot.systems.outbreakIntelRecords.length > 0 && (
                <div className="pt-2 border-t border-neutral-800 space-y-1">
                  <div className="text-[10px] font-semibold text-rose-300">Saved Intel Archive</div>
                  {snapshot.systems.outbreakIntelRecords.slice(0, 3).map((rec, i) => (
                    <div key={i} className="text-[10px] text-neutral-300 leading-snug">
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
