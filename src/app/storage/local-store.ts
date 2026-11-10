const STORAGE_VERSION = 1;

const memoryStore = new Map<string, string>();

type StoredPayload<T> = {
  version: number;
  data: T;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageLike {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    const storage = globalThis.localStorage;
    if (storage) {
      return storage;
    }
  }

  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
  };
}

export function loadAppState<T>(key: string, fallback: T): T {
  const raw = getStorage().getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as StoredPayload<T> | T;
    const payload = 'version' in (parsed as Record<string, unknown>) && 'data' in (parsed as Record<string, unknown>)
      ? (parsed as StoredPayload<T>)
      : { version: STORAGE_VERSION, data: parsed as T };

    if (payload.version !== STORAGE_VERSION) {
      return fallback;
    }

    return payload.data;
  } catch {
    return fallback;
  }
}

export function saveAppState<T>(key: string, value: T): void {
  const payload: StoredPayload<T> = {
    version: STORAGE_VERSION,
    data: value,
  };

  getStorage().setItem(key, JSON.stringify(payload));
}
