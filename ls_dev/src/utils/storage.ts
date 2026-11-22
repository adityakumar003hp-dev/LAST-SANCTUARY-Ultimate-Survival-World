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
