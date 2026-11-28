import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Crosshair,
  Flame,
  Globe,
  Plane,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getContinentDisplayPolygons } from '../engine/geo/RealEarthDataset';
import {
  CityOutbreakTelemetry,
  GlobalOutbreakMetrics,
  GlobalPopulationStateSnapshot,
  OutbreakDangerLevel,
} from '../engine/world/GlobalOutbreakSimulator';
import {
  CITIZEN_AGE_GROUPS,
  PROFESSION_CATEGORIES,
  GlobalPopulationState,
  CitizenAgeGroup,
  ProfessionCategory,
  DAYTIME_CONVERSION_SECONDS,
  NIGHTTIME_CONVERSION_SECONDS,
  CITIZEN_DAILY_GROWTH_MULTIPLIER,
  ZOMBIE_DAILY_GROWTH_MULTIPLIER,
} from '../engine/world/GlobalPopulationState';
import type { AsteroidImpactSaveRecord } from '../types/game';
import { soundEngine } from '../utils/audio';

export interface GlobalOutbreakDashboardProps {
  cities: CityOutbreakTelemetry[];
  metrics?: GlobalOutbreakMetrics;
  populationState?: GlobalPopulationStateSnapshot;
  dayCount?: number;
  isNight?: boolean;
  isOutbreakActive?: boolean;
  earthLat?: number;
  earthLon?: number;
  onTravelToGeoCoordinate?: (lat: number, lon: number, label?: string) => void;
  onResetSimulation?: () => void;
}

type DashboardSubView = 'map' | 'demographics' | 'growth';

const STATE_COLOR: Record<OutbreakDangerLevel, string> = {
  Safe: '#10b981',
  Alert: '#f59e0b',
  Containment: '#f97316',
  Overrun: '#fb7185',
  Critical: '#dc2626',
};

const STATE_TEXT_CLASS: Record<OutbreakDangerLevel, string> = {
  Safe: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  Alert: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  Containment: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Overrun: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  Critical: 'text-red-400 border-red-500/45 bg-red-600/15',
};

const ALL_STATES: ReadonlyArray<OutbreakDangerLevel> = ['Safe', 'Alert', 'Containment', 'Overrun', 'Critical'];

const CONTINENT_VIEWPORTS: ReadonlyArray<{
  id: string;
  label: string;
  lon: number;
  lat: number;
  scale: number;
}> = [
  { id: 'ALL', label: 'World', lon: 0, lat: 8, scale: 1 },
  { id: 'North America', label: 'N. America', lon: -98, lat: 42, scale: 2.3 },
  { id: 'South America', label: 'S. America', lon: -60, lat: -18, scale: 2.4 },
  { id: 'Europe', label: 'Europe', lon: 14, lat: 50, scale: 3.1 },
  { id: 'Africa', label: 'Africa', lon: 20, lat: 2, scale: 2.3 },
  { id: 'Asia', label: 'Asia', lon: 92, lat: 34, scale: 2.1 },
  { id: 'Australia & Oceania', label: 'Oceania', lon: 142, lat: -26, scale: 2.7 },
  { id: 'Antarctica', label: 'Antarctica', lon: 20, lat: -74, scale: 2.5 },
];

function formatCompactCount(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
}

export const GlobalOutbreakDashboard: React.FC<GlobalOutbreakDashboardProps> = ({
  cities,
  metrics,
  populationState,
  dayCount = 1,
  isNight = false,
  isOutbreakActive = false,
  earthLat = 45.5152,
  earthLon = -122.6784,
  onTravelToGeoCoordinate,
  onResetSimulation,
}) => {
  const [subView, setSubView] = useState<DashboardSubView>('map');
  const [stateFilter, setStateFilter] = useState<'ALL' | OutbreakDangerLevel>('ALL');
  const [continentFocus, setContinentFocus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string>(cities[0]?.city.id ?? 'us_oakridge');
  const [selectedImpactId, setSelectedImpactId] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<CityOutbreakTelemetry | null>(null);
  const [hoveredImpact, setHoveredImpact] = useState<AsteroidImpactSaveRecord | null>(null);

  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const mapZoomLayerRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const ageChartRef = useRef<SVGSVGElement | null>(null);
  const profChartRef = useRef<SVGSVGElement | null>(null);
  const historyChartRef = useRef<SVGSVGElement | null>(null);

  // Build deterministic fallback snapshot if dashboard is mounted without an active engine snapshot
  const snapshot = useMemo<GlobalPopulationStateSnapshot>(() => {
    if (populationState) return populationState;
    const svc = new GlobalPopulationState(dayCount);
    svc.syncFromCities(
      cities.map((c) => ({
        city: c.city,
        populationCount: c.populationCount,
        healthyCount: c.healthyCount,
        transformingCount: c.transformingCount,
        infectedCount: c.infectedCount,
        evacuatedCount: c.evacuatedCount,
        dailyZombieTarget: c.dailyZombieTarget,
        dangerLevel: c.dangerLevel,
        powerGridRatio: c.powerGridRatio,
        lastUpdatedAt: c.lastUpdatedAt,
      })),
      0,
      dayCount,
      isNight,
      isOutbreakActive
    );
    return svc.getSnapshot();
  }, [populationState, cities, dayCount, isNight, isOutbreakActive]);

  const continentPaths = useMemo(() => {
    return getContinentDisplayPolygons().map((p) => {
      const d =
        p.poly
          .map(([lat, lon], idx) => `${idx === 0 ? 'M' : 'L'} ${lon.toFixed(2)} ${(-lat).toFixed(2)}`)
          .join(' ') + ' Z';
      return { id: p.id, continent: p.continent, isIsland: p.isIsland, d };
    });
  }, []);

  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cities
      .filter((entry) => {
        if (continentFocus !== 'ALL' && entry.city.continent !== continentFocus) return false;
        if (stateFilter !== 'ALL' && entry.dangerLevel !== stateFilter) return false;
        if (!q) return true;
        return (
          entry.city.name.toLowerCase().includes(q) ||
          entry.city.country.toLowerCase().includes(q) ||
          entry.city.continent.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const scoreA = (a.infectedCount + a.transformingCount) / Math.max(1, a.populationCount);
        const scoreB = (b.infectedCount + b.transformingCount) / Math.max(1, b.populationCount);
        return scoreB - scoreA || b.populationCount - a.populationCount;
      });
  }, [cities, continentFocus, stateFilter, searchQuery]);

  const selectedCity = useMemo(
    () => cities.find((c) => c.city.id === selectedCityId) ?? cities[0] ?? null,
    [cities, selectedCityId]
  );

  const selectedImpact = useMemo(
    () => snapshot.asteroidImpacts.find((i) => i.id === selectedImpactId) ?? null,
    [snapshot.asteroidImpacts, selectedImpactId]
  );

  // Equirectangular D3 coordinate mapping aligned with viewBox="-180 -90 360 180" -> 760x380 SVG
  const MAP_W = 760;
  const MAP_H = 380;
  const xScale = useMemo(() => d3.scaleLinear().domain([-180, 180]).range([0, MAP_W]), []);
  const yScale = useMemo(() => d3.scaleLinear().domain([90, -90]).range([0, MAP_H]), []);

  // Configure D3 Zoom & Pan on the World Outbreak Map
  useEffect(() => {
    if (subView !== 'map') return;
    const svgEl = mapSvgRef.current;
    const zoomLayer = mapZoomLayerRef.current;
    if (!svgEl || !zoomLayer) return;

    const svg = d3.select(svgEl);
    const layer = d3.select(zoomLayer);

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([
        [0, 0],
        [MAP_W, MAP_H],
      ])
      .on('zoom', (event) => {
        layer.attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    return () => {
      svg.on('.zoom', null);
    };
  }, [subView]);

  const focusContinentOnMap = (viewport: (typeof CONTINENT_VIEWPORTS)[number]) => {
    soundEngine.playUIClick();
    setContinentFocus(viewport.id);
    const svgEl = mapSvgRef.current;
    const zb = zoomBehaviorRef.current;
    if (!svgEl || !zb) return;

    if (viewport.id === 'ALL') {
      d3.select(svgEl).transition().duration(320).call(zb.transform, d3.zoomIdentity);
      return;
    }

    const px = xScale(viewport.lon);
    const py = yScale(viewport.lat);
    const tx = MAP_W / 2 - px * viewport.scale;
    const ty = MAP_H / 2 - py * viewport.scale;
    d3.select(svgEl)
      .transition()
      .duration(350)
      .call(zb.transform, d3.zoomIdentity.translate(tx, ty).scale(viewport.scale));
  };

  const adjustZoom = (factor: number) => {
    const svgEl = mapSvgRef.current;
    const zb = zoomBehaviorRef.current;
    if (!svgEl || !zb) return;
    d3.select(svgEl).transition().duration(180).call(zb.scaleBy, factor);
  };

  // D3 Stacked Horizontal Bar Charts for Age Groups & Profession Categories
  useEffect(() => {
    if (subView !== 'demographics') return;

    const renderDemographicStack = <K extends string>(
      svgEl: SVGSVGElement | null,
      keys: ReadonlyArray<K>,
      buckets: Record<K, { total: number; healthy: number; transforming: number; infected: number; evacuated: number }>,
      labelWidth: number
    ) => {
      if (!svgEl) return;
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();

      const rows = keys.map((key) => {
        const b = buckets[key] ?? { total: 0, healthy: 0, transforming: 0, infected: 0, evacuated: 0 };
        const denom = Math.max(1, b.total);
        return {
          key,
          total: b.total,
          infectedPct: (b.infected / denom) * 100,
          transformingPct: (b.transforming / denom) * 100,
          evacuatedPct: (b.evacuated / denom) * 100,
          healthyPct: (b.healthy / denom) * 100,
        };
      });

      const width = 500;
      const rowH = 34;
      const margin = { top: 24, right: 72, bottom: 20, left: labelWidth };
      const height = margin.top + margin.bottom + rows.length * rowH;
      svg.attr('viewBox', `0 0 ${width} ${height}`);

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
      const y = d3
        .scaleBand<string>()
        .domain(rows.map((r) => r.key))
        .range([0, innerH])
        .padding(0.28);

      g.append('g')
        .call(
          d3
            .axisTop(x)
            .ticks(4)
            .tickFormat((d) => `${d}%`)
        )
        .call((s) => s.select('.domain').attr('stroke', '#334155'))
        .call((s) => s.selectAll('line').attr('stroke', '#334155'))
        .call((s) => s.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '9.5px').attr('font-family', 'monospace'));

      const seriesKeys = ['infectedPct', 'transformingPct', 'evacuatedPct', 'healthyPct'] as const;
      const colors: Record<string, string> = {
        infectedPct: '#ef4444',
        transformingPct: '#f59e0b',
        evacuatedPct: '#38bdf8',
        healthyPct: '#10b981',
      };

      const stacked = d3.stack<(typeof rows)[number]>().keys(seriesKeys)(rows);

      g.selectAll('g.stack-layer')
        .data(stacked)
        .enter()
        .append('g')
        .attr('fill', (d) => colors[d.key] ?? '#64748b')
        .selectAll('rect')
        .data((d) => d)
        .enter()
        .append('rect')
        .attr('x', (d) => x(d[0]))
        .attr('y', (d) => y(d.data.key) ?? 0)
        .attr('width', (d) => Math.max(0, x(d[1]) - x(d[0])))
        .attr('height', y.bandwidth())
        .attr('rx', 2);

      const labels = g
        .selectAll('g.row-label')
        .data(rows)
        .enter()
        .append('g')
        .attr('transform', (d) => `translate(0, ${(y(d.key) ?? 0) + y.bandwidth() / 2})`);

      labels
        .append('text')
        .attr('x', -10)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text((d) => d.key);

      labels
        .append('text')
        .attr('x', innerW + 8)
        .attr('dy', '0.35em')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text((d) => formatCompactCount(d.total));
    };

    renderDemographicStack<CitizenAgeGroup>(ageChartRef.current, CITIZEN_AGE_GROUPS, snapshot.ageGroups, 130);
    renderDemographicStack<ProfessionCategory>(
      profChartRef.current,
      PROFESSION_CATEGORIES,
      snapshot.professionCategories,
      105
    );
  }, [subView, snapshot]);

  // D3 Growth Timeline Chart (Citizens 3.0x/day vs Zombies 2.0x/day vs Evacuated)
  useEffect(() => {
    if (subView !== 'growth') return;
    const svgEl = historyChartRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 680;
    const height = 220;
    const margin = { top: 18, right: 24, bottom: 28, left: 62 };
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const pts =
      snapshot.history.length >= 2
        ? snapshot.history
        : [
            {
              day: snapshot.currentDay,
              simSeconds: 0,
              totalPopulation: snapshot.totalPopulation,
              healthyCount: snapshot.totalHealthy,
              transformingCount: snapshot.totalTransforming,
              infectedCount: snapshot.totalInfected,
              evacuatedCount: snapshot.totalEvacuated,
              overrunCities: 0,
              impactCount: snapshot.activeImpactCount,
            },
            {
              day: snapshot.currentDay,
              simSeconds: 15,
              totalPopulation: snapshot.totalPopulation,
              healthyCount: snapshot.totalHealthy,
              transformingCount: snapshot.totalTransforming,
              infectedCount: snapshot.totalInfected,
              evacuatedCount: snapshot.totalEvacuated,
              overrunCities: 0,
              impactCount: snapshot.activeImpactCount,
            },
          ];

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, pts.length - 1)])
      .range([0, innerW]);

    const maxPop = Math.max(100, d3.max(pts, (d) => d.totalPopulation) ?? 100);
    const y = d3.scaleLinear().domain([0, maxPop * 1.08]).nice().range([innerH, 0]);

    // Gridlines
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((s) => s.select('.domain').remove())
      .call((s) => s.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,3'));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(Math.min(6, pts.length))
          .tickFormat((idx) => {
            const p = pts[Math.round(Number(idx))];
            return p ? `D${p.day}·${Math.round(p.simSeconds)}s` : '';
          })
      )
      .call((s) => s.select('.domain').attr('stroke', '#334155'))
      .call((s) => s.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '9px').attr('font-family', 'monospace'));

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((val) => formatCompactCount(Number(val)))
      )
      .call((s) => s.select('.domain').attr('stroke', '#334155'))
      .call((s) => s.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '9.5px').attr('font-family', 'monospace'));

    const citizenLine = d3
      .line<(typeof pts)[number]>()
      .x((_d, i) => x(i))
      .y((d) => y(d.totalPopulation));

    const zombieLine = d3
      .line<(typeof pts)[number]>()
      .x((_d, i) => x(i))
      .y((d) => y(d.infectedCount + d.transformingCount));

    const evacLine = d3
      .line<(typeof pts)[number]>()
      .x((_d, i) => x(i))
      .y((d) => y(d.evacuatedCount));

    const citizenArea = d3
      .area<(typeof pts)[number]>()
      .x((_d, i) => x(i))
      .y0(innerH)
      .y1((d) => y(d.totalPopulation));

    g.append('path').datum(pts).attr('fill', 'rgba(16, 185, 129, 0.10)').attr('d', citizenArea);
    g.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#10b981').attr('stroke-width', 2).attr('d', citizenLine);
    g.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#ef4444').attr('stroke-width', 2).attr('d', zombieLine);
    g.append('path').datum(pts).attr('fill', 'none').attr('stroke', '#38bdf8').attr('stroke-width', 1.6).attr('stroke-dasharray', '4,3').attr('d', evacLine);
  }, [subView, snapshot]);

  const activeZombiesTotal = snapshot.totalInfected + snapshot.totalTransforming;
  const activeTimerSec = snapshot.isNight ? NIGHTTIME_CONVERSION_SECONDS : DAYTIME_CONVERSION_SECONDS;
  const severityPct = Math.round((metrics?.apocalypticSeverity ?? 0) * 100);
  const gridPct = Math.round((metrics?.powerGridStability ?? 1) * 100);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Top KPI Bar (Compact, Single-Elevation, Tabular Numerics) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-neutral-800 px-4 py-3 bg-neutral-900/40">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span>Global Citizens</span>
            <span className="text-emerald-400 font-bold">{CITIZEN_DAILY_GROWTH_MULTIPLIER.toFixed(1)}×/day</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-neutral-100 mt-0.5">
            {formatCompactCount(snapshot.totalPopulation)}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 tabular-nums truncate">
            Healthy {formatCompactCount(snapshot.totalHealthy)} · Evac {formatCompactCount(snapshot.totalEvacuated)}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span>Zombie Threat</span>
            <span className="text-rose-400 font-bold">{ZOMBIE_DAILY_GROWTH_MULTIPLIER.toFixed(1)}×/day</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-rose-400 mt-0.5">
            {formatCompactCount(activeZombiesTotal)}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 tabular-nums truncate">
            Active {formatCompactCount(snapshot.totalInfected)} · Turning {formatCompactCount(snapshot.totalTransforming)}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span>Conversion Rate</span>
            <Clock className="h-3 w-3 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-amber-300 mt-0.5">
            {activeTimerSec}s {snapshot.isNight ? '(6× Night)' : '(Daytime)'}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
            Day 60s · Night 10s · Day {snapshot.currentDay}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span>Asteroid Zones</span>
            <Flame className="h-3 w-3 text-orange-400" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-orange-300 mt-0.5">
            {snapshot.activeImpactCount} / {snapshot.asteroidImpacts.length} Continents
          </div>
          <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
            {snapshot.isOutbreakActive ? `Severity ${severityPct}% · Grid ${gridPct}%` : 'Day 1 Pre-Impact Baseline'}
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span>City States ({cities.length})</span>
            {onResetSimulation && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUIClick();
                  onResetSimulation();
                }}
                className="text-neutral-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Reset Global Simulation State"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1 mt-1 text-center font-mono text-[10px] tabular-nums">
            {ALL_STATES.map((lvl) => (
              <div key={lvl} className="rounded border border-neutral-800 bg-neutral-950/70 py-0.5">
                <div className="font-bold" style={{ color: STATE_COLOR[lvl] }}>
                  {snapshot.cityDangerCounts[lvl] ?? 0}
                </div>
                <div className="text-[8px] text-neutral-500">{lvl.slice(0, 4)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-view Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-2 bg-neutral-950">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubView('map')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
              subView === 'map'
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>World Outbreak Map & Cities</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('demographics')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
              subView === 'demographics'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Age & Profession Demographics</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('growth')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
              subView === 'growth'
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>3× / 2× Growth & Asteroid Registry</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
          {snapshot.isOutbreakActive
            ? `Outbreak Active · Day ${snapshot.currentDay} · ${snapshot.activeImpactCount} Continental Impact Sites`
            : `Day ${snapshot.currentDay} · Peaceful Civilian World · 0 Active Zombie Conversions`}
        </div>
      </div>

      {/* Main Content Area */}
      {subView === 'map' ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: D3 Interactive World Map */}
          <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
            {/* Continent Focus Controls + Zoom */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {CONTINENT_VIEWPORTS.map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => focusContinentOnMap(vp)}
                    className={`rounded border px-2 py-1 text-[11px] font-mono cursor-pointer transition-colors ${
                      continentFocus === vp.id
                        ? 'border-sky-500/70 bg-sky-500/15 text-sky-300 font-bold'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {vp.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustZoom(1.4)}
                  className="rounded border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustZoom(0.72)}
                  className="rounded border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* D3 Pan/Zoom SVG Container */}
            <div className="relative flex-1 rounded-xl border border-neutral-800 bg-[#071320] overflow-hidden">
              <svg ref={mapSvgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-full cursor-grab active:cursor-grabbing">
                <g ref={mapZoomLayerRef}>
                  {/* Ocean Graticule */}
                  {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
                    <line
                      key={`g_lon_${lon}`}
                      x1={xScale(lon)}
                      y1={0}
                      x2={xScale(lon)}
                      y2={MAP_H}
                      stroke={lon === 0 ? '#1e3a5f' : '#12263f'}
                      strokeWidth={lon === 0 ? 0.7 : 0.45}
                    />
                  ))}
                  {[-60, -30, 0, 30, 60].map((lat) => (
                    <line
                      key={`g_lat_${lat}`}
                      x1={0}
                      y1={yScale(lat)}
                      x2={MAP_W}
                      y2={yScale(lat)}
                      stroke={lat === 0 ? '#1e3a5f' : '#12263f'}
                      strokeWidth={lat === 0 ? 0.75 : 0.45}
                    />
                  ))}

                  {/* Real Earth Continents & Islands mapped onto 760x380 D3 linear space */}
                  <g transform={`translate(${MAP_W / 2}, ${MAP_H / 2}) scale(${MAP_W / 360}, ${MAP_H / 180})`}>
                    {continentPaths.map((cp) => (
                      <path
                        key={cp.id}
                        d={cp.d}
                        fill={cp.continent === 'Antarctica' ? '#cbd5e1' : '#1f3326'}
                        stroke="#41634a"
                        strokeWidth={0.45}
                      />
                    ))}
                  </g>

                  {/* Continental Asteroid Impact Zones */}
                  {snapshot.asteroidImpacts.map((impact) => {
                    const cx = xScale(impact.lon);
                    const cy = yScale(impact.lat);
                    const isSelected = selectedImpactId === impact.id;
                    const blastRadiusPx = Math.max(8, (impact.radiusKm / 111) * (MAP_W / 360) * 6);
                    return (
                      <g
                        key={impact.id}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredImpact(impact)}
                        onMouseLeave={() => setHoveredImpact(null)}
                        onClick={() => {
                          soundEngine.playUIClick();
                          setSelectedImpactId(impact.id);
                          setSelectedCityId(impact.cityId);
                        }}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={blastRadiusPx}
                          fill={impact.impacted ? 'rgba(249, 115, 22, 0.16)' : 'rgba(148, 163, 184, 0.06)'}
                          stroke={impact.impacted ? '#f97316' : '#475569'}
                          strokeWidth={isSelected ? 1.5 : 0.85}
                          strokeDasharray={impact.impacted ? undefined : '2,2'}
                        />
                        {impact.impacted && (
                          <path
                            d={`M ${cx - 4} ${cy - 4} L ${cx + 4} ${cy + 4} M ${cx + 4} ${cy - 4} L ${cx - 4} ${cy + 4}`}
                            stroke="#fb923c"
                            strokeWidth={1.2}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Real World City Outbreak Nodes */}
                  {cities.map((entry) => {
                    const cx = xScale(entry.city.lon);
                    const cy = yScale(entry.city.lat);
                    const isSelected = selectedCity?.city.id === entry.city.id;
                    const dimmed =
                      (continentFocus !== 'ALL' && entry.city.continent !== continentFocus) ||
                      (stateFilter !== 'ALL' && entry.dangerLevel !== stateFilter);
                    const r = entry.city.tier === 'megacity' ? 4.4 : entry.city.tier === 'metropolis' ? 3.5 : 2.8;
                    return (
                      <g
                        key={entry.city.id}
                        className="cursor-pointer"
                        opacity={dimmed ? 0.25 : 1}
                        onMouseEnter={() => setHoveredCity(entry)}
                        onMouseLeave={() => setHoveredCity(null)}
                        onClick={() => {
                          soundEngine.playUIClick();
                          setSelectedCityId(entry.city.id);
                          setSelectedImpactId(null);
                        }}
                      >
                        {isSelected && (
                          <circle cx={cx} cy={cy} r={r + 4.5} fill="none" stroke="#38bdf8" strokeWidth={1.4} />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={STATE_COLOR[entry.dangerLevel]}
                          stroke="#09090b"
                          strokeWidth={0.9}
                        />
                      </g>
                    );
                  })}

                  {/* Player WGS-84 Position Crosshair */}
                  {(() => {
                    const px = xScale(earthLon);
                    const py = yScale(earthLat);
                    return (
                      <g pointerEvents="none">
                        <circle cx={px} cy={py} r={7} fill="none" stroke="#ffffff" strokeWidth={1.2} />
                        <circle cx={px} cy={py} r={3} fill="#38bdf8" />
                      </g>
                    );
                  })()}
                </g>
              </svg>

              {/* Map Legend Strip */}
              <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-2.5 rounded-lg border border-neutral-800 bg-neutral-950/95 px-2.5 py-1 text-[10px] font-mono">
                <span className="text-sky-400 font-bold">● YOU ({earthLat.toFixed(1)}°, {earthLon.toFixed(1)}°)</span>
                {ALL_STATES.map((lvl) => (
                  <span key={lvl} className="flex items-center gap-1 text-neutral-300">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATE_COLOR[lvl] }} />
                    {lvl}
                  </span>
                ))}
                <span className="text-orange-400">✕ Asteroid Impact</span>
              </div>

              {/* Hover Telemetry Readout */}
              {(hoveredCity || hoveredImpact) && (
                <div className="absolute top-2.5 right-2.5 max-w-xs rounded-lg border border-neutral-700 bg-neutral-950/95 px-3 py-2 text-[11px] font-mono pointer-events-none">
                  {hoveredImpact ? (
                    <>
                      <div className="font-bold text-orange-300">
                        Asteroid Zone · {hoveredImpact.continent} ({hoveredImpact.cityName})
                      </div>
                      <div className="text-neutral-300 tabular-nums">
                        Status: {hoveredImpact.impacted ? `Impacted (Day ${hoveredImpact.triggerDay})` : `Target Day ${hoveredImpact.triggerDay}`} · Radius {hoveredImpact.radiusKm}km
                      </div>
                      <div className="text-neutral-400">{hoveredImpact.terrainCondition}</div>
                    </>
                  ) : hoveredCity ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-neutral-100">{hoveredCity.city.name}</span>
                        <span style={{ color: STATE_COLOR[hoveredCity.dangerLevel] }} className="font-bold">
                          {hoveredCity.dangerLevel}
                        </span>
                      </div>
                      <div className="text-neutral-400">
                        {hoveredCity.city.country} · {hoveredCity.city.continent}
                      </div>
                      <div className="text-neutral-300 tabular-nums mt-0.5">
                        Pop {formatCompactCount(hoveredCity.populationCount)} · Inf {formatCompactCount(hoveredCity.infectedCount)} · Turn {formatCompactCount(hoveredCity.transformingCount)}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Selected Hub/Impact Inspector + City-by-City Matrix */}
          <div className="w-full lg:w-88 border-t lg:border-t-0 lg:border-l border-neutral-800 p-3 bg-neutral-900/20 flex flex-col gap-2.5 overflow-hidden">
            {selectedImpact && (
              <div className="rounded-lg border border-orange-500/40 bg-orange-950/20 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-300 flex items-center gap-1.5">
                    <Crosshair className="h-3.5 w-3.5" />
                    Impact Zone · {selectedImpact.continent}
                  </span>
                  <span className="font-mono text-[10px] text-orange-200">
                    {selectedImpact.impacted ? 'ACTIVE CRATER' : 'PROJECTED'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-300 mt-1 tabular-nums">
                  Epicenter: {selectedImpact.cityName} · Radius: {selectedImpact.radiusKm} km · Severity: {Math.round(selectedImpact.severity * 100)}%
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">{selectedImpact.terrainCondition}</div>
              </div>
            )}

            {selectedCity && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-neutral-100">{selectedCity.city.name}</div>
                    <div className="text-[11px] text-neutral-400">
                      {selectedCity.city.country} · {selectedCity.city.continent}
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${STATE_TEXT_CLASS[selectedCity.dangerLevel]}`}>
                    {selectedCity.dangerLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-neutral-800 pt-2 text-[11px] font-mono tabular-nums">
                  <div className="text-neutral-300">Pop: {formatCompactCount(selectedCity.populationCount)}</div>
                  <div className="text-emerald-400">Healthy: {formatCompactCount(selectedCity.healthyCount)}</div>
                  <div className="text-amber-400">Turning: {formatCompactCount(selectedCity.transformingCount)}</div>
                  <div className="text-rose-400">Infected: {formatCompactCount(selectedCity.infectedCount)}</div>
                  <div className="text-sky-400">Evacuated: {formatCompactCount(selectedCity.evacuatedCount)}</div>
                  <div className="text-neutral-300">Grid: {Math.round(selectedCity.powerGridRatio * 100)}%</div>
                </div>

                {onTravelToGeoCoordinate && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playBuildSnap();
                      onTravelToGeoCoordinate(selectedCity.city.lat, selectedCity.city.lon, selectedCity.city.name);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs py-1.5 px-3 transition-colors cursor-pointer"
                  >
                    <Plane className="h-3.5 w-3.5" />
                    <span>Deploy / Airlift to {selectedCity.city.name}</span>
                  </button>
                )}
              </div>
            )}

            {/* City Filter Controls */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cities or countries..."
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 pl-8 pr-2.5 py-1.5 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStateFilter('ALL')}
                  className={`rounded border px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                    stateFilter === 'ALL'
                      ? 'border-sky-500/70 bg-sky-500/15 text-sky-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                  }`}
                >
                  All ({cities.length})
                </button>
                {ALL_STATES.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setStateFilter(lvl)}
                    className={`rounded border px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                      stateFilter === lvl
                        ? STATE_TEXT_CLASS[lvl]
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable City-by-City Table */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
              {filteredCities.map((entry) => {
                const isSelected = selectedCity?.city.id === entry.city.id;
                const infPct = ((entry.infectedCount / Math.max(1, entry.populationCount)) * 100).toFixed(1);
                return (
                  <button
                    key={entry.city.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUIClick();
                      setSelectedCityId(entry.city.id);
                      setSelectedImpactId(null);
                    }}
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-sky-500/70 bg-sky-500/15'
                        : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-100 truncate">{entry.city.name}</div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        {entry.city.country} · {formatCompactCount(entry.populationCount)} pop
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] tabular-nums shrink-0 ml-2">
                      <div className="font-bold" style={{ color: STATE_COLOR[entry.dangerLevel] }}>
                        {entry.dangerLevel}
                      </div>
                      <div className="text-neutral-400">{infPct}% inf</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : subView === 'demographics' ? (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Age Groups Breakdown */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span>Citizen & Infected Age-Group Distribution (6 Cohorts)</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">D3 Stacked % + Totals</span>
            </div>
            <svg ref={ageChartRef} className="w-full h-auto" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-[11px] font-mono tabular-nums">
              {CITIZEN_AGE_GROUPS.map((age) => {
                const b = snapshot.ageGroups[age];
                return (
                  <div key={age} className="rounded border border-neutral-800 bg-neutral-950/80 px-2.5 py-1.5">
                    <div className="text-neutral-200 font-semibold truncate">{age}</div>
                    <div className="text-neutral-400">Total: {formatCompactCount(b.total)}</div>
                    <div className="text-rose-400">Zombies: {formatCompactCount(b.infected + b.transforming)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profession Categories Breakdown */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span>Profession Categories (7 Workforce Sectors)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Minors ({formatCompactCount(snapshot.minorCount)}): 0 Adult Roles
              </span>
            </div>
            <svg ref={profChartRef} className="w-full h-auto" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-neutral-800 pt-3 text-[11px] font-mono tabular-nums">
              {PROFESSION_CATEGORIES.map((prof) => {
                const b = snapshot.professionCategories[prof];
                return (
                  <div key={prof} className="rounded border border-neutral-800 bg-neutral-950/80 px-2.5 py-1.5">
                    <div className="text-neutral-200 font-semibold truncate">{prof}</div>
                    <div className="text-neutral-400">Total: {formatCompactCount(b.total)}</div>
                    <div className="text-rose-400">Inf: {formatCompactCount(b.infected)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Multiplier Trackers + D3 Growth Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-mono uppercase text-neutral-400">Daily Population Multipliers</div>
                <div className="mt-2 space-y-2.5 font-mono text-xs tabular-nums">
                  <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span>Citizen Growth Tracker</span>
                      <span>{snapshot.citizenGrowthMultiplier.toFixed(1)}× / day</span>
                    </div>
                    <div className="text-neutral-300 mt-1">
                      Day Start: {formatCompactCount(snapshot.citizenDailyStartPopulation)}
                    </div>
                    <div className="text-neutral-400">
                      Next Day Projection: {formatCompactCount(snapshot.projectedNextDayPopulation)}
                    </div>
                  </div>

                  <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2.5">
                    <div className="flex items-center justify-between text-rose-300 font-bold">
                      <span>Zombie Growth Tracker</span>
                      <span>{snapshot.zombieGrowthMultiplier.toFixed(1)}× / day</span>
                    </div>
                    <div className="text-neutral-300 mt-1">
                      Daily Start: {formatCompactCount(snapshot.zombieDailyStartCount)} · Target: {formatCompactCount(snapshot.zombieDailyTargetCount)}
                    </div>
                    <div className="text-neutral-400">
                      Bound Check: {activeZombiesTotal <= snapshot.totalPopulation ? 'Valid (≤ Total Citizens)' : 'Adjusted'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 border-t border-neutral-800 pt-2">
                Conversion Speed: {DAYTIME_CONVERSION_SECONDS}s Daytime · {NIGHTTIME_CONVERSION_SECONDS}s Nighttime ({snapshot.nightSpeedMultiplier}× faster)
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <span>Population & Infection Trajectory (D3 Live History)</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-emerald-400">― Total Citizens (3×/day)</span>
                  <span className="text-rose-400">― Zombies + Turning (2×/day)</span>
                  <span className="text-sky-400">--- Evacuated</span>
                </div>
              </div>
              <svg ref={historyChartRef} className="w-full h-auto" />
            </div>
          </div>

          {/* 7-Continent Asteroid Impact Zone Registry */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>7-Continent Asteroid Impact Registry (Including Antarctica)</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Resets cleanly on New Game · Reset Count: {snapshot.resetCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] uppercase text-neutral-400">
                    <th className="py-2 pr-3">Continent</th>
                    <th className="py-2 pr-3">Impact Zone</th>
                    <th className="py-2 pr-3">Radius</th>
                    <th className="py-2 pr-3">Trigger</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Severity</th>
                    <th className="py-2">Terrain Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70 tabular-nums">
                  {snapshot.asteroidImpacts.map((imp) => (
                    <tr
                      key={imp.id}
                      onClick={() => {
                        setSelectedImpactId(imp.id);
                        setSelectedCityId(imp.cityId);
                        setSubView('map');
                      }}
                      className="hover:bg-neutral-800/40 cursor-pointer"
                    >
                      <td className="py-2 pr-3 font-semibold text-neutral-200">{imp.continent}</td>
                      <td className="py-2 pr-3 text-neutral-300">
                        {imp.cityName} ({imp.country})
                      </td>
                      <td className="py-2 pr-3 text-neutral-400">{imp.radiusKm} km</td>
                      <td className="py-2 pr-3 text-neutral-400">Day {imp.triggerDay}</td>
                      <td className="py-2 pr-3">
                        <span className={imp.impacted ? 'text-orange-400 font-bold' : 'text-neutral-500'}>
                          {imp.impacted ? 'IMPACTED' : 'DORMANT'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-rose-400">{Math.round(imp.severity * 100)}%</td>
                      <td className="py-2 text-neutral-400">{imp.terrainCondition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
