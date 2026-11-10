import type { Module, ModuleOverview, ModuleProgress, Question, SourceRef, StudyAgendaItem } from '../types';

export type MasteryLevel = 'starter' | 'learning' | 'ready' | 'mastered';

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

export function buildExamDeck(questions: Question[], reviewQueue: string[], limit = 3): string[] {
  const uniqueQueue = [...new Set([...reviewQueue, ...questions.map((question) => question.id)])];
  return uniqueQueue.slice(0, Math.min(limit, uniqueQueue.length));
}

export function getMasteryLevel(progress: ModuleProgress): { label: MasteryLevel; percent: number } {
  const percent = computeAccuracy(progress.correct, progress.total);

  if (percent >= 90) {
    return { label: 'mastered', percent };
  }

  if (percent >= 70) {
    return { label: 'ready', percent };
  }

  if (percent >= 25) {
    return { label: 'learning', percent };
  }

  return { label: 'starter', percent };
}

export function buildModuleOverview(
  modules: Module[],
  progressByModule: Record<string, ModuleProgress>,
): ModuleOverview[] {
  return modules.map((module) => {
    const progress = progressByModule[module.moduleId] ?? {
      moduleId: module.moduleId,
      seen: 0,
      correct: 0,
      total: 0,
      lastPracticedAt: new Date().toISOString(),
      status: 'not-started',
    };

    const percent = progress.total > 0 ? computeAccuracy(progress.correct, progress.total) : 0;
    const mastery = getMasteryLevel(progress).label;

    return {
      moduleId: module.moduleId,
      title: module.title,
      exam: module.exam,
      difficulty: module.difficulty,
      percent,
      mastery,
      status: progress.status,
    };
  });
}

export function buildStudyAgenda(
  modules: Module[],
  questionIdsByModule: Record<string, string[]>,
  reviewQueues: Record<string, string[]>,
  answeredQuestions: Record<string, number>,
  limit = 3,
): StudyAgendaItem[] {
  const reviews: StudyAgendaItem[] = [];
  const continuations: StudyAgendaItem[] = [];

  for (const module of modules) {
    const questionIds = questionIdsByModule[module.moduleId] ?? [];
    const questionIdSet = new Set(questionIds);
    const reviewIds = [...new Set(reviewQueues[module.moduleId] ?? [])].filter((id) => questionIdSet.has(id));
    const nextReviewId = reviewIds[0];

    if (nextReviewId) {
      reviews.push({
        moduleId: module.moduleId,
        title: module.title,
        kind: 'review',
        questionId: nextReviewId,
        pendingCount: reviewIds.length,
      });
    }

    const unansweredIds = questionIds.filter((id) => answeredQuestions[id] === undefined);
    const nextQuestionId = unansweredIds[0];

    if (nextQuestionId) {
      continuations.push({
        moduleId: module.moduleId,
        title: module.title,
        kind: 'continue',
        questionId: nextQuestionId,
        pendingCount: unansweredIds.length,
      });
    }
  }

  return [...reviews, ...continuations].slice(0, Math.max(0, limit));
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
