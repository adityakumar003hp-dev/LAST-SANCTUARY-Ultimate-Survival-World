import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, AlertTriangle, ArrowUpDown, Search, ShieldCheck, Thermometer } from 'lucide-react';
import { BIOMES } from '../engine/world/BiomeGenerator';
import { BiomeDefinition, ZombieEntity } from '../types/game';
import { CityOutbreakTelemetry, GlobalOutbreakMetrics, OutbreakDangerLevel } from '../engine/world/GlobalOutbreakSimulator';

export interface BiomeOutbreakDatum {
  biome: BiomeDefinition;
  infectedPct: number;
  transformingPct: number;
  evacuatedPct: number;
  healthyPct: number;
  spreadVelocity: number;
  activeLocalZombies: number;
  dangerLevel: OutbreakDangerLevel;
  swatchHex: string;
}

interface BiomeOutbreakTrackerD3Props {
  currentBiomeId: string;
  zombies: ZombieEntity[];
  globalMetrics?: GlobalOutbreakMetrics;
  globalCities?: CityOutbreakTelemetry[];
}

type SortKey = 'infected' | 'threat' | 'temperature' | 'name';

const DANGER_COLORS: Record<OutbreakDangerLevel, string> = {
  Safe: '#10b981',
  Alert: '#f59e0b',
  Containment: '#f97316',
  Overrun: '#f43f5e',
  Critical: '#dc2626',
};

function classifyBiomeDanger(infectedPct: number, threatLevel: number): OutbreakDangerLevel {
  if (infectedPct >= 52 || (infectedPct >= 38 && threatLevel >= 5)) return 'Critical';
  if (infectedPct >= 30) return 'Overrun';
  if (infectedPct >= 14) return 'Containment';
  if (infectedPct >= 3) return 'Alert';
  return 'Safe';
}

function toHexColor(num: number): string {
  return `#${(num >>> 0).toString(16).padStart(6, '0')}`;
}

export const BiomeOutbreakTrackerD3: React.FC<BiomeOutbreakTrackerD3Props> = ({
  currentBiomeId,
  zombies,
  globalMetrics,
  globalCities,
}) => {
  const barSvgRef = useRef<SVGSVGElement | null>(null);
  const scatterSvgRef = useRef<SVGSVGElement | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>('infected');
  const [searchQuery, setSearchQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState<number>(0);
  const [hoveredBiome, setHoveredBiome] = useState<BiomeOutbreakDatum | null>(null);
  const [selectedBiomeId, setSelectedBiomeId] = useState<string>(currentBiomeId);

  const allBiomes = useMemo(() => Object.values(BIOMES), []);

  // Derive live deterministic outbreak statistics for all 37 biomes
  const biomeData = useMemo<BiomeOutbreakDatum[]>(() => {
    const severity = globalMetrics?.apocalypticSeverity ?? 0;
    const totalPop = Math.max(
      1,
      (globalMetrics?.totalHealthy ?? 0) +
        (globalMetrics?.totalTransforming ?? 0) +
        (globalMetrics?.totalInfected ?? 0) +
        (globalMetrics?.totalEvacuated ?? 0)
    );
    const globalInfRatio = (globalMetrics?.totalInfected ?? 0) / totalPop;
    const globalTransRatio = (globalMetrics?.totalTransforming ?? 0) / totalPop;
    const globalEvacRatio = (globalMetrics?.totalEvacuated ?? 0) / totalPop;

    // Count active 3D zombies near/inside current region as a local outbreak multiplier
    const livingZombies = zombies.filter((z) => z.state !== 'dead').length;
    const avgCityOverrun =
      globalCities && globalCities.length > 0
        ? globalCities.filter((c) => c.dangerLevel === 'Overrun' || c.dangerLevel === 'Critical').length /
          globalCities.length
        : 0;

    return allBiomes.map((b, idx) => {
      // Biome vulnerability combines threat tier (1..5), infrastructure/scrap density (dense urban zones spread fastest),
      // and temperature moderation (extreme cold/islands slow biological transmission slightly)
      const threatNorm = b.zombieThreatLevel / 5;
      const urbanDensityBoost = 0.55 + b.scrapDensity * 0.9;
      const isolationDampener =
        b.id === 'island' || b.id === 'glacier_field' || b.id === 'tundra' || b.id === 'coral_coast'
          ? 0.52
          : b.id === 'subway_tunnels' || b.id === 'abandoned_city' || b.id === 'research_facility'
            ? 1.38
            : 1.0;

      const phaseOffset = ((idx * 17) % 11) * 0.014;
      const baseDriver = Math.max(severity * 0.72, globalInfRatio * 2.2 + avgCityOverrun * 0.35);
      const localBonus = b.id === currentBiomeId ? Math.min(18, livingZombies * 1.4) : 0;

      const rawInfected =
        baseDriver > 0.005 || localBonus > 0
          ? Math.min(
              88,
              Math.max(
                0,
                (baseDriver * (22 + threatNorm * 58) * urbanDensityBoost * isolationDampener +
                  phaseOffset * severity * 35 +
                  localBonus)
              )
            )
          : 0;

      const rawTransforming =
        baseDriver > 0.005
          ? Math.min(
              100 - rawInfected,
              Math.max(0.4, (globalTransRatio * 140 + severity * 9.5) * threatNorm * isolationDampener)
            )
          : 0;

      const rawEvacuated =
        rawInfected > 4
          ? Math.min(
              100 - rawInfected - rawTransforming,
              Math.max(0.5, globalEvacRatio * 110 + (1 - threatNorm * 0.4) * severity * 11)
            )
          : 0;

      const infectedPct = Number(rawInfected.toFixed(1));
      const transformingPct = Number(rawTransforming.toFixed(1));
      const evacuatedPct = Number(rawEvacuated.toFixed(1));
      const healthyPct = Number(Math.max(0, 100 - infectedPct - transformingPct - evacuatedPct).toFixed(1));

      const spreadVelocity = Number(
        (severity * b.zombieThreatLevel * urbanDensityBoost * isolationDampener * 1.85).toFixed(2)
      );

      return {
        biome: b,
        infectedPct,
        transformingPct,
        evacuatedPct,
        healthyPct,
        spreadVelocity,
        activeLocalZombies: b.id === currentBiomeId ? livingZombies : 0,
        dangerLevel: classifyBiomeDanger(infectedPct, b.zombieThreatLevel),
        swatchHex: toHexColor(b.groundColor),
      };
    });
  }, [allBiomes, currentBiomeId, zombies, globalMetrics, globalCities]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...biomeData]
      .filter((d) => {
        if (threatFilter > 0 && d.biome.zombieThreatLevel !== threatFilter) return false;
        if (!q) return true;
        return (
          d.biome.name.toLowerCase().includes(q) ||
          d.biome.id.toLowerCase().includes(q) ||
          d.dangerLevel.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'infected') {
          return b.infectedPct - a.infectedPct || b.biome.zombieThreatLevel - a.biome.zombieThreatLevel;
        }
        if (sortBy === 'threat') {
          return b.biome.zombieThreatLevel - a.biome.zombieThreatLevel || b.infectedPct - a.infectedPct;
        }
        if (sortBy === 'temperature') {
          return b.biome.temperature - a.biome.temperature;
        }
        return a.biome.name.localeCompare(b.biome.name);
      });
  }, [biomeData, searchQuery, threatFilter, sortBy]);

  const summaryStats = useMemo(() => {
    const avgInfected = d3.mean(biomeData, (d) => d.infectedPct) ?? 0;
    const criticalOrOverrun = biomeData.filter(
      (d) => d.dangerLevel === 'Critical' || d.dangerLevel === 'Overrun'
    ).length;
    const safeCount = biomeData.filter((d) => d.dangerLevel === 'Safe').length;
    const hottestThreat = biomeData.reduce(
      (best, d) => (d.infectedPct > best.infectedPct ? d : best),
      biomeData[0]
    );
    return { avgInfected, criticalOrOverrun, safeCount, hottestThreat };
  }, [biomeData]);

  const activeDatum = useMemo(() => {
    if (hoveredBiome) return hoveredBiome;
    return biomeData.find((d) => d.biome.id === selectedBiomeId) || biomeData[0];
  }, [hoveredBiome, biomeData, selectedBiomeId]);

  // 1. Render Primary D3 Stacked Horizontal Bar Chart across filtered/all 37 Biomes
  useEffect(() => {
    const svgEl = barSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const rows = filteredAndSorted;
    const rowHeight = 23;
    const margin = { top: 28, right: 56, bottom: 26, left: 215 };
    const width = 680;
    const height = Math.max(240, margin.top + margin.bottom + rows.length * rowHeight);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(rows.map((d) => d.biome.id))
      .range([0, innerH])
      .padding(0.24);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisTop(x)
          .ticks(5)
          .tickSize(-innerH)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,3'));

    // Top Percentage Axis
    g.append('g')
      .call(
        d3
          .axisTop(x)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace'));

    // Stacked series via d3.stack()
    const keys = ['infectedPct', 'transformingPct', 'evacuatedPct', 'healthyPct'] as const;
    const stackColors: Record<string, string> = {
      infectedPct: '#ef4444',
      transformingPct: '#f59e0b',
      evacuatedPct: '#38bdf8',
      healthyPct: '#10b981',
    };

    const stacked = d3.stack<BiomeOutbreakDatum>().keys(keys)(rows);

    g.selectAll('g.layer')
      .data(stacked)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr('fill', (d) => stackColors[d.key] || '#64748b')
      .selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d[0]))
      .attr('y', (d) => y(d.data.biome.id) ?? 0)
      .attr('width', (d) => Math.max(0, x(d[1]) - x(d[0])))
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .attr('opacity', (d) => (d.data.biome.id === selectedBiomeId ? 1 : 0.88))
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredBiome(d.data))
      .on('mouseleave', () => setHoveredBiome(null))
      .on('click', (_event, d) => setSelectedBiomeId(d.data.biome.id));

    // Biome labels & swatches along Y axis
    const labelRows = g
      .selectAll('g.y-label')
      .data(rows)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(0, ${(y(d.biome.id) ?? 0) + y.bandwidth() / 2})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredBiome(d))
      .on('mouseleave', () => setHoveredBiome(null))
      .on('click', (_event, d) => setSelectedBiomeId(d.biome.id));

    labelRows
      .append('rect')
      .attr('x', -margin.left + 6)
      .attr('y', -5)
      .attr('width', 8)
      .attr('height', 10)
      .attr('rx', 2)
      .attr('fill', (d) => d.swatchHex)
      .attr('stroke', '#475569')
      .attr('stroke-width', 0.6);

    labelRows
      .append('text')
      .attr('x', -10)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '10.5px')
      .attr('font-weight', (d) => (d.biome.id === currentBiomeId || d.biome.id === selectedBiomeId ? '700' : '500'))
      .attr('fill', (d) =>
        d.biome.id === currentBiomeId ? '#38bdf8' : d.biome.id === selectedBiomeId ? '#f8fafc' : '#cbd5e1'
      )
      .text((d) => (d.biome.id === currentBiomeId ? `▶ ${d.biome.name}` : d.biome.name));

    // Right-side infected % numerical readout (tabular)
    labelRows
      .append('text')
      .attr('x', innerW + 8)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('fill', (d) => DANGER_COLORS[d.dangerLevel])
      .text((d) => `${d.infectedPct.toFixed(1)}%`);
  }, [filteredAndSorted, currentBiomeId, selectedBiomeId]);

  // 2. Render Secondary D3 Temperature vs. Infection Spread Scatter Matrix (all 37 Biomes)
  useEffect(() => {
    const svgEl = scatterSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 340;
    const height = 230;
    const margin = { top: 20, right: 18, bottom: 34, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([-22, 48]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
    const rScale = d3.scaleSqrt().domain([1, 5]).range([4, 10]);

    // Grid
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2'));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `${d}°C`)
      )
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '9px').attr('font-family', 'monospace'));

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => `${d}%`)
      )
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '9px').attr('font-family', 'monospace'));

    g.selectAll('circle.biome-node')
      .data(biomeData)
      .enter()
      .append('circle')
      .attr('class', 'biome-node')
      .attr('cx', (d) => x(d.biome.temperature))
      .attr('cy', (d) => y(d.infectedPct))
      .attr('r', (d) => rScale(d.biome.zombieThreatLevel))
      .attr('fill', (d) => DANGER_COLORS[d.dangerLevel])
      .attr('fill-opacity', (d) => (d.biome.id === selectedBiomeId ? 0.95 : 0.72))
      .attr('stroke', (d) =>
        d.biome.id === currentBiomeId ? '#38bdf8' : d.biome.id === selectedBiomeId ? '#ffffff' : '#09090b'
      )
      .attr('stroke-width', (d) => (d.biome.id === currentBiomeId || d.biome.id === selectedBiomeId ? 2 : 0.8))
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredBiome(d))
      .on('mouseleave', () => setHoveredBiome(null))
      .on('click', (_event, d) => setSelectedBiomeId(d.biome.id));
  }, [biomeData, currentBiomeId, selectedBiomeId]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
      {/* Main Left D3 Telemetry Canvas */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* Top Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Tracked Biomes</div>
            <div className="text-base font-bold font-mono tabular-nums text-neutral-100">{allBiomes.length} / 37</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Mean Infection</div>
            <div className="text-base font-bold font-mono tabular-nums text-rose-400">
              {summaryStats.avgInfected.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Critical / Overrun</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-400">
              {summaryStats.criticalOrOverrun} biomes
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Contained Safe</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-400">
              {summaryStats.safeCount} biomes
            </div>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter 37 biomes..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-100 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-neutral-400">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="infected">Sort: Infection %</option>
                <option value="threat">Sort: Threat Tier</option>
                <option value="temperature">Sort: Temperature</option>
                <option value="name">Sort: Biome Name</option>
              </select>
            </label>

            <select
              value={threatFilter}
              onChange={(e) => setThreatFilter(Number(e.target.value))}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:border-rose-500 focus:outline-none"
            >
              <option value={0}>All Threat Tiers (1–5)</option>
              <option value={5}>Tier 5 — Extreme</option>
              <option value={4}>Tier 4 — High</option>
              <option value={3}>Tier 3 — Elevated</option>
              <option value={2}>Tier 2 — Moderate</option>
              <option value={1}>Tier 1 — Low</option>
            </select>
          </div>
        </div>

        {/* Scrollable D3 Stacked Bar Container */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
            <span>D3 Stacked Infection Composition Across {filteredAndSorted.length} Biomes</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="inline-block h-2 w-2 rounded-xs bg-red-500" /> Infected
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="inline-block h-2 w-2 rounded-xs bg-amber-500" /> Transforming
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="inline-block h-2 w-2 rounded-xs bg-sky-400" /> Evacuated
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="inline-block h-2 w-2 rounded-xs bg-emerald-500" /> Healthy
              </span>
            </div>
          </div>
          <svg ref={barSvgRef} className="w-full" />
        </div>
      </div>

      {/* Right Sidebar: Selected Biome Detail + D3 Climate/Threat Scatter Matrix */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-neutral-800 p-4 bg-neutral-900/20 flex flex-col gap-3 overflow-y-auto">
        {activeDatum && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/75 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-4 w-4 rounded-sm border border-neutral-600 shrink-0"
                  style={{ backgroundColor: activeDatum.swatchHex }}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-neutral-100 truncate">{activeDatum.biome.name}</h3>
                  <p className="text-[11px] font-mono text-neutral-400">
                    {activeDatum.biome.id} · Threat Tier {activeDatum.biome.zombieThreatLevel}/5
                  </p>
                </div>
              </div>
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border"
                style={{
                  color: DANGER_COLORS[activeDatum.dangerLevel],
                  borderColor: `${DANGER_COLORS[activeDatum.dangerLevel]}66`,
                  backgroundColor: `${DANGER_COLORS[activeDatum.dangerLevel]}1a`,
                }}
              >
                {activeDatum.dangerLevel}
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{activeDatum.biome.description}</p>

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-neutral-800 text-[11px] font-mono tabular-nums">
              <div className="text-rose-400">Infected: {activeDatum.infectedPct.toFixed(1)}%</div>
              <div className="text-amber-400">Transforming: {activeDatum.transformingPct.toFixed(1)}%</div>
              <div className="text-sky-400">Evacuated: {activeDatum.evacuatedPct.toFixed(1)}%</div>
              <div className="text-emerald-400">Healthy: {activeDatum.healthyPct.toFixed(1)}%</div>
              <div className="flex items-center gap-1 text-neutral-300">
                <Thermometer className="h-3 w-3 text-amber-400" />
                {activeDatum.biome.temperature}°C
              </div>
              <div className="flex items-center gap-1 text-neutral-300">
                <Activity className="h-3 w-3 text-rose-400" />
                Velocity: {activeDatum.spreadVelocity}x
              </div>
            </div>

            {activeDatum.biome.id === currentBiomeId && (
              <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 px-2.5 py-1.5 text-[11px] font-mono text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Player currently located in this biome ({activeDatum.activeLocalZombies} active hostiles nearby)</span>
              </div>
            )}
          </div>
        )}

        {/* D3 Scatter Plot: Temperature vs Infection Spread */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Climate vs. Spread Matrix
            </span>
            <span className="text-[10px] font-mono text-neutral-400">Radius = Threat 1–5</span>
          </div>
          <svg ref={scatterSvgRef} className="w-full h-auto" />
          <p className="text-[10px] font-mono text-neutral-400 leading-snug">
            Hover or select any biome node to inspect real-time containment ratios, spread velocity, and climate exposure.
          </p>
        </div>
      </div>
    </div>
  );
};
