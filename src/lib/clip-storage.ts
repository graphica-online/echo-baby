import type { Clip } from "@/types/clip";

const DB_NAME = "echo-baby";
const DB_VERSION = 1;
const STORE_CLIPS = "clips";
const STORE_SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        const store = db.createObjectStore(STORE_CLIPS, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("favorite", "favorite");
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/* ============ Clips ============ */

// Что храним в IndexedDB (url пересоздаётся при загрузке)
type StoredClip = Omit<Clip, "url">;

export async function saveClip(clip: Clip): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, "readwrite");
    const { url, ...toStore } = clip;
    tx.objectStore(STORE_CLIPS).put(toStore);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllClips(): Promise<Clip[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, "readonly");
    const req = tx.objectStore(STORE_CLIPS).getAll();
    req.onsuccess = () => {
      const stored = req.result as StoredClip[];
      // Создаём URL для каждого клипа
      const clips: Clip[] = stored.map((c) => ({
        ...c,
        url: URL.createObjectURL(c.blob),
      }));
      // Сортируем от новых к старым
      clips.sort((a, b) => b.createdAt - a.createdAt);
      resolve(clips);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteClip(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, "readwrite");
    tx.objectStore(STORE_CLIPS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateClip(id: string, patch: Partial<Clip>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, "readwrite");
    const store = tx.objectStore(STORE_CLIPS);
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result;
      if (!existing) {
        resolve();
        return;
      }
      const { url, ...rest } = patch as any;
      store.put({ ...existing, ...rest });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllClips(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIPS, "readwrite");
    tx.objectStore(STORE_CLIPS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ============ Settings ============ */

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSetting<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}