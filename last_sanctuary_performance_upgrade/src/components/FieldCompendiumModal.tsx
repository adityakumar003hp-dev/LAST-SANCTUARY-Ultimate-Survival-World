import React, { useEffect, useMemo, useState } from 'react';
import { X, Compass, PawPrint, Search, CheckCircle2, Thermometer, AlertTriangle, Trees, Mountain } from 'lucide-react';
import { BIOMES } from '../engine/world/BiomeGenerator';
import { WILDLIFE_SPECIES, WildlifeKind } from '../engine/WildlifeManager';
import { CodexState } from '../data/codex';
import { soundEngine } from '../utils/audio';

interface FieldCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  codexState: CodexState;
  currentBiomeId?: string;
}

export const FieldCompendiumModal: React.FC<FieldCompendiumModalProps> = ({
  isOpen,
  onClose,
  codexState,
  currentBiomeId,
}) => {
  const [activeTab, setActiveTab] = useState<'biomes' | 'wildlife'>('biomes');
  const [searchQuery, setSearchQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | WildlifeKind>('all');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const allBiomes = useMemo(() => Object.values(BIOMES), []);

  const filteredBiomes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allBiomes.filter((b) => {
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (threatFilter === 'low') return b.zombieThreatLevel <= 2;
      if (threatFilter === 'mid') return b.zombieThreatLevel === 3;
      if (threatFilter === 'high') return b.zombieThreatLevel >= 4;
      return true;
    });
  }, [allBiomes, searchQuery, threatFilter]);

  const filteredSpecies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return WILDLIFE_SPECIES.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.biomes.some((b) => b.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      if (kindFilter !== 'all' && s.kind !== kindFilter) return false;
      return true;
    });
  }, [searchQuery, kindFilter]);

  if (!isOpen) return null;

  const discoveredSet = new Set(codexState.discoveredBiomes);
  const scannedSet = new Set(codexState.scannedSpecies);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-3 sm:p-4 font-sans select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Field Compendium"
    >
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-wide text-neutral-100">
                World &amp; Wildlife Field Compendium
              </h2>
              <p className="text-xs text-neutral-400">
                Biomes Discovered:{' '}
                <span className="font-mono font-bold text-amber-400">
                  {discoveredSet.size}/{allBiomes.length}
                </span>{' '}
                · Species Scanned:{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {scannedSet.size}/{WILDLIFE_SPECIES.length}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors"
            aria-label="Close Compendium"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation + Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/25 px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUIClick();
                setActiveTab('biomes');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'biomes'
                  ? 'bg-amber-500 text-neutral-950 shadow'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <Mountain className="h-3.5 w-3.5" />
              <span>37 Biomes ({allBiomes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUIClick();
                setActiveTab('wildlife');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wildlife'
                  ? 'bg-emerald-500 text-neutral-950 shadow'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <PawPrint className="h-3.5 w-3.5" />
              <span>Wildlife &amp; Fauna ({WILDLIFE_SPECIES.length})</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'biomes' ? 'Search 37 biomes...' : 'Search species or biome...'}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Sub-filters */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-900 bg-neutral-950 px-5 py-2">
          {activeTab === 'biomes' ? (
            <>
              {[
                { id: 'all', label: 'All Regions' },
                { id: 'low', label: 'Low Threat (1-2)' },
                { id: 'mid', label: 'Moderate Threat (3)' },
                { id: 'high', label: 'Extreme Zone (4-5)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThreatFilter(opt.id as typeof threatFilter)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border cursor-pointer transition-colors ${
                    threatFilter === opt.id
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {(['all', 'mammal', 'dinosaur', 'bird', 'aquatic', 'reptile', 'amphibian', 'insect', 'rare'] as const).map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKindFilter(k)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize border cursor-pointer transition-colors ${
                      kindFilter === k
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {k}
                  </button>
                )
              )}
            </>
          )}
        </div>

        {/* Entries Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'biomes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBiomes.map((biome) => {
                const isDiscovered = discoveredSet.has(biome.id);
                const isHere = currentBiomeId === biome.id;
                const swatchHex = `#${biome.groundColor.toString(16).padStart(6, '0')}`;
                return (
                  <div
                    key={biome.id}
                    className={`flex flex-col justify-between gap-2.5 rounded-xl border p-4 transition-all ${
                      isHere
                        ? 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                        : isDiscovered
                        ? 'border-neutral-800 bg-neutral-900/50'
                        : 'border-neutral-900 bg-neutral-900/25 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="h-4 w-4 shrink-0 rounded border border-white/20" viewBox="0 0 16 16" aria-hidden="true">
                            <rect width="16" height="16" fill={swatchHex} />
                          </svg>
                          <h3 className="text-sm font-bold text-neutral-100 truncate">{biome.name}</h3>
                        </div>
                        {isHere ? (
                          <span className="shrink-0 rounded border border-amber-500/60 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                            CURRENT
                          </span>
                        ) : isDiscovered ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <span className="shrink-0 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[9px] font-mono text-neutral-500">
                            UNEXPLORED
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">{biome.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 pt-2 text-[10px] font-mono text-neutral-300">
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-sky-400" />
                        {biome.temperature}°C
                      </span>
                      <span className="flex items-center gap-1">
                        <Trees className="h-3 w-3 text-emerald-400" />
                        Wood {Math.round(biome.treeDensity * 100)}% · Scrap {Math.round(biome.scrapDensity * 100)}%
                      </span>
                      <span
                        className={`flex items-center gap-1 font-bold ${
                          biome.zombieThreatLevel >= 4
                            ? 'text-rose-400'
                            : biome.zombieThreatLevel === 3
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Threat {biome.zombieThreatLevel}/5
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSpecies.map((sp) => {
                const isScanned = scannedSet.has(sp.id);
                const swatchHex = `#${sp.color.toString(16).padStart(6, '0')}`;
                return (
                  <div
                    key={sp.id}
                    className={`flex flex-col justify-between gap-2.5 rounded-xl border p-4 ${
                      isScanned
                        ? 'border-emerald-800/70 bg-emerald-950/15'
                        : 'border-neutral-800 bg-neutral-900/45'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" viewBox="0 0 14 14" aria-hidden="true">
                              <circle cx="7" cy="7" r="7" fill={swatchHex} />
                            </svg>
                            <h3 className="text-sm font-bold text-neutral-100 truncate">{sp.name}</h3>
                          </div>
                          <p className="text-[10px] italic text-neutral-400 font-serif truncate">{sp.scientificName}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                            sp.diet === 'carnivore'
                              ? 'border-rose-800 bg-rose-950/80 text-rose-300'
                              : sp.diet === 'herbivore'
                              ? 'border-emerald-800 bg-emerald-950/80 text-emerald-300'
                              : 'border-amber-800 bg-amber-950/80 text-amber-300'
                          }`}
                        >
                          {sp.diet}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono uppercase text-neutral-300">
                          {sp.kind}
                        </span>
                        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono uppercase text-neutral-300">
                          {sp.temperament}
                        </span>
                        {sp.isTamable && (
                          <span className="rounded border border-cyan-700/70 bg-cyan-950/70 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
                            TAMABLE
                          </span>
                        )}
                        {isScanned && (
                          <span className="rounded border border-emerald-700/70 bg-emerald-950/70 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300">
                            SCANNED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-neutral-800/80 pt-2 text-[10px] text-neutral-400">
                      <div className="flex items-center justify-between font-mono text-neutral-300">
                        <span>Speed: {sp.speed.toFixed(1)} m/s</span>
                        <span>ATK: {sp.attackDamage}</span>
                      </div>
                      <div className="mt-1 truncate text-neutral-500">
                        Habitats: {sp.biomes.slice(0, 4).join(', ').replace(/_/g, ' ')}
                        {sp.biomes.length > 4 ? ` +${sp.biomes.length - 4}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
