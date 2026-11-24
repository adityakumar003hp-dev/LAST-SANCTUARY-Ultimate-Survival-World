import { FullGameSave, SaveSlotMetadata } from '../types/game';
import { DEFAULT_EARTH_ORIGIN } from '../engine/geo/EarthProjection';

const DB_NAME = 'LastSanctuaryRebirthDB';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_METADATA = 'save_metadata';
export const CURRENT_SAVE_VERSION = 3;

// Serialize writes per slot so an older checkpoint can never overtake a newer one.
const slotWriteQueues = new Map<string, Promise<void>>();
const backupKey = (slotId: string) => `lsr_save_backup_${slotId}`;
const stagingKey = (slotId: string) => `lsr_save_staging_${slotId}`;

function isValidSave(value: unknown, slotId?: string): value is FullGameSave {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FullGameSave>;
  return !!candidate.metadata && typeof candidate.metadata.id === 'string' &&
    (!slotId || candidate.metadata.id === slotId) &&
    Array.isArray(candidate.playerPosition) && candidate.playerPosition.length === 3 &&
    candidate.playerPosition.every(Number.isFinite) &&
    !!candidate.playerStats && typeof candidate.playerStats === 'object' &&
    Array.isArray(candidate.inventory);
}

function parseSave(raw: string | null, slotId: string): FullGameSave | null {
  if (!raw) return null;
  try { const parsed: unknown = JSON.parse(raw); return isValidSave(parsed, slotId) ? migrateSaveData(parsed) : null; }
  catch { return null; }
}

export function migrateSaveData(raw: FullGameSave): FullGameSave {
  const earthOrigin = raw.earthOrigin
    ? {
        id: raw.earthOrigin.id || DEFAULT_EARTH_ORIGIN.id,
        name: raw.earthOrigin.name || DEFAULT_EARTH_ORIGIN.name,
        country: raw.earthOrigin.country || DEFAULT_EARTH_ORIGIN.country,
        continent: raw.earthOrigin.continent || DEFAULT_EARTH_ORIGIN.continent,
        lat: Number.isFinite(raw.earthOrigin.lat) ? raw.earthOrigin.lat : DEFAULT_EARTH_ORIGIN.lat,
        lon: Number.isFinite(raw.earthOrigin.lon) ? raw.earthOrigin.lon : DEFAULT_EARTH_ORIGIN.lon,
      }
    : { ...DEFAULT_EARTH_ORIGIN };

  const stats = {
    ...raw.playerStats,
    oxygen: raw.playerStats.oxygen ?? 100,
    maxOxygen: raw.playerStats.maxOxygen ?? 100,
    flashlightBattery: raw.playerStats.flashlightBattery ?? 100,
    radiationExposure: raw.playerStats.radiationExposure ?? 0,
    noiseLevel: raw.playerStats.noiseLevel ?? 6,
    latitude: raw.playerStats.latitude ?? earthOrigin.lat,
    longitude: raw.playerStats.longitude ?? earthOrigin.lon,
    countryName: raw.playerStats.countryName ?? earthOrigin.country,
    continentOrOcean: raw.playerStats.continentOrOcean ?? earthOrigin.continent,
  };

  return {
    ...raw,
    saveVersion: CURRENT_SAVE_VERSION,
    earthOrigin,
    playerStats: stats,
    discoveredChunks: Array.isArray(raw.discoveredChunks) ? raw.discoveredChunks : ['0_0'],
    waypoints: Array.isArray(raw.waypoints) ? raw.waypoints : [],
    chunkModifications: raw.chunkModifications ?? {},
    bounties: Array.isArray(raw.bounties) ? raw.bounties : raw.bounties,
    structures: Array.isArray(raw.structures) ? raw.structures : [],
    quests: Array.isArray(raw.quests) ? raw.quests : [],
  };
}

function readLocalStorageSave(slotId: string): FullGameSave | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const candidates = [
      parseSave(localStorage.getItem(`lsr_save_${slotId}`), slotId),
      parseSave(localStorage.getItem(backupKey(slotId)), slotId),
      parseSave(localStorage.getItem(stagingKey(slotId)), slotId),
    ].filter((save): save is FullGameSave => save !== null);
    return candidates.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)[0] ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStorageSaveSync(saveData: FullGameSave): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const versioned = { ...saveData, saveVersion: CURRENT_SAVE_VERSION };
    localStorage.setItem(`lsr_save_${versioned.metadata.id}`, JSON.stringify(versioned));
  } catch (e) {
    console.warn('LocalStorage mirror write skipped:', e);
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SAVES)) {
        db.createObjectStore(STORE_SAVES, { keyPath: 'metadata.id' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGameToSlot(saveData: FullGameSave): Promise<void> {
  const versioned = migrateSaveData(saveData);
  if (!isValidSave(versioned, versioned.metadata.id)) throw new Error('Refusing to persist an invalid checkpoint.');
  const slotId = versioned.metadata.id;
  const previous = slotWriteQueues.get(slotId) ?? Promise.resolve();
  const write = previous.catch(() => undefined).then(async () => {
    const serialized = JSON.stringify(versioned);
    let indexedDbCommitted = false;
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_SAVES, STORE_METADATA], 'readwrite');
        tx.objectStore(STORE_SAVES).put(versioned);
        tx.objectStore(STORE_METADATA).put(versioned.metadata);
        tx.oncomplete = () => { indexedDbCommitted = true; db.close(); resolve(); };
        tx.onerror = () => { const error = tx.error ?? new Error('Checkpoint transaction failed'); db.close(); reject(error); };
        tx.onabort = () => { const error = tx.error ?? new Error('Checkpoint transaction aborted'); db.close(); reject(error); };
      });
    } catch (err) {
      console.warn('IndexedDB checkpoint commit failed; preserving browser backup:', err);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const primaryKey = `lsr_save_${slotId}`;
        const oldPrimary = localStorage.getItem(primaryKey);
        if (oldPrimary && parseSave(oldPrimary, slotId)) localStorage.setItem(backupKey(slotId), oldPrimary);
        localStorage.setItem(stagingKey(slotId), serialized);
        const staged = parseSave(localStorage.getItem(stagingKey(slotId)), slotId);
        if (!staged || staged.metadata.timestamp !== versioned.metadata.timestamp) throw new Error('Staged checkpoint verification failed.');
        localStorage.setItem(primaryKey, serialized);
        localStorage.removeItem(stagingKey(slotId));
      } catch (err) {
        console.warn('Local checkpoint mirror could not be committed:', err);
        try { localStorage.removeItem(stagingKey(slotId)); } catch { /* storage unavailable */ }
        if (!indexedDbCommitted) throw err;
      }
    }
    if (!indexedDbCommitted && typeof localStorage === 'undefined') throw new Error('No durable checkpoint storage is available.');
  });
  slotWriteQueues.set(slotId, write);
  try { await write; } finally { if (slotWriteQueues.get(slotId) === write) slotWriteQueues.delete(slotId); }
}

export async function loadGameFromSlot(slotId: string): Promise<FullGameSave | null> {
  let idbSave: FullGameSave | null = null;
  try {
    const db = await openDatabase();
    idbSave = await new Promise<FullGameSave | null>((resolve, reject) => {
      const tx = db.transaction(STORE_SAVES, 'readonly');
      const store = tx.objectStore(STORE_SAVES);
      const req = store.get(slotId);

      req.onsuccess = () => resolve(isValidSave(req.result, slotId) ? migrateSaveData(req.result) : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB load failed, checking localStorage fallback:', err);
  }

  const localSave = readLocalStorageSave(slotId);
  if (idbSave && localSave) return (localSave.metadata.timestamp ?? 0) > (idbSave.metadata.timestamp ?? 0) ? localSave : idbSave;
  return idbSave ?? localSave;
}

export async function getAllSaveSlots(): Promise<SaveSlotMetadata[]> {
  const merged = new Map<string, SaveSlotMetadata>();

  try {
    const db = await openDatabase();
    const idbSlots = await new Promise<SaveSlotMetadata[]>((resolve, reject) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    for (const meta of idbSlots) {
      if (meta?.id) merged.set(meta.id, meta);
    }
  } catch (err) {
    console.warn('IndexedDB unavailable for metadata listing, checking localStorage:', err);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('lsr_save_')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<FullGameSave>;
        if (parsed?.metadata?.id) {
          const existing = merged.get(parsed.metadata.id);
          if (!existing || parsed.metadata.timestamp > existing.timestamp) {
            merged.set(parsed.metadata.id, parsed.metadata);
          }
        }
      }
    }
  } catch {}

  return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteSaveSlot(slotId: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`lsr_save_${slotId}`);
    }
  } catch {}
  try {
    const db = await openDatabase();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_SAVES, STORE_METADATA], 'readwrite');
      tx.objectStore(STORE_SAVES).delete(slotId);
      tx.objectStore(STORE_METADATA).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }
}

export async function exportSaveSlotAsJson(
  slotId: string
): Promise<{ filename: string; json: string } | null> {
  const save = await loadGameFromSlot(slotId);
  if (!save) return null;

  const safeSlot = (save.metadata?.id || slotId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const day = save.dayCount || save.metadata?.dayCount || 1;
  const filename = `last-sanctuary-${safeSlot}-day${day}.json`;
  const json = JSON.stringify(save, null, 2);
  return { filename, json };
}

export async function downloadSaveSlotJson(slotId: string): Promise<boolean> {
  const exported = await exportSaveSlotAsJson(slotId);
  if (!exported) return false;

  const blob = new Blob([exported.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exported.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function validateAndImportSaveJson(
  rawJson: string,
  targetSlotId?: string
): Promise<SaveSlotMetadata> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Last Sanctuary save backup.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Save file does not contain a valid save object.');
  }

  const candidate = parsed as Partial<FullGameSave>;
  if (
    !candidate.metadata ||
    typeof candidate.metadata !== 'object' ||
    !Array.isArray(candidate.playerPosition) ||
    candidate.playerPosition.length !== 3 ||
    !candidate.playerStats ||
    !Array.isArray(candidate.inventory) ||
    !Array.isArray(candidate.hotbar)
  ) {
    throw new Error('Missing required survival save fields (metadata, position, stats, or inventory).');
  }

  const slotId =
    targetSlotId ||
    (typeof candidate.metadata.id === 'string' && candidate.metadata.id.trim().length > 0
      ? candidate.metadata.id.trim()
      : `imported_${Date.now()}`);

  const importedMeta: SaveSlotMetadata = {
    ...candidate.metadata,
    id: slotId,
    name: targetSlotId
      ? targetSlotId === 'autosave'
        ? 'Autosave Slot'
        : targetSlotId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : candidate.metadata.name || `Imported Save (${slotId})`,
    timestamp: Date.now(),
  };

  const normalizedSave = migrateSaveData({
    ...(candidate as FullGameSave),
    metadata: importedMeta,
  });

  await saveGameToSlot(normalizedSave);
  return importedMeta;
}
