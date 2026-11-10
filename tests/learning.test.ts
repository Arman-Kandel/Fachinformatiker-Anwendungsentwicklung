import { describe, expect, it } from 'vitest';

import { buildModuleProgress, computeAccuracy, validateModule } from '../src/lib/learning';
import type { Module } from '../src/types';

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
});
