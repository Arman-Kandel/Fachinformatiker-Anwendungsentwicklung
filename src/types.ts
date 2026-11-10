export type SourceRef = {
  sourceId: string;
  quote: string;
  section: string;
  type?: string;
};

export type ModuleSection = {
  id: string;
  type: 'theory' | 'summary';
  title: string;
  content: string;
  sourceRefs: SourceRef[];
};

export type Module = {
  moduleId: string;
  exam: string;
  title: string;
  difficulty: 'leicht' | 'mittel' | 'schwer';
  status: string;
  tags: string[];
  learningObjectives: string[];
  dependencies: string[];
  sourceRefs: SourceRef[];
  sections: ModuleSection[];
};

export type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRefs: SourceRef[];
};

export type QuizSet = {
  quizId: string;
  title: string;
  questions: Question[];
};

export type ModuleSummary = {
  moduleId: string;
  title: string;
  exam: string;
  difficulty: string;
  estimatedMinutes: number;
  sourceRefs: SourceRef[];
};

export type ModuleProgress = {
  moduleId: string;
  seen: number;
  correct: number;
  total: number;
  lastPracticedAt: string;
  status: 'not-started' | 'in-progress' | 'completed';
};

export type ModuleOverview = {
  moduleId: string;
  title: string;
  exam: string;
  difficulty: string;
  percent: number;
  mastery: 'starter' | 'learning' | 'ready' | 'mastered';
  status: 'not-started' | 'in-progress' | 'completed';
};

export type AppState = {
  resumeModuleId: string | null;
  currentQuestionId: string | null;
  selectedModuleId: string | null;
  studySectionId: string | null;
  reviewQueue: Record<string, string[]>;
  moduleProgress: Record<string, ModuleProgress>;
  answeredQuestions: Record<string, number>;
  lastUpdatedAt: string | null;
};
