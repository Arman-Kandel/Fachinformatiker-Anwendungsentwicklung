import { describe, expect, it } from 'vitest';

import { loadAppState, saveAppState } from '../src/app/storage/local-store';
import { buildExamDeck, buildModuleProgress, buildReviewQueue, computeAccuracy, getMasteryLevel, validateModule } from '../src/lib/learning';
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
