export interface CodexState {
  discoveredBiomes: string[];
  scannedSpecies: string[];
}

const CODEX_STORAGE_KEY = 'lsr_codex_v1';
export const CODEX_UPDATED_EVENT = 'lsr:codex-updated';

const DEFAULT_CODEX: CodexState = {
  discoveredBiomes: ['green_plains'],
  scannedSpecies: [],
};

export function loadCodexState(): CodexState {
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CODEX };
    const parsed = JSON.parse(raw) as Partial<CodexState>;
    return {
      discoveredBiomes: Array.isArray(parsed.discoveredBiomes)
        ? Array.from(new Set(parsed.discoveredBiomes.filter((v): v is string => typeof v === 'string')))
        : ['green_plains'],
      scannedSpecies: Array.isArray(parsed.scannedSpecies)
        ? Array.from(new Set(parsed.scannedSpecies.filter((v): v is string => typeof v === 'string')))
        : [],
    };
  } catch {
    return { ...DEFAULT_CODEX };
  }
}

function saveCodexState(state: CodexState): void {
  try {
    localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent<CodexState>(CODEX_UPDATED_EVENT, { detail: state }));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordDiscoveredBiome(biomeId: string): { state: CodexState; isNew: boolean } {
  const current = loadCodexState();
  if (!biomeId || current.discoveredBiomes.includes(biomeId)) {
    return { state: current, isNew: false };
  }
  const next: CodexState = {
    ...current,
    discoveredBiomes: [...current.discoveredBiomes, biomeId],
  };
  saveCodexState(next);
  return { state: next, isNew: true };
}

export function recordScannedSpecies(speciesId: string): { state: CodexState; isNew: boolean } {
  const current = loadCodexState();
  if (!speciesId || current.scannedSpecies.includes(speciesId)) {
    return { state: current, isNew: false };
  }
  const next: CodexState = {
    ...current,
    scannedSpecies: [...current.scannedSpecies, speciesId],
  };
  saveCodexState(next);
  return { state: next, isNew: true };
}
