import type { AppState, ExamSession, ModuleProgress } from '../../types';

const STORAGE_VERSION = 1;

const memoryStore = new Map<string, string>();

type StoredPayload<T> = {
  version: number;
  data: T;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function finiteTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeStringRecord(value: unknown, fallback: Record<string, string[]>): Record<string, string[]> {
  if (!isRecord(value)) return fallback;

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    Array.isArray(entry) ? entry.filter(isString) : [],
  ]));
}

function normalizeNumberRecord(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!isRecord(value)) return fallback;

  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const number = nonNegativeInteger(entry);
    return number === null ? [] : [[key, number]];
  }));
}

function normalizeModuleProgress(value: unknown, moduleId: string): ModuleProgress | null {
  if (!isRecord(value)) return null;

  const seenValue = nonNegativeInteger(value['seen']);
  const correctValue = nonNegativeInteger(value['correct']);
  const total = nonNegativeInteger(value['total']);
  if (seenValue === null || correctValue === null || total === null) return null;

  const seen = Math.min(seenValue, total);
  const correct = Math.min(correctValue, seen);
  const lastPracticedAt = isString(value['lastPracticedAt']) ? value['lastPracticedAt'] : '';

  return {
    moduleId,
    seen,
    correct,
    total,
    lastPracticedAt,
    status: total > 0 && seen >= total ? 'completed' : seen > 0 ? 'in-progress' : 'not-started',
  };
}

function normalizeProgressRecord(value: unknown, fallback: Record<string, ModuleProgress>): Record<string, ModuleProgress> {
  if (!isRecord(value)) return fallback;

  return Object.fromEntries(Object.entries(value).flatMap(([moduleId, entry]) => {
    const progress = normalizeModuleProgress(entry, moduleId);
    return progress === null ? [] : [[moduleId, progress]];
  }));
}

function normalizeExamSession(value: unknown): ExamSession | null {
  if (!isRecord(value) || !isString(value['moduleId']) || !Array.isArray(value['questionIds'])) return null;

  const questionIds = [...new Set(value['questionIds'].filter(isString))];
  const currentIndex = nonNegativeInteger(value['currentIndex']);
  const startedAt = finiteTimestamp(value['startedAt']);
  const deadlineAt = finiteTimestamp(value['deadlineAt']);
  const status = value['status'];
  const completedAt = value['completedAt'] === null ? null : finiteTimestamp(value['completedAt']);

  if (
    questionIds.length === 0
    || currentIndex === null
    || currentIndex > questionIds.length
    || startedAt === null
    || deadlineAt === null
    || deadlineAt <= startedAt
    || (status !== 'active' && status !== 'completed' && status !== 'expired')
    || completedAt === null && value['completedAt'] !== null
    || status === 'active' && currentIndex >= questionIds.length
  ) {
    return null;
  }

  const answers = normalizeNumberRecord(value['answers'], {});
  const validAnswers = Object.fromEntries(Object.entries(answers).filter(([questionId]) => questionIds.includes(questionId)));

  return {
    moduleId: value['moduleId'],
    questionIds,
    answers: validAnswers,
    currentIndex,
    startedAt,
    deadlineAt,
    status,
    completedAt,
  };
}

export function normalizeAppState(value: unknown, fallback: AppState): AppState {
  const record = isRecord(value) ? value : {};
  const nullableString = (key: string, defaultValue: string | null): string | null => {
    const entry = record[key];
    return entry === null || isString(entry) ? entry : defaultValue;
  };

  return {
    resumeModuleId: nullableString('resumeModuleId', fallback.resumeModuleId),
    currentQuestionId: nullableString('currentQuestionId', fallback.currentQuestionId),
    selectedModuleId: nullableString('selectedModuleId', fallback.selectedModuleId),
    studySectionId: nullableString('studySectionId', fallback.studySectionId),
    reviewQueue: normalizeStringRecord(record['reviewQueue'], fallback.reviewQueue),
    moduleProgress: normalizeProgressRecord(record['moduleProgress'], fallback.moduleProgress),
    answeredQuestions: normalizeNumberRecord(record['answeredQuestions'], fallback.answeredQuestions),
    examSession: normalizeExamSession(record['examSession']),
    retryQuestionId: nullableString('retryQuestionId', fallback.retryQuestionId ?? null),
    lastUpdatedAt: nullableString('lastUpdatedAt', fallback.lastUpdatedAt),
  };
}

function getMemoryStorage(): StorageLike {
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

function getStorage(): StorageLike {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = globalThis.localStorage;
      if (storage) {
        return {
          getItem: (key: string) => {
            try {
              return storage.getItem(key) ?? memoryStore.get(key) ?? null;
            } catch {
              return memoryStore.get(key) ?? null;
            }
          },
          setItem: (key: string, value: string) => {
            memoryStore.set(key, value);
            try {
              storage.setItem(key, value);
            } catch {
              memoryStore.set(key, value);
            }
          },
          removeItem: (key: string) => {
            memoryStore.delete(key);
            try {
              storage.removeItem(key);
            } catch {
              memoryStore.delete(key);
            }
          },
        };
      }
    }
  } catch {
    return getMemoryStorage();
  }

  return getMemoryStorage();
}

export function loadAppState<T>(key: string, fallback: T, normalize: (value: unknown, fallback: T) => T): T {
  const raw = getStorage().getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    let data = parsed;
    if (isRecord(parsed) && 'version' in parsed && 'data' in parsed) {
      if (parsed['version'] !== STORAGE_VERSION) {
        return fallback;
      }

      data = parsed['data'];
    }

    if (data === undefined) {
      return fallback;
    }

    return normalize(data, fallback);
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
