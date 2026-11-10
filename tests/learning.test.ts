import { describe, expect, it } from 'vitest';

import { loadAppState, saveAppState } from '../src/app/storage/local-store';
import { answerExamQuestion, buildExamDeck, buildModuleOverview, buildModuleProgress, buildReviewQueue, buildStudyAgenda, computeAccuracy, expireExamSession, getExamRemainingSeconds, getExamResult, getMasteryLevel, startExamSession, updateModuleProgressForAnswer, validateModule } from '../src/lib/learning';
import type { AppState, Module } from '../src/types';

describe('learning logic', () => {
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
        q1: 0,
        q2: 0,
        q3: 2,
      },
    );

    expect(reviewQueue).toEqual(['q1', 'q2']);
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
      { 'module-one': ['q1', 'q2'], 'module-two': ['q3', 'q4'] },
      { 'module-one': ['q1'], 'module-two': [] },
      { q1: 0, q3: 1 },
      3,
    );

    expect(agenda).toEqual([
      { moduleId: 'module-one', title: 'Modul Eins', kind: 'review', questionId: 'q1', pendingCount: 1 },
      { moduleId: 'module-one', title: 'Modul Eins', kind: 'continue', questionId: 'q2', pendingCount: 1 },
      { moduleId: 'module-two', title: 'Modul Zwei', kind: 'continue', questionId: 'q4', pendingCount: 1 },
    ]);
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
    expect(loadAppState(key, fallback)).toEqual(state);
  });
});
