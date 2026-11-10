import type { ExamSession, Module, ModuleOverview, ModuleProgress, Question, SourceRef, StudyAgendaItem } from '../types';

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

export function getQuestionAnswerKey(moduleId: string, questionId: string): string {
  return `${moduleId}::${questionId}`;
}

export function buildReviewQueue(
  questions: Question[],
  answeredQuestions: Record<string, number>,
  moduleId: string,
): string[] {
  return questions
    .filter((question) => {
      const answer = answeredQuestions[getQuestionAnswerKey(moduleId, question.id)];
      return answer !== undefined && answer !== question.correctIndex;
    })
    .map((question) => question.id);
}

export function buildExamDeck(questions: Question[], reviewQueue: string[], limit = 3): string[] {
  const uniqueQueue = [...new Set([...reviewQueue, ...questions.map((question) => question.id)])];
  return uniqueQueue.slice(0, Math.min(limit, uniqueQueue.length));
}

export function startExamSession(
  moduleId: string,
  questionIds: string[],
  startedAt: number,
  durationSeconds: number,
): ExamSession | null {
  const uniqueQuestionIds = [...new Set(questionIds)];
  if (!moduleId || uniqueQuestionIds.length === 0 || durationSeconds <= 0) {
    return null;
  }

  return {
    moduleId,
    questionIds: uniqueQuestionIds,
    answers: {},
    currentIndex: 0,
    startedAt,
    deadlineAt: startedAt + durationSeconds * 1_000,
    status: 'active',
    completedAt: null,
  };
}

export function answerExamQuestion(
  session: ExamSession,
  questionId: string,
  answerIndex: number,
  answeredAt: number,
): ExamSession {
  if (session.status !== 'active') {
    return session;
  }

  if (answeredAt >= session.deadlineAt) {
    return expireExamSession(session, answeredAt);
  }

  if (
    session.questionIds[session.currentIndex] !== questionId
    || session.answers[questionId] !== undefined
    || !Number.isInteger(answerIndex)
    || answerIndex < 0
  ) {
    return session;
  }

  const answers = { ...session.answers, [questionId]: answerIndex };
  const currentIndex = session.currentIndex + 1;
  const isComplete = currentIndex >= session.questionIds.length;

  return {
    ...session,
    answers,
    currentIndex,
    status: isComplete ? 'completed' : 'active',
    completedAt: isComplete ? answeredAt : null,
  };
}

export function expireExamSession(session: ExamSession, expiredAt: number): ExamSession {
  if (session.status !== 'active') {
    return session;
  }

  return {
    ...session,
    status: 'expired',
    completedAt: Math.min(expiredAt, session.deadlineAt),
  };
}

export function getExamRemainingSeconds(session: ExamSession, now: number): number {
  return Math.max(0, Math.ceil((session.deadlineAt - now) / 1_000));
}

export function getExamResult(session: ExamSession, questions: Question[]): { correct: number; total: number; percent: number } {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const correct = session.questionIds.filter((questionId) => {
    const question = questionsById.get(questionId);
    return question !== undefined && session.answers[questionId] === question.correctIndex;
  }).length;

  return {
    correct,
    total: session.questionIds.length,
    percent: computeAccuracy(correct, session.questionIds.length),
  };
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
  progressByModule: Record<string, ModuleProgress> = {},
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

    const remainingSlots = Math.max(0, questionIds.length - (progressByModule[module.moduleId]?.seen ?? 0));
    const unansweredIds = questionIds
      .filter((id) => answeredQuestions[getQuestionAnswerKey(module.moduleId, id)] === undefined)
      .slice(0, remainingSlots);
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

export function updateModuleProgressForAnswer(
  progress: ModuleProgress,
  previousAnswer: number | undefined,
  nextAnswer: number,
  correctIndex: number,
  lastPracticedAt: string,
): ModuleProgress {
  const seen = Math.min(progress.total, progress.seen + (previousAnswer === undefined ? 1 : 0));
  const previousWasCorrect = previousAnswer === correctIndex;
  const nextIsCorrect = nextAnswer === correctIndex;
  const correct = Math.max(0, Math.min(seen, progress.correct + Number(nextIsCorrect) - Number(previousWasCorrect)));

  return {
    ...progress,
    seen,
    correct,
    lastPracticedAt,
    status: progress.total > 0 && seen >= progress.total ? 'completed' : seen > 0 ? 'in-progress' : 'not-started',
  };
}
