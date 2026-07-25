/**
 * IndexedDB minimal — sem dependências.
 * Stores:
 *  - outbox: fila de mutações pendentes (POST/PATCH/DELETE)
 *  - cache : cache de leituras GET (para uso pelos apps de campo)
 */

const DB_NAME = "vertex-offline";
const DB_VERSION = 1;

type Store = "outbox" | "cache";

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureBrowser() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponível");
}

export function openDb(): Promise<IDBDatabase> {
  ensureBrowser();
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("outbox")) {
        const s = db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
        s.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    if (req instanceof IDBRequest) {
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    } else {
      (req as Promise<T>).then(resolve, reject);
    }
  });
}

export async function idbPut(store: Store, value: any) {
  return tx(store, "readwrite", (s) => s.put(value));
}
export async function idbGet<T = any>(store: Store, key: IDBValidKey): Promise<T | undefined> {
  return tx(store, "readonly", (s) => s.get(key)) as any;
}
export async function idbDelete(store: Store, key: IDBValidKey) {
  return tx(store, "readwrite", (s) => s.delete(key));
}
export async function idbGetAll<T = any>(store: Store): Promise<T[]> {
  return tx(store, "readonly", (s) => s.getAll()) as any;
}
export async function idbClear(store: Store) {
  return tx(store, "readwrite", (s) => s.clear());
}
export async function idbCount(store: Store): Promise<number> {
  return tx(store, "readonly", (s) => s.count()) as any;
}
