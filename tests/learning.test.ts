import { describe, expect, it } from 'vitest';

import { getApprovedSourceUrl, getModuleById, getModuleCatalog, getModuleIndex, getQuizByModuleId } from '../src/app/content-loader/content-loader';
import { loadAppState, normalizeAppState, saveAppState } from '../src/app/storage/local-store';
import { escapeHtml } from '../src/lib/html';
import { answerExamQuestion, buildExamDeck, buildModuleOverview, buildModuleProgress, buildReviewQueue, buildStudyAgenda, computeAccuracy, expireExamSession, getExamRemainingSeconds, getExamResult, getMasteryLevel, getQuestionAnswerKey, startExamSession, updateModuleProgressForAnswer, validateModule } from '../src/lib/learning';
import type { AppState, Module } from '../src/types';
import sourceCatalog from '../sources/catalog.json';

describe('learning logic', () => {
  it('escapes text before inserting it into HTML templates', () => {
    expect(escapeHtml(`<img src=x onerror='alert("x")'>&`)).toBe('&lt;img src=x onerror=&#39;alert(&quot;x&quot;)&#39;&gt;&amp;');
  });

  it('validates a complete module with source references', () => {
    const module: Module = {
      moduleId: 'ap1-01-datenmodellierung',
      exam: 'AP1',
      title: 'Datenmodellierung',
      difficulty: 'mittel',
      status: 'draft',
      tags: ['DB'],
      learningObjectives: ['Entitäten verstehen'],
      dependencies: [],
      sourceRefs: [
        {
          sourceId: 'FIAUSBV',
          quote: 'Grundlagen der Datenmodellierung.',
          section: 'Ausbildungsrahmen',
          type: 'official',
        },
      ],
      sections: [
        {
          id: 's1',
          type: 'theory',
          title: 'Grundlagen',
          content: 'Entitäten modellieren fachliche Objekte.',
          sourceRefs: [
            {
              sourceId: 'FIAUSBV',
              quote: 'Datenmodellierung ist fachlich relevant.',
              section: 'Ausbildungsrahmen',
              type: 'official',
            },
          ],
        },
      ],
    };

    expect(validateModule(module)).toEqual([]);
  });

  it('registers the AP1 exam framework module with source-backed questions', () => {
    const module = getModuleById('ap1-03-pruefungsrahmen');
    const quiz = getQuizByModuleId('ap1-03-pruefungsrahmen');

    expect(getModuleCatalog()).toContain(module);
    expect(getModuleIndex().some((entry) => entry.moduleId === 'ap1-03-pruefungsrahmen')).toBe(true);
    expect(module).toBeDefined();
    expect(quiz?.questions).toHaveLength(3);
    if (!module || !quiz) return;

    expect(validateModule(module)).toEqual([]);
    expect(module.sourceRefs.every((ref) => ref.sourceId === 'FIAUSBV' && ref.quote.length > 0)).toBe(true);
    expect(quiz.questions.every((question) => question.sourceRefs.some((ref) => ref.sourceId === 'FIAUSBV' && ref.quote.length > 0))).toBe(true);
  });

  it('uses only approved source excerpts for module and quiz claims', () => {
    const approvedEvidence = new Set(sourceCatalog.sources
      .filter((source) => source.status === 'approved')
      .flatMap((source) => source.evidence.map((evidence) => `${source.sourceId}::${evidence.section}::${evidence.quote}`)));
    const modules = getModuleCatalog();
    const refs = modules.flatMap((module) => [
      ...module.sourceRefs,
      ...module.sections.flatMap((section) => section.sourceRefs),
      ...(getQuizByModuleId(module.moduleId)?.questions.flatMap((question) => question.sourceRefs) ?? []),
    ]).concat(getModuleIndex().flatMap((entry) => entry.sourceRefs));
    const unresolvedRefs = refs.filter((ref) => !approvedEvidence.has(`${ref.sourceId}::${ref.section}::${ref.quote}`));

    expect(refs.length).toBeGreaterThan(0);
    expect(modules.every((module) => module.sections.every((section) => section.sourceRefs.length > 0))).toBe(true);
    expect(modules.every((module) => (getQuizByModuleId(module.moduleId)?.questions ?? []).every((question) => question.sourceRefs.length > 0))).toBe(true);
    expect(unresolvedRefs).toEqual([]);
  });

  it('resolves only registered source ids to external references', () => {
    expect(getApprovedSourceUrl('POSTGRESQL-TUTORIAL-SELECT')).toBe('https://www.postgresql.org/docs/18/tutorial-select.html');
    expect(getApprovedSourceUrl('unknown-source')).toBeNull();
  });

  it('computes a normal accuracy percentage', () => {
    expect(computeAccuracy(3, 4)).toBe(75);
  });

  it('creates a progress object for module tracking', () => {
    const progress = buildModuleProgress('ap1-01-datenmodellierung', 3, 2, 1, '2026-11-10T12:00:00.000Z');

    expect(progress.moduleId).toBe('ap1-01-datenmodellierung');
    expect(progress.seen).toBe(2);
    expect(progress.correct).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.status).toBe('in-progress');
  });

  it('creates a review queue for wrong answers', () => {
    const reviewQueue = buildReviewQueue(
      [
        { id: 'q1', correctIndex: 1, question: 'Q1', options: ['a', 'b'], explanation: '', sourceRefs: [] },
        { id: 'q2', correctIndex: 1, question: 'Q2', options: ['a', 'b'], explanation: '', sourceRefs: [] },
        { id: 'q3', correctIndex: 2, question: 'Q3', options: ['a', 'b', 'c'], explanation: '', sourceRefs: [] },
      ],
      {
        [getQuestionAnswerKey('module-one', 'q1')]: 0,
        [getQuestionAnswerKey('module-one', 'q2')]: 0,
        [getQuestionAnswerKey('module-one', 'q3')]: 2,
      },
      'module-one',
    );

    expect(reviewQueue).toEqual(['q1', 'q2']);
  });

  it('isolates answers when different modules reuse question ids', () => {
    const questions = [
      { id: 'q1', correctIndex: 1, question: 'Q1', options: ['a', 'b'], explanation: '', sourceRefs: [] },
    ];
    const answers = { [getQuestionAnswerKey('module-one', 'q1')]: 0 };

    expect(buildReviewQueue(questions, answers, 'module-one')).toEqual(['q1']);
    expect(buildReviewQueue(questions, answers, 'module-two')).toEqual([]);
  });

  it('updates progress when a wrong answer is corrected without double-counting', () => {
    const progress = buildModuleProgress('module-one', 3, 1, 0, '2026-11-10T12:00:00.000Z');
    const retried = updateModuleProgressForAnswer(progress, 0, 1, 1, '2026-11-10T12:05:00.000Z');

    expect(retried.seen).toBe(1);
    expect(retried.correct).toBe(1);
    expect(retried.status).toBe('in-progress');
    expect(retried.lastPracticedAt).toBe('2026-11-10T12:05:00.000Z');
  });

  it('derives mastery level from progress', () => {
    const mastery = getMasteryLevel({
      moduleId: 'ap1-01-datenmodellierung',
      seen: 3,
      correct: 3,
      total: 3,
      lastPracticedAt: '2026-11-10T12:00:00.000Z',
      status: 'completed',
    });

    expect(mastery.label).toBe('mastered');
    expect(mastery.percent).toBe(100);
  });

  it('builds a targeted exam deck from review and general questions', () => {
    const examDeck = buildExamDeck(
      [
        { id: 'q1', correctIndex: 0, question: 'Q1', options: ['a', 'b'], explanation: '', sourceRefs: [] },
        { id: 'q2', correctIndex: 1, question: 'Q2', options: ['a', 'b'], explanation: '', sourceRefs: [] },
        { id: 'q3', correctIndex: 0, question: 'Q3', options: ['a', 'b'], explanation: '', sourceRefs: [] },
      ],
      ['q3'],
      2,
    );

    expect(examDeck).toEqual(['q3', 'q1']);
  });

  it('runs a timed exam session and calculates its final result', () => {
    const started = startExamSession('module-one', ['q1', 'q2', 'q3'], 1_000, 60);
    expect(started).not.toBeNull();
    if (!started) return;

    expect(getExamRemainingSeconds(started, 1_000)).toBe(60);
    const firstAnswer = answerExamQuestion(started, 'q1', 1, 2_000);
    expect(firstAnswer.currentIndex).toBe(1);
    expect(firstAnswer.status).toBe('active');

    const secondAnswer = answerExamQuestion(firstAnswer, 'q2', 1, 3_000);
    const completed = answerExamQuestion(secondAnswer, 'q3', 0, 4_000);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(4_000);
    expect(getExamResult(completed, [
      { id: 'q1', correctIndex: 1, question: 'Q1', options: ['a', 'b'], explanation: '', sourceRefs: [] },
      { id: 'q2', correctIndex: 0, question: 'Q2', options: ['a', 'b'], explanation: '', sourceRefs: [] },
      { id: 'q3', correctIndex: 0, question: 'Q3', options: ['a', 'b'], explanation: '', sourceRefs: [] },
    ])).toEqual({ correct: 2, total: 3, percent: 67 });
  });

  it('expires an unanswered exam at its deadline', () => {
    const started = startExamSession('module-one', ['q1', 'q2'], 1_000, 60);
    expect(started).not.toBeNull();
    if (!started) return;

    expect(getExamRemainingSeconds(started, 60_999)).toBe(1);
    const expired = answerExamQuestion(started, 'q1', 1, 61_000);
    expect(expired.status).toBe('expired');
    expect(expired.completedAt).toBe(61_000);
    expect(expireExamSession(started, 61_000)).toEqual(expired);
  });

  it('builds a module overview for the curriculum', () => {
    const overview = buildModuleOverview(
      [
        { moduleId: 'ap1-01-datenmodellierung', exam: 'AP1', title: 'Datenmodellierung', difficulty: 'mittel', status: 'draft', tags: [], learningObjectives: [], dependencies: [], sourceRefs: [], sections: [] },
        { moduleId: 'ap1-02-sql', exam: 'AP1', title: 'SQL-Grundlagen', difficulty: 'mittel', status: 'draft', tags: [], learningObjectives: [], dependencies: [], sourceRefs: [], sections: [] },
      ],
      {
        'ap1-01-datenmodellierung': { moduleId: 'ap1-01-datenmodellierung', seen: 4, correct: 3, total: 4, lastPracticedAt: '2026-11-10T12:00:00.000Z', status: 'completed' },
        'ap1-02-sql': { moduleId: 'ap1-02-sql', seen: 1, correct: 1, total: 3, lastPracticedAt: '2026-11-10T12:00:00.000Z', status: 'in-progress' },
      },
    );

    expect(overview[0]?.title).toBe('Datenmodellierung');
    expect(overview[0]?.percent).toBe(75);
    expect(overview[0]?.mastery).toBe('ready');
    expect(overview[1]?.title).toBe('SQL-Grundlagen');
    expect(overview[1]?.percent).toBe(33);
    expect(overview[1]?.mastery).toBe('learning');
  });

  it('prioritizes reviews in the study agenda before unanswered questions', () => {
    const agenda = buildStudyAgenda(
      [
        { moduleId: 'module-one', exam: 'AP1', title: 'Modul Eins', difficulty: 'mittel', status: 'draft', tags: [], learningObjectives: [], dependencies: [], sourceRefs: [], sections: [] },
        { moduleId: 'module-two', exam: 'AP1', title: 'Modul Zwei', difficulty: 'mittel', status: 'draft', tags: [], learningObjectives: [], dependencies: [], sourceRefs: [], sections: [] },
      ],
      { 'module-one': ['q1', 'q2'], 'module-two': ['q1', 'q2'] },
      { 'module-one': ['q1'], 'module-two': [] },
      { [getQuestionAnswerKey('module-one', 'q1')]: 0 },
      3,
    );

    expect(agenda).toEqual([
      { moduleId: 'module-one', title: 'Modul Eins', kind: 'review', questionId: 'q1', pendingCount: 1 },
      { moduleId: 'module-one', title: 'Modul Eins', kind: 'continue', questionId: 'q2', pendingCount: 1 },
      { moduleId: 'module-two', title: 'Modul Zwei', kind: 'continue', questionId: 'q1', pendingCount: 2 },
    ]);
  });

  it('does not schedule completed modules when only legacy answer keys remain', () => {
    const agenda = buildStudyAgenda(
      [
        { moduleId: 'module-one', exam: 'AP1', title: 'Modul Eins', difficulty: 'mittel', status: 'draft', tags: [], learningObjectives: [], dependencies: [], sourceRefs: [], sections: [] },
      ],
      { 'module-one': ['q1', 'q2'] },
      { 'module-one': [] },
      { q1: 1, q2: 1 },
      3,
      { 'module-one': buildModuleProgress('module-one', 2, 2, 2, '2026-11-10T12:00:00.000Z') },
    );

    expect(agenda).toEqual([]);
  });

  it('persists and loads app state from local storage', () => {
    const key = 'test-state';
    const fallback: AppState = {
      resumeModuleId: null,
      currentQuestionId: null,
      selectedModuleId: null,
      studySectionId: null,
      reviewQueue: {},
      moduleProgress: {},
      answeredQuestions: {},
      examSession: null,
      retryQuestionId: null,
      lastUpdatedAt: null,
    };

    const state: AppState = {
      ...fallback,
      resumeModuleId: 'ap1-01-datenmodellierung',
      selectedModuleId: 'ap1-01-datenmodellierung',
      studySectionId: 's2',
      reviewQueue: {
        'ap1-01-datenmodellierung': ['q1'],
      },
    };

    saveAppState(key, state);
    expect(loadAppState(key, fallback, normalizeAppState)).toEqual(state);
  });

  it('uses the memory fallback when browser storage access is blocked', () => {
    const key = 'blocked-storage-state';
    const fallback: AppState = {
      resumeModuleId: null,
      currentQuestionId: null,
      selectedModuleId: null,
      studySectionId: null,
      reviewQueue: {},
      moduleProgress: {},
      answeredQuestions: {},
      examSession: null,
      retryQuestionId: null,
      lastUpdatedAt: null,
    };
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('Storage access blocked');
        },
      });
      saveAppState(key, { ...fallback, selectedModuleId: 'module-one' });
      expect(loadAppState(key, fallback, normalizeAppState).selectedModuleId).toBe('module-one');

      const failingOperationsKey = 'failing-storage-operations';
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => ({
          getItem: () => {
            throw new Error('Storage read failed');
          },
          setItem: () => {
            throw new Error('Storage write failed');
          },
          removeItem: () => {
            throw new Error('Storage remove failed');
          },
        }),
      });
      saveAppState(failingOperationsKey, { ...fallback, selectedModuleId: 'module-two' });
      expect(loadAppState(failingOperationsKey, fallback, normalizeAppState).selectedModuleId).toBe('module-two');
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }
  });

  it('normalizes damaged local state without discarding valid progress', () => {
    const fallback: AppState = {
      resumeModuleId: null,
      currentQuestionId: null,
      selectedModuleId: null,
      studySectionId: null,
      reviewQueue: {},
      moduleProgress: {},
      answeredQuestions: {},
      examSession: null,
      retryQuestionId: null,
      lastUpdatedAt: null,
    };
    const normalized = normalizeAppState({
      selectedModuleId: 'module-one',
      reviewQueue: { 'module-one': ['q1', 42] },
      moduleProgress: {
        'module-one': { seen: 2, correct: 99, total: 3, lastPracticedAt: '2026-11-10T12:00:00.000Z', status: 'invalid' },
      },
      answeredQuestions: { 'module-one::q1': 1, q1: 0, invalid: '1' },
      examSession: { moduleId: 'module-one', questionIds: ['q1'], answers: {}, currentIndex: 9, startedAt: 1_000, deadlineAt: 61_000, status: 'active', completedAt: null },
      retryQuestionId: 7,
    }, fallback);

    expect(normalized.selectedModuleId).toBe('module-one');
    expect(normalized.reviewQueue).toEqual({ 'module-one': ['q1'] });
    expect(normalized.moduleProgress['module-one']).toEqual({
      moduleId: 'module-one',
      seen: 2,
      correct: 2,
      total: 3,
      lastPracticedAt: '2026-11-10T12:00:00.000Z',
      status: 'in-progress',
    });
    expect(normalized.answeredQuestions).toEqual({ 'module-one::q1': 1, q1: 0 });
    expect(normalized.examSession).toBeNull();
    expect(normalized.retryQuestionId).toBeNull();

    const legacy = normalizeAppState({ answeredQuestions: { q1: 0 } }, fallback);
    expect(legacy.answeredQuestions).toEqual({ q1: 0 });
    expect(legacy.examSession).toBeNull();
    expect(legacy.retryQuestionId).toBeNull();
  });
});
