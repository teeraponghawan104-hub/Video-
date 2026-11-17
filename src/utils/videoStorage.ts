const DB_NAME = 'krispscale_video_db';
const DB_VERSION = 2;
const STORE_NAME = 'active_video';
const HISTORY_STORE = 'patched_history';
const KEY_NAME = 'current_file';

export interface PatchedHistoryEntry {
  id: string;
  name: string;
  size: number;
  mode: string;
  resolutionLabel: string;
  patchedAt: number;
  blob: Blob;
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUploadedVideoToDb(file: File): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore storage quota errors
  }
}

export async function loadUploadedVideoFromDb(): Promise<File | null> {
  try {
    const db = await openVideoDb();
    const result = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val instanceof File ? val : null);
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearUploadedVideoFromDb(): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function savePatchedHistoryEntry(
  entry: PatchedHistoryEntry
): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      tx.objectStore(HISTORY_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore quota errors
  }
}

export async function loadPatchedHistoryEntries(): Promise<
  PatchedHistoryEntry[]
> {
  try {
    const db = await openVideoDb();
    const entries = await new Promise<PatchedHistoryEntry[]>(
      (resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE, 'readonly');
        const req = tx.objectStore(HISTORY_STORE).getAll();
        req.onsuccess = () => {
          const list = Array.isArray(req.result) ? req.result : [];
          resolve(
            list.sort((a, b) => (b.patchedAt || 0) - (a.patchedAt || 0))
          );
        };
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return entries;
  } catch {
    return [];
  }
}

export async function deletePatchedHistoryEntry(id: string): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      tx.objectStore(HISTORY_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
