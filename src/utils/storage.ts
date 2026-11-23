import { FullGameSave, SaveSlotMetadata } from '../types/game';

const DB_NAME = 'LastSanctuaryRebirthDB';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_METADATA = 'save_metadata';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SAVES, STORE_METADATA], 'readwrite');
      const savesStore = tx.objectStore(STORE_SAVES);
      const metaStore = tx.objectStore(STORE_METADATA);

      savesStore.put(saveData);
      metaStore.put(saveData.metadata);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB, fallback to localStorage', err);
    try {
      localStorage.setItem(`lsr_save_${saveData.metadata.id}`, JSON.stringify(saveData));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }
}

export async function loadGameFromSlot(slotId: string): Promise<FullGameSave | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SAVES, 'readonly');
      const store = tx.objectStore(STORE_SAVES);
      const req = store.get(slotId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for save load', err);
    const local = localStorage.getItem(`lsr_save_${slotId}`);
    return local ? JSON.parse(local) : null;
  }
}

export async function getAllSaveSlots(): Promise<SaveSlotMetadata[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const req = store.getAll();

      req.onsuccess = () => {
        const results: SaveSlotMetadata[] = req.result || [];
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for metadata listing', err);
    return [];
  }
}

export async function deleteSaveSlot(slotId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SAVES, STORE_METADATA], 'readwrite');
      tx.objectStore(STORE_SAVES).delete(slotId);
      tx.objectStore(STORE_METADATA).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    localStorage.removeItem(`lsr_save_${slotId}`);
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

  const normalizedSave: FullGameSave = {
    ...(candidate as FullGameSave),
    metadata: importedMeta,
  };

  await saveGameToSlot(normalizedSave);
  return importedMeta;
}

