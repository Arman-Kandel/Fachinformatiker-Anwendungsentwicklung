import type { Module, ModuleProgress, Question, SourceRef } from '../types';

export function validateModule(module: Module): string[] {
  const errors: string[] = [];

  if (!module.moduleId) errors.push('moduleId fehlt');
  if (!module.exam) errors.push('exam fehlt');
  if (!module.title) errors.push('title fehlt');
  if (!Array.isArray(module.learningObjectives) || module.learningObjectives.length === 0) {
    errors.push('learningObjectives fehlt oder ist leer');
  }
  if (!Array.isArray(module.sourceRefs) || module.sourceRefs.length === 0) {
    errors.push('sourceRefs fehlt oder ist leer');
  }
  if (!Array.isArray(module.sections) || module.sections.length === 0) {
    errors.push('sections fehlt oder ist leer');
  }

  if (!module.sections.every((section) => section.content.trim().length > 0)) {
    errors.push('mindestens eine Section hat keinen Inhalt');
  }

  return errors;
}

export function computeAccuracy(correct: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((correct / total) * 100);
}

export function getQuestionById(questions: Question[], questionId: string | null): Question | null {
  if (!questionId) {
    return questions[0] ?? null;
  }

  return questions.find((question) => question.id === questionId) ?? questions[0] ?? null;
}

export function ensureSourceRefs(sourceRefs: SourceRef[] | undefined): SourceRef[] {
  return sourceRefs ?? [];
}

export function buildReviewQueue(questions: Question[], answeredQuestions: Record<string, number>): string[] {
  return questions
    .filter((question) => answeredQuestions[question.id] !== undefined && answeredQuestions[question.id] !== question.correctIndex)
    .map((question) => question.id);
}

export function buildModuleProgress(
  moduleId: string,
  totalQuestions: number,
  seen: number,
  correct: number,
  lastPracticedAt: string,
): ModuleProgress {
  return {
    moduleId,
    seen,
    correct,
    total: totalQuestions,
    lastPracticedAt,
    status: totalQuestions > 0 && seen >= totalQuestions ? 'completed' : seen > 0 ? 'in-progress' : 'not-started',
  };
}
